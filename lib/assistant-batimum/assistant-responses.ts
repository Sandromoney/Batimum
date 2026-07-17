import type { AssistantIntent, AssistantRole } from "@/lib/assistant-batimum/assistant-types";
import { shouldAppendFollowUp } from "@/lib/assistant-batimum/assistant-rules";

const FOLLOW_UPS: Partial<Record<AssistantIntent, string>> = {};

export function appendFollowUp(intent: AssistantIntent, text: string): string {
  if (!shouldAppendFollowUp(intent)) return text;
  const followUp = FOLLOW_UPS[intent];
  if (!followUp || text.includes(followUp.slice(0, 20))) return text;
  return `${text}\n\n${followUp}`;
}

export function getContextualSuggestions(
  _currentPath?: string,
): string[] {
  return [];
}

export function inferRole(intent: string, module: string): AssistantRole {
  if (intent === "out_of_scope") return "hors_sujet";

  if (
    module === "conversation" ||
    ["greeting", "thanks", "small_talk", "ack", "help_capabilities", "confirmation", "cancellation", "correction"].includes(
      intent,
    )
  ) {
    return "conversation";
  }

  if (
    module === "btp" ||
    [
      "btp_question",
      "tva_question",
      "price_advice",
      "dtu_question",
      "chantier_method_question",
      "debourse_question",
      "margin_question",
    ].includes(intent)
  ) {
    return "btp";
  }

  if (module === "mum-ia" || intent === "create_devis") {
    return "devis_ai";
  }

  if (
    [
      "today_summary",
      "important_actions",
      "clients_to_follow_up",
      "planning_today",
      "planning_tomorrow",
    ].includes(intent) ||
    module === "planning"
  ) {
    return "organisation";
  }

  if (
    [
      "monthly_revenue",
      "monthly_profit",
      "dashboard_summary",
      "monthly_goal",
      "company_advice",
      "chantier_profitability",
      "employee_performance",
      "best_client",
      "best_chantier",
      "best_chantier_type",
      "pilotage_attention",
      "pilotage_reliability",
    ].includes(intent) ||
    module === "pilotage"
  ) {
    return "dirigeant";
  }

  return "gestion";
}
