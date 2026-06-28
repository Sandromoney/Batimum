import type { LigneDevis } from "./types";

export function formatPlanningTaskLine(ligne: LigneDevis): string {
  const description = ligne.description?.trim() || "—";
  const unite = ligne.unite?.trim() || "forfait";
  return `${description} — ${ligne.quantite} ${unite}`;
}

export function formatPlanningTaskFromLignes(lignes: LigneDevis[]): string {
  return lignes.map(formatPlanningTaskLine).join("\n");
}

export function appendPlanningTaskText(
  existing: string | undefined,
  added: string,
): string {
  const current = (existing ?? "").trim();
  const next = added.trim();
  if (!next) return current;
  if (!current) return next;
  return `${current}\n${next}`;
}
