import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { disconnectEmailConnectionForUser } from "@/lib/email-connection-store";
import { EMAIL_OAUTH_COOKIE } from "@/lib/email-provider/token-cookie";
import { getAuthenticatedSupabaseUser } from "@/lib/supabase-auth-server";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(EMAIL_OAUTH_COOKIE);

  const authUser = await getAuthenticatedSupabaseUser();
  if (authUser) {
    try {
      await disconnectEmailConnectionForUser(authUser.id, "google");
      console.log("[gmail-oauth] account saved success", {
        action: "disconnect",
        userId: authUser.id,
      });
    } catch (error) {
      console.error("[gmail-oauth] account saved error", error);
    }
  }

  return NextResponse.json({ success: true });
}
