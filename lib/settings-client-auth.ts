import { getAccount } from "@/lib/account";
import { createClient } from "@/utils/supabase/client";
import { getSupabaseSession } from "@/lib/supabase-auth";

export type SettingsClientAuthDebug = {
  url: string;
  hasSupabaseSession: boolean;
  hasAccessToken: boolean;
  companyIdKnown: boolean;
  companyId: string | null;
  userEmail: string | null;
};

/** Logs temporaires pour diagnostiquer la sauvegarde Paramètres. */
export async function logSettingsClientAuthDebug(
  url: string,
  payload?: unknown,
): Promise<SettingsClientAuthDebug> {
  const session = await getSupabaseSession();
  const account = getAccount();
  const companyId = account?.supabaseUserId ?? session?.user?.id ?? null;

  const debug: SettingsClientAuthDebug = {
    url,
    hasSupabaseSession: Boolean(session),
    hasAccessToken: Boolean(session?.access_token),
    companyIdKnown: Boolean(companyId),
    companyId,
    userEmail: session?.user?.email ?? account?.email ?? null,
  };

  console.log("[parametres-save] client debug", {
    ...debug,
    payloadKeys:
      payload && typeof payload === "object"
        ? Object.keys(payload as Record<string, unknown>)
        : [],
    employesCount:
      payload &&
      typeof payload === "object" &&
      Array.isArray((payload as { employes?: unknown }).employes)
        ? (payload as { employes: unknown[] }).employes.length
        : 0,
  });

  return debug;
}

/** Rafraîchit la session Supabase avant un appel API authentifié. */
export async function getRefreshedSupabaseAccessToken(): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) {
    console.log("[parametres-save] client: supabase browser client unavailable");
    return null;
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.log("[parametres-save] client: getSession error", error.message);
    return null;
  }

  if (!session?.access_token) {
    console.log("[parametres-save] client: no session access_token");
    return null;
  }

  const { data: refreshed, error: refreshError } =
    await supabase.auth.refreshSession();

  if (refreshError) {
    console.log(
      "[parametres-save] client: refreshSession failed, using current token",
      refreshError.message,
    );
    return session.access_token;
  }

  const token = refreshed.session?.access_token ?? session.access_token;
  console.log("[parametres-save] client: access_token ready", {
    refreshed: Boolean(refreshed.session?.access_token),
    tokenLength: token.length,
  });
  return token;
}
