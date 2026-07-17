import { normalizeAssistantText } from "@/lib/assistant-batimum/normalize";
import { MSG_PARTIAL } from "@/lib/assistant-batimum/knowledge/helpers";
import { getKnowledgeEntry } from "@/lib/assistant-batimum/knowledge/registry";
import type {
  KnowledgeAnswer,
  KnowledgeContext,
} from "@/lib/assistant-batimum/knowledge/types";
import type { AppData } from "@/lib/types";
import type { AssistantBrainContext } from "@/lib/assistant-batimum/types";

export function buildKnowledgeContext(
  message: string,
  data: AppData,
  referenceDate = new Date(),
  brainContext?: AssistantBrainContext,
): KnowledgeContext {
  return {
    message,
    normalized: normalizeAssistantText(message),
    data,
    referenceDate,
    brainContext,
  };
}

export function resolveKnowledgeAnswer(
  intentId: string,
  ctx: KnowledgeContext,
): KnowledgeAnswer | null {
  const entry = getKnowledgeEntry(intentId);
  if (!entry) return null;

  if (entry.unavailable) {
    return { text: entry.unavailableReply ?? "Cette fonctionnalité n'est pas encore disponible." };
  }

  if (!entry.answer) return null;

  const result = entry.answer(ctx);
  if (!result) {
    return entry.missingDataQuestion
      ? { text: entry.missingDataQuestion }
      : { text: "Je ne peux pas répondre précisément car cette information n'est pas encore renseignée." };
  }

  if (result.partial && !result.text.includes("estimatif")) {
    return { ...result, text: `${result.text}\n\n${MSG_PARTIAL}` };
  }

  return result;
}
