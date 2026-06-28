import { NextResponse } from "next/server";
import { isStripeFullyConfigured } from "@/lib/stripe-config";
import { getStripe, getStripePriceId } from "@/lib/stripe-server";

export async function GET() {
  if (!isStripeFullyConfigured()) {
    return NextResponse.json({ configured: false, connected: false });
  }

  const stripe = getStripe();
  const priceId = getStripePriceId();
  if (!stripe || !priceId) {
    return NextResponse.json({ configured: false, connected: false });
  }

  try {
    const price = await stripe.prices.retrieve(priceId);
    return NextResponse.json({
      configured: true,
      connected: true,
      priceId: price.id,
      currency: price.currency,
      unitAmount: price.unit_amount,
      interval: price.recurring?.interval ?? null,
    });
  } catch {
    return NextResponse.json({ configured: true, connected: false });
  }
}
