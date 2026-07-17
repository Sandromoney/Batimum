import OpenAI from "openai";
import {
  type AiCreditCategory,
  buildAiOperationId,
  getAiUsage,
  logAiUsageEvent,
} from "@/lib/ai/ai-credits";
import { getAiModeSystemPrompt } from "@/lib/ai/ai-prompts";
import {
  extractTextFromOpenAiResponse,
  isGpt5Family,
} from "@/lib/ai/openai-response-text";
import {
  checkUserAiQuota,
  incrementUserAiUsage,
} from "@/lib/ai-usage-store";
import {
  classifyOpenAiError,
  createOpenAiClient,
  getOpenAiKeyEnvNameForMode,
  getOpenAiModelForMode,
  isOpenAiConfigured,
  isOpenAiConfiguredForMode,
  logMumIa,
  type MumIaErrorCode,
  type OpenAiMode,
} from "@/lib/openai-server";

export type AiServiceMode = OpenAiMode;

export const AI_MODELS = {
  get mum_devis() {
    return getOpenAiModelForMode("mum_devis");
  },
  get assistant() {
    return getOpenAiModelForMode("assistant");
  },
  get document_analysis() {
    return getOpenAiModelForMode("document_analysis");
  },
};

export type AiServiceMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiJsonSchemaConfig = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type AiServiceCredits = {
  userId: string;
  operationId: string;
  category?: AiCreditCategory;
  /** Vérifie le quota avant l'appel OpenAI. */
  checkBefore?: boolean;
  /** Incrémente le compteur après succès. */
  trackAfterSuccess?: boolean;
};

export type AiServiceCallParams = {
  mode: AiServiceMode;
  messages: AiServiceMessage[];
  context?: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  systemPrompt?: string;
  /** mum_devis / document_analysis : API Responses + schéma JSON. */
  jsonSchema?: AiJsonSchemaConfig;
  /** assistant : chat completions avec response_format json_object. */
  jsonObject?: boolean;
  credits?: AiServiceCredits;
};

export type AiServiceCallResult = {
  success: boolean;
  content: string | null;
  model: string;
  mode: AiServiceMode;
  durationMs: number;
  error?: string;
  code?: MumIaErrorCode | "invalid_json" | "quota_exceeded";
  httpStatus?: number;
  raw?: unknown;
  credits?: {
    checked: boolean;
    consumed: boolean;
    quotaExceeded?: boolean;
    trackingError?: string | null;
    alreadyCounted?: boolean;
  };
};

const sharedClients: Partial<Record<AiServiceMode, OpenAI | null>> = {};

function modeToCategory(mode: AiServiceMode): AiCreditCategory {
  if (mode === "assistant") return "assistant";
  if (mode === "document_analysis") return "document_analysis";
  return "mum_devis";
}

function getSharedOpenAiClient(mode: AiServiceMode): OpenAI | null {
  if (!(mode in sharedClients)) {
    sharedClients[mode] = createOpenAiClient(mode);
  }
  return sharedClients[mode] ?? null;
}

function logOpenAiCall(mode: AiServiceMode, model: string, keyEnvName: string): void {
  console.log("[AI OPENAI]");
  console.log(`MODE: ${mode}`);
  console.log(`KEY: ${keyEnvName}`);
  console.log(`MODEL: ${model}`);
}

function logAiService(
  level: "info" | "warn" | "error",
  message: string,
  meta?: Record<string, unknown>,
) {
  logMumIa(level, `[AI Service] ${message}`, meta);
}

function resolveInstructions(
  mode: AiServiceMode,
  messages: AiServiceMessage[],
  systemPrompt?: string,
): string {
  const explicitSystem = systemPrompt?.trim();
  if (explicitSystem) return explicitSystem;

  const fromMessages = messages.find((m) => m.role === "system")?.content?.trim();
  if (fromMessages) return fromMessages;

  return getAiModeSystemPrompt(mode);
}

function resolveUserInput(messages: AiServiceMessage[]): string {
  const userMessages = messages.filter((m) => m.role === "user");
  if (userMessages.length === 1) {
    return userMessages[0].content;
  }
  if (userMessages.length > 1) {
    return userMessages.map((m) => m.content).join("\n\n");
  }
  const last = messages[messages.length - 1];
  return last?.content ?? "";
}

function buildChatMessages(
  instructions: string,
  messages: AiServiceMessage[],
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const withoutSystem = messages.filter((m) => m.role !== "system");
  return [
    { role: "system", content: instructions },
    ...withoutSystem.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];
}

async function maybeCheckCredits(
  credits?: AiServiceCredits,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!credits?.checkBefore) return { ok: true };
  const quota = await checkUserAiQuota(credits.userId);
  if (!quota.allowed) {
    return {
      ok: false,
      error: quota.message ?? "Quota IA épuisé",
    };
  }
  return { ok: true };
}

async function maybeTrackCredits(
  mode: AiServiceMode,
  model: string,
  durationMs: number,
  credits: AiServiceCredits | undefined,
  success: boolean,
): Promise<AiServiceCallResult["credits"]> {
  if (!credits?.trackAfterSuccess || !success) {
    return {
      checked: Boolean(credits?.checkBefore),
      consumed: false,
    };
  }

  const category = credits.category ?? modeToCategory(mode);
  const operationId = buildAiOperationId(category, credits.operationId);
  const increment = await incrementUserAiUsage(credits.userId, operationId);
  const usage = await getAiUsage(credits.userId);
  const consumed = !increment.error || Boolean(increment.alreadyCounted);

  logAiUsageEvent({
    mode,
    category,
    model,
    creditConsumed: consumed && !increment.alreadyCounted ? 1 : 0,
    used: usage.creditsUsed,
    total: usage.quotaTotal,
    durationMs,
    success: true,
  });

  return {
    checked: Boolean(credits.checkBefore),
    consumed,
    trackingError: increment.error,
    alreadyCounted: increment.alreadyCounted,
  };
}

async function callStructuredJson(
  client: OpenAI,
  params: AiServiceCallParams,
  model: string,
  mode: AiServiceMode,
  instructions: string,
  startedAt: number,
): Promise<AiServiceCallResult> {
  const input = resolveUserInput(params.messages);
  const schema = params.jsonSchema;

  if (!schema) {
    return {
      success: false,
      content: null,
      model,
      mode,
      durationMs: Date.now() - startedAt,
      error: `Schéma JSON requis pour le mode ${mode}`,
      code: "openai_error",
      httpStatus: 400,
    };
  }

  const gpt5 = isGpt5Family(model);
  const maxOut =
    params.maxTokens ??
    (mode === "mum_devis" ? (gpt5 ? 32000 : 12000) : gpt5 ? 16000 : 4000);

  console.log("[MUM FLOW] mode IA", mode);
  console.log("[MUM FLOW] modèle", model);
  console.log("[MUM FLOW] max_output_tokens", maxOut);

  // ——— 1) Responses API ———
  const requestBody: Record<string, unknown> = {
    model,
    instructions,
    input,
    max_output_tokens: maxOut,
    text: {
      format: {
        type: "json_schema",
        name: schema.name,
        schema: schema.schema,
        strict: schema.strict ?? false,
      },
    },
  };

  if (params.temperature !== undefined && !gpt5) {
    requestBody.temperature = params.temperature;
  }

  // GPT-5 : limiter le raisonnement pour laisser de la place au JSON
  if (gpt5) {
    requestBody.reasoning = { effort: "low" };
  }

  let response: unknown;
  try {
    response = await client.responses.create(
      requestBody as Parameters<typeof client.responses.create>[0],
    );
  } catch (error) {
    console.error("[MUM FLOW] Responses API error — fallback Chat Completions", {
      message: error instanceof Error ? error.message : String(error),
    });
    return callStructuredJsonViaChat(
      client,
      params,
      model,
      mode,
      instructions,
      input,
      schema,
      startedAt,
      maxOut,
    );
  }

  const extracted = extractTextFromOpenAiResponse(response);
  console.log("[MUM FLOW] statut OpenAI", extracted.status);
  console.log("[MUM FLOW] finish_reason", extracted.finishReason);
  console.log("[MUM FLOW] incomplete_reason", extracted.incompleteReason);
  console.log("[MUM FLOW] content source", extracted.source);
  console.log("[MUM FLOW] longueur réponse", extracted.content?.length ?? 0);
  console.log(
    "[MUM FLOW] réponse brute",
    (extracted.content ?? "").slice(0, 2000),
  );

  if (extracted.content) {
    return {
      success: true,
      content: extracted.content,
      model,
      mode,
      durationMs: Date.now() - startedAt,
      raw: response,
    };
  }

  // Réponse vide (souvent GPT-5 : tokens consommés par reasoning) → fallback Chat
  console.warn(
    "[MUM FLOW] Responses API sans texte exploitable — fallback Chat Completions",
  );
  return callStructuredJsonViaChat(
    client,
    params,
    model,
    mode,
    instructions,
    input,
    schema,
    startedAt,
    maxOut,
    response,
  );
}

async function callStructuredJsonViaChat(
  client: OpenAI,
  params: AiServiceCallParams,
  model: string,
  mode: AiServiceMode,
  instructions: string,
  userInput: string,
  schema: AiJsonSchemaConfig,
  startedAt: number,
  maxOut: number,
  previousRaw?: unknown,
): Promise<AiServiceCallResult> {
  const gpt5 = isGpt5Family(model);
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: instructions },
    { role: "user", content: userInput },
  ];

  const completionParams: Record<string, unknown> = {
    model,
    messages,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: schema.name,
        schema: schema.schema,
        strict: schema.strict ?? false,
      },
    },
  };

  // GPT-5 chat : max_completion_tokens ; autres : max_tokens
  if (gpt5) {
    completionParams.max_completion_tokens = maxOut;
  } else {
    completionParams.max_tokens = maxOut;
    if (params.temperature !== undefined) {
      completionParams.temperature = params.temperature;
    }
  }

  console.log("[MUM FLOW] Chat Completions fallback", {
    model,
    tokenParam: gpt5 ? "max_completion_tokens" : "max_tokens",
    maxOut,
  });

  try {
    const completion = await client.chat.completions.create(
      completionParams as unknown as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
    );
    const extracted = extractTextFromOpenAiResponse(completion);
    console.log("[MUM FLOW] chat finish_reason", extracted.finishReason);
    console.log("[MUM FLOW] chat longueur", extracted.content?.length ?? 0);
    console.log(
      "[MUM FLOW] chat réponse brute",
      (extracted.content ?? "").slice(0, 2000),
    );

    return {
      success: Boolean(extracted.content),
      content: extracted.content,
      model,
      mode,
      durationMs: Date.now() - startedAt,
      raw: { responsesAttempt: previousRaw, chat: completion },
      error: extracted.content ? undefined : "Réponse OpenAI vide (Responses + Chat)",
      code: extracted.content ? undefined : "openai_error",
      httpStatus: extracted.content ? undefined : 502,
    };
  } catch (error) {
    // Dernier recours : json_object sans schéma strict
    console.warn("[MUM FLOW] json_schema chat failed — json_object", {
      message: error instanceof Error ? error.message : String(error),
    });
    try {
      const looseParams: Record<string, unknown> = {
        model,
        messages: [
          {
            role: "system",
            content: `${instructions}\n\nRéponds UNIQUEMENT en JSON valide conforme au schéma métier demandé.`,
          },
          { role: "user", content: userInput },
        ],
        response_format: { type: "json_object" },
      };
      if (gpt5) {
        looseParams.max_completion_tokens = maxOut;
      } else {
        looseParams.max_tokens = maxOut;
      }

      const completion = await client.chat.completions.create(
        looseParams as unknown as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
      );
      const extracted = extractTextFromOpenAiResponse(completion);
      return {
        success: Boolean(extracted.content),
        content: extracted.content,
        model,
        mode,
        durationMs: Date.now() - startedAt,
        raw: { responsesAttempt: previousRaw, chatLoose: completion },
        error: extracted.content
          ? undefined
          : "Réponse OpenAI vide (json_object)",
        code: extracted.content ? undefined : "openai_error",
        httpStatus: extracted.content ? undefined : 502,
      };
    } catch (looseError) {
      const classified = classifyOpenAiError(looseError, model);
      return {
        success: false,
        content: null,
        model,
        mode,
        durationMs: Date.now() - startedAt,
        raw: previousRaw,
        error: classified.message,
        code: classified.code,
        httpStatus: classified.httpStatus,
      };
    }
  }
}

async function callAssistant(
  client: OpenAI,
  params: AiServiceCallParams,
  model: string,
  instructions: string,
  startedAt: number,
): Promise<AiServiceCallResult> {
  const chatMessages = buildChatMessages(instructions, params.messages);
  const gpt5 = isGpt5Family(model);

  const completionParams: Record<string, unknown> = {
    model,
    ...(params.jsonObject ? { response_format: { type: "json_object" as const } } : {}),
    messages: chatMessages,
  };

  if (gpt5) {
    completionParams.max_completion_tokens = params.maxTokens ?? 4000;
  } else {
    completionParams.max_tokens = params.maxTokens;
    if (params.temperature !== undefined) {
      completionParams.temperature = params.temperature;
    } else {
      completionParams.temperature = 0.2;
    }
  }

  const completion = await client.chat.completions.create(
    completionParams as unknown as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
  );
  const extracted = extractTextFromOpenAiResponse(completion);

  return {
    success: Boolean(extracted.content),
    content: extracted.content,
    model,
    mode: "assistant",
    durationMs: Date.now() - startedAt,
    raw: completion,
    error: extracted.content ? undefined : "Réponse OpenAI vide",
    code: extracted.content ? undefined : "openai_error",
    httpStatus: extracted.content ? undefined : 502,
  };
}

async function call(params: AiServiceCallParams): Promise<AiServiceCallResult> {
  const startedAt = Date.now();
  const model = params.model ?? getOpenAiModelForMode(params.mode);
  const keyEnvName = getOpenAiKeyEnvNameForMode(params.mode);

  if (!isOpenAiConfiguredForMode(params.mode)) {
    return {
      success: false,
      content: null,
      model,
      mode: params.mode,
      durationMs: Date.now() - startedAt,
      error: "OpenAI non configuré (OPENAI_API_KEY absente)",
      code: "missing_key",
      httpStatus: 503,
    };
  }

  const creditCheck = await maybeCheckCredits(params.credits);
  if (!creditCheck.ok) {
    return {
      success: false,
      content: null,
      model,
      mode: params.mode,
      durationMs: Date.now() - startedAt,
      error: creditCheck.error,
      code: "quota_exceeded",
      httpStatus: 429,
      credits: {
        checked: true,
        consumed: false,
        quotaExceeded: true,
      },
    };
  }

  const client = getSharedOpenAiClient(params.mode);
  if (!client) {
    return {
      success: false,
      content: null,
      model,
      mode: params.mode,
      durationMs: Date.now() - startedAt,
      error: "Client OpenAI indisponible",
      code: "missing_key",
      httpStatus: 503,
    };
  }

  const instructions = resolveInstructions(
    params.mode,
    params.messages,
    params.systemPrompt,
  );

  logOpenAiCall(params.mode, model, keyEnvName);
  logAiService("info", "Appel OpenAI", {
    mode: params.mode,
    model,
    keyEnvName,
    context: params.context,
    messageCount: params.messages.length,
    hasJsonSchema: Boolean(params.jsonSchema),
    jsonObject: Boolean(params.jsonObject),
  });

  try {
    const result =
      params.mode === "assistant"
        ? await callAssistant(client, params, model, instructions, startedAt)
        : await callStructuredJson(
            client,
            params,
            model,
            params.mode,
            instructions,
            startedAt,
          );

    const creditMeta = await maybeTrackCredits(
      params.mode,
      result.model,
      result.durationMs,
      params.credits,
      result.success,
    );

    return {
      ...result,
      credits: creditMeta,
    };
  } catch (error) {
    const classified = classifyOpenAiError(error, model);
    logAiService("error", "Erreur OpenAI — aucun crédit consommé", {
      mode: params.mode,
      model,
      code: classified.code,
      message: classified.message,
    });

    return {
      success: false,
      content: null,
      model,
      mode: params.mode,
      durationMs: Date.now() - startedAt,
      error: classified.message,
      code: classified.code,
      httpStatus: classified.httpStatus,
      credits: {
        checked: Boolean(params.credits?.checkBefore),
        consumed: false,
      },
    };
  }
}

export const aiService = {
  call,
  isConfigured: isOpenAiConfigured,
  isConfiguredForMode: isOpenAiConfiguredForMode,
  getModel: getOpenAiModelForMode,
  models: AI_MODELS,
  resetClient(): void {
    delete sharedClients.assistant;
    delete sharedClients.mum_devis;
    delete sharedClients.document_analysis;
  },
};

export {
  getAiModeSystemPrompt,
  MUM_DEVIS_SYSTEM_PROMPT,
  ASSISTANT_SYSTEM_PROMPT,
  DOCUMENT_ANALYSIS_SYSTEM_PROMPT,
} from "@/lib/ai/ai-prompts";
