import { getSupabaseAdmin } from "./supabase/server";
import { newSessionId } from "./ids";
import {
  Category,
  SessionStatus,
  EvidenceVerdict,
  AssociationStrength,
  CapabilityLabel,
  SessionWithEvidence,
} from "./types";

const SESSION_TTL_DAYS = 7;

export async function createSession(input: {
  category: Category;
  model?: string | null;
  listingUrl?: string | null;
  listingNotes?: string | null;
}): Promise<{ id: string }> {
  const db = getSupabaseAdmin();
  const id = newSessionId();
  const expires_at = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await db.from("sessions").insert({
    id,
    category: input.category,
    model: input.model ?? null,
    listing_url: input.listingUrl ?? null,
    listing_notes: input.listingNotes ?? null,
    status: "NOT_STARTED",
    expires_at,
    unlocked: true, // paywall is stubbed off for now — see src/lib/stripe.ts
  });

  if (error) throw error;
  return { id };
}

export async function getSession(id: string): Promise<SessionWithEvidence | null> {
  const db = getSupabaseAdmin();
  const { data: session, error } = await db.from("sessions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!session) return null;

  const { data: evidence, error: evErr } = await db
    .from("evidence")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: true });
  if (evErr) throw evErr;

  return { ...session, evidence: evidence ?? [] } as SessionWithEvidence;
}

export async function markSessionStarted(id: string): Promise<void> {
  const db = getSupabaseAdmin();
  const { data } = await db.from("sessions").select("status,started_at").eq("id", id).maybeSingle();
  if (!data || data.started_at) return;
  await db
    .from("sessions")
    .update({ status: "IN_PROGRESS", started_at: new Date().toISOString() })
    .eq("id", id);
}

export async function recordEvidenceAndComplete(input: {
  sessionId: string;
  functionTested: string;
  primitiveLevel: string;
  capabilityLabel: CapabilityLabel;
  verdict: EvidenceVerdict;
  reasoning: string;
  associationStrength: AssociationStrength | null;
  rawData: Record<string, unknown> | null;
  sessionStatus?: SessionStatus;
}): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db.from("evidence").insert({
    session_id: input.sessionId,
    function_tested: input.functionTested,
    primitive_level: input.primitiveLevel,
    capability_label: input.capabilityLabel,
    verdict: input.verdict,
    reasoning: input.reasoning,
    association_strength: input.associationStrength,
    raw_data: input.rawData,
  });
  if (error) throw error;

  await db
    .from("sessions")
    .update({
      status: input.sessionStatus ?? "COMPLETED",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", input.sessionId);
}

export async function uploadCapture(
  sessionId: string,
  filename: string,
  base64: string,
  contentType: string
): Promise<string | null> {
  const db = getSupabaseAdmin();
  const bytes = Buffer.from(base64, "base64");
  const path = `${sessionId}/${Date.now()}-${filename}`;
  const { error } = await db.storage.from("captures").upload(path, bytes, {
    contentType,
    upsert: false,
  });
  if (error) {
    // Storage is best-effort raw-artifact retention, not required for the
    // evaluation itself (which already has the base64 in memory) — don't
    // fail the whole submission if the bucket isn't set up yet.
    console.error("uploadCapture failed:", error.message);
    return null;
  }
  return path;
}
