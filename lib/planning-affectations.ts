import { addDaysIso } from "@/lib/planning-utils";
import { preparePlanningEventForSave } from "@/lib/planning-types";
import type {
  AppData,
  Chantier,
  ChantierAffectation,
  Employe,
  EvenementPlanning,
} from "@/lib/types";
import { generateId } from "@/lib/utils";

export const JOURS_SEMAINE_AFFECTATION = [
  { value: 1, label: "Lun", full: "Lundi" },
  { value: 2, label: "Mar", full: "Mardi" },
  { value: 3, label: "Mer", full: "Mercredi" },
  { value: 4, label: "Jeu", full: "Jeudi" },
  { value: 5, label: "Ven", full: "Vendredi" },
  { value: 6, label: "Sam", full: "Samedi" },
  { value: 7, label: "Dim", full: "Dimanche" },
] as const;

export const JOURS_SEMAINE_PLANNING = JOURS_SEMAINE_AFFECTATION.filter(
  (jour) => jour.value !== 7,
);

export const DEFAULT_JOURS_SEMAINE_AFFECTATION = [1, 2, 3, 4, 5];

export type ConflictResolution = "cancel" | "ignore" | "replace";

export type PlanningAffectationConflict = {
  employeId: string;
  date: string;
  existingEvent: EvenementPlanning;
};

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Jour ISO : lundi = 1 … dimanche = 7. */
export function getIsoWeekday(iso: string): number {
  const day = parseIsoDate(iso).getDay();
  return day === 0 ? 7 : day;
}

export function expandAffectationDates(
  dateDebut: string,
  dateFin: string,
  joursSemaine: number[],
): string[] {
  if (!dateDebut || !dateFin || dateFin < dateDebut || joursSemaine.length === 0) {
    return [];
  }

  const allowed = new Set(joursSemaine);
  const dates: string[] = [];
  let current = dateDebut;

  while (current <= dateFin) {
    if (allowed.has(getIsoWeekday(current))) {
      dates.push(current);
    }
    current = addDaysIso(current, 1);
  }

  return dates;
}

export function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return startA < endB && startB < endA;
}

export function findAffectationConflicts(
  planning: EvenementPlanning[],
  employeIds: string[],
  dates: string[],
  heureDebut: string,
  heureFin: string,
  excludeAffectationId?: string,
): PlanningAffectationConflict[] {
  const conflicts: PlanningAffectationConflict[] = [];
  const employeSet = new Set(employeIds);

  for (const date of dates) {
    for (const event of planning) {
      if (event.date !== date) continue;
      if (excludeAffectationId && event.affectationId === excludeAffectationId) {
        continue;
      }
      if (!timesOverlap(heureDebut, heureFin, event.heureDebut, event.heureFin)) {
        continue;
      }

      for (const employeId of event.employeIds ?? []) {
        if (!employeSet.has(employeId)) continue;
        conflicts.push({ employeId, date, existingEvent: event });
      }
    }
  }

  return conflicts;
}

function removeEmployeFromEvent(
  event: EvenementPlanning,
  employeId: string,
): EvenementPlanning | null {
  const nextIds = (event.employeIds ?? []).filter((id) => id !== employeId);
  if (nextIds.length === 0) return null;

  return {
    ...event,
    employeIds: nextIds,
    employeTermineIds: (event.employeTermineIds ?? []).filter((id) => id !== employeId),
    employeEnCoursIds: (event.employeEnCoursIds ?? []).filter((id) => id !== employeId),
    employeProblemes: (event.employeProblemes ?? []).filter(
      (item) => item.employeId !== employeId,
    ),
  };
}

function applyConflictResolution(
  planning: EvenementPlanning[],
  conflicts: PlanningAffectationConflict[],
  resolution: ConflictResolution,
): EvenementPlanning[] {
  if (resolution === "cancel" || conflicts.length === 0) return planning;

  let next = [...planning];

  for (const conflict of conflicts) {
    if (resolution === "ignore") continue;

    next = next
      .map((event) => {
        if (event.id !== conflict.existingEvent.id) return event;
        return removeEmployeFromEvent(event, conflict.employeId);
      })
      .filter((event): event is EvenementPlanning => event !== null);
  }

  return next;
}

function shouldSkipDateForEmploye(
  employeId: string,
  date: string,
  conflicts: PlanningAffectationConflict[],
  resolution: ConflictResolution,
): boolean {
  if (resolution !== "ignore") return false;
  return conflicts.some(
    (conflict) => conflict.employeId === employeId && conflict.date === date,
  );
}

export function buildPlanningEventsForAffectation(
  affectation: ChantierAffectation,
  chantier: Chantier,
  dates: string[],
  conflicts: PlanningAffectationConflict[],
  resolution: ConflictResolution,
): EvenementPlanning[] {
  const events: EvenementPlanning[] = [];

  for (const date of dates) {
    const employeIds = affectation.employeIds.filter(
      (employeId) => !shouldSkipDateForEmploye(employeId, date, conflicts, resolution),
    );
    if (employeIds.length === 0) continue;

    const draft: EvenementPlanning = {
      id: generateId(),
      titre: chantier.nom,
      tache: chantier.nom,
      chantierId: chantier.id,
      date,
      heureDebut: affectation.heureDebut,
      heureFin: affectation.heureFin,
      type: "intervention",
      employeIds,
      affectationId: affectation.id,
    };

    events.push(preparePlanningEventForSave(draft, chantier));
  }

  return events;
}

export function createDefaultAffectationDraft(
  chantier?: Chantier | null,
): ChantierAffectation {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: generateId(),
    chantierId: chantier?.id ?? "",
    employeIds: [],
    dateDebut: chantier?.dateDebut || today,
    dateFin: chantier?.dateFin || addDaysIso(today, 13),
    joursSemaine: [...DEFAULT_JOURS_SEMAINE_AFFECTATION],
    heureDebut: "08:00",
    heureFin: "17:00",
    note: "",
  };
}

export type ApplyAffectationResult =
  | { ok: true; data: AppData }
  | { ok: false; reason: "cancelled" };

export function applyAffectationCreate(
  data: AppData,
  affectation: ChantierAffectation,
  resolution: ConflictResolution = "cancel",
): ApplyAffectationResult | { ok: false; conflicts: PlanningAffectationConflict[] } {
  const chantier = data.chantiers.find((item) => item.id === affectation.chantierId);
  if (!chantier) return { ok: false, reason: "cancelled" };

  const dates = expandAffectationDates(
    affectation.dateDebut,
    affectation.dateFin,
    affectation.joursSemaine,
  );
  const conflicts = findAffectationConflicts(
    data.planning,
    affectation.employeIds,
    dates,
    affectation.heureDebut,
    affectation.heureFin,
  );

  if (conflicts.length > 0 && resolution === "cancel") {
    return { ok: false, conflicts };
  }

  const planningAfterConflicts = applyConflictResolution(
    data.planning,
    conflicts,
    resolution,
  );
  const newEvents = buildPlanningEventsForAffectation(
    affectation,
    chantier,
    dates,
    conflicts,
    resolution,
  );

  return {
    ok: true,
    data: {
      ...data,
      affectations: [...data.affectations, affectation],
      planning: [...planningAfterConflicts, ...newEvents],
    },
  };
}

export function applyAffectationUpdate(
  data: AppData,
  affectation: ChantierAffectation,
  resolution: ConflictResolution = "cancel",
): ApplyAffectationResult | { ok: false; conflicts: PlanningAffectationConflict[] } {
  const chantier = data.chantiers.find((item) => item.id === affectation.chantierId);
  if (!chantier) return { ok: false, reason: "cancelled" };

  const planningWithoutSerie = data.planning.filter(
    (event) => event.affectationId !== affectation.id,
  );
  const dates = expandAffectationDates(
    affectation.dateDebut,
    affectation.dateFin,
    affectation.joursSemaine,
  );
  const conflicts = findAffectationConflicts(
    planningWithoutSerie,
    affectation.employeIds,
    dates,
    affectation.heureDebut,
    affectation.heureFin,
    affectation.id,
  );

  if (conflicts.length > 0 && resolution === "cancel") {
    return { ok: false, conflicts };
  }

  const planningAfterConflicts = applyConflictResolution(
    planningWithoutSerie,
    conflicts,
    resolution,
  );
  const newEvents = buildPlanningEventsForAffectation(
    affectation,
    chantier,
    dates,
    conflicts,
    resolution,
  );

  return {
    ok: true,
    data: {
      ...data,
      affectations: data.affectations.map((item) =>
        item.id === affectation.id ? affectation : item,
      ),
      planning: [...planningAfterConflicts, ...newEvents],
    },
  };
}

export function applyAffectationDelete(data: AppData, affectationId: string): AppData {
  return {
    ...data,
    affectations: data.affectations.filter((item) => item.id !== affectationId),
    planning: data.planning.filter((event) => event.affectationId !== affectationId),
  };
}

export function getAffectationsForChantier(
  affectations: ChantierAffectation[],
  chantierId: string,
): ChantierAffectation[] {
  return [...affectations]
    .filter((item) => item.chantierId === chantierId)
    .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));
}

export function formatJoursSemaineLabel(joursSemaine: number[]): string {
  const labels = JOURS_SEMAINE_AFFECTATION.filter((item) =>
    joursSemaine.includes(item.value),
  ).map((item) => item.label);

  if (labels.length === 0) return "—";
  if (labels.length === 5 && joursSemaine.every((d) => d >= 1 && d <= 5)) {
    return "Lun – Ven";
  }
  return labels.join(", ");
}

export function getNextAffectationDate(
  affectation: ChantierAffectation,
  referenceDate = new Date().toISOString().slice(0, 10),
): string | null {
  const dates = expandAffectationDates(
    affectation.dateDebut,
    affectation.dateFin,
    affectation.joursSemaine,
  );
  return dates.find((date) => date >= referenceDate) ?? null;
}

export function getEmployeUpcomingEvents(
  planning: EvenementPlanning[],
  employeId: string,
  referenceDate = new Date().toISOString().slice(0, 10),
  limit = 5,
): EvenementPlanning[] {
  return planning
    .filter(
      (event) =>
        event.date >= referenceDate && (event.employeIds ?? []).includes(employeId),
    )
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      return dateCompare !== 0 ? dateCompare : a.heureDebut.localeCompare(b.heureDebut);
    })
    .slice(0, limit);
}

export function getEmployeChantiersAssignes(
  planning: EvenementPlanning[],
  chantiers: Chantier[],
  employeId: string,
  referenceDate = new Date().toISOString().slice(0, 10),
): Chantier[] {
  const chantierIds = new Set(
    planning
      .filter(
        (event) =>
          event.chantierId &&
          event.date >= referenceDate &&
          (event.employeIds ?? []).includes(employeId),
      )
      .map((event) => event.chantierId as string),
  );

  return chantiers.filter((chantier) => chantierIds.has(chantier.id));
}

export function resolveEmployeNames(
  employeIds: string[],
  employes: Employe[],
): string {
  const map = new Map(employes.map((employe) => [employe.id, employe]));
  return employeIds
    .map((id) => {
      const employe = map.get(id);
      return employe ? `${employe.prenom} ${employe.nom}`.trim() : null;
    })
    .filter((name): name is string => Boolean(name))
    .join(", ");
}
