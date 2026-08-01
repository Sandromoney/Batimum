/**
 * Auto-connexion développeur — serveur uniquement.
 * Jamais importé côté client pour les identifiants.
 */

export type DevAutoLoginGateReason =
  | "ok"
  | "production"
  | "disabled"
  | "missing_credentials"
  | "missing_supabase"
  | "forbidden_host";

export type DevAutoLoginGate = {
  allowed: boolean;
  reason: DevAutoLoginGateReason;
};

function isTruthyFlag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

/** Hosts locaux / prévisualisation cloud autorisés pour le mode développeur. */
export function isDevAutoLoginHostAllowed(hostHeader: string | null): boolean {
  if (!hostHeader) return false;
  const host = hostHeader.split(":")[0]?.trim().toLowerCase() ?? "";
  if (!host) return false;

  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return true;
  }

  // Tunnel Cloudflare quick (prévisualisation agent cloud uniquement).
  if (host.endsWith(".trycloudflare.com")) {
    return true;
  }

  const extra = process.env.DEV_AUTO_LOGIN_ALLOWED_HOSTS?.trim();
  if (extra) {
    const allowed = extra
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    if (allowed.includes(host)) return true;
  }

  return false;
}

export function getDevAutoLoginCredentials(): {
  email: string;
  password: string;
} | null {
  const email = process.env.DEV_AUTO_LOGIN_EMAIL?.trim() ?? "";
  const password = process.env.DEV_AUTO_LOGIN_PASSWORD ?? "";
  if (!email || !password) return null;
  return { email, password };
}

/**
 * Vérifie si l'auto-connexion peut être proposée / exécutée.
 * Ne révèle jamais les identifiants.
 */
export function evaluateDevAutoLoginGate(
  hostHeader: string | null,
): DevAutoLoginGate {
  if (process.env.NODE_ENV === "production") {
    return { allowed: false, reason: "production" };
  }

  if (!isTruthyFlag(process.env.DEV_AUTO_LOGIN_ENABLED)) {
    return { allowed: false, reason: "disabled" };
  }

  if (!isDevAutoLoginHostAllowed(hostHeader)) {
    return { allowed: false, reason: "forbidden_host" };
  }

  if (!getDevAutoLoginCredentials()) {
    return { allowed: false, reason: "missing_credentials" };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    return { allowed: false, reason: "missing_supabase" };
  }

  return { allowed: true, reason: "ok" };
}

/** Indique au client si le mode développeur est actif (booléen uniquement). */
export function isDevAutoLoginUiEnabled(hostHeader: string | null): boolean {
  return evaluateDevAutoLoginGate(hostHeader).allowed;
}
