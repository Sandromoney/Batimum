import { createClient } from "@supabase/supabase-js";
import {
  getSupabaseServiceRoleKeyWithSource,
  getSupabaseUrl,
} from "@/lib/gmail-oauth-config";

export function createAdminClient() {
  const supabaseUrl = getSupabaseUrl();
  const serviceRole = getSupabaseServiceRoleKeyWithSource();

  if (!supabaseUrl || !serviceRole.value) {
    if (!serviceRole.value) {
      console.log(
        "[gmail-config] createAdminClient: aucune clé service trouvée",
      );
    }
    return null;
  }

  console.log(
    `[gmail-config] createAdminClient: clé lue depuis ${serviceRole.source}`,
  );

  return createClient(supabaseUrl, serviceRole.value, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
