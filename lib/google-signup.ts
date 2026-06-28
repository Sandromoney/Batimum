import { saveAccount, type UserAccount } from "@/lib/account";
import { saveGoogleSignupCredentials } from "@/lib/auth-credentials";
import {
  fetchEmailConnectionStatus,
  mergeConnexionEmailMetadata,
} from "@/lib/email-provider";
import type { LegalAcceptance } from "@/lib/legal-acceptance";
import { fetchRecordedTermsAcceptance } from "@/lib/legal-acceptance";
import type { AppData } from "@/lib/types";

export function deriveNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "Utilisateur";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

export function buildGoogleSignupAccount(
  email: string,
  displayName?: string,
  legalAcceptance?: LegalAcceptance,
): UserAccount {
  const normalizedEmail = email.trim().toLowerCase();
  const utilisateur = displayName?.trim() || deriveNameFromEmail(normalizedEmail);

  return {
    entreprise: "",
    utilisateur,
    email: normalizedEmail,
    telephone: "",
    subscriptionStatus: null,
    onboardingCompleted: false,
    createdAt: new Date().toISOString(),
    legalAcceptance,
  };
}

export function applyGoogleSignupToAppData(
  data: AppData,
  email: string,
  displayName?: string,
): AppData {
  const account = buildGoogleSignupAccount(email, displayName);
  const status = {
    connected: true,
    expired: false,
    provider: "google" as const,
    email: account.email,
    expiresAt: undefined,
  };

  const parametres = mergeConnexionEmailMetadata(
    {
      ...data.parametres,
      email: account.email,
      emailFacturation: data.parametres.emailFacturation || account.email,
      utilisateur: account.utilisateur,
    },
    status,
  );

  return { ...data, parametres };
}

export async function finalizeGoogleSignupFromOAuth(options?: {
  displayName?: string;
  legalAcceptance?: LegalAcceptance;
}): Promise<
  | { ok: true; email: string; account: UserAccount }
  | { ok: false; message: string }
> {
  const legalAcceptance =
    options?.legalAcceptance ?? (await fetchRecordedTermsAcceptance());

  if (!legalAcceptance?.cguAccepted || !legalAcceptance?.cgvAccepted) {
    return {
      ok: false,
      message: "Veuillez accepter les CGU et les CGV avant de continuer.",
    };
  }

  const status = await fetchEmailConnectionStatus();
  if (!status.connected || !status.email) {
    return {
      ok: false,
      message:
        "Connexion Google incomplète. Veuillez réessayer depuis la page d'inscription.",
    };
  }

  const account = buildGoogleSignupAccount(
    status.email,
    options?.displayName,
    legalAcceptance,
  );
  saveAccount(account);
  saveGoogleSignupCredentials(account.email);

  return { ok: true, email: account.email, account };
}

export async function startStripeCheckoutForEmail(
  email: string,
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  try {
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const payload = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !payload.url) {
      return {
        ok: false,
        message: payload.error ?? "Impossible de démarrer l'essai gratuit.",
      };
    }

    return { ok: true, url: payload.url };
  } catch {
    return {
      ok: false,
      message: "Impossible de démarrer l'essai gratuit.",
    };
  }
}
