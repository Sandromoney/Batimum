import { getClientDisplayName } from "@/lib/clients";
import type { AppData } from "@/lib/types";
import type { AssistantAnalysis, AssistantBrainContext } from "@/lib/assistant-batimum/assistant-types";

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const aa = normalize(a);
  const bb = normalize(b);
  if (!aa || !bb) return 0;
  if (aa === bb) return 1;
  if (aa.includes(bb) || bb.includes(aa)) return 0.94;
  const max = Math.max(aa.length, bb.length);
  if (!max) return 0;
  return 1 - levenshtein(aa, bb) / max;
}

function bestMatch(query: string, candidates: string[]): { value?: string; score: number } {
  let bestScore = 0;
  let bestValue: string | undefined;
  for (const c of candidates) {
    const s = similarity(query, c);
    if (s > bestScore) {
      bestScore = s;
      bestValue = c;
    }
  }
  return { value: bestValue, score: bestScore };
}

function topMatches(query: string, candidates: string[], limit = 3): Array<{ value: string; score: number }> {
  return candidates
    .map((c) => ({ value: c, score: similarity(query, c) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Corrige les entités avec fuzzy search sur données Batimum (fautes de frappe).
 */
export function resolveEntitiesWithData(
  analysis: AssistantAnalysis,
  appData: AppData,
  context: AssistantBrainContext,
): AssistantAnalysis {
  const data = { ...analysis.data } as Record<string, unknown>;
  let confidence = analysis.confidence;

  const clientQuery = String(data.client ?? data.nom ?? "").trim();
  if (clientQuery) {
    const clientNames = appData.clients.map((c) => getClientDisplayName(c));
    const match = bestMatch(clientQuery, clientNames);
    const top = topMatches(clientQuery, clientNames, 3);
    if (match.value && match.score >= 0.82) {
      data.client = match.value;
      confidence = Math.max(confidence, Math.min(0.98, match.score));
      data.entity_resolution = {
        ...(data.entity_resolution as Record<string, unknown> | undefined),
        client: { query: clientQuery, resolved: match.value, score: match.score },
      };
      if (top.length > 1 && top[0] && top[1] && Math.abs(top[0].score - top[1].score) <= 0.05) {
        data.entity_candidates = {
          ...(data.entity_candidates as Record<string, unknown> | undefined),
          client: top.map((t) => t.value),
        };
      }
    }
  }

  const employeQuery = String(data.employe ?? "").trim();
  if (employeQuery) {
    const employeNames = appData.employes.map((e) => `${e.prenom} ${e.nom}`.trim());
    const match = bestMatch(employeQuery, employeNames);
    if (match.value && match.score >= 0.8) {
      data.employe = match.value;
      confidence = Math.max(confidence, Math.min(0.97, match.score));
    }
  }

  const chantierQuery = String(
    data.chantier ??
      (/\bdessus\b|\bcelui-ci\b|\bcelui-la\b/i.test(context.session?.recent_messages?.slice(-1)[0]?.content ?? "")
        ? context.memory?.currentChantier
        : ""),
  ).trim();
  if (chantierQuery) {
    const chantierNames = appData.chantiers.map((c) => c.nom);
    const match = bestMatch(chantierQuery, chantierNames);
    if (match.value && match.score >= 0.78) {
      data.chantier = match.value;
      confidence = Math.max(confidence, Math.min(0.95, match.score));
    }
  }

  return { ...analysis, data: data as AssistantAnalysis["data"], confidence };
}

