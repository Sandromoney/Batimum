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
    return NextResponse.json(openAiNotConfiguredResponse(), { status: 503 });
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
          "Paramètres incomplets. Décrivez le chantier (10 caractères min.), la région, le département, le type, la TVA et le niveau de prix.",
      },
      { status: 400 },
    );
  }

  const client = createOpenAiClient();
  if (!client) {
    return NextResponse.json(openAiNotConfiguredResponse(), { status: 503 });
  }

  const model = getOpenAiModel();

  try {
    logMumIa("info", "Génération devis IA", {
      model,
      region: input.regionLabel,
      typeChantier: input.typeChantier,
      niveauPrix: input.niveauPrix,
      forceWithHypotheses: input.forceWithHypotheses,
    });

    const response = await client.responses.create({
      model,
      instructions: buildAiDevisSystemPrompt(),
      input: buildAiDevisUserPrompt(input),
      text: {
        format: {
          type: "json_schema",
          name: "batimum_devis_ia",
          schema: AI_DEVIS_JSON_SCHEMA,
          strict: true,
        },
      },
    });

    const rawText = response.output_text?.trim();
    if (!rawText) {
      return NextResponse.json(
        { success: false, message: "Réponse IA vide. Réessayez." },
        { status: 502 },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { success: false, message: "Format JSON IA invalide. Réessayez." },
        { status: 502 },
      );
    }

    const normalized = normalizeAiDevisResult(parsed);
    if (!normalized) {
      return NextResponse.json(
        { success: false, message: "Structure de devis IA invalide. Réessayez." },
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

    return NextResponse.json({
      success: true,
      devis: result,
      rapportVerification: rapport,
      model,
    });
  } catch (error) {
    const classified = classifyOpenAiError(error, model);
    return NextResponse.json(
      {
        success: false,
        code: classified.code,
        message: classified.message,
      },
      { status: classified.httpStatus },
    );
  }
}
