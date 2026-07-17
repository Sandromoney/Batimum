import { hasActiveSubscription, type UserAccount } from "@/lib/account";
import { hasUnrestrictedDevAccess } from "@/lib/dev-access";
import type { Parametres } from "@/lib/types";

export const AI_QUOTA_PRO_MONTHLY = 100;
/** Alias produit : 100 demandes MUM IA / période. */
export const MUM_IA_MONTHLY_LIMIT = AI_QUOTA_PRO_MONTHLY;

export type AiQuotaState = {
  used: number;
  limit: number;
  month: string;
  remaining: number;
  isPro: boolean;
};

function currentMonthKey(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

export function getAiGenerationLimit(account: UserAccount | null): number {
  if (hasUnrestrictedDevAccess(account)) return AI_QUOTA_PRO_MONTHLY;
  if (hasActiveSubscription(account)) return AI_QUOTA_PRO_MONTHLY;
  return AI_QUOTA_PRO_MONTHLY;
}

export function resolveAiQuota(
  parametres: Parametres,
  account: UserAccount | null,
  now = new Date(),
): AiQuotaState {
  const month = currentMonthKey(now);
  const limit =
    parametres.aiGenerationsLimit && parametres.aiGenerationsLimit > 0
      ? parametres.aiGenerationsLimit
      : getAiGenerationLimit(account);
  const storedMonth = parametres.aiGenerationsMonth ?? "";
  const used =
    storedMonth === month ? Math.max(0, parametres.aiGenerationsUsed ?? 0) : 0;

  return {
    used,
    limit,
    month,
    remaining: Math.max(0, limit - used),
    isPro: limit >= AI_QUOTA_PRO_MONTHLY,
  };
}

export function canUseAiGeneration(quota: AiQuotaState): boolean {
  return quota.remaining > 0;
}

export function incrementAiGenerationsUsed(
  parametres: Parametres,
  account: UserAccount | null,
  now = new Date(),
): Parametres {
  const quota = resolveAiQuota(parametres, account, now);
  if (!canUseAiGeneration(quota)) return parametres;

  return {
    ...parametres,
    aiGenerationsMonth: quota.month,
    aiGenerationsUsed: quota.used + 1,
    aiGenerationsLimit: quota.limit,
  };
}
