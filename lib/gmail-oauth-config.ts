import {
  getGoogleClientId,
  getGoogleClientSecret,
} from "@/lib/email-provider/env-config";

export const GMAIL_CONFIG_INCOMPLETE_MESSAGE =
  "Configuration Gmail incomplète côté serveur";

export const EMAIL_CONNECTIONS_TABLE = "email_connections";
export const EMAIL_CONNECTIONS_SCHEMA = "public";
export const EMAIL_CONNECTIONS_QUALIFIED_NAME = `${EMAIL_CONNECTIONS_SCHEMA}.${EMAIL_CONNECTIONS_TABLE}`;

export const GOOGLE_REDIRECT_URI_ENV_NAME = "GOOGLE_REDIRECT_URI";

export const EXPECTED_GOOGLE_REDIRECT_URI =
  "https://batimum.vercel.app/api/email/oauth/google/callback";

export const SUPABASE_SERVICE_ROLE_KEY_ENV_NAME = "SUPABASE_SERVICE_ROLE_KEY";

export const SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE =
  "SUPABASE_SERVICE_ROLE_KEY introuvable dans Vercel";

/** Noms listés pour le diagnostic config (seul SUPABASE_SERVICE_ROLE_KEY est utilisé en écriture). */
export const SUPABASE_SERVICE_ROLE_ENV_NAMES = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SERVICE_KEY",
  "SUPABASE_SERVICE_ROLE",
  "SUPABASE_SECRET_KEY",
] as const;

export function hasSupabaseServiceRoleKeyEnv(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export function logGmailDbClientMode(): void {
  console.log(
    "[gmail-db] using service role key:",
    hasSupabaseServiceRoleKeyEnv(),
  );
  console.log(
    "[gmail-db] supabase client mode:",
    hasSupabaseServiceRoleKeyEnv() ? "service_role" : "anon",
  );
}

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

export function getSupabaseServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
}

export function getSupabaseServiceRoleKeyWithSource(): {
  value: string;
  source: string | null;
} {
  const value = getSupabaseServiceRoleKey();
  return {
    value,
    source: value ? SUPABASE_SERVICE_ROLE_KEY_ENV_NAME : null,
  };
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

export function logGmailDbTableCheck(operation: string): void {
  console.log(`[gmail-db] checking table: ${EMAIL_CONNECTIONS_QUALIFIED_NAME}`, {
    operation,
    schema: EMAIL_CONNECTIONS_SCHEMA,
    table: EMAIL_CONNECTIONS_TABLE,
    via: "supabase.from(email_connections) → schéma public par défaut (PostgREST)",
  });
}

export type GmailDbSupabaseError = {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

export function logGmailDbSupabaseError(
  error: GmailDbSupabaseError,
  _operation?: string,
): void {
  console.error("[gmail-db]", {
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  });
}

export function isEmailConnectionsTableMissingError(error: {
  code?: string | null;
}): boolean {
  const code = error.code?.toUpperCase() ?? "";
  return code === "PGRST205" || code === "42P01";
}

export function formatGmailDbErrorForUser(error: GmailDbSupabaseError): string {
  if (isEmailConnectionsTableMissingError(error)) {
    return "table email_connections manquante";
  }

  const code = error.code?.toUpperCase() ?? "";
  const message = error.message ?? "";
  const normalized = message.toLowerCase();

  if (code === "42501" || normalized.includes("permission denied")) {
    if (!hasSupabaseServiceRoleKeyEnv()) {
      return SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE;
    }
    return "Permission refusée sur email_connections (policy RLS ou droits insuffisants).";
  }

  if (
    code === "PGRST301" ||
    normalized.includes("jwt") ||
    normalized.includes("invalid claim")
  ) {
    return "JWT invalide ou session Supabase expirée.";
  }

  if (normalized.includes("invalid api key") || normalized.includes("apikey")) {
    return "Clé API Supabase invalide.";
  }

  if (
    normalized.includes("service role") ||
    normalized.includes("service_role")
  ) {
    return "Clé service role Supabase manquante ou invalide.";
  }

  return message || "Erreur base de données lors de l'accès à email_connections.";
}

export class GmailDbError extends Error {
  readonly code?: string;
  readonly details?: string | null;
  readonly hint?: string | null;

  constructor(error: GmailDbSupabaseError) {
    super(formatGmailDbErrorForUser(error));
    this.name = "GmailDbError";
    this.code = error.code;
    this.details = error.details ?? null;
    this.hint = error.hint ?? null;
  }
}

export function getEmailConnectionsTableMissingMessage(): string {
  return "table email_connections manquante";
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
  return hasSupabaseServiceRoleKeyEnv();
}
