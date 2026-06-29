import { cookies } from "next/headers";
import {
  GmailDbError,
  isEmailConnectionsTableMissingError,
  logGmailDbSupabaseError,
  logGmailDbTableCheck,
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
  const usingServiceRole = true;
  console.log(`[gmail-db] using service role: ${usingServiceRole}`);

  const supabase = createAdminClient();
  if (!supabase) {
    throw new Error(
      "Clé service role Supabase manquante — impossible d'enregistrer le token Gmail.",
    );
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
  const usingServiceRole = Boolean(createAdminClient());
  console.log(`[gmail-db] using service role: ${usingServiceRole}`);

  const supabase = createAdminClient() ?? (await getSupabaseForRequest());
  if (!supabase) return;

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
  const { tokens, error } = await loadEmailConnectionForUser(userId);

  if (error) {
    return { status: null, error };
  }

  if (!tokens?.email) {
    return { status: null, error: null };
  }

  const expired =
    Date.now() >= tokens.expiresAt - 60_000 && !tokens.refreshToken;

  return {
    status: {
      connected: !expired,
      expired,
      provider: tokens.provider,
      email: tokens.email,
      expiresAt: new Date(tokens.expiresAt).toISOString(),
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
