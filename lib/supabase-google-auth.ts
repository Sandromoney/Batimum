import { createClient } from "@/utils/supabase/client";

export type SupabaseGoogleAuthFlow = "login" | "signup";

/**
 * Démarre l'authentification Google via Supabase Auth (identité Batimum).
 * Distinct de l'OAuth Gmail utilisé pour Paramètres → Connexion email.
 */
export async function startSupabaseGoogleAuth(
  flow: SupabaseGoogleAuthFlow,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  if (!supabase) {
    return { ok: false, error: "Configuration Supabase manquante." };
  }

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "";

  const redirectTo = `${origin}/auth/callback?flow=${flow}`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
