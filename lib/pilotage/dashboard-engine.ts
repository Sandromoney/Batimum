/**
 * Moteur d'agrégation du dashboard Pilotage premium.
 * Toutes les valeurs sont dérivées des données existantes — jamais inventées.
 */
import { buildPilotageSynthese } from "@/lib/batimum-insights";
import { getChantierAchats } from "@/lib/chantier-marge";
import {
  buildChantiersRentabilite,
  computeBeneficeMensuelEstime,
  computeMonthlyPilotageKpis,
  computeTimeEntryHeures,
} from "@/lib/pilotage/calculations";
import {
  computeAnalyseParTypeChantier,
  computeEmployeEfficaciteDomains,
} from "@/lib/pilotage/analytics";
import {
  getCategoriePilotageLabel,
  resolveChantierCategoriePilotage,
} from "@/lib/pilotage/categories";
import { generatePilotageAlertes } from "@/lib/pilotage/alerts";
import { computeFacturesEncaisseesMoisHT } from "@/lib/pilotage/reliability";
import { buildSupplierPriceInsights } from "@/lib/pilotage/supplier-insights";
import { calculateSaasMetrics } from "@/lib/saas-calculations";
import type {
  AppData,
  CategoriePilotageChantier,
  Employe,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export type PilotagePeriod = "7d" | "30d" | "90d" | "12m";

export type PilotageKpiItem = {
  id: string;
  label: string;
  value: string;
  variationPct: number | null;
  comparisonLabel: string;
  estimation?: boolean;
  estimationHint?: string;
  tone: "neutral" | "positive" | "warning";
};

export type PilotageTimelineEvent = {
  id: string;
  time: string;
  label: string;
  tone: "neutral" | "positive" | "warning";
};

export type PilotageEmployeClassement = {
  employe: Employe;
  rentabilitePct: number;
  caGenere: number;
  marge: number;
  heures: number;
  retards: number;
  heuresPerdues: number;
  chantiersTermines: number;
  estimation: boolean;
};

export type PilotageMetierPodium = {
  categorie: CategoriePilotageChantier;
  label: string;
  employe?: Employe;
  rentabilitePct: number;
};

export type PilotageFournisseurSpend = {
  nom: string;
  totalHT: number;
};

export type PilotageSeriesPoint = {
  label: string;
  ca: number;
  marge: number;
  rentabilite: number;
  tempsPerdu: number;
  tempsTravaille: number;
  heuresPointees: number;
  productivite: number;
};

export type PilotageChantierCard = {
  id: string;
  nom: string;
  ca: number;
  marge: number;
  margePct: number;
  depassement: number;
  tempsReel: number;
  tempsPrevu: number;
  budget: number;
  motif?: string;
  estimation: boolean;
};

export type PilotageDashboardModel = {
  greetingName: string;
  potentielPct: number;
  objectifPct: number;
  objectifCa: number;
  previsionFinMois: number;
  /** Insights du matin — Assistant Batimum */
  assistantLines: string[];
  kpis: PilotageKpiItem[];
  timeline: PilotageTimelineEvent[];
  employes: PilotageEmployeClassement[];
  metiers: PilotageMetierPodium[];
  chantiersRentables: PilotageChantierCard[];
  chantiersSurveillance: PilotageChantierCard[];
  fournisseurs: PilotageFournisseurSpend[];
  fournisseurInsights: string[];
  types: ReturnType<typeof computeAnalyseParTypeChantier>;
  typeFournisseurs: Record<string, string>;
  alertes: ReturnType<typeof generatePilotageAlertes>;
  series: PilotageSeriesPoint[];
  forecast: {
    ca: number;
    margePct: number;
    resultat: string;
    objectifAtteint: boolean;
    tresorerie: string;
    estimation: boolean;
  };
  assistantAnalyse: string[];
  assistantConseils: string[];
  /** Nombre d'alertes actionnables (pastille assistant). */
  importantAlertCount: number;
};

function shiftMonth(reference: Date, delta: number): Date {
  const d = new Date(reference);
  d.setMonth(d.getMonth() + delta);
  return d;
}

function variationPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function todayISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatTimeLabel(isoOrTime: string): string {
  if (/^\d{2}:\d{2}/.test(isoOrTime)) return isoOrTime.slice(0, 5);
  const d = new Date(isoOrTime);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** Minutes depuis minuit pour un horaire HH:MM. */
function timeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Retard = pointage démarrant plus de 15 min après l'heure prévue au planning,
 * ou signalement employé mentionnant un retard.
 */
function countEmployeRetards(data: AppData, employeId: string): number {
  let count = 0;
  for (const event of data.planning ?? []) {
    if (!(event.employeIds ?? []).includes(employeId)) continue;
    const planned = timeToMinutes(event.heureDebut);
    if (planned == null) continue;
    const entriesSameDay = (data.chantierTimeEntries ?? []).filter(
      (entry) =>
        entry.employeId === employeId &&
        entry.date === event.date &&
        (!event.chantierId || entry.chantierId === event.chantierId),
    );
    if (entriesSameDay.length === 0) continue;
    const firstStart = Math.min(
      ...entriesSameDay
        .map((entry) => timeToMinutes(entry.heureDebut))
        .filter((v): v is number => v != null),
    );
    if (Number.isFinite(firstStart) && firstStart - planned > 15) {
      count += 1;
    }
  }
  for (const event of data.planning ?? []) {
    for (const signalement of event.employeProblemes ?? []) {
      if (signalement.employeId !== employeId) continue;
      if (/retard/i.test(signalement.message)) count += 1;
    }
  }
  return count;
}

export function computeEmployesPresentsAujourdHui(
  data: AppData,
  referenceDate: Date = new Date(),
): number {
  const today = todayISO(referenceDate);
  const fromPointages = new Set(
    (data.chantierTimeEntries ?? [])
      .filter((entry) => entry.date === today)
      .map((entry) => entry.employeId),
  );
  const fromPlanning = new Set(
    (data.planning ?? [])
      .filter((event) => event.date === today)
      .flatMap((event) => event.employeIds ?? []),
  );
  return new Set([...fromPointages, ...fromPlanning]).size;
}

export function computeFournisseurSpend(
  data: AppData,
): PilotageFournisseurSpend[] {
  const map = new Map<string, number>();
  for (const chantier of data.chantiers) {
    for (const achat of getChantierAchats(chantier)) {
      const nom = (achat.fournisseur || "Fournisseur non renseigné").trim();
      map.set(nom, (map.get(nom) ?? 0) + (achat.montantHT ?? 0));
    }
  }
  return [...map.entries()]
    .map(([nom, totalHT]) => ({
      nom,
      totalHT: Math.round(totalHT * 100) / 100,
    }))
    .sort((a, b) => b.totalHT - a.totalHT)
    .slice(0, 8);
}

/** Fournisseur principal (achats HT) par catégorie de chantier. */
export function computeFournisseurPrincipalParType(
  data: AppData,
): Record<string, string> {
  const classements = buildChantiersRentabilite(data);
  const byCat = new Map<string, Map<string, number>>();

  for (const item of classements) {
    const categorie = resolveChantierCategoriePilotage(item.chantier, item.devis);
    const spend = byCat.get(categorie) ?? new Map<string, number>();
    for (const achat of getChantierAchats(item.chantier)) {
      const nom = (achat.fournisseur || "").trim();
      if (!nom) continue;
      spend.set(nom, (spend.get(nom) ?? 0) + (achat.montantHT ?? 0));
    }
    byCat.set(categorie, spend);
  }

  const result: Record<string, string> = {};
  for (const [categorie, spend] of byCat) {
    const top = [...spend.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) result[categorie] = top[0];
  }
  return result;
}

export function buildPilotageTimeline(
  data: AppData,
  referenceDate: Date = new Date(),
): PilotageTimelineEvent[] {
  const today = todayISO(referenceDate);
  const events: PilotageTimelineEvent[] = [];

  for (const entry of data.chantierTimeEntries ?? []) {
    if (entry.date !== today) continue;
    const employe = data.employes.find((item) => item.id === entry.employeId);
    const chantier = data.chantiers.find((item) => item.id === entry.chantierId);
    events.push({
      id: `time-${entry.id}`,
      time: entry.heureDebut,
      label: `${employe ? `${employe.prenom} ${employe.nom}` : "Un employé"} a pointé${
        chantier ? ` sur ${chantier.nom}` : ""
      }.`,
      tone: "neutral",
    });
  }

  for (const devis of data.devis) {
    const signed = devis.historique?.find(
      (h) =>
        (h.type === "signe" || h.label?.toLowerCase().includes("sign")) &&
        h.date?.startsWith(today),
    );
    if (signed) {
      events.push({
        id: `devis-${devis.id}-${signed.date}`,
        time: formatTimeLabel(signed.date),
        label: `Le devis ${devis.numero || devis.titre || ""} vient d'être signé.`,
        tone: "positive",
      });
    }
  }

  for (const facture of data.factures) {
    if (
      facture.statut === "payee" &&
      facture.datePaiement?.startsWith(today)
    ) {
      events.push({
        id: `facture-${facture.id}`,
        time: formatTimeLabel(facture.datePaiement),
        label: `Facture ${facture.numero || ""} encaissée.`,
        tone: "positive",
      });
    }
  }

  const classements = buildChantiersRentabilite(data);
  for (const item of classements) {
    if (
      item.rentabilite.ecartCoutTotal > 0 ||
      item.rentabilite.margeReelle < 0
    ) {
      events.push({
        id: `budget-${item.chantier.id}`,
        time: "—",
        label: `Le chantier ${item.chantier.nom} nécessite une attention budgétaire.`,
        tone: "warning",
      });
    }
  }

  for (const insight of buildSupplierPriceInsights(data).slice(0, 2)) {
    events.push({
      id: `prix-${insight.id}`,
      time: "—",
      label: insight.message,
      tone: "positive",
    });
  }

  return events
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 12);
}

export function buildEmployeClassement(
  data: AppData,
): PilotageEmployeClassement[] {
  const efficacite = computeEmployeEfficaciteDomains(data);
  const classements = buildChantiersRentabilite(data);
  const entries = data.chantierTimeEntries ?? [];

  return efficacite
    .map((row) => {
      const employeEntries = entries.filter(
        (entry) => entry.employeId === row.employe.id,
      );
      const chantierIds = new Set(employeEntries.map((e) => e.chantierId));
      let caGenere = 0;
      let marge = 0;
      let heuresPerdues = 0;
      let chantiersTermines = 0;

      for (const chantierId of chantierIds) {
        const item = classements.find((c) => c.chantier.id === chantierId);
        if (!item) continue;
        const part =
          employeEntries
            .filter((e) => e.chantierId === chantierId)
            .reduce((s, e) => s + computeTimeEntryHeures(e), 0) /
          Math.max(item.rentabilite.tempsReelHeures, 0.01);
        caGenere += item.rentabilite.prixVenteHT * Math.min(1, part);
        marge += item.rentabilite.margeReelle * Math.min(1, part);
        heuresPerdues += Math.max(0, item.rentabilite.ecartTempsHeures) * Math.min(1, part);
        if (item.chantier.statut === "termine") chantiersTermines += 1;
      }

      const retards = countEmployeRetards(data, row.employe.id);

      return {
        employe: row.employe,
        rentabilitePct: Math.round(row.margeMoyenneChantiers * 10) / 10,
        caGenere: Math.round(caGenere * 100) / 100,
        marge: Math.round(marge * 100) / 100,
        heures: row.heuresTravaillees,
        retards,
        heuresPerdues: Math.round(heuresPerdues * 100) / 100,
        chantiersTermines,
        estimation: row.heuresTravaillees <= 0 || row.margeMoyenneChantiers === 0,
      };
    })
    .sort((a, b) => b.rentabilitePct - a.rentabilitePct || b.marge - a.marge);
}

export function buildMetierPodium(data: AppData): PilotageMetierPodium[] {
  const classements = buildChantiersRentabilite(data);
  const entries = data.chantierTimeEntries ?? [];
  const byType = new Map<
    CategoriePilotageChantier,
    Map<string, { heures: number; margeSum: number; count: number }>
  >();

  for (const item of classements) {
    const categorie = resolveChantierCategoriePilotage(item.chantier, item.devis);
    const typeMap = byType.get(categorie) ?? new Map();
    const chantierEntries = entries.filter(
      (entry) => entry.chantierId === item.chantier.id,
    );
    const byEmploye = new Map<string, number>();
    for (const entry of chantierEntries) {
      byEmploye.set(
        entry.employeId,
        (byEmploye.get(entry.employeId) ?? 0) + computeTimeEntryHeures(entry),
      );
    }
    for (const [employeId, heures] of byEmploye) {
      const current = typeMap.get(employeId) ?? {
        heures: 0,
        margeSum: 0,
        count: 0,
      };
      current.heures += heures;
      current.margeSum += item.rentabilite.tauxMargeReelle;
      current.count += 1;
      typeMap.set(employeId, current);
    }
    byType.set(categorie, typeMap);
  }

  return [...byType.entries()]
    .map(([categorie, employeMap]) => {
      let bestId: string | undefined;
      let bestScore = -Infinity;
      for (const [employeId, stats] of employeMap) {
        const score =
          stats.count > 0 ? stats.margeSum / stats.count : 0;
        if (score > bestScore) {
          bestScore = score;
          bestId = employeId;
        }
      }
      const employe = data.employes.find((item) => item.id === bestId);
      return {
        categorie,
        label: getCategoriePilotageLabel(categorie),
        employe,
        rentabilitePct: Math.round(bestScore * 10) / 10,
      };
    })
    .filter((row) => row.employe)
    .sort((a, b) => b.rentabilitePct - a.rentabilitePct)
    .slice(0, 8);
}

function buildSeries(
  data: AppData,
  period: PilotagePeriod,
  referenceDate: Date,
): PilotageSeriesPoint[] {
  const points: PilotageSeriesPoint[] = [];
  const count =
    period === "7d" ? 7 : period === "30d" ? 6 : period === "90d" ? 6 : 12;

  for (let i = count - 1; i >= 0; i--) {
    const ref = new Date(referenceDate);
    if (period === "7d") {
      ref.setDate(ref.getDate() - i);
    } else if (period === "30d" || period === "90d") {
      const days = period === "30d" ? 5 : 15;
      ref.setDate(ref.getDate() - i * days);
    } else {
      ref.setMonth(ref.getMonth() - i);
    }

    const benefice = computeBeneficeMensuelEstime(data, ref);
    const kpis = computeMonthlyPilotageKpis(data, ref);
    const metrics = calculateSaasMetrics(data, ref);
    const label =
      period === "12m"
        ? ref.toLocaleDateString("fr-FR", { month: "short" })
        : ref.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

    const dayKey = ref.toISOString().slice(0, 10);
    const heuresPointees = (data.chantierTimeEntries ?? [])
      .filter((entry) => {
        if (period === "7d") return entry.date === dayKey;
        if (period === "12m") return entry.date.startsWith(dayKey.slice(0, 7));
        const start = new Date(ref);
        start.setDate(start.getDate() - (period === "30d" ? 4 : 14));
        return entry.date >= start.toISOString().slice(0, 10) && entry.date <= dayKey;
      })
      .reduce((sum, entry) => sum + computeTimeEntryHeures(entry), 0);

    points.push({
      label,
      ca: metrics.chiffreAffairesMensuel,
      marge: benefice.benefice,
      rentabilite: kpis.rentabiliteMoyenneMois,
      tempsPerdu: kpis.tempsPerduEstimeHeures,
      tempsTravaille: Math.round(heuresPointees * 10) / 10,
      heuresPointees: Math.round(heuresPointees * 10) / 10,
      productivite: Math.max(
        0,
        100 - Math.min(40, kpis.tempsPerduEstimeHeures * 2),
      ),
    });
  }

  return points;
}

export function buildPilotageDashboard(
  data: AppData,
  options: {
    referenceDate?: Date;
    period?: PilotagePeriod;
  } = {},
): PilotageDashboardModel {
  const referenceDate = options.referenceDate ?? new Date();
  const period = options.period ?? "30d";
  const synthese = buildPilotageSynthese(data, referenceDate);
  const kpisMois = computeMonthlyPilotageKpis(data, referenceDate);
  const kpisPrev = computeMonthlyPilotageKpis(data, shiftMonth(referenceDate, -1));
  const encaisse = computeFacturesEncaisseesMoisHT(data.factures, referenceDate);
  const encaissePrev = computeFacturesEncaisseesMoisHT(
    data.factures,
    shiftMonth(referenceDate, -1),
  );
  const metrics = calculateSaasMetrics(data, referenceDate);
  const objectifCa = data.parametres.objectifCaMensuel ?? 15000;
  const dayOfMonth = referenceDate.getDate();
  const daysInMonth = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    0,
  ).getDate();
  const runRate =
    dayOfMonth > 0 ? (encaisse.totalHT / dayOfMonth) * daysInMonth : encaisse.totalHT;
  const objectifPct =
    objectifCa > 0
      ? Math.min(100, Math.round((encaisse.totalHT / objectifCa) * 100))
      : 0;
  const potentielPct = Math.min(
    100,
    Math.round(
      (objectifPct * 0.45 +
        Math.max(0, Math.min(100, kpisMois.rentabiliteMoyenneMois + 50)) * 0.35 +
        (kpisMois.fiabiliteGlobale.niveau === "fiable"
          ? 90
          : kpisMois.fiabiliteGlobale.niveau === "partiel"
            ? 65
            : 40) *
          0.2),
    ),
  );

  const chantiersActifs = data.chantiers.filter((c) =>
    ["en_cours", "en_retard", "retard_demarrage"].includes(c.statut),
  ).length;
  const alertes = generatePilotageAlertes(data, referenceDate);
  const alertesCount = alertes.filter((a) => a.niveau === "attention").length;
  const presents = computeEmployesPresentsAujourdHui(data, referenceDate);
  const employes = buildEmployeClassement(data);
  const fournisseurs = computeFournisseurSpend(data);
  const types = computeAnalyseParTypeChantier(data);
  const classements = buildChantiersRentabilite(data);

  const topSpend = fournisseurs[0];
  const totalSpend = fournisseurs.reduce((s, f) => s + f.totalHT, 0);
  const priceInsights = buildSupplierPriceInsights(data);
  const fournisseurInsights: string[] = priceInsights.map((item) => item.message);
  if (topSpend && totalSpend > 0) {
    const share = Math.round((topSpend.totalHT / totalSpend) * 100);
    fournisseurInsights.unshift(
      `${topSpend.nom} représente ${share} % de vos achats enregistrés.`,
    );
  }
  if (fournisseurInsights.length === 0) {
    fournisseurInsights.push(
      "Importez vos tarifs dans Fourniture > Produits pour activer le comparatif automatique.",
    );
  }

  const assistantAnalyse: string[] = [
    `Depuis le début du mois, le CA encaissé s'élève à ${formatCurrency(encaisse.totalHT)}.`,
    `La marge réelle estimée est de ${formatCurrency(kpisMois.beneficeReelMois)}.`,
  ];
  if (employes[0]) {
    assistantAnalyse.push(
      `${employes[0].employe.prenom} est actuellement votre collaborateur le plus rentable.`,
    );
  }
  if (types[0]) {
    assistantAnalyse.push(
      `Les chantiers « ${types[0].label} » sont vos plus rentables (${types[0].rentabiliteMoyenne.toFixed(0)} %).`,
    );
  }
  if (topSpend && totalSpend > 0) {
    assistantAnalyse.push(
      `${topSpend.nom} représente ${Math.round((topSpend.totalHT / totalSpend) * 100)} % de vos achats.`,
    );
  }
  if (kpisMois.tempsPerduEstimeHeures > 0) {
    assistantAnalyse.push(
      `Environ ${kpisMois.tempsPerduEstimeHeures.toFixed(0)} h de dépassement de temps sont détectées ce mois-ci.`,
    );
  }

  const assistantConseils = [
    alertesCount > 0
      ? `Traitez d'abord les ${alertesCount} alerte${alertesCount > 1 ? "s" : ""} prioritaires.`
      : "Aucune alerte critique — maintenez le rythme actuel.",
    fournisseurs.length > 0
      ? "Vérifiez le comparatif de prix avant votre prochaine commande matériaux."
      : "Enregistrez les achats sur vos chantiers pour fiabiliser la marge.",
    kpisMois.rentabiliteMoyenneMois < 20
      ? "Surveillez les chantiers sous 20 % de marge avant de lancer de nouveaux devis."
      : "Votre rentabilité moyenne est saine — capitalisez sur vos types de chantiers gagnants.",
  ];

  const caVar = variationPct(encaisse.totalHT, encaissePrev.totalHT);
  const margeVar = variationPct(
    kpisMois.beneficeReelMois,
    kpisPrev.beneficeReelMois,
  );
  const rentVar = variationPct(
    kpisMois.rentabiliteMoyenneMois,
    kpisPrev.rentabiliteMoyenneMois,
  );

  function toChantierCard(
    item: (typeof classements)[number],
    motif?: string,
  ): PilotageChantierCard {
    return {
      id: item.chantier.id,
      nom: item.chantier.nom,
      ca: Math.round(item.rentabilite.prixVenteHT * 100) / 100,
      marge: Math.round(item.rentabilite.margeReelle * 100) / 100,
      margePct: Math.round(item.rentabilite.tauxMargeReelle),
      depassement: Math.round(item.rentabilite.ecartCoutTotal * 100) / 100,
      tempsReel: Math.round(item.rentabilite.tempsReelHeures * 10) / 10,
      tempsPrevu: Math.round(item.rentabilite.tempsPrevuHeures * 10) / 10,
      budget: Math.round(item.rentabilite.coutTotalPrevu * 100) / 100,
      motif,
      estimation: item.rentabilite.rentabiliteIncomplete,
    };
  }

  return {
    greetingName: synthese.greetingName,
    potentielPct,
    objectifPct,
    objectifCa,
    previsionFinMois: Math.round(runRate * 100) / 100,
    assistantLines: synthese.lines.slice(0, 2),
    kpis: [
      {
        id: "ca",
        label: "CA encaissé",
        value: formatCurrency(encaisse.totalHT),
        variationPct: caVar,
        comparisonLabel: "vs mois précédent",
        tone: (caVar ?? 0) >= 0 ? "positive" : "warning",
      },
      {
        id: "marge",
        label: "Marge réelle",
        value: formatCurrency(kpisMois.beneficeReelMois),
        variationPct: margeVar,
        comparisonLabel: "vs mois précédent",
        estimation: Boolean(kpisMois.beneficeMoisAvertissement),
        estimationHint: kpisMois.beneficeMoisAvertissement,
        tone: kpisMois.beneficeReelMois >= 0 ? "positive" : "warning",
      },
      {
        id: "rentabilite",
        label: "Rentabilité moyenne",
        value: `${kpisMois.rentabiliteMoyenneMois.toFixed(0)} %`,
        variationPct: rentVar,
        comparisonLabel: "vs mois précédent",
        estimation: kpisMois.fiabiliteGlobale.niveau !== "fiable",
        estimationHint: `Fiabilité : ${kpisMois.fiabiliteGlobale.label}`,
        tone: kpisMois.rentabiliteMoyenneMois >= 20 ? "positive" : "warning",
      },
      {
        id: "chantiers",
        label: "Chantiers actifs",
        value: String(chantiersActifs),
        variationPct: null,
        comparisonLabel: `${kpisMois.chantiersSuivis} suivis en rentabilité`,
        tone: "neutral",
      },
      {
        id: "alertes",
        label: "Alertes",
        value: String(alertesCount),
        variationPct: null,
        comparisonLabel: alertesCount > 0 ? "À traiter aujourd'hui" : "Rien d'urgent",
        tone: alertesCount > 0 ? "warning" : "positive",
      },
      {
        id: "presents",
        label: "Employés présents",
        value: String(presents),
        variationPct: null,
        comparisonLabel: "Pointages + planning du jour",
        estimation: presents === 0,
        estimationHint:
          presents === 0
            ? "Aucun pointage ni planning aujourd'hui"
            : undefined,
        tone: "neutral",
      },
    ],
    timeline: buildPilotageTimeline(data, referenceDate),
    employes,
    metiers: buildMetierPodium(data),
    chantiersRentables: kpisMois.plusRentables.map((item) => toChantierCard(item)),
    chantiersSurveillance: kpisMois.moinsRentables.map((item) => {
      let motif = "À surveiller";
      if (item.rentabilite.margeReelle < 0) motif = "Marge négative";
      else if (item.rentabilite.ecartCoutTotal > 0) motif = "Dépassement budget";
      else if (item.rentabilite.ecartTempsHeures >= 3) motif = "Retard";
      else if (item.rentabilite.tauxMargeReelle < 20) motif = "Marge faible";
      return toChantierCard(item, motif);
    }),
    fournisseurs,
    fournisseurInsights: fournisseurInsights.slice(0, 5),
    types,
    typeFournisseurs: computeFournisseurPrincipalParType(data),
    alertes,
    series: buildSeries(data, period, referenceDate),
    forecast: {
      ca: Math.round(runRate * 100) / 100,
      margePct: Math.round(kpisMois.rentabiliteMoyenneMois),
      resultat:
        kpisMois.beneficeReelMois >= 0
          ? kpisMois.rentabiliteMoyenneMois >= 25
            ? "Excellent"
            : "Bon"
          : "À surveiller",
      objectifAtteint: encaisse.totalHT >= objectifCa || runRate >= objectifCa,
      tresorerie:
        metrics.facturesImpayees > 3 ? "Sous tension" : "Stable",
      estimation: dayOfMonth < 5 || Boolean(kpisMois.beneficeMoisAvertissement),
    },
    assistantAnalyse,
    assistantConseils,
    importantAlertCount: alertesCount,
  };
}

export function getEmployeDetailModel(data: AppData, employeId: string) {
  const employe = data.employes.find((item) => item.id === employeId);
  if (!employe) return null;
  const classement = buildEmployeClassement(data).find(
    (row) => row.employe.id === employeId,
  );
  const entries = (data.chantierTimeEntries ?? []).filter(
    (entry) => entry.employeId === employeId,
  );
  const classements = buildChantiersRentabilite(data);
  const historique = entries
    .map((entry) => {
      const chantier = data.chantiers.find((c) => c.id === entry.chantierId);
      return {
        id: entry.id,
        date: entry.date,
        heures: computeTimeEntryHeures(entry),
        chantierNom: chantier?.nom ?? "Chantier",
        typeTache: entry.typeTache,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const typesFavoris = new Map<string, number>();
  for (const entry of entries) {
    const item = classements.find((c) => c.chantier.id === entry.chantierId);
    if (!item) continue;
    const cat = resolveChantierCategoriePilotage(item.chantier, item.devis);
    typesFavoris.set(cat, (typesFavoris.get(cat) ?? 0) + computeTimeEntryHeures(entry));
  }

  return {
    employe,
    classement,
    historique,
    typesFavoris: [...typesFavoris.entries()]
      .map(([categorie, heures]) => ({
        label: getCategoriePilotageLabel(categorie as CategoriePilotageChantier),
        heures: Math.round(heures * 100) / 100,
      }))
      .sort((a, b) => b.heures - a.heures),
    coutSalarial: classement?.heures
      ? Math.round(
          classement.heures *
            (employe.coutHoraireInterne ??
              data.parametres.tauxHoraireInterneDefaut ??
              0) *
            100,
        ) / 100
      : 0,
  };
}
