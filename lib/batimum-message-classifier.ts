/**
 * Classification des messages — délègue au routeur d'intentions.
 */

import {
  INCOMPREHENSIBLE_REPLY,
  OFF_TOPIC_REPLY,
  routeAssistantMessage,
  type AssistantRouteIntent,
  type RoutedMessage,
} from "@/lib/batimum-assistant-router";

export type MessageCategory =
  | "conversation"
  | "batimum_action"
  | "batimum_question"
  | "btp_question"
  | "off_topic"
  | "unrecognized";

export type ClassifiedMessage = {
  category: MessageCategory;
  confidence: number;
  actionIntent?: string;
  reply?: string;
  route?: RoutedMessage;
};

function mapRouteToCategory(intent: AssistantRouteIntent): MessageCategory {
  switch (intent) {
    case "conversation_simple":
    case "remerciement":
    case "confirmation":
    case "refus":
    case "correction":
      return "conversation";
    case "hors_sujet":
      return "off_topic";
    case "incompris":
      return "unrecognized";
    case "question_logiciel":
    case "conseil_entreprise":
      return "batimum_question";
    case "question_btp":
      return "btp_question";
    default:
      if (intent.startsWith("action_")) return "batimum_action";
      return "unrecognized";
  }
}

export const CONVERSATION_CA_VA_REPLY =
  "Très bien, prêt à vous aider à piloter Batimum.";

export const OFF_TOPIC_CLASSIFIER_REPLY = OFF_TOPIC_REPLY;
export const UNRECOGNIZED_REPLY = INCOMPREHENSIBLE_REPLY;

const NOT_AVAILABLE = new Set([
  "create_employe",
  "create_fourniture",
  "create_facture",
]);

export function getNotAvailableReply(actionIntent: string): string {
  const samples: Record<string, string> = {
    create_employe: "crée nouvel employé",
    create_fourniture: "crée une fourniture",
    create_facture: "crée une facture",
  };
  const route = routeAssistantMessage(samples[actionIntent] ?? actionIntent);
  return route.reply ?? "Cette fonctionnalité n'est pas encore disponible.";
}

export function isNotYetAvailableAction(actionIntent: string): boolean {
  return NOT_AVAILABLE.has(actionIntent);
}

export function classifyUserMessage(
  message: string,
  options?: { hasPendingAction?: boolean; hasPendingIntent?: boolean },
): ClassifiedMessage {
  const route = routeAssistantMessage(message, options);
  return {
    category: mapRouteToCategory(route.intent),
    confidence: route.confidence,
    actionIntent: route.actionKey,
    reply: route.reply,
    route,
  };
}

export function hasExplicitActionIntent(text: string): boolean {
  const route = routeAssistantMessage(text);
  return route.intent.startsWith("action_") && !route.reply;
}

export function isConversationMessage(message: string): boolean {
  const route = routeAssistantMessage(message);
  return ["conversation_simple", "remerciement"].includes(route.intent);
}
