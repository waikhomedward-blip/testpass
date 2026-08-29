"use client";

// A buyer might send links to several sellers, or just close the tab and
// come back later — TestPass has no account system, so without this page
// the only way back to a test's status was the one link shown right after
// creating it. This reads the list of every session created in *this*
// browser (see src/lib/session-history.ts) and shows their live status
// side by side, each linking through to its own status page.
import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORY_CONFIG } from "@/lib/primitives";
import { Category, TestSession } from "@/lib/types";
import { getSessionHistory, removeSessionFromHistory, SessionHistoryEntry } from "@/lib/session-history";

type Row = SessionHistoryEntry & {
  loading: boolean;
  notFound: boolean;
  session: TestSession | null;
};

const STATUS_STYLES: Record<string, string> = {
  NOT_STARTED: "bg-foreground/10 text-foreground/60",
  IN_PROGRESS: "bg-amber-500/10 text-amber-600",
  ABANDONED: "bg-foreground/10 text-foreground/60",
  INCOMPLETE: "bg-amber-500/10 text-amber-600",
  COMPLETED: "bg-green-500/10 text-green-600",
};

export default function MyTestsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Reading localStorage is synchronous, but this component is
    // server-rendered first (where localStorage doesn't exist) and
    // hydrated after — so, same as SessionStatus's poll(), the state
    // updates below happen after an await rather than directly in the
    // effect body, keeping the server and hydration passes in sync.
    async function load() {
      await Promise.resolve();
      if (cancelled) return;

      const entries = getSessionHistory();
      if (entries.length === 0) {
        setRows([]);
        return;
      }
      const initial: Row[] = entries.map((e) => ({ ...e, loading: true, notFound: false, session: null }));
      setRows(initial);

      entries.forEach((entry) => {
        fetch(`/api/sessions/${entry.id}`, { cache: "no-store" })
          .then(async (res) => {
            if (cancelled) return;
            if (res.status === 404) {
              setRows((prev) =>
                prev ? prev.map((r) => (r.id === entry.id ? { ...r, loading: false, notFound: true } : r)) : prev
              );
              return;
            }
            if (!res.ok) throw new Error("failed");
            const session: TestSession = await res.json();
            if (cancelled) return;
            setRows((prev) =>
              prev ? prev.map((r) => (r.id === entry.id ? { ...r, loading: false, session } : r)) : prev
            );
          })
          .catch(() => {
            if (cancelled) return;
            setRows((prev) =>
              prev ? prev.map((r) => (r.id === entry.id ? { ...r, loading: false, notFound: true } : r)) : prev
            );
          });
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function forget(id: string) {
    removeSessionFromHistory(id);
    setRows((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-semibold">My tests</h1>
      <p className="mt-2 text-sm text-foreground/60">
        Every test you&apos;ve created in this browser, in one place. This list lives only on this
        device — it isn&apos;t an account, so it won&apos;t follow you to another phone or browser.
      </p>

      {rows === null && <p className="mt-8 text-sm text-foreground/50">Loading…</p>}

      {rows !== null && rows.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-border p-6 text-center text-sm text-foreground/60">
          You haven&apos;t created any tests yet.{" "}
          <Link href="/" className="text-accent hover:underline">
            Test a device
          </Link>{" "}
          to get started.
        </div>
      )}

      {rows !== null && rows.length > 0 && (
        <ul className="mt-6 space-y-3">
          {rows.map((row) => {
            const config = CATEGORY_CONFIG[row.category as Category];
            const label = config?.label ?? row.category;
            const created = new Date(row.createdAt);
            return (
              <li key={row.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="mt-0.5 text-xs text-foreground/50">
                      Created{" "}
                      {created.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {row.loading && <span className="text-xs text-foreground/40">Loading…</span>}
                  {!row.loading && row.notFound && (
                    <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs font-medium text-foreground/50">
                      Expired / not found
                    </span>
                  )}
                  {!row.loading && row.session && (
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[row.session.status] ?? "bg-foreground/10 text-foreground/60"
                      }`}
                    >
                      {row.session.status.replace("_", " ")}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-4 text-sm">
                  {!row.notFound && (
                    <Link href={`/buyer/session/${row.id}`} className="font-medium text-accent hover:underline">
                      View status
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => forget(row.id)}
                    className="text-foreground/40 hover:text-foreground/70"
                  >
                    Remove from this list
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
