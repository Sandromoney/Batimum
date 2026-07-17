import {
  getAuthenticatedSessionOrThrow,
  type MumIaFetchAction,
} from "@/lib/supabase-browser-session";

export { MumIaAuthError } from "@/lib/mum-ia-auth-error";

function logMumIaFetchDiagnostic(
  action: MumIaFetchAction,
  url: string,
  accessToken: string,
  headers: Headers,
): void {
  const headerSnapshot: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (key.toLowerCase() === "authorization") {
      const raw = value.startsWith("Bearer ") ? value.slice(7) : value;
      headerSnapshot[key] = `Bearer ${raw.slice(0, 10)}…`;
      return;
    }
    headerSnapshot[key] = value;
  });

  console.log(`[MUM IA] fetch (${action})`, {
    url,
    tokenPresent: true,
    tokenPrefix: accessToken.slice(0, 10),
    headers: headerSnapshot,
    credentials: "include",
  });
}

/**
 * Fetch authentifié pour toutes les routes MUM IA.
 * Utilise getAuthenticatedSessionOrThrow() et le client Supabase applicatif unique.
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
  action: MumIaFetchAction,
): Promise<Response> {
  const { accessToken } = await getAuthenticatedSessionOrThrow(action);

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  if (
    !headers.has("Content-Type") &&
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  logMumIaFetchDiagnostic(action, url, accessToken, headers);

  return fetch(url, {
    ...options,
    credentials: "include",
    headers,
    cache: options.cache ?? "no-store",
  });
}

/** @deprecated Utiliser authenticatedFetch(url, options, action) */
export async function mumIaAuthorizedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const action: MumIaFetchAction = url.includes("/diagnostics")
    ? "verifier-config-serveur"
    : url.includes("/test")
      ? "test-connexion-ia"
      : url.includes("/assistant/understand")
        ? "comprendre"
        : url.includes("/analyze")
          ? "analyser"
          : url.includes("/generate")
            ? "generer"
            : "quota";
  return authenticatedFetch(url, options, action);
}
