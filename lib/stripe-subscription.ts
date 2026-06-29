import type { SubscriptionStatus } from "./account";
import { mapStripeSubscriptionStatus } from "./account";
import type Stripe from "stripe";

export function subscriptionFromStripe(
  subscription: Stripe.Subscription,
): {
  status: SubscriptionStatus;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  currentPeriodStart?: string;
  subscriptionStartDate?: string;
} {
  const item = subscription.items?.data?.[0];
  const periodEnd = item?.current_period_end ?? undefined;
  const periodStart = item?.current_period_start ?? undefined;

  return {
    status: mapStripeSubscriptionStatus(subscription.status),
    trialEndsAt: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : undefined,
    currentPeriodEnd: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : undefined,
    currentPeriodStart: periodStart
      ? new Date(periodStart * 1000).toISOString()
      : undefined,
    subscriptionStartDate: subscription.start_date
      ? new Date(subscription.start_date * 1000).toISOString()
      : undefined,
  };
}
