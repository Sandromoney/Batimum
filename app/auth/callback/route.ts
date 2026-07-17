import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

/**
 * Callback OAuth / magic-link Supabase.
 * - Google login/signup → /auth/complete
 * - Reset password → /reinitialiser-mot-de-passe (via ?next=)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const flow = url.searchParams.get("flow") === "signup" ? "signup" : "login";
  const nextRaw = url.searchParams.get("next");
  const next =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : null;
  const oauthError =
    url.searchParams.get("error_description") ?? url.searchParams.get("error");

  const origin = url.origin;

  if (oauthError) {
    const target = next?.includes("reinitialiser")
      ? `${origin}/mot-de-passe-oublie?error=${encodeURIComponent(oauthError)}`
      : flow === "signup"
        ? `${origin}/signup?error=${encodeURIComponent(oauthError)}`
        : `${origin}/login?error=${encodeURIComponent(oauthError)}`;
    return NextResponse.redirect(target);
  }

  if (!code) {
    const target = next?.includes("reinitialiser")
      ? `${origin}/mot-de-passe-oublie?error=${encodeURIComponent("Lien invalide.")}`
      : flow === "signup"
        ? `${origin}/signup?error=${encodeURIComponent("Code Google manquant.")}`
        : `${origin}/login?error=${encodeURIComponent("Code Google manquant.")}`;
    return NextResponse.redirect(target);
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  if (!supabase) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Configuration Supabase manquante.")}`,
    );
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const target = next?.includes("reinitialiser")
      ? `${origin}/mot-de-passe-oublie?error=${encodeURIComponent(error.message)}`
      : flow === "signup"
        ? `${origin}/signup?error=${encodeURIComponent(error.message)}`
        : `${origin}/login?error=${encodeURIComponent(error.message)}`;
    return NextResponse.redirect(target);
  }

  if (next) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(
    `${origin}/auth/complete?flow=${encodeURIComponent(flow)}`,
  );
}
