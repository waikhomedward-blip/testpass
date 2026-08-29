import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe";

// Stub endpoint — see src/lib/stripe.ts. Kept wired up now so the buyer
// results page's "Unlock result" button already points somewhere sane;
// today it just bounces back with an explanation, since Stripe isn't
// connected yet on purpose.
export async function POST(req: NextRequest, ctx: RouteContext<"/api/checkout/[id]">) {
  const { id } = await ctx.params;
  try {
    const { url } = await createCheckoutSession(id);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(
      new URL(`/buyer/session/${id}?checkout=unavailable`, req.url)
    );
  }
}
