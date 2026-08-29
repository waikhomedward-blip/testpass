"use client";

// Shown once a submission has gone through. Session status and evidence
// verdict are kept separate everywhere else in the app, and that applies
// here too: the seller always sees a plain "you're done" — the specific
// verdict (DEMONSTRATED / FAILED / INCONCLUSIVE) is the buyer's to
// interpret. But a submission that couldn't be confidently scored
// shouldn't look identical to a clean pass either — sellers deserve to
// know their result wasn't a dead end, without being handed evidence-
// primitive jargon they were never meant to understand.
export default function SubmittedScreen({ verdict }: { verdict: string | null }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center">
      <p className="text-lg font-semibold">Submitted — thanks!</p>
      <p className="mt-2 text-sm text-foreground/60">The buyer has your test result now. You&apos;re done.</p>
      {verdict && verdict !== "DEMONSTRATED" && (
        <p className="mt-3 text-xs text-foreground/50">
          Heads up: TestPass couldn&apos;t automatically confirm everything from what was captured.
          The buyer will still see exactly what you submitted and may follow up with a question.
        </p>
      )}
    </div>
  );
}
