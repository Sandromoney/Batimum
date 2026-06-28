import type { Devis, LigneDevis } from "./types";
import { isSectionLigne } from "./devis-lignes";

export const TAUX_TVA_LIGNE_OPTIONS = [
  { value: "0", label: "0 %" },
  { value: "5.5", label: "5,5 %" },
  { value: "10", label: "10 %" },
  { value: "20", label: "20 %" },
  { value: "non_applicable", label: "TVA non applicable" },
] as const;

export type TvaLigneSelectValue =
  (typeof TAUX_TVA_LIGNE_OPTIONS)[number]["value"];

export type DevisTvaRecap = {
  totalHT: number;
  tva55: number;
  tva10: number;
  tva20: number;
  tvaTotale: number;
  totalTTC: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function resolveLigneDefaultTva(
  devis?: Pick<Devis, "tauxTVA">,
  parametresTva = 20,
): number {
  return devis?.tauxTVA ?? parametresTva;
}

export function getLigneTvaSelectValue(
  ligne: LigneDevis,
  defaultTva: number,
): TvaLigneSelectValue {
  if (ligne.tvaNonApplicable) return "non_applicable";
  const taux = ligne.tauxTVA ?? defaultTva;
  if (taux === 0) return "0";
  if (taux === 5.5) return "5.5";
  if (taux === 10) return "10";
  if (taux === 20) return "20";
  return "20";
}

export function patchLigneTvaFromSelect(
  value: string,
): Pick<LigneDevis, "tauxTVA" | "tvaNonApplicable"> {
  if (value === "non_applicable") {
    return { tvaNonApplicable: true, tauxTVA: 0 };
  }
  return { tvaNonApplicable: false, tauxTVA: Number(value) };
}

export function formatTvaLigneLabel(
  ligne: LigneDevis,
  defaultTva: number,
): string {
  if (ligne.tvaNonApplicable) return "N/A";
  const taux = ligne.tauxTVA ?? defaultTva;
  if (taux === 5.5) return "5,5 %";
  return `${taux} %`;
}

export function ligneMontantHT(ligne: LigneDevis): number {
  if (isSectionLigne(ligne)) return 0;
  const quantite = Number(ligne.quantite) || 0;
  const prixUnitaire = Number(ligne.prixUnitaire) || 0;
  return round2(quantite * prixUnitaire);
}

export function ligneTauxEffectif(
  ligne: LigneDevis,
  defaultTva: number,
): number {
  if (ligne.tvaNonApplicable) return 0;
  return ligne.tauxTVA ?? defaultTva;
}

export function ligneMontantTVA(
  ligne: LigneDevis,
  defaultTva: number,
): number {
  const taux = ligneTauxEffectif(ligne, defaultTva);
  return round2((ligneMontantHT(ligne) * taux) / 100);
}

export function ligneMontantTTC(
  ligne: LigneDevis,
  defaultTva: number,
): number {
  return round2(ligneMontantHT(ligne) + ligneMontantTVA(ligne, defaultTva));
}

export function computeDevisTvaRecap(
  devis: Pick<Devis, "lignes" | "tauxTVA">,
  parametresDefaultTva = 20,
  tvaClassique = true,
): DevisTvaRecap {
  const lignes = Array.isArray(devis.lignes) ? devis.lignes : [];
  const defaultTva = resolveLigneDefaultTva(devis, parametresDefaultTva);
  let totalHT = 0;
  let tva55 = 0;
  let tva10 = 0;
  let tva20 = 0;

  for (const ligne of lignes) {
    if (isSectionLigne(ligne)) continue;
    const ht = ligneMontantHT(ligne);
    totalHT += ht;
    if (tvaClassique) {
      const taux = ligneTauxEffectif(ligne, defaultTva);
      const tva = round2((ht * taux) / 100);
      if (taux === 5.5) tva55 += tva;
      else if (taux === 10) tva10 += tva;
      else if (taux === 20) tva20 += tva;
    }
  }

  const roundedHT = round2(totalHT);
  const tvaTotale = tvaClassique ? round2(tva55 + tva10 + tva20) : 0;

  return {
    totalHT: roundedHT,
    tva55: round2(tva55),
    tva10: round2(tva10),
    tva20: round2(tva20),
    tvaTotale,
    totalTTC: round2(roundedHT + tvaTotale),
  };
}

export function syncDevisMontantsFromLignes(
  devis: Pick<Devis, "lignes" | "tauxTVA">,
  parametresDefaultTva = 20,
): Pick<Devis, "montantHT" | "montantTTC"> {
  const recap = computeDevisTvaRecap(devis, parametresDefaultTva);
  return {
    montantHT: recap.totalHT,
    montantTTC: recap.totalTTC,
  };
}

export function propagateDevisTvaToLignes(devis: Devis, tauxTVA: number): Devis {
  return {
    ...devis,
    tauxTVA,
    lignes: (devis.lignes ?? []).map((ligne) => {
      if (isSectionLigne(ligne)) return ligne;
      return {
        ...ligne,
        ...patchLigneTvaFromSelect(String(tauxTVA)),
      };
    }),
  };
}
