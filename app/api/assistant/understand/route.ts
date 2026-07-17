import { NextResponse } from "next/server";
import { aiService } from "@/lib/ai/ai-service";
import { tryLocalAssistantUnderstanding } from "@/lib/batimum-assistant-local-bridge";
import { understandWithOpenAi } from "@/lib/batimum-assistant-ai-server";
import { LOCAL_UNDERSTAND_THRESHOLD } from "@/lib/batimum-assistant-understand";
import type {
  AssistantSessionContext,
  AssistantUnderstandResponse,
} from "@/lib/batimum-assistant-types";
import {
  AI_CREDIT_LABEL,
  LOCAL_CREDIT_LABEL,
  shouldCallAssistantUnderstandApi,
} from "@/lib/batimum-assistant-routing";
import { checkUserAiQuota } from "@/lib/ai-usage-store";
import {
  extractBearerToken,
  getAuthorizationDebugHint,
  isMumIaAuthContext,
  requireMumIaAuth,
} from "@/lib/supabase-auth-server";
import { generateId } from "@/lib/utils";
import { logAssistantDebug, logAssistantMode } from "@/lib/batimum-assistant-debug";
import { isPlanningAssignMessage } from "@/lib/batimum-assistant-planning";

export const runtime = "nodejs";

const ROUTE_NAME = "/api/assistant/understand";

type UnderstandRequestBody = {
  message?: string;
  session?: AssistantSessionContext;
  app_context?: Record<string, unknown>;
  currentPage?: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  activeWorkflow?: Record<string, unknown>;
  knownClients?: unknown;
  knownEmployees?: unknown;
  knownSites?: unknown;
  knownQuotes?: unknown;
  knownInvoices?: unknown;
  dashboardStats?: Record<string, unknown>;
};

function logAssistantAuthDiagnostic(
  request: Request,
  details: Record<string, unknown>,
) {
  const bearer = extractBearerToken(request);
  console.log("[Assistant] auth diagnostic", {
    route: ROUTE_NAME,
    ...details,
    hasAuthorizationHeader: Boolean(bearer),
    bearerPrefix: bearer ? bearer.slice(0, 10) : null,
  });
}

export async function POST(request: Request) {
  console.log("[Assistant] route called", { route: ROUTE_NAME, method: "POST" });

  const authResult = await requireMumIaAuth(request);
  if (!isMumIaAuthContext(authResult)) {
    logAssistantAuthDiagnostic(request, {
      userDetected: false,
      sessionDetected: false,
      refusalReason: getAuthorizationDebugHint(request),
    });
    return authResult;
  }

  logAssistantAuthDiagnostic(request, {
    userDetected: true,
    sessionDetected: true,
    userId: authResult.user.id,
    authSource: authResult.authSource,
    refusalReason: null,
  });

  let body: UnderstandRequestBody;
  try {
    body = (await request.json()) as UnderstandRequestBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Corps de requête invalide" },
      { status: 400 },
    );
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json(
      { success: false, error: "Message vide" },
      { status: 400 },
    );
  }

  const session = body.session;
  const appContext = {
    ...(body.app_context ?? {}),
    message,
    currentPage: body.currentPage,
    conversationHistory: body.conversationHistory ?? session?.recent_messages,
    activeWorkflow: body.activeWorkflow,
    knownClients: body.knownClients ?? body.app_context?.knownClients,
    knownEmployees: body.knownEmployees ?? body.app_context?.knownEmployees,
    knownSites: body.knownSites ?? body.app_context?.knownSites,
    knownQuotes: body.knownQuotes ?? body.app_context?.knownQuotes,
    knownInvoices: body.knownInvoices ?? body.app_context?.knownInvoices,
    dashboardStats: body.dashboardStats ?? body.app_context?.dashboardStats,
    recent_clients: body.knownClients ?? body.app_context?.recent_clients,
    recent_employes: body.knownEmployees ?? body.app_context?.recent_employes,
    recent_chantiers: body.knownSites ?? body.app_context?.recent_chantiers,
    recent_devis: body.knownQuotes ?? body.app_context?.recent_devis,
    recent_factures: body.knownInvoices ?? body.app_context?.recent_factures,
    dashboard_stats: body.dashboardStats ?? body.app_context?.dashboard_stats,
  };

  const forceOpenAiForPlanning = isPlanningAssignMessage(message);

  logAssistantDebug("understand_route_start", {
    message,
    forceOpenAiForPlanning,
    hasEmployees: Array.isArray(appContext.recent_employes)
      ? appContext.recent_employes.length
      : 0,
    hasSites: Array.isArray(appContext.recent_chantiers)
      ? appContext.recent_chantiers.length
      : 0,
    hasClients: Array.isArray(appContext.recent_clients)
      ? appContext.recent_clients.length
      : 0,
    conversationHistoryLength: Array.isArray(appContext.conversationHistory)
      ? appContext.conversationHistory.length
      : 0,
    activeWorkflow: Boolean(appContext.activeWorkflow),
  });

  const local = tryLocalAssistantUnderstanding(message, session);
  const shouldUseAssistantGpt = shouldCallAssistantUnderstandApi(message, {
    hasPendingAction: Boolean(session?.pending_intent),
    hasPendingIntent: Boolean(session?.pending_intent),
  });

  if (
    !forceOpenAiForPlanning &&
    !shouldUseAssistantGpt &&
    local &&
    local.confidence >= LOCAL_UNDERSTAND_THRESHOLD &&
    local.missing_fields.length === 0
  ) {
    logAssistantMode("local", "LOCAL", {
      intent: local.intent,
      route: ROUTE_NAME,
    });
    logAssistantDebug("understand_route_local", {
      mode: "local",
      message,
      intent: local.intent,
      entities: local.data,
      fallback: false,
    });
    console.log("[Assistant] local understanding", {
      route: ROUTE_NAME,
      intent: local.intent,
      usedAi: false,
    });
    return NextResponse.json({
      success: true,
      understanding: local,
      used_ai: false,
      credit_label: LOCAL_CREDIT_LABEL,
    } satisfies AssistantUnderstandResponse);
  }

  if (!aiService.isConfiguredForMode("assistant")) {
    if (local) {
      logAssistantMode("local", "LOCAL", {
        reason: "openai_not_configured",
        intent: local.intent,
      });
      return NextResponse.json({
        success: true,
        understanding: local,
        used_ai: false,
        credit_label: LOCAL_CREDIT_LABEL,
      } satisfies AssistantUnderstandResponse);
    }
    return NextResponse.json({
      success: false,
      code: "missing_key",
      error:
        "Assistant OpenAI non configuré — ajoutez OPENAI_ASSISTANT_API_KEY (ou OPENAI_API_KEY en fallback).",
      used_ai: false,
    } satisfies AssistantUnderstandResponse);
  }

  const quota = await checkUserAiQuota(authResult.user.id);
  if (!quota.allowed) {
    console.log("[Assistant] quota refused", {
      route: ROUTE_NAME,
      userId: authResult.user.id,
      refusalReason: quota.message ?? "quota limit",
    });
    return NextResponse.json({
      success: false,
      quota_exceeded: true,
      error: quota.message ?? "Quota IA épuisé",
      used_ai: false,
    } satisfies AssistantUnderstandResponse);
  }

  const generationId = `assistant-understand-${generateId()}`;
  const aiResult = await understandWithOpenAi({
    message,
    appContext,
    session,
    userId: authResult.user.id,
    operationId: generationId,
  });

  if (!aiResult.understanding) {
    if (local) {
      logAssistantMode("assistant_openai_fallback_local", "LOCAL", {
        reason: aiResult.error ?? "openai_understanding_null",
        intent: local.intent,
      });
    }
    logAssistantDebug("understand_route_fallback", {
      mode: forceOpenAiForPlanning ? "assistant_openai" : "local",
      message,
      fallback: true,
      reason: aiResult.error ?? "openai_understanding_null",
      localIntent: local?.intent,
    });
    if (local) {
      return NextResponse.json({
        success: true,
        understanding: local,
        used_ai: false,
        credit_label: LOCAL_CREDIT_LABEL,
      } satisfies AssistantUnderstandResponse);
    }
    return NextResponse.json({
      success: false,
      error: aiResult.error ?? "Compréhension impossible",
      code: aiResult.code,
      used_ai: false,
    } satisfies AssistantUnderstandResponse);
  }

  const response: AssistantUnderstandResponse = {
    success: true,
    understanding: aiResult.understanding,
    llm: aiResult.llm,
    used_ai: true,
    credit_label: AI_CREDIT_LABEL,
  };

  logAssistantMode("assistant_openai", "OPENAI", {
    intent: aiResult.llm?.intent ?? aiResult.understanding.intent,
    route: ROUTE_NAME,
  });
  logAssistantDebug("understand_route_openai", {
    mode: "assistant_openai",
    message,
    intent: aiResult.llm?.intent ?? aiResult.understanding.intent,
    entities: aiResult.llm?.entities,
    confidence: aiResult.llm?.confidence,
    fallback: false,
  });

  console.log("[Assistant] openai understanding", {
    route: ROUTE_NAME,
    userId: authResult.user.id,
    intent: aiResult.understanding.intent,
    llmIntent: aiResult.llm?.intent,
    usedAi: true,
  });

  return NextResponse.json(response);
}
