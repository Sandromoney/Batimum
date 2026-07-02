import type { Session } from "@supabase/supabase-js";
import {
  getBoundSupabaseSession,
  getSupabaseBrowserClient,
} from "@/lib/supabase-browser";
import { MumIaAuthError } from "@/lib/mum-ia-auth-error";

export type MumIaFetchAction =
  | "test-connexion-ia"
  | "verifier-config-serveur"
  | "analyser"
  | "generer"
  | "quota";

export type AuthenticatedSupabaseSession = {
  session: Session;
  accessToken: string;
  clientId: string;
};

function logSessionDiagnostic(
  action: MumIaFetchAction,
  session: Session | null,
  source: string,
): void {
  const token = session?.access_token ?? null;
  console.log(`[MUM IA] session diagnostic (${action})`, {
    source,
    tokenPresent: Boolean(token),
    tokenPrefix: token ? token.slice(0, 10) : null,
    userId: session?.user?.id ?? null,
    expiresAt: session?.expires_at ?? null,
  });
}

/**
 * Résout la session Supabase active via le client applicatif unique.
 * Lance MumIaAuthError si aucun access_token utilisable.
 */
export async function getAuthenticatedSessionOrThrow(
  action: MumIaFetchAction,
): Promise<AuthenticatedSupabaseSession> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    logSessionDiagnostic(action, null, "no-supabase-config");
    throw new MumIaAuthError(
      "Configuration Supabase manquante — vérifiez NEXT_PUBLIC_SUPABASE_URL et la clé anon.",
    );
  }

  const boundSession = getBoundSupabaseSession();
  if (boundSession?.access_token) {
    logSessionDiagnostic(action, boundSession, "provider-bound");
    return {
      session: boundSession,
      accessToken: boundSession.access_token,
      clientId: "singleton-browser",
    };
  }

  let {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.warn(`[MUM IA] getSession error (${action}):`, error.message);
  }

  if (!session?.access_token) {
    const refreshed = await supabase.auth.refreshSession();
    session = refreshed.data.session ?? null;
    if (refreshed.error) {
      console.warn(
        `[MUM IA] refreshSession error (${action}):`,
        refreshed.error.message,
      );
    }
  }

  if (!session?.access_token) {
    const userResult = await supabase.auth.getUser();
    if (userResult.data.user && !userResult.error) {
      const retry = await supabase.auth.getSession();
      session = retry.data.session ?? null;
    }
  }

  logSessionDiagnostic(action, session, "getSession");

  if (!session?.access_token) {
    throw new MumIaAuthError(
      "Aucune session Supabase active — reconnectez-vous via la page Connexion (compte legacy sans Supabase insuffisant pour MUM IA).",
    );
  }

  return {
    session,
    accessToken: session.access_token,
    clientId: "singleton-browser",
  };
}
