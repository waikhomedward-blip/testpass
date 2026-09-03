import Link from "next/link";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "@/lib/primitives";
import CategoryIcon from "@/components/CategoryIcon";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <div className="max-w-2xl">
        {/* The one dominant idea, per the Jobs test — everything else on
            this screen exists to get out of the way of it. The blue rule
            is the same structural mark the wordmark uses, not a new motif. */}
        <span className="block h-[3px] w-9 bg-signal" aria-hidden="true" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Test it before you pay.</h1>
        <p className="mt-4 text-lg text-ink-secondary">
          The seller says it works. TestPass sends a short, guided test to the actual device — the
          seller taps one link, no account, no install, about one to two minutes — and reports only
          what the evidence supports.
        </p>
      </div>

      <h2 className="mt-12 text-sm font-medium uppercase tracking-wide text-ink-secondary">
        Pick what you&apos;re buying
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CATEGORY_ORDER.map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const tile = (
            <div
              className={`group h-full rounded-[var(--radius-lg)] border bg-card p-6 shadow-card transition ${
                cfg.available
                  ? "border-border-control hover:border-signal hover:shadow-raised"
                  : "border-border-subtle opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-signal/10 text-signal">
                    <CategoryIcon category={cat} className="h-5 w-5" />
                  </span>
                  <h3 className="font-semibold">{cfg.label}</h3>
                </div>
                {!cfg.available && (
                  <span className="shrink-0 rounded-full border border-border-subtle px-2 py-0.5 text-[11px] font-medium text-ink-secondary">
                    Coming soon
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm text-ink-secondary">{cfg.shortPitch}</p>
              {cfg.available && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm font-medium text-signal group-hover:underline">Start a test →</p>
                  {cfg.capabilityLabel !== "CONFIRMED" && (
                    <span className="text-[11px] font-medium uppercase tracking-wide text-ink-secondary">
                      {cfg.capabilityLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
          return cfg.available ? (
            <Link key={cat} href={`/buyer/new/${cat}`}>
              {tile}
            </Link>
          ) : (
            <div key={cat}>{tile}</div>
          );
        })}
      </div>

      {/* Deliberately not another card — this is a scope note, not a fourth
          thing competing with the category grid for the same visual
          weight. A rule and quiet type say "aside," not "action." */}
      <div className="mt-16 max-w-2xl border-t border-border-subtle pt-6 text-sm text-ink-secondary">
        <p className="font-medium text-foreground">Bought locally instead of shipped?</p>
        <p className="mt-1">
          For a meetup purchase you can inspect the device yourself — TestPass is built first for
          shipped, pay-before-inspection purchases, where the decision has to happen before you ever
          hold the device.
        </p>
      </div>
    </div>
  );
}
