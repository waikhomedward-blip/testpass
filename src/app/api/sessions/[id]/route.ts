import { NextRequest, NextResponse } from "next/server";
import { getSession, attachSignedImageUrls } from "@/lib/db";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/sessions/[id]">) {
  const { id } = await ctx.params;
  try {
    const session = await getSession(id);
    if (!session) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const withImages = session.status === "COMPLETED" ? await attachSignedImageUrls(session) : session;
    return NextResponse.json(withImages);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Couldn't load session." }, { status: 500 });
  }
}
