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
          "Paramètres incomplets pour l'analyse du chantier.",
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
    logMumIa("info", "Analyse chantier IA", {
      model,
      region: input.regionLabel,
      niveauPrix: input.niveauPrix,
    });

    const response = await client.responses.create({
      model,
      instructions: buildAiAnalysisSystemPrompt(),
      input: buildAiAnalysisUserPrompt(input),
      text: {
        format: {
          type: "json_schema",
          name: "batimum_analyse_chantier",
          schema: AI_ANALYSIS_JSON_SCHEMA,
          strict: true,
        },
      },
    });

    const rawText = response.output_text?.trim();
    if (!rawText) {
      return NextResponse.json(
        { success: false, message: "Réponse d'analyse vide." },
        { status: 502 },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { success: false, message: "Format JSON d'analyse invalide." },
        { status: 502 },
      );
    }

    const analysis = normalizeAiChantierAnalysis(parsed);
    if (!analysis) {
      return NextResponse.json(
        { success: false, message: "Structure d'analyse invalide." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      analysis,
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
