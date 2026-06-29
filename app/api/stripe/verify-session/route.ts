import { NextResponse } from "next/server";
import { syncUserAiUsageFromStripeSubscription } from "@/lib/ai-usage-store";
import { getStripe } from "@/lib/stripe-server";
import { subscriptionFromStripe } from "@/lib/stripe-subscription";
import { getAuthenticatedSupabaseUser } from "@/lib/supabase-auth-server";

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe non configuré." },
      { status: 503 },
    );
  }

  let sessionId: string | undefined;
  try {
    const body = await request.json();
    sessionId = body.sessionId?.trim();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!sessionId) {
    return NextResponse.json({ error: "session_id manquant." }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });

    const subscription =
      typeof session.subscription === "string"
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;

    if (!subscription) {
      return NextResponse.json(
        { error: "Abonnement introuvable." },
        { status: 404 },
      );
    }

    const mapped = subscriptionFromStripe(subscription);
    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id;

    const authUser = await getAuthenticatedSupabaseUser();
    if (authUser) {
      await syncUserAiUsageFromStripeSubscription(authUser.id, subscription);
    }

    return NextResponse.json({
      email: session.customer_email ?? session.customer_details?.email,
      entreprise: session.metadata?.entreprise,
      utilisateur: session.metadata?.utilisateur,
      telephone: session.metadata?.telephone,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: mapped.status,
      trialEndsAt: mapped.trialEndsAt,
      currentPeriodEnd: mapped.currentPeriodEnd,
      currentPeriodStart: mapped.currentPeriodStart,
    });
  } catch (error) {
    console.error("[stripe/verify-session]", error);
    return NextResponse.json(
      { error: "Impossible de vérifier la session." },
      { status: 500 },
    );
  }
}
