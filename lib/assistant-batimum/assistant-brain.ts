import {
  analyzeAssistantMessage,
  isActionIntent,
  needsAiForIntent,
} from "@/lib/assistant-batimum/assistant-router";
import {
  buildActionSummary,
  buildPendingActionFromAnalysis,
} from "@/lib/assistant-batimum/assistant-actions";
import {
  ACK_REPLY,
  CANCEL_NO_PENDING_REPLY,
  CONFIRM_NO_PENDING_REPLY,
} from "@/lib/assistant-batimum/conversation";
import {
  buildKnowledgeContext,
  resolveKnowledgeAnswer,
} from "@/lib/assistant-batimum/knowledge";
import { answerFromKnowledgeEngine } from "@/lib/assistant-batimum/knowledge-engine";
import { getKnowledgeEntry } from "@/lib/assistant-batimum/knowledge/registry";
import { topicFromAnswerIntent } from "@/lib/assistant-batimum/assistant-action-detector";
import {
  CAREFUL_REPLY,
  targetedFieldQuestion,
  isConversationIntent,
  appendFollowUp,
} from "@/lib/assistant-batimum/assistant-rules";
import { renderIntentResponse } from "@/lib/assistant-batimum/response-engine";
import { resolveEntitiesWithData } from "@/lib/assistant-batimum/assistant-entity-resolver";
import type {
  AssistantBrainContext,
  AssistantBrainResult,
  AssistantAnalysis,
  AssistantIntent,
} from "@/lib/assistant-batimum/assistant-types";
import {
  AI_CREDIT_LABEL,
  LOCAL_CREDIT_LABEL,
} from "@/lib/batimum-assistant-routing";
import { logAssistantDebug } from "@/lib/batimum-assistant-debug";
import {
  V1_MULTI_ACTION_REPLY,
  v1UnavailableActionReply,
  isV1BrainIntentAllowed,
} from "@/lib/assistant-batimum/v1-charter";
import {
  buildPlanningAssignPendingAction,
  buildPlanningAssignSummary,
  isPlanningAssignAnalysis,
  resolvePlanningAssignEntities,
} from "@/lib/batimum-assistant-planning";
import { processChatMessage } from "@/lib/batimum-chatbot";
import type { AppData } from "@/lib/types";
import type {
  AssistantAiData,
  AssistantSessionContext,
  BatimumAssistantIntent,
} from "@/lib/batimum-assistant-types";

function handlePlanningAssignTurn(
  analysis: AssistantAnalysis,
  data: AppData,
  context: AssistantBrainContext,
): AssistantBrainResult | null {
  if (!isPlanningAssignAnalysis(analysis)) return null;

  const resolved = resolvePlanningAssignEntities(
    analysis.data as AssistantAiData,
    data,
  );

  logAssistantDebug("planning_assign_local", {
    mode: "local",
    intent: analysis.intent,
    operation: "assign_employee",
    entities: resolved.data,
    status: resolved.status,
    fallback: false,
  });

  if (resolved.status === "chantier_disambiguation") {
    return {
      handled: true,
      reply: resolved.message,
      creditLabel: LOCAL_CREDIT_LABEL,
      analysis: {
        ...analysis,
        data: resolved.data,
        actionType: "ask_question",
        missingFields: ["chantier_pick"],
      },
      sessionPatch: {
        pending_intent: undefined,
        pending_data: resolved.data,
        missing_fields: ["chantier_pick"],
        disambiguation_candidates: resolved.candidates,
        awaiting_answer: true,
      },
    };
  }

  if (resolved.status !== "ok") {
    return {
      handled: true,
      reply: resolved.message,
      creditLabel: LOCAL_CREDIT_LABEL,
      analysis: {
        ...analysis,
        data: resolved.data,
        actionType: "ask_question",
        missingFields: [
          resolved.status === "missing_employe"
            ? "employe"
            : resolved.status === "missing_chantier"
              ? "chantier"
              : "clarification",
        ],
      },
      sessionPatch: sessionPatchFromAnalysis({
        ...analysis,
        data: resolved.data,
        actionType: "ask_question",
        missingFields: ["employe"],
      }),
    };
  }

  const summary = buildPlanningAssignSummary(resolved.data);
  return {
    handled: true,
    reply: `${summary}\n\nConfirmez-vous ?`,
    pendingAction: buildPlanningAssignPendingAction(resolved.data, analysis.confidence),
    creditLabel: LOCAL_CREDIT_LABEL,
    analysis: {
      ...analysis,
      data: resolved.data,
      actionType: "prepare_action",
      missingFields: [],
      needsConfirmation: true,
    },
    sessionPatch: sessionPatchFromAnalysis({
      ...analysis,
      data: resolved.data,
      actionType: "prepare_action",
      missingFields: [],
      needsConfirmation: true,
    }),
  };
}

const INTENT_TO_SESSION: Partial<Record<string, BatimumAssistantIntent>> = {
  create_client: "create_client",
  create_devis: "create_quote",
  create_chantier: "create_chantier",
  create_facture: "create_invoice",
  create_rendez_vous: "create_appointment",
  search_client: "search_client",
};

type ConfidencePolicy =
  | "direct_action"
  | "action_with_confirmation"
  | "targeted_question"
  | "precision_request"
  | "reformulation";

const CONFIDENCE_THRESHOLDS = {
  direct: 0.99,
  confirm: 0.95,
  targeted: 0.85,
  precision: 0.7,
} as const;

function confidencePolicy(score: number): ConfidencePolicy {
  if (score >= CONFIDENCE_THRESHOLDS.direct) return "direct_action";
  if (score >= CONFIDENCE_THRESHOLDS.confirm) return "action_with_confirmation";
  if (score >= CONFIDENCE_THRESHOLDS.targeted) return "targeted_question";
  if (score >= CONFIDENCE_THRESHOLDS.precision) return "precision_request";
  return "reformulation";
}

function targetedClarification(analysis: AssistantAnalysis): string {
  const field = analysis.missingFields[0];
  if (field) {
    return targetedFieldQuestion(analysis.intent, field, analysis.data);
  }
  if (analysis.intent === "unknown") {
    return "Je n'ai pas identifié votre demande. Que souhaitez-vous faire ? Par exemple : créer un client, voir vos devis, ou analyser votre activité.";
  }
  return CAREFUL_REPLY;
}

function contextualizedClarification(analysis: AssistantAnalysis): string {
  const base = targetedClarification(analysis);
  const d = analysis.data as Record<string, unknown>;
  const employe = String(d.employe ?? "").trim();
  const chantier = String(d.chantier ?? "").trim();
  const client = String(d.client ?? d.nom ?? "").trim();
  const dateDebut = String(d.date_debut ?? "").trim();
  const dateFin = String(d.date_fin ?? "").trim();
  const date = String(d.date ?? "").trim();
  const heure = String(d.heure ?? "").trim();

  const ctx: string[] = [];
  if (employe) ctx.push(`employé: ${employe}`);
  if (chantier) ctx.push(`chantier: ${chantier}`);
  if (client) ctx.push(`client: ${client}`);
  if (dateDebut && dateFin) ctx.push(`période: ${dateDebut} -> ${dateFin}`);
  else if (date) ctx.push(`date: ${date}`);
  if (heure) ctx.push(`heure: ${heure}`);

  if (ctx.length === 0) return base;
  return `J'ai déjà compris ${ctx.join(", ")}.\n${base}`;
}

function renderMultiPlan(analysis: AssistantAnalysis): string | null {
  const raw = (analysis.data as Record<string, unknown>).multi_plan;
  if (!Array.isArray(raw) || raw.length <= 1) return null;
  return V1_MULTI_ACTION_REPLY;
}

function sessionPatchFromAnalysis(
  analysis: AssistantAnalysis,
  reply?: string,
): Partial<AssistantSessionContext> | undefined {
  const patch: Partial<AssistantSessionContext> = {};
  const topic = topicFromAnswerIntent(analysis.intent);
  if (topic) patch.last_topic = topic;

  const sessionIntent = (INTENT_TO_SESSION[analysis.intent] ??
    analysis.intent) as BatimumAssistantIntent;
  const mustResetWorkflow = Boolean(
    (analysis.data as Record<string, unknown>)?.reset_previous_workflow,
  );

  if (mustResetWorkflow) {
    patch.pending_intent = undefined;
    patch.pending_data = undefined;
    patch.missing_fields = undefined;
    patch.awaiting_answer = false;
    patch.disambiguation_candidates = undefined;
  }

  if (analysis.actionType === "ask_question" && analysis.missingFields.length > 0) {
    patch.pending_intent = sessionIntent;
    patch.pending_data = analysis.data as AssistantAiData;
    patch.missing_fields = analysis.missingFields;
    patch.awaiting_answer = true;
    if (reply) {
      patch.recent_messages = [
        ...(patch.recent_messages ?? []),
      ];
    }
  }

  if (analysis.actionType === "prepare_action" && analysis.needsConfirmation) {
    patch.pending_intent = sessionIntent;
    patch.pending_data = analysis.data as AssistantAiData;
    patch.missing_fields = undefined;
    patch.awaiting_answer = false;
  }

  if (analysis.actionType === "confirm" || analysis.actionType === "cancel") {
    patch.awaiting_answer = false;
    patch.pending_intent = undefined;
    patch.pending_data = undefined;
    patch.missing_fields = undefined;
  }

  return Object.keys(patch).length > 0 ? patch : undefined;
}

function knowledgeReply(
  intent: string,
  message: string,
  data: AppData,
  context: AssistantBrainContext,
  referenceDate: Date,
) {
  const ctx = buildKnowledgeContext(message, data, referenceDate, context);
  return resolveKnowledgeAnswer(intent, ctx);
}

function buildConfirmationTurn(
  analysis: AssistantAnalysis,
  context: AssistantBrainContext,
): AssistantBrainResult {
  const summary = buildActionSummary(analysis.intent, analysis.data as AssistantAiData);
  const pendingAction = buildPendingActionFromAnalysis(
    analysis.intent,
    analysis.data as AssistantAiData,
    analysis.confidence,
  );

  return {
    handled: true,
    reply: summary,
    pendingAction: pendingAction ?? undefined,
    creditLabel: LOCAL_CREDIT_LABEL,
    analysis,
    sessionPatch: sessionPatchFromAnalysis(analysis),
  };
}

/**
 * Cerveau central — comprendre → rôle → module → données → manquants → question → résumé → confirmation.
 */
export function processAssistantBrainTurn(
  message: string,
  data: AppData,
  context: AssistantBrainContext = {},
  referenceDate = new Date(),
): AssistantBrainResult {
  const initialAnalysis = analyzeAssistantMessage(message, context);
  const analysis = resolveEntitiesWithData(initialAnalysis, data, context);
  const creditLabel =
    analysis.creditType === "ai" ? AI_CREDIT_LABEL : LOCAL_CREDIT_LABEL;
  const suggestions: string[] = [];

  const operation = String((analysis.data as Record<string, unknown>).operation ?? "");
  const isV1Assign =
    analysis.intent === "modify_data" && operation === "assign_employee";
  if (
    isActionIntent(analysis.intent) &&
    !isConversationIntent(analysis.intent) &&
    !isV1BrainIntentAllowed(analysis.intent) &&
    !isV1Assign
  ) {
    return {
      handled: true,
      reply: v1UnavailableActionReply(analysis.intent),
      creditLabel: LOCAL_CREDIT_LABEL,
      analysis,
    };
  }

  if (analysis.intent === "confirmation" && analysis.actionType === "confirm") {
    return {
      handled: true,
      reply: "",
      confirmAction: true,
      creditLabel: LOCAL_CREDIT_LABEL,
      analysis,
      sessionPatch: sessionPatchFromAnalysis(analysis),
    };
  }

  if (analysis.intent === "cancellation" && analysis.actionType === "cancel") {
    return {
      handled: true,
      reply: "D'accord, j'annule cette action.",
      cancelAction: true,
      creditLabel: LOCAL_CREDIT_LABEL,
      analysis,
      sessionPatch: sessionPatchFromAnalysis(analysis),
    };
  }

  if (analysis.intent === "correction") {
    const correction = analysis.data;
    return {
      handled: true,
      reply: "",
      correction: {
        nom: correction.nom as string | undefined,
        client: (correction.client ?? correction.nom) as string | undefined,
        date: correction.date as string | undefined,
        heure: correction.heure as string | undefined,
      },
      creditLabel: LOCAL_CREDIT_LABEL,
      analysis,
    };
  }

  if (analysis.data.slotField && analysis.data.slotValue) {
    return {
      handled: false,
      reply: "",
      analysis,
      sessionPatch: {
        pending_data: {
          ...(context.session?.pending_data ?? {}),
          [String(analysis.data.slotField)]: analysis.data.slotValue,
        },
      },
    };
  }

  const multiPlan = renderMultiPlan(analysis);
  if (multiPlan) {
    const firstSummary = buildActionSummary(analysis.intent, analysis.data as AssistantAiData);
    const pendingAction = buildPendingActionFromAnalysis(
      analysis.intent,
      analysis.data as AssistantAiData,
      analysis.confidence,
    );
    return {
      handled: true,
      reply: `${multiPlan}\n\nJe propose de commencer par l'étape 1.\n${firstSummary}`,
      pendingAction: pendingAction ?? undefined,
      creditLabel: LOCAL_CREDIT_LABEL,
      analysis,
      sessionPatch: sessionPatchFromAnalysis(analysis),
    };
  }

  if (
    (analysis.data as Record<string, unknown>)?.reset_previous_workflow === true &&
    analysis.intent === "create_client" &&
    analysis.actionType === "ask_question" &&
    analysis.missingFields.includes("nom")
  ) {
    return {
      handled: true,
      reply:
        "J'annule la préparation précédente et je démarre la création d'un client.\nBien sûr. Quel est le nom du client à créer ?",
      creditLabel: LOCAL_CREDIT_LABEL,
      analysis,
      sessionPatch: sessionPatchFromAnalysis(analysis),
    };
  }

  const inlineReply = analysis.data.reply;
  if (typeof inlineReply === "string") {
    const navigateTo =
      analysis.data.navigate_mum_ia === true ? "/devis" : undefined;
    return {
      handled: true,
      reply: inlineReply,
      navigateTo,
      creditLabel: analysis.creditType === "ai" ? AI_CREDIT_LABEL : LOCAL_CREDIT_LABEL,
      analysis,
      sessionPatch: sessionPatchFromAnalysis(analysis),
    };
  }

  const planningAssign = handlePlanningAssignTurn(analysis, data, context);
  if (planningAssign) {
    return planningAssign;
  }

  const knowledgeEngineAnswer = answerFromKnowledgeEngine(
    message,
    analysis,
    data,
    context,
  );
  if (knowledgeEngineAnswer) {
    return {
      handled: true,
      reply: knowledgeEngineAnswer.text,
      navigateTo: knowledgeEngineAnswer.navigateTo,
      creditLabel: LOCAL_CREDIT_LABEL,
      analysis,
      sessionPatch: sessionPatchFromAnalysis(analysis),
    };
  }

  if (
    analysis.intent === "confirmation" ||
    (analysis.intent === "cancellation" && analysis.actionType === "answer")
  ) {
    return {
      handled: true,
      reply:
        typeof inlineReply === "string"
          ? inlineReply
          : analysis.intent === "confirmation"
            ? CONFIRM_NO_PENDING_REPLY
            : CANCEL_NO_PENDING_REPLY,
      creditLabel: LOCAL_CREDIT_LABEL,
      analysis,
    };
  }

  // Gating confiance (politique immuable): 99/95/85/70/<70.
  if (
    isActionIntent(analysis.intent) &&
    (analysis.actionType === "prepare_action" || analysis.actionType === "ask_question")
  ) {
    const policy = confidencePolicy(analysis.confidence);
    if (policy === "reformulation") {
      return {
        handled: true,
        reply:
          "Je ne suis pas encore assez certain de votre demande. Pouvez-vous reformuler en précisant l'action souhaitée ?",
        creditLabel: LOCAL_CREDIT_LABEL,
        analysis,
      };
    }
    if (policy === "precision_request" && analysis.missingFields.length === 0) {
      return {
        handled: true,
        reply:
          "J'ai besoin d'une précision pour éviter une erreur. Quelle action souhaitez-vous exactement réaliser ?",
        creditLabel: LOCAL_CREDIT_LABEL,
        analysis,
      };
    }
    if (
      policy === "targeted_question" &&
      analysis.actionType === "prepare_action" &&
      analysis.missingFields.length === 0
    ) {
      const askAnalysis: AssistantAnalysis = {
        ...analysis,
        actionType: "ask_question",
        missingFields: ["clarification"],
      };
      return {
        handled: true,
        reply: contextualizedClarification(askAnalysis),
        creditLabel: LOCAL_CREDIT_LABEL,
        analysis,
        sessionPatch: sessionPatchFromAnalysis(askAnalysis),
      };
    }
    if (
      policy === "action_with_confirmation" &&
      analysis.actionType === "prepare_action" &&
      analysis.missingFields.length === 0
    ) {
      const summary = buildActionSummary(analysis.intent, analysis.data as AssistantAiData);
      return {
        handled: true,
        reply: `${summary}\n\nJe préfère vérifier avant d'agir. Confirmez-vous ?`,
        creditLabel: LOCAL_CREDIT_LABEL,
        analysis,
        sessionPatch: sessionPatchFromAnalysis(analysis),
      };
    }
  }

  if (
    isActionIntent(analysis.intent) &&
    analysis.actionType === "prepare_action" &&
    analysis.needsConfirmation
  ) {
    return buildConfirmationTurn(analysis, context);
  }

  if (analysis.actionType === "ask_question" && analysis.missingFields.length > 0) {
    const clarification =
      typeof analysis.data.clarification === "string"
        ? analysis.data.clarification
        : contextualizedClarification(analysis);
    const warnings = analysis.data.warnings as string[] | undefined;
    const warningText = warnings?.length ? `\n\n${warnings[0]}` : "";

    return {
      handled: true,
      reply: `${clarification}${warningText}`,
      creditLabel: LOCAL_CREDIT_LABEL,
      analysis,
      sessionPatch: sessionPatchFromAnalysis(analysis, clarification),
    };
  }

  const entry = getKnowledgeEntry(analysis.intent);
  if (
    entry &&
    (entry.actionType === "answer" || entry.actionType === "refuse")
  ) {
    const answer = knowledgeReply(
      analysis.intent,
      message,
      data,
      context,
      referenceDate,
    );
    if (answer) {
      let text = answer.text;
      if (isConversationIntent(analysis.intent as AssistantIntent)) {
        const variant = renderIntentResponse(
          analysis.intent as AssistantIntent,
          message,
        );
        if (variant) text = variant;
      }
      text = appendFollowUp(analysis.intent as AssistantIntent, text);
      const isConv = isConversationIntent(analysis.intent as AssistantIntent);
      return {
        handled: true,
        reply: text,
        suggestions: isConv ? undefined : undefined,
        navigateTo: answer.navigateTo,
        creditLabel: LOCAL_CREDIT_LABEL,
        analysis,
        sessionPatch: sessionPatchFromAnalysis(analysis),
      };
    }
  }

  if (
    isActionIntent(analysis.intent) &&
    analysis.actionType === "prepare_action" &&
    analysis.needsConfirmation &&
    analysis.intent === "create_employe"
  ) {
    return {
      handled: true,
      reply:
        `J'ai noté l'employé « ${analysis.data.nom} ». La création d'employé n'est pas encore disponible depuis l'assistant, mais elle pourra être ajoutée prochainement.`,
      creditLabel: LOCAL_CREDIT_LABEL,
      analysis,
    };
  }

  if (isActionIntent(analysis.intent) && analysis.actionType === "prepare_action") {
    if (entry?.unavailable) {
      return {
        handled: true,
        reply:
          entry.unavailableReply ??
          "Cette action n'est pas encore disponible via l'assistant.",
        creditLabel: LOCAL_CREDIT_LABEL,
        analysis,
      };
    }

    if (needsAiForIntent(analysis.intent)) {
      return {
        handled: false,
        needsApi: true,
        reply: "",
        creditLabel: AI_CREDIT_LABEL,
        analysis,
      };
    }

    const legacy = processChatMessage(message, data, referenceDate, {
      skipBrain: true,
    });
    if (legacy.pendingConfirmation) {
      return {
        handled: true,
        reply: legacy.reply,
        pendingConfirmation: legacy.pendingConfirmation,
        navigateTo: legacy.navigateTo,
        creditLabel: LOCAL_CREDIT_LABEL,
        analysis,
      };
    }
    if (legacy.reply && !legacy.reply.includes("n'ai pas suffisamment compris")) {
      return {
        handled: true,
        reply: legacy.reply,
        suggestions: legacy.suggestions,
        navigateTo: legacy.navigateTo,
        creditLabel: LOCAL_CREDIT_LABEL,
        analysis,
      };
    }
  }

  if (analysis.intent === "ack") {
    return {
      handled: true,
      reply: renderIntentResponse("ack", message) ?? ACK_REPLY,
      creditLabel: LOCAL_CREDIT_LABEL,
      analysis,
    };
  }

  if (analysis.intent === "unknown") {
    const n = message.toLowerCase();
    const softwareRetry = [
      /client/,
      /devis/,
      /facture/,
      /chantier/,
      /ca\b/,
      /gagn/,
      /impay/,
      /relanc/,
      /retard/,
      /rentab/,
      /employ/,
      /salari/,
      /tva/,
      /marge/,
      /debours/,
    ];
    if (
      analysis.confidence < CONFIDENCE_THRESHOLDS.confirm &&
      softwareRetry.some((p) => p.test(n))
    ) {
      return {
        handled: false,
        needsApi: true,
        reply: "",
        creditLabel: AI_CREDIT_LABEL,
        analysis,
      };
    }
    if (softwareRetry.some((p) => p.test(n))) {
      return {
        handled: true,
        reply:
          "Je n'ai pas identifié précisément votre demande. Pouvez-vous reformuler ? Par exemple : « combien de clients », « devis à relancer », « factures impayées ».",
        creditLabel: LOCAL_CREDIT_LABEL,
        suggestions,
        analysis,
      };
    }

    if (analysis.confidence < CONFIDENCE_THRESHOLDS.confirm) {
      return {
        handled: false,
        needsApi: true,
        reply: "",
        creditLabel: AI_CREDIT_LABEL,
        analysis,
      };
    }

    return {
      handled: true,
      reply: targetedClarification(analysis),
      suggestions,
      creditLabel: LOCAL_CREDIT_LABEL,
      analysis,
    };
  }

  if (analysis.confidence < CONFIDENCE_THRESHOLDS.confirm) {
    return {
      handled: false,
      needsApi: true,
      reply: "",
      creditLabel: AI_CREDIT_LABEL,
      analysis,
    };
  }

  return {
    handled: false,
    needsApi: true,
    reply: "",
    creditLabel: AI_CREDIT_LABEL,
    analysis,
  };
}

export { analyzeAssistantMessage } from "@/lib/assistant-batimum/assistant-router";
export { answerSoftwareQuestion } from "@/lib/assistant-batimum/software-answers";
