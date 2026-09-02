export type Category =
  | "switch"
  | "gopro"
  | "dji"
  | "camera"
  | "ps5"
  | "epson"
  | "xbox"
  | "steamdeck"
  | "quest"
  | "nas"
  | "printer3d"
  | "projector"
  | "rogally";

export type SessionStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "ABANDONED"
  | "INCOMPLETE"
  | "COMPLETED";

export type EvidenceVerdict = "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE";

export type AssociationStrength =
  | "STRONG"
  | "MODERATE"
  | "WEAK"
  | "INCONCLUSIVE";

export type CapabilityLabel =
  | "CONFIRMED"
  | "MODEL-DEPENDENT"
  | "EXPERIMENTAL"
  | "UNAVAILABLE";

export type BuyerDecision = "BUY" | "ASK" | "NEGOTIATE" | "SKIP";

export interface TestSession {
  id: string;
  category: Category;
  model: string | null;
  listing_url: string | null;
  listing_notes: string | null;
  status: SessionStatus;
  created_at: string;
  started_at: string | null;
  submitted_at: string | null;
  expires_at: string;
  unlocked: boolean;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
}

// One row per funnel/error event — see supabase/add-beta-readiness.sql
// and src/lib/db.ts's recordEvent(). Not part of SessionWithEvidence;
// queried directly for funnel analysis, never returned to the buyer/seller
// client.
export interface EventRecord {
  id: string;
  session_id: string | null;
  event_type: string;
  metadata: Record<string, unknown> | null;
  dedupe_key: string | null;
  created_at: string;
}

export interface StoredImage {
  path: string;
  filename: string;
}

// Attached server-side (see getSignedCaptureUrls) when a session is fetched
// for display — not stored in the DB itself, which only holds `path`.
export interface DisplayImage {
  url: string;
  filename: string;
  label: string;
}

export interface EvidenceRecord {
  id: string;
  session_id: string;
  function_tested: string;
  primitive_level: string;
  capability_label: CapabilityLabel;
  verdict: EvidenceVerdict;
  reasoning: string;
  association_strength: AssociationStrength | null;
  raw_data: Record<string, unknown> | null;
  image_paths: StoredImage[] | null;
  cosmetic_note: string | null;
  created_at: string;
  images?: DisplayImage[];
}

export interface SessionWithEvidence extends TestSession {
  evidence: EvidenceRecord[];
}
