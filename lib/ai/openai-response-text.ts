/**
 * Extraction du texte JSON depuis une réponse OpenAI Responses API ou Chat Completions.
 * Critique pour GPT-5 : output_text peut être vide alors que le JSON est dans output[].
 */
export function extractTextFromOpenAiResponse(raw: unknown): {
  content: string | null;
  finishReason: string | null;
  status: string | null;
  incompleteReason: string | null;
  source: string;
} {
  if (!raw || typeof raw !== "object") {
    return {
      content: null,
      finishReason: null,
      status: null,
      incompleteReason: null,
      source: "none",
    };
  }

  const root = raw as Record<string, unknown>;
  const status = root.status != null ? String(root.status) : null;
  const incomplete = root.incomplete_details as { reason?: string } | undefined;
  const incompleteReason = incomplete?.reason ? String(incomplete.reason) : null;

  // Responses API — helper officiel
  if (typeof root.output_text === "string" && root.output_text.trim()) {
    return {
      content: root.output_text.trim(),
      finishReason: status,
      status,
      incompleteReason,
      source: "output_text",
    };
  }

  // Responses API — parcours output[]
  if (Array.isArray(root.output)) {
    const chunks: string[] = [];
    let finishReason: string | null = null;
    for (const item of root.output) {
      if (!item || typeof item !== "object") continue;
      const entry = item as Record<string, unknown>;
      if (entry.status != null) finishReason = String(entry.status);
      if (entry.type === "message" && Array.isArray(entry.content)) {
        for (const part of entry.content) {
          if (!part || typeof part !== "object") continue;
          const p = part as Record<string, unknown>;
          if (
            (p.type === "output_text" || p.type === "text") &&
            typeof p.text === "string" &&
            p.text.trim()
          ) {
            chunks.push(p.text.trim());
          }
        }
      }
      // Certains modèles mettent le texte directement
      if (typeof entry.text === "string" && entry.text.trim()) {
        chunks.push(entry.text.trim());
      }
    }
    if (chunks.length > 0) {
      return {
        content: chunks.join("\n"),
        finishReason: finishReason ?? status,
        status,
        incompleteReason,
        source: "output[].message.content",
      };
    }
  }

  // Chat Completions
  if (Array.isArray(root.choices) && root.choices[0]) {
    const choice = root.choices[0] as Record<string, unknown>;
    const message = choice.message as Record<string, unknown> | undefined;
    const content =
      typeof message?.content === "string" ? message.content.trim() : null;
    return {
      content: content || null,
      finishReason:
        choice.finish_reason != null ? String(choice.finish_reason) : null,
      status,
      incompleteReason,
      source: "choices[0].message.content",
    };
  }

  return {
    content: null,
    finishReason: status,
    status,
    incompleteReason,
    source: "unresolved",
  };
}

export function isGpt5Family(model: string): boolean {
  return /^gpt-5/i.test(model.trim());
}
