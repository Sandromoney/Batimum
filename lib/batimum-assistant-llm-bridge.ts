import {
  buildActionSummary,
  buildPendingActionFromAnalysis,
} from "@/lib/assistant-batimum/assistant-actions";
import { resolveEntitiesWithData } from "@/lib/assistant-batimum/assistant-entity-resolver";
import {
  buildKnowledgeContext,
  resolveKnowledgeAnswer,
} from "@/lib/assistant-batimum/knowledge";
import { isSoftwareAnswerIntent } from "@/lib/assistant-batimum/assistant-router";
import { targetedFieldQuestion } from "@/lib/assistant-batimum/assistant-rules";
import type { AssistantBrainContext } from "@/lib/assistant-batimum/assistant-types";
import {
  buildClarificationQuestion,
  detectOrderedMissingFields,
  refineAssistantUnderstanding,
} from "@/lib/batimum-assistant-brain";
import { logAssistantDebug } from "@/lib/batimum-assistant-debug";
import {
  AI_CREDIT_LABEL,
  LOCAL_CREDIT_LABEL,
} from "@/lib/batimum-assistant-routing";
import type { AssistantPendingAction } from "@/lib/batimum-assistant-orchestrator";
import {
  buildPlanningAssignPendingAction,
  buildPlanningAssignSummary,
  isPlanningAssignAnalysis,
  isPlanningAssignLlmIntent,
  resolvePlanningAssignEntities,
} from "@/lib/batimum-assistant-planning";
import {
  isLlmUnderstandingAcceptable,
  mapLlmToBrainAnalysis,
  mapLlmToAssistantUnderstanding,
  type AssistantLlmUnderstanding,
} from "@/lib/batimum-assistant-understand";
import type {
  AssistantAiData,
  AssistantAiUnderstanding,
  AssistantSessionContext,
  BatimumAssistantIntent,
} from "@/lib/batimum-assistant-types";
import type { AppData } from "@/lib/types";

export type LlmTurnPlan =
  | {
      kind: "clarify";
      reply: string;
      session: AssistantSessionContext;
      creditLabel: string;
    }
  | {
      kind: "confirm";
      reply: string;
      session: AssistantSessionContext;
      pendingAction?: AssistantPendingAction;
      creditLabel: string;
      analysisIntent?: string;
    }
  | {
      kind: "answer";
      reply: string;
      navigateTo?: string;
      creditLabel: string;
    }
  | {
      kind: "reject";
      reply: string;
      creditLabel: string;
    };

function sessionPatchFromLlm(
  understanding: AssistantAiUnderstanding,
  session: AssistantSessionContext,
): AssistantSessionContext {
  const hasPending = understanding.missing_fields.length > 0;
  return {
    ...session,
    pending_intent: hasPending ? understanding.intent : undefined,
    pending_data: hasPending ? understanding.data : undefined,
    missing_fields: hasPending ? understanding.missing_fields : undefined,
    awaiting_answer: hasPending,
    disambiguation_candidates: hasPending
      ? session.disambiguation_candidates
      : undefined,
    last_client_name:
      understanding.data.client ??
      understanding.data.nom ??
      session.last_client_name,
  };
}

function planPlanningAssignFromLlm(
  llm: AssistantLlmUnderstanding,
  brainAnalysis: ReturnType<typeof mapLlmToBrainAnalysis>,
  data: AppData,
  session: AssistantSessionContext,
  creditLabel: string,
): LlmTurnPlan {
  const resolved = resolvePlanningAssignEntities(
    brainAnalysis.data as AssistantAiData,
    data,
  );

  logAssistantDebug("planning_assign_llm", {
    mode: "assistant_openai",
    intent: llm.intent,
    entities: llm.entities,
    resolvedStatus: resolved.status,
    fallback: false,
  });

  if (resolved.status === "chantier_disambiguation") {
    return {
      kind: "clarify",
      reply: llm.questionToAsk ?? resolved.message,
      session: {
        ...session,
        pending_data: resolved.data,
        missing_fields: ["chantier_pick"],
        disambiguation_candidates: resolved.candidates,
        awaiting_answer: true,
      },
      creditLabel,
    };
  }

  if (resolved.status !== "ok") {
    return {
      kind: "clarify",
      reply: llm.questionToAsk ?? resolved.message,
      session: {
        ...session,
        pending_data: resolved.data,
        awaiting_answer: true,
      },
      creditLabel,
    };
  }

  const summary =
    llm.summaryForUser ?? buildPlanningAssignSummary(resolved.data);

  return {
    kind: "confirm",
    reply: `${summary}\n\nConfirmez-vous ?`,
    session: {
      ...session,
      pending_data: resolved.data,
      missing_fields: undefined,
      awaiting_answer: false,
    },
    pendingAction: buildPlanningAssignPendingAction(resolved.data, llm.confidence),
    creditLabel,
    analysisIntent: "assign_employee",
  };
}

export function planTurnFromLlmUnderstanding(
  llm: AssistantLlmUnderstanding,
  message: string,
  data: AppData,
  session: AssistantSessionContext,
  context: AssistantBrainContext = {},
  creditLabel = AI_CREDIT_LABEL,
): LlmTurnPlan {
  logAssistantDebug("llm_plan_start", {
    mode: "assistant_openai",
    message,
    llmIntent: llm.intent,
    confidence: llm.confidence,
    entities: llm.entities,
    actionType: llm.actionType,
    missingFields: llm.missingFields,
  });

  if (!isLlmUnderstandingAcceptable(llm.confidence)) {
    logAssistantDebug("llm_plan_fallback", {
      reason: "confidence_below_threshold",
      confidence: llm.confidence,
      fallback: true,
    });
    const field = llm.missingFields[0];
    const reply =
      llm.questionToAsk ??
      (field
        ? targetedFieldQuestion(mapLlmToBrainAnalysis(llm, session).intent, field, {})
        : "Je n'ai pas suffisamment compris votre demande. Pouvez-vous préciser ?");
    return {
      kind: "reject",
      reply,
      creditLabel: LOCAL_CREDIT_LABEL,
    };
  }

  const brainAnalysis = resolveEntitiesWithData(
    mapLlmToBrainAnalysis(llm, session),
    data,
    { ...context, session },
  );

  if (llm.intent === "correction" || brainAnalysis.intent === "correction") {
    return {
      kind: "clarify",
      reply:
        llm.questionToAsk ??
        "D'accord, je corrige. Pouvez-vous préciser le bon élément ?",
      session: {
        ...session,
        awaiting_answer: true,
      },
      creditLabel,
    };
  }

  if (isPlanningAssignLlmIntent(llm.intent) || isPlanningAssignAnalysis(brainAnalysis)) {
    return planPlanningAssignFromLlm(llm, brainAnalysis, data, session, creditLabel);
  }

  const isAnswer =
    llm.actionType === "answer" ||
    brainAnalysis.actionType === "answer" ||
    isSoftwareAnswerIntent(brainAnalysis.intent);

  if (isAnswer) {
    const ctx = buildKnowledgeContext(message, data, new Date(), {
      ...context,
      session,
    });
    const answer = resolveKnowledgeAnswer(brainAnalysis.intent, ctx);
    if (!answer?.text && !llm.summaryForUser) {
      logAssistantDebug("llm_plan_fallback", {
        reason: "generic_knowledge_miss",
        intent: brainAnalysis.intent,
        fallback: true,
      });
    }
    return {
      kind: "answer",
      reply:
        llm.summaryForUser ??
        answer?.text ??
        llm.questionToAsk ??
        "Je n'ai pas identifié précisément votre demande. Pouvez-vous reformuler ?",
      navigateTo: answer?.navigateTo,
      creditLabel,
    };
  }

  const apiUnderstanding = mapLlmToAssistantUnderstanding(llm);
  const refined = refineAssistantUnderstanding(apiUnderstanding, data);
  const understanding = refined.understanding;

  if (refined.disambiguation?.candidates.length) {
    return {
      kind: "clarify",
      reply:
        understanding.clarification_question ??
        "J'ai trouvé plusieurs clients. Lequel souhaitez-vous utiliser ?",
      session: {
        ...sessionPatchFromLlm(understanding, session),
        disambiguation_candidates: refined.disambiguation.candidates,
      },
      creditLabel,
    };
  }

  if (understanding.missing_fields.length > 0) {
    const field = understanding.missing_fields[0];
    const reply =
      llm.questionToAsk ??
      understanding.clarification_question ??
      buildClarificationQuestion(
        understanding.intent,
        field,
        understanding.data,
      );
    return {
      kind: "clarify",
      reply,
      session: sessionPatchFromLlm(understanding, session),
      creditLabel,
    };
  }

  const summary =
    llm.summaryForUser ??
    (typeof brainAnalysis.data.summary_for_user === "string"
      ? brainAnalysis.data.summary_for_user
      : buildActionSummary(brainAnalysis.intent, brainAnalysis.data));

  const apiIntent = understanding.intent;
  const orderedMissing = detectOrderedMissingFields(apiIntent, understanding.data);
  if (orderedMissing.length > 0) {
    return {
      kind: "clarify",
      reply:
        llm.questionToAsk ??
        buildClarificationQuestion(apiIntent, orderedMissing[0], understanding.data),
      session: sessionPatchFromLlm(
        { ...understanding, missing_fields: orderedMissing },
        session,
      ),
      creditLabel,
    };
  }

  const pendingFromBrain = buildPendingActionFromAnalysis(
    brainAnalysis.intent,
    brainAnalysis.data,
    brainAnalysis.confidence,
  );

  return {
    kind: "confirm",
    reply: `${summary}\n\nConfirmez-vous ?`,
    session: {
      ...session,
      pending_intent: apiIntent as BatimumAssistantIntent,
      pending_data: understanding.data,
      missing_fields: undefined,
      awaiting_answer: false,
    },
    pendingAction: pendingFromBrain ?? undefined,
    creditLabel,
    analysisIntent: brainAnalysis.intent,
  };
}
