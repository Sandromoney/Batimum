import { hasUnrestrictedDevAccess } from "./dev-access";
import { hasPrivateBetaAppAccess } from "./private-beta";
import type { AppRole } from "./auth-types";
import type { LegalAcceptance } from "./legal-acceptance";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "canceled"
  | "expired";

export interface UserAccount {
  entreprise: string;
  utilisateur: string;
  email: string;
  telephone: string;
  subscriptionStatus: SubscriptionStatus | null;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  createdAt: string;
  /** false = assistant entreprise obligatoire après la première connexion. */
  onboardingCompleted?: boolean;
  /** Bypass abonnement — uniquement en développement local. */
  devBypass?: boolean;
  /** Rôle applicatif V1 locale — sécurité production via Supabase/RLS à venir. */
  role?: AppRole;
  /** Lien vers AppData.employes pour les comptes employé. */
  employeId?: string;
  /** Acceptation CGU/CGV lors de la création de compte. */
  legalAcceptance?: LegalAcceptance;
  /** Identifiant Supabase Auth — source de vérité pour la connexion. */
  supabaseUserId?: string;
}

export const ACCOUNT_STORAGE_KEY = "btp-gestion-account";

export function getAccount(): UserAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserAccount;
  } catch {
    return null;
  }
}

export function saveAccount(account: UserAccount): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
}

export function updateAccount(patch: Partial<UserAccount>): UserAccount | null {
  const current = getAccount();
  if (!current) return null;
  const next = { ...current, ...patch };
  saveAccount(next);
  return next;
}

/** Comptes legacy (données app sans fiche compte) : accès conservé. */
export function isLegacyAppUser(): boolean {
  if (typeof window === "undefined") return false;
  const hasAccount = Boolean(localStorage.getItem(ACCOUNT_STORAGE_KEY));
  const hasAppData = Boolean(localStorage.getItem("btp-gestion-data"));
  return !hasAccount && hasAppData;
}

export function getAppRole(account: UserAccount | null): AppRole {
  if (!account) return "admin";
  return account.role === "employe" ? "employe" : "admin";
}

export function isEmployeAccount(account: UserAccount | null): boolean {
  return getAppRole(account) === "employe";
}

export function isAdminAccount(account: UserAccount | null): boolean {
  return getAppRole(account) === "admin";
}

export function clearAccount(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCOUNT_STORAGE_KEY);
}

export function hasActiveSubscription(
  account: UserAccount | null,
): boolean {
  if (!account) return false;
  return (
    account.subscriptionStatus === "trialing" ||
    account.subscriptionStatus === "active"
  );
}

export function canAccessApp(account: UserAccount | null): boolean {
  if (isLegacyAppUser()) return true;
  if (account?.supabaseUserId) return true;
  if (hasPrivateBetaAppAccess(account)) return true;
  if (hasUnrestrictedDevAccess(account)) return true;
  if (!account) return false;
  if (isEmployeAccount(account)) return true;
  return hasActiveSubscription(account);
}

export function mapStripeSubscriptionStatus(
  stripeStatus: string,
): SubscriptionStatus {
  switch (stripeStatus) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "canceled":
      return "canceled";
    default:
      return "expired";
  }
}
