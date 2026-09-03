import { NextRequest, NextResponse } from "next/server";
import { submitFeedback, getSession } from "@/lib/db";

interface FeedbackBody {
  sessionId?: string;
  actor?: string;
  stage?: string;
  rating?: string;
  freeText?: string;
  page?: string;
}

const MAX_FREE_TEXT = 1000; // a report or a "what was confusing?" answer, not an essay

// Deliberately un-authenticated beyond a valid sessionId — a seller has no
// account to be logged into, and a buyer's "session" here is just this
// browser tab. Nothing this route writes is ever shown back to anyone; it's
// read only by the beta-ops digest/learnings process. See
// supabase/add-launch-operating-fields.sql for the `feedback` table.
export async function POST(req: NextRequest) {
  let body: FeedbackBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body.actor !== "buyer" && body.actor !== "seller") {
    return NextResponse.json({ error: "Invalid actor." }, { status: 400 });
  }
  if (!body.stage || typeof body.stage !== "string") {
    return NextResponse.json({ error: "Missing stage." }, { status: 400 });
  }

  // Category and cohort are looked up server-side from the session itself
  // rather than trusted from the client, same posture as everything else
  // that ends up in funnel/revenue reporting.
  let category: string | null = null;
  let cohort: string | null = null;
  if (body.sessionId) {
    const session = await getSession(body.sessionId).catch(() => null);
    if (session) {
      category = session.category;
      cohort = session.cohort ?? null;
    }
  }

  const ok = await submitFeedback({
    sessionId: body.sessionId ?? null,
    actor: body.actor,
    category,
    stage: body.stage.slice(0, 64),
    rating: body.rating?.slice(0, 64) ?? null,
    freeText: body.freeText?.trim().slice(0, MAX_FREE_TEXT) || null,
    page: body.page?.slice(0, 200) ?? null,
    cohort,
  });

  // Best-effort — a failed write here shouldn't read as an error to the
  // person giving feedback; it just quietly didn't get logged.
  return NextResponse.json({ ok });
}
