import type { AiDevisResult, AiDevisAutoVerification } from "@/lib/ai-devis";
import type { AiDevisVerificationReport } from "@/lib/ai-devis-verification";
import type { Devis, MumIaDevisMetadata } from "@/lib/types";

/** Mode d'affichage MUM IA / devis issu de l'IA. */
export type MumIaViewMode = "interne" | "client";

export function isMumIaInterneMode(mode: MumIaViewMode): boolean {
  return mode === "interne";
}

const INTERNAL_DESCRIPTION_MARKERS = [
  /^hypothèses\s*:/i,
  /^points à vérifier\s*:/i,
  /^localisation\s*:/i,
  /ajouté automatiquement/i,
  /élément explicitement demandé/i,
  /prix à vérifier\./i,
  /devis généré par mum ia/i,
  /mum ia/i,
  /auto-vérification/i,
  /rapport de vérification/i,
  /éléments ajoutés automatiquement/i,
  /doublons retirés/i,
];

/**
 * Retire les blocs internes MUM IA d'un texte destiné au client.
 */
export function stripMumIaInternalFromDescription(text: string | undefined): string {
  if (!text?.trim()) return "";

  const paragraphs = text.split(/\n\n+/).filter((block) => {
    const trimmed = block.trim();
    if (!trimmed) return false;
    return !INTERNAL_DESCRIPTION_MARKERS.some((pattern) => pattern.test(trimmed));
  });

  return paragraphs.join("\n\n").trim();
}

/**
 * Devis nettoyé pour PDF client, lien de consultation et signature.
 */
export function getClientFacingDevis(devis: Devis): Devis {
  const descriptionClient = stripMumIaInternalFromDescription(devis.descriptionChantier);

  const lignes = devis.lignes.map((ligne) => {
    const designation = ligne.designation ?? "";
    const descCourte = ligne.descriptionCourte ?? "";
    const isInternalNote =
      descCourte.includes("Ajouté automatiquement") ||
      descCourte.includes("élément explicitement demandé");

    if (!isInternalNote) return ligne;

    return {
      ...ligne,
      descriptionCourte: undefined,
      description: designation || ligne.description,
    };
  });

  return {
    ...devis,
    descriptionChantier: descriptionClient || devis.titre,
    notesInternes: undefined,
    mumIaMetadata: undefined,
    lignes,
  };
}

/**
 * Résultat IA filtré pour prévisualisation client (masque tout le rapport interne).
 */
export function filterAiDevisForClientView(result: AiDevisResult): AiDevisResult {
  return {
    titre: result.titre,
    descriptionGenerale: stripMumIaInternalFromDescription(result.descriptionGenerale),
    hypothèses: [],
    sections: result.sections.map((section) => ({
      ...section,
      lignes: section.lignes.map((ligne) => ({
        designation: ligne.designation,
        description: stripMumIaInternalFromDescription(ligne.description),
        quantite: ligne.quantite,
        unite: ligne.unite,
        prixUnitaireHT: ligne.prixUnitaireHT,
        tauxTVA: ligne.tauxTVA,
        prixAVerifier: false,
      })),
    })),
    totalHT: result.totalHT,
    pointsAVerifier: [],
    avertissementPrix: result.avertissementPrix,
    autoVerification: {
      travauxComplets: true,
      lotsManquants: [],
      quantitesCoherentes: true,
      prixCoherents: true,
      tvaCoherentes: true,
      pointsVerifies: true,
    },
  };
}

export function buildMumIaMetadataFromAiResult(
  result: AiDevisResult,
  extra?: Partial<MumIaDevisMetadata>,
): MumIaDevisMetadata {
  return {
    scoreConfiance: result.scoreConfiance,
    detailConfiance: result.detailConfiance,
    hypothesesUtilisees: result.hypothesesUtilisees ?? result.hypothèses,
    rapportVerification: result.rapportVerification,
    autoVerification: result.autoVerification,
    pointsAVerifier: result.pointsAVerifier,
    lignesInternes: result.sections.flatMap((section) =>
      section.lignes.map((ligne) => ({
        designation: ligne.designation,
        section: section.titre,
        sourcePrix: ligne.sourcePrix,
        fiabilitePrix: ligne.fiabilitePrix,
        quantiteEstimee: ligne.quantiteEstimee,
        ratioApplique: ligne.ratioApplique,
        conversionUniteNote: ligne.conversionUniteNote,
      })),
    ),
    genereLe: new Date().toISOString(),
    ...extra,
  };
}

export type MumIaInternalPanelProps = {
  mode: MumIaViewMode;
  scoreConfiance?: number;
  rapport?: AiDevisVerificationReport;
  autoVerification?: AiDevisAutoVerification;
  hypotheses?: string[];
  pointsAVerifier?: string[];
};

export function shouldShowMumIaInternalPanel(props: MumIaInternalPanelProps): boolean {
  return isMumIaInterneMode(props.mode);
}
