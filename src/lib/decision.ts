import { AssociationStrength, BuyerDecision, EvidenceVerdict } from "./types";

// A suggestion only — TestPass raises the evidence bar, it doesn't make the
// call for the buyer. Shown alongside the raw verdict and reasoning, never
// instead of them.
export function suggestDecision(
  verdict: EvidenceVerdict,
  association: AssociationStrength | null
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
    explanation: "The device demonstrated the function you were worried about, with reasonable confidence it's this exact unit.",
  };
}
