import { enrichActionAnalysis } from "@/lib/assistant-batimum/assistant-actions";
import {
  cleanClientName,
  extractChantierType,
  extractNameFromMessage,
} from "@/lib/assistant-batimum/assistant-cleaners";
import {
  assistantIntentToSession,
  mergeMemoryWithSession,
  sessionIntentToAssistant,
  type AssistantMemory,
} from "@/lib/assistant-batimum/assistant-memory";
import { inferRole } from "@/lib/assistant-batimum/assistant-responses";
import { normalizeAssistantText } from "@/lib/assistant-batimum/normalize";
import type {
  AssistantAnalysis,
  AssistantBrainContext,
  AssistantIntent,
} from "@/lib/assistant-batimum/assistant-types";

const CONFIRM_PATTERN =
  /^(?:oui|confirme|confirmer|valide|vas[- ]?y|c'?est bon|go)\b/i;
const CANCEL_PATTERN = /^(?:annule|annuler|stop)\b/i;
const GREETING_PATTERN =
  /^(?:bonjour|salut|bonsoir|allo|hello|coucou|hey)\b/i;
const READY_PATTERN =
  /\b(?:t['']?es\s+pret|tu\s+es\s+pret|pret\s+a\s+travaill|etes[- ]vous\s+pret)\b/i;

function mapFieldToDataKey(field: string): keyof import("@/lib/batimum-assistant-types").AssistantAiData {
  if (field === "nom_complet") return "nom";
  if (field === "mum_ia_choice") return "description";
  return field as keyof import("@/lib/batimum-assistant-types").AssistantAiData;
}

function parseFieldValue(
  field: string,
  message: string,
  intent: AssistantIntent,
): string | undefined {
  const trimmed = message.trim();
  if (!trimmed) return undefined;

  if (field === "nom" || field === "nom_complet" || field === "client") {
    const n = normalizeAssistantText(trimmed);
    if (/^(?:dessus|celui-ci|celui-la|pareil|idem)$/.test(n)) {
      return undefined;
    }
    const fromExtract = extractNameFromMessage(trimmed, field === "client" ? "client" : "client");
    if (fromExtract) return fromExtract;
    if (trimmed.length <= 60 && !/\b(?:cree|creer|crée|ajoute|combien)\b/i.test(trimmed)) {
      return cleanClientName(trimmed);
    }
    return undefined;
  }

  if (field === "type_chantier") {
    return extractChantierType(trimmed) ?? cleanClientName(trimmed);
  }

  if (field === "date") {
    const n = normalizeAssistantText(trimmed);
    if (/demain/.test(n)) return "demain";
    if (/apr[eè]s[- ]?demain/.test(n)) return "après-demain";
    if (/aujourd.?hui/.test(n)) return "aujourd'hui";
    if (/^(?:comme hier|idem|pareil)$/.test(n)) return "comme hier";
    const day = trimmed.match(
      /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i,
    );
    if (day?.[1]) return day[1].toLowerCase();
    return trimmed;
  }

  if (field === "mum_ia_choice") {
    const n = normalizeAssistantText(trimmed);
    if (/^(?:oui|ok|avec|mum|ia)/.test(n)) return "oui";
    if (/^non/.test(n)) return "non";
    return trimmed;
  }

  if (field === "heure") {
    const match = trimmed.match(/\b(\d{1,2})[:hH]?(\d{2})?\b/);
    if (match) {
      const h = Math.min(23, Number(match[1]));
      const m = match[2] ? Math.min(59, Number(match[2])) : 0;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    return trimmed;
  }

  if (field === "telephone") {
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length >= 10) {
      return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim().slice(0, 14);
    }
    return trimmed;
  }

  if (field === "email") {
    const emailMatch = trimmed.match(/[\w.+-]+@[\w.-]+\.\w{2,}/i);
    if (emailMatch) return emailMatch[0].toLowerCase();
    return undefined;
  }

  if (field === "ville") {
    if (trimmed.length >= 2 && trimmed.length <= 60) return cleanClientName(trimmed);
    return undefined;
  }

  if (intent === "create_employe" && field === "nom") {
    return cleanClientName(trimmed);
  }

  return trimmed.length <= 80 ? trimmed : undefined;
}

function isLikelyShortAnswer(message: string): boolean {
  const n = normalizeAssistantText(message);
  if (n.length > 80) return false;
  if (CONFIRM_PATTERN.test(n) || CANCEL_PATTERN.test(n)) return false;
  if (GREETING_PATTERN.test(n) || READY_PATTERN.test(n)) return false;
  if (/\b(?:combien|nombre|pourquoi|comment)\b/.test(n) && n.length > 20) return false;
  return true;
}

export function getMergedMemory(context: AssistantBrainContext): AssistantMemory {
  return mergeMemoryWithSession(context.session, context.memory);
}

export function isAwaitingAnswer(context: AssistantBrainContext): boolean {
  const memory = getMergedMemory(context);
  return memory.awaitingAnswer;
}

/**
 * Interprète une réponse courte quand l'assistant attend une info (nom, client, date…).
 */
export function resolveAwaitingAnswer(
  message: string,
  context: AssistantBrainContext,
): AssistantAnalysis | null {
  const memory = getMergedMemory(context);
  const session = context.session;

  if (!memory.awaitingAnswer && !session?.missing_fields?.length) {
    return null;
  }

  const pendingIntent =
    sessionIntentToAssistant(memory.pendingAction ?? session?.pending_intent) ??
    (memory.lastIntent as AssistantIntent | undefined);

  if (!pendingIntent) return null;

  const field =
    memory.pendingMissingField ?? session?.missing_fields?.[0];
  if (!field) return null;

  if (!isLikelyShortAnswer(message)) {
    const pourMatch = message.match(/^(?:pour|chez)\s+(?:le\s+)?(?:client\s+)?(.+)/i);
    if (pourMatch?.[1]) {
      const client = cleanClientName(pourMatch[1]);
      if (client.length >= 2) {
        const data = { ...(memory.pendingEntityData ?? session?.pending_data ?? {}), client };
        return buildSlotAnalysis(pendingIntent, message, data, 0.94);
      }
    }
    return null;
  }

  const value = parseFieldValue(field, message, pendingIntent);
  if (!value) {
    const n = normalizeAssistantText(message.trim());
    if (/^(?:dessus|celui-ci|celui-la|pareil|idem)$/.test(n)) {
      return null;
    }
    return null;
  }

  const data: Record<string, unknown> = {
    ...(memory.pendingEntityData ?? session?.pending_data ?? {}),
    [mapFieldToDataKey(field)]: value,
  };

  if (field === "mum_ia_choice") {
    data.mum_ia_decided = true;
    if (value === "oui") {
      data.use_mum_ia = true;
      return {
        intent: "explain_mum_ia",
        role: "devis_ai",
        module: "mum-ia",
        actionType: "answer",
        confidence: 0.96,
        data: {
          reply: `Très bien, devis ${data.type_chantier ?? "travaux"} pour ${data.client}. Je vous oriente vers MUM IA pour le générer.`,
          navigate_mum_ia: true,
        },
        missingFields: [],
        needsConfirmation: false,
        creditType: "ai",
      };
    }
    data.use_mum_ia = false;
  }

  return buildSlotAnalysis(pendingIntent, message, data, 0.96);
}

function buildSlotAnalysis(
  intent: AssistantIntent,
  message: string,
  data: Record<string, unknown>,
  confidence: number,
): AssistantAnalysis {
  const enriched = enrichActionAnalysis(intent, message, data);
  const domainModule =
    intent === "create_client"
      ? "clients"
      : intent === "create_devis"
        ? "devis"
        : intent === "create_employe"
          ? "employes"
          : "core";

  return {
    intent,
    role: inferRole(intent, domainModule),
    module: domainModule,
    actionType: enriched.actionType,
    confidence,
    data: enriched.data,
    missingFields: enriched.missingFields,
    needsConfirmation: enriched.needsConfirmation,
    creditType: "free",
  };
}

/** « avec l'IA », « ou avec l'IA » selon contexte. */
export function resolveWithAiRequest(
  message: string,
  context: AssistantBrainContext,
): AssistantAnalysis | null {
  const n = normalizeAssistantText(message);
  if (!/\b(?:avec l'?ia|ou avec l'?ia|utilise l'?ia|fais[- ]?le avec l'?ia)\b/.test(n)) {
    return null;
  }

  const memory = getMergedMemory(context);
  const last =
    memory.lastIntent ??
    sessionIntentToAssistant(memory.pendingAction) ??
    (memory.lastTopic === "devis" ? "create_devis" : undefined);

  if (last === "create_devis" || memory.pendingAction === "create_quote") {
    return {
      intent: "explain_mum_ia",
      role: "devis_ai",
      module: "mum-ia",
      actionType: "answer",
      confidence: 0.92,
      data: {
        reply:
          "Je peux vous orienter vers MUM IA pour générer un devis détaillé. Ouvrez MUM IA ou dites-moi le client et le type de travaux pour préparer un brouillon.",
        navigate_mum_ia: true,
      },
      missingFields: [],
      needsConfirmation: false,
      creditType: "ai",
    };
  }

  if (
    last === "company_advice" ||
    last === "monthly_profit" ||
    last === "chantier_profitability"
  ) {
    return {
      intent: "company_advice",
      role: "dirigeant",
      module: "pilotage",
      actionType: "answer",
      confidence: 0.88,
      data: {
        reply:
          "Je peux lancer une analyse avancée de votre activité avec MUM IA (1 crédit IA). Souhaitez-vous que je prépare cette analyse ?",
        needs_ai_analysis: true,
      },
      missingFields: [],
      needsConfirmation: false,
      creditType: "ai",
    };
  }

  return {
    intent: "explain_mum_ia",
    role: "devis_ai",
    module: "mum-ia",
    actionType: "answer",
    confidence: 0.85,
    data: {
      reply:
        "Souhaitez-vous utiliser MUM IA pour créer un devis ou analyser une donnée de votre activité ?",
    },
    missingFields: [],
    needsConfirmation: false,
    creditType: "free",
  };
}
