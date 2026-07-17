import type { AssistantIntent } from "@/lib/assistant-batimum/assistant-types";
import type {
  AssistantAiData,
  AssistantSessionContext,
  BatimumAssistantIntent,
} from "@/lib/batimum-assistant-types";
import type { AppData } from "@/lib/types";

export const ASSISTANT_MEMORY_STORAGE_KEY = "assistant-batimum-memory";

export type AssistantMemoryMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
};

export type AssistantOperationalTask = {
  id: string;
  intent: string;
  status: "in_progress" | "completed" | "cancelled";
  startedAt: number;
  updatedAt: number;
  context?: Record<string, unknown>;
};

export type AssistantSoftwareContext = {
  currentPath?: string;
  currentModule?: string;
  activeClient?: string;
  activeDevis?: string;
  activeChantier?: string;
  activeFacture?: string;
  activeEmploye?: string;
  activePlanning?: string;
};

export type AssistantEnterpriseMemory = {
  entreprise?: string;
  tva?: number;
  employesCount?: number;
  fournituresCount?: number;
  bibliothequeCount?: number;
};

export type AssistantMemory = {
  immediate?: {
    message?: string;
    parsedAt?: number;
  };
  lastIntent?: AssistantIntent;
  lastModule?: string;
  pendingAction?: BatimumAssistantIntent;
  pendingMissingField?: string;
  pendingEntityType?: string;
  pendingEntityData?: AssistantAiData;
  currentClient?: string;
  currentDevis?: string;
  currentChantier?: string;
  currentFacture?: string;
  currentEmploye?: string;
  currentPlanning?: string;
  currentCommande?: string;
  currentFourniture?: string;
  lastQuestionAsked?: string;
  awaitingAnswer: boolean;
  lastTopic?: string;
  inactiveTopics?: string[];
  softwareContext?: AssistantSoftwareContext;
  enterpriseMemory?: AssistantEnterpriseMemory;
  operationalTasks?: AssistantOperationalTask[];
  habits?: Record<string, string>;
  history: AssistantMemoryMessage[];
};

export function createEmptyMemory(): AssistantMemory {
  return {
    awaitingAnswer: false,
    history: [],
    inactiveTopics: [],
    softwareContext: {},
    enterpriseMemory: {},
    operationalTasks: [],
    habits: {},
  };
}

const SESSION_TO_ASSISTANT: Record<string, AssistantIntent> = {
  create_client: "create_client",
  create_quote: "create_devis",
  create_chantier: "create_chantier",
  create_invoice: "create_facture",
  create_appointment: "create_rendez_vous",
  search_client: "search_client",
};

const ASSISTANT_TO_SESSION: Partial<Record<AssistantIntent, BatimumAssistantIntent>> = {
  create_client: "create_client",
  create_devis: "create_quote",
  create_chantier: "create_chantier",
  create_facture: "create_invoice",
  create_rendez_vous: "create_appointment",
  search_client: "search_client",
};

export function sessionIntentToAssistant(
  intent?: BatimumAssistantIntent,
): AssistantIntent | undefined {
  if (!intent) return undefined;
  return SESSION_TO_ASSISTANT[intent] ?? (intent as AssistantIntent);
}

export function assistantIntentToSession(
  intent: AssistantIntent,
): BatimumAssistantIntent | undefined {
  return ASSISTANT_TO_SESSION[intent] ?? (intent as BatimumAssistantIntent);
}

/** Fusionne session + mémoire persistée. */
export function mergeMemoryWithSession(
  session?: AssistantSessionContext,
  memory?: AssistantMemory,
): AssistantMemory {
  const base = memory ?? createEmptyMemory();
  if (!session) return base;

  const pendingAction = session.pending_intent ?? base.pendingAction;
  const missing = session.missing_fields?.[0] ?? base.pendingMissingField;
  const awaiting =
    Boolean(session.awaiting_answer) ||
    Boolean(pendingAction && session.missing_fields?.length);

  return {
    ...base,
    immediate: { message: undefined, parsedAt: Date.now() },
    pendingAction,
    pendingMissingField: missing,
    pendingEntityData: {
      ...(base.pendingEntityData ?? {}),
      ...(session.pending_data ?? {}),
    },
    awaitingAnswer: awaiting,
    lastTopic: session.last_topic ?? base.lastTopic,
    currentClient: session.last_client_name ?? base.currentClient,
    history: mergeHistory(base.history, session.recent_messages),
    softwareContext: {
      ...(base.softwareContext ?? {}),
      activeClient: session.last_client_name ?? base.softwareContext?.activeClient,
    },
  };
}

function mergeHistory(
  memoryHistory: AssistantMemoryMessage[],
  sessionMessages?: Array<{ role: "user" | "assistant"; content: string }>,
): AssistantMemoryMessage[] {
  const fromSession = (sessionMessages ?? []).map((m) => ({
    role: m.role,
    content: m.content,
  }));
  const combined = [...memoryHistory, ...fromSession];
  const seen = new Set<string>();
  const unique: AssistantMemoryMessage[] = [];
  for (const msg of combined) {
    const key = `${msg.role}:${msg.content}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(msg);
  }
  return unique.slice(-20);
}

export function memoryToSessionPatch(
  memory: Partial<AssistantMemory>,
): Partial<AssistantSessionContext> {
  const patch: Partial<AssistantSessionContext> = {};
  if (memory.pendingAction !== undefined) patch.pending_intent = memory.pendingAction;
  if (memory.pendingEntityData !== undefined) patch.pending_data = memory.pendingEntityData;
  if (memory.pendingMissingField !== undefined) {
    patch.missing_fields = memory.pendingMissingField
      ? [memory.pendingMissingField]
      : undefined;
  }
  if (memory.awaitingAnswer !== undefined) patch.awaiting_answer = memory.awaitingAnswer;
  if (memory.lastTopic !== undefined) patch.last_topic = memory.lastTopic;
  if (memory.currentClient !== undefined) patch.last_client_name = memory.currentClient;
  if (memory.history?.length) {
    patch.recent_messages = memory.history.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }
  return patch;
}

export function loadAssistantMemory(): AssistantMemory {
  if (typeof localStorage === "undefined") return createEmptyMemory();
  try {
    const raw = localStorage.getItem(ASSISTANT_MEMORY_STORAGE_KEY);
    if (!raw) return createEmptyMemory();
    const parsed = JSON.parse(raw) as AssistantMemory;
    return { ...createEmptyMemory(), ...parsed, history: parsed.history ?? [] };
  } catch {
    return createEmptyMemory();
  }
}

export function saveAssistantMemory(memory: AssistantMemory): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      ASSISTANT_MEMORY_STORAGE_KEY,
      JSON.stringify({ ...memory, history: memory.history.slice(-20) }),
    );
  } catch {
    /* ignore quota */
  }
}

export function updateMemoryAfterTurn(
  memory: AssistantMemory,
  userMessage: string,
  assistantReply: string,
  patch?: Partial<AssistantMemory>,
  metadata?: {
    analysisIntent?: string;
    analysisModule?: string;
    analysisData?: Record<string, unknown>;
    currentPath?: string;
    appData?: AppData;
  },
): AssistantMemory {
  const now = Date.now();
  const history = [
    ...memory.history,
    { role: "user" as const, content: userMessage, timestamp: now },
    { role: "assistant" as const, content: assistantReply, timestamp: now },
  ].slice(-20);

  const data = metadata?.analysisData ?? {};
  const nextTopic = metadata?.analysisModule ?? memory.lastTopic;
  const inactiveTopics =
    nextTopic && memory.lastTopic && nextTopic !== memory.lastTopic
      ? [...new Set([...(memory.inactiveTopics ?? []), memory.lastTopic])].slice(-10)
      : (memory.inactiveTopics ?? []);

  const currentClient = String(data.client ?? data.nom ?? "").trim() || patch?.currentClient || memory.currentClient;
  const currentDevis = String(data.devis ?? "").trim() || memory.currentDevis;
  const currentChantier = String(data.chantier ?? "").trim() || memory.currentChantier;
  const currentFacture = String(data.facture ?? "").trim() || memory.currentFacture;
  const currentEmploye = String(data.employe ?? "").trim() || memory.currentEmploye;
  const currentPlanning = String(data.planning ?? "").trim() || memory.currentPlanning;
  const currentCommande = String(data.commande ?? "").trim() || memory.currentCommande;
  const currentFourniture = String(data.fourniture ?? "").trim() || memory.currentFourniture;

  const nextTasks = [...(memory.operationalTasks ?? [])];
  if (metadata?.analysisIntent && !["unknown", "ack", "greeting", "thanks"].includes(metadata.analysisIntent)) {
    const current = nextTasks.find(
      (t) => t.intent === metadata.analysisIntent && t.status === "in_progress",
    );
    if (current) {
      current.updatedAt = now;
      current.context = { ...(current.context ?? {}), ...data };
    } else if (assistantReply.includes("Confirmez-vous") || assistantReply.includes("Je vais")) {
      nextTasks.push({
        id: `${metadata.analysisIntent}-${now}`,
        intent: metadata.analysisIntent,
        status: "in_progress",
        startedAt: now,
        updatedAt: now,
        context: { ...data },
      });
    }
  }
  if (/c'est fait|créé|planifié|envoyé|appliquées/i.test(assistantReply)) {
    const open = nextTasks.find((t) => t.status === "in_progress");
    if (open) {
      open.status = "completed";
      open.updatedAt = now;
    }
  }

  return {
    ...memory,
    ...patch,
    immediate: { message: undefined, parsedAt: now },
    lastIntent: (metadata?.analysisIntent as AssistantIntent | undefined) ?? patch?.lastIntent ?? memory.lastIntent,
    lastModule: metadata?.analysisModule ?? patch?.lastModule ?? memory.lastModule,
    lastTopic: nextTopic,
    inactiveTopics,
    currentClient,
    currentDevis,
    currentChantier,
    currentFacture,
    currentEmploye,
    currentPlanning,
    currentCommande,
    currentFourniture,
    softwareContext: {
      ...(memory.softwareContext ?? {}),
      currentPath: metadata?.currentPath ?? memory.softwareContext?.currentPath,
      currentModule: metadata?.analysisModule ?? memory.softwareContext?.currentModule,
      activeClient: currentClient,
      activeDevis: currentDevis,
      activeChantier: currentChantier,
      activeFacture: currentFacture,
      activeEmploye: currentEmploye,
      activePlanning: currentPlanning,
    },
    enterpriseMemory: metadata?.appData
      ? {
          entreprise: metadata.appData.parametres?.entreprise,
          tva: metadata.appData.parametres?.tva,
          employesCount: metadata.appData.employes.length,
          fournituresCount: metadata.appData.bibliothequeEntreprise?.entries?.length ?? 0,
          bibliothequeCount: metadata.appData.bibliothequeEntreprise?.entries?.length ?? 0,
        }
      : memory.enterpriseMemory,
    operationalTasks: nextTasks.slice(-20),
    history,
  };
}

/** Réinitialise uniquement le workflow actif (sans supprimer l'historique). */
export function resetAssistantWorkflow(memory: AssistantMemory): AssistantMemory {
  const tasks: AssistantOperationalTask[] = (memory.operationalTasks ?? []).map(
    (t) =>
      t.status === "in_progress"
        ? { ...t, status: "cancelled" as const, updatedAt: Date.now() }
        : t,
  );
  return {
    ...memory,
    pendingAction: undefined,
    pendingMissingField: undefined,
    pendingEntityType: undefined,
    pendingEntityData: undefined,
    awaitingAnswer: false,
    lastQuestionAsked: undefined,
    operationalTasks: tasks,
  };
}

/** Réinitialise conversation temporaire + workflow, sans toucher aux données Batimum. */
export function resetAssistantConversation(memory: AssistantMemory): AssistantMemory {
  const reset = resetAssistantWorkflow(memory);
  return {
    ...reset,
    lastIntent: undefined,
    lastModule: undefined,
    lastTopic: undefined,
    immediate: { message: undefined, parsedAt: Date.now() },
    inactiveTopics: [],
    history: [],
  };
}
