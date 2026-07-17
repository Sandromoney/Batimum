import { parseContinuationSlot } from "@/lib/batimum-assistant-router";
import {
  detectActionIntent,
  hasActionVerb,
} from "@/lib/assistant-batimum/assistant-action-detector";
import { enrichActionAnalysis } from "@/lib/assistant-batimum/assistant-actions";
import type { MessageCategory } from "@/lib/assistant-batimum/assistant-rules";
import {
  classifyMessageCategory,
  extractUserCorrection,
  matchConversationIntent,
  targetedFieldQuestion,
  CAREFUL_REPLY,
} from "@/lib/assistant-batimum/assistant-rules";
import {
  extractIntentData,
  resolveContextualIntent,
} from "@/lib/assistant-batimum/assistant-context";
import {
  ACK_REPLY,
  CANCEL_NO_PENDING_REPLY,
  CONFIRM_NO_PENDING_REPLY,
} from "@/lib/assistant-batimum/conversation";
import { matchKnowledge } from "@/lib/assistant-batimum/knowledge/matcher";
import { getKnowledgeEntry } from "@/lib/assistant-batimum/knowledge/registry";
import {
  resolveAwaitingAnswer,
  resolveWithAiRequest,
  isAwaitingAnswer,
} from "@/lib/assistant-batimum/assistant-short-answer";
import {
  resolveNaturalLanguageIntent,
  resolveNaturalLanguageIntents,
} from "@/lib/assistant-batimum/assistant-nlu-engine";
import { inferRole } from "@/lib/assistant-batimum/assistant-responses";
import { normalizeAssistantText } from "@/lib/assistant-batimum/normalize";
import type {
  AssistantAnalysis,
  AssistantBrainContext,
  AssistantIntent,
  AssistantActionType,
  AssistantRole,
} from "@/lib/assistant-batimum/assistant-types";

const LOCAL_CONFIDENCE_THRESHOLD = 0.9;

export const AI_FALLBACK_CONFIDENCE = LOCAL_CONFIDENCE_THRESHOLD;

function toAssistantIntentFromSession(intent?: string): AssistantIntent | undefined {
  if (!intent) return undefined;
  if (intent === "create_quote") return "create_devis";
  if (intent === "create_invoice") return "create_facture";
  if (intent === "create_appointment") return "create_rendez_vous";
  return intent as AssistantIntent;
}

function isExplicitCreateClientRequest(message: string): boolean {
  const n = normalizeAssistantText(message);
  return /\b(?:je veux|je voudrais|j'aimerais|cree|crée|nouveau|ajoute)\b/.test(n) && /\bclient\b/.test(n);
}

function buildAnalysis(
  intent: AssistantIntent,
  module: string,
  actionType: AssistantActionType,
  confidence: number,
  data: Record<string, unknown> = {},
  missingFields: string[] = [],
  options?: {
    needsConfirmation?: boolean;
    creditType?: "free" | "ai";
    messageCategory?: MessageCategory;
    message?: string;
    context?: AssistantBrainContext;
  },
): AssistantAnalysis {
  const role = inferRole(intent, module);
  const entry = getKnowledgeEntry(intent);
  const creditType =
    options?.creditType ?? (entry?.needsAi ? "ai" : "free");
  const messageCategory =
    options?.messageCategory ??
    (options?.message
      ? classifyMessageCategory(options.message, options?.context ?? {})
      : undefined);

  return {
    intent,
    role,
    module,
    actionType,
    confidence,
    data,
    missingFields,
    needsConfirmation: options?.needsConfirmation ?? false,
    creditType,
    messageCategory,
  };
}

function extractCorrection(message: string): Record<string, string> | null {
  return extractUserCorrection(message);
}

function buildActionAnalysis(
  intent: AssistantIntent,
  module: string,
  message: string,
  confidence: number,
  baseData: Record<string, unknown> = {},
  context: AssistantBrainContext = {},
): AssistantAnalysis {
  const enriched = enrichActionAnalysis(intent, message, {
    ...extractIntentData(intent, message),
    ...baseData,
  });
  return buildAnalysis(
    intent,
    module,
    enriched.actionType,
    confidence,
    enriched.data,
    enriched.missingFields,
    {
      needsConfirmation: enriched.needsConfirmation,
      message,
      context,
    },
  );
}

export function analyzeAssistantMessage(
  message: string,
  context: AssistantBrainContext = {},
): AssistantAnalysis {
  const trimmed = message.trim();
  const n = normalizeAssistantText(trimmed);
  const category = classifyMessageCategory(trimmed, context);
  const analysisOpts = { message: trimmed, context };

  if (!trimmed) {
    return buildAnalysis(
      "unknown",
      "core",
      "ask_question",
      0.2,
      {},
      ["message"],
      { messageCategory: "incompris", ...analysisOpts },
    );
  }

  if (isExplicitCreateClientRequest(trimmed)) {
    const pendingIntent = toAssistantIntentFromSession(context.session?.pending_intent);
    const base = buildActionAnalysis(
      "create_client",
      "clients",
      trimmed,
      0.97,
      {
        reset_previous_workflow: Boolean(
          pendingIntent && pendingIntent !== "create_client",
        ),
      },
      context,
    );
    return {
      ...base,
      messageCategory: category,
    };
  }

  // NLU multi-intentions: plan ordonné avant exécution.
  const nluMulti = resolveNaturalLanguageIntents(trimmed, context);
  if (nluMulti.length > 1) {
    const [first, ...rest] = nluMulti;
    const pendingIntent = toAssistantIntentFromSession(context.session?.pending_intent);
    const plan = [first, ...rest].map((s, index) => ({
      step: index + 1,
      intent: s.intent,
      module: s.module,
      confidence: s.confidence,
      data: s.data ?? {},
    }));
    return buildActionAnalysis(
      first.intent,
      first.module,
      trimmed,
      first.confidence,
      {
        ...(first.data ?? {}),
        multi_plan: plan,
        multi_plan_total: plan.length,
        reset_previous_workflow: Boolean(
          pendingIntent && pendingIntent !== first.intent,
        ),
      },
      context,
    );
  }

  // NLU verbe->intention prioritaire: comprendre le sens avant mots-clés.
  const nlu = resolveNaturalLanguageIntent(trimmed, context);
  if (nlu) {
    const pendingIntent = toAssistantIntentFromSession(context.session?.pending_intent);
    return buildActionAnalysis(
      nlu.intent,
      nlu.module,
      trimmed,
      nlu.confidence,
      {
        ...(nlu.data ?? {}),
        reset_previous_workflow: Boolean(
          pendingIntent && pendingIntent !== nlu.intent,
        ),
      },
      context,
    );
  }

  const awaiting = resolveAwaitingAnswer(trimmed, context);
  if (awaiting) {
    return { ...awaiting, messageCategory: "reponse_en_cours" };
  }

  const withAi = resolveWithAiRequest(trimmed, context);
  if (withAi) {
    return { ...withAi, messageCategory: category };
  }

  const hasPending =
    Boolean(context.hasPendingAction) ||
    Boolean(context.hasLegacyPending) ||
    Boolean(context.hasPendingIntent);

  if (/^(?:oui|confirme|confirmer|valide|vas[- ]?y|c'?est bon|go)\b/.test(n)) {
    if (hasPending) {
      return buildAnalysis("confirmation", "conversation", "confirm", 0.98, {}, [], {
        messageCategory: "politesse",
        ...analysisOpts,
      });
    }
    return buildAnalysis("confirmation", "conversation", "answer", 0.9, {
      reply: CONFIRM_NO_PENDING_REPLY,
    }, [], { messageCategory: "politesse", ...analysisOpts });
  }

  if (/^(?:annule|annuler|stop)\b/.test(n)) {
    if (hasPending) {
      return buildAnalysis("cancellation", "conversation", "cancel", 0.95, {}, [], {
        messageCategory: "politesse",
        ...analysisOpts,
      });
    }
    return buildAnalysis("cancellation", "conversation", "answer", 0.9, {
      reply: CANCEL_NO_PENDING_REPLY,
    }, [], { messageCategory: "politesse", ...analysisOpts });
  }

  const correction = extractCorrection(trimmed);
  if (correction) {
    return buildAnalysis("correction", "conversation", "ask_question", 0.9, correction, [], {
      messageCategory: "correction",
      ...analysisOpts,
    });
  }

  if (category === "politesse") {
    const conv = matchConversationIntent(trimmed);
    if (conv) {
      return buildAnalysis(conv, "conversation", "answer", 0.97, {}, [], {
        messageCategory: "politesse",
        ...analysisOpts,
      });
    }
  }

  if (category === "hors_sujet") {
    return buildAnalysis("out_of_scope", "conversation", "refuse", 0.95, {}, [], {
      messageCategory: "hors_sujet",
      ...analysisOpts,
    });
  }

  if (category === "question_logiciel") {
    const dataMatch = matchKnowledge(trimmed, { preferActions: false });
    if (dataMatch && dataMatch.confidence >= LOCAL_CONFIDENCE_THRESHOLD) {
      const { entry, confidence } = dataMatch;
      const intent = entry.id as AssistantIntent;
      if (entry.actionType === "answer" || entry.actionType === "refuse") {
        return buildAnalysis(
          intent,
          entry.domain,
          entry.actionType,
          confidence,
          {},
          [],
          {
            creditType: entry.needsAi ? "ai" : "free",
            messageCategory: "question_logiciel",
            ...analysisOpts,
          },
        );
      }
    }
  }

  const actionFirst = detectActionIntent(trimmed, context);
  if (actionFirst) {
    return buildActionAnalysis(
      actionFirst.intent,
      actionFirst.module,
      trimmed,
      actionFirst.confidence,
      {},
      context,
    );
  }

  if (/^(?:non)\b/.test(n)) {
    if (hasPending) {
      return buildAnalysis("cancellation", "conversation", "cancel", 0.9, {}, [], {
        messageCategory: "politesse",
        ...analysisOpts,
      });
    }
    return buildAnalysis("cancellation", "conversation", "answer", 0.88, {
      reply: "D'accord. Que souhaitez-vous modifier ou faire ensuite ?",
    }, [], { messageCategory: "politesse", ...analysisOpts });
  }

  if (context.hasPendingIntent) {
    const slot = parseContinuationSlot(trimmed);
    if (slot) {
      return buildAnalysis("unknown", "session", "ask_question", 0.88, {
        slotField: slot.field,
        slotValue: slot.value,
      }, [], { messageCategory: "reponse_en_cours", ...analysisOpts });
    }

    const contextual = resolveContextualIntent(trimmed, "unknown", context);
    if (contextual.slotFilled && contextual.intent !== "unknown") {
      return buildActionAnalysis(
        contextual.intent,
        getKnowledgeEntry(contextual.intent)?.domain ?? "session",
        trimmed,
        0.9,
        contextual.data,
        context,
      );
    }
  }

  if (/^(?:ok|parfait|nickel|super|compris|tres bien|d'?accord)\s*[!?.]*$/.test(n)) {
    if (hasPending) {
      return buildAnalysis("confirmation", "conversation", "confirm", 0.85, {}, [], {
        messageCategory: "politesse",
        ...analysisOpts,
      });
    }
    return buildAnalysis("ack", "conversation", "answer", 0.9, {
      reply: ACK_REPLY,
    }, [], { messageCategory: "politesse", ...analysisOpts });
  }

  const knowledgeMatch = matchKnowledge(trimmed, {
    preferActions: hasActionVerb(trimmed),
  });
  if (knowledgeMatch && knowledgeMatch.confidence >= LOCAL_CONFIDENCE_THRESHOLD) {
    const { entry, confidence } = knowledgeMatch;
    const intent = entry.id as AssistantIntent;
    const msgCat =
      entry.actionType === "prepare_action" ? "action" : "question_logiciel";

    if (entry.actionType === "prepare_action" && !entry.unavailable) {
      return buildActionAnalysis(intent, entry.domain, trimmed, confidence, {}, context);
    }

    return buildAnalysis(
      intent,
      entry.domain,
      entry.actionType,
      confidence,
      {},
      [],
      {
        creditType: entry.needsAi ? "ai" : "free",
        messageCategory: msgCat,
        ...analysisOpts,
      },
    );
  }

  if (
    n.length < 12 &&
    !/\d/.test(n) &&
    !context.session?.missing_fields?.length &&
    !isAwaitingAnswer(context)
  ) {
    return buildAnalysis("unknown", "core", "ask_question", 0.4, {}, ["clarification"], {
      messageCategory: "incompris",
      ...analysisOpts,
    });
  }

  return buildAnalysis("unknown", "core", "ask_question", 0.35, {}, ["clarification"], {
    needsConfirmation: false,
    messageCategory: "incompris",
    ...analysisOpts,
  });
}

export function isSoftwareAnswerIntent(intent: AssistantIntent): boolean {
  const entry = getKnowledgeEntry(intent);
  if (!entry) return false;
  return (
    entry.actionType === "answer" &&
    entry.domain !== "conversation" &&
    !entry.needsAi
  );
}

export function isActionIntent(intent: AssistantIntent): boolean {
  const entry = getKnowledgeEntry(intent);
  return entry?.actionType === "prepare_action";
}

export function needsAiForIntent(intent: AssistantIntent): boolean {
  return getKnowledgeEntry(intent)?.needsAi === true;
}

export function shouldUseAiFallback(analysis: AssistantAnalysis): boolean {
  return (
    analysis.intent === "unknown" ||
    (analysis.confidence < AI_FALLBACK_CONFIDENCE &&
      analysis.actionType === "ask_question" &&
      analysis.intent !== "correction")
  );
}

export function getIntentRole(intent: AssistantIntent, module: string): AssistantRole {
  return inferRole(intent, module);
}
