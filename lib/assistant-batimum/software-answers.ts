import {
  buildKnowledgeContext,
  resolveKnowledgeAnswer,
} from "@/lib/assistant-batimum/knowledge";
import { matchKnowledge } from "@/lib/assistant-batimum/knowledge/matcher";
import { getKnowledgeEntry } from "@/lib/assistant-batimum/knowledge/registry";
import type { AssistantBrainIntent } from "@/lib/assistant-batimum/types";
import type { AppData } from "@/lib/types";

/** Résout une réponse à partir de la base de connaissances. */
export function answerSoftwareIntent(
  intent: AssistantBrainIntent,
  data: AppData,
  message: string,
  referenceDate = new Date(),
): string | null {
  const ctx = buildKnowledgeContext(message, data, referenceDate);
  const answer = resolveKnowledgeAnswer(intent, ctx);
  return answer?.text ?? null;
}

export function answerSoftwareQuestion(
  message: string,
  data: AppData,
  referenceDate = new Date(),
): string | null {
  const match = matchKnowledge(message);
  if (!match) return null;
  const ctx = buildKnowledgeContext(message, data, referenceDate);
  return resolveKnowledgeAnswer(match.entry.id, ctx)?.text ?? null;
}

export function answerBtpQuestion(message: string): string | null {
  const ctx = buildKnowledgeContext(message, {} as AppData);
  return resolveKnowledgeAnswer("btp_question", ctx)?.text ?? null;
}

export function answerConseilEntreprise(data: AppData): string {
  const ctx = buildKnowledgeContext("", data);
  return (
    resolveKnowledgeAnswer("company_advice", ctx)?.text ??
    "Je n'ai pas encore assez d'historique pour donner un conseil fiable."
  );
}

export function getKnowledgeAnswerMeta(
  intent: string,
  data: AppData,
  message: string,
) {
  const ctx = buildKnowledgeContext(message, data);
  const answer = resolveKnowledgeAnswer(intent, ctx);
  const entry = getKnowledgeEntry(intent);
  return { answer, entry };
}
