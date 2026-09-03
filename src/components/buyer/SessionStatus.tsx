"use client";

import { useEffect, useState } from "react";
import { suggestDecision } from "@/lib/decision";
import { PAYWALL_ENABLED, RESULT_PRICE_DISPLAY } from "@/lib/stripe";
import { SessionWithEvidence } from "@/lib/types";

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
        if (data.status !== "COMPLETED") timeoutId = setTimeout(poll, POLL_MS);
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

      {isDone && locked && (
        <div className="rounded-[var(--radius-lg)] border border-border bg-card p-6 shadow-card">
          <p className="font-medium">Result ready</p>
          <p className="mt-2 text-sm text-ink-secondary">Unlock this result for {RESULT_PRICE_DISPLAY}.</p>
          <form action={`/api/checkout/${sessionId}`} method="post" className="mt-4">
            <button
              type="submit"
              className="w-full rounded-lg bg-signal py-2.5 text-sm font-medium text-white transition-colors hover:bg-signal-hover"
            >
              Unlock result
            </button>
          </form>
        </div>
      )}

      {isDone && !locked && (
        <div className="space-y-6">
          {!PAYWALL_ENABLED && (
            <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-ink-secondary">
              Payment isn&apos;t turned on yet — you&apos;re seeing this result for free while TestPass
              is being built out.
            </p>
          )}
          {session.evidence.map((ev) => (
            <EvidenceReport key={ev.id} evidence={ev} completedAt={session.submitted_at} />
          ))}
        </div>
      )}
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
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-secondary">What was tested</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <p className="text-base font-semibold">{ev.function_tested}</p>
        <span className="font-mono text-[11px] text-ink-secondary">{ev.capability_label}</span>
      </div>
      <p className="mt-0.5 text-xs text-ink-secondary">{ev.primitive_level}</p>

      {/* 2. What TestPass observed */}
      <div className="mt-4 border-t border-border-subtle pt-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-secondary">What TestPass observed</p>
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
        {completedAt && <span className="font-mono">{formatCompletedAt(completedAt)}</span>}
      </div>

      {/* 5. What this means for the buyer */}
      <div className="mt-4 border-t border-border-subtle pt-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-secondary">
          What this means for you
        </p>
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
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-secondary">{title}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {images.map((img) => (
          <a key={img.filename} href={img.url} target="_blank" rel="noopener noreferrer">
            {/* .evidence-frame: registration corners reserved for captured
                physical evidence specifically — this is that evidence. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={title}
              className="evidence-frame aspect-square w-full rounded-lg border border-border-subtle object-cover transition-opacity hover:opacity-80"
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
