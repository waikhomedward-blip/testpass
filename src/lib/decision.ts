import { AssociationStrength, BuyerDecision, EvidenceVerdict } from "./types";

// A suggestion only — TestPass raises the evidence bar, it doesn't make the
// call for the buyer. Shown alongside the raw verdict and reasoning, never
// instead of them.
//
// `functionTested` (CategoryConfig.functionTested, e.g. "Current PlayStation
// online access, associated with a fresh console-information challenge")
// scopes the BUY explanation to what was actually tested. Every category is
// currently one narrow primitive, not a whole-device check (see the "one
// category, one primitive" V1 constraint in primitives.ts) — a PS5 can
// demonstrate online access and still have an unrelated problem, a Switch
// can demonstrate stick response without proving the whole console is good.
// Evidence about one function must never silently read as "the whole
// device is safe to buy," so a BUY suggestion always names the specific
// thing it covers and says plainly that TestPass didn't test the rest of
// the device — instead of the old generic "the function you were worried
// about" phrasing, which implied whatever the buyer cared about broadly.
export function suggestDecision(
  verdict: EvidenceVerdict,
  association: AssociationStrength | null,
  functionTested: string
): { decision: BuyerDecision; explanation: string } {
  if (verdict === "FAILED") {
    return {
      decision: "NEGOTIATE",
      explanation: "The test found evidence of a real problem — worth a lower price or walking away.",
    };
  }
  if (verdict === "INCONCLUSIVE") {
    return {
      decision: "ASK",
      explanation: "The test couldn't reach a confident conclusion — ask the seller to retry or clarify.",
    };
  }
  // DEMONSTRATED
  if (association === "WEAK" || association === "INCONCLUSIVE" || association === null) {
    return {
      decision: "ASK",
      explanation:
        "The function worked during the test, but TestPass can't strongly confirm the evidence came from this exact unit — worth one more question before paying.",
    };
  }
  return {
    decision: "BUY",
    explanation: `TestPass demonstrated this specific check — ${functionTested} — with reasonable confidence it's this exact unit. That's not a check of the rest of the device; treat it as one solved risk, not a full inspection.`,
  };
}
