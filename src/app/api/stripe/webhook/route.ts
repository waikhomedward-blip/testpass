import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSession, unlockSessionForPayment, recordEvent } from "@/lib/db";

// The ONLY route that ever sets sessions.unlocked = true. Signature-
// verified against STRIPE_WEBHOOK_SECRET, and fails closed at every step:
// a bad signature, a missing sessionId, an unknown session, or a
// checkout that completed without the payment actually being in a paid
// state all result in no DB change and a locked session. Nothing in the
// buyer-facing UI, and no URL/query parameter (success_url included),
// ever grants access on its own — this route is the trusted boundary.
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!webhookSecret || !stripeKey) {
    console.error("Stripe webhook hit but STRIPE_WEBHOOK_SECRET/STRIPE_SECRET_KEY isn't set.");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  // Read the raw body BEFORE any JSON parsing — Stripe's signature is
  // computed over the exact raw bytes, and Next.js App Router route
  // handlers give you the unparsed Request natively (no body-parser
  // middleware to disable, unlike the old Pages Router).
  const rawBody = await req.text();
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const stripe = new Stripe(stripeKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // checkout.session.completed fires as soon as Checkout finishes, which
  // is not always the same moment as "payment authorized" — some payment
  // methods settle asynchronously, generating this same event with
  // payment_status "unpaid" followed later by
  // checkout.session.async_payment_succeeded (or _failed). V1 only offers
  // card (see src/lib/stripe.ts), which settles immediately, so in
  // practice this app should never see the async events — but handling
  // both event types with the same payment_status check, rather than
  // trusting the event type alone, means that stays an enforced fact
  // instead of an assumption if the payment methods offered ever change.
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    const sessionId = checkoutSession.metadata?.sessionId;

    if (!sessionId || typeof sessionId !== "string") {
      console.error("Stripe webhook: checkout.session has no sessionId in metadata.", checkoutSession.id);
      return NextResponse.json({ ok: true });
    }

    if (checkoutSession.payment_status !== "paid") {
      // Fail closed: a completed Checkout Session that isn't actually
      // paid yet must not unlock anything. If payment eventually
      // succeeds, async_payment_succeeded will re-deliver this same
      // handler with payment_status "paid".
      await recordEvent({
        sessionId,
        eventType: "error",
        metadata: { source: "stripe_webhook", reason: "completed_not_paid", stripeEventType: event.type },
      });
      return NextResponse.json({ ok: true });
    }

    const testpassSession = await getSession(sessionId).catch(() => null);
    if (!testpassSession) {
      // Session doesn't exist (bad/forged metadata, or already cleaned up
      // by retention) — never create or unlock anything on its behalf.
      console.error("Stripe webhook: sessionId in metadata doesn't match any TestPass session.", sessionId);
      await recordEvent({
        sessionId: null,
        eventType: "error",
        metadata: { source: "stripe_webhook", reason: "unknown_session_id", stripeCheckoutSessionId: checkoutSession.id },
      });
      return NextResponse.json({ ok: true });
    }

    try {
      await unlockSessionForPayment({
        sessionId,
        stripeCheckoutSessionId: checkoutSession.id,
        stripePaymentIntentId:
          typeof checkoutSession.payment_intent === "string" ? checkoutSession.payment_intent : null,
      });
    } catch (err) {
      console.error("Stripe webhook: failed to unlock session:", err);
      return NextResponse.json({ error: "Couldn't update session." }, { status: 500 });
    }

    // Deduped per session — a retried webhook delivery for the same
    // Checkout Session re-applies the same (idempotent) unlock update but
    // logs payment_completed at most once.
    await recordEvent({ sessionId, eventType: "payment_completed", once: true });
  }

  // Every other event type (checkout.session.expired,
  // async_payment_failed, etc.) is intentionally a no-op — doing nothing
  // leaves the session locked, which is the fail-closed default.
  return NextResponse.json({ ok: true });
}
