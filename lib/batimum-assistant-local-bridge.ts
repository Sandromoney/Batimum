import {
  applyPendingSlotAnswer,
  detectOrderedMissingFields,
  isDisambiguationPending,
  refineAssistantUnderstanding,
  resolveDisambiguationChoice,
} from "@/lib/batimum-assistant-brain";
import { parseContinuationSlot } from "@/lib/batimum-assistant-router";
import {
  analyzeAssistantMessage,
  isActionIntent,
  isSoftwareAnswerIntent,
  needsAiForIntent,
} from "@/lib/assistant-batimum/analyze-message";
import { understandNaturalLanguage } from "@/lib/batimum-nlu";
import type {
  AssistantAiData,
  AssistantAiUnderstanding,
  AssistantSessionContext,
  BatimumAssistantIntent,
} from "@/lib/batimum-assistant-types";
import type { AppData } from "@/lib/types";

const BRAIN_TO_API_INTENT: Partial<Record<string, BatimumAssistantIntent>> = {
  create_client: "create_client",
  search_client: "search_client",
  create_rendez_vous: "create_appointment",
  create_devis: "create_quote",
  create_chantier: "create_chantier",
  create_facture: "create_invoice",
  show_unpaid_invoices: "show_unpaid_invoices",
  show_quotes_to_follow_up: "show_quotes_to_follow_up",
};

const NLU_TO_API_INTENT: Partial<Record<string, BatimumAssistantIntent>> = {
  create_client: "create_client",
  search_client: "search_client",
  create_appointment: "create_appointment",
  create_devis: "create_quote",
  create_chantier: "create_chantier",
  create_facture: "create_invoice",
  show_unpaid_invoices: "show_unpaid_invoices",
  show_devis_to_follow_up: "show_quotes_to_follow_up",
  open_planning: "create_appointment",
};

/** Pont local → format JSON assistant (0 crédit IA). */
export function tryLocalAssistantUnderstanding(
  message: string,
  session?: AssistantSessionContext,
  appData?: AppData,
): AssistantAiUnderstanding | null {
  if (
    session &&
    isDisambiguationPending(session) &&
    session.disambiguation_candidates
  ) {
    const choice = resolveDisambiguationChoice(
      message,
      session.disambiguation_candidates,
    );
    if (choice && session.pending_intent) {
      const data: AssistantAiData = {
        ...(session.pending_data ?? {}),
        client: choice.name,
      };
      const refined = appData
        ? refineAssistantUnderstanding(
            {
              intent: session.pending_intent,
              confidence: 0.95,
              data,
              missing_fields: [],
            },
            appData,
          ).understanding
        : {
            intent: session.pending_intent,
            confidence: 0.95,
            data,
            missing_fields: detectOrderedMissingFields(session.pending_intent, data),
          };
      return refined;
    }
  }

  if (session?.pending_intent) {
    const continuation = parseContinuationSlot(message);
    if (continuation) {
      const data = applyPendingSlotAnswer(
        continuation.field,
        continuation.value,
        session.pending_data ?? {},
      );
      const missing_fields = detectOrderedMissingFields(session.pending_intent, data);
      const refined = appData
        ? refineAssistantUnderstanding(
            {
              intent: session.pending_intent,
              confidence: 0.92,
              data,
              missing_fields,
            },
            appData,
          ).understanding
        : {
            intent: session.pending_intent,
            confidence: 0.92,
            data,
            missing_fields,
          };
      return refined;
    }
  }

  if (session?.pending_intent && session.missing_fields?.length) {
    const field = session.missing_fields[0];
    if (field === "client_pick") return null;

    const value = message.trim();
    if (value.length >= 1) {
      const data = applyPendingSlotAnswer(
        field,
        value,
        session.pending_data ?? {},
      );
      const missing_fields = detectOrderedMissingFields(session.pending_intent, data);
      const refined = appData
        ? refineAssistantUnderstanding(
            {
              intent: session.pending_intent,
              confidence: 0.92,
              data,
              missing_fields,
            },
            appData,
          ).understanding
        : {
            intent: session.pending_intent,
            confidence: 0.92,
            data,
            missing_fields,
          };
      return refined;
    }
  }

  const brainAnalysis = analyzeAssistantMessage(message, {
    hasPendingIntent: Boolean(session?.pending_intent),
  });

  if (
    brainAnalysis.intent === "modify_data" &&
    String((brainAnalysis.data as Record<string, unknown>).operation ?? "") === "assign_employee"
  ) {
    const data = brainAnalysis.data as AssistantAiData;
    const missing_fields: string[] = [];
    if (!String(data.employe ?? "").trim()) missing_fields.push("employe");
    if (!String(data.chantier ?? "").trim()) missing_fields.push("chantier");
    return {
      intent: "unknown",
      confidence: brainAnalysis.confidence,
      data: { ...data, operation: "assign_employee" },
      missing_fields,
    };
  }

  if (
    isSoftwareAnswerIntent(brainAnalysis.intent) ||
    (brainAnalysis.actionType === "answer" && brainAnalysis.module === "conversation")
  ) {
    return null;
  }

  if (isActionIntent(brainAnalysis.intent) && !needsAiForIntent(brainAnalysis.intent)) {
    const mapped = BRAIN_TO_API_INTENT[brainAnalysis.intent];
    if (mapped) {
      return {
        intent: mapped,
        confidence: brainAnalysis.confidence,
        data: {},
        missing_fields: detectOrderedMissingFields(mapped, {}),
      };
    }
  }

  const local = understandNaturalLanguage(message);
  if (!local.intent || local.confidence < 0.85) return null;

  const mapped = NLU_TO_API_INTENT[local.intent];
  if (!mapped) return null;

  const data: AssistantAiData = {};
  if (local.entities.clientName) {
    if (mapped === "create_client") data.nom = local.entities.clientName;
    else data.client = local.entities.clientName;
  }
  if (local.entities.date) data.date = local.entities.date;
  if (local.entities.time) data.heure = local.entities.time;
  if (local.entities.chantierName) data.chantier = local.entities.chantierName;

  if (mapped === "create_quote") {
    if (/salle de bain/i.test(message)) data.type_chantier = "salle de bain";
    else if (/cuisine/i.test(message)) data.type_chantier = "cuisine";
    else if (/extension/i.test(message)) data.type_chantier = "extension";
    else if (/r[eé]nov/i.test(message)) data.type_chantier = "rénovation";
  }

  const raw: AssistantAiUnderstanding = {
    intent: mapped,
    confidence: local.confidence,
    data,
    missing_fields: detectOrderedMissingFields(mapped, data),
  };

  if (appData) {
    return refineAssistantUnderstanding(raw, appData).understanding;
  }
  return raw;
}
