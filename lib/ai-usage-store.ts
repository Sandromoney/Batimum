import {
  GmailDbError,
  logGmailDbSupabaseError,
  SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE,
} from "@/lib/gmail-oauth-config";
import {
  buildMumIaQuotaExceededMessage,
  buildMumIaQuotaSnapshot,
  type MumIaQuotaSnapshot,
} from "@/lib/mum-ia-quota";
import {
  computeCreditPeriodForSubscription,
  nextCreditPeriodAfter,
} from "@/lib/mum-ia-credit-period";
import { createAdminClient } from "@/utils/supabase/admin";
import type Stripe from "stripe";

export const USER_AI_USAGE_TABLE = "user_ai_usage";
export const AI_REQUESTS_LIMIT_DEFAULT = 100;
const MAX_STORED_GENERATION_IDS = 500;

export type UserAiUsageRow = {
  user_id: string;
  subscription_start_date: string | null;
  current_period_start: string;
  current_period_end: string;
  ai_requests_used: number;
  ai_requests_limit: number;
  ai_pack_credits?: number;
  quota_mum_ia_mensuel?: number;
  mum_ia_utilises_mois?: number;
  mois_quota_actuel?: string | null;
  mum_ia_quota_monthly?: number;
  mum_ia_used_current_period?: number;
  current_credit_period_start?: string | null;
  current_credit_period_end?: string | null;
  last_mum_ia_generation_ids?: string[] | null;
};

export function getMonthlyIncludedQuota(usage: UserAiUsageRow): number {
  return Math.max(
    0,
    usage.mum_ia_quota_monthly ??
      usage.quota_mum_ia_mensuel ??
      usage.ai_requests_limit ??
      AI_REQUESTS_LIMIT_DEFAULT,
  );
}

export function getMumIaUsedCount(usage: UserAiUsageRow): number {
  return Math.max(
    0,
    usage.mum_ia_used_current_period ??
      usage.mum_ia_utilises_mois ??
      usage.ai_requests_used ??
      0,
  );
}

export function getEffectiveAiLimit(usage: UserAiUsageRow): number {
  return getMonthlyIncludedQuota(usage);
}

function getSubscriptionStart(usage: UserAiUsageRow): Date {
  const raw =
    usage.subscription_start_date ??
    usage.current_credit_period_start ??
    usage.current_period_start;
  const date = raw ? new Date(raw) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getCreditPeriodStart(usage: UserAiUsageRow): Date {
  const raw =
    usage.current_credit_period_start ??
    usage.current_period_start ??
    usage.subscription_start_date;
  const date = raw ? new Date(raw) : getSubscriptionStart(usage);
  return Number.isNaN(date.getTime()) ? getSubscriptionStart(usage) : date;
}

function getCreditPeriodEnd(usage: UserAiUsageRow): Date {
  const raw =
    usage.current_credit_period_end ??
    usage.current_period_end;
  if (raw) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return computeCreditPeriodForSubscription(getSubscriptionStart(usage)).periodEnd;
}

function normalizeGenerationIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(-MAX_STORED_GENERATION_IDS);
}

function syncLegacyFields(row: UserAiUsageRow): UserAiUsageRow {
  const monthlyIncluded = getMonthlyIncludedQuota(row);
  const used = getMumIaUsedCount(row);
  return {
    ...row,
    mum_ia_quota_monthly: monthlyIncluded,
    mum_ia_used_current_period: used,
    quota_mum_ia_mensuel: monthlyIncluded,
    mum_ia_utilises_mois: used,
    ai_requests_limit: monthlyIncluded,
    ai_requests_used: used,
    last_mum_ia_generation_ids: normalizeGenerationIds(row.last_mum_ia_generation_ids),
  };
}

function rolloverUsageIfNeeded(
  row: UserAiUsageRow,
  now = new Date(),
): { row: UserAiUsageRow; changed: boolean } {
  const subscriptionStart = getSubscriptionStart(row);
  let periodStart = getCreditPeriodStart(row);
  let periodEnd = getCreditPeriodEnd(row);
  let used = getMumIaUsedCount(row);
  let changed = false;

  while (now.getTime() >= periodEnd.getTime()) {
    const next = nextCreditPeriodAfter(periodEnd, subscriptionStart);
    periodStart = next.periodStart;
    periodEnd = next.periodEnd;
    used = 0;
    changed = true;
  }

  if (!row.current_credit_period_start || !row.current_credit_period_end) {
    const initial = computeCreditPeriodForSubscription(subscriptionStart, now);
    periodStart = initial.periodStart;
    periodEnd = initial.periodEnd;
    changed = true;
  }

  if (!changed) {
    return { row: syncLegacyFields(row), changed: false };
  }

  return {
    row: syncLegacyFields({
      ...row,
      mum_ia_used_current_period: used,
      current_credit_period_start: periodStart.toISOString(),
      current_credit_period_end: periodEnd.toISOString(),
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      subscription_start_date:
        row.subscription_start_date ?? subscriptionStart.toISOString(),
    }),
    changed: true,
  };
}

async function persistUsageRow(
  userId: string,
  row: UserAiUsageRow,
): Promise<{ usage: UserAiUsageRow | null; error: string | null }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { usage: null, error: SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE };
  }

  const synced = syncLegacyFields(row);
  const payload = {
    subscription_start_date: synced.subscription_start_date,
    mum_ia_quota_monthly: synced.mum_ia_quota_monthly,
    mum_ia_used_current_period: synced.mum_ia_used_current_period,
    current_credit_period_start: synced.current_credit_period_start,
    current_credit_period_end: synced.current_credit_period_end,
    quota_mum_ia_mensuel: synced.mum_ia_quota_monthly,
    mum_ia_utilises_mois: synced.mum_ia_used_current_period,
    ai_requests_used: synced.mum_ia_used_current_period,
    ai_requests_limit: synced.mum_ia_quota_monthly,
    current_period_start: synced.current_credit_period_start,
    current_period_end: synced.current_credit_period_end,
    last_mum_ia_generation_ids: synced.last_mum_ia_generation_ids ?? [],
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(USER_AI_USAGE_TABLE)
    .update(payload)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    logGmailDbSupabaseError(error);
    return { usage: null, error: new GmailDbError(error).message };
  }

  return { usage: syncLegacyFields(data as UserAiUsageRow), error: null };
}

export function buildQuotaSnapshotFromUsage(usage: UserAiUsageRow): MumIaQuotaSnapshot {
  const used = getMumIaUsedCount(usage);
  const monthlyIncluded = getMonthlyIncludedQuota(usage);
  const periodEnd =
    usage.current_credit_period_end ??
    usage.current_period_end ??
    new Date().toISOString();

  return buildMumIaQuotaSnapshot({
    used,
    monthlyIncluded,
    packCredits: 0,
    renewalDate: periodEnd,
    periodStart:
      usage.current_credit_period_start ??
      usage.current_period_start ??
      new Date().toISOString(),
    periodEnd,
  });
}

export async function getOrCreateUserAiUsage(userId: string): Promise<{
  usage: UserAiUsageRow | null;
  error: string | null;
}> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { usage: null, error: SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE };
  }

  const { data, error } = await supabase
    .from(USER_AI_USAGE_TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logGmailDbSupabaseError(error);
    return { usage: null, error: new GmailDbError(error).message };
  }

  if (data) {
    const rolled = rolloverUsageIfNeeded(data as UserAiUsageRow);
    if (rolled.changed) {
      return persistUsageRow(userId, rolled.row);
    }
    return { usage: rolled.row, error: null };
  }

  const now = new Date();
  const period = computeCreditPeriodForSubscription(now, now);
  const { data: created, error: createError } = await supabase
    .from(USER_AI_USAGE_TABLE)
    .insert({
      user_id: userId,
      subscription_start_date: now.toISOString(),
      current_period_start: period.periodStart.toISOString(),
      current_period_end: period.periodEnd.toISOString(),
      current_credit_period_start: period.periodStart.toISOString(),
      current_credit_period_end: period.periodEnd.toISOString(),
      ai_requests_used: 0,
      ai_requests_limit: AI_REQUESTS_LIMIT_DEFAULT,
      quota_mum_ia_mensuel: AI_REQUESTS_LIMIT_DEFAULT,
      mum_ia_utilises_mois: 0,
      mum_ia_quota_monthly: AI_REQUESTS_LIMIT_DEFAULT,
      mum_ia_used_current_period: 0,
      last_mum_ia_generation_ids: [],
    })
    .select("*")
    .single();

  if (createError) {
    logGmailDbSupabaseError(createError);
    return { usage: null, error: new GmailDbError(createError).message };
  }

  return { usage: syncLegacyFields(created as UserAiUsageRow), error: null };
}

export async function incrementUserAiUsage(
  userId: string,
  generationId?: string,
): Promise<{
  usage: UserAiUsageRow | null;
  error: string | null;
  alreadyCounted?: boolean;
}> {
  const current = await getOrCreateUserAiUsage(userId);
  if (!current.usage) {
    return current;
  }

  const normalizedId = generationId?.trim();
  const knownIds = normalizeGenerationIds(current.usage.last_mum_ia_generation_ids);

  if (normalizedId && knownIds.includes(normalizedId)) {
    return { usage: current.usage, error: null, alreadyCounted: true };
  }

  const used = getMumIaUsedCount(current.usage);
  const effectiveLimit = getEffectiveAiLimit(current.usage);
  const renewalDate =
    current.usage.current_credit_period_end ??
    current.usage.current_period_end ??
    new Date().toISOString();

  if (used >= effectiveLimit) {
    return {
      usage: current.usage,
      error: buildMumIaQuotaExceededMessage(renewalDate),
    };
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return { usage: null, error: SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE };
  }

  const nextUsed = used + 1;
  const monthlyIncluded = getMonthlyIncludedQuota(current.usage);
  const nextIds = normalizedId
    ? [...knownIds, normalizedId].slice(-MAX_STORED_GENERATION_IDS)
    : knownIds;

  const { data, error } = await supabase
    .from(USER_AI_USAGE_TABLE)
    .update({
      mum_ia_used_current_period: nextUsed,
      mum_ia_utilises_mois: nextUsed,
      ai_requests_used: nextUsed,
      mum_ia_quota_monthly: monthlyIncluded,
      quota_mum_ia_mensuel: monthlyIncluded,
      last_mum_ia_generation_ids: nextIds,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    logGmailDbSupabaseError(error);
    return { usage: null, error: new GmailDbError(error).message };
  }

  return { usage: syncLegacyFields(data as UserAiUsageRow), error: null };
}

export async function checkUserAiQuota(userId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  monthlyIncluded: number;
  packCredits: number;
  renewalDate: string;
  periodStart: string;
  periodEnd: string;
  message?: string;
}> {
  const { usage, error } = await getOrCreateUserAiUsage(userId);
  if (!usage) {
    const fallbackRenewal = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    return {
      allowed: false,
      used: 0,
      limit: AI_REQUESTS_LIMIT_DEFAULT,
      monthlyIncluded: AI_REQUESTS_LIMIT_DEFAULT,
      packCredits: 0,
      renewalDate: fallbackRenewal,
      periodStart: new Date().toISOString(),
      periodEnd: fallbackRenewal,
      message: error ?? "Quota IA indisponible.",
    };
  }

  const snapshot = buildQuotaSnapshotFromUsage(usage);
  const remaining = snapshot.remaining;

  if (remaining <= 0) {
    return {
      allowed: false,
      used: snapshot.used,
      limit: snapshot.limit,
      monthlyIncluded: snapshot.monthlyIncluded,
      packCredits: 0,
      renewalDate: snapshot.renewalDate,
      periodStart: snapshot.periodStart,
      periodEnd: snapshot.periodEnd,
      message: buildMumIaQuotaExceededMessage(snapshot.renewalDate),
    };
  }

  return {
    allowed: true,
    used: snapshot.used,
    limit: snapshot.limit,
    monthlyIncluded: snapshot.monthlyIncluded,
    packCredits: 0,
    renewalDate: snapshot.renewalDate,
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd,
  };
}

export async function syncUserAiUsageFromStripeSubscription(
  userId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const subscriptionStart = subscription.start_date
    ? new Date(subscription.start_date * 1000)
    : new Date();
  const subscriptionStartIso = subscriptionStart.toISOString();

  const supabase = createAdminClient();
  if (!supabase) return;

  const { data: existing } = await supabase
    .from(USER_AI_USAGE_TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const period = computeCreditPeriodForSubscription(subscriptionStart, new Date());

  if (!existing) {
    await supabase.from(USER_AI_USAGE_TABLE).insert({
      user_id: userId,
      subscription_start_date: subscriptionStartIso,
      current_period_start: period.periodStart.toISOString(),
      current_period_end: period.periodEnd.toISOString(),
      current_credit_period_start: period.periodStart.toISOString(),
      current_credit_period_end: period.periodEnd.toISOString(),
      ai_requests_used: 0,
      ai_requests_limit: AI_REQUESTS_LIMIT_DEFAULT,
      quota_mum_ia_mensuel: AI_REQUESTS_LIMIT_DEFAULT,
      mum_ia_utilises_mois: 0,
      mum_ia_quota_monthly: AI_REQUESTS_LIMIT_DEFAULT,
      mum_ia_used_current_period: 0,
      last_mum_ia_generation_ids: [],
    });
    return;
  }

  const row = existing as UserAiUsageRow;
  const hasSubscriptionDate = Boolean(row.subscription_start_date);

  await supabase
    .from(USER_AI_USAGE_TABLE)
    .update({
      subscription_start_date: row.subscription_start_date ?? subscriptionStartIso,
      current_credit_period_start:
        row.current_credit_period_start ?? period.periodStart.toISOString(),
      current_credit_period_end:
        row.current_credit_period_end ?? period.periodEnd.toISOString(),
      current_period_start:
        row.current_period_start ?? period.periodStart.toISOString(),
      current_period_end:
        row.current_period_end ?? period.periodEnd.toISOString(),
      updated_at: new Date().toISOString(),
      ...(hasSubscriptionDate
        ? {}
        : {
            mum_ia_used_current_period: 0,
            mum_ia_utilises_mois: 0,
            ai_requests_used: 0,
          }),
    })
    .eq("user_id", userId);
}

/** @deprecated Utiliser current_credit_period_start via getOrCreateUserAiUsage */
export function currentMumIaQuotaMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}
