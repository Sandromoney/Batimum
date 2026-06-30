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
  coefficientRegionalManuel?: number | null;
  departementPrincipal?: string;
  ratioEntries?: BibliothequeRatioEntry[];
};

const LIGNE_SCHEMA = {
  type: "object",
  properties: {
    designation: { type: "string" },
    description: { type: "string" },
    quantite: { type: "number" },
    unite: { type: "string" },
    prixUnitaireHT: { type: "number" },
    tauxTVA: { type: "number" },
    prixAVerifier: { type: "boolean" },
  },
  required: [
    "designation",
    "description",
    "quantite",
    "unite",
    "prixUnitaireHT",
    "tauxTVA",
    "prixAVerifier",
  ],
  additionalProperties: false,
} as const;

export const AI_DEVIS_JSON_SCHEMA = {
  type: "object",
  properties: {
    titre: { type: "string" },
    descriptionGenerale: { type: "string" },
    hypotheses: {
      type: "array",
      items: { type: "string" },
    },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          titre: { type: "string" },
          lignes: {
            type: "array",
            items: LIGNE_SCHEMA,
          },
          sousTotalHT: { type: "number" },
        },
        required: ["titre", "lignes", "sousTotalHT"],
        additionalProperties: false,
      },
    },
    totalHT: { type: "number" },
    pointsAVerifier: {
      type: "array",
      items: { type: "string" },
    },
    avertissementPrix: { type: "string" },
    autoVerification: {
      type: "object",
      properties: {
        travauxComplets: { type: "boolean" },
        lotsManquants: {
          type: "array",
          items: { type: "string" },
        },
        quantitesCoherentes: { type: "boolean" },
        prixCoherents: { type: "boolean" },
        tvaCoherentes: { type: "boolean" },
        pointsVerifies: { type: "boolean" },
      },
      required: [
        "travauxComplets",
        "lotsManquants",
        "quantitesCoherentes",
        "prixCoherents",
        "tvaCoherentes",
        "pointsVerifies",
      ],
      additionalProperties: false,
    },
  },
  required: [
    "titre",
    "descriptionGenerale",
    "hypotheses",
    "sections",
    "totalHT",
    "pointsAVerifier",
    "avertissementPrix",
    "autoVerification",
  ],
  additionalProperties: false,
} as const;

export function buildAiDevisSystemPrompt(): string {
  const sections = BTP_SECTION_TITLES.join("\n- ");

  return `Tu es MUM IA, expert chiffreur BTP en France.
Tu génères des devis COMPLETS, RIGOUREUX et PROFESSIONNELS.

MÉTHODE OBLIGATOIRE (dans cet ordre) :
1. ANALYSER tous les travaux demandés — identifier TOUS les lots (dépose, protection, placo, isolation, électricité, plomberie, carrelage, sols, peinture, menuiseries, sanitaires, nettoyage, déplacement).
2. Ne JAMAIS se limiter au premier métier détecté.
3. PRIORITÉ PRIX (NE JAMAIS INVENTER) :
   1) Prix manuel verrouillé entreprise
   2) Prix appris entreprise forte fiabilité
   3) Prix moyen appris entreprise
   4) Bibliothèque métier Batimum V3 (batimum-price-library)
   5) Prix régional Batimum (standard × coefficient régional)
   6) Prix standard Batimum
   7) Si aucun prix fiable → prixAVerifier=true + « Prix à vérifier »
4. Utiliser UNIQUEMENT les prix de la bibliothèque métier Batimum et des bibliothèques entreprise.
${formatPriceLibraryRulesForPrompt()}
5. Si prix hors base → estimation prudente + prixAVerifier=true + mention « Prix à vérifier » dans description.
6. POSTES GLOBAUX : ne jamais cumuler un forfait global et ses sous-postes inclus.
${formatVerificationReportForPrompt()}
7. AUTO-VÉRIFICATION avant réponse (champ autoVerification) :
   - Tous les travaux demandés sont-ils présents ?
   - Manque-t-il un lot évident ?
   - Quantités cohérentes ?
   - Prix cohérents avec région et niveau ?
   - TVA cohérentes ?
   - Points à vérifier listés ?
   - Aucun doublon entre postes globaux et sous-postes inclus ?
8. Corriger les incohérences avant de répondre.

${formatPostesGlobauxRulesForPrompt()}

SECTIONS (créer UNIQUEMENT celles utiles, titres exacts) :
- ${sections}

RÈGLES PRIX :
- Jamais de prix certains — estimations uniquement.
- avertissementPrix = exactement : "${AI_PRIX_AVERTISSEMENT}"
- sousTotalHT = somme des lignes de la section.
- totalHT = somme de tous les sous-totaux.
- hypothèses : lister clairement toute supposition (surface, matériaux, accès…). Champ JSON : hypotheses.
- pointsAVerifier : 5 à 12 points concrets terrain.

SÉCURITÉ : ne valide, n'envoie, ne signe jamais. Brouillon indicatif uniquement.
Réponds UNIQUEMENT en JSON strict.`;
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

function normalizeAutoVerification(
  raw: unknown,
): AiDevisAutoVerification {
  const data = (raw && typeof raw === "object" ? raw : {}) as Partial<AiDevisAutoVerification>;
  return {
    travauxComplets: Boolean(data.travauxComplets),
    lotsManquants: Array.isArray(data.lotsManquants)
      ? data.lotsManquants.map((item) => String(item).trim()).filter(Boolean)
      : [],
    quantitesCoherentes: Boolean(data.quantitesCoherentes),
    prixCoherents: Boolean(data.prixCoherents),
    tvaCoherentes: Boolean(data.tvaCoherentes),
    pointsVerifies: Boolean(data.pointsVerifies),
  };
}

export function normalizeAiDevisResult(raw: unknown): AiDevisResult | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<AiDevisResult>;
  if (!data.titre?.trim() || !Array.isArray(data.sections)) return null;

  const sections: AiDevisSection[] = data.sections
    .map((section) => {
      if (!section || typeof section !== "object") return null;
      const titre = String(section.titre ?? "").trim();
      if (!titre) return null;
      const lignes = (Array.isArray(section.lignes) ? section.lignes : [])
        .map((ligne) => {
          if (!ligne || typeof ligne !== "object") return null;
          const designation = String(ligne.designation ?? "").trim();
          if (!designation) return null;
          const prixAVerifier = Boolean(ligne.prixAVerifier);
          let description = String(ligne.description ?? "").trim();
          if (prixAVerifier && !description.toLowerCase().includes("prix à vérifier")) {
            description = description
              ? `${description} — Prix à vérifier`
              : "Prix à vérifier";
          }
          return {
            designation,
            description,
            quantite: Math.max(0, Number(ligne.quantite) || 0),
            unite: String(ligne.unite ?? "u").trim() || "u",
            prixUnitaireHT: Math.max(0, Number(ligne.prixUnitaireHT) || 0),
            tauxTVA: Number(ligne.tauxTVA) || 0,
            prixAVerifier,
          } satisfies AiDevisLigne;
        })
        .filter((ligne): ligne is AiDevisLigne => ligne !== null);

      if (lignes.length === 0) return null;
      const sousTotalHT = computeAiSectionSubtotal({ lignes });
      return { titre, lignes, sousTotalHT };
    })
    .filter((section): section is AiDevisSection => section !== null);

  if (sections.length === 0) return null;

  const computedTotal = computeAiDevisTotalHT({ sections });

  const pointsAVerifier = Array.isArray(data.pointsAVerifier)
    ? data.pointsAVerifier.map((item) => String(item).trim()).filter(Boolean)
    : [];

  return {
    titre: data.titre.trim(),
    descriptionGenerale: String(data.descriptionGenerale ?? "").trim(),
    hypothèses: Array.isArray(data.hypothèses)
      ? data.hypothèses.map((item) => String(item).trim()).filter(Boolean)
      : Array.isArray((data as { hypotheses?: string[] }).hypotheses)
        ? (data as { hypotheses: string[] }).hypotheses
            .map((item) => String(item).trim())
            .filter(Boolean)
        : [],
    sections,
    totalHT: computedTotal,
    pointsAVerifier,
    avertissementPrix: AI_PRIX_AVERTISSEMENT,
    autoVerification: normalizeAutoVerification(data.autoVerification),
  };
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
