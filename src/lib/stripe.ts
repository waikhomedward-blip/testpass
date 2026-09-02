import Stripe from "stripe";

// Real Stripe Checkout, V1 scope only: one-time payment, card only, no
// subscriptions, no Customer objects, no Billing Portal. See
// src/app/api/stripe/webhook/route.ts for the other half of this flow —
// that route is the ONLY place sessions.unlocked ever gets set to true.
// Nothing here, and nothing in the buyer-facing UI or its query params,
// grants access on its own.

function parsePriceAmount(): number {
  const raw = Number(process.env.RESULT_PRICE_AMOUNT);
  // Fall back on any non-positive/garbage value rather than silently
  // charging $0.00 for a blank or malformed env var.
  return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 500;
}

function parseCurrency(): string {
  const raw = process.env.RESULT_PRICE_CURRENCY?.trim().toLowerCase();
  return raw && raw.length === 3 ? raw : "usd";
}

// In cents (Stripe's smallest-unit convention) and an ISO currency code.
// $5.00 is the initial pricing hypothesis, not a settled decision — both
// are server-side config specifically so that changes later.
export const RESULT_PRICE_AMOUNT = parsePriceAmount();
export const RESULT_PRICE_CURRENCY = parseCurrency();

export const RESULT_PRICE_DISPLAY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: RESULT_PRICE_CURRENCY.toUpperCase(),
}).format(RESULT_PRICE_AMOUNT / 100);

export const PAYWALL_ENABLED = process.env.NEXT_PUBLIC_PAYWALL_ENABLED === "true";

let client: Stripe | null = null;
function getClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Stripe isn't connected yet. Set STRIPE_SECRET_KEY (and STRIPE_WEBHOOK_SECRET for the webhook route) to enable real checkout."
    );
  }
  if (!client) client = new Stripe(key);
  return client;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// appOrigin comes from the request (req.nextUrl.origin), not an env var —
// that way success/cancel URLs are always correct for whichever
// deployment (preview or production) actually initiated checkout.
export async function createCheckoutSession(sessionId: string, appOrigin: string): Promise<{ url: string }> {
  const stripe = getClient();
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    // Card only for V1. Stripe's other payment methods can complete
    // Checkout while the payment itself is still settling (delayed
    // notification), which would make "checkout completed" and "payment
    // authorized" two different moments — see the webhook handler's
    // payment_status check. Card settles immediately, so restricting to
    // it here is what keeps that check simple and actually sufficient
    // rather than aspirational.
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: RESULT_PRICE_CURRENCY,
          product_data: { name: "TestPass result unlock" },
          unit_amount: RESULT_PRICE_AMOUNT,
        },
        quantity: 1,
      },
    ],
    // The only thing that ties this Checkout Session back to a TestPass
    // session — read by the webhook from Stripe's own signed event
    // payload, never from anything the client sends.
    metadata: { sessionId },
    success_url: `${appOrigin}/buyer/session/${sessionId}?checkout=success`,
    cancel_url: `${appOrigin}/buyer/session/${sessionId}?checkout=cancelled`,
  });
  if (!checkoutSession.url) throw new Error("Stripe didn't return a Checkout URL.");
  return { url: checkoutSession.url };
}
