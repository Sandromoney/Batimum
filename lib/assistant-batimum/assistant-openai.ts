import { shouldUseAiFallback, AI_FALLBACK_CONFIDENCE } from "@/lib/assistant-batimum/assistant-router";
import { buildKnowledgeIntentCatalog } from "@/lib/assistant-batimum/knowledge/ai-catalog";
import type { AssistantAnalysis } from "@/lib/assistant-batimum/assistant-types";

export { AI_FALLBACK_CONFIDENCE };

export function shouldCallOpenAi(analysis: AssistantAnalysis): boolean {
  if (analysis.creditType === "ai") return true;
  return shouldUseAiFallback(analysis);
}

export function buildOpenAiClassificationContext(
  message: string,
  analysis: AssistantAnalysis,
): Record<string, unknown> {
  return {
    message,
    localIntent: analysis.intent,
    localConfidence: analysis.confidence,
    localModule: analysis.module,
    intentCatalog: buildKnowledgeIntentCatalog().slice(0, 40),
  };
}
