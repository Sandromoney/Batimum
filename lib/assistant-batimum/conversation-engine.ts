import type { AssistantIntent } from "@/lib/assistant-batimum/assistant-types";

type ConversationOptions = {
  intent?: AssistantIntent;
  userMessage?: string;
};

function userUsesEmoji(message?: string): boolean {
  if (!message) return false;
  return /[\u{1F300}-\u{1FAFF}]/u.test(message);
}

function sanitizeInternalJargon(reply: string): string {
  return reply
    .replace(/\b(?:intent|action|json|tool|fonction|code)\b\s*:?/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function finalizeConversationReply(
  reply: string,
  options: ConversationOptions = {},
): string {
  const cleaned = sanitizeInternalJargon(reply);
  const intent = options.intent;

  if (intent === "greeting") {
    return "Bonjour. Comment puis-je vous aider aujourd'hui sur Batimum ?";
  }
  if (intent === "thanks") {
    return "Avec plaisir. Je reste disponible si vous avez besoin d'autre chose.";
  }
  if (intent === "ack") {
    return "Parfait. Dites-moi ce que vous souhaitez faire ensuite.";
  }
  if (intent === "small_talk") {
    return "Je vais très bien, merci. Comment puis-je vous aider aujourd'hui sur Batimum ?";
  }
  if (intent === "farewell") {
    return "Merci. Je vous souhaite également une excellente journée.";
  }
  if (intent === "out_of_scope") {
    return "Je suis principalement conçu pour vous aider à gérer votre entreprise avec Batimum.";
  }

  if (!userUsesEmoji(options.userMessage)) {
    return cleaned.replace(/[\u{1F300}-\u{1FAFF}]/gu, "");
  }
  return cleaned;
}
