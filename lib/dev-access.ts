import type { UserAccount } from "./account";
import { isStripeClientConfigured } from "./stripe-config";

export const DEV_ADMIN_EMAIL = "admin@batimum.fr";
export const DEV_ADMIN_PASSWORD = "BatimumV1!";

export function isDevEnvironment(): boolean {
  return process.env.NODE_ENV === "development";
}

export function isStripeConfigured(): boolean {
  return isStripeClientConfigured();
}

export const PAYMENT_NOT_READY_MESSAGE =
  "Paiement en cours de configuration";

export const STRIPE_NOT_CONFIGURED_MESSAGE =
  "Paiement Stripe non configuré.";

export function isDevAdminCredentials(
  email: string,
  password: string,
): boolean {
  if (!isDevEnvironment()) return false;
  return (
    email.trim().toLowerCase() === DEV_ADMIN_EMAIL &&
    password === DEV_ADMIN_PASSWORD
  );
}

export function isDevAdminAccount(account: UserAccount | null): boolean {
  if (!isDevEnvironment() || !account) return false;
  return (
    account.email.toLowerCase() === DEV_ADMIN_EMAIL && account.devBypass === true
  );
}

export function createDevAdminAccount(): UserAccount {
  return {
    entreprise: "Batimum",
    utilisateur: "Admin Dev",
    email: DEV_ADMIN_EMAIL,
    telephone: "0000000000",
    subscriptionStatus: "active",
    devBypass: true,
    createdAt: new Date().toISOString(),
    role: "admin",
  };
}

/** Dev local sans clés Stripe : accès app sans abonnement. */
export function isDevOpenAccess(): boolean {
  return isDevEnvironment() && !isStripeConfigured();
}

export function hasUnrestrictedDevAccess(account: UserAccount | null): boolean {
  if (!isDevEnvironment()) return false;
  if (isDevOpenAccess()) return true;
  return isDevAdminAccount(account);
}
