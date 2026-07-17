export const EMAIL_STATUS_FETCH_ERROR_MESSAGE =
  "Impossible de vérifier la connexion email pour le moment.";

export {
  GMAIL_CONFIG_INCOMPLETE_MESSAGE,
  formatGmailConfigMissingMessage,
} from "@/lib/gmail-oauth-config";

import { GMAIL_CONFIG_INCOMPLETE_MESSAGE } from "@/lib/gmail-oauth-config";

function isConfigErrorMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    message.includes(GMAIL_CONFIG_INCOMPLETE_MESSAGE) ||
    normalized.includes("manquante") ||
    normalized.includes("non configuré") ||
    normalized.includes("invalid_client") ||
    normalized.includes("redirect_uri")
  );
}

function isNetworkErrorMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("fetch failed") ||
    normalized.includes("econnrefused") ||
    normalized.includes("enotfound") ||
    normalized.includes("network")
  );
}

export function toFriendlyGmailOAuthError(error: unknown): string {
  if (!(error instanceof Error)) {
    return GMAIL_CONFIG_INCOMPLETE_MESSAGE;
  }

  if (
    error.message.includes("SUPABASE_SERVICE_ROLE_KEY") ||
    error.message.toLowerCase().includes("service role")
  ) {
    return "Impossible d'enregistrer la connexion email pour le moment.";
  }

  if (error.message.toLowerCase().includes("manquante")) {
    return error.message;
  }

  if (isConfigErrorMessage(error.message)) {
    return error.message;
  }

  if (isNetworkErrorMessage(error.message)) {
    return "Impossible de contacter les serveurs Google pour le moment. Réessayez dans quelques instants.";
  }

  if (error.message.includes("invalid_grant")) {
    return "Autorisation Google expirée ou déjà utilisée. Relancez la connexion.";
  }

  return error.message || "La connexion Gmail a échoué. Veuillez réessayer.";
}

export function toFriendlyFlashOAuthMessage(message: string): string {
  const normalized = message.trim().toLowerCase();
  if (!normalized || normalized === "fetch failed") {
    return EMAIL_STATUS_FETCH_ERROR_MESSAGE;
  }
  if (normalized.includes("manquante")) {
    return message;
  }
  return toFriendlyGmailOAuthError(new Error(message));
}
