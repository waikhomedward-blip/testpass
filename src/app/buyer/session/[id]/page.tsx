import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/db";
import { CATEGORY_CONFIG } from "@/lib/primitives";
import { suggestDecision } from "@/lib/decision";
import { PAYWALL_ENABLED, RESULT_PRICE_USD } from "@/lib/stripe";
import AutoRefresh from "@/components/buyer/AutoRefresh";

const STATUS_COPY: Record<string, string> = {
  NOT_STARTED: "Waiting for the seller to open the link.",
  IN_PROGRESS: "The seller has opened the link and is working through the test.",
  ABANDONED: "The seller opened the link but didn't return to finish.",
  INCOMPLETE: "The seller submitted, but the test wasn't fully completed.",
  COMPLETED: "Test complete.",
};

export default async function BuyerSessionPage(props: PageProps<"/buyer/session/[id]">) {
  const { id } = await props.params;

  let session;
  try {
    session = await getSession(id);
  } catch {
    return (
      <div className="mx-auto w-full max-w-lg flex-1 px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">TestPass isn&apos;t fully set up yet</h1>
        <p className="mt-3 text-foreground/60">
          Connect Supabase (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) and run supabase/schema.sql.
        </p>
      </div>
    );
  }

  if (!session) notFound();

  const config = CATEGORY_CONFIG[session.category];
  const isDone = session.status === "COMPLETED";
  const locked = PAYWALL_ENABLED && !session.unlocked;

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      {!isDone && <AutoRefresh />}

      <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
        TestPass · {config.label}
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Your test result</h1>

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
        <span
          className={`h-2 w-2 rounded-full ${isDone ? "bg-green-500" : "bg-amber-500"}`}
        />
        <span className="text-sm font-medium">{session.status.replace("_", " ")}</span>
        <span className="text-sm text-foreground/60">— {STATUS_COPY[session.status]}</span>
      </div>

      {!isDone && (
        <p className="mt-4 text-sm text-foreground/60">
          This page updates automatically. Keep it open, or come back later —{" "}
          <Link href={`/seller/${id}`} className="text-accent hover:underline">
            here&apos;s the seller link
          </Link>{" "}
          again if you need to resend it.
        </p>
      )}

      {isDone && locked && (
        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <p className="font-medium">Result ready</p>
          <p className="mt-2 text-sm text-foreground/60">
            Unlock this result for ${RESULT_PRICE_USD}.
          </p>
          <UnlockButton sessionId={id} />
        </div>
      )}

      {isDone && !locked && (
        <div className="mt-6 space-y-4">
          {!PAYWALL_ENABLED && (
            <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-foreground/50">
              Payment isn&apos;t turned on yet — you&apos;re seeing this result for free while TestPass
              is being built out.
            </p>
          )}
          {session.evidence.map((ev) => {
            const { decision, explanation } = suggestDecision(ev.verdict, ev.association_strength);
            return (
              <div key={ev.id} className="rounded-xl border border-border bg-card p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <VerdictBadge verdict={ev.verdict} />
                  <span className="text-xs text-foreground/50">{ev.capability_label}</span>
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

function UnlockButton({ sessionId }: { sessionId: string }) {
  return (
    <form action={`/api/checkout/${sessionId}`} method="post" className="mt-4">
      <button
        type="submit"
        className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90"
      >
        Unlock result
      </button>
    </form>
  );
}
