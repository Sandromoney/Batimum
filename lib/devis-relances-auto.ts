import {
  getActiveDevisRelanceRegles,
  isDevisEligibleForRelances,
  resolveDevisRelanceNiveau,
  DEVIS_RELANCE_NIVEAU_LABELS,
  type DevisRelanceNiveau,
} from "@/lib/devis-relance-config";
import type {
  AppData,
  Devis,
  DevisRelanceEntry,
  Parametres,
  RelanceClient,
} from "@/lib/types";
import { generateId } from "@/lib/utils";

function addDaysISO(isoDate: string, days: number): string {
  const date = new Date(isoDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getDevisSentDate(devis: Devis): string | null {
  if (!devis.sentAt) return null;
  return devis.sentAt.slice(0, 10);
}

export function getDevisRelanceDueDate(
  devis: Devis,
  joursApresEnvoi: number,
): string | null {
  const sentDate = getDevisSentDate(devis);
  if (!sentDate) return null;
  return addDaysISO(sentDate, joursApresEnvoi);
}

export function hasDevisRelanceBeenSent(
  devis: Devis,
  regleId: string,
): boolean {
  return (devis.relancesProgrammees ?? []).some(
    (entry) => entry.regleId === regleId,
  );
}

export function shouldProcessDevisRelances(
  devis: Devis,
  parametres: Parametres,
  factures: AppData["factures"],
): boolean {
  if (!parametres.relancesDevisAutomatiques) return false;
  return isDevisEligibleForRelances(devis, factures);
}

export function getDueDevisRelanceRegles(
  devis: Devis,
  parametres: Parametres,
  factures: AppData["factures"],
  today = new Date().toISOString().slice(0, 10),
) {
  if (!shouldProcessDevisRelances(devis, parametres, factures)) return [];

  return getActiveDevisRelanceRegles(parametres).filter((regle) => {
    if (hasDevisRelanceBeenSent(devis, regle.id)) return false;
    const dueDate = getDevisRelanceDueDate(devis, regle.joursApresEnvoi);
    return Boolean(dueDate && dueDate <= today);
  });
}

export function getNextDevisRelance(
  devis: Devis,
  parametres: Parametres,
  factures: AppData["factures"],
  today = new Date().toISOString().slice(0, 10),
) {
  if (!shouldProcessDevisRelances(devis, parametres, factures)) return null;

  for (const regle of getActiveDevisRelanceRegles(parametres)) {
    if (hasDevisRelanceBeenSent(devis, regle.id)) continue;
    const dueDate = getDevisRelanceDueDate(devis, regle.joursApresEnvoi);
    if (!dueDate || dueDate >= today) {
      return { regle, date: dueDate ?? today };
    }
  }

  return null;
}

export function appendDevisRelanceEntry(
  devis: Devis,
  regleId: string,
  niveau: DevisRelanceNiveau,
  date = new Date().toISOString(),
): Devis {
  const entry: DevisRelanceEntry = {
    id: generateId(),
    regleId,
    niveau,
    date,
    canal: "email",
  };
  const relancesProgrammees = [...(devis.relancesProgrammees ?? []), entry];

  return {
    ...devis,
    relancesProgrammees,
    relanceCount: relancesProgrammees.length,
    derniereRelanceAt: date,
  };
}

export function buildPendingDevisRelanceRecord(
  devis: Devis,
  regleId: string,
  niveau: DevisRelanceNiveau,
  message: string,
): RelanceClient {
  return {
    id: generateId(),
    documentType: "devis",
    documentId: devis.id,
    numero: devis.numero,
    dateRelance: new Date().toISOString(),
    typeRelance: "automatique",
    statut: "preparee",
    message,
    niveauRelanceDevis: niveau,
    regleRelanceId: regleId,
  };
}

export function syncDevisRelancesAutomatiques(
  data: AppData,
  today = new Date().toISOString().slice(0, 10),
): AppData {
  if (!data.parametres.relancesDevisAutomatiques) return data;

  let relances = data.relances;
  let changed = false;

  const devis = data.devis.map((item) => {
    if (!shouldProcessDevisRelances(item, data.parametres, data.factures)) {
      return item;
    }

    const dueRegles = getDueDevisRelanceRegles(
      item,
      data.parametres,
      data.factures,
      today,
    ).filter((regle) => !hasDevisRelanceBeenSent(item, regle.id));

    if (dueRegles.length === 0) return item;

    let nextDevis = item;
    for (const regle of dueRegles) {
      const niveau = resolveDevisRelanceNiveau(regle.id);
      const message = `Relance automatique — ${DEVIS_RELANCE_NIVEAU_LABELS[niveau]}`;
      relances = [
        ...relances,
        buildPendingDevisRelanceRecord(nextDevis, regle.id, niveau, message),
      ];
      nextDevis = appendDevisRelanceEntry(nextDevis, regle.id, niveau);
      changed = true;
    }

    return nextDevis;
  });

  if (!changed) return data;
  return { ...data, devis, relances };
}
