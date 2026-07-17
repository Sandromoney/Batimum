import { buildKnowledgeIntentCatalog } from "@/lib/assistant-batimum/knowledge/ai-catalog";
import { inferRole } from "@/lib/assistant-batimum/assistant-responses";
import type {
  AssistantActionType,
  AssistantAnalysis,
  AssistantIntent,
} from "@/lib/assistant-batimum/assistant-types";
import { getKnowledgeEntry } from "@/lib/assistant-batimum/knowledge/registry";
import { sanitizeClientName } from "@/lib/batimum-nlu";
import type {
  AssistantAiData,
  AssistantAiUnderstanding,
  AssistantSessionContext,
  BatimumAssistantIntent,
} from "@/lib/batimum-assistant-types";

export const LOCAL_UNDERSTAND_THRESHOLD = 0.9;
export const LLM_ACCEPT_THRESHOLD = 0.8;

export type AssistantLlmActionType =
  | "prepare_action"
  | "ask_question"
  | "answer"
  | "confirm"
  | "cancel";

export type AssistantLlmEntities = {
  employee?: string | null;
  employe?: string | null;
  site?: string | null;
  chantier?: string | null;
  client?: string | null;
  clientName?: string | null;
  nom?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  date?: string | null;
  heure?: string | null;
  type_chantier?: string | null;
  description?: string | null;
  devis?: string | null;
  adresse?: string | null;
  ville?: string | null;
  telephone?: string | null;
  email?: string | null;
};

export type AssistantLlmUnderstanding = {
  intent: string;
  confidence: number;
  module: string;
  actionType: AssistantLlmActionType;
  entities: AssistantLlmEntities;
  missingFields: string[];
  isNewWorkflow?: boolean;
  shouldAskQuestion?: boolean;
  questionToAsk?: string | null;
  summaryForUser?: string | null;
  requiresConfirmation?: boolean;
  creditType?: "free" | "ai";
};

export type AssistantUnderstandRequestPayload = {
  message: string;
  currentPage?: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  activeWorkflow?: {
    pending_intent?: string;
    pending_data?: Record<string, unknown>;
    missing_fields?: string[];
    awaiting_answer?: boolean;
  };
  knownClients?: Array<{ id: string; name: string }>;
  knownEmployees?: Array<{ id: string; name: string }>;
  knownSites?: Array<{ id: string; name: string; client?: string | null; statut?: string }>;
  knownQuotes?: Array<{ numero: string; titre: string; client?: string | null }>;
  knownInvoices?: Array<{ numero: string; statut: string; client?: string | null }>;
  dashboardStats?: Record<string, unknown>;
};

const CATALOG = buildKnowledgeIntentCatalog();

export const BATIMUM_UNDERSTAND_SYSTEM_PROMPT = `Tu es l'Assistant Batimum V1 — copilote du logiciel Batimum uniquement.

POSITIONNEMENT :
- Tu n'es pas ChatGPT. Tu aides à piloter Batimum.
- Si tu ne sais pas faire : intent "unknown", actionType "ask_question", questionToAsk claire.
- Tu n'inventes jamais. Tu ne réponds jamais au hasard.
- Une seule question à la fois (missingFields avec un seul élément).
- Une seule action à la fois. Si plusieurs demandes : traite la première seulement.
- "merci", "parfait", "d'accord" ne sont PAS des confirmations (requiresConfirmation reste true jusqu'à "oui" explicite).
- "ça va", "j'aimerais" ne sont jamais des noms d'employé ou de client.

HORS BATIMUM :
intent "out_of_scope", summaryForUser : "Je suis spécialisé dans Batimum et la gestion de votre activité. Je ne peux pas répondre à cette demande."

FONCTIONNALITÉS V1 AUTORISÉES :
Clients : créer, modifier, retrouver, ouvrir, compter.
Devis : créer, compléter (brouillon), retrouver, modifier (brouillon), envoyer.
Chantiers : créer, modifier, retrouver, chantiers en retard.
Planning : affecter, déplacer, vérifier disponibilités, retirer un employé (assign_employee et opérations planning liées).
Factures : créer, retrouver, impayées, CA encaissé.
Pilotage : CA, objectif mensuel, nb devis/clients, devis signés/refusés/brouillons, chantiers en retard, salariés disponibles — uniquement depuis les données fournies.

ACTIONS HORS V1 : intent "unknown", summaryForUser : "Je ne peux pas encore réaliser cette action."

Ton rôle :
Comprendre la demande utilisateur et retourner un JSON structuré.

Tu ne dois jamais répondre en texte libre.
Tu ne dois jamais exécuter une action.
Tu ne dois jamais inventer une donnée.
Tu dois extraire l'intention réelle, même si la phrase est mal écrite.

Le verbe est prioritaire sur les noms.

Exemple :
"mets Karim sur le chantier Martin"
= assign_employee
PAS create_site

"je veux créer un client"
= create_client
PAS count_clients

"combien j'ai fait ce mois"
= monthly_revenue

"sur quel chantier je suis meilleur"
= best_chantier_type

Si une information manque, poser UNE question ciblée.
Si le contexte permet de comprendre, ne redemande pas.
Si l'utilisateur répond à une question précédente, interprète la réponse dans ce contexte.

Tu dois comprendre les fautes :
"karim duboid" peut être "Karim Dubois"
"sdb" = salle de bain
"devi" = devis
"clien" = client

Tu dois utiliser les données connues (knownClients, knownEmployees, knownSites…) pour faire du fuzzy matching.
Tu dois retourner uniquement un JSON valide.

INTENTIONS PRINCIPALES :
assign_employee, create_client, create_quote, create_chantier, create_appointment, create_invoice,
search_client, show_unpaid_invoices, show_quotes_to_follow_up, monthly_revenue, monthly_profit,
best_chantier_type, chantier_profitability, employee_performance, analyze_dashboard,
correction, conversation, unknown

Catalogue Batimum (${CATALOG.length} intentions) :
${CATALOG.slice(0, 60).map((e) => `- ${e.id} (${e.domain})`).join("\n")}

FORMAT JSON STRICT :
{
  "intent": "assign_employee",
  "confidence": 0.97,
  "module": "planning",
  "actionType": "prepare_action",
  "entities": {
    "employee": null,
    "site": null,
    "client": null,
    "clientName": null,
    "startDate": null,
    "endDate": null,
    "date": null,
    "heure": null,
    "type_chantier": null,
    "description": null,
    "devis": null
  },
  "missingFields": [],
  "isNewWorkflow": true,
  "shouldAskQuestion": false,
  "questionToAsk": null,
  "summaryForUser": "Je vais affecter Karim Dubois au chantier SDB Martin du 11 au 17 juillet.",
  "requiresConfirmation": true,
  "creditType": "ai"
}

Règles actionType :
- prepare_action : action à confirmer (création, affectation…)
- ask_question : information manquante
- answer : question métier / statistique sans modification de données
- correction : l'utilisateur corrige une entité précédente ("non pas lui l'autre")

Toute action qui modifie les données : requiresConfirmation = true.`;

function stripJsonFence(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  return trimmed;
}

function pickEntity(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function inferTypeChantierFromText(...parts: Array<string | undefined>): string | undefined {
  const joined = parts.filter(Boolean).join(" ").toLowerCase();
  if (/\bsdb\b|salle de bain/.test(joined)) return "salle de bain";
  if (/cuisine/.test(joined)) return "cuisine";
  if (/extension/.test(joined)) return "extension";
  if (/renov|rénov/.test(joined)) return "rénovation";
  return undefined;
}

const BRAIN_INTENT_ALIASES: Record<string, AssistantIntent> = {
  assign_employee: "modify_data",
  create_quote: "create_devis",
  create_appointment: "create_rendez_vous",
  create_invoice: "create_facture",
  create_site: "create_chantier",
};

const API_INTENT_MAP: Partial<Record<string, BatimumAssistantIntent>> = {
  create_client: "create_client",
  search_client: "search_client",
  create_quote: "create_quote",
  create_devis: "create_quote",
  create_chantier: "create_chantier",
  create_appointment: "create_appointment",
  create_invoice: "create_invoice",
  assign_employee: "assign_employee",
  show_unpaid_invoices: "show_unpaid_invoices",
  show_quotes_to_follow_up: "show_quotes_to_follow_up",
  analyze_dashboard: "analyze_dashboard",
  conversation: "conversation",
  unknown: "unknown",
};

export function entitiesToAssistantData(
  intent: string,
  entities: AssistantLlmEntities,
): AssistantAiData & Record<string, unknown> {
  const clientName = pickEntity(entities.clientName);
  const client = pickEntity(entities.client);
  const site = pickEntity(entities.site) ?? pickEntity(entities.chantier);
  const employee = pickEntity(entities.employee) ?? pickEntity(entities.employe);

  const data: AssistantAiData & Record<string, unknown> = {
    nom:
      intent === "create_client"
        ? sanitizeClientName(clientName ?? client ?? pickEntity(entities.nom) ?? "")
        : pickEntity(entities.nom),
    client: client ?? (intent !== "create_client" ? clientName : undefined),
    chantier: site,
    date: pickEntity(entities.date),
    heure: pickEntity(entities.heure),
    type_chantier:
      pickEntity(entities.type_chantier) ?? inferTypeChantierFromText(site, client, clientName),
    description: pickEntity(entities.description),
    devis: pickEntity(entities.devis),
    adresse: pickEntity(entities.adresse),
    ville: pickEntity(entities.ville),
    telephone: pickEntity(entities.telephone),
    email: pickEntity(entities.email),
  };

  if (employee) data.employe = employee;
  const startDate = pickEntity(entities.startDate) ?? pickEntity(entities.date_debut);
  const endDate = pickEntity(entities.endDate) ?? pickEntity(entities.date_fin);
  if (startDate) data.date_debut = startDate;
  if (endDate) data.date_fin = endDate;

  if (intent === "assign_employee") {
    data.operation = "assign_employee";
  }

  return data;
}

export function mapLlmIntentToBrainIntent(intent: string): AssistantIntent {
  if (BRAIN_INTENT_ALIASES[intent]) return BRAIN_INTENT_ALIASES[intent];
  return intent as AssistantIntent;
}

export function mapLlmIntentToApiIntent(intent: string): BatimumAssistantIntent {
  const mapped = API_INTENT_MAP[intent];
  if (mapped) return mapped;
  if (intent === "assign_employee") return "assign_employee";
  return "unknown";
}

const ANSWER_LLM_INTENTS = new Set([
  "monthly_revenue",
  "monthly_profit",
  "best_chantier_type",
  "chantier_profitability",
  "employee_performance",
  "count_clients",
  "count_devis",
  "count_factures",
  "count_chantiers",
  "show_unpaid_invoices",
  "show_quotes_to_follow_up",
  "analyze_dashboard",
  "dashboard_summary",
  "today_summary",
]);

export function mapLlmActionType(
  llm: Pick<AssistantLlmUnderstanding, "actionType" | "missingFields" | "shouldAskQuestion" | "intent">,
): AssistantActionType {
  if (ANSWER_LLM_INTENTS.has(llm.intent)) return "answer";
  if (llm.shouldAskQuestion || llm.missingFields.length > 0) return "ask_question";
  if (llm.actionType === "answer") return "answer";
  if (llm.actionType === "ask_question") return "ask_question";
  if (llm.actionType === "confirm") return "confirm";
  if (llm.actionType === "cancel") return "cancel";
  return "prepare_action";
}

export function parseAssistantLlmJson(raw: string): AssistantLlmUnderstanding | null {
  try {
    const parsed = JSON.parse(stripJsonFence(raw)) as Record<string, unknown>;
    const intent = String(parsed.intent ?? "unknown").trim() || "unknown";
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence ?? 0)));
    const module = String(parsed.module ?? "core").trim() || "core";
    const actionTypeRaw = String(parsed.actionType ?? "ask_question").trim();
    const actionType = (
      ["prepare_action", "ask_question", "answer", "confirm", "cancel"].includes(actionTypeRaw)
        ? actionTypeRaw
        : "ask_question"
    ) as AssistantLlmActionType;

    const entitiesSource =
      parsed.entities && typeof parsed.entities === "object"
        ? (parsed.entities as Record<string, unknown>)
        : parsed.data && typeof parsed.data === "object"
          ? (parsed.data as Record<string, unknown>)
          : {};

    const entities: AssistantLlmEntities = {};
    for (const [key, value] of Object.entries(entitiesSource)) {
      if (value === null || typeof value === "string") {
        (entities as Record<string, string | null | undefined>)[key] = value;
      }
    }

    const missingRaw = parsed.missingFields ?? parsed.missing_fields;
    const missingFields = Array.isArray(missingRaw)
      ? missingRaw
          .filter((field): field is string => typeof field === "string")
          .map((field) => field.trim())
          .filter(Boolean)
      : [];

    const questionRaw = parsed.questionToAsk ?? parsed.clarification_question;
    const questionToAsk =
      typeof questionRaw === "string" ? questionRaw.trim() || null : null;

    const summaryRaw = parsed.summaryForUser;
    const summaryForUser =
      typeof summaryRaw === "string" ? summaryRaw.trim() || null : null;

    return {
      intent,
      confidence,
      module,
      actionType,
      entities,
      missingFields,
      isNewWorkflow: Boolean(parsed.isNewWorkflow),
      shouldAskQuestion: Boolean(parsed.shouldAskQuestion),
      questionToAsk,
      summaryForUser,
      requiresConfirmation: parsed.requiresConfirmation !== false,
      creditType: parsed.creditType === "free" ? "free" : "ai",
    };
  } catch {
    return null;
  }
}

export function mapLlmToAssistantUnderstanding(
  llm: AssistantLlmUnderstanding,
): AssistantAiUnderstanding {
  const apiIntent = mapLlmIntentToApiIntent(llm.intent);
  const data = entitiesToAssistantData(llm.intent, llm.entities);

  const missing_fields = [...llm.missingFields];
  if (llm.intent === "assign_employee") {
    if (!String(data.employe ?? "").trim() && !missing_fields.includes("employe")) {
      missing_fields.push("employe");
    }
    if (!String(data.chantier ?? "").trim() && !missing_fields.includes("chantier")) {
      missing_fields.push("chantier");
    }
  }
  if (llm.intent === "create_client" && !data.nom?.trim() && !missing_fields.includes("nom")) {
    missing_fields.push("nom");
  }

  return {
    intent: apiIntent,
    confidence: llm.confidence,
    data,
    missing_fields,
    clarification_question: llm.questionToAsk,
  };
}

export function mapLlmToBrainAnalysis(
  llm: AssistantLlmUnderstanding,
  session?: AssistantSessionContext,
): AssistantAnalysis {
  const brainIntent = mapLlmIntentToBrainIntent(llm.intent);
  const data = entitiesToAssistantData(llm.intent, llm.entities);
  const actionType = mapLlmActionType(llm);
  const entry = getKnowledgeEntry(brainIntent);
  const module = llm.module || entry?.domain || "core";
  const missingFields = [...llm.missingFields];

  if (llm.intent === "assign_employee") {
    if (!String(data.employe ?? "").trim() && !missingFields.includes("employe")) {
      missingFields.push("employe");
    }
    if (!String(data.chantier ?? "").trim() && !missingFields.includes("site")) {
      missingFields.push("chantier");
    }
  }

  if (llm.intent === "correction") {
    return {
      intent: "correction",
      role: "conversation",
      module: "conversation",
      actionType: "ask_question",
      confidence: llm.confidence,
      data,
      missingFields,
      needsConfirmation: false,
      creditType: "ai",
      messageCategory: "correction",
    };
  }

  if (llm.isNewWorkflow && session?.pending_intent) {
    data.reset_previous_workflow = true;
  }

  if (llm.questionToAsk) {
    data.clarification = llm.questionToAsk;
  }
  if (llm.summaryForUser) {
    data.summary_for_user = llm.summaryForUser;
  }

  const needsConfirmation =
    llm.requiresConfirmation !== false &&
    (actionType === "prepare_action" || brainIntent === "modify_data");

  return {
    intent: brainIntent,
    role: inferRole(brainIntent, module),
    module,
    actionType,
    confidence: llm.confidence,
    data,
    missingFields,
    needsConfirmation,
    creditType: "ai",
  };
}

export function buildUnderstandUserPayload(
  payload: AssistantUnderstandRequestPayload,
): string {
  return JSON.stringify(payload, null, 0);
}

export function isLocalUnderstandingSufficient(confidence: number): boolean {
  return confidence >= LOCAL_UNDERSTAND_THRESHOLD;
}

export function isLlmUnderstandingAcceptable(confidence: number): boolean {
  return confidence >= LLM_ACCEPT_THRESHOLD;
}

/** Compatibilité : parse l'ancien ou le nouveau format JSON OpenAI. */
export function parseAssistantUnderstandingJson(
  raw: string,
): { llm: AssistantLlmUnderstanding; api: AssistantAiUnderstanding } | null {
  const llm = parseAssistantLlmJson(raw);
  if (!llm) return null;
  return {
    llm,
    api: mapLlmToAssistantUnderstanding(llm),
  };
}
