/**
 * Pipeline cognitif Batimum — ordre IMMUTABLE.
 * observation -> comprehension -> memory -> context -> reasoning -> planning
 * -> security -> tools -> verification -> response
 */
import type { AppData } from "@/lib/types";
import type {
  AssistantBrainContext,
  AssistantBrainResult,
} from "@/lib/assistant-batimum/assistant-types";
import { classifyMessageCategory } from "@/lib/assistant-batimum/assistant-rules";
import { mergeMemoryWithSession } from "@/lib/assistant-batimum/assistant-memory";
import { processAssistantBrainTurn } from "@/lib/assistant-batimum/assistant-brain";
import { buildReasoningTrace } from "@/lib/assistant-batimum/reasoning-engine";
import { buildDecisionOutcome } from "@/lib/assistant-batimum/decision-engine";
import { finalizeConversationReply } from "@/lib/assistant-batimum/conversation-engine";
import { buildCopilotRecommendation } from "@/lib/assistant-batimum/copilot-engine";

export type CopilotStep =
  | "observation"
  | "comprehension"
  | "intent"
  | "entities"
  | "memory"
  | "context"
  | "reasoning"
  | "planning"
  | "security"
  | "tools"
  | "verification"
  | "understand"
  | "data"
  | "missing"
  | "respond"
  | "confirm"
  | "execute";

export type CopilotTurnMeta = {
  /** Étapes réellement franchies (subset de COGNITIVE_ORDER). */
  stepsCompleted: CopilotStep[];
  /** Trace complète du pipeline cognitif attendu (ordre immuable). */
  expectedOrder: readonly CopilotStep[];
  messageCategory: ReturnType<typeof classifyMessageCategory>;
  usedHistory: boolean;
  formulationCount?: number;
  plan?: {
    intent?: string;
    confidence?: number;
    entities?: string[];
    missing?: string[];
  };
  security?: {
    confirmationRequired: boolean;
    confirmed: boolean;
  };
  verification?: {
    checked: boolean;
    success?: boolean;
  };
  confidencePolicy?: "direct_action" | "action_with_confirmation" | "targeted_question" | "precision_request" | "reformulation";
  executionBlocked?: boolean;
  executionBlockReason?: string;
  reasoning?: ReturnType<typeof buildReasoningTrace>;
  decision?: ReturnType<typeof buildDecisionOutcome>;
  recommendation?: ReturnType<typeof buildCopilotRecommendation>;
};

export const COGNITIVE_ORDER: readonly CopilotStep[] = [
  "observation",
  "comprehension",
  "intent",
  "entities",
  "memory",
  "context",
  "reasoning",
  "planning",
  "security",
  "tools",
  "verification",
  "respond",
];

function getConfidencePolicy(score: number) {
  if (score >= 0.99) return "direct_action" as const;
  if (score >= 0.95) return "action_with_confirmation" as const;
  if (score >= 0.85) return "targeted_question" as const;
  if (score >= 0.7) return "precision_request" as const;
  return "reformulation" as const;
}

function getExecutionBlockReply(
  reason: string | undefined,
  reasoning: ReturnType<typeof buildReasoningTrace>,
  decision?: ReturnType<typeof buildDecisionOutcome>,
): string {
  if (reason === "no_intent") {
    return "Je ne peux pas exécuter cette action pour l'instant, car l'intention n'est pas suffisamment claire. Pouvez-vous reformuler en précisant l'action à réaliser ?";
  }
  if (reason === "missing_fields") {
    return "Je ne peux pas exécuter cette action car il manque encore des informations essentielles. Pouvez-vous compléter les éléments manquants ?";
  }
  if (reason === "confidence_below_security_threshold") {
    return "Je préfère sécuriser cette action: mon niveau de certitude est encore insuffisant. Pouvez-vous confirmer avec plus de précision ?";
  }
  if (reason === "reasoning_verification_failed") {
    const failed = reasoning.verification.checks.find((c) => !c.ok);
    const detail = failed?.detail;
    if (detail === "chantier_terminated") {
      return "Impossible d'exécuter cette action: le chantier est déjà terminé.";
    }
    if (detail === "employee_planning_conflict") {
      const options = decision?.alternatives?.length
        ? `\nJe peux vous proposer :\n• ${decision.alternatives.join("\n• ")}`
        : "";
      return `Impossible d'exécuter cette action: cet employé est déjà planifié sur la période demandée.${options}`;
    }
    if (detail === "employe_declared_on_vacation") {
      return "Impossible d'exécuter cette action: cet employé est indiqué en congé sur cette période.";
    }
    if (detail === "employe_not_found") {
      return "Je ne retrouve pas cet employé dans Batimum. Pouvez-vous confirmer son nom ?";
    }
    if (detail === "chantier_not_found") {
      return "Je ne retrouve pas ce chantier dans Batimum. Pouvez-vous confirmer son nom ?";
    }
    if (detail === "confidence_too_low_for_execution") {
      return "Je bloque l'action pour sécurité: la confiance est encore insuffisante pour exécuter sans risque.";
    }
  }
  return "Je bloque l'exécution pour sécurité. Pouvez-vous préciser votre demande ?";
}

export function buildCopilotContext(
  message: string,
  data: AppData,
  context: AssistantBrainContext = {},
): AssistantBrainContext {
  const memory = mergeMemoryWithSession(context.session, context.memory);
  const recent = memory.history.slice(-20);

  return {
    ...context,
    memory,
    session: {
      ...context.session,
      recent_messages: [
        ...(context.session?.recent_messages ?? []),
        ...recent.map((m) => ({ role: m.role, content: m.content })),
      ].slice(-20),
    },
  };
}

export function processCopilotTurn(
  message: string,
  data: AppData,
  context: AssistantBrainContext = {},
  referenceDate = new Date(),
): AssistantBrainResult & { copilot?: CopilotTurnMeta } {
  const enrichedContext = buildCopilotContext(message, data, context);
  const category = classifyMessageCategory(message, enrichedContext);
  const usedHistory = Boolean(enrichedContext.session?.recent_messages?.length);

  const stepsCompleted: CopilotStep[] = [
    "observation",
    "comprehension",
    "intent",
    "entities",
    "memory",
    "context",
    "reasoning",
    "planning",
    "security",
  ];

  const result = processAssistantBrainTurn(
    message,
    data,
    enrichedContext,
    referenceDate,
  );

  const policy = getConfidencePolicy(result.analysis?.confidence ?? 0);
  const reasoning = buildReasoningTrace(result.analysis, enrichedContext, data);
  const decision = buildDecisionOutcome(result.analysis, reasoning);
  const recommendation = buildCopilotRecommendation(data, enrichedContext, result.analysis);
  let executionBlocked = false;
  let executionBlockReason: string | undefined;

  if (result.confirmAction) {
    const hasIntent = Boolean(result.analysis?.intent && result.analysis.intent !== "unknown");
    const hasMissing = Boolean(result.analysis?.missingFields?.length);
    const score = result.analysis?.confidence ?? 0;
    if (!hasIntent) {
      executionBlocked = true;
      executionBlockReason = "no_intent";
    } else if (hasMissing) {
      executionBlocked = true;
      executionBlockReason = "missing_fields";
    } else if (score < 0.95) {
      executionBlocked = true;
      executionBlockReason = "confidence_below_security_threshold";
    } else if (!reasoning.verification.allPassed || !decision.readyToExecute) {
      executionBlocked = true;
      executionBlockReason = "reasoning_verification_failed";
    }
  }

  if (executionBlocked) {
    result.confirmAction = false;
    result.handled = true;
    result.reply = getExecutionBlockReply(executionBlockReason, reasoning, decision);
  }

  if (result.reply) {
    result.reply = finalizeConversationReply(result.reply, {
      intent: result.analysis?.intent,
      userMessage: message,
    });
  }

  stepsCompleted.push("understand");
  if (result.analysis?.intent && result.analysis.intent !== "unknown") {
    stepsCompleted.push("data");
  }
  if (result.analysis?.missingFields?.length) {
    stepsCompleted.push("missing");
  }
  if (result.reply) {
    stepsCompleted.push("respond");
  }
  if (result.pendingAction || result.pendingConfirmation) {
    stepsCompleted.push("confirm");
  }
  if (result.confirmAction) {
    stepsCompleted.push("tools");
    stepsCompleted.push("execute");
    stepsCompleted.push("verification");
  }
  stepsCompleted.push("respond");

  return {
    ...result,
    copilot: {
      stepsCompleted,
      expectedOrder: COGNITIVE_ORDER,
      messageCategory: category,
      usedHistory,
      plan: {
        intent: result.analysis?.intent,
        confidence: result.analysis?.confidence,
        entities: Object.keys(result.analysis?.data ?? {}),
        missing: result.analysis?.missingFields ?? [],
      },
      security: {
        confirmationRequired: Boolean(
          result.pendingAction ||
            result.pendingConfirmation ||
            result.analysis?.needsConfirmation,
        ),
        confirmed: Boolean(result.confirmAction),
      },
      verification: {
        checked: Boolean(result.confirmAction || result.cancelAction || executionBlocked),
        success: result.confirmAction ? true : executionBlocked ? false : undefined,
      },
      confidencePolicy: policy,
      executionBlocked,
      executionBlockReason,
      reasoning,
      decision,
      recommendation,
    },
  };
}
