import { NextRequest, NextResponse } from "next/server";
import { getSession, recordEvidenceAndComplete, uploadCapture, recordEvent } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { CATEGORY_CONFIG } from "@/lib/primitives";
import { evaluateEvidence, EvaluationResult } from "@/lib/evaluate";

interface SubmitBody {
  sessionId: string;
  images: { base64: string; mediaType: "image/jpeg" | "image/png"; filename: string }[];
  context?: string; // free-text device-reported info (e.g. Bluetooth read results)
  rawData?: Record<string, unknown>;
}

const MAX_IMAGES = 12; // friction-budget guardrail, mirrors the doc's ≤15-image ceiling

// A technical evaluation failure (a bad image format, an API hiccup, a
// timeout) is not evidence the device is broken — the product doc lists
// "technical error" explicitly as a valid INCONCLUSIVE cause, distinct from
// FAILED. Previously any thrown error here aborted the whole submission:
// no images got saved, no evidence row got written, the session stayed
// stuck IN_PROGRESS forever, and the seller saw a bare "Evaluation failed."
// with nowhere to go. Session status and evidence verdict must stay
// separate (per the doc) — a technical hiccup during scoring is never a
// reason to leave the session incomplete.
function fallbackEvaluation(err: unknown): EvaluationResult {
  console.error("evaluateEvidence threw — falling back to INCONCLUSIVE:", err);
  return {
    verdict: "INCONCLUSIVE",
    reasoning:
      "TestPass's automatic evaluator ran into a technical problem and couldn't confidently score this submission — this can happen with unusual image formats, a connectivity hiccup, or unexpected content in the photos. It isn't evidence the device failed. The photos the seller submitted are shown below so you can look them over yourself, and you may want to ask the seller to retry the test.",
    associationStrength: "INCONCLUSIVE",
    cosmeticNote: null,
  };
}

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
    await recordEvent({ sessionId: session.id, eventType: "error", metadata: { source: "submit_route", reason: "no_images" } });
    return NextResponse.json({ error: "No capture was submitted." }, { status: 400 });
  }
  if (body.images.length > MAX_IMAGES) {
    return NextResponse.json({ error: "Too many images for this test." }, { status: 400 });
  }

  // Upload first, unconditionally — the buyer should be able to see exactly
  // what the seller captured regardless of whether automatic scoring works.
  // uploadCapture is already best-effort per image (a storage hiccup on one
  // file doesn't lose the rest), so this never throws.
  const imagePaths: { path: string; filename: string }[] = [];
  for (const img of body.images) {
    const path = await uploadCapture(session.id, img.filename, img.base64, img.mediaType);
    if (path) imagePaths.push({ path, filename: img.filename });
  }

  // Fires once a real submission with images has been received, before
  // evaluation runs — this is the "seller_submitted" funnel milestone.
  // Deduped per session, so a retry after a technical failure (see the
  // catch below) doesn't double-count.
  await recordEvent({ sessionId: session.id, eventType: "seller_submitted", once: true, metadata: { imageCount: imagePaths.length } });

  let evaluation: EvaluationResult;
  let technicalError = false;
  try {
    evaluation = await evaluateEvidence({
      config,
      images: body.images.map((i) => ({ mediaType: i.mediaType, base64: i.base64 })),
      context: body.context ?? "",
    });
  } catch (err) {
    evaluation = fallbackEvaluation(err);
    technicalError = true;
  }

  // Capture-freshness metadata, stamped here rather than trusted from the
  // client — this is what a "live capture" is actually bound to. It isn't a
  // cryptographic nonce (no capture_nonce column exists yet; that would be
  // the next step if replay resistance beyond session-binding is needed),
  // but it is genuinely server-authored and honest about what it proves:
  // this submission was received against this specific, not-yet-completed
  // session, at this server-observed time. Combined with the COMPLETED-
  // status check above (which already blocks resubmission/replay against a
  // finished session), that's the real basis for calling any single-capture
  // or countdown-burst shot "session-bound" in evaluator/category copy —
  // not a code visibly held in the photo. See runner-types.ts for the
  // fuller doctrine note.
  const rawDataWithReceipt = {
    ...(body.rawData ?? {}),
    serverReceivedAt: new Date().toISOString(),
  };

  try {
    await recordEvidenceAndComplete({
      sessionId: session.id,
      functionTested: config.functionTested,
      primitiveLevel: config.primitiveLevel,
      capabilityLabel: config.capabilityLabel,
      verdict: evaluation.verdict,
      reasoning: evaluation.reasoning,
      associationStrength: evaluation.associationStrength,
      rawData: rawDataWithReceipt,
      imagePaths,
      cosmeticNote: evaluation.cosmeticNote,
      technicalError,
    });
  } catch (err) {
    // This is the one case that's a genuine failure to tell the seller
    // about — the images are uploaded, but nothing could be written to the
    // database at all (e.g. Supabase misconfigured or unreachable), so
    // there's truly no result for the buyer yet.
    console.error("recordEvidenceAndComplete failed:", err);
    await recordEvent({ sessionId: session.id, eventType: "error", metadata: { source: "submit_route", reason: "record_evidence_failed" } });
    return NextResponse.json(
      { error: "TestPass couldn't save this submission — please try again in a moment." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, verdict: evaluation.verdict, reasoning: evaluation.reasoning });
}
