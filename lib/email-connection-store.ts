import { cookies } from "next/headers";
import {
  GmailDbError,
  logGmailDbClientMode,
  logGmailDbSupabaseError,
  logGmailDbTableCheck,
  SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE,
} from "@/lib/gmail-oauth-config";
import {
  decryptEmailToken,
  encryptEmailToken,
} from "@/lib/email-connection-crypto";
import type { StoredEmailOAuthTokens } from "@/lib/email-provider/types";
import type { EmailOAuthProvider } from "@/lib/types";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

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

async function getSupabaseForRequest() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

export async function saveEmailConnectionForUser(
  userId: string,
  tokens: StoredEmailOAuthTokens,
): Promise<void> {
  logGmailDbClientMode();

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new Error(SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE);
  }

  const supabase = createAdminClient();
  if (!supabase) {
    throw new Error(SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE);
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
    console.error("[gmail-db] upsert error", {
      code: error.code ?? null,
      message: error.message ?? null,
      details: error.details ?? null,
      hint: error.hint ?? null,
    });
    logGmailDbSupabaseError(error);
    throw new GmailDbError(error);
  }
}

export async function loadEmailConnectionForUser(
  userId: string,
  provider?: EmailOAuthProvider,
): Promise<{
  tokens: StoredEmailOAuthTokens | null;
  error: { message: string; code?: string } | null;
}> {
  const supabase = await getSupabaseForRequest();
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
    logGmailDbSupabaseError(error);
    return {
      tokens: null,
      error: {
        message: new GmailDbError(error).message,
        code: error.code,
      },
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
): Promise<void> {
  logGmailDbClientMode();

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new Error(SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE);
  }

  const supabase = createAdminClient();
  if (!supabase) {
    throw new Error(SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE);
  }

  let query = supabase.from("email_connections").delete().eq("user_id", userId);

  if (provider) {
    query = query.eq("provider", oauthProviderToStorage(provider));
  }

  logGmailDbTableCheck("delete");

  const { error } = await query;
  if (error) {
    logGmailDbSupabaseError(error);
    throw new GmailDbError(error);
  }
}

type EmailConnectionStatusRow = Pick<
  EmailConnectionRow,
  "email" | "provider" | "connected" | "expires_at" | "refresh_token"
>;

async function getSupabaseForEmailConnectionRead() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return createAdminClient();
  }
  return getSupabaseForRequest();
}

/** Lecture statut sans déchiffrer les tokens (affichage UI / API status). */
export async function loadEmailConnectionStatusForUser(
  userId: string,
  provider?: EmailOAuthProvider,
): Promise<{
  row: EmailConnectionStatusRow | null;
  error: { message: string; code?: string } | null;
}> {
  const supabase = await getSupabaseForEmailConnectionRead();
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
    logGmailDbSupabaseError(error);
    return {
      row: null,
      error: {
        message: new GmailDbError(error).message,
        code: error.code,
      },
    };
  }

  if (!data) {
    return { row: null, error: null };
  }

  return { row: data as EmailConnectionStatusRow, error: null };
}

export async function getEmailConnectionStatusFromSupabase(
  userId: string,
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
  const { row, error } = await loadEmailConnectionStatusForUser(userId);

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
): Promise<void> {
  await saveEmailConnectionForUser(userId, tokens);
}
