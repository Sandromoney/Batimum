import { getOpenAiEnvDiagnostics } from "@/lib/openai-server";
import { logMumIaOpenAiRawBeforeValidation } from "@/lib/mum-ia-openai-diagnostics";

export function isMumIaDevEnvironment(): boolean {
  return process.env.NODE_ENV === "development";
}

export function attachMumIaDevDebug<T extends Record<string, unknown>>(
  payload: T,
  debugMessage: string,
): T & { debugMessage?: string } {
  if (!isMumIaDevEnvironment()) return payload;
  return { ...payload, debugMessage };
}

export function logMumIaRouteError(params: {
  route: string;
  error: unknown;
  userId?: string | null;
  requestBody?: unknown;
  extra?: Record<string, unknown>;
}): string {
  const { route, error, userId, requestBody, extra } = params;
  const message =
    error instanceof Error ? error.message : String(error ?? "Erreur inconnue");

  console.error("MUM IA ERROR:", error);
  if (error instanceof Error && error.stack) {
    console.error("STACK:", error.stack);
  }
  if (requestBody !== undefined) {
    console.error("REQUEST BODY:", sanitizeRequestBodyForLogs(requestBody));
  }
  if (userId) {
    console.error("USER:", userId);
  }
  if (extra) {
    console.error("MUM IA CONTEXT:", extra);
  }
  console.error("ROUTE:", route);

  const openAi = getOpenAiEnvDiagnostics();
  console.error("OPENAI ENV:", {
    configured: openAi.configured,
    model: openAi.model,
    keySource: openAi.keySource,
    modelSource: openAi.modelSource,
  });

  return message;
}

function sanitizeRequestBodyForLogs(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const copy = { ...(body as Record<string, unknown>) };
  if ("bibliothequeEntries" in copy) {
    copy.bibliothequeEntries = `[${Array.isArray(copy.bibliothequeEntries) ? copy.bibliothequeEntries.length : 0} entries]`;
  }
  return copy;
}

export function logMumIaOpenAiResponse(params: {
  route: string;
  response: unknown;
  content?: string | null;
}): void {
  // Toujours logger (prod + dev) — indispensable pour diagnostiquer invalid_response
  logMumIaOpenAiRawBeforeValidation({
    route: params.route,
    raw: params.response,
    content: params.content,
  });
}
