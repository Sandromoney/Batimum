export type MumIaUserErrorCode =
  | "network"
  | "too_short"
  | "quota_exceeded"
  | "quota_unavailable"
  | "not_configured"
  | "transform_failed"
  | "generation_failed"
  | "invalid_response"
  | "openai_unavailable";

const USER_MESSAGES: Record<MumIaUserErrorCode, string> = {
  network: "Impossible de contacter le serveur.",
  too_short:
    "Votre demande est trop courte, ajoutez quelques détails sur le chantier.",
  quota_exceeded:
    "Désolé, vous avez utilisé vos 100 demandes IA disponibles pour ce mois-ci.",
  quota_unavailable:
    "Le quota IA est temporairement indisponible. Réessayez dans quelques instants.",
  not_configured: "Le service IA n'est pas encore configuré.",
  transform_failed:
    "La réponse IA n'a pas pu être transformée en devis. Veuillez réessayer.",
  generation_failed:
    "Le service IA est momentanément indisponible.",
  openai_unavailable: "Le service IA est momentanément indisponible.",
  invalid_response:
    "La réponse de l'IA est incomplète. Veuillez reformuler votre demande.",
};

export function getMumIaUserMessage(
  code: MumIaUserErrorCode,
  _fallback?: string,
): string {
  return USER_MESSAGES[code];
}

export function mapMumIaApiError(payload: {
  code?: string;
  message?: string;
  success?: boolean;
  debugMessage?: string;
}): string {
  switch (payload.code) {
    case "missing_key":
    case "invalid_key":
      return getMumIaUserMessage("not_configured");
    case "unauthenticated":
      return "Connectez-vous pour générer un devis MUM IA.";
    case "ai_quota_exceeded":
      return payload.message ?? getMumIaUserMessage("quota_exceeded");
    case "ai_quota_unavailable":
      return getMumIaUserMessage("quota_unavailable");
    case "invalid_model":
    case "openai_error":
    case "rate_limit":
    case "insufficient_quota":
      return getMumIaUserMessage("openai_unavailable");
    case "invalid_response":
      return getMumIaUserMessage("invalid_response");
    case "too_short":
      return getMumIaUserMessage("too_short");
    default:
      if (payload.message?.toLowerCase().includes("trop court")) {
        return getMumIaUserMessage("too_short");
      }
      if (
        payload.message?.toLowerCase().includes("crédits") ||
        payload.message?.toLowerCase().includes("demandes ia")
      ) {
        return payload.message;
      }
      if (payload.message?.toLowerCase().includes("limite")) {
        return getMumIaUserMessage("quota_exceeded");
      }
      if (payload.message?.toLowerCase().includes("configur")) {
        return getMumIaUserMessage("not_configured");
      }
      if (payload.message?.toLowerCase().includes("connectez-vous")) {
        return payload.message;
      }
      return getMumIaUserMessage("generation_failed");
  }
}

/** Message technique affiché uniquement en développement. */
export function extractMumIaTechnicalError(payload: {
  code?: string;
  message?: string;
  debugMessage?: string;
}): string {
  if (payload.debugMessage?.trim()) {
    return payload.debugMessage.trim();
  }

  switch (payload.code) {
    case "missing_key":
      return "Missing OPENAI_API_KEY";
    case "invalid_key":
      return "Unauthorized — clé OpenAI refusée (invalid_api_key)";
    case "unauthenticated":
      return "Unauthorized — session Supabase absente ou expirée";
    case "invalid_model":
      return payload.message ?? "Model not found";
    case "rate_limit":
      return payload.message ?? "Rate limit exceeded";
    case "insufficient_quota":
      return payload.message ?? "OpenAI billing quota exceeded";
    case "ai_quota_exceeded":
      return payload.message ?? "Quota exceeded (100/100 MUM IA)";
    case "ai_quota_unavailable":
      return payload.message ?? "Quota IA indisponible (base Supabase / service role)";
    case "invalid_response":
      return payload.message ?? "JSON parsing failed or invalid IA response shape";
    case "openai_error":
      return payload.message ?? "OpenAI API error";
    case "too_short":
      return payload.message ?? "Request validation failed (description too short)";
    default:
      if (payload.message?.trim()) return payload.message.trim();
      return payload.code ?? "Unknown error";
  }
}

export const IS_MUM_IA_CLIENT_DEV =
  typeof process !== "undefined" && process.env.NODE_ENV === "development";

