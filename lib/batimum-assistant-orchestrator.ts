import {
  buildConfirmationSummary,
  buildClarificationQuestion,
} from "@/lib/batimum-assistant-brain";
import { UNRECOGNIZED_REPLY } from "@/lib/batimum-message-classifier";
import type {
  AssistantAiData,
  AssistantAiUnderstanding,
  AssistantSessionContext,
} from "@/lib/batimum-assistant-types";
import {
  DATA_FIELD_LABELS,
  EXECUTABLE_ASSISTANT_INTENTS,
  NOT_YET_AVAILABLE_INTENTS,
} from "@/lib/batimum-assistant-types";

export type AssistantPendingAction = {
  intent: AssistantAiUnderstanding["intent"];
  data: AssistantAiData;
  securityGuard?: {
    approved: boolean;
    confidence: number;
    source: "copilot" | "orchestrator";
  };
  editableFields: Array<{
    key: keyof AssistantAiData;
    label: string;
    value: string;
  }>;
};

export type AssistantTurnPlan =
  | {
      kind: "clarify";
      reply: string;
      session: AssistantSessionContext;
      creditLabel?: string;
    }
  | {
      kind: "disambiguate";
      reply: string;
      session: AssistantSessionContext;
      candidates: Array<{ id: string; name: string }>;
      creditLabel?: string;
    }
  | {
      kind: "pending";
      reply: string;
      pending: AssistantPendingAction;
      creditLabel?: string;
    }
  | {
      kind: "not_available";
      reply: string;
      creditLabel?: string;
    }
  | {
      kind: "conversation";
      reply: string;
      creditLabel?: string;
    }
  | {
      kind: "fallback";
    };

function buildEditableFields(data: AssistantAiData) {
  const fields: AssistantPendingAction["editableFields"] = [];
  for (const key of Object.keys(DATA_FIELD_LABELS) as Array<keyof AssistantAiData>) {
    const value = data[key];
    if (value) {
      fields.push({ key, label: DATA_FIELD_LABELS[key], value });
    }
  }
  return fields;
}

export function planAssistantTurn(
  understanding: AssistantAiUnderstanding,
  session: AssistantSessionContext,
  creditLabel?: string,
  disambiguation?: { candidates: Array<{ id: string; name: string }> },
): AssistantTurnPlan {
  const { intent, data, missing_fields, clarification_question } = understanding;

  if (intent === "conversation" || intent === "unknown") {
    return {
      kind: "conversation",
      reply: UNRECOGNIZED_REPLY,
      creditLabel,
    };
  }

  if (NOT_YET_AVAILABLE_INTENTS.has(intent)) {
    return {
      kind: "not_available",
      reply:
        "Je comprends votre demande, mais cette action n'est pas encore disponible pour le moment.",
      creditLabel,
    };
  }

  if (missing_fields.includes("client_pick") && disambiguation?.candidates.length) {
    return {
      kind: "disambiguate",
      reply:
        clarification_question ??
        "J'ai trouvé plusieurs clients. Lequel souhaitez-vous utiliser ?",
      session: {
        ...session,
        pending_intent: intent,
        pending_data: data,
        missing_fields: ["client_pick"],
        disambiguation_candidates: disambiguation.candidates,
      },
      candidates: disambiguation.candidates,
      creditLabel,
    };
  }

  if (missing_fields.length > 0) {
    const field = missing_fields[0];
    const question =
      clarification_question ??
      buildClarificationQuestion(intent, field, data);
    return {
      kind: "clarify",
      reply: question,
      session: {
        ...session,
        pending_intent: intent,
        pending_data: data,
        missing_fields,
        disambiguation_candidates: undefined,
      },
      creditLabel,
    };
  }

  if (!EXECUTABLE_ASSISTANT_INTENTS.has(intent)) {
    return {
      kind: "conversation",
      reply: UNRECOGNIZED_REPLY,
      creditLabel,
    };
  }

  return {
    kind: "pending",
    reply: buildConfirmationSummary(intent, data),
    pending: {
      intent,
      data,
      securityGuard: {
        approved: understanding.confidence >= 0.95,
        confidence: understanding.confidence,
        source: "orchestrator",
      },
      editableFields: buildEditableFields(data),
    },
    creditLabel,
  };
}
