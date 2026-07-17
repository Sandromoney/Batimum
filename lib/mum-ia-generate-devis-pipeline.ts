/**
 * Parse + normalisation + 1 réparation OpenAI (sans 2e crédit) pour generate-devis.
 */
import { aiService } from "@/lib/ai/ai-service";
import {
  AI_DEVIS_JSON_SCHEMA,
  buildAiDevisSystemPrompt,
  type AiDevisResult,
} from "@/lib/ai-devis";
import {
  extractJsonFromAiContent,
  isAnalysisOnlyPayload,
  logMumGenerate,
} from "@/lib/mum-ia-json-extract";
import { normalizeMumDevisResponse } from "@/lib/mum-ia-normalize-devis";
import { logMumIaParseValidation } from "@/lib/mum-ia-openai-diagnostics";
import { logMumIaOpenAiResponse } from "@/lib/mum-ia-server-diagnostics";

const TECHNICAL_FAIL_MESSAGE =
  "MUM IA n'a pas pu finaliser le devis. Aucun crédit n'a été consommé. Réessayez dans quelques instants.";

export { TECHNICAL_FAIL_MESSAGE };

function parseAndNormalize(
  rawText: string,
  defaultVatRate: number,
): {
  result: AiDevisResult | null;
  parsed: unknown;
  missingFields: string[];
  warnings: string[];
  stats: ReturnType<typeof normalizeMumDevisResponse>["stats"];
  parseError?: string;
} {
  const { jsonText, hadMarkdownFence } = extractJsonFromAiContent(rawText);
  if (hadMarkdownFence) {
    logMumGenerate("markdown fence détecté — JSON extrait");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    logMumGenerate("erreur exacte", {
      stage: "json_parse",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      preview: jsonText.slice(0, 800),
    });
    return {
      result: null,
      parsed: null,
      missingFields: ["JSON.parse (réponse non JSON / tronquée)"],
      warnings: [],
      stats: {
        rawKeys: [],
        rawSectionsCount: 0,
        rawLinesCount: 0,
        normalizedSectionsCount: 0,
        normalizedLinesCount: 0,
      },
      parseError: error instanceof Error ? error.message : String(error),
    };
  }

  logMumGenerate("JSON parsé", {
    keys:
      parsed && typeof parsed === "object"
        ? Object.keys(parsed as object)
        : [],
    preview: JSON.stringify(parsed).slice(0, 2000),
  });

  if (isAnalysisOnlyPayload(parsed)) {
    logMumGenerate("erreur exacte", {
      stage: "analysis_only",
      message:
        "Réponse d'analyse sans sections/lines chiffrées (analysis/questions/lots)",
    });
    return {
      result: null,
      parsed,
      missingFields: [
        "sections (réponse analyse uniquement — pas de devis chiffré)",
      ],
      warnings: ["Payload analysis/questions/lots sans sections"],
      stats: {
        rawKeys:
          parsed && typeof parsed === "object"
            ? Object.keys(parsed as object)
            : [],
        rawSectionsCount: 0,
        rawLinesCount: 0,
        normalizedSectionsCount: 0,
        normalizedLinesCount: 0,
      },
    };
  }

  const normalized = normalizeMumDevisResponse(parsed, { defaultVatRate });
  logMumGenerate("sections brutes", normalized.stats.rawSectionsCount);
  logMumGenerate("lignes brutes", normalized.stats.rawLinesCount);
  logMumGenerate("sections normalisées", normalized.stats.normalizedSectionsCount);
  logMumGenerate("lignes normalisées", normalized.stats.normalizedLinesCount);

  if (!normalized.result) {
    logMumGenerate("erreur exacte", {
      stage: "normalize",
      missingFields: normalized.missingFields,
      warnings: normalized.warnings.slice(0, 30),
    });
  }

  return {
    result: normalized.result,
    parsed,
    missingFields: normalized.missingFields,
    warnings: normalized.warnings,
    stats: normalized.stats,
  };
}

async function repairDevisOnce(params: {
  previousRaw: string;
  chantierDescription: string;
}): Promise<string | null> {
  const repairPrompt = [
    "La réponse précédente n'est PAS un devis chiffré.",
    "Transforme-la en devis JSON avec sections[].name et sections[].lines[] (designation, quantity, unit, unitPriceHT, totalHT, vatRate).",
    "Au moins 3 sections et 8 lignes. Retourne UNIQUEMENT le JSON, sans markdown.",
    "",
    "Description chantier :",
    params.chantierDescription,
    "",
    "Réponse précédente :",
    params.previousRaw.slice(0, 8000),
  ].join("\n");

  const repair = await aiService.call({
    mode: "mum_devis",
    messages: [{ role: "user", content: repairPrompt }],
    systemPrompt: buildAiDevisSystemPrompt(),
    maxTokens: 12000,
    jsonSchema: {
      name: "batimum_devis_ia",
      schema: AI_DEVIS_JSON_SCHEMA,
      strict: true,
    },
    context: { route: "generate-devis-repair" },
    credits: undefined,
  });

  if (repair.raw) {
    logMumIaOpenAiResponse({
      route: "generate-devis-repair",
      response: repair.raw,
      content: repair.content,
    });
  }

  logMumGenerate("réparation OpenAI", {
    success: repair.success,
    length: repair.content?.length ?? 0,
  });

  return repair.success && repair.content ? repair.content.trim() : null;
}

export async function buildExploitableMumDevis(params: {
  rawText: string;
  defaultVatRate: number;
  chantierDescription: string;
}): Promise<{
  result: AiDevisResult | null;
  repaired: boolean;
  missingFields: string[];
  warnings: string[];
  stats: ReturnType<typeof normalizeMumDevisResponse>["stats"];
}> {
  logMumGenerate("réponse brute", params.rawText.slice(0, 3000));

  let attempt = parseAndNormalize(params.rawText, params.defaultVatRate);
  if (attempt.result) {
    return {
      result: attempt.result,
      repaired: false,
      missingFields: [],
      warnings: attempt.warnings,
      stats: attempt.stats,
    };
  }

  logMumIaParseValidation({
    route: "generate-devis",
    stage: attempt.parseError ? "json_parse" : "normalize",
    content: params.rawText,
    parsed: attempt.parsed,
    missingFields: attempt.missingFields,
    warnings: attempt.warnings,
    error: attempt.parseError,
  });

  const repairedText = await repairDevisOnce({
    previousRaw: params.rawText,
    chantierDescription: params.chantierDescription,
  });

  if (!repairedText) {
    logMumGenerate("erreur exacte", {
      stage: "repair_failed",
      missingFields: attempt.missingFields,
    });
    return {
      result: null,
      repaired: true,
      missingFields: attempt.missingFields,
      warnings: attempt.warnings,
      stats: attempt.stats,
    };
  }

  logMumGenerate("réponse brute (repair)", repairedText.slice(0, 3000));
  attempt = parseAndNormalize(repairedText, params.defaultVatRate);
  if (!attempt.result) {
    logMumGenerate("erreur exacte", {
      stage: "normalize_after_repair",
      missingFields: attempt.missingFields,
      warnings: attempt.warnings.slice(0, 20),
    });
  }

  return {
    result: attempt.result,
    repaired: true,
    missingFields: attempt.missingFields,
    warnings: attempt.warnings,
    stats: attempt.stats,
  };
}
