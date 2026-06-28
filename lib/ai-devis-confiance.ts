import type { AiPrixSource } from "@/lib/types";

export type AiDevisLigneConfianceInput = {
  designation: string;
  sourcePrix?: AiPrixSource;
  fiabilitePrix?: number;
  prixAVerifier: boolean;
  quantiteEstimee?: boolean;
  ratioApplique?: string;
};

export type AiDevisConfianceDetail = {
  prixEntrepriseConnus: number;
  prixRegionaux: number;
  prixAVerifier: number;
  quantitesEstimees: number;
  ratiosAppliques: number;
  lignesTotal: number;
};

export type AiDevisConfianceResult = {
  score: number;
  detail: AiDevisConfianceDetail;
  resume: string;
};

function lineScore(ligne: AiDevisLigneConfianceInput): number {
  if (ligne.prixAVerifier || ligne.sourcePrix === "a_verifier") return 35;

  const fiabilite = ligne.fiabilitePrix ?? 0;
  let score = fiabilite;

  if (ligne.sourcePrix === "manuel") score = Math.max(score, 95);
  if (ligne.sourcePrix === "appris" && fiabilite >= 85) score = Math.max(score, 88);
  if (ligne.sourcePrix === "regional") score = Math.max(score, 78);
  if (ligne.sourcePrix === "batimum") score = Math.max(score, 62);

  if (ligne.quantiteEstimee) score = Math.max(40, score - 12);
  if (ligne.ratioApplique) score = Math.min(95, score + 5);

  return Math.min(98, Math.max(0, Math.round(score)));
}

function buildResume(score: number, detail: AiDevisConfianceDetail): string {
  if (score >= 90) {
    return "Prix entreprise connus et ratios métier fiables — brouillon très proche des habitudes de l'entreprise.";
  }
  if (score >= 75) {
    return "Prix régionaux ou appris avec quelques quantités estimées — à valider sur le terrain.";
  }
  if (score >= 60) {
    return "Estimations nombreuses — vérifier prix et quantités avant envoi client.";
  }
  return "Estimation automatique basée sur la bibliothèque Batimum. Validation professionnelle recommandée avant envoi client.";
}

/**
 * Score de confiance interne MUM IA (0–100).
 * Visible uniquement en mode dirigeant.
 */
export function computeAiDevisConfiance(
  lignes: AiDevisLigneConfianceInput[],
): AiDevisConfianceResult {
  const detail: AiDevisConfianceDetail = {
    prixEntrepriseConnus: 0,
    prixRegionaux: 0,
    prixAVerifier: 0,
    quantitesEstimees: 0,
    ratiosAppliques: 0,
    lignesTotal: lignes.length,
  };

  if (lignes.length === 0) {
    return {
      score: 0,
      detail,
      resume: "Aucune ligne — confiance nulle.",
    };
  }

  let total = 0;

  for (const ligne of lignes) {
    total += lineScore(ligne);

    if (ligne.sourcePrix === "manuel" || ligne.sourcePrix === "appris") {
      detail.prixEntrepriseConnus += 1;
    } else if (ligne.sourcePrix === "regional" || ligne.sourcePrix === "batimum") {
      detail.prixRegionaux += 1;
    } else {
      detail.prixAVerifier += 1;
    }

    if (ligne.quantiteEstimee) detail.quantitesEstimees += 1;
    if (ligne.ratioApplique) detail.ratiosAppliques += 1;
  }

  const score = Math.round(total / lignes.length);

  return {
    score,
    detail,
    resume: buildResume(score, detail),
  };
}

export function formatConfianceLabel(score: number): string {
  if (score >= 90) return "Très élevée";
  if (score >= 75) return "Bonne";
  if (score >= 60) return "Moyenne";
  return "Faible";
}
