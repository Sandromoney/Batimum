import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/gmail-oauth-config";

export function hasSupabaseConfig(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

let browserClient: SupabaseClient | null = null;

export const createClient = (): SupabaseClient | null => {
  if (browserClient) return browserClient;

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseKey);
  return browserClient;
};

export function resetBrowserClientForTests(): void {
  browserClient = null;
}
