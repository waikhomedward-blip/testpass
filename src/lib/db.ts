import { getSupabaseAdmin } from "./supabase/server";
import { newSessionId } from "./ids";
import { PAYWALL_ENABLED } from "./stripe";
import {
  Category,
  SessionStatus,
  EvidenceVerdict,
  AssociationStrength,
  CapabilityLabel,
  SessionWithEvidence,
  StoredImage,
  DisplayImage,
} from "./types";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour — plenty for one page view

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
    // Server-controlled, not a hardcoded true: when the paywall is off
    // (PAYWALL_ENABLED false, today's default), every session starts
    // unlocked, same as before. Once the paywall is on, new sessions must
    // start LOCKED — otherwise a perfectly-enforced GET /api/sessions/[id]
    // wouldn't matter, because every session would already be unlocked at
    // creation time regardless. See the beta-readiness audit's second
    // paywall finding.
    unlocked: !PAYWALL_ENABLED,
  });

  if (error) throw error;
  await recordEvent({ sessionId: id, eventType: "session_created", once: true, metadata: { category: input.category } });
  return { id };
}

// Minimal, durable funnel/error logging — see supabase/add-beta-readiness.sql.
// Best-effort and never throws: a logging failure must never break the
// actual product action it's attached to. `once: true` sets a dedupe_key
// of `${eventType}:${sessionId}` so a milestone (session created, seller
// opened the link, submitted, viewed the result, etc.) can only be
// recorded once per session — a page refresh, a 4s status poll, or a
// retried Stripe webhook delivery hits the partial unique index instead of
// inflating a funnel count. Error events omit `once` and can repeat freely.
// Never pass raw captured content (reasoning text, image data, listing
// notes) in metadata — keep it to short structured fields only.
export async function recordEvent(input: {
  sessionId: string | null;
  eventType: string;
  metadata?: Record<string, unknown>;
  once?: boolean;
}): Promise<void> {
  const db = getSupabaseAdmin();
  const dedupeKey = input.once && input.sessionId ? `${input.eventType}:${input.sessionId}` : null;
  const { error } = await db.from("events").insert({
    session_id: input.sessionId,
    event_type: input.eventType,
    metadata: input.metadata ?? null,
    dedupe_key: dedupeKey,
  });
  if (error && error.code !== "23505") {
    // 23505 = unique_violation on dedupe_key, i.e. this milestone already
    // fired for this session — expected and not worth logging as an error.
    console.error(`recordEvent(${input.eventType}) failed:`, error.message);
  }
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
  const { data, error: selectError } = await db
    .from("sessions")
    .select("status,started_at")
    .eq("id", id)
    .maybeSingle();
  if (selectError) {
    // Previously this silently returned here, discarding the error entirely
    // — the buyer would then be stuck seeing "NOT STARTED" forever even
    // though the seller had the page open and was actively testing, with no
    // trace of why in the logs. We don't know from a failed read whether
    // the session was already started, but attempting the update below is
    // harmless either way (it's a no-op once started_at is already set by
    // a previous successful call), so we log and fall through instead of
    // bailing out.
    console.error("markSessionStarted: couldn't read session:", selectError.message);
  } else if (data?.started_at) {
    return; // already started — don't clobber the original started_at
  }
  const { error: updateError } = await db
    .from("sessions")
    .update({ status: "IN_PROGRESS", started_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) {
    console.error("markSessionStarted: couldn't update session:", updateError.message);
  }
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
  imagePaths: StoredImage[];
  cosmeticNote: string | null;
  sessionStatus?: SessionStatus;
  technicalError?: boolean;
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
    image_paths: input.imagePaths,
    cosmetic_note: input.cosmeticNote,
  });
  if (error) throw error;

  await db
    .from("sessions")
    .update({
      status: input.sessionStatus ?? "COMPLETED",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", input.sessionId);

  // Structured, not free-text: verdict class + whether this was a content
  // verdict or a technical failure. Never the reasoning text itself.
  await recordEvent({
    sessionId: input.sessionId,
    eventType: "evaluation_result",
    once: true,
    metadata: { verdict: input.verdict, technicalError: !!input.technicalError },
  });
}

// The only place sessions.unlocked ever gets set to true from a payment —
// called exclusively from the Stripe webhook route. Idempotent: applying
// the same update twice (a retried webhook delivery) has no additional
// effect.
export async function unlockSessionForPayment(input: {
  sessionId: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string | null;
}): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("sessions")
    .update({
      unlocked: true,
      stripe_checkout_session_id: input.stripeCheckoutSessionId,
      stripe_payment_intent_id: input.stripePaymentIntentId,
    })
    .eq("id", input.sessionId);
  if (error) throw error;
}

// Turns each evidence row's stored capture paths into short-lived signed
// URLs the buyer's browser can actually load — the `captures` bucket is
// private (see schema.sql), so a raw storage path isn't fetchable on its
// own. Best-effort: a signing failure for one row just means that row shows
// no images, it doesn't break the rest of the page.
export async function attachSignedImageUrls(session: SessionWithEvidence): Promise<SessionWithEvidence> {
  const db = getSupabaseAdmin();
  const evidence = await Promise.all(
    session.evidence.map(async (ev) => {
      const paths = ev.image_paths ?? [];
      if (paths.length === 0) return ev;
      const { data, error } = await db.storage
        .from("captures")
        .createSignedUrls(
          paths.map((p) => p.path),
          SIGNED_URL_TTL_SECONDS
        );
      if (error || !data) {
        console.error("createSignedUrls failed:", error?.message);
        return ev;
      }
      const images: DisplayImage[] = data
        .map((d, i) => ({
          url: d.signedUrl,
          filename: paths[i].filename,
          label: paths[i].filename.includes("product-photo") ? "Photo of the device" : "Diagnostic capture",
        }))
        // A per-item signing failure (rare, but the API allows it inside an
        // otherwise-successful batch) leaves signedUrl null — drop just
        // that image rather than failing the whole row.
        .filter((img): img is DisplayImage => typeof img.url === "string" && img.url.length > 0);
      return { ...ev, images };
    })
  );
  return { ...session, evidence };
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
