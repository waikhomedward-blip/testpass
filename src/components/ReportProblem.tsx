"use client";

import { useState } from "react";

// Section 26's "Report a problem" affordance — small, always available,
// auto-attaches session id/stage/page/timestamp so a report is traceable
// without asking the person to explain their own context. Reuses the same
// /api/feedback route and `feedback` table as the micro-feedback questions
// (stage: "report_problem"), rather than a separate system.
export default function ReportProblem({
  sessionId,
  actor,
  stage,
  page,
}: {
  sessionId?: string;
  actor: "buyer" | "seller";
  stage: string;
  page: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  async function send() {
    setSent(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          actor,
          stage: "report_problem",
          freeText: `[${stage}] ${text}`.slice(0, 1000),
          page,
        }),
      });
    } catch {
      // Best-effort.
    }
  }

  if (sent) {
    return <p className="text-xs text-ink-secondary">Thanks — we&apos;ll look into it.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-ink-secondary underline decoration-dotted underline-offset-2 hover:text-signal"
      >
        Report a problem
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-border px-3 py-2">
      <label className="block text-xs text-ink-secondary">
        What went wrong?
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-border-control bg-background px-2.5 py-1.5 text-sm"
          maxLength={800}
        />
      </label>
      <div className="mt-1.5 flex gap-2">
        <button
          type="button"
          onClick={send}
          disabled={!text.trim()}
          className="rounded-lg border border-border-control px-3 py-1 text-xs font-medium text-ink-secondary disabled:opacity-40"
        >
          Send
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-ink-secondary hover:text-signal"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
