import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe-server";
import { subscriptionFromStripe } from "@/lib/stripe-subscription";

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe non configuré." },
      { status: 503 },
    );
  }

  let subscriptionId: string | undefined;
  try {
    const body = await request.json();
    subscriptionId = body.subscriptionId?.trim();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!subscriptionId) {
    return NextResponse.json(
      { error: "subscriptionId manquant." },
      { status: 400 },
    );
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const mapped = subscriptionFromStripe(subscription);

    return NextResponse.json({
      status: mapped.status,
      trialEndsAt: mapped.trialEndsAt,
      currentPeriodEnd: mapped.currentPeriodEnd,
    });
  } catch (error) {
    console.error("[stripe/sync-subscription]", error);
    return NextResponse.json(
      { error: "Impossible de synchroniser l'abonnement." },
      { status: 500 },
    );
  }
}
