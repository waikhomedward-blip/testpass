"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Category } from "@/lib/types";
import { CategoryConfig } from "@/lib/primitives";

export default function NewSessionForm({ config }: { config: CategoryConfig }) {
  const router = useRouter();
  const [listingUrl, setListingUrl] = useState("");
  const [model, setModel] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string } | null>(null);

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
            onClick={() => navigator.clipboard?.writeText(sellerUrl)}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Copy
          </button>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/buyer/session/${created.id}`)}
          className="mt-6 w-full rounded-lg border border-border py-2 text-sm font-medium hover:bg-background"
        >
          Go to my results page →
        </button>
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
