import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/db";
import { CATEGORY_CONFIG } from "@/lib/primitives";
import { Category } from "@/lib/types";
import { isSupabaseConfigured, SupabaseNotConfiguredError } from "@/lib/supabase/server";

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

  try {
    const { id } = await createSession({
      category,
      model: body.model?.trim() || null,
      listingUrl: body.listingUrl?.trim() || null,
      listingNotes: body.listingNotes?.trim() || null,
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
