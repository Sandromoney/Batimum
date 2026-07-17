/**
 * Quota MUM IA — schéma minimal user_ai_usage uniquement :
 * current_period_start, current_period_end, ai_requests_used, ai_requests_limit
 * (+ user_id, subscription_start_date, updated_at)
 */
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
import { subscriptionFromStripe } from "@/lib/stripe-subscription";
import { createAdminClient } from "@/utils/supabase/admin";
import type Stripe from "stripe";

export const USER_AI_USAGE_TABLE = "user_ai_usage";
export const MUM_IA_MONTHLY_LIMIT = 100;
export const AI_REQUESTS_LIMIT_DEFAULT = MUM_IA_MONTHLY_LIMIT;

const USAGE_SELECT =
  "user_id, subscription_start_date, current_period_start, current_period_end, ai_requests_used, ai_requests_limit, updated_at";

/** Dedup requestId en mémoire (pas de colonne idempotence en base). */
const recentReserveIds = new Map<string, { used: number; at: number }>();
const RESERVE_DEDUP_MS = 60_000;

export type UserAiUsageRow = {
  user_id: string;
  subscription_start_date: string | null;
  current_period_start: string;
  current_period_end: string;
  ai_requests_used: number;
  ai_requests_limit: number;
};

export function getMonthlyIncludedQuota(usage: UserAiUsageRow): number {
  const raw = Math.max(0, usage.ai_requests_limit ?? AI_REQUESTS_LIMIT_DEFAULT);
  // Ancien forfait 200 → 100
  if (raw === 200) return AI_REQUESTS_LIMIT_DEFAULT;
  return raw || AI_REQUESTS_LIMIT_DEFAULT;
}

export function getMumIaUsedCount(usage: UserAiUsageRow): number {
  return Math.max(0, usage.ai_requests_used ?? 0);
}

export function getEffectiveAiLimit(usage: UserAiUsageRow): number {
  return getMonthlyIncludedQuota(usage);
}

function getSubscriptionStart(usage: UserAiUsageRow): Date {
  const raw = usage.subscription_start_date ?? usage.current_period_start;
  const date = raw ? new Date(raw) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getPeriodStart(usage: UserAiUsageRow): Date {
  const raw = usage.current_period_start ?? usage.subscription_start_date;
  const date = raw ? new Date(raw) : getSubscriptionStart(usage);
  return Number.isNaN(date.getTime()) ? getSubscriptionStart(usage) : date;
}

function getPeriodEnd(usage: UserAiUsageRow): Date {
  if (usage.current_period_end) {
    const date = new Date(usage.current_period_end);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return computeCreditPeriodForSubscription(getSubscriptionStart(usage)).periodEnd;
}

function normalizeRow(row: UserAiUsageRow): UserAiUsageRow {
  return {
    user_id: row.user_id,
    subscription_start_date: row.subscription_start_date ?? null,
    current_period_start: row.current_period_start,
    current_period_end: row.current_period_end,
    ai_requests_used: getMumIaUsedCount(row),
    ai_requests_limit: getMonthlyIncludedQuota(row),
  };
}

function rolloverUsageIfNeeded(
  row: UserAiUsageRow,
  now = new Date(),
): { row: UserAiUsageRow; changed: boolean } {
  const subscriptionStart = getSubscriptionStart(row);
  let periodStart = getPeriodStart(row);
  let periodEnd = getPeriodEnd(row);
  let used = getMumIaUsedCount(row);
  let changed = false;

  while (now.getTime() >= periodEnd.getTime()) {
    const next = nextCreditPeriodAfter(periodEnd, subscriptionStart);
    periodStart = next.periodStart;
    periodEnd = next.periodEnd;
    used = 0;
    changed = true;
  }

  const limit = getMonthlyIncludedQuota(row);
  if (limit !== row.ai_requests_limit) {
    changed = true;
  }

  if (!changed) {
    return { row: normalizeRow(row), changed: false };
  }

  return {
    row: normalizeRow({
      ...row,
      ai_requests_used: used,
      ai_requests_limit: AI_REQUESTS_LIMIT_DEFAULT,
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

  const synced = normalizeRow(row);
  const { data, error } = await supabase
    .from(USER_AI_USAGE_TABLE)
    .update({
      subscription_start_date: synced.subscription_start_date,
      current_period_start: synced.current_period_start,
      current_period_end: synced.current_period_end,
      ai_requests_used: synced.ai_requests_used,
      ai_requests_limit: synced.ai_requests_limit,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select(USAGE_SELECT)
    .single();

  if (error) {
    logGmailDbSupabaseError(error);
    return { usage: null, error: new GmailDbError(error).message };
  }

  return { usage: normalizeRow(data as UserAiUsageRow), error: null };
}

export function buildQuotaSnapshotFromUsage(usage: UserAiUsageRow): MumIaQuotaSnapshot {
  const used = getMumIaUsedCount(usage);
  const monthlyIncluded = getMonthlyIncludedQuota(usage);
  const periodEnd = usage.current_period_end || new Date().toISOString();
  const periodStart = usage.current_period_start || new Date().toISOString();

  return buildMumIaQuotaSnapshot({
    used,
    monthlyIncluded,
    packCredits: 0,
    renewalDate: periodEnd,
    periodStart,
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
    .select(USAGE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logGmailDbSupabaseError(error);
    return { usage: null, error: new GmailDbError(error).message };
  }

  if (data) {
    const rolled = rolloverUsageIfNeeded(data as UserAiUsageRow);
    if (rolled.changed) {
      const persisted = await persistUsageRow(userId, rolled.row);
      // Si le persist échoue, on renvoie quand même la ligne lue (ne pas casser MUM IA)
      if (!persisted.usage) {
        console.warn("[MUM IA QUOTA] rollover persist failed", persisted.error);
        return { usage: rolled.row, error: null };
      }
      return persisted;
    }
    return { usage: normalizeRow(data as UserAiUsageRow), error: null };
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
      ai_requests_used: 0,
      ai_requests_limit: AI_REQUESTS_LIMIT_DEFAULT,
    })
    .select(USAGE_SELECT)
    .single();

  if (createError) {
    logGmailDbSupabaseError(createError);
    return { usage: null, error: new GmailDbError(createError).message };
  }

  return { usage: normalizeRow(created as UserAiUsageRow), error: null };
}

export async function incrementUserAiUsage(
  userId: string,
  _generationId?: string,
): Promise<{
  usage: UserAiUsageRow | null;
  error: string | null;
  alreadyCounted?: boolean;
  technicalFailure?: boolean;
}> {
  const current = await getOrCreateUserAiUsage(userId);
  if (!current.usage) {
    return {
      usage: null,
      error: current.error,
      technicalFailure: true,
    };
  }

  const used = getMumIaUsedCount(current.usage);
  const effectiveLimit = getEffectiveAiLimit(current.usage);
  const renewalDate = current.usage.current_period_end || new Date().toISOString();

  if (used >= effectiveLimit) {
    return {
      usage: current.usage,
      error: buildMumIaQuotaExceededMessage(renewalDate, effectiveLimit),
    };
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return {
      usage: current.usage,
      error: SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE,
      technicalFailure: true,
    };
  }

  const nextUsed = used + 1;
  const { data, error } = await supabase
    .from(USER_AI_USAGE_TABLE)
    .update({
      ai_requests_used: nextUsed,
      ai_requests_limit: effectiveLimit,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select(USAGE_SELECT)
    .single();

  if (error) {
    logGmailDbSupabaseError(error);
    console.warn("[MUM IA QUOTA] increment failed (non-blocking)", {
      userId,
      message: error.message,
    });
    return {
      usage: current.usage,
      error: new GmailDbError(error).message,
      technicalFailure: true,
    };
  }

  return { usage: normalizeRow(data as UserAiUsageRow), error: null };
}

export type MumIaReserveResult = {
  success: boolean;
  limitReached: boolean;
  technicalFailure?: boolean;
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
  alreadyCounted?: boolean;
  error?: string | null;
};

/** +1 au clic (idempotent requestId en mémoire). Ne bloque jamais sur panne BDD. */
export async function reserveMumIaUsage(params: {
  userId: string;
  requestId: string;
}): Promise<MumIaReserveResult> {
  const requestId = params.requestId.trim();
  const dedupKey = `${params.userId}:${requestId}`;
  const cached = recentReserveIds.get(dedupKey);
  if (cached && Date.now() - cached.at < RESERVE_DEDUP_MS) {
    const current = await getOrCreateUserAiUsage(params.userId);
    const usage = current.usage;
    const limit = usage
      ? getMonthlyIncludedQuota(usage)
      : MUM_IA_MONTHLY_LIMIT;
    const used = usage ? getMumIaUsedCount(usage) : cached.used;
    return {
      success: true,
      limitReached: false,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      resetAt: usage?.current_period_end ?? new Date().toISOString(),
      alreadyCounted: true,
    };
  }

  const result = await incrementUserAiUsage(params.userId, requestId);

  if (result.technicalFailure) {
    const fallback = result.usage;
    const used = fallback ? getMumIaUsedCount(fallback) : 0;
    const limit = fallback
      ? getMonthlyIncludedQuota(fallback)
      : MUM_IA_MONTHLY_LIMIT;
    console.warn("[MUM IA QUOTA] reserve technical failure — MUM IA continues", {
      userId: params.userId,
      error: result.error,
    });
    return {
      success: true,
      limitReached: false,
      technicalFailure: true,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      resetAt: fallback?.current_period_end ?? new Date().toISOString(),
      error: result.error,
    };
  }

  if (!result.usage) {
    console.warn("[MUM IA QUOTA] reserve without usage — MUM IA continues", {
      userId: params.userId,
      error: result.error,
    });
    return {
      success: true,
      limitReached: false,
      technicalFailure: true,
      used: 0,
      limit: MUM_IA_MONTHLY_LIMIT,
      remaining: MUM_IA_MONTHLY_LIMIT,
      resetAt: new Date().toISOString(),
      error: result.error,
    };
  }

  const snapshot = buildQuotaSnapshotFromUsage(result.usage);

  if (result.error && !result.alreadyCounted) {
    return {
      success: false,
      limitReached: true,
      used: snapshot.used,
      limit: snapshot.limit,
      remaining: snapshot.remaining,
      resetAt: snapshot.renewalDate,
      error: result.error,
    };
  }

  recentReserveIds.set(dedupKey, { used: snapshot.used, at: Date.now() });

  return {
    success: true,
    limitReached: false,
    used: snapshot.used,
    limit: snapshot.limit,
    remaining: snapshot.remaining,
    resetAt: snapshot.renewalDate,
    alreadyCounted: result.alreadyCounted,
  };
}

/** Décrémente ai_requests_used si possible (best-effort). */
export async function releaseMumIaUsage(params: {
  userId: string;
  requestId?: string;
}): Promise<MumIaReserveResult> {
  const current = await getOrCreateUserAiUsage(params.userId);
  if (!current.usage) {
    return {
      success: true,
      limitReached: false,
      technicalFailure: true,
      used: 0,
      limit: MUM_IA_MONTHLY_LIMIT,
      remaining: MUM_IA_MONTHLY_LIMIT,
      resetAt: new Date().toISOString(),
      error: current.error,
    };
  }

  const used = getMumIaUsedCount(current.usage);
  const limit = getMonthlyIncludedQuota(current.usage);
  const nextUsed = Math.max(0, used - 1);

  const supabase = createAdminClient();
  if (!supabase) {
    return {
      success: true,
      limitReached: false,
      technicalFailure: true,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      resetAt: current.usage.current_period_end,
      error: SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE,
    };
  }

  const { data, error } = await supabase
    .from(USER_AI_USAGE_TABLE)
    .update({
      ai_requests_used: nextUsed,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", params.userId)
    .select(USAGE_SELECT)
    .single();

  if (error || !data) {
    if (error) {
      logGmailDbSupabaseError(error);
      console.warn("[MUM IA QUOTA] release failed (ignored)", error.message);
    }
    const snapshot = buildQuotaSnapshotFromUsage(current.usage);
    return {
      success: true,
      limitReached: false,
      technicalFailure: true,
      used: snapshot.used,
      limit: snapshot.limit,
      remaining: snapshot.remaining,
      resetAt: snapshot.renewalDate,
    };
  }

  if (params.requestId) {
    recentReserveIds.delete(`${params.userId}:${params.requestId.trim()}`);
  }

  const snapshot = buildQuotaSnapshotFromUsage(normalizeRow(data as UserAiUsageRow));
  return {
    success: true,
    limitReached: false,
    used: snapshot.used,
    limit: snapshot.limit,
    remaining: snapshot.remaining,
    resetAt: snapshot.renewalDate,
  };
}

export type MumIaQuotaCheckResult = {
  allowed: boolean;
  limitReached: boolean;
  storageAvailable: boolean;
  used: number;
  limit: number;
  monthlyIncluded: number;
  packCredits: number;
  renewalDate: string;
  periodStart: string;
  periodEnd: string;
  message?: string;
};

export async function checkUserAiQuota(
  userId: string,
): Promise<MumIaQuotaCheckResult> {
  const { usage, error } = await getOrCreateUserAiUsage(userId);
  if (!usage) {
    const fallbackRenewal = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    console.warn("[MUM IA] quota storage unavailable — allow MUM IA", {
      userId,
      error: error ?? "unknown",
    });
    return {
      allowed: true,
      limitReached: false,
      storageAvailable: false,
      used: 0,
      limit: AI_REQUESTS_LIMIT_DEFAULT,
      monthlyIncluded: AI_REQUESTS_LIMIT_DEFAULT,
      packCredits: 0,
      renewalDate: fallbackRenewal,
      periodStart: new Date().toISOString(),
      periodEnd: fallbackRenewal,
    };
  }

  const snapshot = buildQuotaSnapshotFromUsage(usage);

  if (snapshot.remaining <= 0) {
    return {
      allowed: false,
      limitReached: true,
      storageAvailable: true,
      used: snapshot.used,
      limit: snapshot.limit,
      monthlyIncluded: snapshot.monthlyIncluded,
      packCredits: 0,
      renewalDate: snapshot.renewalDate,
      periodStart: snapshot.periodStart,
      periodEnd: snapshot.periodEnd,
      message: buildMumIaQuotaExceededMessage(snapshot.renewalDate, snapshot.limit),
    };
  }

  return {
    allowed: true,
    limitReached: false,
    storageAvailable: true,
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
  const stripeInfo = subscriptionFromStripe(subscription);

  const subscriptionStart = stripeInfo.subscriptionStartDate
    ? new Date(stripeInfo.subscriptionStartDate)
    : subscription.start_date
      ? new Date(subscription.start_date * 1000)
      : new Date();
  const subscriptionStartIso = subscriptionStart.toISOString();

  const stripePeriodStart = stripeInfo.currentPeriodStart
    ? new Date(stripeInfo.currentPeriodStart)
    : null;
  const stripePeriodEnd = stripeInfo.currentPeriodEnd
    ? new Date(stripeInfo.currentPeriodEnd)
    : null;
  const period =
    stripePeriodStart &&
    stripePeriodEnd &&
    !Number.isNaN(stripePeriodStart.getTime()) &&
    !Number.isNaN(stripePeriodEnd.getTime())
      ? {
          periodStart: stripePeriodStart,
          periodEnd: stripePeriodEnd,
        }
      : computeCreditPeriodForSubscription(subscriptionStart, new Date());

  const periodStartIso = period.periodStart.toISOString();
  const periodEndIso = period.periodEnd.toISOString();

  const supabase = createAdminClient();
  if (!supabase) return;

  const { data: existing } = await supabase
    .from(USER_AI_USAGE_TABLE)
    .select(USAGE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    await supabase.from(USER_AI_USAGE_TABLE).insert({
      user_id: userId,
      subscription_start_date: subscriptionStartIso,
      current_period_start: periodStartIso,
      current_period_end: periodEndIso,
      ai_requests_used: 0,
      ai_requests_limit: AI_REQUESTS_LIMIT_DEFAULT,
    });
    return;
  }

  const row = existing as UserAiUsageRow;
  const previousPeriodEnd = row.current_period_end;
  const periodAdvanced =
    Boolean(previousPeriodEnd) &&
    new Date(previousPeriodEnd).getTime() <= period.periodStart.getTime();

  await supabase
    .from(USER_AI_USAGE_TABLE)
    .update({
      subscription_start_date: row.subscription_start_date ?? subscriptionStartIso,
      current_period_start: periodStartIso,
      current_period_end: periodEndIso,
      ai_requests_limit: AI_REQUESTS_LIMIT_DEFAULT,
      updated_at: new Date().toISOString(),
      ...(periodAdvanced || !previousPeriodEnd
        ? { ai_requests_used: 0 }
        : {}),
    })
    .eq("user_id", userId);
}

/** @deprecated */
export function currentMumIaQuotaMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}
