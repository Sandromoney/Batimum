import { NextResponse } from "next/server";
import {
  AI_DEVIS_JSON_SCHEMA,
  buildAiDevisSystemPrompt,
  buildAiDevisUserPrompt,
  normalizeAiDevisResult,
  type AiDevisGenerateRequest,
} from "@/lib/ai-devis";
import { verifyAndCompleteAiDevis } from "@/lib/ai-devis-verification";
import type { BtpNiveauPrix } from "@/lib/btp-tarifs-reference";
import type { BibliothequeEntrepriseEntry, TypeChantier } from "@/lib/types";
import {
  classifyOpenAiError,
  createOpenAiClient,
  getOpenAiModel,
  isOpenAiConfigured,
  logMumIa,
  openAiNotConfiguredResponse,
} from "@/lib/openai-server";
import { checkUserAiQuota, incrementUserAiUsage, buildQuotaSnapshotFromUsage } from "@/lib/ai-usage-store";
import { getMumIaUserMessage } from "@/lib/mum-ia-errors";
import { mumIaServerDebug } from "@/lib/mum-ia-debug";
import {
  attachMumIaDevDebug,
  logMumIaOpenAiResponse,
  logMumIaRouteError,
} from "@/lib/mum-ia-server-diagnostics";
import { isPrivateBetaTestEmail } from "@/lib/private-beta";
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

  const client = createOpenAiClient();
  if (!client) {
    return NextResponse.json(openAiNotConfiguredResponse(), { status: 503 });
  }

  const model = getOpenAiModel();
  const startedAt = Date.now();
  const userPrompt = buildAiDevisUserPrompt(input);

  try {
    logMumIa("info", "Génération devis IA", {
      model,
      region: input.regionLabel,
      typeChantier: input.typeChantier,
      niveauPrix: input.niveauPrix,
      forceWithHypotheses: input.forceWithHypotheses,
    });
    mumIaServerDebug("generate_request", {
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
      instructions: buildAiDevisSystemPrompt(),
      input: userPrompt,
      text: {
        format: {
          type: "json_schema",
          name: "batimum_devis_ia",
          schema: AI_DEVIS_JSON_SCHEMA,
          strict: true,
        },
      },
    });

    logMumIaOpenAiResponse({ route: "generate-devis", response });

    const rawText = response.output_text?.trim();
    mumIaServerDebug("generate_response", {
      durationMs: Date.now() - startedAt,
      rawLength: rawText?.length ?? 0,
      rawPreview: rawText?.slice(0, 400),
    });

    if (!rawText) {
      return NextResponse.json(
        { success: false, code: "invalid_response", message: getMumIaUserMessage("invalid_response") },
        { status: 502 },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseError) {
      console.error("[MUM IA] generate JSON parse error", parseError, rawText);
      return NextResponse.json(
        { success: false, code: "invalid_response", message: getMumIaUserMessage("invalid_response") },
        { status: 502 },
      );
    }

    const normalized = normalizeAiDevisResult(parsed);
    if (!normalized) {
      console.error("[MUM IA] generate normalize failed", parsed);
      return NextResponse.json(
        { success: false, code: "invalid_response", message: getMumIaUserMessage("invalid_response") },
        { status: 502 },
      );
    }

    const { devis: result, rapport } = verifyAndCompleteAiDevis(normalized, {
      descriptionChantier: input.descriptionChantier,
      lotsIdentifies: input.lotsIdentifies,
      reponsesQuestions: input.reponsesQuestions,
      hypothesesFromAnalysis: input.hypothesesFromAnalysis,
      regionCode: input.regionCode,
      departementCode: input.departementCode,
      niveauPrix: input.niveauPrix,
      tauxTVA: input.tauxTVA,
      bibliothequeEntries: input.bibliothequeEntries,
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
      const increment = await incrementUserAiUsage(
        authUser.id,
        generationId || undefined,
      );
      if (increment.error && !increment.error.includes("100 demandes")) {
        logMumIa("warn", "Compteur IA non incrémenté", {
          error: increment.error,
        });
      }
      if (increment.usage) {
        const snapshot = buildQuotaSnapshotFromUsage(increment.usage);
        quotaPayload = {
          used: snapshot.used,
          limit: snapshot.limit,
          remaining: snapshot.remaining,
          monthlyIncluded: snapshot.monthlyIncluded,
          packCredits: snapshot.packCredits,
          renewalDate: snapshot.renewalDate,
          periodStart: snapshot.periodStart,
          periodEnd: snapshot.periodEnd,
        };
      }
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
          message: getMumIaUserMessage("openai_unavailable"),
        },
        classified.message || detail,
      ),
      { status: classified.httpStatus },
    );
  }
}
