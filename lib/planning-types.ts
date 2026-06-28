import type { Chantier, EvenementPlanning } from "./types";

export const PLANNING_EVENT_TYPES = [
  { value: "intervention", label: "Intervention" },
  { value: "deplacement", label: "Déplacement" },
  { value: "rendez_vous_client", label: "Rendez-vous client" },
  { value: "livraison_materiaux", label: "Livraison matériaux" },
  { value: "reunion_chantier", label: "Réunion chantier" },
  { value: "sav", label: "SAV" },
  { value: "autre", label: "Autre" },
] as const;

export type PlanningEventTypeValue =
  (typeof PLANNING_EVENT_TYPES)[number]["value"];

const LEGACY_TYPE_LABELS: Record<string, string> = {
  reunion: "Réunion chantier",
  livraison: "Livraison matériaux",
};

export function normalizePlanningEventType(
  type?: EvenementPlanning["type"],
): PlanningEventTypeValue | EvenementPlanning["type"] {
  if (type === "reunion") return "reunion_chantier";
  if (type === "livraison") return "livraison_materiaux";
  return type ?? "intervention";
}

export function getPlanningTypeLabel(event: Pick<EvenementPlanning, "type" | "typePersonnalise">): string {
  if (event.type === "autre" && event.typePersonnalise?.trim()) {
    return event.typePersonnalise.trim();
  }

  const normalized = normalizePlanningEventType(event.type);
  const match = PLANNING_EVENT_TYPES.find((item) => item.value === normalized);
  if (match) return match.label;

  return LEGACY_TYPE_LABELS[event.type] ?? event.type;
}

export function getPlanningEventDisplayTitle(
  event: Pick<EvenementPlanning, "titre" | "tache" | "type" | "typePersonnalise">,
  chantier?: Pick<Chantier, "nom"> | null,
): string {
  const tache = (event.tache ?? event.titre ?? "").trim();
  if (tache) return tache;
  if (chantier?.nom?.trim()) return chantier.nom.trim();
  return getPlanningTypeLabel(event);
}

export function preparePlanningEventForSave(
  event: EvenementPlanning,
  chantier?: Chantier | null,
): EvenementPlanning {
  const tache = (event.tache ?? event.titre ?? "").trim();
  const type = normalizePlanningEventType(event.type) as EvenementPlanning["type"];
  const displayTitle = getPlanningEventDisplayTitle(
    { ...event, tache, type },
    chantier,
  );

  return {
    ...event,
    type,
    tache: tache || undefined,
    titre: displayTitle,
    typePersonnalise:
      type === "autre" ? event.typePersonnalise?.trim() || undefined : undefined,
  };
}
