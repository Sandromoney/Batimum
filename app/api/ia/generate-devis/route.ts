import {
  AI_DEVIS_JSON_SCHEMA,
  buildAiDevisSystemPrompt,
  buildAiDevisUserPrompt,
  type AiDevisGenerateRequest,
} from "@/lib/ai-devis";
import { verifyAndCompleteAiDevis } from "@/lib/ai-devis-verification";
import type { BtpNiveauPrix } from "@/lib/btp-tarifs-reference";
import type { BibliothequeEntrepriseEntry, TypeChantier } from "@/lib/types";
import { normalizeParametres } from "@/lib/parametres";
import {
  classifyOpenAiError,
  getOpenAiKeyEnvNameForMode,
  getOpenAiModelForMode,
  isOpenAiConfigured,
  logMumIa,
  openAiNotConfiguredResponse,
} from "@/lib/openai-server";
import { checkUserAiQuota } from "@/lib/ai-usage-store";
import { getMumIaUserMessage } from "@/lib/mum-ia-errors";
import { mumIaServerDebug } from "@/lib/mum-ia-debug";
import {
  attachMumIaDevDebug,
  logMumIaOpenAiResponse,
  logMumIaRouteError,
} from "@/lib/mum-ia-server-diagnostics";
import {
  buildExploitableMumDevis,
  TECHNICAL_FAIL_MESSAGE,
} from "@/lib/mum-ia-generate-devis-pipeline";
import { logMumGenerate } from "@/lib/mum-ia-json-extract";
import { isPrivateBetaTestEmail } from "@/lib/private-beta";
import { isMumIaAuthContext, requireMumIaAuth } from "@/lib/supabase-auth-server";
import { aiService } from "@/lib/ai/ai-service";
import { NextResponse } from "next/server";

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

function parseRequestBody(body: unknown): AiDevisGenerateRequest | null {
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
  const forceWithHypotheses = Boolean(data.forceWithHypotheses);

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

  const reponsesQuestions: Record<string, string> = {};
  if (data.reponsesQuestions && typeof data.reponsesQuestions === "object") {
    for (const [key, value] of Object.entries(
      data.reponsesQuestions as Record<string, unknown>,
    )) {
      const trimmed = String(value ?? "").trim();
      if (trimmed) reponsesQuestions[key] = trimmed;
    }
  }

  const hypothesesFromAnalysis = Array.isArray(data.hypothesesFromAnalysis)
    ? data.hypothesesFromAnalysis
        .map((item) => String(item).trim())
        .filter(Boolean)
    : undefined;

  const lotsIdentifies = Array.isArray(data.lotsIdentifies)
    ? data.lotsIdentifies.map((item) => String(item).trim()).filter(Boolean)
    : undefined;

  const bibliothequeEntries = Array.isArray(data.bibliothequeEntries)
    ? (data.bibliothequeEntries as BibliothequeEntrepriseEntry[])
    : undefined;

  const coefficientRegionalManuel =
    data.coefficientRegionalManuel === null
      ? null
      : data.coefficientRegionalManuel != null
        ? Number(data.coefficientRegionalManuel)
        : undefined;

  const departementPrincipal = data.departementPrincipal
    ? String(data.departementPrincipal).trim()
    : undefined;

  const ratioEntries = Array.isArray(data.ratioEntries)
    ? (data.ratioEntries as import("@/lib/types").BibliothequeRatioEntry[])
    : undefined;

  const entreprisePriceLibrary =
    data.entreprisePriceLibrary &&
    typeof data.entreprisePriceLibrary === "object"
      ? (data.entreprisePriceLibrary as import("@/lib/types").EntreprisePriceLibrary)
      : undefined;

  const parametresSnapshot =
    data.parametresSnapshot && typeof data.parametresSnapshot === "object"
      ? (data.parametresSnapshot as AiDevisGenerateRequest["parametresSnapshot"])
      : undefined;

  const companyId = data.companyId ? String(data.companyId).trim() : undefined;

  return {
    descriptionChantier,
    regionCode,
    regionLabel,
    departementCode,
    departementLabel,
    typeChantier,
    tauxTVA,
    niveauPrix,
    forceWithHypotheses,
    reponsesQuestions:
      Object.keys(reponsesQuestions).length > 0 ? reponsesQuestions : undefined,
    hypothesesFromAnalysis,
    lotsIdentifies,
    bibliothequeEntries,
    coefficientRegionalManuel:
      coefficientRegionalManuel != null && !Number.isNaN(coefficientRegionalManuel)
        ? coefficientRegionalManuel
        : data.coefficientRegionalManuel === null
          ? null
          : undefined,
    departementPrincipal,
    ratioEntries,
    entreprisePriceLibrary,
    parametresSnapshot,
    companyId,
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
        code: "too_short",
        message: getMumIaUserMessage("too_short"),
      },
      { status: 400 },
    );
  }

  const generationId =
    body && typeof body === "object" && "generationId" in body
      ? String((body as Record<string, unknown>).generationId ?? "").trim()
      : "";

  const authResult = await requireMumIaAuth(request);
  if (!isMumIaAuthContext(authResult)) {
    return authResult;
  }
  const { user: authUser, companyId } = authResult;

  console.log("[MUM IA] generate auth ok", {
    userId: authUser.id,
    companyId,
    authSource: authResult.authSource,
  });

  const bypassQuota =
    isPrivateBetaTestEmail(authUser.email ?? "") ||
    (process.env.NODE_ENV === "development" &&
      process.env.MUM_IA_SKIP_QUOTA === "true");

  if (!bypassQuota) {
    const quota = await checkUserAiQuota(authUser.id);
    if (quota.limitReached) {
      return NextResponse.json(
        attachMumIaDevDebug(
          {
            success: false,
            message: quota.message ?? getMumIaUserMessage("quota_exceeded"),
            quota: {
              used: quota.used,
              limit: quota.limit,
              remaining: 0,
              monthlyIncluded: quota.monthlyIncluded,
              packCredits: 0,
              renewalDate: quota.renewalDate,
              periodStart: quota.periodStart,
              periodEnd: quota.periodEnd,
            },
            code: "ai_quota_exceeded",
          },
          quota.message ?? "Quota exceeded (100/100 MUM IA)",
        ),
        { status: 429 },
      );
    }
    if (!quota.storageAvailable) {
      console.warn("[MUM IA] quota storage unavailable before generation", {
        userId: authUser.id,
      });
    }
  }

  if (!isOpenAiConfigured()) {
    return NextResponse.json(openAiNotConfiguredResponse(), { status: 503 });
  }

  const model = getOpenAiModelForMode("mum_devis");
  const keyEnv = getOpenAiKeyEnvNameForMode("mum_devis");
  const startedAt = Date.now();
  const userPrompt = buildAiDevisUserPrompt(input);

  try {
    logMumGenerate("route appelée", "/api/ia/generate-devis");
    logMumGenerate("modèle", model);
    logMumGenerate("clé env utilisée", keyEnv);
    logMumGenerate("mode", "mum_devis");

    logMumIa("info", "Génération devis IA", {
      model,
      keyEnv,
      mode: "mum_devis",
      region: input.regionLabel,
      typeChantier: input.typeChantier,
      niveauPrix: input.niveauPrix,
      forceWithHypotheses: input.forceWithHypotheses,
    });
    mumIaServerDebug("generate_request", {
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
      systemPrompt: buildAiDevisSystemPrompt(),
      maxTokens: 12000,
      jsonSchema: {
        name: "batimum_devis_ia",
        schema: AI_DEVIS_JSON_SCHEMA,
        strict: true,
      },
      context: {
        route: "generate-devis",
        region: input.regionLabel,
        typeChantier: input.typeChantier,
      },
      credits: bypassQuota
        ? undefined
        : {
            userId: authUser.id,
            operationId: generationId,
            category: "mum_devis",
            checkBefore: true,
            // Crédit uniquement après devis exploitable (ci-dessous)
            trackAfterSuccess: false,
          },
    });

    const rawText = aiResult.content?.trim() ?? null;
    const rawStatus =
      aiResult.raw &&
      typeof aiResult.raw === "object" &&
      "status" in (aiResult.raw as object)
        ? String((aiResult.raw as { status?: unknown }).status ?? "")
        : "";

    logMumGenerate("statut OpenAI", {
      success: aiResult.success,
      code: aiResult.code,
      httpStatus: aiResult.httpStatus,
      status: rawStatus || null,
      error: aiResult.error,
      contentLength: rawText?.length ?? 0,
    });

    if (aiResult.raw) {
      logMumIaOpenAiResponse({
        route: "generate-devis",
        response: aiResult.raw,
        content: rawText,
      });
    }

    mumIaServerDebug("generate_response", {
      durationMs: aiResult.durationMs,
      rawLength: rawText?.length ?? 0,
      rawPreview: rawText?.slice(0, 400),
    });

    if (!aiResult.success || !rawText) {
      logMumGenerate("erreur exacte", {
        stage: "empty_or_failed_openai",
        error: aiResult.error,
        code: aiResult.code,
        stack: new Error().stack,
      });
      return NextResponse.json(
        attachMumIaDevDebug(
          {
            success: false,
            code: aiResult.code ?? "generation_failed",
            message: TECHNICAL_FAIL_MESSAGE,
          },
          aiResult.error ?? "empty OpenAI response",
        ),
        { status: aiResult.httpStatus ?? 502 },
      );
    }

    const built = await buildExploitableMumDevis({
      rawText,
      defaultVatRate: input.tauxTVA,
      chantierDescription: input.descriptionChantier,
    });

    if (!built.result) {
      logMumGenerate("erreur exacte", {
        stage: "no_exploitable_devis",
        missingFields: built.missingFields,
        stats: built.stats,
        repaired: built.repaired,
        stack: new Error().stack,
      });
      return NextResponse.json(
        attachMumIaDevDebug(
          {
            success: false,
            code: "generation_failed",
            message: TECHNICAL_FAIL_MESSAGE,
            missingFields: built.missingFields,
            stats: built.stats,
          },
          `Validation: ${built.missingFields.join(", ") || "devis vide"} | sections raw=${built.stats.rawSectionsCount} lines raw=${built.stats.rawLinesCount} → norm ${built.stats.normalizedSectionsCount}/${built.stats.normalizedLinesCount}`,
        ),
        { status: 502 },
      );
    }

    logMumGenerate("devis OK", {
      sections: built.stats.normalizedSectionsCount,
      lines: built.stats.normalizedLinesCount,
      repaired: built.repaired,
    });

    // Quota déjà réservé au clic « Analyser et préparer le devis » (pas de 2e débit ici).

    const { devis: result, rapport } = verifyAndCompleteAiDevis(built.result, {
      descriptionChantier: input.descriptionChantier,
      lotsIdentifies: input.lotsIdentifies,
      reponsesQuestions: input.reponsesQuestions,
      hypothesesFromAnalysis: input.hypothesesFromAnalysis,
      regionCode: input.regionCode,
      departementCode: input.departementCode,
      niveauPrix: input.niveauPrix,
      tauxTVA: input.tauxTVA,
      bibliothequeEntries: input.bibliothequeEntries,
      entreprisePriceLibrary: input.entreprisePriceLibrary,
      parametres: input.parametresSnapshot
        ? {
            ...normalizeParametres({}),
            fournisseurs: input.parametresSnapshot.fournisseurs,
            tarifsFournisseurs: input.parametresSnapshot.tarifsFournisseurs,
            entreprisePriceLibrary: input.parametresSnapshot.entreprisePriceLibrary,
          }
        : undefined,
      companyId: input.companyId ?? companyId,
      coefficientRegionalManuel: input.coefficientRegionalManuel,
      ratioEntries: input.ratioEntries,
    });

    let quotaPayload:
      | {
          used: number;
          limit: number;
          remaining: number;
          monthlyIncluded: number;
          packCredits: number;
          renewalDate: string;
          periodStart: string;
          periodEnd: string;
        }
      | undefined;

    if (!bypassQuota) {
      const current = await checkUserAiQuota(authUser.id);
      quotaPayload = {
        used: current.used,
        limit: current.limit,
        remaining: Math.max(0, current.limit - current.used),
        monthlyIncluded: current.monthlyIncluded,
        packCredits: current.packCredits,
        renewalDate: current.renewalDate,
        periodStart: current.periodStart,
        periodEnd: current.periodEnd,
      };
    }

    return NextResponse.json({
      success: true,
      devis: result,
      rapportVerification: rapport,
      model,
      durationMs: Date.now() - startedAt,
      quota: quotaPayload,
    });
  } catch (error) {
    const detail = logMumIaRouteError({
      route: "generate-devis",
      error,
      userId: authUser.id,
      requestBody: input,
      extra: { generationId: generationId || undefined, companyId },
    });
    const classified = classifyOpenAiError(error, model);
    mumIaServerDebug("generate_error", {
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
          message: TECHNICAL_FAIL_MESSAGE,
        },
        classified.message || detail,
      ),
      { status: classified.httpStatus },
    );
  }
}
