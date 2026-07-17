import { getClientDisplayName } from "@/lib/clients";
import { devisTotal } from "@/lib/data";
import { getDevisDisplayStatut } from "@/lib/devis-statut";
import { isFacturePayee, isFactureOverdue } from "@/lib/facture-statut";
import { TYPE_CHANTIER_LABELS } from "@/lib/chantiers";
import {
  buildChantiersRentabilite,
  computeMonthlyPilotageKpis,
} from "@/lib/pilotage/calculations";
import { computeEmployePerformance } from "@/lib/pilotage/analytics";
import { getPilotageReadiness } from "@/lib/pilotage/readiness";
import { calculateSaasMetrics } from "@/lib/saas-calculations";
import {
  buildTodayMenuItems,
  countTodayActionItems,
} from "@/lib/batimum-today-menu";
import { normalizeAssistantText } from "@/lib/assistant-batimum/normalize";
import type { KnowledgeContext } from "@/lib/assistant-batimum/knowledge/types";
import type { AppData, Devis, TypeChantier } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export const MSG_NO_DATA =
  "Je ne peux pas répondre précisément car cette information n'est pas encore renseignée.";

export const MSG_PARTIAL =
  "Le résultat est estimatif car certains achats ou pointages ne sont pas encore renseignés.";

export function metrics(ctx: KnowledgeContext) {
  return calculateSaasMetrics(ctx.data, ctx.referenceDate);
}

export function kpis(ctx: KnowledgeContext) {
  return computeMonthlyPilotageKpis(ctx.data, ctx.referenceDate);
}

export function devisByStatut(data: AppData, statuts: string[]) {
  return data.devis.filter((d) => statuts.includes(getDevisDisplayStatut(d)));
}

export function clientName(data: AppData, clientId: string) {
  return getClientDisplayName(data.clients.find((c) => c.id === clientId));
}

export function extractQuery(message: string, removeWords: string[]): string {
  let q = normalizeAssistantText(message);
  for (const w of removeWords) {
    q = q.replace(new RegExp(`\\b${w}\\b`, "g"), " ");
  }
  return q.replace(/\s+/g, " ").trim();
}

export function findClients(data: AppData, query: string) {
  const q = normalizeAssistantText(query);
  if (q.length < 2) return [];
  return data.clients.filter((c) => {
    const display = normalizeAssistantText(getClientDisplayName(c));
    return display.includes(q) || normalizeAssistantText(c.nom ?? "").includes(q);
  });
}

export function listDevisToRelance(data: AppData) {
  return data.devis.filter((d) =>
    ["envoye", "en_attente", "en_retard"].includes(getDevisDisplayStatut(d)),
  );
}

export function formatDevisRelanceList(data: AppData, list: Devis[], max = 5): string {
  if (list.length === 0) return "Vous n'avez aucun devis à relancer pour le moment.";
  const names = list.slice(0, max).map((d) => clientName(data, d.clientId));
  const unique = [...new Set(names.filter(Boolean))];
  const suffix = list.length > max ? ` (+${list.length - max} autre(s))` : "";
  return `Vous avez ${list.length} devis à relancer : ${unique.join(", ")}.${suffix}`;
}

export function bestClientByDevis(data: AppData) {
  const counts = new Map<string, number>();
  for (const d of data.devis) {
    counts.set(d.clientId, (counts.get(d.clientId) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return null;
  const [id, count] = sorted[0];
  return { client: data.clients.find((c) => c.id === id), count };
}

export function clientsWithoutDevis(data: AppData) {
  const withDevis = new Set(data.devis.map((d) => d.clientId));
  return data.clients.filter((c) => !withDevis.has(c.id));
}

export function topChantierRentabilite(data: AppData) {
  return buildChantiersRentabilite(data)
    .filter((c) => c.rentabilite.fiabilite !== "non_calculable")
    .sort((a, b) => b.rentabilite.margeReelle - a.rentabilite.margeReelle)[0];
}

export function bestChantierType(data: AppData) {
  const byType = new Map<TypeChantier, number>();
  for (const d of data.devis) {
    const t = d.typeChantier ?? "autre";
    byType.set(t, (byType.get(t) ?? 0) + devisTotal(d));
  }
  const sorted = [...byType.entries()].sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return null;
  const [type, ca] = sorted[0];
  return { label: TYPE_CHANTIER_LABELS[type], ca };
}

/** Type de chantier le plus performant (marge moyenne) d'après le pilotage. */
export function bestChantierTypePerformance(data: AppData) {
  const rows = buildChantiersRentabilite(data).filter(
    (r) =>
      r.rentabilite.fiabilite !== "non_calculable" &&
      (r.chantier.type ?? r.chantier.categoriePilotage),
  );
  if (!rows.length) return null;

  const byType = new Map<
    TypeChantier,
    { marginSum: number; count: number }
  >();
  for (const r of rows) {
    const t = (r.chantier.type ?? "autre") as TypeChantier;
    const entry = byType.get(t) ?? { marginSum: 0, count: 0 };
    entry.marginSum += r.rentabilite.tauxMargeReelle;
    entry.count += 1;
    byType.set(t, entry);
  }

  let best: { label: string; avgMargin: number; count: number } | null = null;
  for (const [type, stats] of byType) {
    const avgMargin = stats.marginSum / stats.count;
    if (!best || avgMargin > best.avgMargin) {
      best = {
        label: TYPE_CHANTIER_LABELS[type],
        avgMargin,
        count: stats.count,
      };
    }
  }
  return best;
}

export function pilotagePartial(data: AppData): boolean {
  const readiness = getPilotageReadiness(data);
  return !readiness.isActionable;
}

export function planningToday(data: AppData, ref: Date) {
  const day = ref.toISOString().slice(0, 10);
  return data.planning.filter((e) => e.date?.startsWith(day));
}

export function planningTomorrow(data: AppData, ref: Date) {
  const tomorrow = new Date(ref);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day = tomorrow.toISOString().slice(0, 10);
  return data.planning.filter((e) => e.date?.startsWith(day));
}
