/** Intentions structurées renvoyées par l'IA (JSON strict). */
export type BatimumAssistantIntent =
  | "create_client"
  | "search_client"
  | "create_appointment"
  | "create_quote"
  | "create_chantier"
  | "create_invoice"
  | "assign_employee"
  | "show_unpaid_invoices"
  | "show_quotes_to_follow_up"
  | "analyze_dashboard"
  | "conversation"
  | "unknown";

export type AssistantAiData = {
  nom?: string;
  client?: string;
  date?: string;
  heure?: string;
  type_chantier?: string;
  chantier?: string;
  description?: string;
  devis?: string;
  adresse?: string;
  ville?: string;
  telephone?: string;
  email?: string;
  /** Affectation planning — employé ciblé. */
  employe?: string;
  date_debut?: string;
  date_fin?: string;
  /** Sous-opération (ex. assign_employee). */
  operation?: string;
};

export type AssistantAiUnderstanding = {
  intent: BatimumAssistantIntent;
  confidence: number;
  data: AssistantAiData;
  missing_fields: string[];
  clarification_question?: string | null;
};

export type AssistantSessionContext = {
  pending_intent?: BatimumAssistantIntent;
  pending_data?: AssistantAiData;
  missing_fields?: string[];
  last_client_id?: string;
  last_client_name?: string;
  /** Dernier sujet abordé (client, devis, facture…) pour résoudre « en créer un ». */
  last_topic?: string;
  /** L'assistant attend une réponse à sa dernière question. */
  awaiting_answer?: boolean;
  disambiguation_candidates?: Array<{ id: string; name: string }>;
  recent_messages?: Array<{ role: "user" | "assistant"; content: string }>;
};

export type AssistantUnderstandResponse = {
  success: boolean;
  understanding?: AssistantAiUnderstanding;
  /** Compréhension LLM structurée (format JSON strict). */
  llm?: import("@/lib/batimum-assistant-understand").AssistantLlmUnderstanding;
  used_ai: boolean;
  credit_label?: string;
  error?: string;
  code?: string;
  auth_required?: boolean;
  quota_exceeded?: boolean;
  quota_tracking_skipped?: boolean;
};

export const ASSISTANT_INTENT_LABELS: Record<BatimumAssistantIntent, string> = {
  create_client: "Créer un client",
  search_client: "Rechercher un client",
  create_appointment: "Créer un rendez-vous",
  create_quote: "Créer un devis",
  create_chantier: "Créer un chantier",
  create_invoice: "Créer une facture",
  assign_employee: "Affecter un employé",
  show_unpaid_invoices: "Afficher les factures impayées",
  show_quotes_to_follow_up: "Afficher les devis à relancer",
  analyze_dashboard: "Analyser le tableau de bord",
  conversation: "Conversation",
  unknown: "Demande non reconnue",
};

/** Actions exécutables après confirmation utilisateur. */
export const EXECUTABLE_ASSISTANT_INTENTS = new Set<BatimumAssistantIntent>([
  "create_client",
  "search_client",
  "create_appointment",
  "create_quote",
  "create_chantier",
  "assign_employee",
  "show_unpaid_invoices",
  "show_quotes_to_follow_up",
  "analyze_dashboard",
]);

export const NOT_YET_AVAILABLE_INTENTS = new Set<BatimumAssistantIntent>([
  "create_invoice",
]);

export const DATA_FIELD_LABELS: Record<keyof AssistantAiData, string> = {
  nom: "Nom",
  client: "Client",
  date: "Date",
  heure: "Heure",
  type_chantier: "Type de travaux",
  chantier: "Chantier",
  description: "Description",
  devis: "Devis",
  adresse: "Adresse",
  ville: "Ville",
  telephone: "Téléphone",
  email: "Email",
  employe: "Employé",
  date_debut: "Date de début",
  date_fin: "Date de fin",
  operation: "Opération",
};
