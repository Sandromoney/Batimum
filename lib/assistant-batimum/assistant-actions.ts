import {
  buildClarificationQuestion,
  buildConfirmationSummary,
  detectOrderedMissingFields,
} from "@/lib/batimum-assistant-brain";
import { targetedFieldQuestion, CAREFUL_REPLY } from "@/lib/assistant-batimum/assistant-rules";
import { extractIntentData } from "@/lib/assistant-batimum/assistant-context";
import { validateActionData } from "@/lib/assistant-batimum/assistant-validators";
import type {
  AssistantAnalysis,
  AssistantIntent,
} from "@/lib/assistant-batimum/assistant-types";
import type { AssistantPendingAction } from "@/lib/batimum-assistant-orchestrator";
import type { AssistantAiData, BatimumAssistantIntent } from "@/lib/batimum-assistant-types";
import {
  DATA_FIELD_LABELS,
  EXECUTABLE_ASSISTANT_INTENTS,
} from "@/lib/batimum-assistant-types";
import type { AppData } from "@/lib/types";

const INTENT_TO_API: Partial<Record<AssistantIntent, string>> = {
  create_client: "create_client",
  create_devis: "create_quote",
  create_chantier: "create_chantier",
  create_facture: "create_invoice",
  create_rendez_vous: "create_appointment",
  search_client: "search_client",
};

export function needsConfirmationForIntent(intent: AssistantIntent): boolean {
  return [
    "create_client",
    "create_devis",
    "create_facture",
    "create_chantier",
    "create_rendez_vous",
    "create_employe",
    "create_fourniture",
    "create_commande",
    "prepare_email",
    "modify_data",
    "delete_data",
  ].includes(intent);
}

export function enrichActionAnalysis(
  intent: AssistantIntent,
  message: string,
  baseData: Record<string, unknown>,
  appData?: AppData,
): Pick<AssistantAnalysis, "data" | "missingFields" | "needsConfirmation" | "actionType"> {
  const extracted = extractIntentData(intent, message);
  const data: AssistantAiData = {
    ...(baseData as AssistantAiData),
    ...extracted,
  };

  const apiIntent = INTENT_TO_API[intent];
  let missingFromOrder = apiIntent
    ? detectOrderedMissingFields(apiIntent as Parameters<typeof detectOrderedMissingFields>[0], data)
    : [];

  if (
    intent === "create_client" &&
    data.nom?.trim() &&
    missingFromOrder[0] === "nom_complet"
  ) {
    missingFromOrder = [];
  }

  const validation = validateActionData(intent, data, appData);
  let missingFields = missingFromOrder.length
    ? missingFromOrder
    : validation.missingFields;

  if (
    intent === "create_client" &&
    data.nom?.trim() &&
    missingFields[0] === "nom_complet"
  ) {
    missingFields = missingFields.filter((f) => f !== "nom_complet");
  }

  const dynamicData = data as Record<string, unknown>;
  if (intent === "modify_data" && dynamicData.operation === "assign_employee") {
    const opMissing: string[] = [];
    if (!String(dynamicData.employe ?? "").trim()) opMissing.push("employe");
    if (!String(data.chantier ?? "").trim()) opMissing.push("chantier");
    missingFields = opMissing.length ? opMissing : missingFields;
  }

  if (missingFields.length > 0) {
    const field = missingFields[0];
    let question = targetedFieldQuestion(intent, field, data);

    if (
      question === CAREFUL_REPLY &&
      apiIntent
    ) {
      question = buildClarificationQuestion(
        apiIntent as Parameters<typeof buildClarificationQuestion>[0],
        field,
        data,
      );
    }

    if (intent === "create_client" && field === "nom" && !data.nom?.trim()) {
      question = "Bien sûr. Quel est le nom du client à créer ?";
    }
    if (intent === "create_employe" && field === "nom" && !data.nom?.trim()) {
      question = "Quel est le nom de l'employé à créer ?";
    }

    return {
      data: { ...data, clarification: question, warnings: validation.warnings },
      missingFields,
      needsConfirmation: false,
      actionType: "ask_question",
    };
  }

  if (
    intent === "create_devis" &&
    data.client?.trim() &&
    data.type_chantier?.trim() &&
    !baseData.mum_ia_decided
  ) {
    return {
      data: {
        ...data,
        clarification: targetedFieldQuestion("create_devis", "mum_ia_choice", data),
      },
      missingFields: ["mum_ia_choice"],
      needsConfirmation: false,
      actionType: "ask_question",
    };
  }

  return {
    data: { ...data, warnings: validation.warnings },
    missingFields: [],
    needsConfirmation: needsConfirmationForIntent(intent),
    actionType: "prepare_action",
  };
}

export function buildActionSummary(
  intent: AssistantIntent,
  data: AssistantAiData,
): string {
  const dynamic = data as Record<string, unknown>;
  if (intent === "modify_data" && dynamic.operation === "assign_employee") {
    const employe = String(dynamic.employe ?? "Employé");
    const chantier = String(dynamic.chantier ?? "Chantier");
    const debut = dynamic.date_debut ? `\ndu : ${String(dynamic.date_debut)}` : "";
    const fin = dynamic.date_fin ? `\nau : ${String(dynamic.date_fin)}` : "";
    return `Je vais affecter :\n${employe}\nau chantier :\n${chantier}${debut}${fin}\n\nConfirmez-vous ?`;
  }

  const apiIntent = INTENT_TO_API[intent];
  if (apiIntent) {
    return buildConfirmationSummary(
      apiIntent as Parameters<typeof buildConfirmationSummary>[0],
      data,
    );
  }
  return "Je vais traiter votre demande. Confirmez-vous ?";
}

export function buildPendingActionFromAnalysis(
  intent: AssistantIntent,
  data: AssistantAiData,
  confidence?: number,
): AssistantPendingAction | null {
  const apiIntent = INTENT_TO_API[intent] as BatimumAssistantIntent | undefined;
  if (!apiIntent || !EXECUTABLE_ASSISTANT_INTENTS.has(apiIntent)) return null;

  const editableFields: AssistantPendingAction["editableFields"] = [];
  for (const key of Object.keys(DATA_FIELD_LABELS) as Array<keyof AssistantAiData>) {
    const value = data[key];
    if (value) {
      editableFields.push({
        key,
        label: DATA_FIELD_LABELS[key],
        value: String(value),
      });
    }
  }

  return {
    intent: apiIntent,
    data,
    securityGuard: {
      approved: (confidence ?? 0) >= 0.95,
      confidence: confidence ?? 0,
      source: "copilot",
    },
    editableFields,
  };
}
