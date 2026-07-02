import { NextResponse } from "next/server";
import {
  AI_ANALYSIS_JSON_SCHEMA,
  buildAiAnalysisSystemPrompt,
  buildAiAnalysisUserPrompt,
  normalizeAiChantierAnalysis,
  type AiAnalyzeChantierRequest,
} from "@/lib/ai-devis-analysis";
import type { BtpNiveauPrix } from "@/lib/btp-tarifs-reference";
import type { TypeChantier } from "@/lib/types";
import {
  classifyOpenAiError,
  createOpenAiClient,
  getOpenAiModel,
  isOpenAiConfigured,
  logMumIa,
  openAiNotConfiguredResponse,
} from "@/lib/openai-server";
import { getMumIaUserMessage } from "@/lib/mum-ia-errors";
import { mumIaServerDebug } from "@/lib/mum-ia-debug";
import {
  attachMumIaDevDebug,
  logMumIaOpenAiResponse,
  logMumIaRouteError,
} from "@/lib/mum-ia-server-diagnostics";
import { isMumIaAuthContext, requireMumIaAuth } from "@/lib/supabase-auth-server";

const VALID_TYPES_CHANTIER = new Set<TypeChantier>([
  "renovation",
  "maison_neuve",
  "extension",
  "salle_de_bain",
  "cuisine",
  "autre",
]);

const VALID_NIVEAUX = new Set<BtpNiveauPrix>([
  "economique",
  "standard",
  "premium",
]);

function parseRequestBody(body: unknown): AiAnalyzeChantierRequest | null {
  if (!body || typeof body !== "object") return null;
  const data = body as Record<string, unknown>;
  const descriptionChantier = String(data.descriptionChantier ?? "").trim();
  const regionCode = String(data.regionCode ?? "").trim();
  const regionLabel = String(data.regionLabel ?? "").trim();
  const departementCode = String(data.departementCode ?? "").trim();
  const departementLabel = String(data.departementLabel ?? "").trim();
  const typeChantier = data.typeChantier as TypeChantier;
  const tauxTVA = Number(data.tauxTVA);
  const niveauPrix = (data.niveauPrix as BtpNiveauPrix) || "standard";

  if (
    !descriptionChantier ||
    descriptionChantier.length < 10 ||
    !regionCode ||
    !regionLabel ||
    !departementCode ||
    !departementLabel ||
    !VALID_TYPES_CHANTIER.has(typeChantier) ||
    Number.isNaN(tauxTVA) ||
    !VALID_NIVEAUX.has(niveauPrix)
  ) {
    return null;
  }

  return {
    descriptionChantier,
    regionCode,
    regionLabel,
    departementCode,
    departementLabel,
    typeChantier,
    tauxTVA,
    niveauPrix,
  };
}

export async function POST(request: Request) {
  if (!isOpenAiConfigured()) {
    return NextResponse.json(
      attachMumIaDevDebug(
        openAiNotConfiguredResponse(),
        "Missing OPENAI_API_KEY",
      ),
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const input = parseRequestBody(body);
  if (!input) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Paramètres incomplets pour l'analyse du chantier.",
      },
      { status: 400 },
    );
  }

  const authResult = await requireMumIaAuth(request);
  if (!isMumIaAuthContext(authResult)) {
    return authResult;
  }
  const { user: authUser, companyId } = authResult;

  console.log("[MUM IA] analyze auth ok", {
    userId: authUser.id,
    companyId,
    authSource: authResult.authSource,
  });

  const client = createOpenAiClient();
  if (!client) {
    return NextResponse.json(openAiNotConfiguredResponse(), { status: 503 });
  }

  const model = getOpenAiModel();
  const startedAt = Date.now();
  const userPrompt = buildAiAnalysisUserPrompt(input);

  try {
    logMumIa("info", "Analyse chantier IA", {
      model,
      region: input.regionLabel,
      niveauPrix: input.niveauPrix,
    });
    mumIaServerDebug("analyze_request", {
      model,
      regionCode: input.regionCode,
      departementCode: input.departementCode,
      typeChantier: input.typeChantier,
      tauxTVA: input.tauxTVA,
      descriptionLength: input.descriptionChantier.length,
      promptPreview: userPrompt.slice(0, 500),
    });

    const response = await client.responses.create({
      model,
      instructions: buildAiAnalysisSystemPrompt(),
      input: userPrompt,
      text: {
        format: {
          type: "json_schema",
          name: "batimum_analyse_chantier",
          schema: AI_ANALYSIS_JSON_SCHEMA,
          strict: true,
        },
      },
    });

    logMumIaOpenAiResponse({ route: "analyze-chantier", response });

    const rawText = response.output_text?.trim();
    mumIaServerDebug("analyze_response", {
      durationMs: Date.now() - startedAt,
      rawLength: rawText?.length ?? 0,
      rawPreview: rawText?.slice(0, 400),
    });

    if (!rawText) {
      return NextResponse.json(
        attachMumIaDevDebug(
          {
            success: false,
            code: "invalid_response",
            message: getMumIaUserMessage("invalid_response"),
          },
          "JSON parsing failed: empty OpenAI response",
        ),
        { status: 502 },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseError) {
      const detail = logMumIaRouteError({
        route: "analyze-chantier",
        error: parseError,
        userId: authUser.id,
        requestBody: input,
        extra: { rawTextPreview: rawText.slice(0, 500) },
      });
      return NextResponse.json(
        attachMumIaDevDebug(
          {
            success: false,
            code: "invalid_response",
            message: getMumIaUserMessage("invalid_response"),
          },
          `JSON parsing failed: ${detail}`,
        ),
        { status: 502 },
      );
    }

    const analysis = normalizeAiChantierAnalysis(parsed);
    if (!analysis) {
      logMumIaRouteError({
        route: "analyze-chantier",
        error: new Error("normalizeAiChantierAnalysis returned null"),
        userId: authUser.id,
        requestBody: input,
        extra: { parsed },
      });
      return NextResponse.json(
        attachMumIaDevDebug(
          {
            success: false,
            code: "invalid_response",
            message: getMumIaUserMessage("invalid_response"),
          },
          "JSON parsing failed: analysis schema normalization rejected payload",
        ),
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      analysis,
      model,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const detail = logMumIaRouteError({
      route: "analyze-chantier",
      error,
      userId: authUser.id,
      requestBody: input,
    });
    const classified = classifyOpenAiError(error, model);
    mumIaServerDebug("analyze_error", {
      durationMs: Date.now() - startedAt,
      code: classified.code,
      message: classified.message,
      httpStatus: classified.httpStatus,
    });
    return NextResponse.json(
      attachMumIaDevDebug(
        {
          success: false,
          code: classified.code,
          message: getMumIaUserMessage("openai_unavailable"),
        },
        classified.message || detail,
      ),
      { status: classified.httpStatus },
    );
  }
}
