import {
  detectPoliteness,
  replyPoliteness,
  V1_CANCEL_REPLY,
  V1_EXPLICIT_CANCEL,
  V1_EXPLICIT_CONFIRM,
  V1_OUT_OF_SCOPE_REPLY,
} from "@/lib/assistant-batimum/v1-charter";
import { detectActionIntent } from "@/lib/assistant-batimum/assistant-action-detector";
import { cleanClientName } from "@/lib/assistant-batimum/assistant-cleaners";
import { cleanAssistantText } from "@/lib/batimum-assistant-brain";
import type { AssistantPendingAction } from "@/lib/batimum-assistant-orchestrator";
import type {
  AssistantAiData,
  AssistantSessionContext,
} from "@/lib/batimum-assistant-types";

export type ContextualSignalKind =
  | "confirm"
  | "cancel"
  | "deny"
  | "thanks"
  | "ack"
  | "ambiguous_yes"
  | "correction"
  | "off_topic"
  | "none";

export type ContextualSignal = {
  kind: ContextualSignalKind;
  correction?: Partial<AssistantAiData>;
  reply?: string;
};

export type SignalContext = {
  hasActionPending: boolean;
  hasLegacyPending: boolean;
  hasDisambiguation: boolean;
  hasClarificationSession: boolean;
  actionPending?: AssistantPendingAction | null;
  entityDrafts?: AssistantAiData;
  session?: AssistantSessionContext;
};

const OFF_TOPIC_PATTERNS: RegExp[] = [
  /\b(recette|gateau|gâteau|cuisine gastronomique)\b/i,
  /\b(politique|élection|election|président|president)\b/i,
  /\b(blague|raconte une histoire|devine)\b/i,
  /\b(devoirs?|dissertation|maths? scolaire)\b/i,
  /\b(médecin|medecin|maladie|sympt[oô]me|diagnostic m[eé]dical)\b/i,
  /\b(film|série|serie|netflix|football|psg|om)\b/i,
];

const CONFIRM_PATTERNS = V1_EXPLICIT_CONFIRM;

const CANCEL_PATTERNS = V1_EXPLICIT_CANCEL;

const DENY_PATTERNS =
  /^(?:non(?:\s+|$)?|pas ça|pas ca|ce n'?est pas|incorrect|erreur)\s*[!?.]*$/i;

const THANKS_PATTERNS =
  /^(?:merci(?:\s+beaucoup)?|thanks|thank you|remercie|bcp|bien reçu)\s*[!?.]*$/i;

const ACK_PATTERNS =
  /^(?:compris|tres bien|très bien|super)\s*[!?.]*$/i;

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function isOffTopicMessage(message: string): boolean {
  const n = normalize(message);
  if (n.length < 8) return false;
  return OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(n));
}

export const OFF_TOPIC_REPLY = V1_OUT_OF_SCOPE_REPLY;

export function replyThanks(): string {
  return replyPoliteness("thanks") ?? "Avec plaisir.";
}

export function replyAck(): string {
  return "D'accord.";
}

export function replyAmbiguousYes(): string {
  return "Pouvez-vous préciser ?";
}

export function replyCancel(): string {
  return V1_CANCEL_REPLY;
}

export function replyCorrectionApplied(fieldLabel: string, value: string): string {
  return `Très bien, j'ai mis à jour ${fieldLabel} : ${value}.\n\nConfirmez-vous ?`;
}

function extractCorrection(message: string): Partial<AssistantAiData> | null {
  const trimmed = message.trim();
  const n = normalize(trimmed);

  const clientForMatch = trimmed.match(
    /(?:non\s+)?(?:pour\s+)?(?:le\s+)?client\s+(.+)/i,
  );
  if (clientForMatch?.[1]) {
    return { client: cleanClientName(clientForMatch[1]) };
  }

  const nomMatch = trimmed.match(
    /(?:non\s+)?(?:pas\s+)?(?:le\s+)?nom\s+(.+)/i,
  );
  if (nomMatch?.[1]) {
    return { nom: cleanClientName(nomMatch[1]) };
  }

  const nonPasJuste = trimmed.match(/non\s+pas\s+.+?\s+juste\s+(.+)/i);
  if (nonPasJuste?.[1]) {
    const value = cleanClientName(nonPasJuste[1]);
    if (value.length >= 1) return { nom: value, client: value };
  }

  const justMatch = trimmed.match(
    /(?:non\s+)?(?:pas\s+)?(?:juste|plutôt|plutot|seulement)\s+(.+)/i,
  );
  if (justMatch?.[1] && (n.includes("pas ") || n.startsWith("non"))) {
    const value = cleanClientName(justMatch[1]);
    if (value.length >= 2) return { nom: value, client: value };
  }

  const pourMatch = trimmed.match(/^non\s+pour\s+(.+)/i);
  if (pourMatch?.[1]) {
    const value = cleanClientName(pourMatch[1]);
    return { client: value };
  }

  return null;
}

export function classifyContextualSignal(
  message: string,
  context: SignalContext,
): ContextualSignal {
  const trimmed = message.trim();
  const n = normalize(trimmed);

  if (!trimmed) return { kind: "none" };

  const politeness = detectPoliteness(trimmed);
  if (politeness) {
    const reply = replyPoliteness(politeness);
    return {
      kind: politeness === "thanks" ? "thanks" : "ack",
      reply: reply ?? undefined,
    };
  }

  if (/^(?:non|mais)\b/i.test(trimmed) && detectActionIntent(trimmed, { session: context.session })) {
    return { kind: "none" };
  }

  if (isOffTopicMessage(trimmed)) {
    return { kind: "off_topic", reply: OFF_TOPIC_REPLY };
  }

  const correction = extractCorrection(trimmed);
  if (
    correction &&
    (context.hasActionPending ||
      context.hasClarificationSession ||
      n.startsWith("non"))
  ) {
    return { kind: "correction", correction };
  }

  const hasPending =
    context.hasActionPending ||
    context.hasLegacyPending ||
    context.hasClarificationSession;

  if (hasPending) {
    if (CONFIRM_PATTERNS.test(n) || /^oui\s+confirme/.test(n)) {
      return { kind: "confirm" };
    }
    if (CANCEL_PATTERNS.test(n) || DENY_PATTERNS.test(n)) {
      return { kind: "cancel", reply: replyCancel() };
    }
    if (DENY_PATTERNS.test(n) && correction) {
      return { kind: "correction", correction };
    }
  }

  if (THANKS_PATTERNS.test(n)) {
    return { kind: "thanks", reply: replyThanks() };
  }

  if (ACK_PATTERNS.test(n)) {
    return { kind: "ack", reply: replyAck() };
  }

  if (/^oui\s*$/.test(n) || /^oui\s*[!?.]*$/.test(n)) {
    if (context.hasActionPending) return { kind: "confirm" };
    return { kind: "ambiguous_yes", reply: replyAmbiguousYes() };
  }

  return { kind: "none" };
}

export function applyCorrectionToDrafts(
  drafts: AssistantAiData,
  correction: Partial<AssistantAiData>,
): AssistantAiData {
  const next = { ...drafts };
  for (const [key, value] of Object.entries(correction)) {
    if (typeof value === "string" && value.trim()) {
      next[key as keyof AssistantAiData] = cleanAssistantText(value);
    }
  }
  if (next.nom) next.nom = cleanClientName(next.nom);
  if (next.client) next.client = cleanClientName(next.client);
  return next;
}

export function fieldLabelForKey(key: keyof AssistantAiData): string {
  const labels: Partial<Record<keyof AssistantAiData, string>> = {
    nom: "le nom",
    client: "le client",
    date: "la date",
    heure: "l'heure",
    adresse: "l'adresse",
    telephone: "le téléphone",
    type_chantier: "le type de travaux",
    chantier: "le chantier",
  };
  return labels[key] ?? "l'information";
}
