import {
  logGmailDbSupabaseError,
  logGmailDbTableCheck,
  type GmailDbSupabaseError,
} from "@/lib/gmail-oauth-config";
import {
  decryptEmailToken,
  encryptEmailToken,
} from "@/lib/email-connection-crypto";
import type { StoredEmailOAuthTokens } from "@/lib/email-provider/types";
import type { EmailOAuthProvider } from "@/lib/types";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase-auth-server";
import { createAdminClient } from "@/utils/supabase/admin";

export type EmailConnectionProvider = "gmail" | "microsoft";

export type EmailConnectionRow = {
  id: string;
  user_id: string;
  provider: EmailConnectionProvider;
  email: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  connected: boolean;
};

function oauthProviderToStorage(
  provider: EmailOAuthProvider,
): EmailConnectionProvider {
  return provider === "google" ? "gmail" : "microsoft";
}

function storageProviderToOAuth(
  provider: EmailConnectionProvider,
): EmailOAuthProvider {
  return provider === "gmail" ? "google" : "microsoft";
}

function rowToTokens(row: EmailConnectionRow): StoredEmailOAuthTokens {
  return {
    provider: storageProviderToOAuth(row.provider),
    accessToken: decryptEmailToken(row.access_token),
    refreshToken: row.refresh_token
      ? decryptEmailToken(row.refresh_token)
      : undefined,
    expiresAt: new Date(row.expires_at).getTime(),
    email: row.email,
  };
}

function mapEmailConnectionDbError(error: GmailDbSupabaseError): {
  message: string;
  code?: string;
} {
  logGmailDbSupabaseError(error, "email-connection");
  return {
    message: error.message ?? "Erreur base de données",
    code: error.code,
  };
}

export function formatEmailConnectionErrorForUser(error: {
  message: string;
  code?: string;
}): string {
  console.error("[email-connection] formatted error", error);

  if (error.code === "42P01") {
    return "Connexion email indisponible pour le moment.";
  }
  if (
    error.code === "42501" ||
    /permission denied|row-level security/i.test(error.message)
  ) {
    return "Impossible d'accéder à la connexion email. Vérifiez que vous êtes bien connecté.";
  }
  if (/session|jwt|expir|unauthorized/i.test(error.message)) {
    return "Votre session a expiré. Reconnectez-vous.";
  }
  return "Connexion email indisponible pour le moment.";
}

export async function saveEmailConnectionForUser(
  userId: string,
  tokens: StoredEmailOAuthTokens,
  request?: Request | null,
): Promise<void> {
  const supabase = await createAuthenticatedSupabaseClient(request);
  if (!supabase) {
    throw new Error("Client Supabase indisponible.");
  }

  const provider = oauthProviderToStorage(tokens.provider);
  const payload = {
    user_id: userId,
    provider,
    email: tokens.email,
    access_token: encryptEmailToken(tokens.accessToken),
    refresh_token: tokens.refreshToken
      ? encryptEmailToken(tokens.refreshToken)
      : null,
    expires_at: new Date(tokens.expiresAt).toISOString(),
    connected: true,
    updated_at: new Date().toISOString(),
  };

  logGmailDbTableCheck("upsert");

  const { error } = await supabase
    .from("email_connections")
    .upsert(payload, { onConflict: "user_id,provider" });

  if (error) {
    console.error("[email-connection] upsert error", {
      userId,
      code: error.code ?? null,
      message: error.message ?? null,
    });
    throw new Error(formatEmailConnectionErrorForUser(mapEmailConnectionDbError(error)));
  }
}

export async function loadEmailConnectionForUser(
  userId: string,
  provider?: EmailOAuthProvider,
  request?: Request | null,
): Promise<{
  tokens: StoredEmailOAuthTokens | null;
  error: { message: string; code?: string } | null;
}> {
  const supabase = await createAuthenticatedSupabaseClient(request);
  if (!supabase) {
    return {
      tokens: null,
      error: { message: "Client Supabase indisponible." },
    };
  }

  let query = supabase
    .from("email_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("connected", true);

  if (provider) {
    query = query.eq("provider", oauthProviderToStorage(provider));
  }

  logGmailDbTableCheck("select");

  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      tokens: null,
      error: mapEmailConnectionDbError(error),
    };
  }

  if (!data) {
    return { tokens: null, error: null };
  }

  try {
    return {
      tokens: rowToTokens(data as EmailConnectionRow),
      error: null,
    };
  } catch (decryptError) {
    return {
      tokens: null,
      error: {
        message:
          decryptError instanceof Error
            ? decryptError.message
            : "Décryptage token échoué.",
      },
    };
  }
}

export async function disconnectEmailConnectionForUser(
  userId: string,
  provider?: EmailOAuthProvider,
  request?: Request | null,
): Promise<void> {
  const supabase = await createAuthenticatedSupabaseClient(request);
  if (!supabase) {
    throw new Error("Client Supabase indisponible.");
  }

  let query = supabase.from("email_connections").delete().eq("user_id", userId);

  if (provider) {
    query = query.eq("provider", oauthProviderToStorage(provider));
  }

  logGmailDbTableCheck("delete");

  const { error } = await query;
  if (error) {
    throw new Error(formatEmailConnectionErrorForUser(mapEmailConnectionDbError(error)));
  }
}

type EmailConnectionStatusRow = Pick<
  EmailConnectionRow,
  "email" | "provider" | "connected" | "expires_at" | "refresh_token"
>;

/** Lecture statut sans déchiffrer les tokens (affichage UI / API status). */
export async function loadEmailConnectionStatusForUser(
  userId: string,
  provider?: EmailOAuthProvider,
  request?: Request | null,
): Promise<{
  row: EmailConnectionStatusRow | null;
  error: { message: string; code?: string } | null;
}> {
  const supabase = await createAuthenticatedSupabaseClient(request);
  if (!supabase) {
    return {
      row: null,
      error: { message: "Client Supabase indisponible." },
    };
  }

  let query = supabase
    .from("email_connections")
    .select("email, provider, connected, expires_at, refresh_token")
    .eq("user_id", userId)
    .eq("connected", true);

  if (provider) {
    query = query.eq("provider", oauthProviderToStorage(provider));
  }

  logGmailDbTableCheck("select-status");

  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      row: null,
      error: mapEmailConnectionDbError(error),
    };
  }

  if (!data) {
    return { row: null, error: null };
  }

  return { row: data as EmailConnectionStatusRow, error: null };
}

export async function getEmailConnectionStatusFromSupabase(
  userId: string,
  request?: Request | null,
): Promise<{
  status: {
    connected: boolean;
    expired: boolean;
    provider: EmailOAuthProvider | null;
    email?: string;
    expiresAt?: string;
  } | null;
  error: { message: string; code?: string } | null;
}> {
  const { row, error } = await loadEmailConnectionStatusForUser(
    userId,
    undefined,
    request,
  );

  if (error) {
    return { status: null, error };
  }

  if (!row?.email || !row.connected) {
    return { status: null, error: null };
  }

  const expiresAtMs = new Date(row.expires_at).getTime();
  const expired =
    Date.now() >= expiresAtMs - 60_000 && !row.refresh_token;

  return {
    status: {
      connected: !expired,
      expired,
      provider: storageProviderToOAuth(row.provider),
      email: row.email,
      expiresAt: new Date(expiresAtMs).toISOString(),
    },
    error: null,
  };
}

export async function updateEmailConnectionTokens(
  userId: string,
  tokens: StoredEmailOAuthTokens,
  request?: Request | null,
): Promise<void> {
  await saveEmailConnectionForUser(userId, tokens, request);
}

/** Lecture tokens OAuth via service role (envoi email côté serveur, cron, signature publique). */
export async function loadEmailConnectionTokensForUserId(
  userId: string,
): Promise<StoredEmailOAuthTokens | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    console.warn(
      "[email-connection] service role absent — lecture admin ignorée",
      { userId },
    );
    return null;
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("email_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("connected", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (error) logGmailDbSupabaseError(error);
    return null;
  }

  try {
    return rowToTokens(data as EmailConnectionRow);
  } catch {
    return null;
  }
}
