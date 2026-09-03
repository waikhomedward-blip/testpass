"use client";

import { useState } from "react";

// Shown once a submission has gone through. Session status and evidence
// verdict are kept separate everywhere else in the app, and that applies
// here too: the seller always sees a plain "you're done" — the specific
// verdict (DEMONSTRATED / FAILED / INCONCLUSIVE) is the buyer's to
// interpret. But a submission that couldn't be confidently scored
// shouldn't look identical to a clean pass either — sellers deserve to
// know their result wasn't a dead end, without being handed evidence-
// primitive jargon they were never meant to understand.
export default function SubmittedScreen({ verdict, sessionId }: { verdict: string | null; sessionId?: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border-subtle bg-card p-6 text-center shadow-card">
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-proof-wash text-proof">
        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
          <path d="M5 10.5l3.5 3.5L15 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <p className="mt-3 type-section-title">Submitted — thanks!</p>
      <p className="mt-2 text-sm text-ink-secondary">The buyer has your test result now. You&apos;re done.</p>
      {verdict && verdict !== "DEMONSTRATED" && (
        <p className="mt-3 text-xs text-ink-secondary">
          Heads up: TestPass couldn&apos;t automatically confirm everything from what was captured.
          The buyer will still see exactly what you submitted and may follow up with a question.
        </p>
      )}
      {sessionId && <SellerFeedback sessionId={sessionId} />}
    </div>
  );
}

// Section 25's seller micro-question — the seller's work is genuinely done
// at this point (this screen isn't part of the capture/redo flow itself),
// so this is the safe, non-mandatory moment to ask. One tap, optional
// detail, never blocks anything.
function SellerFeedback({ sessionId }: { sessionId: string }) {
  const [rating, setRating] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [sent, setSent] = useState(false);

  async function send(chosenRating: string, text?: string) {
    setRating(chosenRating);
    setSent(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          actor: "seller",
          stage: "submitted",
          rating: chosenRating,
          freeText: text || undefined,
          page: "seller_flow",
        }),
      });
    } catch {
      // Best-effort — the seller's submission already went through either way.
    }
  }

  if (sent) {
    return <p className="mt-4 text-xs text-ink-secondary">Thanks for the feedback.</p>;
  }

  return (
    <div className="mt-4 border-t border-border-subtle pt-4 text-left">
      <p className="text-sm font-medium">How was this?</p>
      <div className="mt-2 flex justify-center gap-2">
        {["Easy", "Okay", "Difficult"].map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => send(opt)}
            className="rounded-lg border border-border-control px-3 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:border-signal hover:text-signal"
          >
            {opt}
          </button>
        ))}
      </div>
      <label className="mt-2 block text-xs text-ink-secondary">
        What was confusing? (optional)
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            className="w-full rounded-lg border border-border-control bg-background px-2.5 py-1.5 text-sm"
            maxLength={500}
          />
          <button
            type="button"
            onClick={() => send(rating ?? "unrated", freeText)}
            disabled={!freeText.trim()}
            className="shrink-0 rounded-lg border border-border-control px-3 py-1.5 text-xs font-medium text-ink-secondary disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </label>
    </div>
  );
}
