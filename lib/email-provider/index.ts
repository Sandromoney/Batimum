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
export type {
  EmailConnectionStatus,
  EmailSendResult,
  OutboundEmail,
  StoredEmailOAuthTokens,
} from "./types";
