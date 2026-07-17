type AssistantDebugPayload = Record<string, unknown>;

export type AssistantComprehensionSource = "LOCAL" | "OPENAI";

export type AssistantComprehensionMode =
  | "local"
  | "assistant_openai"
  | "assistant_openai_fallback_local";

const ENABLED =
  process.env.NODE_ENV === "development" ||
  process.env.ASSISTANT_DEBUG === "1" ||
  process.env.NEXT_PUBLIC_ASSISTANT_DEBUG === "1";

/** Logs standardisés [ASSISTANT] MODE / SOURCE (dev ou ASSISTANT_DEBUG=1). */
export function logAssistantMode(
  mode: AssistantComprehensionMode,
  source: AssistantComprehensionSource,
  extra?: AssistantDebugPayload,
): void {
  if (!ENABLED) return;
  console.log("[ASSISTANT] MODE :", mode);
  console.log("[ASSISTANT] SOURCE :", source);
  if (extra && Object.keys(extra).length > 0) {
    console.log("[ASSISTANT] CONTEXT :", extra);
  }
}

export function logAssistantDebug(
  step: string,
  payload: AssistantDebugPayload = {},
): void {
  if (!ENABLED) return;
  console.log("[Assistant Debug]", {
    step,
    at: new Date().toISOString(),
    ...payload,
  });
}
