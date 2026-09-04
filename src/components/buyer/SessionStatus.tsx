"use client";

import { useEffect, useState } from "react";
import { suggestDecision } from "@/lib/decision";
import { PAYWALL_ENABLED, RESULT_PRICE_DISPLAY } from "@/lib/stripe";
import { CATEGORY_CONFIG } from "@/lib/primitives";
import { SessionWithEvidence } from "@/lib/types";
import ReportProblem from "@/components/ReportProblem";

const STATUS_COPY: Record<string, string> = {
  NOT_STARTED: "Waiting for the seller to open the link.",
  IN_PROGRESS: "The seller has opened the link and is working through the test.",
  ABANDONED: "The seller opened the link but didn't return to finish.",
  INCOMPLETE: "The seller submitted, but the test wasn't fully completed.",
  COMPLETED: "Test complete.",
};

const POLL_MS = 4000;

// Drives the buyer's whole "what's happening with my test" experience —
// used both inline right after a session is created and as the standalone
// /buyer/session/[id] page, so a buyer never has to leave the page they're
// already on to watch the result come in, but a direct/shared link to the
// same view still works.
export default function SessionStatus({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<SessionWithEvidence | null>(null);
  const [loadError, setLoadError] = useState(false);
  // Early Access free-result gate (see FreeResultCard below) — only ever
  // relevant while NEXT_PUBLIC_PAYWALL_ENABLED is false. Once the paywall
  // is back on, this state is simply never read (the `PAYWALL_ENABLED ||`
  // branch below always takes the PAYWALL_ENABLED side).
  const [revealed, setRevealed] = useState(false);
  // Reflects the `?checkout=success|cancelled|unavailable` the checkout
  // route already redirects back with (src/app/api/checkout/[id]/route.ts,
  // src/lib/stripe.ts) — read client-side via window.location rather than
  // useSearchParams so this doesn't require a Suspense boundary. Purely a
  // read of state that already existed; changes no payment logic.
  const [checkoutParam, setCheckoutParam] = useState<string | null>(null);

  useEffect(() => {
    // Yield once before the state update — same fix as the challenge-code
    // effect in GuidedCaptureRunner.tsx, required by react-hooks/set-state-in-effect.
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setCheckoutParam(new URLSearchParams(window.location.search).get("checkout"));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`, { cache: "no-store" });
        if (!res.ok) throw new Error("request failed");
        const data: SessionWithEvidence = await res.json();
        if (cancelled) return;
        setSession(data);
        setLoadError(false);
        // Keep polling past COMPLETED while the result is still locked —
        // otherwise a buyer redirected back from a successful Stripe
        // Checkout (which only happens once status is already COMPLETED)
        // would land on a page that stopped checking in right as the
        // webhook was about to flip `unlocked` to true, and see a stuck
        // "locked" card until they manually refreshed.
        const stillLocked = PAYWALL_ENABLED && data.status === "COMPLETED" && !data.unlocked;
        if (data.status !== "COMPLETED" || stillLocked) timeoutId = setTimeout(poll, POLL_MS);
      } catch {
        if (cancelled) return;
        setLoadError(true);
        timeoutId = setTimeout(poll, POLL_MS); // transient network blips shouldn't stall the page forever
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [sessionId]);

  if (!session) {
    return (
      <div className="mt-4 rounded-lg border border-border bg-card px-4 py-3 text-sm text-ink-secondary">
        {loadError ? "Couldn't load this test's status. Retrying…" : "Loading…"}
      </div>
    );
  }

  const isDone = session.status === "COMPLETED";
  const locked = PAYWALL_ENABLED && !session.unlocked;

  return (
    <div className="mt-4 space-y-4">
      {checkoutParam === "success" && (
        <div className="flex items-center gap-2 rounded-lg border border-proof/30 bg-proof-wash px-4 py-3 text-sm text-proof">
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
            <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6 10.5l2.5 2.5L14 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Payment received. If the result below still looks locked, give it a few seconds — this page
          updates on its own.
        </div>
      )}
      {checkoutParam === "cancelled" && (
        <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-ink-secondary">
          Checkout cancelled — nothing was charged. You can unlock the result any time.
        </div>
      )}
      {checkoutParam === "unavailable" && (
        <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-ink-secondary">
          Checkout isn&apos;t available for this result right now. Try again in a moment.
        </div>
      )}
      {checkoutParam === "technical_issue" && (
        <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-ink-secondary">
          TestPass ran into a technical problem scoring this test, so there&apos;s nothing to charge for
          yet — nothing was billed. Try refreshing in a bit, or ask the seller to retry.
        </div>
      )}

      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
        <span className={`h-2 w-2 shrink-0 rounded-full ${isDone ? "bg-proof" : "bg-caution"}`} />
        <span className="text-sm font-medium">{session.status.replace("_", " ")}</span>
        <span className="text-sm text-ink-secondary">— {STATUS_COPY[session.status]}</span>
      </div>

      {!isDone && (
        <p className="text-sm text-ink-secondary">
          This updates automatically as soon as the seller finishes — no need to refresh or come back
          to check.
        </p>
      )}

      {isDone && locked && <PaywallCard sessionId={sessionId} session={session} />}

      {isDone && !locked && !PAYWALL_ENABLED && !revealed && (
        <FreeResultCard onView={() => setRevealed(true)} />
      )}

      {isDone && !locked && (PAYWALL_ENABLED || revealed) && (
        <div className="space-y-6">
          {session.evidence.map((ev) => (
            <EvidenceReport key={ev.id} evidence={ev} completedAt={session.submitted_at} />
          ))}
          <BuyerFeedback sessionId={sessionId} />
          {!PAYWALL_ENABLED && <PricingLearningQuestion sessionId={sessionId} />}
        </div>
      )}

      <div className="pt-2 text-right">
        <ReportProblem sessionId={sessionId} actor="buyer" stage={session.status} page="buyer_session" />
      </div>
    </div>
  );
}

// Section 25's buyer micro-question — one tap, optional detail, never
// mandatory. Fires once the unlocked result is actually visible, mirroring
// where `buyer_viewed_result` already fires. Deliberately not the
// Superhuman-style "how disappointed" question yet — that's for once there
// are enough genuine/repeat users to mean something, not after a handful of
// physical-QA participants (Section 26).
function BuyerFeedback({ sessionId }: { sessionId: string }) {
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
          actor: "buyer",
          stage: "result_viewed",
          rating: chosenRating,
          freeText: text || undefined,
          page: "buyer_session",
        }),
      });
    } catch {
      // Best-effort — the buyer already saw their result either way.
    }
  }

  if (sent) {
    return (
      <p className="text-center text-xs text-ink-secondary">Thanks for the feedback.</p>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-3">
      <p className="text-sm font-medium">Did TestPass help you decide?</p>
      <div className="mt-2 flex gap-2">
        {["Yes", "Somewhat", "No"].map((opt) => (
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
        What was missing? (optional)
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

// Early Access-only stated-preference question (separate from
// BuyerFeedback above, and independent of whether that one was answered) —
// this is the pricing-strategy pivot's willingness-to-pay learning signal,
// recorded strictly as a stated preference, never as an actual conversion
// or payment event. Only ever rendered while !PAYWALL_ENABLED (see
// SessionStatus above), so it's simply unreachable code once the paywall
// comes back on — nothing to manually remove.
function PricingLearningQuestion({ sessionId }: { sessionId: string }) {
  const [sent, setSent] = useState(false);

  async function send(answer: string) {
    setSent(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          actor: "buyer",
          stage: "pricing_early_access",
          rating: answer,
          page: "buyer_session",
        }),
      });
    } catch {
      // Best-effort, same as BuyerFeedback — never blocks the buyer.
    }
  }

  if (sent) return null;

  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-3">
      <p className="text-sm font-medium">One optional question</p>
      <p className="mt-1 text-xs text-ink-secondary">
        If this hadn&apos;t been free during Early Access, would this result have been worth{" "}
        {RESULT_PRICE_DISPLAY} to you?
      </p>
      <div className="mt-2 flex gap-2">
        {["Definitely", "Maybe", "No"].map((opt) => (
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
    </div>
  );
}

// Wave 1.1: the paywall should read as the natural next step in the
// evidence journey the buyer already started, not an ecommerce
// interruption — this specific test, this specific unit, what TestPass
// actually checked, phrased in the same reading order as the unlocked
// result below (what was tested, then what unlocking reveals). No fake
// urgency, no countdown, no security-badge imagery. It deliberately does
// NOT show the verdict/evidence/reasoning — those stay server-side until
// payment (src/app/api/sessions/[id]/route.ts strips `evidence` entirely
// while locked, untouched here) — but category/model are ordinary session
// fields the buyer already provided, not evidence, so naming them doesn't
// weaken the paywall.
function PaywallCard({ sessionId, session }: { sessionId: string; session: SessionWithEvidence }) {
  const config = CATEGORY_CONFIG[session.category];
  return (
    <div className="rounded-[var(--radius-lg)] border border-border-subtle bg-card p-6 shadow-card">
      <p className="type-label">Your test is complete</p>
      <p className="mt-1 text-base font-semibold">
        {config.label}
        {session.model ? ` — ${session.model}` : ""}
      </p>
      <p className="mt-1 text-sm text-ink-secondary">TestPass checked: {config.functionTested}.</p>
      <div className="mt-4 border-t border-border-subtle pt-4">
        <p className="text-sm text-ink-secondary">
          Unlock the result — verdict, what TestPass observed, and the evidence itself — for{" "}
          {RESULT_PRICE_DISPLAY}.
        </p>
        <p className="mt-1 text-xs text-ink-secondary">
          One-time payment. No subscription. The seller pays nothing.
        </p>
        <form action={`/api/checkout/${sessionId}`} method="post" className="mt-3">
          <button
            type="submit"
            className="w-full rounded-lg bg-signal py-2.5 text-sm font-medium text-white transition-colors hover:bg-signal-hover"
          >
            Unlock result — {RESULT_PRICE_DISPLAY}
          </button>
        </form>
      </div>
    </div>
  );
}

// Early Access free-result gate — this is what stands in for PaywallCard
// while NEXT_PUBLIC_PAYWALL_ENABLED is false. It is deliberately NOT a
// discount or promotion frame ("$5 → $0", "normally $5", "100% off" are all
// intentionally absent) — TestPass is mid-validation, and this is an honest
// statement that the completed result is free to view right now, not a
// sale. The moment the paywall env var flips back to true, this branch
// stops being reachable in SessionStatus above and PaywallCard takes over
// again automatically — nothing here needs to be manually reverted.
function FreeResultCard({ onView }: { onView: () => void }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border-subtle bg-card p-6 shadow-card">
      <p className="type-label">Result ready</p>
      <p className="mt-1 text-base font-semibold">Free during Early Access</p>
      <p className="mt-2 text-sm text-ink-secondary">
        We&apos;re currently validating TestPass across real phones and devices, so your completed
        result is free during Early Access.
      </p>
      <div className="mt-4 border-t border-border-subtle pt-4">
        <button
          type="button"
          onClick={onView}
          className="w-full rounded-lg bg-signal py-2.5 text-sm font-medium text-white transition-colors hover:bg-signal-hover"
        >
          View result
        </button>
        <p className="mt-2 text-xs text-ink-secondary">
          TestPass is planned to cost {RESULT_PRICE_DISPLAY} to unlock a completed result after Early
          Access. Sellers never pay.
        </p>
      </div>
    </div>
  );
}

// The result page's job isn't "show a pass/fail screen" — it's explain a
// piece of evidence. Wave 1.1 restructures each card around the reading
// order the buyer actually needs, in order: what was tested, what TestPass
// observed, the verdict, how strong/fresh the evidence is, what it means
// for the buyer's decision, and — last — what it doesn't establish. Nothing
// here changes what's computed (verdict/decision logic is untouched in
// src/lib/decision.ts) — only how it's laid out and how much of it is
// wrapped in chrome. Spatial grouping and rules do most of the separating
// that nested boxes used to do; the only remaining container is the one
// outer card, so nothing is a box-inside-a-box anymore.
function EvidenceReport({
  evidence: ev,
  completedAt,
}: {
  evidence: import("@/lib/types").EvidenceRecord;
  completedAt: string | null;
}) {
  const { decision, explanation } = suggestDecision(ev.verdict, ev.association_strength, ev.function_tested);
  const diagnosticImages = (ev.images ?? []).filter((img) => img.label !== "Photo of the device");
  const productImages = (ev.images ?? []).filter((img) => img.label === "Photo of the device");
  const bluetoothPath = getBluetoothEvidencePath(ev.raw_data);

  return (
    <div className="rounded-[var(--radius-lg)] border border-border-subtle bg-card p-6 shadow-card">
      {/* 1. What was tested */}
      <p className="type-label">What was tested</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <p className="text-base font-semibold">{ev.function_tested}</p>
        <span className="type-metadata">{ev.capability_label}</span>
      </div>
      <p className="type-body-small mt-0.5 text-ink-secondary">{ev.primitive_level}</p>

      {/* 2. What TestPass observed */}
      <div className="mt-4 border-t border-border-subtle pt-4">
        <p className="type-label">What TestPass observed</p>
        <p className="mt-1 text-sm text-foreground">{ev.reasoning}</p>
        {ev.cosmetic_note && (
          <p className="mt-2 text-xs italic text-ink-secondary">
            Also visible in the photo of the device (not part of the function test): {ev.cosmetic_note}
          </p>
        )}
      </div>

      {/* 3. Verdict — typography-led, not a colored pill or an underline:
          weight, color and a short rule carry the state so nothing here
          could be mistaken for a link or a certification stamp. */}
      <div className="mt-4 border-t border-border-subtle pt-4">
        <VerdictHeading verdict={ev.verdict} />
      </div>

      {/* 4. How strong / fresh is the evidence */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle pt-4 text-xs text-ink-secondary">
        {ev.association_strength && <span>Device association: {ev.association_strength.toLowerCase()}</span>}
        {bluetoothPath && <EvidencePathTag path={bluetoothPath} />}
        {completedAt && <span className="type-metadata">{formatCompletedAt(completedAt)}</span>}
      </div>

      {/* 5. What this means for the buyer */}
      <div className="mt-4 border-t border-border-subtle pt-4">
        <p className="type-label">What this means for you</p>
        <p className="mt-1 text-sm font-semibold">{decision}</p>
        <p className="mt-0.5 text-xs text-ink-secondary">{explanation}</p>
      </div>

      {diagnosticImages.length > 0 && (
        <ImageGrid title="What the seller captured" images={diagnosticImages} />
      )}
      {productImages.length > 0 && <ImageGrid title="Photo of the device" images={productImages} />}

      {/* 6. What this doesn't establish — last, deliberately, per the
          brief's own reading order: the evidence and the decision come
          first, the scope caveat comes after, not as a hedge up front. */}
      <p className="mt-5 border-t border-border-subtle pt-4 text-xs text-ink-secondary">
        This result describes what happened during this one test session — not a guarantee of future
        reliability, and not a check of anything about the device besides {ev.function_tested.toLowerCase()}.
      </p>
    </div>
  );
}

function formatCompletedAt(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "Completed just now";
  if (mins < 60) return `Completed ${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `Completed ${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `Completed ${days}d ago`;
}

function ImageGrid({ title, images }: { title: string; images: { url: string; filename: string }[] }) {
  return (
    <div className="mt-4 border-t border-border-subtle pt-4">
      <p className="type-label mb-2">{title}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {images.map((img) => (
          // .evidence-frame goes on this <a> wrapper, not the <img> inside
          // it — the corner marks are ::before/::after pseudo-elements,
          // which don't render on replaced elements like img in any
          // browser. Registration corners are reserved for captured
          // physical evidence specifically — this is that evidence.
          <a
            key={img.filename}
            href={img.url}
            target="_blank"
            rel="noopener noreferrer"
            className="evidence-frame relative block aspect-square overflow-hidden rounded-lg border border-border-subtle"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={title}
              className="h-full w-full object-cover transition-opacity hover:opacity-80"
            />
          </a>
        ))}
      </div>
    </div>
  );
}

// GoPro cleanup (evidence-strength audit): a direct Bluetooth read and a
// photo-only fallback are materially different evidence strengths, but
// previously that distinction only lived in freeform LLM reasoning text —
// easy to miss at a glance. Read it straight from raw_data.bluetooth
// (GoProFlow always submits this shape) instead, so the badge is
// deterministic rather than depending on how the evaluator happened to
// phrase it this time.
function getBluetoothEvidencePath(rawData: Record<string, unknown> | null): "direct" | "photo-fallback" | null {
  if (!rawData || typeof rawData !== "object" || !("bluetooth" in rawData)) return null;
  const bt = (rawData as { bluetooth?: { attempted?: boolean; succeeded?: boolean } }).bluetooth;
  if (!bt || typeof bt !== "object") return null;
  return bt.succeeded ? "direct" : "photo-fallback";
}

// Evidence-path is a genuine status/tag (which evidence source produced
// this result) — the brief's shape/surfaces rule allows a pill specifically
// for true statuses and tags, so this keeps one, just on the cooler
// border-control neutral rather than a filled signal-blue chip.
function EvidencePathTag({ path }: { path: "direct" | "photo-fallback" }) {
  return path === "direct" ? (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-signal/30 px-2 py-0.5 font-medium text-signal"
      title="TestPass connected directly to the camera over Bluetooth and read its reported status — stronger evidence than a photo alone."
    >
      Direct device read
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-border-control px-2 py-0.5 text-ink-secondary"
      title="Bluetooth wasn't used or didn't connect — this result relies on the guided photo only, which is weaker evidence than a direct device read."
    >
      Photo fallback (no Bluetooth)
    </span>
  );
}

// The verdict itself is deliberately NOT a pill and NOT underlined text.
// A colored chip risks reading like a certification stamp; an underline
// risks reading like a link (Tufte's point isn't "underline more," it's
// spend non-data ink only where it earns its keep). Weight, color, size
// and a short rule of the same color carry the state instead — the
// evidence above and the decision below stay the visually loudest things
// on the card, not the verdict word itself.
function VerdictHeading({ verdict }: { verdict: string }) {
  const textColor: Record<string, string> = {
    DEMONSTRATED: "text-proof",
    FAILED: "text-failure",
    INCONCLUSIVE: "text-caution",
  };
  const ruleColor: Record<string, string> = {
    DEMONSTRATED: "bg-proof",
    FAILED: "bg-failure",
    INCONCLUSIVE: "bg-caution",
  };
  return (
    <div>
      <p className={`text-sm font-bold uppercase tracking-wide ${textColor[verdict] ?? "text-foreground"}`}>
        {verdict}
      </p>
      <span className={`mt-1.5 block h-0.5 w-8 rounded-full ${ruleColor[verdict] ?? "bg-border-control"}`} />
    </div>
  );
}
