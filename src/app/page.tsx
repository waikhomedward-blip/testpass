import Link from "next/link";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "@/lib/primitives";
import CategoryIcon from "@/components/CategoryIcon";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Test it before you pay.
        </h1>
        <p className="mt-4 text-lg text-foreground/70">
          The seller says it works. TestPass sends a short, guided test to the actual device — the
          seller taps one link, no account, no install, about one to two minutes — and reports only
          what the evidence supports.
        </p>
      </div>

      <h2 className="mt-12 text-sm font-medium uppercase tracking-wide text-foreground/50">
        Pick what you&apos;re buying
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CATEGORY_ORDER.map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const tile = (
            <div
              className={`group h-full rounded-xl border border-border bg-card p-6 transition ${
                cfg.available ? "hover:border-accent hover:shadow-sm" : "opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <CategoryIcon category={cat} className="h-5 w-5" />
                  </span>
                  <h3 className="font-semibold">{cfg.label}</h3>
                </div>
                {!cfg.available && (
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-foreground/50">
                    Coming soon
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm text-foreground/60">{cfg.shortPitch}</p>
              {cfg.available && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm font-medium text-accent group-hover:underline">Start a test →</p>
                  {cfg.capabilityLabel !== "CONFIRMED" && (
                    <span className="text-[11px] font-medium uppercase tracking-wide text-foreground/40">
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

      <div className="mt-16 rounded-xl border border-border bg-card p-6 text-sm text-foreground/70">
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
