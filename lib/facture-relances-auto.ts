import type {
  AppData,
  Facture,
  FactureRelanceEntry,
  FactureRelanceNiveau,
  Parametres,
  RelanceClient,
} from "./types";
import { generateId } from "./utils";

export const RELANCE_NIVEAU_LABELS: Record<FactureRelanceNiveau, string> = {
  avant_echeance_3j: "Rappel J-3 (avant échéance)",
  jour_echeance: "Rappel jour d'échéance",
  apres_echeance_7j: "Relance J+7",
  apres_echeance_15j: "Relance J+15",
  apres_echeance_30j: "Relance ferme J+30",
  manuelle: "Relance manuelle",
};

type RelanceScheduleItem = {
  niveau: Exclude<FactureRelanceNiveau, "manuelle">;
  paramKey: keyof Pick<
    Parametres,
    | "relanceAvantEcheance3j"
    | "relanceJourEcheance"
    | "relanceJ7"
    | "relanceJ15"
    | "relanceJ30"
  >;
  daysOffset: number;
};

export const FACTURE_RELANCE_SCHEDULE: RelanceScheduleItem[] = [
  {
    niveau: "avant_echeance_3j",
    paramKey: "relanceAvantEcheance3j",
    daysOffset: -3,
  },
  { niveau: "jour_echeance", paramKey: "relanceJourEcheance", daysOffset: 0 },
  { niveau: "apres_echeance_7j", paramKey: "relanceJ7", daysOffset: 7 },
  { niveau: "apres_echeance_15j", paramKey: "relanceJ15", daysOffset: 15 },
  { niveau: "apres_echeance_30j", paramKey: "relanceJ30", daysOffset: 30 },
];

const RELANCE_ELIGIBLE_STATUTS = new Set([
  "envoyee",
  "en_attente",
  "en_retard",
]);

function addDaysISO(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getRelanceNiveauDueDate(
  facture: Facture,
  niveau: Exclude<FactureRelanceNiveau, "manuelle">,
): string | null {
  if (!facture.dateEcheance) return null;
  const item = FACTURE_RELANCE_SCHEDULE.find((entry) => entry.niveau === niveau);
  if (!item) return null;
  return addDaysISO(facture.dateEcheance, item.daysOffset);
}

export function hasRelanceNiveauBeenSent(
  facture: Facture,
  niveau: FactureRelanceNiveau,
): boolean {
  return (facture.relancesProgrammees ?? []).some(
    (entry) => entry.niveau === niveau,
  );
}

export function isRelanceNiveauEnabled(
  parametres: Parametres,
  niveau: Exclude<FactureRelanceNiveau, "manuelle">,
): boolean {
  if (!parametres.relancesAutomatiques) return false;
  const item = FACTURE_RELANCE_SCHEDULE.find((entry) => entry.niveau === niveau);
  if (!item) return false;
  return parametres[item.paramKey] !== false;
}

export function shouldProcessFactureRelances(
  facture: Facture,
  parametres: Parametres,
): boolean {
  if (facture.relancesDesactivees) return false;
  if (!parametres.relancesAutomatiques) return false;
  if (["payee", "avoir_total", "avoir_partiel", "brouillon"].includes(facture.statut)) {
    return false;
  }
  if (!facture.dateEcheance) return false;
  return RELANCE_ELIGIBLE_STATUTS.has(facture.statut);
}

export function getNextFactureRelance(
  facture: Facture,
  parametres: Parametres,
  today = new Date().toISOString().slice(0, 10),
): { niveau: FactureRelanceNiveau; date: string } | null {
  if (!shouldProcessFactureRelances(facture, parametres)) return null;

  for (const item of FACTURE_RELANCE_SCHEDULE) {
    if (!isRelanceNiveauEnabled(parametres, item.niveau)) continue;
    if (hasRelanceNiveauBeenSent(facture, item.niveau)) continue;
    const dueDate = getRelanceNiveauDueDate(facture, item.niveau);
    if (!dueDate || dueDate >= today) {
      return { niveau: item.niveau, date: dueDate ?? today };
    }
  }

  return null;
}

export function getDueFactureRelanceNiveaux(
  facture: Facture,
  parametres: Parametres,
  today = new Date().toISOString().slice(0, 10),
): Array<Exclude<FactureRelanceNiveau, "manuelle">> {
  if (!shouldProcessFactureRelances(facture, parametres)) return [];

  return FACTURE_RELANCE_SCHEDULE.filter((item) => {
    if (!isRelanceNiveauEnabled(parametres, item.niveau)) return false;
    if (hasRelanceNiveauBeenSent(facture, item.niveau)) return false;
    const dueDate = getRelanceNiveauDueDate(facture, item.niveau);
    return Boolean(dueDate && dueDate <= today);
  }).map((item) => item.niveau);
}

export function appendFactureRelanceEntry(
  facture: Facture,
  niveau: FactureRelanceNiveau,
  date = new Date().toISOString(),
): Facture {
  const entry: FactureRelanceEntry = {
    id: generateId(),
    niveau,
    date,
    canal: "email",
  };
  return {
    ...facture,
    relancesProgrammees: [...(facture.relancesProgrammees ?? []), entry],
  };
}

export function buildPendingFactureRelanceRecord(
  facture: Facture,
  niveau: FactureRelanceNiveau,
  message: string,
): RelanceClient {
  return {
    id: generateId(),
    documentType: "facture",
    documentId: facture.id,
    numero: facture.numero,
    dateRelance: new Date().toISOString(),
    typeRelance: "automatique",
    statut: "preparee",
    message,
    niveauRelance: niveau,
  };
}

export function syncFactureRelancesAutomatiques(
  data: AppData,
  today = new Date().toISOString().slice(0, 10),
): AppData {
  if (!data.parametres.relancesAutomatiques) return data;

  let relances = data.relances;
  let changed = false;

  const factures = data.factures.map((facture) => {
    const dueNiveaux = getDueFactureRelanceNiveaux(
      facture,
      data.parametres,
      today,
    );
    if (dueNiveaux.length === 0) return facture;

    let nextFacture = facture;
    for (const niveau of dueNiveaux) {
      const message = `Relance automatique — ${RELANCE_NIVEAU_LABELS[niveau]}`;
      const relanceRecord = buildPendingFactureRelanceRecord(
        nextFacture,
        niveau,
        message,
      );
      relances = [...relances, relanceRecord];
      nextFacture = appendFactureRelanceEntry(nextFacture, niveau);
      changed = true;
    }

    return nextFacture;
  });

  if (!changed) return data;
  return { ...data, factures, relances };
}
