import { NextRequest, NextResponse } from "next/server";
import { recordEvent } from "@/lib/db";

interface OpenedBody {
    sessionId?: string;
    page?: string;
}

// Tiny best-effort ping so "how many people open Contact vs. actually send
// a message" is visible later -- deliberately not deduped/once-only like
// the funnel events on a session, since a visitor can open Contact more
// than once and each open is a real, separate signal.
export async function POST(req: NextRequest) {
    let body: OpenedBody;
    try {
          body = await req.json();
    } catch {
          return NextResponse.json({ ok: false }, { status: 400 });
    }

  await recordEvent({
        sessionId: body.sessionId ?? null,
        eventType: "contact_opened",
        metadata: body.page ? { page: body.page.slice(0, 200) } : undefined,
  });

  return NextResponse.json({ ok: true });
}
