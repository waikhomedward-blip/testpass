import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/db";
import { CATEGORY_CONFIG } from "@/lib/primitives";
import { Category } from "@/lib/types";
import { isSupabaseConfigured, SupabaseNotConfiguredError } from "@/lib/supabase/server";
import { PAYWALL_ENABLED } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "Supabase isn't connected yet. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then run supabase/schema.sql.",
      },
      { status: 503 }
    );
  }

  let body: { category?: string; model?: string; listingUrl?: string; listingNotes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const category = body.category as Category;
  const config = CATEGORY_CONFIG[category];
  if (!config) {
    return NextResponse.json({ error: "Unknown category." }, { status: 400 });
  }
  if (!config.available) {
    return NextResponse.json(
      { error: `${config.label} testing isn't available yet — it's still Coming Soon.` },
      { status: 400 }
    );
  }

  // Physical-QA cohort tagging — server/admin-only, never a public field.
  // A recruiter sends a QA participant a link with ?qa=<QA_COHORT_SECRET>
  // (set in Vercel env vars, shared only with the partner running
  // recruitment); anything else, including no param at all, is an ordinary
  // genuine buyer. There is deliberately no coupon input or client-visible
  // toggle for this — see Section 19 of the beta operating directive.
  const qaParam = req.nextUrl.searchParams.get("qa");
  const qaSecret = process.env.QA_COHORT_SECRET;
  // Early Access pricing pivot: while the paywall is globally off, every
  // genuine (non-QA) session is a free-viewing session by construction, not
  // a real willingness-to-pay signal. Tagging it here — server-side, same
  // pattern as physical_qa, never client-supplied — is what lets a future
  // paid-conversion query exclude both non-genuine categories without
  // deleting or hiding any rows. physical_qa still takes precedence: a
  // recruited QA session stays tagged as QA even during Early Access.
  const cohort = qaSecret && qaParam === qaSecret
    ? "physical_qa"
    : !PAYWALL_ENABLED
    ? "early_access_free"
    : null;

  try {
    const { id } = await createSession({
      category,
      model: body.model?.trim() || null,
      listingUrl: body.listingUrl?.trim() || null,
      listingNotes: body.listingNotes?.trim() || null,
      cohort,
    });
    return NextResponse.json({ id });
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error(err);
    return NextResponse.json({ error: "Couldn't create the session. Try again." }, { status: 500 });
  }
}
