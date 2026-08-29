"use client";

import { useEffect, useRef, useState } from "react";
import { Category } from "@/lib/types";
import { CategoryConfig } from "@/lib/primitives";
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
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm font-medium text-accent">Test session created</p>
        <h2 className="mt-1 text-lg font-semibold">Send this link to the seller</h2>
        <p className="mt-1 text-sm text-foreground/60">
          They can open it on any phone — no account, no install. It takes about{" "}
          {Math.round(config.estimatedSeconds / 30) * 30 || 90} seconds.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <input
            readOnly
            value={sellerUrl}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            onClick={() => copySellerUrl(sellerUrl)}
            className={`flex w-[92px] shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              copied ? "bg-green-600 text-white" : "bg-accent text-white hover:opacity-90"
            }`}
          >
            {copied ? (
              <>
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
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
        <p className="mt-1.5 text-xs text-foreground/40" role="status" aria-live="polite">
          {copied ? "Link copied to clipboard." : ""}
        </p>

        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">Test status</p>
          <SessionStatus sessionId={created.id} />
        </div>

        <p className="mt-4 text-xs text-foreground/40">
          Bookmark this page, or keep{" "}
          <a href={`/buyer/session/${created.id}`} className="text-accent hover:underline">
            this direct link
          </a>{" "}
          if you want to come back later on another device.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border bg-card p-6">
      <label className="block text-sm font-medium">
        Listing link <span className="font-normal text-foreground/50">(optional)</span>
        <input
          type="url"
          value={listingUrl}
          onChange={(e) => setListingUrl(e.target.value)}
          placeholder="https://..."
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </label>

      <label className="mt-4 block text-sm font-medium">
        Model / details <span className="font-normal text-foreground/50">(optional)</span>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={config.modelFamily}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </label>

      <label className="mt-4 block text-sm font-medium">
        What are you worried about? <span className="font-normal text-foreground/50">(optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={config.knownFailureMode}
          rows={2}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </label>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create test session"}
      </button>
    </form>
  );
}
