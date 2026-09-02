import { NextResponse } from "next/server";
import { markSessionStarted, recordEvent } from "@/lib/db";

// Called client-side from GuidedCaptureRunner the moment the seller taps
// the first action button ("Turn on camera" / equivalent) — the actual
// "started the guided capture" moment, distinct from "seller_opened"
// (src/app/seller/[id]/page.tsx), which already fires on page load.
// markSessionStarted() itself is idempotent (no-ops if already started),
// so this being called after the page-load path already ran is harmless.
export async function POST(_req: Request, ctx: RouteContext<"/api/sessions/[id]/start">) {
  const { id } = await ctx.params;
  try {
    await markSessionStarted(id);
    await recordEvent({ sessionId: id, eventType: "seller_started", once: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Couldn't update session." }, { status: 500 });
  }
}
