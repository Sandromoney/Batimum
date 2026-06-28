import {
  canAccessApp,
  getAccount,
  isLegacyAppUser,
  type UserAccount,
} from "./account";

export function needsCompanyOnboarding(account: UserAccount | null = getAccount()): boolean {
  if (isLegacyAppUser()) return false;
  if (!account) return false;
  if (account.onboardingCompleted !== false) return false;
  return canAccessApp(account);
}
