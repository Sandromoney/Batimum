import "@/lib/stripe-tls-dev";
import { createClient } from "@supabase/supabase-js";
import {
  getSupabaseUrl,
  hasSupabaseServiceRoleKeyEnv,
  logGmailDbClientMode,
  SUPABASE_SERVICE_ROLE_KEY_ENV_NAME,
} from "@/lib/gmail-oauth-config";

export function createAdminClient() {
  logGmailDbClientMode();

  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    if (!serviceRoleKey) {
      console.log(
        `[gmail-db] createAdminClient: ${SUPABASE_SERVICE_ROLE_KEY_ENV_NAME} absente`,
      );
    }
    return null;
  }

  console.log(
    `[gmail-db] createAdminClient: clé lue depuis ${SUPABASE_SERVICE_ROLE_KEY_ENV_NAME}`,
  );

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function isAdminClientAvailable(): boolean {
  return Boolean(getSupabaseUrl() && hasSupabaseServiceRoleKeyEnv());
}
