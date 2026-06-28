import type { SubscriptionStatus } from "./account";
import { mapStripeSubscriptionStatus } from "./account";
import type Stripe from "stripe";

export function subscriptionFromStripe(
  subscription: Stripe.Subscription,
): {
  status: SubscriptionStatus;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
} {
  const periodEnd =
    subscription.items?.data?.[0]?.current_period_end ?? undefined;

  return {
    status: mapStripeSubscriptionStatus(subscription.status),
    trialEndsAt: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : undefined,
    currentPeriodEnd: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : undefined,
  };
}
