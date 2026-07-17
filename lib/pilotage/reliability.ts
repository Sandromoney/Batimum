import { getChantierAchats } from "@/lib/chantier-marge";
import { isSectionLigne } from "@/lib/devis-lignes";
import type {
  Chantier,
  ChantierTimeEntry,
  Devis,
  Facture,
} from "@/lib/types";

export type PilotageFiabiliteNiveau =
  | "fiable"
  | "partiel"
  | "estimatif"
  | "non_calculable";

export const PILOTAGE_FIABILITE_LABELS: Record<PilotageFiabiliteNiveau, string> = {
  fiable: "Fiable",
  partiel: "Partiel",
  estimatif: "Estimatif",
  non_calculable: "Non calculable",
};

export function isDateInMonth(isoDate: string, referenceDate: Date): boolean {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === referenceDate.getFullYear() &&
    date.getMonth() === referenceDate.getMonth()
  );
}

export function chantierHasPointages(
  chantierId: string,
  entries: ChantierTimeEntry[],
): boolean {
  return entries.some((entry) => entry.chantierId === chantierId);
}

export function chantierHasAchats(chantier: Chantier): boolean {
  return getChantierAchats(chantier).length > 0;
}

export function devisHasPrixAchat(devis?: Devis): boolean {
  if (!devis) return false;
  return devis.lignes.some(
    (ligne) => !isSectionLigne(ligne) && (ligne.prixAchatHT ?? 0) > 0,
  );
}

export function computeChantierFiabilite(
  chantier: Chantier,
  options: {
    devis?: Devis;
    timeEntries?: ChantierTimeEntry[];
    prixVenteHT: number;
    debourseReel: number;
  },
): {
  niveau: PilotageFiabiliteNiveau;
  label: string;
  rentabiliteIncomplete: boolean;
} {
  const { devis, timeEntries = [], prixVenteHT, debourseReel } = options;

  if (prixVenteHT <= 0) {
    return {
      niveau: "non_calculable",
      label: "Non calculable",
      rentabiliteIncomplete: true,
    };
  }

  const hasPointages = chantierHasPointages(chantier.id, timeEntries);
  const hasAchats = chantierHasAchats(chantier);
  const hasPrevuMateriaux = devisHasPrixAchat(devis);
  const hasPrevuHeures = Boolean(
    (chantier.heuresPrevues ?? 0) > 0 ||
      (devis?.pilotageMainOeuvre?.heuresPrevues ?? 0) > 0,
  );

  if (!hasPointages && !hasAchats) {
    return {
      niveau: "estimatif",
      label: "Rentabilité incomplète",
      rentabiliteIncomplete: true,
    };
  }

  if (hasPointages && hasAchats && debourseReel > 0) {
    return {
      niveau: "fiable",
      label: PILOTAGE_FIABILITE_LABELS.fiable,
      rentabiliteIncomplete: false,
    };
  }

  if ((hasPointages || hasAchats) && (hasPrevuMateriaux || hasPrevuHeures)) {
    return {
      niveau: "partiel",
      label:
        !hasPointages || !hasAchats
          ? "Rentabilité incomplète"
          : PILOTAGE_FIABILITE_LABELS.partiel,
      rentabiliteIncomplete: !hasPointages || !hasAchats,
    };
  }

  return {
    niveau: "partiel",
    label: "Rentabilité incomplète",
    rentabiliteIncomplete: true,
  };
}

export function computeFacturesEncaisseesMoisHT(
  factures: Facture[],
  referenceDate: Date,
): { totalHT: number; count: number } {
  const paid = factures.filter(
    (facture) =>
      facture.statut === "payee" &&
      facture.datePaiement &&
      isDateInMonth(facture.datePaiement, referenceDate),
  );

  let totalHT = 0;
  for (const facture of paid) {
    if (facture.lignes?.length) {
      totalHT += facture.lignes.reduce(
        (sum, ligne) => sum + ligne.quantite * ligne.prixUnitaire,
        0,
      );
    } else if (typeof facture.montantHT === "number") {
      totalHT += facture.montantHT;
    } else {
      const taux = facture.tauxTVA ?? 0;
      totalHT += taux > 0 ? facture.montant / (1 + taux / 100) : facture.montant;
    }
  }

  return {
    totalHT: Math.round(totalHT * 100) / 100,
    count: paid.length,
  };
}

export function computePilotageFiabiliteGlobale(options: {
  chantiersAnalyses: number;
  chantiersFiables: number;
  chantiersPartiels: number;
  beneficeMoisDonneesManquantes: boolean;
  hasPointages: boolean;
  hasAchats: boolean;
  hasFacturesPayeesMois: boolean;
}): {
  niveau: PilotageFiabiliteNiveau;
  label: string;
} {
  const {
    chantiersAnalyses,
    chantiersFiables,
    beneficeMoisDonneesManquantes,
    hasPointages,
    hasAchats,
    hasFacturesPayeesMois,
  } = options;

  if (chantiersAnalyses === 0 && !hasFacturesPayeesMois) {
    return { niveau: "non_calculable", label: PILOTAGE_FIABILITE_LABELS.non_calculable };
  }

  if (
    chantiersFiables > 0 &&
    !beneficeMoisDonneesManquantes &&
    hasPointages &&
    hasAchats &&
    hasFacturesPayeesMois
  ) {
    return { niveau: "fiable", label: PILOTAGE_FIABILITE_LABELS.fiable };
  }

  if (chantiersFiables > 0 || hasFacturesPayeesMois || hasPointages || hasAchats) {
    return { niveau: "partiel", label: PILOTAGE_FIABILITE_LABELS.partiel };
  }

  return { niveau: "estimatif", label: PILOTAGE_FIABILITE_LABELS.estimatif };
}
