import type { UserAccount } from "./account";

export const PRIVATE_BETA_TEST_EMAIL = "test@batimum.fr";
export const PRIVATE_BETA_TEST_PASSWORD = "mumstest2026!";

export const PRIVATE_BETA_LOGIN_DENIED_MESSAGE =
  "Accès réservé à la bêta privée. Identifiants incorrects.";

export const PRIVATE_BETA_SIGNUP_CLOSED_MESSAGE =
  "Les inscriptions sont temporairement fermées pendant la bêta privée.";

export function isPrivateBetaEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PRIVATE_BETA === "true";
}

export function isPrivateBetaTestEmail(email: string): boolean {
  return email.trim().toLowerCase() === PRIVATE_BETA_TEST_EMAIL;
}

export function isPrivateBetaTestCredentials(
  email: string,
  password: string,
): boolean {
  return (
    isPrivateBetaTestEmail(email) && password === PRIVATE_BETA_TEST_PASSWORD
  );
}

export function isPrivateBetaTestAccount(
  account: UserAccount | null | undefined,
): boolean {
  if (!account) return false;
  return isPrivateBetaTestEmail(account.email);
}

export function hasPrivateBetaAppAccess(
  account: UserAccount | null | undefined,
): boolean {
  if (!isPrivateBetaEnabled()) return false;
  return Boolean(account?.supabaseUserId);
}

export function getPublicSignupHref(): string {
  return isPrivateBetaEnabled() ? "/login" : "/signup";
}

export function createPrivateBetaAccount(): UserAccount {
  return {
    entreprise: "Batimum",
    utilisateur: "Compte Test",
    email: PRIVATE_BETA_TEST_EMAIL,
    telephone: "",
    subscriptionStatus: "active",
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
    role: "admin",
  };
}

export const PRIVATE_BETA_BLOCKED_PATH_PREFIXES = [
  "/signup",
  "/checkout",
  "/mot-de-passe-oublie",
  "/reinitialiser-mot-de-passe",
  "/verifier-email",
] as const;

export function isPrivateBetaBlockedPath(pathname: string): boolean {
  return PRIVATE_BETA_BLOCKED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
