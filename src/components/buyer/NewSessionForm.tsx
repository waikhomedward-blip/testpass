"use client";

import { useEffect, useRef, useState } from "react";
import { Category } from "@/lib/types";
import { CategoryConfig } from "@/lib/primitives";
import { addSessionToHistory } from "@/lib/session-history";
import SessionStatus from "./SessionStatus";

export default function NewSessionForm({ config }: { config: CategoryConfig }) {
  const [listingUrl, setListingUrl] = useState("");
  const [model, setModel] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  async function copySellerUrl(url: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for browsers without the async Clipboard API.
        const el = document.createElement("textarea");
        el.value = url;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // If copying silently fails, the text is still selected/visible for a manual copy.
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: config.category as Category,
          model,
          listingUrl,
          listingNotes: notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      addSessionToHistory({ id: data.id, category: config.category, createdAt: new Date().toISOString() });
      setCreated({ id: data.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    const sellerUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/seller/${created.id}`
        : `/seller/${created.id}`;
    return (
      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-6 shadow-card">
        <p className="flex items-center gap-1.5 text-sm font-medium text-proof">
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
            <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6 10.5l2.5 2.5L14 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Test session created
        </p>
        <h2 className="mt-1 type-section-title">Send this link to the seller</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          They can open it on any phone — no account, no install. It takes about{" "}
          {Math.round(config.estimatedSeconds / 30) * 30 || 90} seconds.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <input
            readOnly
            value={sellerUrl}
            className="flex-1 rounded-lg border border-border-control bg-background px-3 py-2 font-mono text-xs sm:text-sm"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            onClick={() => copySellerUrl(sellerUrl)}
            className={`flex w-[92px] shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              copied ? "bg-proof text-white" : "bg-signal text-white transition-colors hover:bg-signal-hover"
            }`}
          >
            {copied ? (
              <>
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
                  <path
                    d="M4 10.5l3.5 3.5L16 5.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Copied
              </>
            ) : (
              "Copy"
            )}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-ink-secondary" role="status" aria-live="polite">
          {copied ? "Link copied to clipboard." : ""}
        </p>

        <div className="mt-6 border-t border-border pt-4">
          <p className="type-label">Test status</p>
          <SessionStatus sessionId={created.id} />
        </div>

        <p className="mt-4 text-xs text-ink-secondary">
          Bookmark this page, or keep{" "}
          <a href={`/buyer/session/${created.id}`} className="text-signal hover:underline">
            this direct link
          </a>{" "}
          if you want to come back later on another device. Testing more than one device? Every test
          you create in this browser is also listed on{" "}
          <a href="/buyer/mine" className="text-signal hover:underline">
            My tests
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[var(--radius-lg)] border border-border bg-card p-6 shadow-card">
      <label className="block text-sm font-medium">
        Listing link <span className="font-normal text-ink-secondary">(optional)</span>
        <input
          type="url"
          value={listingUrl}
          onChange={(e) => setListingUrl(e.target.value)}
          placeholder="https://..."
          className="mt-1 w-full rounded-lg border border-border-control bg-background px-3 py-2 text-sm"
        />
      </label>

      <label className="mt-4 block text-sm font-medium">
        Model / details <span className="font-normal text-ink-secondary">(optional)</span>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={config.modelFamily}
          // Some categories' modelFamily strings (e.g. GoPro's "GoPro HERO
          // / MAX (Bluetooth LE capable models)") are long enough to hard-
          // clip mid-word inside a single-line input on a ~390px phone.
          // `truncate` gives it a clean "…" instead — standard technique
          // for a long placeholder in a short field. Purely presentational:
          // doesn't touch the category copy, and typed text still scrolls
          // with the caret as normal (browsers don't apply text-overflow
          // while a field has real, focused input).
          className="mt-1 w-full truncate rounded-lg border border-border-control bg-background px-3 py-2 text-sm"
        />
      </label>

      <label className="mt-4 block text-sm font-medium">
        What are you worried about? <span className="font-normal text-ink-secondary">(optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={config.knownFailureMode}
          rows={2}
          className="mt-1 w-full rounded-lg border border-border-control bg-background px-3 py-2 text-sm"
        />
      </label>

      {error && <p className="mt-3 text-sm text-failure">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 w-full rounded-lg bg-signal py-2.5 text-sm font-medium text-white transition-colors hover:bg-signal-hover disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create test session"}
      </button>
    </form>
  );
}
