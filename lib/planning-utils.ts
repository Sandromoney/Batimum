import type { Chantier, Employe, EvenementPlanning } from "./types";
import { formatDateFR } from "./utils";

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

/** Lundi de la semaine contenant la date (ISO). */
export function startOfWeekIso(iso: string): string {
  const date = parseIsoDate(iso);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return toIsoDate(date);
}

export function addDaysIso(iso: string, days: number): string {
  const date = parseIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function addWeeksIso(weekStartIso: string, weeks: number): string {
  return addDaysIso(weekStartIso, weeks * 7);
}

export function getWeekDayLabels(): string[] {
  return ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
}

export function getWeekDays(weekStartIso: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDaysIso(weekStartIso, index));
}

export function formatWeekRangeLabel(weekStartIso: string): string {
  const end = addDaysIso(weekStartIso, 6);
  return `${formatDateFR(weekStartIso)} – ${formatDateFR(end)}`;
}

export function isDateInWeek(dateIso: string, weekStartIso: string): boolean {
  const start = weekStartIso;
  const end = addDaysIso(weekStartIso, 6);
  return dateIso >= start && dateIso <= end;
}

export function employeDisplayName(employe: Employe): string {
  return `${employe.prenom} ${employe.nom}`.trim();
}

export function employeInitials(employe: Employe): string {
  return `${employe.prenom[0] ?? ""}${employe.nom[0] ?? ""}`.toUpperCase();
}

export function resolveEmployes(
  employeIds: string[] | undefined,
  employes: Employe[],
): Employe[] {
  if (!employeIds?.length) return [];
  const map = new Map(employes.map((e) => [e.id, e]));
  return employeIds
    .map((id) => map.get(id))
    .filter((e): e is Employe => Boolean(e));
}

export type ChantierPresenceJour = {
  date: string;
  chantierId: string;
  chantierNom: string;
  employes: Employe[];
};

/** Qui est sur quel chantier chaque jour (semaine affichée). */
export function buildChantierPresenceParJour(
  events: EvenementPlanning[],
  weekStartIso: string,
  chantiers: Chantier[],
  employes: Employe[],
): ChantierPresenceJour[] {
  const chantierMap = new Map(chantiers.map((c) => [c.id, c]));
  const weekDays = getWeekDays(weekStartIso);
  const result: ChantierPresenceJour[] = [];

  for (const date of weekDays) {
    const dayEvents = events.filter(
      (e) => e.date === date && e.chantierId,
    );

    const byChantier = new Map<string, Set<string>>();

    for (const event of dayEvents) {
      if (!event.chantierId) continue;
      const ids = byChantier.get(event.chantierId) ?? new Set<string>();
      for (const empId of event.employeIds ?? []) {
        ids.add(empId);
      }
      byChantier.set(event.chantierId, ids);
    }

    for (const [chantierId, empIds] of byChantier) {
      const chantier = chantierMap.get(chantierId);
      if (!chantier) continue;
      const assigned = resolveEmployes([...empIds], employes);
      if (assigned.length === 0) continue;
      result.push({
        date,
        chantierId,
        chantierNom: chantier.nom,
        employes: assigned,
      });
    }
  }

  return result.sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.chantierNom.localeCompare(b.chantierNom),
  );
}

export function sortPlanningEvents(events: EvenementPlanning[]): EvenementPlanning[] {
  return [...events].sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    return d !== 0 ? d : a.heureDebut.localeCompare(b.heureDebut);
  });
}
