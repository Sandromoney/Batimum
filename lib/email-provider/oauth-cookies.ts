export const OAUTH_STATE_EXPIRED_MESSAGE =
  "Session OAuth expirée, veuillez recommencer la connexion Gmail.";

export const OAUTH_STATE_INVALID_MESSAGE = "État OAuth invalide.";

export function shouldUseSecureOAuthCookies(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    Boolean(process.env.VERCEL_URL?.trim())
  );
}

export function getOAuthStateCookieOptions() {
  const isProduction =
    process.env.NODE_ENV === "production" ||
    Boolean(process.env.VERCEL_URL?.trim());

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
}

export function getEmailOAuthTokenCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: shouldUseSecureOAuthCookies(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function readCookieFromRequest(
  request: Request,
  name: string,
): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;

  for (const part of header.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return null;
}
