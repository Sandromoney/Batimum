import { ALL_KNOWLEDGE_ENTRIES } from "@/lib/assistant-batimum/knowledge/registry";
import type { KnowledgeEntry } from "@/lib/assistant-batimum/knowledge/types";

/** Catalogue compact pour classification OpenAI (sans données utilisateur). */
export function buildKnowledgeIntentCatalog(): Array<{
  id: string;
  domain: string;
  actionType: string;
  examples: string[];
}> {
  const seen = new Set<string>();
  const catalog: Array<{
    id: string;
    domain: string;
    actionType: string;
    examples: string[];
  }> = [];

  for (const entry of ALL_KNOWLEDGE_ENTRIES) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    catalog.push({
      id: entry.id,
      domain: entry.domain,
      actionType: entry.actionType,
      examples: entry.keywords.slice(0, 5),
    });
  }

  return catalog.sort((a, b) => a.domain.localeCompare(b.domain));
}

export function getKnowledgeEntriesForAi(): KnowledgeEntry[] {
  const byId = new Map<string, KnowledgeEntry>();
  for (const entry of ALL_KNOWLEDGE_ENTRIES) {
    const existing = byId.get(entry.id);
    if (!existing || (entry.priority ?? 0) > (existing.priority ?? 0)) {
      byId.set(entry.id, entry);
    }
  }
  return [...byId.values()];
}
