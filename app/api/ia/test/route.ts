import { NextResponse } from "next/server";
import {
  checkUserAiQuota,
  classifyOpenAiError,
  createOpenAiClient,
  getOpenAiEnvDiagnostics,
  getOpenAiModel,
  isOpenAiConfigured,
  logMumIa,
  openAiNotConfiguredResponse,
} from "@/lib/openai-server";
import {
  extractBearerToken,
  getAuthorizationDebugHint,
  getAuthenticatedSupabaseUser,
  getCompanyIdForUser,
} from "@/lib/supabase-auth-server";

const TEST_MESSAGE = "Réponds simplement par OK";

type DiagnosticCheck = {
  ok: boolean;
  error: string | null;
};

type TestDiagnosticsPayload = {
  success: boolean;
  message?: string;
  model?: string;
  code?: string;
  checks: {
    authSupabase: DiagnosticCheck;
    company: DiagnosticCheck;
    quotaIa: DiagnosticCheck;
    openAiKey: DiagnosticCheck;
    openAiConnection: DiagnosticCheck;
    generationTest: DiagnosticCheck;
  };
  details: {
    hasAuthorizationHeader: boolean;
    hasBearerToken: boolean;
    bearerPrefix: string | null;
    userId: string | null;
    companyId: string | null;
    quotaRemaining: number | null;
    keySource: string | null;
  };
  debugMessage?: string;
  errorCode?: string;
  reply?: string;
};

export async function POST(request: Request) {
  const authHeader =
    request.headers.get("authorization") ?? request.headers.get("Authorization");
  const bearerToken = extractBearerToken(request);
  const authUser = await getAuthenticatedSupabaseUser(request);

  const checks: TestDiagnosticsPayload["checks"] = {
    authSupabase: {
      ok: Boolean(authUser),
      error: authUser ? null : getAuthorizationDebugHint(request),
    },
    company: {
      ok: Boolean(authUser?.id),
      error: authUser?.id ? null : "company introuvable (user.id absent)",
    },
    quotaIa: {
      ok: false,
      error: "quota non vérifié (auth manquante)",
    },
    openAiKey: {
      ok: isOpenAiConfigured(),
      error: isOpenAiConfigured() ? null : "OPENAI_API_KEY absente",
    },
    openAiConnection: {
      ok: false,
      error: "connexion OpenAI non testée",
    },
    generationTest: {
      ok: false,
      error: "génération test non exécutée",
    },
  };

  const payloadBase: Omit<TestDiagnosticsPayload, "success"> = {
    checks,
    details: {
      hasAuthorizationHeader: Boolean(authHeader),
      hasBearerToken: Boolean(bearerToken),
      bearerPrefix: bearerToken ? bearerToken.slice(0, 10) : null,
      userId: authUser?.id ?? null,
      companyId: authUser ? getCompanyIdForUser(authUser) : null,
      quotaRemaining: null,
      keySource: getOpenAiEnvDiagnostics().keySource,
    },
  };

  if (!authUser) {
    return NextResponse.json(
      {
        success: false,
        message: "Authentification Supabase échouée.",
        errorCode: "unauthenticated",
        ...payloadBase,
        debugMessage: checks.authSupabase.error ?? "Unauthorized",
      } satisfies TestDiagnosticsPayload,
      { status: 401 },
    );
  }

  if (!isOpenAiConfigured()) {
    return NextResponse.json(
      {
        success: false,
        message: "OPENAI_API_KEY absente.",
        errorCode: "missing_key",
        ...payloadBase,
        checks: {
          ...checks,
          quotaIa: { ok: true, error: null },
          openAiConnection: {
            ok: false,
            error: "OPENAI_API_KEY absente",
          },
          generationTest: {
            ok: false,
            error: "génération test impossible sans OPENAI_API_KEY",
          },
        },
        debugMessage: "Missing OPENAI_API_KEY",
      },
      { status: 503 },
    );
  }

  const bypassQuotaInDev =
    process.env.NODE_ENV === "development" &&
    process.env.MUM_IA_SKIP_QUOTA === "true";

  if (bypassQuotaInDev) {
    checks.quotaIa = {
      ok: true,
      error: "Quota bypassé en développement (MUM_IA_SKIP_QUOTA=true)",
    };
    payloadBase.details.quotaRemaining = null;
  } else {
    const quota = await checkUserAiQuota(authUser.id);
    checks.quotaIa = quota.allowed
      ? { ok: true, error: null }
      : { ok: false, error: quota.message ?? "quota bloqué" };
    payloadBase.details.quotaRemaining = Math.max(0, quota.limit - quota.used);

    if (!quota.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "Quota IA bloqué.",
          errorCode: "ai_quota_blocked",
          ...payloadBase,
        } satisfies TestDiagnosticsPayload,
        { status: 429 },
      );
    }
  }

  let message = TEST_MESSAGE;
  try {
    const body = await request.json();
    if (body && typeof body === "object" && typeof body.message === "string") {
      const trimmed = body.message.trim();
      if (trimmed) message = trimmed;
    }
  } catch {
    /* corps vide → message par défaut */
  }

  const client = createOpenAiClient();
  if (!client) {
    return NextResponse.json(openAiNotConfiguredResponse(), { status: 503 });
  }

  const model = getOpenAiModel();
  const diagnostics = getOpenAiEnvDiagnostics();

  try {
    logMumIa("info", "Test connexion OpenAI", {
      model,
      message,
      keySource: diagnostics.keySource,
    });

    const response = await client.responses.create({
      model,
      instructions:
        "Tu es l'assistant Batimum. Réponds brièvement en français, de manière professionnelle et amicale.",
      input: message,
    });

    const reply = response.output_text?.trim();
    if (!reply) {
      return NextResponse.json(
        {
          success: false,
          message: "Connexion OpenAI échouée (réponse vide).",
          errorCode: "openai_empty_response",
          ...payloadBase,
          checks: {
            ...checks,
            openAiConnection: {
              ok: false,
              error: "Réponse OpenAI vide",
            },
            generationTest: {
              ok: false,
              error: "génération test non exécutée (connexion OpenAI KO)",
            },
          },
          debugMessage: "OpenAI returned empty output_text",
        } satisfies TestDiagnosticsPayload,
        { status: 502 },
      );
    }

    checks.openAiConnection = { ok: true, error: null };

    const generationProbe = await client.responses.create({
      model,
      instructions:
        "Retourne STRICTEMENT un JSON valide avec les clés ok (boolean) et titre (string).",
      input: "Génération test devis MUM IA",
    });

    const generationProbeText = generationProbe.output_text?.trim() ?? "";
    let generationProbeJson: unknown = null;
    try {
      generationProbeJson = generationProbeText ? JSON.parse(generationProbeText) : null;
    } catch {
      generationProbeJson = null;
    }

    const generationOk = Boolean(
      generationProbeJson &&
        typeof generationProbeJson === "object" &&
        "ok" in generationProbeJson &&
        "titre" in generationProbeJson,
    );
    checks.generationTest = generationOk
      ? { ok: true, error: null }
      : {
          ok: false,
          error: "erreur parsing JSON sur génération test",
        };

    return NextResponse.json({
      success: true,
      message,
      reply,
      model,
      configured: true,
      keySource: diagnostics.keySource,
      checks,
      details: payloadBase.details,
    } satisfies TestDiagnosticsPayload);
  } catch (error) {
    const classified = classifyOpenAiError(error, model);
    checks.openAiConnection = {
      ok: false,
      error: classified.message || "erreur route 500",
    };
    checks.generationTest = {
      ok: false,
      error: "génération test non exécutée (connexion OpenAI KO)",
    };

    return NextResponse.json(
      {
        success: false,
        errorCode: classified.code,
        code: classified.code,
        message: "Connexion OpenAI échouée.",
        model,
        checks,
        details: payloadBase.details,
        ...(process.env.NODE_ENV === "development"
          ? { debugMessage: classified.message }
          : {}),
      } satisfies TestDiagnosticsPayload,
      { status: classified.httpStatus },
    );
  }
}
