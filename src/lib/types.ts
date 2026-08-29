export type Category = "switch" | "gopro" | "dji" | "camera";

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
  created_at: string;
}

export interface SessionWithEvidence extends TestSession {
  evidence: EvidenceRecord[];
}
