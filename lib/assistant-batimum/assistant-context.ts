import { mergeClientNamePart } from "@/lib/batimum-assistant-brain";
import { parseContinuationSlot } from "@/lib/batimum-assistant-router";
import {
  cleanClientName,
  extractChantierType,
  extractClientName,
  extractEmployeName,
} from "@/lib/assistant-batimum/assistant-cleaners";
import type {
  AssistantBrainContext,
  AssistantIntent,
} from "@/lib/assistant-batimum/assistant-types";
import type { AssistantSessionContext } from "@/lib/batimum-assistant-types";
import { normalizeAssistantText } from "@/lib/assistant-batimum/normalize";

export function buildBrainContext(
  session?: AssistantSessionContext,
  options?: { currentPath?: string; hasPendingAction?: boolean },
): AssistantBrainContext {
  return {
    session,
    currentPath: options?.currentPath,
    hasPendingAction: options?.hasPendingAction,
    hasPendingIntent: Boolean(session?.pending_intent),
    hasLegacyPending: Boolean((session as { pending_action?: unknown })?.pending_action),
  };
}

/** Complète l'intention avec le contexte de session (slot filling). */
export function resolveContextualIntent(
  message: string,
  intent: AssistantIntent,
  context: AssistantBrainContext,
): {
  intent: AssistantIntent;
  data: Record<string, unknown>;
  slotFilled: boolean;
} {
  const session = context.session;
  const data: Record<string, unknown> = { ...(session?.pending_data ?? {}) };
  let resolvedIntent = intent;
  let slotFilled = false;

  if (!session?.pending_intent) {
    return { intent: resolvedIntent, data, slotFilled };
  }

  const slot = parseContinuationSlot(message);
  if (slot) {
    data[slot.field] = slot.value;
    slotFilled = true;
    return { intent: session.pending_intent as AssistantIntent, data, slotFilled };
  }

  const trimmed = message.trim();
  if (trimmed.length >= 1 && session.missing_fields?.length) {
    const field = session.missing_fields[0];
    if (field === "client" || field === "nom") {
      data[field] = cleanClientName(trimmed);
    } else if (field === "nom_complet") {
      data.nom = mergeClientNamePart(String(data.nom ?? ""), trimmed);
    } else {
      data[field] = trimmed;
    }
    slotFilled = true;
    return { intent: session.pending_intent as AssistantIntent, data, slotFilled };
  }

  const n = normalizeAssistantText(message);
  if (
    /^(?:pour|chez)\s+(?:le\s+)?client\s+/i.test(message) ||
    /^pour\s+/i.test(message)
  ) {
    const clientPart = message.replace(/^(?:pour|chez)\s+(?:le\s+)?client\s+/i, "").replace(/^pour\s+/i, "");
    data.client = cleanClientName(clientPart);
    slotFilled = true;
    resolvedIntent = session.pending_intent as AssistantIntent;
  }

  if (/fais[- ]?lui\s+un\s+devis/i.test(n) && data.client) {
    resolvedIntent = "create_devis";
    slotFilled = true;
  }

  return { intent: resolvedIntent, data, slotFilled };
}

export function extractIntentData(
  intent: AssistantIntent,
  message: string,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (intent === "create_client" || intent === "search_client" || intent === "open_client") {
    const name = extractClientName(message);
    if (name) {
      if (intent === "create_client") data.nom = name;
      else data.client = name;
    }
  }

  if (intent === "create_employe") {
    const name = extractEmployeName(message);
    if (name) data.nom = name;
  }

  if (intent === "create_devis") {
    const type = extractChantierType(message);
    if (type) data.type_chantier = type;
    const pourMatch = message.match(/(?:pour|chez)\s+(?:le\s+)?(?:client\s+)?(.+)/i);
    if (pourMatch?.[1]) {
      const client = cleanClientName(pourMatch[1]);
      if (client.length >= 2) data.client = client;
    }
    const client = extractClientName(message);
    if (client) data.client = client;
  }

  if (intent === "search_devis") {
    const ref = message.match(/\bD?EV?-?\d{4,}\b/i)?.[0];
    if (ref) data.devis = ref;
  }

  return data;
}
