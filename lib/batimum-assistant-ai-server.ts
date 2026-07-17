import { aiService } from "@/lib/ai/ai-service";
import {
  BATIMUM_UNDERSTAND_SYSTEM_PROMPT,
  buildUnderstandUserPayload,
  parseAssistantUnderstandingJson,
  type AssistantUnderstandRequestPayload,
} from "@/lib/batimum-assistant-understand";
import type {
  AssistantAiUnderstanding,
  AssistantSessionContext,
} from "@/lib/batimum-assistant-types";
import { logAssistantDebug, logAssistantMode } from "@/lib/batimum-assistant-debug";
import {
  getOpenAiKeyEnvNameForMode,
  logMumIa,
} from "@/lib/openai-server";

export { BATIMUM_UNDERSTAND_SYSTEM_PROMPT as BATIMUM_ASSISTANT_SYSTEM_PROMPT };

export function buildAssistantUserPayload(
  message: string,
  appContext: Record<string, unknown>,
  session?: AssistantSessionContext,
): string {
  const payload: AssistantUnderstandRequestPayload = {
    message,
    currentPage:
      typeof appContext.currentPage === "string"
        ? appContext.currentPage
        : undefined,
    conversationHistory: session?.recent_messages,
    activeWorkflow: session
      ? {
          pending_intent: session.pending_intent,
          pending_data: session.pending_data,
          missing_fields: session.missing_fields,
          awaiting_answer: session.awaiting_answer,
        }
      : undefined,
    knownClients: Array.isArray(appContext.recent_clients)
      ? (appContext.recent_clients as AssistantUnderstandRequestPayload["knownClients"])
      : Array.isArray(appContext.knownClients)
        ? (appContext.knownClients as AssistantUnderstandRequestPayload["knownClients"])
        : undefined,
    knownEmployees: Array.isArray(appContext.recent_employes)
      ? (appContext.recent_employes as AssistantUnderstandRequestPayload["knownEmployees"])
      : Array.isArray(appContext.knownEmployees)
        ? (appContext.knownEmployees as AssistantUnderstandRequestPayload["knownEmployees"])
        : undefined,
    knownSites: Array.isArray(appContext.recent_chantiers)
      ? (appContext.recent_chantiers as AssistantUnderstandRequestPayload["knownSites"])
      : Array.isArray(appContext.knownSites)
        ? (appContext.knownSites as AssistantUnderstandRequestPayload["knownSites"])
        : undefined,
    knownQuotes: Array.isArray(appContext.recent_devis)
      ? (appContext.recent_devis as AssistantUnderstandRequestPayload["knownQuotes"])
      : Array.isArray(appContext.knownQuotes)
        ? (appContext.knownQuotes as AssistantUnderstandRequestPayload["knownQuotes"])
        : undefined,
    knownInvoices: Array.isArray(appContext.recent_factures)
      ? (appContext.recent_factures as AssistantUnderstandRequestPayload["knownInvoices"])
      : Array.isArray(appContext.knownInvoices)
        ? (appContext.knownInvoices as AssistantUnderstandRequestPayload["knownInvoices"])
        : undefined,
    dashboardStats:
      (appContext.dashboard_stats as Record<string, unknown> | undefined) ??
      (appContext.dashboardStats as Record<string, unknown> | undefined),
  };

  return buildUnderstandUserPayload(payload);
}

export function parseAssistantAiJson(raw: string): AssistantAiUnderstanding | null {
  const parsed = parseAssistantUnderstandingJson(raw);
  return parsed?.api ?? null;
}

export async function understandWithOpenAi(params: {
  message: string;
  appContext: Record<string, unknown>;
  session?: AssistantSessionContext;
  userId?: string;
  operationId?: string;
}): Promise<{
  understanding: AssistantAiUnderstanding | null;
  llm?: import("@/lib/batimum-assistant-understand").AssistantLlmUnderstanding;
  error?: string;
  code?: string;
}> {
  const userPayload = buildAssistantUserPayload(
    params.message,
    params.appContext,
    params.session,
  );

  logAssistantMode("assistant_openai", "OPENAI", {
    operation: "assistant_understand",
  });

  const result = await aiService.call({
    mode: "assistant",
    messages: [{ role: "user", content: userPayload }],
    systemPrompt: BATIMUM_UNDERSTAND_SYSTEM_PROMPT,
    jsonObject: true,
    temperature: 0.1,
    context: {
      operation: "assistant_understand",
      currentPage: params.appContext.currentPage,
      userMessage: params.message,
    },
    credits:
      params.userId && params.operationId
        ? {
            userId: params.userId,
            operationId: params.operationId,
            checkBefore: true,
            trackAfterSuccess: true,
          }
        : undefined,
  });

  logAssistantDebug("understand_openai_call_meta", {
    keyEnvName: getOpenAiKeyEnvNameForMode("assistant"),
    model: result.model,
    openAiCalled: true,
    success: result.success,
    userMessage: params.message,
  });

  if (!result.success || !result.content) {
    logAssistantMode("assistant_openai", "OPENAI", {
      operation: "assistant_understand",
      failed: true,
      error: result.error,
    });
    logAssistantDebug("understand_openai_failed", {
      mode: "assistant_openai",
      error: result.error,
      code: result.code,
      fallback: true,
      reason: result.error,
    });
    return {
      understanding: null,
      error: result.error ?? "Compréhension impossible",
      code: result.code,
    };
  }

  logAssistantDebug("understand_openai_raw", {
    mode: "assistant_openai",
    keyEnvName: getOpenAiKeyEnvNameForMode("assistant"),
    model: result.model,
    openAiCalled: true,
    rawPreview: result.content.slice(0, 500),
    durationMs: result.durationMs,
    ...(process.env.ASSISTANT_DEBUG === "1"
      ? { rawResponse: result.content }
      : {}),
  });

  const parsed = parseAssistantUnderstandingJson(result.content);
  if (!parsed) {
    logMumIa("warn", "JSON assistant invalide", {
      content: result.content.slice(0, 200),
    });
    logAssistantDebug("understand_parse_failed", {
      mode: "assistant_openai",
      fallback: true,
      reason: "invalid_json",
    });
    return {
      understanding: null,
      error: "Impossible d'interpréter la réponse IA",
      code: "invalid_json",
    };
  }

  logAssistantDebug("understand_openai_parsed", {
    mode: "assistant_openai",
    intent: parsed.llm.intent,
    confidence: parsed.llm.confidence,
    entities: parsed.llm.entities,
    actionType: parsed.llm.actionType,
    missingFields: parsed.llm.missingFields,
    fallback: false,
  });

  return {
    understanding: parsed.api,
    llm: parsed.llm,
  };
}