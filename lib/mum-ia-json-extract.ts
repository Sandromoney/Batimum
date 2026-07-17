/**
 * Extraction JSON depuis une réponse OpenAI (texte brut ou Markdown ```json).
 */
export function extractJsonFromAiContent(raw: string): {
  jsonText: string;
  hadMarkdownFence: boolean;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { jsonText: "", hadMarkdownFence: false };
  }

  // ```json ... ``` ou ``` ... ```
  const fence = trimmed.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
  if (fence?.[1]) {
    return { jsonText: fence[1].trim(), hadMarkdownFence: true };
  }

  // Premier objet { ... } équilibré
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return {
      jsonText: trimmed.slice(start, end + 1),
      hadMarkdownFence: false,
    };
  }

  return { jsonText: trimmed, hadMarkdownFence: false };
}

export function isAnalysisOnlyPayload(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== "object") return false;
  const root = parsed as Record<string, unknown>;
  const hasSections =
    Array.isArray(root.sections) && root.sections.length > 0;
  const hasLinesRoot =
    Array.isArray(root.lines) ||
    Array.isArray(root.lignes) ||
    Array.isArray(root.items) ||
    Array.isArray(root.prestations);
  const hasLotsWithLines =
    Array.isArray(root.lots) &&
    root.lots.some(
      (lot) =>
        lot &&
        typeof lot === "object" &&
        (Array.isArray((lot as { lines?: unknown }).lines) ||
          Array.isArray((lot as { lignes?: unknown }).lignes) ||
          Array.isArray((lot as { items?: unknown }).items)),
    );

  if (hasSections || hasLinesRoot || hasLotsWithLines) return false;

  const analysisKeys = [
    "analysis",
    "questions",
    "lotsIdentifies",
    "lotsIdentified",
    "lots",
    "assumptions",
    "hypotheses",
    "informationsSuffisantes",
    "messageAnalyse",
    "hypothesesSuggerees",
  ];
  const hit = analysisKeys.filter((key) => key in root);
  return hit.length > 0 && !hasSections;
}

export function logMumGenerate(
  label: string,
  payload?: unknown,
): void {
  if (process.env.NODE_ENV !== "development") return;
  if (payload === undefined) {
    console.log(`[MUM GENERATE] ${label}`);
    return;
  }
  try {
    const text =
      typeof payload === "string"
        ? payload
        : JSON.stringify(payload, null, 2);
    console.log(
      `[MUM GENERATE] ${label}`,
      text.length > 4000 ? `${text.slice(0, 4000)}…` : text,
    );
  } catch {
    console.log(`[MUM GENERATE] ${label}`, payload);
  }
}
