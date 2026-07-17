import {
  canAccessApp,
  getAccount,
  type UserAccount,
} from "./account";
import { getCredentials, isGoogleAuthAccount } from "./auth-credentials";
import { getNextOnboardingRoute } from "./onboarding-flow";

export function needsCompanyOnboarding(
  account: UserAccount | null = getAccount(),
): boolean {
  if (!account) return false;
  if (account.onboardingCompleted === true) return false;
  const step = account.onboardingStep ?? 1;
  return step >= 2 && step <= 4;
}

export function canAccessCompanyOnboarding(
  account: UserAccount | null = getAccount(),
): boolean {
  if (!account) return false;
  if (account.onboardingCompleted === true) return false;

  if (isGoogleAuthAccount(account.email)) return true;

  const credentials = getCredentials(account.email);
  if (!credentials) return false;
  return credentials.emailVerified;
}

export function needsSubscriptionCheckout(
  account: UserAccount | null = getAccount(),
): boolean {
  if (!account) return false;
  if (account.onboardingCompleted !== true) return false;
  return !canAccessApp(account);
}

export function getOnboardingRedirectPath(
  account: UserAccount | null = getAccount(),
): string | null {
  if (!account) return "/signup";

  const credentials = getCredentials(account.email);
  if (credentials && !credentials.emailVerified && !isGoogleAuthAccount(account.email)) {
    return "/verifier-email";
  }

  if (account.onboardingCompleted !== true) {
    return getNextOnboardingRoute(account);
  }

  if (needsSubscriptionCheckout(account)) {
    return "/abonnement";
  }

  return null;
}
