import { getTotalAvoirTTC } from "./avoirs";
import { devisTotal } from "./data";
import { getDevisDisplayStatut } from "./devis-statut";
import { getFactureDisplayStatut } from "./facture-statut";
import type { AppData, Devis, Facture } from "./types";

export type MonthlyRevenuePoint = {
  month: string;
  label: string;
  chiffreAffaires: number;
};

export type RevenueEntry = {
  id: string;
  source: "facture" | "devis-fallback";
  date: string;
  montant: number;
};

export type SaasMetrics = {
  totalClients: number;
  totalDevis: number;
  devisBrouillon: number;
  devisEnvoye: number;
  devisSigne: number;
  devisAccepte: number;
  devisRefuse: number;
  devisExpire: number;
  totalFactures: number;
  facturesPayees: number;
  facturesImpayees: number;
  facturesEnRetard: number;
  chantiersActifs: number;
  chiffreAffairesTotal: number;
  chiffreAffairesMensuel: number;
  chiffreAffairesParMois: MonthlyRevenuePoint[];
};

export type ChantierEtape = {
  fait: boolean;
};

const MONTH_LABELS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

function isPaidInvoice(facture: Facture) {
  return facture.statut === "payee";
}

function getPaidInvoiceNetAmount(facture: Facture, data: AppData) {
  const gross = facture.montantTTC ?? facture.montant;
  const avoirs = getTotalAvoirTTC(data.avoirs, facture.id);
  return Math.max(0, Math.round((gross - avoirs) * 100) / 100);
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseDate(value: string) {
  const iso = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDevisRevenueDate(devis: Devis) {
  return devis.dateDevis ?? devis.date ?? devis.dateCreation;
}

function getDevisRevenueAmount(devis: Devis) {
  return devis.montantTTC ?? devis.montantHT ?? devisTotal(devis);
}

function isAcceptedDevis(devis: Devis) {
  return (
    String(devis.statut) === "accepte" ||
    String(devis.statut) === "accepté" ||
    String(devis.statut) === "signe"
  );
}

function getEntryYear(entry: RevenueEntry) {
  const date = parseDate(entry.date);
  return date?.getFullYear() ?? null;
}

export function getRevenueYearRange(
  entries: RevenueEntry[],
  referenceDate = new Date(),
): { minYear: number; maxYear: number } {
  const maxYear = referenceDate.getFullYear();
  let minYear = maxYear;

  entries.forEach((entry) => {
    const year = getEntryYear(entry);
    if (year !== null && year < minYear) minYear = year;
  });

  return { minYear, maxYear };
}

export function filterRevenueEntriesByYear(
  entries: RevenueEntry[],
  year: number,
): RevenueEntry[] {
  return entries.filter((entry) => getEntryYear(entry) === year);
}

export function getPaidInvoiceRevenueEntries(data: AppData): RevenueEntry[] {
  return data.factures
    .filter((facture) => isPaidInvoice(facture) && facture.datePaiement)
    .map((facture) => ({
      id: facture.id,
      source: "facture" as const,
      date: facture.datePaiement!,
      montant: getPaidInvoiceNetAmount(facture, data),
    }))
    .filter((entry) => entry.montant > 0);
}

export function getAcceptedDevisFallbackEntries(data: AppData): RevenueEntry[] {
  return data.devis.reduce<RevenueEntry[]>((entries, devis) => {
    if (!isAcceptedDevis(devis)) return entries;

    const date = getDevisRevenueDate(devis);
    if (!date) return entries;

    entries.push({
      id: devis.id,
      source: "devis-fallback",
      date,
      montant: getDevisRevenueAmount(devis),
    });

    return entries;
  }, []);
}

export function getRevenueEntries(data: AppData): RevenueEntry[] {
  return getPaidInvoiceRevenueEntries(data);
}

export function groupRevenueEntriesByMonth(
  entries: RevenueEntry[],
  year: number,
): MonthlyRevenuePoint[] {
  const months = Array.from({ length: 12 }, (_, monthIndex) => {
    const date = new Date(year, monthIndex, 1);
    return {
      month: getMonthKey(date),
      label: MONTH_LABELS[date.getMonth()],
      chiffreAffaires: 0,
    };
  });

  const monthIndex = new Map(months.map((month, index) => [month.month, index]));

  entries.forEach((entry) => {
    const date = parseDate(entry.date);
    if (!date || date.getFullYear() !== year) return;

    const index = monthIndex.get(getMonthKey(date));
    if (index === undefined) return;

    months[index].chiffreAffaires += entry.montant;
  });

  return months;
}

export function calculateChiffreAffairesTotal(factures: Facture[], data?: AppData) {
  return factures
    .filter(isPaidInvoice)
    .reduce((total, facture) => {
      if (!data) return total + (facture.montantTTC ?? facture.montant);
      return total + getPaidInvoiceNetAmount(facture, data);
    }, 0);
}

export function calculateChiffreAffairesMensuel(
  revenueEntries: RevenueEntry[],
  referenceDate = new Date(),
) {
  const currentMonth = getMonthKey(referenceDate);

  return revenueEntries
    .filter((entry) => {
      const date = parseDate(entry.date);
      return date ? getMonthKey(date) === currentMonth : false;
    })
    .reduce((total, entry) => total + entry.montant, 0);
}

export function calculateMonthlyRevenueData(
  revenueEntries: RevenueEntry[],
  referenceDate = new Date(),
): MonthlyRevenuePoint[] {
  return groupRevenueEntriesByMonth(
    revenueEntries,
    referenceDate.getFullYear(),
  );
}

export function calculateChantierAvancement(etapes: ChantierEtape[]) {
  if (etapes.length === 0) return 0;

  const etapesFaites = etapes.filter((etape) => etape.fait).length;
  return Math.round((etapesFaites / etapes.length) * 100);
}

export function calculateSaasMetrics(
  data: AppData,
  referenceDate = new Date(),
): SaasMetrics {
  const totalFactures = data.factures.length;
  const facturesPayees = data.factures.filter(isPaidInvoice).length;
  const revenueEntries = getPaidInvoiceRevenueEntries(data);
  const devisDisplay = data.devis.map(getDevisDisplayStatut);

  return {
    totalClients: data.clients.length,
    totalDevis: data.devis.length,
    devisBrouillon: devisDisplay.filter((statut) => statut === "brouillon").length,
    devisEnvoye: devisDisplay.filter((statut) => statut === "envoye").length,
    devisSigne: devisDisplay.filter((statut) => statut === "signe").length,
    devisAccepte: devisDisplay.filter((statut) => statut === "accepte").length,
    devisRefuse: devisDisplay.filter((statut) => statut === "refuse").length,
    devisExpire: devisDisplay.filter((statut) => statut === "expire").length,
    totalFactures,
    facturesPayees,
    facturesImpayees: data.factures.filter((facture) => {
      const statut = getFactureDisplayStatut(facture);
      return ["en_attente", "en_retard", "envoyee"].includes(statut);
    }).length,
    facturesEnRetard: data.factures.filter(
      (facture) => getFactureDisplayStatut(facture) === "en_retard",
    ).length,
    chantiersActifs: data.chantiers.filter((chantier) =>
      ["en_cours", "en_retard", "retard_demarrage"].includes(chantier.statut),
    ).length,
    chiffreAffairesTotal: calculateChiffreAffairesTotal(data.factures, data),
    chiffreAffairesMensuel: calculateChiffreAffairesMensuel(
      revenueEntries,
      referenceDate,
    ),
    chiffreAffairesParMois: calculateMonthlyRevenueData(
      revenueEntries,
      referenceDate,
    ),
  };
}
