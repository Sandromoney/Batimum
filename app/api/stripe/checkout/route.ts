import "@/lib/stripe-tls-dev";
import { NextResponse } from "next/server";
import { isPrivateBetaEnabled, PRIVATE_BETA_SIGNUP_CLOSED_MESSAGE } from "@/lib/private-beta";
import { SIGNUP_STRIPE_ERROR_MESSAGE } from "@/lib/signup-validation";
import {
  getMissingStripeCheckoutEnvVars,
  logStripeApiError,
  logStripeCheckoutEnvStatus,
  stripeConfigIncompleteMessage,
} from "@/lib/stripe-checkout-diagnostic";
import { getStripe } from "@/lib/stripe-server";

export async function POST(request: Request) {
  if (isPrivateBetaEnabled()) {
    return NextResponse.json(
      { error: PRIVATE_BETA_SIGNUP_CLOSED_MESSAGE },
      { status: 403 },
    );
  }

  logStripeCheckoutEnvStatus();

  const missingVars = getMissingStripeCheckoutEnvVars();
  if (missingVars.length > 0) {
    console.error(
      "[stripe/checkout] Variables manquantes:",
      missingVars.join(", "),
    );
    return NextResponse.json(
      { error: stripeConfigIncompleteMessage(missingVars) },
      { status: 503 },
    );
  }

  const stripe = getStripe();
  const priceId = process.env.STRIPE_PRICE_ID!.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!.trim().replace(/\/$/, "");

  if (!stripe) {
    console.error(
      "[stripe/checkout] Client Stripe non initialisé malgré STRIPE_SECRET_KEY présente.",
    );
    return NextResponse.json(
      { error: stripeConfigIncompleteMessage(["STRIPE_SECRET_KEY"]) },
      { status: 503 },
    );
  }

  let body: {
    email?: string;
    entreprise?: string;
    utilisateur?: string;
    telephone?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const entreprise = body.entreprise?.trim() ?? "";
  const utilisateur = body.utilisateur?.trim() ?? "";
  const telephone = body.telephone?.trim() ?? "";

  if (!email) {
    return NextResponse.json(
      { error: "L'email est obligatoire." },
      { status: 400 },
    );
  }

  console.info("[stripe/checkout] Création session:", {
    mode: "subscription",
    locale: "fr",
    payment_method_collection: "always",
    customer_email: email,
    priceId,
    trial_period_days: 7,
    success_url: `${appUrl}/dashboard?checkout=success`,
    cancel_url: `${appUrl}/signup?checkout=cancel`,
  });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      locale: "fr",
      payment_method_collection: "always",
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          entreprise,
          utilisateur,
          telephone,
        },
      },
      metadata: {
        entreprise,
        utilisateur,
        telephone,
      },
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/signup?checkout=cancel`,
    });

    if (!session.url) {
      console.error(
        "[stripe/checkout] Session créée sans URL de redirection (id:",
        session.id,
        ")",
      );
      return NextResponse.json(
        { error: SIGNUP_STRIPE_ERROR_MESSAGE },
        { status: 503 },
      );
    }

    console.info("[stripe/checkout] Session créée:", session.id);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    logStripeApiError(error);
    return NextResponse.json(
      { error: SIGNUP_STRIPE_ERROR_MESSAGE },
      { status: 503 },
    );
  }
}
