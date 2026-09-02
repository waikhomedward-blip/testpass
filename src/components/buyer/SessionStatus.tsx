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
      <div className="mt-4 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground/60">
        {loadError ? "Couldn't load this test's status. Retrying…" : "Loading…"}
      </div>
    );
  }

  const isDone = session.status === "COMPLETED";
  const locked = PAYWALL_ENABLED && !session.unlocked;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
        <span className={`h-2 w-2 shrink-0 rounded-full ${isDone ? "bg-green-500" : "bg-amber-500"}`} />
        <span className="text-sm font-medium">{session.status.replace("_", " ")}</span>
        <span className="text-sm text-foreground/60">— {STATUS_COPY[session.status]}</span>
      </div>

      {!isDone && (
        <p className="text-sm text-foreground/60">
          This updates automatically as soon as the seller finishes — no need to refresh or come back
          to check.
        </p>
      )}

      {isDone && locked && (
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="font-medium">Result ready</p>
          <p className="mt-2 text-sm text-foreground/60">Unlock this result for {RESULT_PRICE_DISPLAY}.</p>
          <form action={`/api/checkout/${sessionId}`} method="post" className="mt-4">
            <button
              type="submit"
              className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              Unlock result
            </button>
          </form>
        </div>
      )}

      {isDone && !locked && (
        <div className="space-y-4">
          {!PAYWALL_ENABLED && (
            <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-foreground/50">
              Payment isn&apos;t turned on yet — you&apos;re seeing this result for free while TestPass
              is being built out.
            </p>
          )}
          {session.evidence.map((ev) => {
            const { decision, explanation } = suggestDecision(ev.verdict, ev.association_strength, ev.function_tested);
            const diagnosticImages = (ev.images ?? []).filter((img) => img.label !== "Photo of the device");
            const productImages = (ev.images ?? []).filter((img) => img.label === "Photo of the device");
            const bluetoothPath = getBluetoothEvidencePath(ev.raw_data);
            return (
              <div key={ev.id} className="rounded-xl border border-border bg-card p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <VerdictBadge verdict={ev.verdict} />
                  <span className="text-xs text-foreground/50">{ev.capability_label}</span>
                  {bluetoothPath && <EvidencePathBadge path={bluetoothPath} />}
                </div>
                <p className="mt-3 font-medium">{ev.function_tested}</p>
                <p className="mt-1 text-sm text-foreground/70">{ev.reasoning}</p>
                {ev.association_strength && (
                  <p className="mt-2 text-xs text-foreground/50">
                    Device association: {ev.association_strength}
                  </p>
                )}
                <p className="mt-1 text-xs text-foreground/40">{ev.primitive_level}</p>

                <div className="mt-4 rounded-lg bg-background px-3 py-2">
                  <p className="text-sm font-semibold">Suggested: {decision}</p>
                  <p className="text-xs text-foreground/60">{explanation}</p>
                </div>

                {ev.cosmetic_note && (
                  <p className="mt-3 text-xs italic text-foreground/50">
                    From the photo of the device: {ev.cosmetic_note}
                  </p>
                )}

                {diagnosticImages.length > 0 && (
                  <ImageGrid title="What the seller captured" images={diagnosticImages} />
                )}
                {productImages.length > 0 && (
                  <ImageGrid title="Photo of the device" images={productImages} />
                )}
              </div>
            );
          })}
          <p className="text-xs text-foreground/40">
            A DEMONSTRATED verdict describes what happened during this session, not a guarantee of
            future reliability or complete device condition.
          </p>
        </div>
      )}
    </div>
  );
}

function ImageGrid({ title, images }: { title: string; images: { url: string; filename: string }[] }) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-medium text-foreground/50">{title}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {images.map((img) => (
          <a key={img.filename} href={img.url} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={title}
              className="aspect-square w-full rounded-lg border border-border object-cover transition-opacity hover:opacity-80"
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

function EvidencePathBadge({ path }: { path: "direct" | "photo-fallback" }) {
  return path === "direct" ? (
    <span
      className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600"
      title="TestPass connected directly to the camera over Bluetooth and read its reported status — stronger evidence than a photo alone."
    >
      Direct device read
    </span>
  ) : (
    <span
      className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground/60"
      title="Bluetooth wasn't used or didn't connect — this result relies on the guided photo only, which is weaker evidence than a direct device read."
    >
      Photo fallback (no Bluetooth)
    </span>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const styles: Record<string, string> = {
    DEMONSTRATED: "bg-green-500/10 text-green-600 border-green-500/30",
    FAILED: "bg-red-500/10 text-red-600 border-red-500/30",
    INCONCLUSIVE: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  };
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[verdict] ?? ""}`}>
      {verdict}
    </span>
  );
}
