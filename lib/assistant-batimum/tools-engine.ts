import type {
  AssistantAiData,
  BatimumAssistantIntent,
} from "@/lib/batimum-assistant-types";
import type { AppData } from "@/lib/types";

export type BatimumToolName =
  | "createClient"
  | "searchClient"
  | "createAppointment"
  | "createQuote"
  | "createSite"
  | "createInvoice"
  | "assignEmployeeToSite"
  | "updateQuote"
  | "getUnpaidInvoices"
  | "getQuotesToFollowUp"
  | "analyseBusiness";

type ToolValidationResult = {
  ok: boolean;
  missing: string[];
  error?: string;
};

type ToolDescriptor = {
  name: BatimumToolName;
  description: string;
  requiredFields: Array<keyof AssistantAiData>;
  validate?: (data: AssistantAiData, appData: AppData) => ToolValidationResult;
};

const TOOL_BY_INTENT: Partial<Record<BatimumAssistantIntent, BatimumToolName>> = {
  create_client: "createClient",
  search_client: "searchClient",
  create_appointment: "createAppointment",
  create_quote: "createQuote",
  create_chantier: "createSite",
  create_invoice: "createInvoice",
  assign_employee: "assignEmployeeToSite",
  show_unpaid_invoices: "getUnpaidInvoices",
  show_quotes_to_follow_up: "getQuotesToFollowUp",
  analyze_dashboard: "analyseBusiness",
};

const TOOLS: Record<BatimumToolName, ToolDescriptor> = {
  createClient: {
    name: "createClient",
    description: "Créer un client dans Batimum",
    requiredFields: ["nom"],
  },
  searchClient: {
    name: "searchClient",
    description: "Rechercher un client",
    requiredFields: [],
  },
  createAppointment: {
    name: "createAppointment",
    description: "Créer un rendez-vous dans le planning",
    requiredFields: [],
  },
  createQuote: {
    name: "createQuote",
    description: "Créer un devis brouillon",
    requiredFields: [],
  },
  createSite: {
    name: "createSite",
    description: "Créer un chantier",
    requiredFields: [],
  },
  createInvoice: {
    name: "createInvoice",
    description: "Créer une facture",
    requiredFields: [],
  },
  assignEmployeeToSite: {
    name: "assignEmployeeToSite",
    description: "Affecter un employé à un chantier sur le planning",
    requiredFields: ["employe", "chantier"],
  },
  updateQuote: {
    name: "updateQuote",
    description: "Modifier un devis existant",
    requiredFields: [],
  },
  getUnpaidInvoices: {
    name: "getUnpaidInvoices",
    description: "Lister les factures impayées",
    requiredFields: [],
  },
  getQuotesToFollowUp: {
    name: "getQuotesToFollowUp",
    description: "Lister les devis à relancer",
    requiredFields: [],
  },
  analyseBusiness: {
    name: "analyseBusiness",
    description: "Analyser l'activité entreprise",
    requiredFields: [],
  },
};

function hasValue(value: unknown): boolean {
  return String(value ?? "").trim().length > 0;
}

export function resolveToolForIntent(
  intent: BatimumAssistantIntent,
  data?: AssistantAiData,
): ToolDescriptor | null {
  if (data?.operation === "assign_employee") {
    return TOOLS.assignEmployeeToSite;
  }
  const toolName = TOOL_BY_INTENT[intent];
  if (!toolName) return null;
  return TOOLS[toolName] ?? null;
}

export function validateToolCall(
  tool: ToolDescriptor,
  data: AssistantAiData,
  appData: AppData,
): ToolValidationResult {
  const missing = tool.requiredFields.filter((field) => !hasValue(data[field]));
  if (missing.length > 0) {
    return { ok: false, missing };
  }
  if (tool.validate) {
    return tool.validate(data, appData);
  }
  return { ok: true, missing: [] };
}

export function formatToolValidationError(
  tool: ToolDescriptor,
  validation: ToolValidationResult,
): string {
  if (validation.error) return validation.error;
  if (validation.missing.length > 0) {
    return `Je ne peux pas lancer ${tool.name} : informations manquantes (${validation.missing.join(", ")}).`;
  }
  return `Je ne peux pas lancer ${tool.name} pour le moment.`;
}
