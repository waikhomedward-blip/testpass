import { getSupabaseAdmin } from "./supabase/server";
import { newSessionId } from "./ids";
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
  imagePaths: StoredImage[];
  cosmeticNote: string | null;
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
