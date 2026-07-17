import {
  analyzeAssistantMessage,
  isActionIntent,
  isSoftwareAnswerIntent,
  needsAiForIntent,
} from "@/lib/assistant-batimum/analyze-message";
import {
  LOCAL_UNDERSTAND_THRESHOLD,
} from "@/lib/batimum-assistant-understand";
import { isPlanningAssignMessage } from "@/lib/batimum-assistant-planning";

export type RoutingOptions = {
  hasPendingAction?: boolean;
  hasPendingIntent?: boolean;
};

export type AssistantRoutingDecision = {
  forceOpenAi: boolean;
  category?: "business_action";
  source?: "OPENAI";
  reason?: "create_client_without_name";
};

function toBrainContext(options?: RoutingOptions) {
  return {
    hasPendingAction: options?.hasPendingAction,
    hasPendingIntent: options?.hasPendingIntent,
  };
}

const LOCAL_ONLY_INTENTS = new Set([
  "greeting",
  "thanks",
  "small_talk",
  "ack",
  "help_capabilities",
  "confirmation",
  "cancellation",
  "out_of_scope",
]);

const STRICT_POLITENESS_ONLY =
  /^(?:bonjour|salut|bonsoir|merci|merci beaucoup|au revoir|bonne journee|bonne journée|ca va|ça va|ca va\?|ça va\?)\s*[!?.]*$/i;
const CREATE_CLIENT_WITHOUT_NAME =
  /^(?:j['’]?\s*aimerais|je\s+veux|(?:cr[eé]e|créer)|nouveau)\s+(?:.*\s)?client\s*[!?.]*$/i;

function shouldForceOpenAiCreateClient(message: string): boolean {
  const trimmed = message.trim();
  if (!CREATE_CLIENT_WITHOUT_NAME.test(trimmed)) return false;
  const n = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return !/\b(?:pour|nom|client\s*[:\-])\b/.test(n);
}

export function getAssistantRoutingDecision(
  message: string,
  _options?: RoutingOptions,
): AssistantRoutingDecision {
  if (shouldForceOpenAiCreateClient(message)) {
    return {
      forceOpenAi: true,
      category: "business_action",
      source: "OPENAI",
      reason: "create_client_without_name",
    };
  }
  return { forceOpenAi: false };
}

/** Requêtes traitées localement sans appel OpenAI (0 crédit IA). */
export function isLocalAssistantQuery(
  message: string,
  options?: RoutingOptions,
): boolean {
  if (STRICT_POLITENESS_ONLY.test(message.trim())) return true;
  if (isPlanningAssignMessage(message)) return false;

  const analysis = analyzeAssistantMessage(message, toBrainContext(options));

  if (LOCAL_ONLY_INTENTS.has(analysis.intent)) return true;
  if (analysis.intent === "correction") return false;
  if (isSoftwareAnswerIntent(analysis.intent)) return false;
  if (isActionIntent(analysis.intent)) return false;
  return false;
}

/** Demandes complexes nécessitant OpenAI (1 crédit IA). */
export function isComplexAiQuery(message: string, options?: RoutingOptions): boolean {
  if (isPlanningAssignMessage(message)) return true;

  const analysis = analyzeAssistantMessage(message, toBrainContext(options));
  if (analysis.confidence >= LOCAL_UNDERSTAND_THRESHOLD && isLocalAssistantQuery(message, options)) {
    return false;
  }
  if (needsAiForIntent(analysis.intent)) return true;

  const n = message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (/r[eé]dig|mail|email|message|relance.*r[eé]dig|texte/.test(n)) return true;
  if (/g[eé]n[eè]re|mum ia|analyse.*rentabilit|explique|pourquoi/.test(n)) return true;
  if (/devis.*(salle|bain|cuisine|chantier|m2|m²)/.test(n) && n.length > 40) return true;
  if (/met|mets|affecte|place|planning/.test(n)) return true;
  if (/cr[eé][eé].*clien|nouveau client|je veux.*client/.test(n)) return true;
  if (/meilleur|combien.*fais|combien.*gagn|ce mois/.test(n)) return true;
  return analysis.confidence < LOCAL_UNDERSTAND_THRESHOLD;
}

export function shouldCallAssistantUnderstandApi(
  message: string,
  options?: RoutingOptions,
): boolean {
  const forced = getAssistantRoutingDecision(message, options);
  if (forced.forceOpenAi) return true;
  if (STRICT_POLITENESS_ONLY.test(message.trim())) return false;
  if (isPlanningAssignMessage(message)) return true;
  // V1 stratégie : tout ce qui n'est pas politesse stricte passe par OpenAI Assistant.
  return true;
}

export const LOCAL_CREDIT_LABEL = "Action Batimum · 0 crédit IA";
export const AI_CREDIT_LABEL = "Assistant IA · 1 crédit IA";
