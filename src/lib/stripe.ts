// STUBBED — intentionally not wired up yet.
//
// The buyer decided to build the full product first and connect a real
// Stripe account at the end. This file is the single seam where that
// happens later: everything upstream of it (the paywall UI, the
// `unlocked` column on `sessions`, the results page) is already built
// against this interface, so wiring Stripe later means implementing the
// two functions below and flipping NEXT_PUBLIC_PAYWALL_ENABLED to "true" —
// nothing else in the app needs to change.
//
// To go live later:
//   1. `npm install stripe`
//   2. Create a real Stripe Checkout Session in createCheckoutSession()
//      using STRIPE_SECRET_KEY, price = RESULT_PRICE_USD, success_url back
//      to /buyer/session/[id]?unlocked=1, cancel_url back to the same page.
//   3. Verify the webhook signature in a new /api/stripe/webhook route
//      using STRIPE_WEBHOOK_SECRET, and on checkout.session.completed set
//      sessions.unlocked = true for the session in the session's metadata.
//   4. Set NEXT_PUBLIC_PAYWALL_ENABLED=true.

export const RESULT_PRICE_USD = 5;

export const PAYWALL_ENABLED = process.env.NEXT_PUBLIC_PAYWALL_ENABLED === "true";

export async function createCheckoutSession(sessionId: string): Promise<{ url: string }> {
  void sessionId; // will be used once real Checkout Sessions are created here
  throw new Error(
    "Stripe isn't connected yet. This is a stub — see src/lib/stripe.ts for what to wire up when you're ready to charge for real."
  );
}
