import {
  GmailDbError,
  logGmailDbSupabaseError,
  SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE,
} from "@/lib/gmail-oauth-config";
import { createAdminClient } from "@/utils/supabase/admin";
import type Stripe from "stripe";

export const USER_AI_USAGE_TABLE = "user_ai_usage";
export const AI_REQUESTS_LIMIT_DEFAULT = 100;

export type UserAiUsageRow = {
  user_id: string;
  subscription_start_date: string | null;
  current_period_start: string;
  current_period_end: string;
  ai_requests_used: number;
  ai_requests_limit: number;
};

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
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
    const row = data as UserAiUsageRow;
    if (new Date(row.current_period_end).getTime() <= Date.now()) {
      const periodStart = new Date();
      const periodEnd = addDays(periodStart, 30);
      const { data: renewed, error: renewError } = await supabase
        .from(USER_AI_USAGE_TABLE)
        .update({
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          ai_requests_used: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select("*")
        .single();

      if (renewError) {
        return { usage: row, error: null };
      }
      return { usage: renewed as UserAiUsageRow, error: null };
    }
    return { usage: row, error: null };
  }

  const now = new Date();
  const periodEnd = addDays(now, 30);
  const { data: created, error: createError } = await supabase
    .from(USER_AI_USAGE_TABLE)
    .insert({
      user_id: userId,
      subscription_start_date: now.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      ai_requests_used: 0,
      ai_requests_limit: AI_REQUESTS_LIMIT_DEFAULT,
    })
    .select("*")
    .single();

  if (createError) {
    logGmailDbSupabaseError(createError);
    return { usage: null, error: new GmailDbError(createError).message };
  }

  return { usage: created as UserAiUsageRow, error: null };
}

export async function incrementUserAiUsage(userId: string): Promise<{
  usage: UserAiUsageRow | null;
  error: string | null;
}> {
  const current = await getOrCreateUserAiUsage(userId);
  if (!current.usage) {
    return current;
  }

  if (current.usage.ai_requests_used >= current.usage.ai_requests_limit) {
    return {
      usage: current.usage,
      error: "Vous avez atteint votre limite de 100 demandes IA ce mois-ci",
    };
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return { usage: null, error: SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE };
  }

  const { data, error } = await supabase
    .from(USER_AI_USAGE_TABLE)
    .update({
      ai_requests_used: current.usage.ai_requests_used + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    logGmailDbSupabaseError(error);
    return { usage: null, error: new GmailDbError(error).message };
  }

  return { usage: data as UserAiUsageRow, error: null };
}

export async function checkUserAiQuota(userId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  message?: string;
}> {
  const { usage, error } = await getOrCreateUserAiUsage(userId);
  if (!usage) {
    return {
      allowed: false,
      used: 0,
      limit: AI_REQUESTS_LIMIT_DEFAULT,
      message: error ?? "Quota IA indisponible.",
    };
  }

  const remaining = usage.ai_requests_limit - usage.ai_requests_used;
  if (remaining <= 0) {
    return {
      allowed: false,
      used: usage.ai_requests_used,
      limit: usage.ai_requests_limit,
      message: "Vous avez atteint votre limite de 100 demandes IA ce mois-ci",
    };
  }

  return {
    allowed: true,
    used: usage.ai_requests_used,
    limit: usage.ai_requests_limit,
  };
}

export async function syncUserAiUsageFromStripeSubscription(
  userId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const item = subscription.items?.data?.[0];
  if (!item) return;

  const periodStart = new Date(item.current_period_start * 1000).toISOString();
  const periodEnd = new Date(item.current_period_end * 1000).toISOString();
  const subscriptionStart = subscription.start_date
    ? new Date(subscription.start_date * 1000).toISOString()
    : periodStart;

  const supabase = createAdminClient();
  if (!supabase) return;

  const { data: existing } = await supabase
    .from(USER_AI_USAGE_TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    await supabase.from(USER_AI_USAGE_TABLE).insert({
      user_id: userId,
      subscription_start_date: subscriptionStart,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      ai_requests_used: 0,
      ai_requests_limit: AI_REQUESTS_LIMIT_DEFAULT,
    });
    return;
  }

  const row = existing as UserAiUsageRow;
  const periodChanged = row.current_period_start !== periodStart;

  await supabase
    .from(USER_AI_USAGE_TABLE)
    .update({
      subscription_start_date:
        row.subscription_start_date ?? subscriptionStart,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      ai_requests_used: periodChanged ? 0 : row.ai_requests_used,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}
