import { devisMontantHT } from "@/lib/chantier-devis-link";
import { getChantierAchats } from "@/lib/chantier-marge";
import { isSectionLigne } from "@/lib/devis-lignes";
import {
  computeEntryCoutMainOeuvre,
  resolveEmployeCoutHoraire,
} from "@/lib/pilotage/employe-cout";
import {
  computeChantierFiabilite,
  computeFacturesEncaisseesMoisHT,
  computePilotageFiabiliteGlobale,
  isDateInMonth,
} from "@/lib/pilotage/reliability";
import type {
  AppData,
  Chantier,
  ChantierRentabiliteResume,
  ChantierTimeEntry,
  Devis,
  Employe,
  Facture,
  LigneDevis,
} from "@/lib/types";

export function computeLigneMargeHT(ligne: LigneDevis): number {
  if (isSectionLigne(ligne)) return 0;
  const achat = ligne.prixAchatHT ?? 0;
  if (achat <= 0) return 0;
  return Math.round((ligne.prixUnitaire - achat) * ligne.quantite * 100) / 100;
}

export function computeLigneTauxMarge(ligne: LigneDevis): number {
  if (isSectionLigne(ligne) || ligne.prixUnitaire <= 0) return 0;
  const achat = ligne.prixAchatHT ?? 0;
  if (achat <= 0) return 0;
  const margeUnitaire = ligne.prixUnitaire - achat;
  return Math.round((margeUnitaire / ligne.prixUnitaire) * 10000) / 100;
}

export function computeDevisCoutMateriauxPrevu(devis: Devis): number {
  return devis.lignes.reduce((sum, ligne) => {
    if (isSectionLigne(ligne)) return sum;
    const achat = ligne.prixAchatHT ?? 0;
    if (achat <= 0) return sum;
    return sum + achat * ligne.quantite;
  }, 0);
}

export function computeDevisCoutMainOeuvrePrevu(devis: Devis): number {
  const mo = devis.pilotageMainOeuvre;
  if (!mo) return 0;
  const heures = mo.heuresPrevues ?? 0;
  const taux = mo.tauxHoraireInterne ?? 0;
  if (heures <= 0 || taux <= 0) return 0;
  return Math.round(heures * taux * 100) / 100;
}

export function parseTimeToMinutes(time: string | null | undefined): number {
  if (!time || typeof time !== "string") return 0;
  const [h, m] = time.split(":").map((part) => Number(part) || 0);
  return h * 60 + m;
}

export function computeTimeEntryHeures(entry: ChantierTimeEntry): number {
  if (!entry?.heureDebut || !entry?.heureFin) return 0;
  const start = parseTimeToMinutes(entry.heureDebut);
  const end = parseTimeToMinutes(entry.heureFin);
  if (end <= start) return 0;
  const brut = Math.max(0, end - start);
  const net = Math.max(0, brut - (Number(entry.pauseMinutes) || 0));
  return Math.round((net / 60) * 100) / 100;
}

export function getEmployeCoutHoraire(
  employe: Employe | undefined,
  options: {
    chantierTauxHoraire?: number;
    entrepriseTauxDefaut?: number;
  } = {},
): number {
  return resolveEmployeCoutHoraire(employe, options);
}

export function computeChantierTempsReelHeures(
  entries: ChantierTimeEntry[],
  chantierId: string,
): number {
  const total = entries
    .filter((entry) => entry.chantierId === chantierId)
    .reduce((sum, entry) => sum + computeTimeEntryHeures(entry), 0);
  return Math.round(total * 100) / 100;
}

export function computeChantierCoutMainOeuvreReel(
  entries: ChantierTimeEntry[],
  chantier: Chantier,
  employes: Employe[],
  entrepriseTauxDefaut?: number,
): number {
  const chantierTaux = resolveChantierTauxHoraireInterne(chantier);
  const coutOptions = {
    chantierTauxHoraire: chantierTaux > 0 ? chantierTaux : undefined,
    entrepriseTauxDefaut,
  };
  const total = entries
    .filter((entry) => entry.chantierId === chantier.id)
    .reduce((sum, entry) => {
      const heures = computeTimeEntryHeures(entry);
      const employe = employes.find((item) => item.id === entry.employeId);
      return sum + computeEntryCoutMainOeuvre(heures, employe, coutOptions);
    }, 0);
  return Math.round(total * 100) / 100;
}

export function computeChantierCoutMateriauxReel(chantier: Chantier): number {
  return getChantierAchats(chantier)
    .filter((achat) => achat.categorie === "materiaux")
    .reduce((sum, achat) => sum + achat.montantHT, 0);
}

export function computeChantierAchatsReelsHT(chantier: Chantier): number {
  return getChantierAchats(chantier).reduce(
    (sum, achat) => sum + achat.montantHT,
    0,
  );
}

export function computeChantierAchatsMoisHT(
  chantiers: Chantier[],
  referenceDate: Date,
): number {
  const total = chantiers.reduce((sum, chantier) => {
    const monthAchats = getChantierAchats(chantier)
      .filter((achat) => isDateInMonth(achat.date, referenceDate))
      .reduce((sub, achat) => sub + achat.montantHT, 0);
    return sum + monthAchats;
  }, 0);
  return Math.round(total * 100) / 100;
}

export function computeMainOeuvreReelleMois(
  entries: ChantierTimeEntry[],
  chantiers: Chantier[],
  employes: Employe[],
  entrepriseTauxDefaut?: number,
  referenceDate: Date = new Date(),
): { total: number; heures: number; tauxManquant: boolean } {
  const monthEntries = filterEntriesInMonth(entries, referenceDate);
  let total = 0;
  let heures = 0;
  let tauxManquant = false;

  for (const entry of monthEntries) {
    const heuresEntry = computeTimeEntryHeures(entry);
    heures += heuresEntry;
    const chantier = chantiers.find((item) => item.id === entry.chantierId);
    const employe = employes.find((item) => item.id === entry.employeId);
    const chantierTaux = chantier
      ? resolveChantierTauxHoraireInterne(chantier, undefined, entrepriseTauxDefaut)
      : entrepriseTauxDefaut ?? 0;
    const taux = resolveEmployeCoutHoraire(employe, {
      chantierTauxHoraire: chantierTaux > 0 ? chantierTaux : undefined,
      entrepriseTauxDefaut,
    });
    if (taux <= 0) tauxManquant = true;
    total += computeEntryCoutMainOeuvre(heuresEntry, employe, {
      chantierTauxHoraire: chantierTaux > 0 ? chantierTaux : undefined,
      entrepriseTauxDefaut,
    });
  }

  return {
    total: Math.round(total * 100) / 100,
    heures: Math.round(heures * 100) / 100,
    tauxManquant,
  };
}

export function computeBeneficeMensuelEstime(
  data: AppData,
  referenceDate: Date = new Date(),
): {
  benefice: number;
  encaisseHT: number;
  achatsHT: number;
  mainOeuvreHT: number;
  donneesManquantes: boolean;
  avertissement?: string;
} {
  const { totalHT: encaisseHT, count: facturesCount } =
    computeFacturesEncaisseesMoisHT(data.factures, referenceDate);
  const achatsHT = computeChantierAchatsMoisHT(data.chantiers, referenceDate);
  const mo = computeMainOeuvreReelleMois(
    data.chantierTimeEntries ?? [],
    data.chantiers,
    data.employes,
    data.parametres.tauxHoraireInterneDefaut,
    referenceDate,
  );

  const donneesManquantes =
    facturesCount === 0 ||
    (achatsHT === 0 && mo.heures === 0) ||
    mo.tauxManquant;

  const benefice = Math.round((encaisseHT - achatsHT - mo.total) * 100) / 100;

  return {
    benefice,
    encaisseHT,
    achatsHT,
    mainOeuvreHT: mo.total,
    donneesManquantes,
    avertissement: donneesManquantes
      ? "Certaines données sont manquantes, le résultat est estimatif."
      : undefined,
  };
}

export function resolveChantierHeuresPrevues(
  chantier: Chantier,
  devis?: Devis,
): number {
  if (chantier.heuresPrevues && chantier.heuresPrevues > 0) {
    return chantier.heuresPrevues;
  }
  return devis?.pilotageMainOeuvre?.heuresPrevues ?? 0;
}

export function resolveChantierTauxHoraireInterne(
  chantier: Chantier,
  devis?: Devis,
  entrepriseTauxDefaut?: number,
): number {
  if (chantier.tauxHoraireInterne && chantier.tauxHoraireInterne > 0) {
    return chantier.tauxHoraireInterne;
  }
  const fromDevis = devis?.pilotageMainOeuvre?.tauxHoraireInterne ?? 0;
  if (fromDevis > 0) return fromDevis;
  return entrepriseTauxDefaut ?? 0;
}

export function resolveChantierCoutMainOeuvrePrevu(
  chantier: Chantier,
  devis?: Devis,
  entrepriseTauxDefaut?: number,
): number {
  const heures = resolveChantierHeuresPrevues(chantier, devis);
  const taux = resolveChantierTauxHoraireInterne(
    chantier,
    devis,
    entrepriseTauxDefaut,
  );
  if (heures > 0 && taux > 0) {
    return Math.round(heures * taux * 100) / 100;
  }
  if (devis) return computeDevisCoutMainOeuvrePrevu(devis);
  return 0;
}

export function resolveChantierCoutMateriauxPrevu(
  chantier: Chantier,
  devis?: Devis,
): number {
  if (devis) {
    const fromDevis = computeDevisCoutMateriauxPrevu(devis);
    if (fromDevis > 0) return fromDevis;
  }
  return chantier.budget > 0 ? Math.round(chantier.budget * 0.4 * 100) / 100 : 0;
}

export function computeChantierRentabilite(
  chantier: Chantier,
  options: {
    devis?: Devis;
    timeEntries?: ChantierTimeEntry[];
    employes?: Employe[];
    entrepriseTauxDefaut?: number;
  } = {},
): ChantierRentabiliteResume {
  const {
    devis,
    timeEntries = [],
    employes = [],
    entrepriseTauxDefaut,
  } = options;
  const prixVenteHT = devis ? devisMontantHT(devis) : chantier.budget;

  const coutMateriauxPrevu = resolveChantierCoutMateriauxPrevu(chantier, devis);
  const coutMainOeuvrePrevu = resolveChantierCoutMainOeuvrePrevu(
    chantier,
    devis,
    entrepriseTauxDefaut,
  );
  const coutTotalPrevu = Math.round((coutMateriauxPrevu + coutMainOeuvrePrevu) * 100) / 100;

  const coutMateriauxReel = computeChantierCoutMateriauxReel(chantier);
  const achatsReelsHT = computeChantierAchatsReelsHT(chantier);
  const coutMainOeuvreReel = computeChantierCoutMainOeuvreReel(
    timeEntries,
    chantier,
    employes,
    entrepriseTauxDefaut,
  );
  const debourseReel = Math.round((achatsReelsHT + coutMainOeuvreReel) * 100) / 100;
  const coutTotalReel = debourseReel;

  const tempsPrevuHeures = resolveChantierHeuresPrevues(chantier, devis);
  const tempsReelHeures = computeChantierTempsReelHeures(timeEntries, chantier.id);

  const margePrevue = Math.round((prixVenteHT - coutTotalPrevu) * 100) / 100;
  const margeReelle = Math.round((prixVenteHT - debourseReel) * 100) / 100;
  const tauxMargeReelle =
    prixVenteHT > 0
      ? Math.round((margeReelle / prixVenteHT) * 10000) / 100
      : 0;

  const ecartTempsHeures = Math.round((tempsReelHeures - tempsPrevuHeures) * 100) / 100;
  const ecartCoutTotal = Math.round((debourseReel - coutTotalPrevu) * 100) / 100;

  const fiabiliteInfo = computeChantierFiabilite(chantier, {
    devis,
    timeEntries,
    prixVenteHT,
    debourseReel,
  });

  return {
    prixVenteHT,
    coutMateriauxPrevu,
    coutMateriauxReel,
    achatsReelsHT: Math.round(achatsReelsHT * 100) / 100,
    coutMainOeuvrePrevu,
    coutMainOeuvreReel,
    coutTotalPrevu,
    coutTotalReel,
    debourseReel,
    tempsPrevuHeures,
    tempsReelHeures,
    margePrevue,
    margeReelle,
    tauxMargeReelle,
    ecartTempsHeures,
    ecartCoutTotal,
    beneficeReel: margeReelle,
    fiabilite: fiabiliteInfo.niveau,
    fiabiliteLabel: fiabiliteInfo.label,
    rentabiliteIncomplete: fiabiliteInfo.rentabiliteIncomplete,
  };
}

export type ChantierRentabiliteClassement = {
  chantier: Chantier;
  rentabilite: ChantierRentabiliteResume;
  devis?: Devis;
};

export function buildChantiersRentabilite(
  data: AppData,
): ChantierRentabiliteClassement[] {
  const entries = data.chantierTimeEntries ?? [];
  const entrepriseTauxDefaut = data.parametres.tauxHoraireInterneDefaut;
  return data.chantiers
    .map((chantier) => {
      const devis = chantier.devisId
        ? data.devis.find((item) => item.id === chantier.devisId)
        : undefined;
      return {
        chantier,
        devis,
        rentabilite: computeChantierRentabilite(chantier, {
          devis,
          timeEntries: entries,
          employes: data.employes,
          entrepriseTauxDefaut,
        }),
      };
    })
    .filter((item) => item.rentabilite.prixVenteHT > 0);
}

export function filterEntriesInMonth(
  entries: ChantierTimeEntry[],
  referenceDate: Date,
): ChantierTimeEntry[] {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  return entries.filter((entry) => {
    const date = new Date(`${entry.date}T12:00:00`);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

export function computeMonthlyPilotageKpis(
  data: AppData,
  referenceDate: Date = new Date(),
) {
  const classements = buildChantiersRentabilite(data);
  const monthEntries = filterEntriesInMonth(data.chantierTimeEntries ?? [], referenceDate);
  const beneficeMois = computeBeneficeMensuelEstime(data, referenceDate);

  const chantierIdsInMonth = new Set([
    ...monthEntries.map((entry) => entry.chantierId),
    ...data.factures
      .filter(
        (facture) =>
          facture.statut === "payee" &&
          facture.datePaiement &&
          isDateInMonth(facture.datePaiement, referenceDate),
      )
      .flatMap((facture) => {
        const ids: string[] = [];
        if (facture.chantierId) ids.push(facture.chantierId);
        if (facture.chantierLieId) ids.push(facture.chantierLieId);
        return ids;
      }),
  ]);

  const chantiersDuMois = classements.filter((item) =>
    chantierIdsInMonth.has(item.chantier.id),
  );

  const ecartCoutMois = chantiersDuMois.reduce(
    (sum, item) => sum + item.rentabilite.ecartCoutTotal,
    0,
  );
  const ecartTempsMois = chantiersDuMois.reduce(
    (sum, item) => sum + Math.max(0, item.rentabilite.ecartTempsHeures),
    0,
  );

  const classementsAnalysables = classements.filter(
    (item) =>
      item.rentabilite.fiabilite !== "non_calculable" &&
      item.rentabilite.fiabilite !== "estimatif",
  );

  const sortedByMarge = [...classementsAnalysables].sort(
    (a, b) => b.rentabilite.margeReelle - a.rentabilite.margeReelle,
  );

  const poolRentabilite =
    chantiersDuMois.length > 0
      ? chantiersDuMois.filter(
          (item) => item.rentabilite.fiabilite !== "non_calculable",
        )
      : classementsAnalysables;
  const rentabiliteMoyenneMois =
    poolRentabilite.length > 0
      ? poolRentabilite.reduce(
          (sum, item) => sum + item.rentabilite.tauxMargeReelle,
          0,
        ) / poolRentabilite.length
      : 0;

  const pointsAttention = [...classements]
    .filter(
      (item) =>
        item.rentabilite.rentabiliteIncomplete ||
        item.rentabilite.margeReelle < 0 ||
        item.rentabilite.ecartTempsHeures >= 4 ||
        item.rentabilite.ecartCoutTotal > 0,
    )
    .sort((a, b) => {
      const scoreA =
        (a.rentabilite.rentabiliteIncomplete ? 500 : 0) +
        (a.rentabilite.margeReelle < 0 ? 1000 : 0) +
        a.rentabilite.ecartTempsHeures * 10 +
        a.rentabilite.ecartCoutTotal;
      const scoreB =
        (b.rentabilite.rentabiliteIncomplete ? 500 : 0) +
        (b.rentabilite.margeReelle < 0 ? 1000 : 0) +
        b.rentabilite.ecartTempsHeures * 10 +
        b.rentabilite.ecartCoutTotal;
      return scoreB - scoreA;
    })
    .slice(0, 5);

  const fiabiliteGlobale = computePilotageFiabiliteGlobale({
    chantiersAnalyses: classements.length,
    chantiersFiables: classements.filter(
      (item) => item.rentabilite.fiabilite === "fiable",
    ).length,
    chantiersPartiels: classements.filter(
      (item) => item.rentabilite.fiabilite === "partiel",
    ).length,
    beneficeMoisDonneesManquantes: beneficeMois.donneesManquantes,
    hasPointages: monthEntries.length > 0,
    hasAchats: beneficeMois.achatsHT > 0,
    hasFacturesPayeesMois: beneficeMois.encaisseHT > 0,
  });

  return {
    beneficeReelMois: beneficeMois.benefice,
    beneficeMoisAvertissement: beneficeMois.avertissement,
    beneficeMoisEncaisseHT: beneficeMois.encaisseHT,
    beneficeMoisAchatsHT: beneficeMois.achatsHT,
    beneficeMoisMainOeuvreHT: beneficeMois.mainOeuvreHT,
    margeReelleMois: beneficeMois.benefice,
    ecartPrevuReelMois: Math.round(ecartCoutMois * 100) / 100,
    ecartCoutMois: Math.round(ecartCoutMois * 100) / 100,
    ecartTempsMois: Math.round(ecartTempsMois * 100) / 100,
    tempsPerduEstimeHeures: Math.round(ecartTempsMois * 100) / 100,
    rentabiliteMoyenneMois: Math.round(rentabiliteMoyenneMois * 100) / 100,
    plusRentables: sortedByMarge.slice(0, 5),
    moinsRentables:
      pointsAttention.length > 0
        ? pointsAttention
        : [...sortedByMarge].reverse().slice(0, 5),
    chantiersDuMois,
    chantiersSuivis: classements.length,
    fiabiliteGlobale,
  };
}

/** Préparation future MUM IA — contexte structuré par chantier. */
export function buildChantierRentabiliteContext(
  chantier: Chantier,
  data: AppData,
): Record<string, unknown> {
  const devis = chantier.devisId
    ? data.devis.find((item) => item.id === chantier.devisId)
    : undefined;
  const rentabilite = computeChantierRentabilite(chantier, {
    devis,
    timeEntries: data.chantierTimeEntries ?? [],
    employes: data.employes,
    entrepriseTauxDefaut: data.parametres.tauxHoraireInterneDefaut,
  });
  return {
    chantierId: chantier.id,
    chantierNom: chantier.nom,
    devisNumero: devis?.numero,
    ...rentabilite,
  };
}
