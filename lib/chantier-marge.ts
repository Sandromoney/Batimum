import { factureMontantHT } from "./factures";
import {
  getFactureChantierLieId,
  getFactureDevisLieId,
  getMontantFactureTTC,
} from "./factures-progressive";
import { getTotalAvoirTTC } from "./avoirs";
import type {
  AchatChantier,
  Avoir,
  CategorieAchatChantier,
  Chantier,
  Facture,
} from "./types";

export const CATEGORIES_ACHAT_LABELS: Record<CategorieAchatChantier, string> = {
  materiaux: "Matériaux",
  main_oeuvre: "Main d'œuvre",
  location: "Location",
  sous_traitance: "Sous-traitance",
  autre: "Autre",
};

export const CATEGORIES_ACHAT: CategorieAchatChantier[] = [
  "materiaux",
  "main_oeuvre",
  "location",
  "sous_traitance",
  "autre",
];

export function getChantierAchats(chantier: Chantier): AchatChantier[] {
  return chantier.achats ?? [];
}

export function achatMontantTTC(achat: AchatChantier): number {
  return Math.round(achat.montantHT * (1 + achat.tauxTVA / 100) * 100) / 100;
}

export function getTotalAchatsHT(chantier: Chantier): number {
  return getChantierAchats(chantier).reduce((sum, achat) => sum + achat.montantHT, 0);
}

export function getChantierFacturesLiees(
  chantier: Chantier,
  factures: Facture[],
): Facture[] {
  return factures.filter((facture) => {
    if (getFactureChantierLieId(facture) === chantier.id) return true;
    if (chantier.devisId && getFactureDevisLieId(facture) === chantier.devisId) {
      return true;
    }
    return false;
  });
}

export function getChantierTotalFactureHT(
  chantier: Chantier,
  factures: Facture[],
  avoirs: Avoir[] | undefined,
): number {
  return getChantierFacturesLiees(chantier, factures).reduce((sum, facture) => {
    const brutHT = factureMontantHT(facture);
    const totalAvoirTTC = getTotalAvoirTTC(avoirs, facture.id);
    if (totalAvoirTTC <= 0) return sum + brutHT;
    const taux = facture.tauxTVA ?? 0;
    const avoirHT =
      taux > 0
        ? Math.round((totalAvoirTTC / (1 + taux / 100)) * 100) / 100
        : totalAvoirTTC;
    return sum + Math.max(0, brutHT - avoirHT);
  }, 0);
}

export function getChantierTotalFactureTTC(
  chantier: Chantier,
  factures: Facture[],
  avoirs: Avoir[] | undefined,
): number {
  return getChantierFacturesLiees(chantier, factures).reduce((sum, facture) => {
    const brut = getMontantFactureTTC(facture);
    const avoir = getTotalAvoirTTC(avoirs, facture.id);
    return sum + Math.max(0, brut - avoir);
  }, 0);
}

export type ChantierMargeResume = {
  budget: number;
  totalFactureHT: number;
  totalFactureTTC: number;
  totalAchatsHT: number;
  margeEstimee: number;
  tauxMarge: number;
};

export function computeChantierMarge(
  chantier: Chantier,
  factures: Facture[],
  avoirs: Avoir[] | undefined,
): ChantierMargeResume {
  const totalFactureHT = getChantierTotalFactureHT(chantier, factures, avoirs);
  const totalFactureTTC = getChantierTotalFactureTTC(chantier, factures, avoirs);
  const totalAchatsHT = getTotalAchatsHT(chantier);
  const margeEstimee = Math.round((totalFactureHT - totalAchatsHT) * 100) / 100;
  const tauxMarge =
    totalFactureHT > 0
      ? Math.round((margeEstimee / totalFactureHT) * 10000) / 100
      : 0;

  return {
    budget: chantier.budget,
    totalFactureHT,
    totalFactureTTC,
    totalAchatsHT,
    margeEstimee,
    tauxMarge,
  };
}
