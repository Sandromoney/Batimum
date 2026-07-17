import type { AssistantAnalysis } from "@/lib/assistant-batimum/assistant-types";
import type { ReasoningTrace } from "@/lib/assistant-batimum/reasoning-engine";

export type DecisionPriority =
  | "security"
  | "data"
  | "planning"
  | "client"
  | "profitability"
  | "comfort";

export type DecisionMatrix = {
  objective: string;
  data: string[];
  missing: string[];
  risk: "low" | "medium" | "high";
  confidence: number;
  recommendedAction: string;
};

export type DecisionOutcome = {
  readyToExecute: boolean;
  requiresConfirmation: boolean;
  blockedReason?: string;
  priority: DecisionPriority;
  matrix: DecisionMatrix;
  alternatives?: string[];
};

function computeRisk(analysis: AssistantAnalysis, reasoning: ReasoningTrace): "low" | "medium" | "high" {
  if (!reasoning.verification.allPassed) return "high";
  if (analysis.confidence < 0.95) return "medium";
  if ((analysis.missingFields?.length ?? 0) > 0) return "medium";
  return "low";
}

function buildAlternatives(reasoning: ReasoningTrace): string[] {
  const failed = reasoning.verification.checks.find((c) => !c.ok);
  const detail = failed?.detail;
  if (detail === "employee_planning_conflict") {
    return [
      "Déplacer cet employé",
      "Choisir un autre employé disponible",
      "Déplacer la période du chantier",
    ];
  }
  if (detail === "employe_declared_on_vacation") {
    return [
      "Choisir un autre employé disponible",
      "Décaler l'affectation après la période de congés",
    ];
  }
  if (detail === "chantier_terminated") {
    return [
      "Sélectionner un chantier actif",
      "Réouvrir le chantier si c'est intentionnel",
    ];
  }
  return [];
}

function getPriority(reasoning: ReasoningTrace): DecisionPriority {
  if (!reasoning.verification.allPassed) return "security";
  if (reasoning.plan.entities && Object.keys(reasoning.plan.entities).length === 0) return "data";
  if (reasoning.subject === "planning") return "planning";
  if (reasoning.subject === "clients") return "client";
  if (reasoning.subject === "pilotage" || reasoning.subject === "analyse") return "profitability";
  return "comfort";
}

export function buildDecisionOutcome(
  analysis: AssistantAnalysis,
  reasoning: ReasoningTrace,
): DecisionOutcome {
  const risk = computeRisk(analysis, reasoning);
  const readyToExecute =
    reasoning.verification.allPassed &&
    analysis.confidence >= 0.95 &&
    (analysis.missingFields?.length ?? 0) === 0;
  const requiresConfirmation = analysis.needsConfirmation || analysis.actionType === "prepare_action";
  const matrix: DecisionMatrix = {
    objective: analysis.intent,
    data: Object.keys(analysis.data ?? {}),
    missing: analysis.missingFields ?? [],
    risk,
    confidence: analysis.confidence,
    recommendedAction: reasoning.plan.toolAction ?? "validateAndProceed()",
  };
  const blocked = !readyToExecute;
  return {
    readyToExecute,
    requiresConfirmation,
    blockedReason: blocked ? (reasoning.verification.checks.find((c) => !c.ok)?.detail ?? "decision_not_ready") : undefined,
    priority: getPriority(reasoning),
    matrix,
    alternatives: buildAlternatives(reasoning),
  };
}
