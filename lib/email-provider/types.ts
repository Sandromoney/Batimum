import type { EmailOAuthProvider } from "@/lib/types";

export type OutboundEmailAttachment = {
  filename: string;
  contentBase64: string;
  mimeType?: string;
};

export type OutboundEmail = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  attachments?: OutboundEmailAttachment[];
};

export type EmailSendResult = {
  ok: boolean;
  provider: "google" | "microsoft" | "resend_fallback" | "none";
  message: string;
  simulated?: boolean;
  messageId?: string;
};

export type StoredEmailOAuthTokens = {
  provider: EmailOAuthProvider;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  email: string;
  displayName?: string;
};

export type EmailConnectionStatus = {
  connected: boolean;
  expired: boolean;
  provider?: EmailOAuthProvider | null;
  email?: string;
  expiresAt?: string;
};

export const EMAIL_NOT_CONNECTED_MESSAGE =
  "Veuillez connecter votre adresse email dans les paramètres avant d'envoyer un devis.";

export const EMAIL_EXPIRED_MESSAGE =
  "Votre connexion email a expiré, veuillez reconnecter votre compte.";
