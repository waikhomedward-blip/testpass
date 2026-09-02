import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// Beta data-retention policy (see README's "Data retention" section):
//   - Raw seller capture images and free-form/sensitive evidence content
//     (reasoning text, raw_data, cosmetic_note) are removed 7 days after
//     the evidence was recorded.
//   - The session and its evidence row's minimal structured fields
//     (category, status/timestamps, verdict class, technical-error flag)
//     are kept for up to 90 days for product learning, then the session
//     and evidence are deleted entirely.
//   - events rows are already de-identified funnel data and are pruned on
//     the same 90-day window.
//
// Triggered by Vercel Cron (see vercel.json) via GET with
// `Authorization: Bearer ${CRON_SECRET}` — Vercel adds that header
// automatically for any cron job when an env var named exactly
// CRON_SECRET is set. Not reachable without it.
const RAW_RETENTION_DAYS = 7;
const FULL_RETENTION_DAYS = 90;
const REDACTED_REASONING = "[removed after 7-day retention window]";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const rawCutoff = new Date(Date.now() - RAW_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const fullCutoff = new Date(Date.now() - FULL_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  let redacted = 0;
  let storageErrors = 0;
  let deletedSessions = 0;

  // Pass 1 — redact raw content past the 7-day window. `image_paths not
  // null` is the "not yet cleaned" signal (redaction always nulls it out).
  // Deletion order matters: storage objects are removed FIRST, and the DB
  // row is only redacted if that succeeds — a failed storage removal must
  // never look "cleaned" in the database while the files still exist.
  const { data: staleEvidence, error: fetchErr } = await db
    .from("evidence")
    .select("id, image_paths")
    .lt("created_at", rawCutoff)
    .not("image_paths", "is", null);

  if (fetchErr) {
    console.error("cleanup: couldn't list stale evidence:", fetchErr.message);
  } else {
    for (const row of staleEvidence ?? []) {
      const paths = ((row.image_paths as { path: string }[] | null) ?? []).map((p) => p.path);
      if (paths.length > 0) {
        const { error: removeErr } = await db.storage.from("captures").remove(paths);
        if (removeErr) {
          console.error(`cleanup: storage removal failed for evidence ${row.id}:`, removeErr.message);
          storageErrors++;
          continue;
        }
      }
      const { error: updateErr } = await db
        .from("evidence")
        .update({ reasoning: REDACTED_REASONING, raw_data: null, image_paths: null, cosmetic_note: null })
        .eq("id", row.id);
      if (updateErr) {
        console.error(`cleanup: redaction update failed for evidence ${row.id}:`, updateErr.message);
      } else {
        redacted++;
      }
    }
  }

  // Pass 2 — fully delete sessions (and their evidence, via FK cascade)
  // past the 90-day window. Defensively re-checks for any evidence still
  // carrying image_paths (e.g. a prior storage removal kept failing and
  // was never retried) so a hard session delete never leaves orphaned
  // storage objects behind with no DB reference to find them by.
  const { data: staleSessions, error: sessErr } = await db
    .from("sessions")
    .select("id")
    .lt("created_at", fullCutoff);

  if (sessErr) {
    console.error("cleanup: couldn't list stale sessions:", sessErr.message);
  } else if (staleSessions && staleSessions.length > 0) {
    const staleIds = staleSessions.map((s) => s.id);

    const { data: lingering } = await db
      .from("evidence")
      .select("id, image_paths")
      .in("session_id", staleIds)
      .not("image_paths", "is", null);
    for (const row of lingering ?? []) {
      const paths = ((row.image_paths as { path: string }[] | null) ?? []).map((p) => p.path);
      if (paths.length > 0) {
        const { error: removeErr } = await db.storage.from("captures").remove(paths);
        if (removeErr) console.error(`cleanup: late storage removal failed for evidence ${row.id}:`, removeErr.message);
      }
    }

    const { error: delErr } = await db.from("sessions").delete().in("id", staleIds);
    if (delErr) {
      console.error("cleanup: session deletion failed:", delErr.message);
    } else {
      deletedSessions = staleIds.length;
    }
  }

  // events are already de-identified funnel data (no free-form captured
  // content ever goes into metadata — see recordEvent's doc comment) —
  // pruned independently on the same 90-day window.
  const { error: eventsErr } = await db.from("events").delete().lt("created_at", fullCutoff);
  if (eventsErr) console.error("cleanup: events pruning failed:", eventsErr.message);

  return NextResponse.json({ ok: true, redacted, deletedSessions, storageErrors });
}
