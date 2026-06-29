import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function getAuthenticatedSupabaseUser(): Promise<{
  id: string;
  email: string | null;
} | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  if (!supabase) {
    console.log("[gmail-status] user session missing", {
      reason: "supabase-client-unavailable",
    });
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.log("[gmail-status] user session missing", { error: error.message });
    return null;
  }

  if (!user) {
    console.log("[gmail-status] user session missing");
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
  };
}