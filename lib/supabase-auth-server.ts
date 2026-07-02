import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/gmail-oauth-config";
import { attachMumIaDevDebug } from "@/lib/mum-ia-server-diagnostics";
import { createClient as createServerSupabaseClient } from "@/utils/supabase/server";

export type AuthenticatedSupabaseUser = {
  id: string;
  email: string | null;
};

export type MumIaAuthContext = {
  user: AuthenticatedSupabaseUser;
  companyId: string;
  authSource: "bearer" | "cookie";
};

export function extractBearerToken(request?: Request | null): string | null {
  if (!request) return null;
  const header =
    request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

async function getUserFromAccessToken(
  accessToken: string,
): Promise<AuthenticatedSupabaseUser | null> {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseAnonKey();
  if (!supabaseUrl || !supabaseKey) return null;

  const supabase = createSupabaseJsClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    console.log("[supabase-auth] bearer token rejected", {
      error: error?.message,
    });
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
  };
}

async function getUserFromCookies(): Promise<AuthenticatedSupabaseUser | null> {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  if (!supabase) {
    console.log("[supabase-auth] session missing", {
      reason: "supabase-client-unavailable",
    });
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.log("[supabase-auth] session missing", { error: error.message });
    return null;
  }

  if (!user) {
    console.log("[supabase-auth] session missing");
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
  };
}

/**
 * Résout l'utilisateur connecté depuis le header Authorization (Bearer)
 * ou, en secours, depuis les cookies de session Supabase.
 */
export async function getAuthenticatedSupabaseUser(
  request?: Request | null,
): Promise<AuthenticatedSupabaseUser | null> {
  const bearerToken = extractBearerToken(request);
  if (bearerToken) {
    const fromBearer = await getUserFromAccessToken(bearerToken);
    if (fromBearer) return fromBearer;
  }

  return getUserFromCookies();
}

/** Compte entreprise = propriétaire du compte (user_id). */
export function getCompanyIdForUser(user: AuthenticatedSupabaseUser): string {
  return user.id;
}

export function getAuthorizationDebugHint(request?: Request | null): string {
  const token = extractBearerToken(request);
  if (token) {
    return "Unauthorized — jeton Bearer invalide ou expiré";
  }
  return "Unauthorized — session Supabase absente (aucun Bearer token ni cookie valide)";
}

/**
 * Auth obligatoire pour les routes MUM IA métier.
 * Priorité au Bearer token, repli cookies.
 */
export async function requireMumIaAuth(
  request: Request,
): Promise<MumIaAuthContext | NextResponse> {
  const authHeader =
    request.headers.get("authorization") ?? request.headers.get("Authorization");
  const bearerToken = extractBearerToken(request);

  console.log("[MUM IA] Authorization header reçu:", Boolean(bearerToken), {
    hasAuthHeader: Boolean(authHeader),
    bearerPrefix: bearerToken ? bearerToken.slice(0, 10) : null,
    bearerLength: bearerToken?.length ?? 0,
  });

  if (bearerToken) {
    const fromBearer = await getUserFromAccessToken(bearerToken);
    if (fromBearer) {
      console.log("[MUM IA] auth ok via bearer", {
        userId: fromBearer.id,
        companyId: getCompanyIdForUser(fromBearer),
      });
      return {
        user: fromBearer,
        companyId: getCompanyIdForUser(fromBearer),
        authSource: "bearer",
      };
    }
    console.log("[MUM IA] bearer token présent mais rejeté par Supabase");
  }

  const fromCookies = await getUserFromCookies();
  if (fromCookies) {
    console.log("[MUM IA] auth ok via cookie", {
      userId: fromCookies.id,
      companyId: getCompanyIdForUser(fromCookies),
    });
    return {
      user: fromCookies,
      companyId: getCompanyIdForUser(fromCookies),
      authSource: "cookie",
    };
  }

  console.log("[supabase-auth] MUM IA auth failed", {
    hasBearer: Boolean(bearerToken),
    hasAuthHeader: Boolean(authHeader),
    companyId: null,
    userId: null,
  });

  return NextResponse.json(
    attachMumIaDevDebug(
      {
        success: false,
        code: "unauthenticated",
        message: "Connectez-vous pour utiliser MUM IA.",
      },
      getAuthorizationDebugHint(request),
    ),
    { status: 401 },
  );
}

export function isMumIaAuthContext(
  value: MumIaAuthContext | NextResponse,
): value is MumIaAuthContext {
  return "user" in value && "companyId" in value;
}
