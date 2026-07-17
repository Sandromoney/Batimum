import { type NextRequest, NextResponse } from "next/server";

function getMiddlewareSupabaseKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ""
  );
}

export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && getMiddlewareSupabaseKey(),
  );
}

/** Pages publiques — pas de refresh session (évite timeouts sur /landing). */
function isPublicMarketingPath(pathname: string): boolean {
  if (pathname === "/") return true;
  const publicPrefixes = [
    "/landing",
    "/login",
    "/signup",
    "/login-employe",
    "/checkout",
    "/abonnement",
    "/configurer-entreprise",
    "/verifier-email",
    "/mot-de-passe-oublie",
    "/reinitialiser-mot-de-passe",
    "/mentions-legales",
    "/cgu",
    "/cgv",
    "/confidentialite",
    "/cookies",
  ];
  return publicPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function createClient(request: NextRequest): Promise<NextResponse> {
  if (isPublicMarketingPath(request.nextUrl.pathname)) {
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }

  if (!hasSupabaseEnv()) {
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }

  const { createServerClient } = await import("@supabase/ssr");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  const supabaseKey = getMiddlewareSupabaseKey();

  try {
    let supabaseResponse = NextResponse.next({
      request: { headers: request.headers },
    });

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    await Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("supabase middleware timeout")),
          3000,
        ),
      ),
    ]).catch((error) => {
      console.warn("[supabase/middleware] session refresh skipped", error);
    });

    return supabaseResponse;
  } catch (error) {
    console.error("[supabase/middleware]", error);
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }
}
