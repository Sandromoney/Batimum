import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

let boundClient: SupabaseClient | null = null;
let boundSession: Session | null = null;

/** Synchronise l'état React du provider avec les appels hors composant (MUM IA). */
export function bindSupabaseBrowserState(
  client: SupabaseClient | null,
  session: Session | null,
): void {
  boundClient = client;
  boundSession = session;
}

export function getBoundSupabaseSession(): Session | null {
  return boundSession;
}

/** Client navigateur unique — jamais recréé ici, toujours le singleton applicatif. */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  return boundClient ?? createClient();
}
