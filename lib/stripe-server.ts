import "@/lib/stripe-tls-dev";
import Stripe from "stripe";
import {
  getStripePriceIdFromEnv,
  getStripeSecretKey,
} from "@/lib/stripe-config";

export function getStripe(): Stripe | null {
  const secretKey = getStripeSecretKey();
  if (!secretKey) return null;
  return new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export function getStripePriceId(): string | null {
  return getStripePriceIdFromEnv();
}

export function getAppOrigin(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3006";
}
