import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe-server";

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook Stripe non configuré." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature manquante." }, { status: 400 });
  }

  const payload = await request.text();

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );

    // Les statuts sont synchronisés côté client via verify-session / sync-subscription.
    // Ce webhook valide les événements pour un futur stockage serveur.
    switch (event.type) {
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "checkout.session.completed":
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[stripe/webhook]", error);
    return NextResponse.json({ error: "Webhook invalide." }, { status: 400 });
  }
}
