import { NextRequest, NextResponse } from "next/server";
import { getSession, recordEvidenceAndComplete, uploadCapture } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { CATEGORY_CONFIG } from "@/lib/primitives";
import { evaluateEvidence } from "@/lib/evaluate";

interface SubmitBody {
  sessionId: string;
  images: { base64: string; mediaType: "image/jpeg" | "image/png"; filename: string }[];
  context?: string; // free-text device-reported info (e.g. Bluetooth read results)
  rawData?: Record<string, unknown>;
}

const MAX_IMAGES = 12; // friction-budget guardrail, mirrors the doc's ≤15-image ceiling

export async function POST(req: NextRequest) {
  let body: SubmitBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.sessionId) {
    return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });
  }

  const session = await getSession(body.sessionId);
  if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });
  if (session.status === "COMPLETED") {
    return NextResponse.json({ error: "This session was already submitted." }, { status: 409 });
  }

  const config = CATEGORY_CONFIG[session.category];

  if (!body.images || body.images.length === 0) {
    // Seller submitted nothing usable — record as INCOMPLETE, not FAILED.
    // Session status and evidence verdict must never be conflated.
    const db = getSupabaseAdmin();
    await db.from("sessions").update({ status: "INCOMPLETE" }).eq("id", session.id);
    return NextResponse.json({ error: "No capture was submitted." }, { status: 400 });
  }
  if (body.images.length > MAX_IMAGES) {
    return NextResponse.json({ error: "Too many images for this test." }, { status: 400 });
  }

  try {
    const evaluation = await evaluateEvidence({
      config,
      images: body.images.map((i) => ({ mediaType: i.mediaType, base64: i.base64 })),
      context: body.context ?? "",
    });

    // Best-effort raw-artifact retention; failures here don't block the
    // result. Paths that do succeed are kept so the buyer's results page
    // can show what was actually captured.
    const imagePaths: { path: string; filename: string }[] = [];
    for (const img of body.images) {
      const path = await uploadCapture(session.id, img.filename, img.base64, img.mediaType);
      if (path) imagePaths.push({ path, filename: img.filename });
    }

    await recordEvidenceAndComplete({
      sessionId: session.id,
      functionTested: config.functionTested,
      primitiveLevel: config.primitiveLevel,
      capabilityLabel: config.capabilityLabel,
      verdict: evaluation.verdict,
      reasoning: evaluation.reasoning,
      associationStrength: evaluation.associationStrength,
      rawData: body.rawData ?? null,
      imagePaths,
      cosmeticNote: evaluation.cosmeticNote,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Evaluation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
