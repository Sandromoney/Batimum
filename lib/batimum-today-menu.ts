import { buildTodayInsightCards, type BatimumInsightCard } from "@/lib/batimum-insights";
import type { AppData } from "@/lib/types";

export type TodayMenuPriority = "critical" | "warning" | "info" | "success";

export type TodayMenuItem = {
  id: string;
  label: string;
  href?: string;
  priority: TodayMenuPriority;
  priorityScore: number;
};

function mapCardToMenuItem(card: BatimumInsightCard): TodayMenuItem {
  const priority = mapToneToPriority(card);
  return {
    id: card.id,
    label: card.title,
    href: card.href,
    priority,
    priorityScore: card.priority,
  };
}

function mapToneToPriority(card: BatimumInsightCard): TodayMenuPriority {
  if (card.id === "all-clear") return "success";
  if (card.id === "chantiers-retard" || card.id === "chantier-budget") {
    return "critical";
  }
  if (
    card.id === "devis-relancer" ||
    card.id === "facture-echeance-demain" ||
    card.id === "relances-factures"
  ) {
    return "warning";
  }
  if (card.id === "objectif-ca") {
    const pct = card.title.match(/(\d+)\s*%/);
    const value = pct ? Number(pct[1]) : 0;
    return value >= 70 ? "success" : "info";
  }
  if (card.tone === "success") return "success";
  if (card.tone === "info") return "info";
  if (card.tone === "alert") return "warning";
  return "info";
}

/** Items uniques pour le menu « Aujourd'hui » (sans doublons). */
export function buildTodayMenuItems(
  data: AppData,
  referenceDate = new Date(),
): TodayMenuItem[] {
  const cards = buildTodayInsightCards(data, referenceDate);
  const seen = new Set<string>();
  const items: TodayMenuItem[] = [];

  for (const card of cards) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    items.push(mapCardToMenuItem(card));
  }

  return items.sort((a, b) => a.priorityScore - b.priorityScore);
}

export function countTodayActionItems(items: TodayMenuItem[]): number {
  return items.filter((item) => item.id !== "all-clear").length;
}
