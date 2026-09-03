import { NextRequest, NextResponse } from "next/server";
import { getSession, attachSignedImageUrls, recordEvent } from "@/lib/db";
import { PAYWALL_ENABLED } from "@/lib/stripe";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/sessions/[id]">) {
  const { id } = await ctx.params;
  try {
    const session = await getSession(id);
    if (!session) return NextResponse.json({ error: "Not found." }, { status: 404 });

    // Server-enforced authorization boundary — this used to return the
    // full evidence array (verdict, reasoning, image paths/signed URLs)
    // regardless of `unlocked`, relying entirely on the client's `locked`
    // check in SessionStatus.tsx to hide it. That made the paywall
    // decorative: anyone calling this route directly, bypassing the UI,
    // got the result for free. Now a locked session never leaves this
    // route with evidence content at all — the client-side `locked` check
    // still exists for UI purposes, but it's no longer the only thing
    // standing between a non-paying buyer and the result.
    const locked = PAYWALL_ENABLED && session.status === "COMPLETED" && !session.unlocked;
    if (locked) {
      // Completes the monetization funnel (session_created → seller_opened
      // → seller_started → seller_submitted → evaluation_result →
      // paywall_viewed → checkout_started → payment_completed). Fired here,
      // server-side, rather than client-side in SessionStatus.tsx, so it's
      // guaranteed accurate and can't be skipped or double-fired by a client
      // render quirk — this route is the one place that actually knows the
      // buyer was just served the locked state. Deduped per session.
      await recordEvent({ sessionId: id, eventType: "paywall_viewed", once: true });
      return NextResponse.json({ ...session, evidence: [] });
    }

    const withImages = session.status === "COMPLETED" ? await attachSignedImageUrls(session) : session;
    if (session.status === "COMPLETED" && withImages.evidence.length > 0) {
      // Deduped per session (once: true) — this route is polled every 4s
      // by SessionStatus.tsx, so without dedup this would fire dozens of
      // times per real view.
      await recordEvent({ sessionId: id, eventType: "buyer_viewed_result", once: true });
    }
    return NextResponse.json(withImages);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Couldn't load session." }, { status: 500 });
  }
}
