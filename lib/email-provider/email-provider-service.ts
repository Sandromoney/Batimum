import { sendViaGmail } from "./adapters/gmail";
import { sendViaMicrosoft } from "./adapters/microsoft";
import { sendViaResendFallback } from "./adapters/resend-fallback";
import {
  exchangeGoogleCode,
  exchangeMicrosoftCode,
  refreshGoogleToken,
  refreshMicrosoftToken,
} from "./oauth";
import {
  isTokenExpired,
  sealEmailOAuthTokens,
  unsealEmailOAuthTokens,
} from "./token-cookie";
import type {
  EmailConnectionStatus,
  EmailSendResult,
  OutboundEmail,
  StoredEmailOAuthTokens,
} from "./types";
import {
  EMAIL_EXPIRED_MESSAGE,
  EMAIL_NOT_CONNECTED_MESSAGE,
} from "./types";

export class EmailProviderService {
  private static instance: EmailProviderService | null = null;

  static getInstance(): EmailProviderService {
    if (!EmailProviderService.instance) {
      EmailProviderService.instance = new EmailProviderService();
    }
    return EmailProviderService.instance;
  }

  getConnectionStatus(sealed?: string | null): EmailConnectionStatus {
    const tokens = unsealEmailOAuthTokens(sealed);
    if (!tokens?.email) {
      return { connected: false, expired: false, provider: null };
    }

    const expired = isTokenExpired(tokens) && !tokens.refreshToken;
    return {
      connected: !expired,
      expired,
      provider: tokens.provider,
      email: tokens.email,
      expiresAt: new Date(tokens.expiresAt).toISOString(),
    };
  }

  sealTokens(tokens: StoredEmailOAuthTokens): string {
    return sealEmailOAuthTokens(tokens);
  }

  async exchangeOAuthCode(
    provider: "google" | "microsoft",
    code: string,
  ): Promise<StoredEmailOAuthTokens> {
    return provider === "google"
      ? exchangeGoogleCode(code)
      : exchangeMicrosoftCode(code);
  }

  async ensureFreshTokens(
    tokens: StoredEmailOAuthTokens,
  ): Promise<StoredEmailOAuthTokens> {
    if (!isTokenExpired(tokens)) return tokens;

    if (!tokens.refreshToken) {
      throw new Error(EMAIL_EXPIRED_MESSAGE);
    }

    return tokens.provider === "google"
      ? refreshGoogleToken(tokens)
      : refreshMicrosoftToken(tokens);
  }

  async send(
    email: OutboundEmail,
    options: {
      sealedTokens?: string | null;
      allowFallback?: boolean;
      replyToEmail?: string;
    },
  ): Promise<EmailSendResult & { refreshedTokens?: StoredEmailOAuthTokens }> {
    let tokens = unsealEmailOAuthTokens(options.sealedTokens);

    if (!tokens?.email) {
      if (options.allowFallback && process.env.EMAIL_FALLBACK_ENABLED === "true") {
        const fallback = await sendViaResendFallback({
          ...email,
          replyTo: options.replyToEmail ?? email.replyTo,
        });
        return fallback;
      }

      return {
        ok: false,
        provider: "none",
        message: EMAIL_NOT_CONNECTED_MESSAGE,
      };
    }

    try {
      tokens = await this.ensureFreshTokens(tokens);
    } catch {
      return {
        ok: false,
        provider: "none",
        message: EMAIL_EXPIRED_MESSAGE,
      };
    }

    const outbound: OutboundEmail = {
      ...email,
      from: tokens.email,
      replyTo: options.replyToEmail ?? email.replyTo,
    };

    try {
      if (tokens.provider === "google") {
        const result = await sendViaGmail(tokens, outbound);
        return {
          ok: true,
          provider: "google",
          message: "Email envoyé depuis votre adresse Gmail.",
          messageId: result.messageId,
          refreshedTokens: tokens,
        };
      }

      const result = await sendViaMicrosoft(tokens, outbound);
      return {
        ok: true,
        provider: "microsoft",
        message: "Email envoyé depuis votre adresse Microsoft 365.",
        messageId: result.messageId,
        refreshedTokens: tokens,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur d'envoi email.";

      if (options.allowFallback && process.env.EMAIL_FALLBACK_ENABLED === "true") {
        const fallback = await sendViaResendFallback({
          ...email,
          replyTo: options.replyToEmail ?? tokens.email,
        });
        return fallback;
      }

      return {
        ok: false,
        provider: tokens.provider,
        message,
      };
    }
  }
}

export const emailProviderService = EmailProviderService.getInstance();
