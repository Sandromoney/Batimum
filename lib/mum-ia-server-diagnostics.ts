import { getOpenAiEnvDiagnostics } from "@/lib/openai-server";

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
}): void {
  if (!isMumIaDevEnvironment()) return;
  try {
    const preview = JSON.stringify(params.response).slice(0, 2000);
    console.error("OPENAI RESPONSE:", preview);
  } catch {
    console.error("OPENAI RESPONSE:", params.response);
  }
  console.error("ROUTE:", params.route);
}
