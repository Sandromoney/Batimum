import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { MUM_IA_NOT_CONFIGURED_MESSAGE } from "@/lib/mum-ia";

/** Dev local uniquement — contourne UNABLE_TO_VERIFY_LEAF_SIGNATURE (proxy/antivirus Windows). */
if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";

export type OpenAiEnvSource = "env.local" | "process.env" | "missing";

export type MumIaErrorCode =
  | "missing_key"
  | "invalid_key"
  | "invalid_model"
  | "insufficient_quota"
  | "rate_limit"
  | "openai_error";

const PLACEHOLDER_KEYS = new Set([
  "",
  "COLLER_LA_CLE_ICI",
  "colle_ta_cle_openai_ici",
  "your_openai_api_key_here",
  "sk-your-key-here",
]);

let envLocalCache: Record<string, string> | null = null;

function parseEnvValue(raw: string): string {
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value.replace(/^\uFEFF/, "");
}

function readEnvLocalFile(): Record<string, string> {
  if (envLocalCache) return envLocalCache;

  const values: Record<string, string> = {};
  try {
    const filePath = path.join(process.cwd(), ".env.local");
    const content = fs.readFileSync(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator <= 0) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = parseEnvValue(trimmed.slice(separator + 1));
      if (key) values[key] = value;
    }
  } catch {
    /* .env.local absent */
  }

  envLocalCache = values;
  return values;
}

function resolveEnvValue(name: string): { value: string | null; source: OpenAiEnvSource } {
  const fromFile = readEnvLocalFile()[name]?.trim();
  if (fromFile) {
    return { value: fromFile, source: "env.local" };
  }

  const fromProcess = process.env[name]?.trim();
  if (fromProcess) {
    return { value: fromProcess, source: "process.env" };
  }

  return { value: null, source: "missing" };
}

export function getOpenAiEnvDiagnostics(): {
  configured: boolean;
  model: string;
  keySource: OpenAiEnvSource;
  modelSource: OpenAiEnvSource;
} {
  const key = resolveEnvValue("OPENAI_API_KEY");
  const model = resolveEnvValue("OPENAI_MODEL");
  const normalizedKey = key.value && !PLACEHOLDER_KEYS.has(key.value) ? key.value : null;

  return {
    configured: Boolean(normalizedKey),
    model: model.value || OPENAI_DEFAULT_MODEL,
    keySource: normalizedKey ? key.source : "missing",
    modelSource: model.value ? model.source : "missing",
  };
}

export function getOpenAiApiKey(): string | null {
  const { value } = resolveEnvValue("OPENAI_API_KEY");
  if (!value || PLACEHOLDER_KEYS.has(value)) {
    return null;
  }
  return value;
}

export function getOpenAiModel(): string {
  const { value } = resolveEnvValue("OPENAI_MODEL");
  return value || OPENAI_DEFAULT_MODEL;
}

export function isOpenAiConfigured(): boolean {
  return getOpenAiApiKey() !== null;
}

export function createOpenAiClient(): OpenAI | null {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

export function openAiNotConfiguredResponse() {
  return {
    success: false as const,
    code: "missing_key" as const,
    message: MUM_IA_NOT_CONFIGURED_MESSAGE,
  };
}

export function logMumIa(
  level: "info" | "warn" | "error",
  message: string,
  meta?: Record<string, unknown>,
) {
  const payload = meta ? { ...meta } : undefined;
  const prefix = "[MUM IA]";

  if (level === "info") {
    console.info(prefix, message, payload ?? "");
  } else if (level === "warn") {
    console.warn(prefix, message, payload ?? "");
  } else {
    console.error(prefix, message, payload ?? "");
  }
}

function connectionCauseMessage(error: unknown): string {
  if (!(error instanceof Error) || !error.cause) return "";
  const cause = error.cause;
  if (cause instanceof Error) return cause.message;
  return String(cause);
}

export function classifyOpenAiError(
  error: unknown,
  model: string,
): {
  code: MumIaErrorCode;
  message: string;
  httpStatus: number;
} {
  console.error("[MUM IA ERROR]", error);
  if (error instanceof Error && error.cause) {
    console.error("[MUM IA ERROR] cause:", error.cause);
  }

  if (error instanceof OpenAI.APIConnectionError) {
    const cause = connectionCauseMessage(error);
    logMumIa("error", "Connexion OpenAI impossible", { model, cause });

    if (/certificate|UNABLE_TO_VERIFY|SSL/i.test(cause)) {
      return {
        code: "openai_error",
        message:
          "Erreur réseau SSL vers OpenAI (certificat). Vérifiez proxy, antivirus ou connexion Internet, puis redémarrez le serveur.",
        httpStatus: 502,
      };
    }

    return {
      code: "openai_error",
      message: cause
        ? `Erreur de connexion OpenAI : ${error.message} — ${cause}`
        : `Erreur de connexion OpenAI : ${error.message}`,
      httpStatus: 502,
    };
  }

  if (error instanceof OpenAI.APIError) {
    const status = error.status ?? 502;
    const apiCode = error.code ?? "";
    const apiMessage = error.message?.trim() ?? "";
    const cause = connectionCauseMessage(error);

    if (!status && /connection error/i.test(apiMessage)) {
      logMumIa("error", "Connexion OpenAI impossible", { model, cause });

      if (/certificate|UNABLE_TO_VERIFY|SSL/i.test(cause)) {
        return {
          code: "openai_error",
          message:
            "Erreur réseau SSL vers OpenAI (certificat). Vérifiez proxy, antivirus ou connexion Internet.",
          httpStatus: 502,
        };
      }

      return {
        code: "openai_error",
        message: cause
          ? `Erreur de connexion OpenAI : ${apiMessage} — ${cause}`
          : `Erreur de connexion OpenAI : ${apiMessage}`,
        httpStatus: 502,
      };
    }

    logMumIa("error", "Détail erreur OpenAI", {
      model,
      status,
      code: apiCode,
      type: error.type,
      message: apiMessage,
      cause: cause || undefined,
    });

    if (status === 401 || apiCode === "invalid_api_key") {
      const diagnostics = getOpenAiEnvDiagnostics();
      const sourceHint =
        diagnostics.keySource === "env.local"
          ? "La clé est lue depuis .env.local — vérifiez qu'elle est valide sur platform.openai.com, puis redémarrez le serveur."
          : "La clé vient de l'environnement système (pas .env.local). Mettez OPENAI_API_KEY dans .env.local et redémarrez npm run dev.";

      return {
        code: "invalid_key",
        message: `Clé API OpenAI refusée. ${sourceHint}`,
        httpStatus: 503,
      };
    }

    if (
      status === 404 ||
      apiCode === "model_not_found" ||
      /model.*not found/i.test(apiMessage)
    ) {
      return {
        code: "invalid_model",
        message: `Modèle OpenAI invalide (« ${model} »). Utilisez OPENAI_MODEL=gpt-4o-mini dans .env.local.`,
        httpStatus: 502,
      };
    }

    if (
      status === 429 &&
      (apiCode === "insufficient_quota" ||
        apiCode === "billing_hard_limit_reached" ||
        /insufficient.*quota|billing|credit/i.test(apiMessage))
    ) {
      return {
        code: "insufficient_quota",
        message:
          "Quota ou crédit OpenAI insuffisant. Rechargez votre compte sur platform.openai.com.",
        httpStatus: 502,
      };
    }

    if (status === 429) {
      return {
        code: "rate_limit",
        message:
          "Limite de requêtes OpenAI atteinte. Patientez quelques secondes puis réessayez.",
        httpStatus: 502,
      };
    }

    return {
      code: "openai_error",
      message: apiMessage
        ? `Erreur OpenAI (${status}) : ${apiMessage}`
        : `Erreur OpenAI (${status}). Consultez les logs serveur [MUM IA ERROR].`,
      httpStatus: status >= 400 && status < 600 ? status : 502,
    };
  }

  const fallbackMessage =
    error instanceof Error ? error.message : "Erreur inconnue";

  logMumIa("error", "Erreur non typée OpenAI", {
    model,
    message: fallbackMessage,
  });

  return {
    code: "openai_error",
    message: `Erreur OpenAI : ${fallbackMessage}`,
    httpStatus: 502,
  };
}
