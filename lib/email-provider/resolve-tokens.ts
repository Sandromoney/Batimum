import { cookies } from "next/headers";
import { loadEmailConnectionForUser } from "@/lib/email-connection-store";
import {
  sealEmailOAuthTokens,
  unsealEmailOAuthTokens,
} from "@/lib/email-provider/token-cookie";
import type { StoredEmailOAuthTokens } from "@/lib/email-provider/types";
import { getAuthenticatedSupabaseUser } from "@/lib/supabase-auth-server";

export async function resolveEmailOAuthTokens(
  cookieSealed?: string | null,
): Promise<{
  tokens: StoredEmailOAuthTokens | null;
  sealed: string | null;
  userId: string | null;
}> {
  const user = await getAuthenticatedSupabaseUser();
  const fromCookie = unsealEmailOAuthTokens(cookieSealed);
  if (fromCookie) {
    return {
      tokens: fromCookie,
      sealed: cookieSealed ?? null,
      userId: user?.id ?? null,
    };
  }

  if (!user) {
    return { tokens: null, sealed: null, userId: null };
  }

  const { tokens: fromDb } = await loadEmailConnectionForUser(user.id);
  if (!fromDb) {
    return { tokens: null, sealed: null, userId: user.id };
  }

  return {
    tokens: fromDb,
    sealed: sealEmailOAuthTokens(fromDb),
    userId: user.id,
  };
}
