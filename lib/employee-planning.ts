import { getClientDisplayName } from "@/lib/clients";
import { getChantierNavigationAddress } from "@/lib/employee-chantier-actions";
import { getPlanningEventDisplayTitle } from "@/lib/planning-types";
import { addDaysIso } from "@/lib/planning-utils";
import {
  expandAffectationDates,
  formatJoursSemaineLabel,
} from "@/lib/planning-affectations";
import type {
  AppData,
  Chantier,
  ChantierAffectation,
  Client,
  EvenementPlanning,
} from "@/lib/types";

export type EmployeeTaskStatus = "a_faire" | "en_cours" | "termine";

export type EmployeeTaskContext = {
  event: EvenementPlanning;
  chantier?: Chantier;
  client?: Client;
  chantierNom?: string;
  clientNom?: string;
  adresse?: string;
  adresseComplete?: string;
  adresseCompleteValide: boolean;
  affectation?: ChantierAffectation;
  affectationLabel?: string;
  note?: string;
  displayTitle: string;
  status: EmployeeTaskStatus;
  responsableNom?: string;
  responsableTelephone?: string;
};

export function getEmployeeTaskStatus(
  event: EvenementPlanning,
  employeId: string,
): EmployeeTaskStatus {
  if (event.employeTermineIds?.includes(employeId)) return "termine";
  if (event.employeEnCoursIds?.includes(employeId)) return "en_cours";
  return "a_faire";
}

export function getEmployeeAssignedEvents(
  planning: EvenementPlanning[],
  employeId: string,
): EvenementPlanning[] {
  return planning
    .filter((event) => event.employeIds?.includes(employeId))
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      return dateCompare !== 0 ? dateCompare : a.heureDebut.localeCompare(b.heureDebut);
    });
}

export function buildEmployeeTaskContext(
  event: EvenementPlanning,
  data: AppData,
  employeId: string,
): EmployeeTaskContext {
  const chantier = event.chantierId
    ? data.chantiers.find((item) => item.id === event.chantierId)
    : undefined;
  const client = chantier
    ? data.clients.find((item) => item.id === chantier.clientId)
    : undefined;
  const affectation = event.affectationId
    ? data.affectations.find((item) => item.id === event.affectationId)
    : undefined;

  let affectationLabel: string | undefined;
  if (affectation) {
    affectationLabel = `${formatJoursSemaineLabel(affectation.joursSemaine)} · ${affectation.heureDebut}–${affectation.heureFin}`;
  }

  const navigationAddress = getChantierNavigationAddress(chantier, client);

  return {
    event,
    chantier,
    client,
    chantierNom: chantier?.nom,
    clientNom: client ? getClientDisplayName(client) : undefined,
    adresse: chantier?.adresse || undefined,
    adresseComplete: navigationAddress.fullAddress || undefined,
    adresseCompleteValide: navigationAddress.isComplete,
    affectation,
    affectationLabel,
    note: affectation?.note,
    displayTitle: getPlanningEventDisplayTitle(event, chantier),
    status: getEmployeeTaskStatus(event, employeId),
    responsableNom: data.parametres.utilisateur?.trim() || undefined,
    responsableTelephone: data.parametres.telephone?.trim() || undefined,
  };
}

export function countUniqueChantiersToday(
  events: EvenementPlanning[],
  today: string,
): number {
  const ids = new Set(
    events
      .filter((event) => event.date === today && event.chantierId)
      .map((event) => event.chantierId as string),
  );
  return ids.size;
}

export function getEmployeeUpcomingDays(
  events: EvenementPlanning[],
  referenceDate: string,
  days = 14,
): string[] {
  const end = addDaysIso(referenceDate, days);
  const dates = new Set(
    events
      .filter((event) => event.date >= referenceDate && event.date <= end)
      .map((event) => event.date),
  );
  return [...dates].sort();
}

export function getAffectationPeriodLabel(affectation: ChantierAffectation): string {
  const dates = expandAffectationDates(
    affectation.dateDebut,
    affectation.dateFin,
    affectation.joursSemaine,
  );
  return `${dates.length} jour${dates.length > 1 ? "s" : ""} planifié${dates.length > 1 ? "s" : ""}`;
}

export const EMPLOYEE_TASK_STATUS_LABELS: Record<EmployeeTaskStatus, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  termine: "Terminé",
};
