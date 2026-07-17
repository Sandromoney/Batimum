export {
  EmailProviderService,
  emailProviderService,
} from "./email-provider-service";
export {
  DEFAULT_CONNEXION_EMAIL,
  EMAIL_EXPIRED_MESSAGE,
  EMAIL_NOT_CONNECTED_MESSAGE,
  fetchEmailConnectionStatus,
  getConnexionEmailStatutLabel,
  isEmailConnectionActive,
  mergeConnexionEmailMetadata,
  resolveConnexionEmail,
} from "./connexion-email";
export {
  buildConnexionEmailConnected,
  buildConnexionEmailDisconnected,
  connexionEmailToDisplayStatus,
  isConnexionEmailConnected,
} from "./connexion-email";
export {
  EMAIL_STATUS_FETCH_ERROR_MESSAGE,
  GMAIL_CONFIG_INCOMPLETE_MESSAGE,
  formatGmailConfigMissingMessage,
  toFriendlyFlashOAuthMessage,
  toFriendlyGmailOAuthError,
} from "./oauth-errors";
export type {
  EmailConnectionStatus,
  EmailSendResult,
  OutboundEmail,
  StoredEmailOAuthTokens,
} from "./types";
