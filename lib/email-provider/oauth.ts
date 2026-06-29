import type { EmailOAuthProvider } from "@/lib/types";
import type { StoredEmailOAuthTokens } from "./types";
import {
  getGoogleClientId,
  getGoogleClientSecret,
  getMicrosoftClientId,
  getMicrosoftClientSecret,
} from "./env-config";
import {
  formatGmailConfigMissingMessage,
  logGmailConfigMissing,
  logGmailRedirectUriDiagnostics,
  validateGmailOAuthConfig,
} from "@/lib/gmail-oauth-config";
function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3006").replace(
    /\/$/,
    "",
  );
}

export function getOAuthRedirectUri(provider: EmailOAuthProvider): string {
  if (provider === "google") {
    const explicit = process.env.GOOGLE_REDIRECT_URI?.trim();
    if (explicit) {
      return explicit.replace(/\/$/, "");
    }
  }

  return `${appUrl()}/api/email/oauth/${provider}/callback`;
}

export function buildGoogleAuthorizeUrl(state: string): string {
  const clientId = getGoogleClientId();
  if (!clientId) {
    const check = validateGmailOAuthConfig();
    logGmailConfigMissing(check.missing);
    throw new Error(formatGmailConfigMissingMessage(check.missing));
  }
  const redirectUri = getOAuthRedirectUri("google");
  logGmailRedirectUriDiagnostics("[gmail-oauth-start]");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "openid",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
    hl: "fr",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function buildMicrosoftAuthorizeUrl(state: string): string {
  const clientId = getMicrosoftClientId();
  if (!clientId) {    throw new Error("MICROSOFT_CLIENT_ID non configuré.");
  }

  const tenant = process.env.MICROSOFT_TENANT_ID?.trim() || "common";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getOAuthRedirectUri("microsoft"),
    response_type: "code",
    scope: [
      "offline_access",
      "openid",
      "email",
      "https://graph.microsoft.com/Mail.Send",
      "https://graph.microsoft.com/User.Read",
    ].join(" "),
    state,
  });

  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function exchangeGoogleCode(
  code: string,
): Promise<StoredEmailOAuthTokens> {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  if (!clientId || !clientSecret) {
    const check = validateGmailOAuthConfig();
    logGmailConfigMissing(check.missing);
    throw new Error(formatGmailConfigMissingMessage(check.missing));
  }

  const redirectUri = getOAuthRedirectUri("google");
  logGmailRedirectUriDiagnostics("[gmail-oauth-callback]");

  let tokenRes: Response;
  try {
    tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
  } catch (error) {
    console.error("[gmail-oauth-callback] token exchange error", {
      error,
      cause: error instanceof Error ? error.cause : undefined,
      redirect_uri: redirectUri,
    });
    throw new Error("Impossible de contacter les serveurs Google pour le moment.");
  }

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error("[gmail-oauth-callback] token exchange error", {
      status: tokenRes.status,
      body,
    });
    if (
      body.includes("redirect_uri") ||
      body.includes("invalid_client") ||
      body.includes("unauthorized_client")
    ) {
      const check = validateGmailOAuthConfig();
      logGmailConfigMissing(check.missing);
      throw new Error(formatGmailConfigMissingMessage(check.missing));
    }
    throw new Error(body || "Échange du code Google échoué.");
  }

  console.log("[gmail-oauth-callback] token exchange success");

  const tokenJson = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  let profileRes: Response;
  try {
    profileRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      },
    );
  } catch (error) {
    console.error("[gmail-oauth-callback] token exchange error", {
      error,
      cause: error instanceof Error ? error.cause : undefined,
    });
    throw new Error("Impossible de récupérer le profil Google.");
  }

  if (!profileRes.ok) {
    const body = await profileRes.text();
    console.error("[gmail-oauth-callback] token exchange error", {
      status: profileRes.status,
      body,
    });
    throw new Error("Impossible de récupérer l'email Google.");
  }

  const profile = (await profileRes.json()) as { email?: string; name?: string };

  return {
    provider: "google",
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token,
    expiresAt: Date.now() + tokenJson.expires_in * 1000,
    email: profile.email ?? "",
    displayName: profile.name,
  };
}

export async function exchangeMicrosoftCode(
  code: string,
): Promise<StoredEmailOAuthTokens> {
  const clientId = getMicrosoftClientId();
  const clientSecret = getMicrosoftClientSecret();
  if (!clientId || !clientSecret) {    throw new Error("Identifiants Microsoft OAuth non configurés.");
  }

  const tenant = process.env.MICROSOFT_TENANT_ID?.trim() || "common";
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getOAuthRedirectUri("microsoft"),
        grant_type: "authorization_code",
      }),
    },
  );

  if (!tokenRes.ok) {
    throw new Error(await tokenRes.text());
  }

  const tokenJson = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });

  if (!profileRes.ok) {
    throw new Error("Impossible de récupérer le profil Microsoft.");
  }

  const profile = (await profileRes.json()) as {
    mail?: string;
    userPrincipalName?: string;
  };

  return {
    provider: "microsoft",
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token,
    expiresAt: Date.now() + tokenJson.expires_in * 1000,
    email: profile.mail ?? profile.userPrincipalName ?? "",
  };
}

export async function refreshGoogleToken(
  tokens: StoredEmailOAuthTokens,
): Promise<StoredEmailOAuthTokens> {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  if (!clientId || !clientSecret || !tokens.refreshToken) {    throw new Error("Refresh token Google indisponible.");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokens.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(await tokenRes.text());
  }

  const tokenJson = (await tokenRes.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  return {
    ...tokens,
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token ?? tokens.refreshToken,
    expiresAt: Date.now() + tokenJson.expires_in * 1000,
  };
}

export async function refreshMicrosoftToken(
  tokens: StoredEmailOAuthTokens,
): Promise<StoredEmailOAuthTokens> {
  const clientId = getMicrosoftClientId();
  const clientSecret = getMicrosoftClientSecret();
  if (!clientId || !clientSecret || !tokens.refreshToken) {    throw new Error("Refresh token Microsoft indisponible.");
  }

  const tenant = process.env.MICROSOFT_TENANT_ID?.trim() || "common";
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokens.refreshToken,
        grant_type: "refresh_token",
      }),
    },
  );

  if (!tokenRes.ok) {
    throw new Error(await tokenRes.text());
  }

  const tokenJson = (await tokenRes.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  return {
    ...tokens,
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token ?? tokens.refreshToken,
    expiresAt: Date.now() + tokenJson.expires_in * 1000,
  };
}
