import { NextResponse } from "next/server";
import { markSessionStarted } from "@/lib/db";

export async function POST(_req: Request, ctx: RouteContext<"/api/sessions/[id]/start">) {
  const { id } = await ctx.params;
  try {
    await markSessionStarted(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Couldn't update session." }, { status: 500 });
  }
}
