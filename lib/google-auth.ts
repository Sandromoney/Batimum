import {
  getAccount,
  saveAccount,
  canAccessApp,
  type UserAccount,
} from "@/lib/account";
import {
  getCredentials,
  isGoogleAuthAccount,
} from "@/lib/auth-credentials";
import {
  fetchEmailConnectionStatus,
  mergeConnexionEmailMetadata,
} from "@/lib/email-provider";
import type { AppData } from "@/lib/types";
import { needsCompanyOnboarding } from "@/lib/onboarding";
import { buildGoogleSignupAccount } from "@/lib/google-signup";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function accountExistsForEmail(email: string): boolean {
  return Boolean(getCredentials(normalizeEmail(email)));
}

export function syncGoogleEmailToAppData(
  data: AppData,
  email: string,
  displayName?: string,
): AppData {
  const normalized = normalizeEmail(email);
  const utilisateur =
    displayName?.trim() ||
    data.parametres.utilisateur ||
    normalized.split("@")[0];

  const status = {
    connected: true,
    expired: false,
    provider: "google" as const,
    email: normalized,
    expiresAt: undefined,
  };

  return {
    ...data,
    parametres: mergeConnexionEmailMetadata(
      {
        ...data.parametres,
        email: normalized,
        emailFacturation: data.parametres.emailFacturation || normalized,
        utilisateur,
      },
      status,
    ),
  };
}

export async function finalizeGoogleLoginFromOAuth(options?: {
  displayName?: string;
}): Promise<
  | {
      ok: true;
      email: string;
      account: UserAccount;
      redirectTo: string;
    }
  | { ok: false; message: string; redirectTo?: string }
> {
  const status = await fetchEmailConnectionStatus();
  if (!status.connected || !status.email) {
    return {
      ok: false,
      message: "Connexion Google incomplète. Veuillez réessayer.",
    };
  }

  const email = normalizeEmail(status.email);

  if (!accountExistsForEmail(email)) {
    return {
      ok: false,
      message:
        "Aucun compte trouvé pour cette adresse Google. Créez d'abord votre compte.",
      redirectTo: `/signup?email=${encodeURIComponent(email)}&notice=${encodeURIComponent("no_account")}`,
    };
  }

  const credentials = getCredentials(email);
  if (!credentials?.emailVerified) {
    return {
      ok: false,
      message: "Ce compte n'est pas encore activé.",
      redirectTo: "/verifier-email",
    };
  }

  if (!isGoogleAuthAccount(email) && credentials.authProvider !== "google") {
    return {
      ok: false,
      message:
        "Ce compte utilise un mot de passe. Connectez-vous avec votre email et mot de passe.",
    };
  }

  const existing = getAccount();
  const base =
    existing?.email.toLowerCase() === email
      ? existing
      : buildGoogleSignupAccount(email, options?.displayName);

  const account: UserAccount = {
    ...base,
    email,
    utilisateur:
      options?.displayName?.trim() || base.utilisateur || email.split("@")[0],
  };

  saveAccount(account);

  let redirectTo = "/dashboard";
  if (!canAccessApp(account)) {
    redirectTo = "/abonnement";
  } else if (needsCompanyOnboarding(account)) {
    redirectTo = "/configurer-entreprise";
  }

  return { ok: true, email, account, redirectTo };
}
