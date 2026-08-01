import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  evaluateDevAutoLoginGate,
  getDevAutoLoginCredentials,
} from "@/lib/dev-auto-login";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/gmail-oauth-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hostFromRequest(request: NextRequest): string | null {
  return (
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")
  );
}

/** GET — statut uniquement (jamais d’identifiants). */
export async function GET(request: NextRequest) {
  const gate = evaluateDevAutoLoginGate(hostFromRequest(request));
  return NextResponse.json(
    {
      enabled: gate.allowed,
      reason: gate.reason,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

/**
 * POST — connexion réelle via Supabase Auth (signInWithPassword).
 * Pose les cookies de session comme une connexion normale.
 */
export async function POST(request: NextRequest) {
  const host = hostFromRequest(request);
  const gate = evaluateDevAutoLoginGate(host);

  if (!gate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "Auto-connexion développeur indisponible.",
        reason: gate.reason,
      },
      { status: gate.reason === "production" ? 404 : 403 },
    );
  }

  const credentials = getDevAutoLoginCredentials();
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseAnonKey();

  if (!credentials || !supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "Configuration auto-connexion incomplète.",
        reason: "missing_credentials",
      },
      { status: 403 },
    );
  }

  const cookieJar: Array<{
    name: string;
    value: string;
    options?: Parameters<NextResponse["cookies"]["set"]>[2];
  }> = [];

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieJar.push({ name, value, options });
        });
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error || !data.session?.user) {
    console.warn("[dev-login] signInWithPassword failed", error?.message);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Connexion développeur impossible.",
      },
      { status: 401 },
    );
  }

  const user = data.session.user;
  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email ?? null,
    },
  });

  for (const cookie of cookieJar) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}
