export type {
  KnowledgeAnswer,
  KnowledgeContext,
  KnowledgeEntry,
  KnowledgeMatch,
} from "@/lib/assistant-batimum/knowledge/types";
export {
  ALL_KNOWLEDGE_ENTRIES,
  getKnowledgeEntry,
  getKnowledgeByDomain,
  KNOWLEDGE_STATS,
} from "@/lib/assistant-batimum/knowledge/registry";
export { matchKnowledge, matchKnowledgeById } from "@/lib/assistant-batimum/knowledge/matcher";
export {
  buildKnowledgeContext,
  resolveKnowledgeAnswer,
} from "@/lib/assistant-batimum/knowledge/resolve-answer";
export {
  buildKnowledgeIntentCatalog,
  getKnowledgeEntriesForAi,
} from "@/lib/assistant-batimum/knowledge/ai-catalog";
