import {
  buildKnowledgeContext,
  resolveKnowledgeAnswer,
} from "@/lib/assistant-batimum/knowledge/resolve-answer";
import { matchKnowledge } from "@/lib/assistant-batimum/knowledge/matcher";
import { getKnowledgeEntry, KNOWLEDGE_STATS } from "@/lib/assistant-batimum/knowledge/registry";
import type { AssistantAnalysis, AssistantBrainContext } from "@/lib/assistant-batimum/assistant-types";
import type { AppData } from "@/lib/types";
import {
  isPlanningAssignAnalysis,
  isPlanningAssignMessage,
} from "@/lib/batimum-assistant-planning";

export type KnowledgeEngineAnswer = {
  text: string;
  navigateTo?: string;
  sourceIntent?: string;
  mode: "direct" | "guide" | "pedagogical";
};

const SOFTWARE_TOPICS = [
  "tableau de bord",
  "clients",
  "devis",
  "factures",
  "chantiers",
  "planning",
  "employés",
  "fournitures",
  "paramètres",
  "pilotage",
  "MUM IA",
];

export function answerFromKnowledgeEngine(
  message: string,
  analysis: AssistantAnalysis,
  data: AppData,
  context: AssistantBrainContext,
): KnowledgeEngineAnswer | null {
  if (isPlanningAssignAnalysis(analysis) || isPlanningAssignMessage(message)) {
    return null;
  }

  const direct = getKnowledgeEntry(analysis.intent);
  if (direct) {
    const answer = resolveKnowledgeAnswer(
      analysis.intent,
      buildKnowledgeContext(message, data, new Date(), context),
    );
    if (answer?.text) {
      return {
        text: answer.text,
        navigateTo: answer.navigateTo,
        sourceIntent: analysis.intent,
        mode: "direct",
      };
    }
  }

  const matched = matchKnowledge(message, { preferActions: false });
  if (matched?.entry) {
    const intent = matched.entry.id;
    const answer = resolveKnowledgeAnswer(
      intent,
      buildKnowledgeContext(message, data, new Date(), context),
    );
    if (answer?.text) {
      return {
        text: answer.text,
        navigateTo: answer.navigateTo,
        sourceIntent: intent,
        mode: "pedagogical",
      };
    }
  }

  if (analysis.messageCategory === "question_logiciel") {
    return {
      mode: "guide",
      text: `Je peux vous guider immédiatement sur Batimum. Dites-moi le module ciblé (${SOFTWARE_TOPICS.join(", ")}). J'ai une base active sur ${KNOWLEDGE_STATS.totalEntries} points de connaissance.`,
    };
  }

  return null;
}
