import { NextResponse } from "next/server";
import { aiService } from "@/lib/ai/ai-service";
import {
  AI_ANALYSIS_JSON_SCHEMA,
  buildAiAnalysisSystemPrompt,
  buildAiAnalysisUserPrompt,
  normalizeAiChantierAnalysisDetailed,
  type AiAnalyzeChantierRequest,
} from "@/lib/ai-devis-analysis";
import type { BtpNiveauPrix } from "@/lib/btp-tarifs-reference";
import type { TypeChantier } from "@/lib/types";
import {
  getOpenAiKeyEnvNameForMode,
  getOpenAiModelForMode,
  isOpenAiConfigured,
  logMumIa,
  openAiNotConfiguredResponse,
} from "@/lib/openai-server";
import { mumIaServerDebug } from "@/lib/mum-ia-debug";
import {
  attachMumIaDevDebug,
  logMumIaOpenAiResponse,
  logMumIaRouteError,
} from "@/lib/mum-ia-server-diagnostics";
import {
  formatMissingFieldsDebugMessage,
  logMumIaParseValidation,
} from "@/lib/mum-ia-openai-diagnostics";
import { extractJsonFromAiContent } from "@/lib/mum-ia-json-extract";
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

  if (!isOpenAiConfigured()) {
    return NextResponse.json(openAiNotConfiguredResponse(), { status: 503 });
  }

  const model = getOpenAiModelForMode("mum_devis");
  const keyEnv = getOpenAiKeyEnvNameForMode("mum_devis");
  const startedAt = Date.now();
  const userPrompt = buildAiAnalysisUserPrompt(input);

  try {
    console.log("[MUM FLOW] route appelée", "/api/ia/analyze-chantier");
    console.log("[MUM FLOW] userId", authUser.id);
    console.log("[MUM FLOW] companyId", companyId);
    console.log("[MUM FLOW] mode IA", "mum_devis");
    console.log("[MUM FLOW] modèle", model);
    console.log("[MUM FLOW] env de clé utilisée", keyEnv);

    logMumIa("info", "Analyse chantier IA", {
      model,
      keyEnv,
      region: input.regionLabel,
      niveauPrix: input.niveauPrix,
    });
    mumIaServerDebug("analyze_request", {
      model,
      keyEnv,
      regionCode: input.regionCode,
      departementCode: input.departementCode,
      typeChantier: input.typeChantier,
      tauxTVA: input.tauxTVA,
      descriptionLength: input.descriptionChantier.length,
      promptPreview: userPrompt.slice(0, 500),
    });

    const aiResult = await aiService.call({
      mode: "mum_devis",
      messages: [{ role: "user", content: userPrompt }],
      systemPrompt: buildAiAnalysisSystemPrompt(),
      // GPT-5 consomme des tokens de raisonnement — budget large obligatoire
      maxTokens: 16000,
      jsonSchema: {
        name: "batimum_analyse_chantier",
        schema: AI_ANALYSIS_JSON_SCHEMA,
        strict: false,
      },
      context: {
        route: "analyze-chantier",
        region: input.regionLabel,
      },
    });

    const rawText = aiResult.content?.trim() ?? null;
    console.log("[MUM FLOW] statut OpenAI", {
      success: aiResult.success,
      code: aiResult.code,
      model: aiResult.model,
    });
    console.log("[MUM FLOW] longueur réponse", rawText?.length ?? 0);
    console.log("[MUM FLOW] réponse brute", (rawText ?? "").slice(0, 2000));

    if (aiResult.raw) {
      logMumIaOpenAiResponse({
        route: "analyze-chantier",
        response: aiResult.raw,
        content: rawText,
      });
    }

    mumIaServerDebug("analyze_response", {
      durationMs: aiResult.durationMs,
      rawLength: rawText?.length ?? 0,
      rawPreview: rawText?.slice(0, 400),
    });

    if (!aiResult.success || !rawText) {
      console.error("[MUM FLOW] erreur exacte", {
        stage: "empty_openai",
        error: aiResult.error,
        code: aiResult.code,
      });
      logMumIaParseValidation({
        route: "analyze-chantier",
        stage: "empty_content",
        content: rawText,
        error: aiResult.error,
      });
      return NextResponse.json(
        attachMumIaDevDebug(
          {
            success: false,
            code: aiResult.code ?? "openai_error",
            message:
              aiResult.error ??
              "Analyse MUM IA indisponible pour le moment. Réessayez.",
          },
          aiResult.error ?? "empty OpenAI response",
        ),
        { status: aiResult.httpStatus ?? 502 },
      );
    }

    let parsed: unknown;
    try {
      const { jsonText, hadMarkdownFence } = extractJsonFromAiContent(rawText);
      if (hadMarkdownFence) {
        console.log("[MUM FLOW] markdown fence détecté (analyse)");
      }
      parsed = JSON.parse(jsonText);
      console.log("[MUM FLOW] JSON parsé", {
        keys:
          parsed && typeof parsed === "object"
            ? Object.keys(parsed as object)
            : [],
      });
      console.log("[MUM FLOW] clés racine", Object.keys((parsed as object) || {}));
    } catch (parseError) {
      const detail = logMumIaRouteError({
        route: "analyze-chantier",
        error: parseError,
        userId: authUser.id,
        requestBody: input,
        extra: { rawTextPreview: rawText.slice(0, 500) },
      });
      console.error("[MUM FLOW] erreur exacte", {
        stage: "json_parse",
        detail,
        stack: parseError instanceof Error ? parseError.stack : undefined,
      });
      logMumIaParseValidation({
        route: "analyze-chantier",
        stage: "json_parse",
        content: rawText,
        error: parseError,
        missingFields: ["JSON.parse (réponse non JSON / tronquée)"],
      });
      return NextResponse.json(
        attachMumIaDevDebug(
          {
            success: false,
            code: "invalid_response",
            message:
              "Analyse MUM IA : réponse JSON invalide. Réessayez dans quelques instants.",
          },
          formatMissingFieldsDebugMessage(
            ["JSON.parse (réponse non JSON / tronquée)"],
            `JSON parsing failed: ${detail}`,
          ),
        ),
        { status: 502 },
      );
    }

    const normalized = normalizeAiChantierAnalysisDetailed(parsed);
    console.log("[MUM FLOW] résultat normalisé", {
      lots: normalized.result?.lotsIdentifies?.length ?? 0,
      questions: normalized.result?.questions?.length ?? 0,
      missing: normalized.missingFields,
    });

    if (normalized.warnings.length > 0) {
      console.warn("[MUM FLOW] analyze warnings", normalized.warnings);
    }

    if (!normalized.result) {
      console.error("[MUM FLOW] erreur exacte", {
        stage: "normalize",
        missingFields: normalized.missingFields,
      });
      logMumIaParseValidation({
        route: "analyze-chantier",
        stage: "normalize",
        content: rawText,
        parsed,
        missingFields: normalized.missingFields,
        warnings: normalized.warnings,
      });
      logMumIaRouteError({
        route: "analyze-chantier",
        error: new Error("normalizeAiChantierAnalysis returned null"),
        userId: authUser.id,
        requestBody: input,
        extra: {
          parsed,
          missingFields: normalized.missingFields,
          warnings: normalized.warnings,
        },
      });
      return NextResponse.json(
        attachMumIaDevDebug(
          {
            success: false,
            code: "invalid_response",
            message:
              "Analyse MUM IA : structure de réponse non exploitable. Réessayez.",
            missingFields: normalized.missingFields,
          },
          formatMissingFieldsDebugMessage(normalized.missingFields),
        ),
        { status: 502 },
      );
    }

    console.log("[MUM FLOW] validation finale", "OK analyse");
    console.log("[MUM FLOW] réponse renvoyée au frontend", {
      success: true,
      lots: normalized.result.lotsIdentifies.length,
    });

    return NextResponse.json({
      success: true,
      analysis: normalized.result,
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
    mumIaServerDebug("analyze_error", {
      durationMs: Date.now() - startedAt,
      message: detail,
    });
    return NextResponse.json(
      attachMumIaDevDebug(
        {
          success: false,
          code: "openai_error",
          message:
            "Analyse MUM IA indisponible pour le moment. Réessayez dans quelques instants.",
        },
        detail,
      ),
      { status: 502 },
    );
  }
}
