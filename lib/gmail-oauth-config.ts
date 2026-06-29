import { getOAuthRedirectUri } from "@/lib/email-provider/oauth";
import {
  getGoogleClientId,
  getGoogleClientSecret,
} from "@/lib/email-provider/env-config";

export const GMAIL_CONFIG_INCOMPLETE_MESSAGE =
  "Configuration Gmail incomplète côté serveur";

export const EMAIL_CONNECTIONS_TABLE = "email_connections";

export const EXPECTED_GOOGLE_REDIRECT_URI =
  "https://batimum.vercel.app/api/email/oauth/google/callback";

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

export function getSupabaseServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
}

export type GmailOAuthConfigCheck = {
  ok: boolean;
  missing: string[];
  redirectUri: string;
};

export function getGoogleRedirectUriFromEnv(): string | null {
  const value = process.env.GOOGLE_REDIRECT_URI?.trim();
  return value ? value.replace(/\/$/, "") : null;
}

export function logGmailRedirectUriDiagnostics(
  context: "[gmail-oauth-start]" | "[gmail-oauth-callback]",
): {
  redirectUriSent: string;
  googleRedirectUriEnv: string | null;
  match: boolean;
} {
  const redirectUriSent = getOAuthRedirectUri("google");
  const googleRedirectUriEnv = getGoogleRedirectUriFromEnv();
  const match =
    googleRedirectUriEnv !== null && redirectUriSent === googleRedirectUriEnv;

  console.log(`${context} redirect_uri sent to Google: ${redirectUriSent}`);
  console.log(
    `${context} GOOGLE_REDIRECT_URI env: ${googleRedirectUriEnv ?? "(non définie)"}`,
  );
  console.log(`${context} redirect_uri match: ${match ? "oui" : "non"}`);

  if (!match) {
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
  if (!process.env.GOOGLE_REDIRECT_URI?.trim()) {
    missing.push("GOOGLE_REDIRECT_URI");
  }
  if (!getSupabaseUrl()) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!getSupabaseAnonKey()) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!getSupabaseServiceRoleKey()) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  return {
    ok: missing.length === 0,
    missing,
    redirectUri: getOAuthRedirectUri("google"),
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
    message.includes("relation") && message.includes("does not exist")
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
