import Stripe from "stripe";
import { getStripePriceIdFromEnv, getStripeSecretKey } from "@/lib/stripe-config";

export type StripeCheckoutEnvStatus = {
  STRIPE_SECRET_KEY: boolean;
  STRIPE_PRICE_ID: boolean;
  NEXT_PUBLIC_APP_URL: boolean;
};

export function getStripeCheckoutEnvStatus(): StripeCheckoutEnvStatus {
  return {
    STRIPE_SECRET_KEY: Boolean(getStripeSecretKey()),
    STRIPE_PRICE_ID: Boolean(getStripePriceIdFromEnv()),
    NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
  };
}

export function logStripeCheckoutEnvStatus(): StripeCheckoutEnvStatus {
  const status = getStripeCheckoutEnvStatus();
  console.info(
    "[stripe/checkout] STRIPE_SECRET_KEY détectée :",
    status.STRIPE_SECRET_KEY ? "oui" : "non",
  );
  console.info(
    "[stripe/checkout] STRIPE_PRICE_ID détecté :",
    status.STRIPE_PRICE_ID ? "oui" : "non",
  );
  console.info(
    "[stripe/checkout] NEXT_PUBLIC_APP_URL détectée :",
    status.NEXT_PUBLIC_APP_URL ? "oui" : "non",
  );
  return status;
}

export function getMissingStripeCheckoutEnvVars(): string[] {
  const status = getStripeCheckoutEnvStatus();
  const missing: string[] = [];
  if (!status.STRIPE_SECRET_KEY) missing.push("STRIPE_SECRET_KEY");
  if (!status.STRIPE_PRICE_ID) missing.push("STRIPE_PRICE_ID");
  if (!status.NEXT_PUBLIC_APP_URL) missing.push("NEXT_PUBLIC_APP_URL");
  return missing;
}

export function stripeConfigIncompleteMessage(missingVars: string[]): string {
  return `Configuration Stripe incomplète : ${missingVars.join(", ")}`;
}

export function logStripeApiError(error: unknown): void {
  if (error instanceof Stripe.errors.StripeError) {
    console.error("[stripe/checkout] Erreur Stripe:", {
      type: error.type,
      code: error.code ?? null,
      message: error.message,
      statusCode: error.statusCode ?? null,
    });
    return;
  }

  if (error instanceof Error) {
    console.error("[stripe/checkout] Erreur:", error.message);
    if ("cause" in error && error.cause) {
      console.error("[stripe/checkout] Cause:", error.cause);
    }
    return;
  }

  console.error("[stripe/checkout] Erreur inconnue:", error);
}
