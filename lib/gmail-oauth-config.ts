import {
  getGoogleClientId,
  getGoogleClientSecret,
} from "@/lib/email-provider/env-config";

export const GMAIL_CONFIG_INCOMPLETE_MESSAGE =
  "Configuration Gmail incomplète côté serveur";

export const EMAIL_CONNECTIONS_TABLE = "email_connections";

export const GOOGLE_REDIRECT_URI_ENV_NAME = "GOOGLE_REDIRECT_URI";

export const EXPECTED_GOOGLE_REDIRECT_URI =
  "https://batimum.vercel.app/api/email/oauth/google/callback";

/** Noms d'environnement testés pour la clé service Supabase (ordre de priorité). */
export const SUPABASE_SERVICE_ROLE_ENV_NAMES = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SERVICE_KEY",
  "SUPABASE_SERVICE_ROLE",
  "SUPABASE_SECRET_KEY",
] as const;

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ""
  );
}

export function getSupabaseAnonKeySource(): string | null {
  if (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()) {
    return "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY";
  }
  return null;
}

function readFirstEnv(names: readonly string[]): {
  value: string;
  source: string | null;
} {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return { value, source: name };
    }
  }
  return { value: "", source: null };
}

export function getSupabaseServiceRoleKeyWithSource(): {
  value: string;
  source: string | null;
} {
  return readFirstEnv(SUPABASE_SERVICE_ROLE_ENV_NAMES);
}

export function getSupabaseServiceRoleKey(): string {
  return getSupabaseServiceRoleKeyWithSource().value;
}

export function getAppBaseUrl(): string {
  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (publicAppUrl) {
    return publicAppUrl.replace(/\/$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/$/, "")}`;
  }

  return "http://localhost:3006";
}

export function getResolvedGoogleRedirectUri(): string {
  const explicit = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const base = getAppBaseUrl();
  if (base !== "http://localhost:3006") {
    return `${base}/api/email/oauth/google/callback`;
  }

  return EXPECTED_GOOGLE_REDIRECT_URI;
}

export function getGoogleRedirectUriFromEnv(): string | null {
  const value = process.env.GOOGLE_REDIRECT_URI?.trim();
  return value ? value.replace(/\/$/, "") : null;
}

export type GmailOAuthConfigCheck = {
  ok: boolean;
  missing: string[];
  redirectUri: string;
  redirectUriSource: string;
  serviceRoleSource: string | null;
};

export function logGmailEnvDiagnostics(
  context: "[gmail-oauth-start]" | "[gmail-oauth-callback]" | "[gmail-status]",
): void {
  console.log(
    `${context} env ${GOOGLE_REDIRECT_URI_ENV_NAME}: ${
      process.env.GOOGLE_REDIRECT_URI?.trim() ? "present" : "missing"
    }`,
  );

  for (const name of SUPABASE_SERVICE_ROLE_ENV_NAMES) {
    console.log(
      `${context} env ${name}: ${process.env[name]?.trim() ? "present" : "missing"}`,
    );
  }

  const serviceRole = getSupabaseServiceRoleKeyWithSource();
  console.log(
    `${context} service role lu depuis: ${serviceRole.source ?? "(aucune — noms testés: " + SUPABASE_SERVICE_ROLE_ENV_NAMES.join(", ") + ")"}`,
  );

  console.log(
    `${context} env VERCEL_URL: ${process.env.VERCEL_URL?.trim() ?? "(missing)"}`,
  );
  console.log(
    `${context} env NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "(missing)"}`,
  );

  const redirectUri = getResolvedGoogleRedirectUri();
  const redirectSource = getGoogleRedirectUriFromEnv()
    ? GOOGLE_REDIRECT_URI_ENV_NAME
    : process.env.NEXT_PUBLIC_APP_URL?.trim()
      ? "NEXT_PUBLIC_APP_URL"
      : process.env.VERCEL_URL?.trim()
        ? "VERCEL_URL"
        : "EXPECTED_GOOGLE_REDIRECT_URI";

  console.log(`${context} redirect_uri résolu: ${redirectUri}`);
  console.log(`${context} redirect_uri lu depuis: ${redirectSource}`);
}

export function logGmailRedirectUriDiagnostics(
  context: "[gmail-oauth-start]" | "[gmail-oauth-callback]",
): {
  redirectUriSent: string;
  googleRedirectUriEnv: string | null;
  match: boolean;
} {
  logGmailEnvDiagnostics(context);

  const redirectUriSent = getResolvedGoogleRedirectUri();
  const googleRedirectUriEnv = getGoogleRedirectUriFromEnv();
  const match =
    googleRedirectUriEnv !== null && redirectUriSent === googleRedirectUriEnv;

  console.log(`${context} redirect_uri sent to Google: ${redirectUriSent}`);
  console.log(
    `${context} GOOGLE_REDIRECT_URI env: ${googleRedirectUriEnv ?? "(non définie — fallback actif)"}`,
  );
  console.log(`${context} redirect_uri match: ${match ? "oui" : "non"}`);

  if (!match && googleRedirectUriEnv) {
    console.log(`${context} redirect_uri comparison`, {
      sentToGoogle: redirectUriSent,
      googleRedirectUriEnv,
      expected: EXPECTED_GOOGLE_REDIRECT_URI,
      matchesExpected: redirectUriSent === EXPECTED_GOOGLE_REDIRECT_URI,
      envMatchesExpected:
        googleRedirectUriEnv === EXPECTED_GOOGLE_REDIRECT_URI,
    });
  }

  return { redirectUriSent, googleRedirectUriEnv, match };
}

export function validateGmailOAuthConfig(): GmailOAuthConfigCheck {
  const missing: string[] = [];

  if (!getGoogleClientId()) missing.push("GOOGLE_CLIENT_ID");
  if (!getGoogleClientSecret()) missing.push("GOOGLE_CLIENT_SECRET");
  if (!getSupabaseUrl()) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!getSupabaseAnonKey()) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const redirectUri = getResolvedGoogleRedirectUri();
  const redirectUriSource = getGoogleRedirectUriFromEnv()
    ? GOOGLE_REDIRECT_URI_ENV_NAME
    : "fallback (NEXT_PUBLIC_APP_URL / VERCEL_URL / production default)";

  const serviceRole = getSupabaseServiceRoleKeyWithSource();

  return {
    ok: missing.length === 0,
    missing,
    redirectUri,
    redirectUriSource,
    serviceRoleSource: serviceRole.source,
  };
}

export function formatGmailConfigMissingMessage(missing: string[]): string {
  if (missing.length === 0) {
    return GMAIL_CONFIG_INCOMPLETE_MESSAGE;
  }

  return missing.map(formatSingleGmailConfigMissingLabel).join(", ");
}

export function formatSingleGmailConfigMissingLabel(variable: string): string {
  if (variable === EMAIL_CONNECTIONS_TABLE) {
    return "table email_connections manquante";
  }
  if (variable === "SUPABASE_SERVICE_ROLE_KEY") {
    return `${variable} manquante (noms vérifiés: ${SUPABASE_SERVICE_ROLE_ENV_NAMES.join(", ")})`;
  }
  return `${variable} manquante`;
}

export function logGmailConfigMissing(missing: string[]): void {
  for (const variable of missing) {
    console.log(`[gmail-config] missing: ${variable}`);
  }
}

export function isEmailConnectionsTableMissingError(error: {
  message?: string;
  code?: string;
}): boolean {
  const message = error.message?.toLowerCase() ?? "";
  const code = error.code?.toLowerCase() ?? "";

  return (
    code === "pgrst205" ||
    code === "42p01" ||
    message.includes("email_connections") ||
    message.includes("could not find the table") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

export function getEmailConnectionsTableMissingMessage(): string {
  return formatSingleGmailConfigMissingLabel(EMAIL_CONNECTIONS_TABLE);
}

export function assertGmailOAuthConfig(): GmailOAuthConfigCheck {
  const check = validateGmailOAuthConfig();
  if (!check.ok) {
    logGmailConfigMissing(check.missing);
    throw new Error(formatGmailConfigMissingMessage(check.missing));
  }
  return check;
}

export function hasSupabaseServiceRoleForGmailSave(): boolean {
  return Boolean(getSupabaseServiceRoleKey());
}
