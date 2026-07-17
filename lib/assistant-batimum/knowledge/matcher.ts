import { normalizeAssistantText } from "@/lib/assistant-batimum/normalize";
import type { KnowledgeEntry, KnowledgeMatch } from "@/lib/assistant-batimum/knowledge/types";
import { ALL_KNOWLEDGE_ENTRIES, getKnowledgeEntry } from "@/lib/assistant-batimum/knowledge/registry";

const MATCH_THRESHOLD = 0.52;

function singularize(token: string): string {
  if (token.endsWith("s") && token.length > 3) return token.slice(0, -1);
  return token;
}

function tokenize(text: string): string[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((t) => [t, singularize(t)]);
}

function scoreKeywords(entry: KnowledgeEntry, normalized: string): number {
  if (!entry.keywords.length) return 0;
  const tokens = new Set(tokenize(normalized));
  let hits = 0;
  for (const kw of entry.keywords) {
    const nkw = normalizeAssistantText(kw);
    if (nkw.length <= 4) {
      if (tokens.has(nkw) || tokens.has(singularize(nkw))) hits++;
    } else if (normalized.includes(nkw) || tokens.has(nkw)) {
      hits++;
    }
  }
  return hits / entry.keywords.length;
}

function scoreEntry(
  entry: KnowledgeEntry,
  normalized: string,
  options?: { preferActions?: boolean },
): number {
  let score = 0;

  if (options?.preferActions) {
    if (entry.actionType === "answer" && entry.id.startsWith("count_")) {
      return 0;
    }
    if (entry.actionType === "prepare_action") {
      score += 0.15;
    }
  }

  for (const pattern of entry.patterns) {
    if (pattern.test(normalized)) {
      score = Math.max(score, entry.confidence ?? 0.88);
    }
  }

  const kwScore = scoreKeywords(entry, normalized);
  if (kwScore >= 0.45) {
    score = Math.max(score, 0.55 + kwScore * 0.35);
  }

  score += (entry.priority ?? 0) * 0.002;
  return Math.min(score, 0.99);
}

export function matchKnowledge(
  message: string,
  options?: { minConfidence?: number; preferActions?: boolean },
): KnowledgeMatch | null {
  const normalized = normalizeAssistantText(message.trim());
  if (!normalized) return null;

  const threshold = options?.minConfidence ?? MATCH_THRESHOLD;
  const sorted = [...ALL_KNOWLEDGE_ENTRIES].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
  );

  let best: KnowledgeMatch | null = null;

  for (const entry of sorted) {
    const score = scoreEntry(entry, normalized, options);
    if (score >= threshold && (!best || score > best.score)) {
      best = { entry, confidence: score, score };
    }
  }

  return best;
}

export function matchKnowledgeById(id: string): KnowledgeEntry | undefined {
  return getKnowledgeEntry(id);
}
