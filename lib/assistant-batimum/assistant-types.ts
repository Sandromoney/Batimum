import type { AssistantPendingAction } from "@/lib/batimum-assistant-orchestrator";
import type { AssistantProposedAction } from "@/lib/batimum-assistant-parser";
import type { AssistantMemory } from "@/lib/assistant-batimum/assistant-memory";
import type {
  AssistantAiData,
  AssistantSessionContext,
} from "@/lib/batimum-assistant-types";
import type { ChatbotPendingConfirmation } from "@/lib/batimum-chatbot";

export type AssistantRole =
  | "gestion"
  | "dirigeant"
  | "btp"
  | "organisation"
  | "devis_ai"
  | "conversation"
  | "hors_sujet";

export type AssistantActionType =
  | "answer"
  | "prepare_action"
  | "ask_question"
  | "refuse"
  | "confirm"
  | "cancel";

export type AssistantIntent =
  | "greeting"
  | "thanks"
  | "small_talk"
  | "ack"
  | "help_capabilities"
  | "confirmation"
  | "cancellation"
  | "correction"
  | "count_clients"
  | "count_devis"
  | "count_factures"
  | "count_chantiers"
  | "count_commandes"
  | "count_employes"
  | "count_fournitures"
  | "show_unpaid_invoices"
  | "show_paid_invoices"
  | "show_late_invoices"
  | "show_quotes_to_follow_up"
  | "show_late_chantiers"
  | "monthly_revenue"
  | "monthly_profit"
  | "dashboard_summary"
  | "today_summary"
  | "important_actions"
  | "monthly_goal"
  | "chantier_profitability"
  | "employee_performance"
  | "best_client"
  | "best_chantier"
  | "best_chantier_type"
  | "search_client"
  | "search_devis"
  | "search_facture"
  | "search_chantier"
  | "explain_current_page"
  | "create_client"
  | "create_devis"
  | "create_facture"
  | "create_chantier"
  | "create_rendez_vous"
  | "create_employe"
  | "create_fourniture"
  | "create_commande"
  | "prepare_email"
  | "open_page"
  | "modify_data"
  | "delete_data"
  | "btp_question"
  | "price_advice"
  | "tva_question"
  | "dtu_question"
  | "chantier_method_question"
  | "debourse_question"
  | "margin_question"
  | "explain_mum_ia"
  | "mum_ia_quota"
  | "company_advice"
  | "out_of_scope"
  | "unknown"
  | (string & {});

/** @deprecated Alias — utiliser AssistantIntent */
export type AssistantBrainIntent = AssistantIntent;

export type AssistantBrainContext = {
  hasPendingAction?: boolean;
  hasLegacyPending?: boolean;
  hasPendingIntent?: boolean;
  session?: AssistantSessionContext;
  memory?: AssistantMemory;
  currentPath?: string;
};

export type AssistantAnalysis = {
  intent: AssistantIntent;
  role: AssistantRole;
  confidence: number;
  module: string;
  actionType: AssistantActionType;
  data: AssistantAiData & Record<string, unknown>;
  missingFields: string[];
  needsConfirmation: boolean;
  creditType: "free" | "ai";
  /** Catégorie du message (règle n°2). */
  messageCategory?: import("@/lib/assistant-batimum/assistant-rules").MessageCategory;
};

export type AssistantBrainResult = {
  handled: boolean;
  reply: string;
  creditLabel?: string;
  suggestions?: string[];
  needsApi?: boolean;
  analysis: AssistantAnalysis;
  pendingConfirmation?: ChatbotPendingConfirmation;
  pendingAction?: AssistantPendingAction;
  sessionPatch?: Partial<AssistantSessionContext>;
  navigateTo?: string;
  confirmAction?: boolean;
  cancelAction?: boolean;
  correction?: Partial<AssistantAiData>;
  legacyActions?: AssistantProposedAction[];
  proposedActions?: AssistantProposedAction[];
};

export type AssistantTurnOutput = {
  intent: AssistantIntent;
  role: AssistantRole;
  module: string;
  confidence: number;
  actionType: AssistantActionType;
  data: AssistantAiData & Record<string, unknown>;
  missingFields: string[];
  needsConfirmation: boolean;
  creditType: "free" | "ai";
  responseText: string;
  proposedActions: AssistantProposedAction[];
};
