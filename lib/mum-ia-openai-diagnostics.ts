/**
 * Diagnostics MUM IA / OpenAI — logs bruts avant validation.
 */

export type MumIaOpenAiResponseDiagnostics = {
  status?: string | null;
  finishReason?: string | null;
  incompleteReason?: string | null;
  usage?: Record<string, unknown> | null;
  content: string | null;
  contentLength: number;
  contentPreview: string;
  outputItemTypes?: string[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function extractFinishReasonFromOutput(raw: unknown): string | null {
  const root = asRecord(raw);
  if (!root) return null;

  const choices = Array.isArray(root.choices) ? root.choices : null;
  if (choices?.[0]) {
    const choice = asRecord(choices[0]);
    if (choice?.finish_reason != null) return String(choice.finish_reason);
  }

  const output = Array.isArray(root.output) ? root.output : null;
  if (!output) return null;

  for (const item of output) {
    const entry = asRecord(item);
    if (!entry) continue;
    if (entry.status != null) return String(entry.status);
    const content = Array.isArray(entry.content) ? entry.content : null;
    if (!content) continue;
    for (const part of content) {
      const partObj = asRecord(part);
      if (partObj?.finish_reason != null) return String(partObj.finish_reason);
    }
  }

  return null;
}

export function extractMumIaOpenAiDiagnostics(
  raw: unknown,
  content: string | null | undefined,
): MumIaOpenAiResponseDiagnostics {
  const root = asRecord(raw);
  const text = content?.trim() || null;
  const incomplete = asRecord(root?.incomplete_details);
  const usage = asRecord(root?.usage);

  const output = Array.isArray(root?.output) ? root!.output : [];
  const outputItemTypes = output
    .map((item) => asRecord(item)?.type)
    .filter((type): type is string => typeof type === "string");

  return {
    status: root?.status != null ? String(root.status) : null,
    finishReason: extractFinishReasonFromOutput(raw),
    incompleteReason:
      incomplete?.reason != null ? String(incomplete.reason) : null,
    usage: usage,
    content: text,
    contentLength: text?.length ?? 0,
    contentPreview: text ? text.slice(0, 1200) : "",
    outputItemTypes,
  };
}

/** Toujours logger la réponse brute structurée AVANT validation. */
export function logMumIaOpenAiRawBeforeValidation(params: {
  route: string;
  raw: unknown;
  content?: string | null;
}): MumIaOpenAiResponseDiagnostics {
  const diagnostics = extractMumIaOpenAiDiagnostics(
    params.raw,
    params.content ?? null,
  );

  console.log("[MUM IA OPENAI RAW]", {
    route: params.route,
    status: diagnostics.status,
    finish_reason: diagnostics.finishReason,
    incomplete_reason: diagnostics.incompleteReason,
    usage: diagnostics.usage,
    contentLength: diagnostics.contentLength,
    content: diagnostics.contentPreview,
    outputItemTypes: diagnostics.outputItemTypes,
  });

  return diagnostics;
}

export function logMumIaParseValidation(params: {
  route: string;
  stage: "json_parse" | "normalize" | "empty_content";
  content?: string | null;
  parsed?: unknown;
  missingFields?: string[];
  warnings?: string[];
  error?: unknown;
}): void {
  const missing =
    params.missingFields && params.missingFields.length > 0
      ? params.missingFields
      : [];

  console.error("[MUM IA VALIDATION]", {
    route: params.route,
    stage: params.stage,
    missingFields: missing,
    warnings: params.warnings ?? [],
    error:
      params.error instanceof Error
        ? params.error.message
        : params.error != null
          ? String(params.error)
          : undefined,
    contentLength: params.content?.length ?? 0,
    contentPreview: params.content?.slice(0, 800) ?? "",
    parsedPreview:
      params.parsed !== undefined
        ? safeJsonPreview(params.parsed, 1500)
        : undefined,
  });

  if (missing.length > 0) {
    console.error("[MUM IA] Champ(s) manquant(s) :");
    for (const field of missing) {
      console.error(`  - ${field}`);
    }
  }
}

function safeJsonPreview(value: unknown, max = 1500): string {
  try {
    return JSON.stringify(value).slice(0, max);
  } catch {
    return String(value);
  }
}

export function formatMissingFieldsDebugMessage(
  missingFields: string[],
  fallback = "Réponse IA non exploitable",
): string {
  if (missingFields.length === 0) return fallback;
  return `Champ manquant :\n${missingFields.map((field) => `- ${field}`).join("\n")}`;
}
