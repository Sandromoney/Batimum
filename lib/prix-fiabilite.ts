/** Scores de fiabilité pour la résolution des prix MUM IA (0–100). */

export const FIABILITE_BATIMUM_STANDARD = 60;
export const FIABILITE_BATIMUM_REGIONAL = 70;
export const FIABILITE_APPRIS_FAIBLE = 75;
export const FIABILITE_APPRIS_MOYEN = 85;
export const FIABILITE_APPRIS_FORT = 92;
export const FIABILITE_MANUEL_VERROUILLE = 98;

export const SEUIL_FIABILITE_APPRIS_FORTE = 85;

export function getFiabiliteAppris(nombreUtilisations: number): number {
  if (nombreUtilisations <= 0) return FIABILITE_APPRIS_FAIBLE;
  if (nombreUtilisations <= 3) return FIABILITE_APPRIS_FAIBLE;
  if (nombreUtilisations <= 10) return FIABILITE_APPRIS_MOYEN;
  return FIABILITE_APPRIS_FORT;
}

export function getFiabiliteEntrepriseEntry(params: {
  source: "appris" | "manuel";
  verrouille?: boolean;
  nombreUtilisations: number;
  fiabilite?: number;
}): number {
  if (params.fiabilite != null && params.fiabilite > 0) return params.fiabilite;
  if (params.source === "manuel" && params.verrouille) {
    return FIABILITE_MANUEL_VERROUILLE;
  }
  if (params.source === "manuel") {
    return Math.max(FIABILITE_APPRIS_FORT, getFiabiliteAppris(params.nombreUtilisations));
  }
  return getFiabiliteAppris(params.nombreUtilisations);
}
