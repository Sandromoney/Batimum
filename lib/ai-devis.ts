import { formatTarifsForPrompt, BTP_SECTION_TITLES, type BtpNiveauPrix } from "@/lib/btp-tarifs-reference";
import {
  formatPriceLibraryForPrompt,
  formatPriceLibraryRulesForPrompt,
  formatPlinthesEstimationRulesForPrompt,
} from "@/lib/batimum-price-library";
import { formatBibliothequeForPrompt } from "@/lib/bibliotheque-entreprise";
import { formatPrixPrioriteGuide } from "@/lib/bibliotheque-prix";
import { formatPostesGlobauxRulesForPrompt } from "@/lib/ai-devis-postes-globaux";
import { formatVerificationReportForPrompt } from "@/lib/ai-devis-verification";
import { formatAiDevisTvaRulesForPrompt } from "@/lib/ai-devis-tva";
import { formatUnitConversionRulesForPrompt } from "@/lib/ai-devis-unites";
import { formatRatiosForPrompt } from "@/lib/bibliotheque-ratios";
import { buildMumIaMetadataFromAiResult } from "@/lib/mum-ia-mode";
import type { AiPrixSource, BibliothequeRatioEntry, MumIaConfianceDetail } from "@/lib/types";
import { createSectionLigne } from "@/lib/devis-lignes";
import { appendDevisHistorique } from "@/lib/devis-statut";
import { generateNextNumeroDevis } from "@/lib/parametres";
import type { BibliothequeEntrepriseEntry, Client, Devis, LigneDevis, Parametres, TypeChantier } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { TYPE_CHANTIER_LABELS } from "@/lib/chantiers";
import { normalizeMumDevisResponse, type NormalizeMumDevisOutcome } from "@/lib/mum-ia-normalize-devis";
import { getClientAddress, isClientAddressComplete } from "@/lib/clients";

export const AI_PRIX_AVERTISSEMENT =
  "Prix et quantités estimatifs à vérifier par le professionnel.";

export const AI_ESTIMATE_ALERT =
  "Prix et quantités estimatifs à vérifier par le professionnel.";

export type AiDevisLigne = {
  designation: string;
  description: string;
  quantite: number;
  unite: string;
  prixUnitaireHT: number;
  tauxTVA: number;
  prixAVerifier: boolean;
  /** Métadonnées internes — masquées en mode client */
  sourcePrix?: AiPrixSource;
  fiabilitePrix?: number;
  quantiteEstimee?: boolean;
  ratioApplique?: string;
  conversionUniteNote?: string;
};

export type AiDevisSection = {
  titre: string;
  lignes: AiDevisLigne[];
  sousTotalHT: number;
};

export type AiDevisAutoVerification = {
  travauxComplets: boolean;
  lotsManquants: string[];
  quantitesCoherentes: boolean;
  prixCoherents: boolean;
  tvaCoherentes: boolean;
  pointsVerifies: boolean;
  /** true si aucun doublon global/sous-poste détecté après nettoyage */
  postesGlobauxCoherents?: boolean;
  /** Sous-postes retirés car inclus dans un forfait global */
  doublonsSupprimes?: string[];
};

export type AiDevisResult = {
  titre: string;
  descriptionGenerale: string;
  hypothèses: string[];
  sections: AiDevisSection[];
  totalHT: number;
  pointsAVerifier: string[];
  avertissementPrix: string;
  autoVerification: AiDevisAutoVerification;
  rapportVerification?: import("@/lib/ai-devis-verification").AiDevisVerificationReport;
  /** Score interne 0–100 — mode dirigeant uniquement */
  scoreConfiance?: number;
  detailConfiance?: MumIaConfianceDetail;
  hypothesesUtilisees?: string[];
};

export type AiDevisGenerateRequest = {
  descriptionChantier: string;
  regionCode: string;
  regionLabel: string;
  departementCode: string;
  departementLabel: string;
  typeChantier: TypeChantier;
  tauxTVA: number;
  niveauPrix: BtpNiveauPrix;
  forceWithHypotheses?: boolean;
  reponsesQuestions?: Record<string, string>;
  hypothesesFromAnalysis?: string[];
  lotsIdentifies?: string[];
  bibliothequeEntries?: BibliothequeEntrepriseEntry[];
  entreprisePriceLibrary?: import("@/lib/types").EntreprisePriceLibrary;
  parametresSnapshot?: Pick<
    Parametres,
    "fournisseurs" | "tarifsFournisseurs" | "entreprisePriceLibrary"
  >;
  companyId?: string;
  coefficientRegionalManuel?: number | null;
  departementPrincipal?: string;
  ratioEntries?: BibliothequeRatioEntry[];
};

const LIGNE_SCHEMA = {
  type: "object",
  properties: {
    designation: { type: "string" },
    quantity: { type: "number" },
    unit: { type: "string" },
    unitPriceHT: { type: "number" },
    totalHT: { type: "number" },
    vatRate: { type: "number" },
  },
  required: [
    "designation",
    "quantity",
    "unit",
    "unitPriceHT",
    "totalHT",
    "vatRate",
  ],
  additionalProperties: false,
} as const;

/** Schéma OpenAI — devis chiffré (sections + lines), pas une analyse. */
export const AI_DEVIS_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          lines: {
            type: "array",
            items: LIGNE_SCHEMA,
          },
        },
        required: ["name", "lines"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "summary", "sections"],
  additionalProperties: false,
} as const;

export function buildAiDevisSystemPrompt(): string {
  const sections = BTP_SECTION_TITLES.join("\n- ");

  return `Tu es MUM IA, expert chiffreur BTP en France.
Tu génères un DEVIS STRUCTURÉ CHIFFRÉ — jamais une simple analyse.

INTERDIT de répondre avec uniquement : analysis, questions, lotsIdentifies, assumptions.
OBLIGATOIRE : au moins une entrée dans "sections", chaque section avec au moins une "lines".

Exemple minimal attendu :
{
  "title": "Rénovation salle de bain",
  "summary": "…",
  "sections": [
    {
      "name": "Dépose et préparation",
      "lines": [
        {
          "designation": "Protection du chantier",
          "quantity": 1,
          "unit": "forfait",
          "unitPriceHT": 150,
          "totalHT": 150,
          "vatRate": 20
        }
      ]
    }
  ]
}

RÈGLES :
- Toujours ≥ 1 section et ≥ 1 ligne chiffrée.
- totalHT = quantity × unitPriceHT.
- Si prix incertain : estimation prudente + description « À vérifier ».
- Couvrir tous les lots du chantier (dépose, plomberie, carrelage, sanitaires, électricité, peinture, nettoyage…).
${formatPriceLibraryRulesForPrompt()}
${formatPostesGlobauxRulesForPrompt()}
${formatVerificationReportForPrompt()}

SECTIONS possibles :
- ${sections}

Réponds UNIQUEMENT en JSON (pas de markdown, pas de texte hors JSON).`;
}

export function buildAiDevisUserPrompt(input: AiDevisGenerateRequest): string {
  const typeLabel = TYPE_CHANTIER_LABELS[input.typeChantier];
  const effectiveDept =
    input.departementCode?.trim() ||
    input.departementPrincipal?.trim() ||
    "";

  const tarifs = formatTarifsForPrompt({
    regionCode: input.regionCode,
    regionLabel: input.regionLabel,
    departementCode: effectiveDept || input.departementCode,
    departementLabel: input.departementLabel,
    niveauPrix: input.niveauPrix,
    coefficientManuel: input.coefficientRegionalManuel,
  });

  const bibliothequeEntries = input.bibliothequeEntries ?? [];

  const bibliothequeBlock = formatBibliothequeForPrompt(bibliothequeEntries);

  const prioriteBlock = formatPrixPrioriteGuide({
    entries: bibliothequeEntries,
    regionCode: input.regionCode,
    departementCode: effectiveDept || input.departementCode,
    niveauPrix: input.niveauPrix,
    coefficientManuel: input.coefficientRegionalManuel,
  });

  const reponsesBlock =
    input.reponsesQuestions && Object.keys(input.reponsesQuestions).length > 0
      ? `\nRéponses complémentaires :\n${Object.entries(input.reponsesQuestions)
          .map(([id, val]) => `- ${id} : ${val}`)
          .join("\n")}`
      : "";

  const hypothesesBlock = [
    ...(input.hypothesesFromAnalysis ?? []),
    ...(input.forceWithHypotheses ? ["Génération avec hypothèses explicites demandée par l'utilisateur."] : []),
  ];

  const lotsBlock =
    input.lotsIdentifies && input.lotsIdentifies.length > 0
      ? `\nLots identifiés à l'analyse : ${input.lotsIdentifies.join(", ")}`
      : "";

  return `${bibliothequeBlock}

${prioriteBlock}

${formatPriceLibraryForPrompt()}

${formatPlinthesEstimationRulesForPrompt()}

${formatPostesGlobauxRulesForPrompt()}

${formatAiDevisTvaRulesForPrompt(input.tauxTVA)}

${formatUnitConversionRulesForPrompt()}

${input.ratioEntries && input.ratioEntries.length > 0 ? formatRatiosForPrompt(input.ratioEntries) : ""}

${tarifs}

CHANTIER :
${input.descriptionChantier.trim()}

Contexte :
- Région : ${input.regionLabel} | Département : ${input.departementLabel} (${input.departementCode})
- Type : ${typeLabel}
- TVA par défaut : ${input.tauxTVA}%
- Niveau de prix : ${input.niveauPrix}
${lotsBlock}
${reponsesBlock}
${
  hypothesesBlock.length > 0
    ? `\nHypothèses à intégrer :\n${hypothesesBlock.map((h) => `- ${h}`).join("\n")}`
    : ""
}

Génère un devis COMPLET couvrant tous les lots pertinents.`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeAiSectionSubtotal(section: Pick<AiDevisSection, "lignes">): number {
  return round2(
    section.lignes.reduce(
      (sum, ligne) => sum + ligne.quantite * ligne.prixUnitaireHT,
      0,
    ),
  );
}

export function computeAiDevisTotalHT(result: Pick<AiDevisResult, "sections">): number {
  return round2(
    result.sections.reduce(
      (sum, section) => sum + computeAiSectionSubtotal(section),
      0,
    ),
  );
}

export type NormalizeAiDevisOutcome = NormalizeMumDevisOutcome;

/** Délègue au normaliseur unique (formes FR/EN, lots, lines…). */
export function normalizeAiDevisResultDetailed(
  raw: unknown,
  options?: { defaultVatRate?: number },
): NormalizeAiDevisOutcome {
  return normalizeMumDevisResponse(raw, options);
}

export function normalizeAiDevisResult(raw: unknown): AiDevisResult | null {
  return normalizeMumDevisResponse(raw).result;
}

export function aiDevisToLignes(
  result: AiDevisResult,
  defaultTva: number,
): LigneDevis[] {
  const lignes: LigneDevis[] = [];

  for (const section of result.sections) {
    lignes.push(createSectionLigne(section.titre));
    for (const ligne of section.lignes) {
      const descCourte =
        ligne.description?.trim() &&
        ligne.description.trim() !== ligne.designation.trim()
          ? ligne.description.trim()
          : undefined;
      lignes.push({
        id: generateId(),
        typeLigne: "ligne",
        designation: ligne.designation,
        descriptionCourte: descCourte,
        description: descCourte
          ? `${ligne.designation}\n${descCourte}`
          : ligne.designation,
        quantite: ligne.quantite,
        unite: ligne.unite,
        prixUnitaire: ligne.prixUnitaireHT,
        tauxTVA: ligne.tauxTVA ?? defaultTva,
      });
    }
  }

  return lignes;
}

export type CreateDevisFromAiInput = {
  result: AiDevisResult;
  clients: Client[];
  existingDevis: Devis[];
  parametres: Parametres;
  typeChantier: TypeChantier;
  regionLabel: string;
  departementLabel: string;
  descriptionChantier: string;
  tauxTVA: number;
  clientId?: string;
};

export function createDevisBrouillonFromAi(
  input: CreateDevisFromAiInput,
): Devis {
  const {
    result,
    clients,
    existingDevis,
    parametres,
    typeChantier,
    regionLabel,
    departementLabel,
    descriptionChantier,
    tauxTVA,
    clientId,
  } = input;

  const today = new Date().toISOString().slice(0, 10);
  const numero = generateNextNumeroDevis(existingDevis, parametres);
  const lignes = aiDevisToLignes(result, tauxTVA);
  const montantHT = computeAiDevisTotalHT(result);
  const montantTTC = round2(montantHT * (1 + tauxTVA / 100));
  const resolvedClientId = clientId ?? clients[0]?.id ?? "";
  const resolvedClient = clients.find((item) => item.id === resolvedClientId);
  const actor = parametres.utilisateur?.trim() || "Utilisateur";

  let devis: Devis = {
    id: generateId(),
    numero,
    clientId: resolvedClientId,
    titre: result.titre,
    statut: "brouillon",
    date: today,
    dateCreation: today,
    dateDevis: today,
    montantHT,
    montantTTC,
    tauxTVA,
    validiteJours: 30,
    lignes,
    typeChantier,
    adresseChantier: isClientAddressComplete(resolvedClient)
      ? getClientAddress(resolvedClient)
      : undefined,
    descriptionChantier: [
      result.descriptionGenerale,
      descriptionChantier.trim(),
      `Localisation : ${departementLabel}, ${regionLabel}`,
      result.hypothèses.length > 0
        ? `Hypothèses : ${result.hypothèses.join(" ; ")}`
        : "",
      result.pointsAVerifier.length > 0
        ? `Points à vérifier : ${result.pointsAVerifier.join(" ; ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    notesInternes: [
      "Devis généré par MUM IA.",
      AI_ESTIMATE_ALERT,
      AI_PRIX_AVERTISSEMENT,
      result.hypothèses.length > 0
        ? `Hypothèses : ${result.hypothèses.join(" ; ")}`
        : "",
      result.pointsAVerifier.length > 0
        ? `Points à vérifier : ${result.pointsAVerifier.join(" ; ")}`
        : "",
      result.scoreConfiance != null
        ? `Score confiance IA : ${result.scoreConfiance}%`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    mumIaMetadata: buildMumIaMetadataFromAiResult(result),
  };

  devis = appendDevisHistorique(
    devis,
    { type: "ia_genere", label: "Devis généré par IA" },
    actor,
  );
  devis = appendDevisHistorique(
    devis,
    { type: "ia_transforme_brouillon", label: "Devis transformé en brouillon" },
    actor,
  );

  return devis;
}
