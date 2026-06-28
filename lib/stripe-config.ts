/** Lecture centralisée des variables Stripe (.env.local). */

export function getStripePublishableKey(): string | null {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || null;
}

export function getStripeSecretKey(): string | null {
  return process.env.STRIPE_SECRET_KEY?.trim() || null;
}

export function getStripePriceIdFromEnv(): string | null {
  return process.env.STRIPE_PRICE_ID?.trim() || null;
}

export function isStripeClientConfigured(): boolean {
  return Boolean(getStripePublishableKey());
}

export function isStripeServerConfigured(): boolean {
  return Boolean(getStripeSecretKey() && getStripePriceIdFromEnv());
}

export function isStripeFullyConfigured(): boolean {
  return isStripeClientConfigured() && isStripeServerConfigured();
}
