import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession, isStripeConfigured } from "@/lib/stripe";
import { getSession, recordEvent } from "@/lib/db";

// Starts a real Stripe Checkout Session for a completed TestPass. Unlock
// itself never happens here — only the signed webhook
// (src/app/api/stripe/webhook/route.ts) ever sets sessions.unlocked. This
// route's job is just "does Stripe exist, does this session make sense to
// charge for, redirect to Stripe or explain why not."
export async function POST(req: NextRequest, ctx: RouteContext<"/api/checkout/[id]">) {
  const { id } = await ctx.params;

  if (!isStripeConfigured()) {
    return NextResponse.redirect(new URL(`/buyer/session/${id}?checkout=unavailable`, req.url));
  }

  const session = await getSession(id).catch((err) => {
    console.error("checkout: couldn't load session:", err);
    return null;
  });
  if (!session || session.status !== "COMPLETED") {
    return NextResponse.redirect(new URL(`/buyer/session/${id}?checkout=unavailable`, req.url));
  }
  if (session.unlocked) {
    // Already unlocked (paywall off, or already paid) — nothing to charge
    // for. Send them straight back rather than creating a pointless
    // Checkout Session.
    return NextResponse.redirect(new URL(`/buyer/session/${id}`, req.url));
  }

  try {
    const { url } = await createCheckoutSession(id, req.nextUrl.origin);
    await recordEvent({ sessionId: id, eventType: "checkout_started", once: true });
    // Explicit 303: this route is hit by a plain HTML POST form
    // (SessionStatus.tsx), and NextResponse.redirect()'s default 307
    // preserves the original method on redirect — so browsers were
    // re-issuing the redirect as a POST to Stripe's hosted checkout page,
    // which only serves GET and rejects the POST at its CDN. 303 forces
    // the follow-up request to GET regardless of how this route was
    // reached, which is what a "redirect after a form POST" should do.
    return NextResponse.redirect(url, 303);
  } catch (err) {
    console.error("createCheckoutSession failed:", err);
    return NextResponse.redirect(new URL(`/buyer/session/${id}?checkout=unavailable`, req.url));
  }
}
