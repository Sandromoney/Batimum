export type EmailOAuthEnvPresence = {
  googleClientId: boolean;
  googleClientSecret: boolean;
  emailOauthSecret: boolean;
  microsoftClientId: boolean;
  microsoftClientSecret: boolean;
};

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function getGoogleClientId(): string {
  return readEnv("GOOGLE_CLIENT_ID");
}

export function getGoogleClientSecret(): string {
  return readEnv("GOOGLE_CLIENT_SECRET");
}

export function getMicrosoftClientId(): string {
  return readEnv("MICROSOFT_CLIENT_ID");
}

export function getMicrosoftClientSecret(): string {
  return readEnv("MICROSOFT_CLIENT_SECRET");
}

export function getEmailOauthSecret(): string {
  return readEnv("EMAIL_OAUTH_SECRET");
}

export function getEmailOAuthEnvPresence(): EmailOAuthEnvPresence {
  return {
    googleClientId: Boolean(getGoogleClientId()),
    googleClientSecret: Boolean(getGoogleClientSecret()),
    emailOauthSecret: Boolean(getEmailOauthSecret()),
    microsoftClientId: Boolean(getMicrosoftClientId()),
    microsoftClientSecret: Boolean(getMicrosoftClientSecret()),
  };
}

export function logEmailOAuthEnvPresence(context: string): EmailOAuthEnvPresence {
  const presence = getEmailOAuthEnvPresence();
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    `${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3006").replace(/\/$/, "")}/api/email/oauth/google/callback`;
  console.info(`[email-oauth:${context}] GOOGLE_CLIENT_ID présent: ${presence.googleClientId ? "oui" : "non"}`);
  console.info(`[email-oauth:${context}] GOOGLE_CLIENT_SECRET présent: ${presence.googleClientSecret ? "oui" : "non"}`);
  console.info(`[email-oauth:${context}] GOOGLE_REDIRECT_URI: ${redirectUri}`);
  console.info(`[email-oauth:${context}] EMAIL_OAUTH_SECRET présent: ${presence.emailOauthSecret ? "oui" : "non"}`);
  return presence;
}
