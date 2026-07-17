import type { Session, User } from "@supabase/supabase-js";
import { getAccount, saveAccount, type UserAccount } from "./account";
import { clearOnboardingFlowState } from "./onboarding-flow";
import { createClient } from "@/utils/supabase/client";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function displayNameFromUser(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fullName =
    typeof meta?.full_name === "string" ? meta.full_name.trim() : "";
  if (fullName) return fullName;
  const email = user.email?.trim();
  if (email) return email.split("@")[0] ?? "Utilisateur";
  return "Utilisateur";
}

/** Crée ou met à jour le compte applicatif local à partir d'un utilisateur Supabase Auth. */
export function ensureAppAccountFromSupabaseUser(user: User): UserAccount {
  const userId = user.id;
  const email = user.email?.trim() ?? "";
  const normalizedEmail = normalizeEmail(email);
  const existing = getAccount();
  const now = new Date().toISOString();

  if (
    existing &&
    (existing.supabaseUserId === userId ||
      normalizeEmail(existing.email) === normalizedEmail)
  ) {
    const next: UserAccount = {
      ...existing,
      supabaseUserId: userId,
      email: email || existing.email,
      entreprise: existing.entreprise?.trim() || "Compte test",
      utilisateur: existing.utilisateur?.trim() || displayNameFromUser(user),
      subscriptionStatus: existing.subscriptionStatus ?? "active",
      onboardingCompleted: existing.onboardingCompleted ?? true,
      role: existing.role === "employe" ? "admin" : existing.role ?? "admin",
    };
    saveAccount(next);
    return next;
  }

  const account: UserAccount = {
    entreprise: "Compte test",
    utilisateur: displayNameFromUser(user),
    email,
    telephone: "",
    subscriptionStatus: "active",
    onboardingCompleted: true,
    onboardingStep: 7,
    createdAt: now,
    role: "admin",
    supabaseUserId: userId,
  };
  saveAccount(account);
  return account;
}

/**
 * Connexion dirigeant réussie (email/mot de passe ou Google login existant).
 * Ouvre directement le logiciel — jamais le parcours d'inscription.
 */
export function finalizeDirectorLogin(user: User): UserAccount {
  const base = ensureAppAccountFromSupabaseUser(user);
  return markDirectorOnboardingComplete(base, user.id);
}

/** Marque un compte dirigeant comme hors parcours d'inscription. */
export function markDirectorOnboardingComplete(
  account: UserAccount,
  supabaseUserId?: string,
): UserAccount {
  const next: UserAccount = {
    ...account,
    supabaseUserId: supabaseUserId ?? account.supabaseUserId,
    role: "admin",
    onboardingCompleted: true,
    onboardingStep: 7,
    subscriptionStatus: account.subscriptionStatus ?? "active",
    employeId: undefined,
    employeeLogin: undefined,
  };
  saveAccount(next);
  clearOnboardingFlowState();
  return next;
}

export async function getSupabaseSession(): Promise<Session | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.log("[supabase-auth] getSession error:", error);
    return null;
  }

  return data.session;
}

export async function syncAppAccountFromSupabaseSession(): Promise<UserAccount | null> {
  const session = await getSupabaseSession();
  if (!session?.user) return null;
  return ensureAppAccountFromSupabaseUser(session.user);
}

export function isSupabaseAuthenticatedAccount(
  account: UserAccount | null,
): boolean {
  return Boolean(account?.supabaseUserId);
}

export async function signOutSupabase(): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();
  if (error) {
    console.log("[supabase-auth] signOut error:", error);
  }

  // Nettoie le compte local — les caches scoped par userId restent isolés.
  if (typeof window !== "undefined") {
    const { clearAccount } = await import("@/lib/account");
    clearAccount();
  }
}
