import Link from "next/link";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "@/lib/primitives";
import CategoryIcon from "@/components/CategoryIcon";

// Three real steps, not marketing filler — the same sequence the product
// actually runs. Numbered with the same compact mono-blue numeral grammar
// NumberedSteps.tsx uses inside every seller flow (padded "01", signal-blue,
// monospace), just laid out horizontally here for a first-time visitor
// instead of vertically mid-flow. Deliberately NOT the large step-num-lg
// treatment — that mark is reserved for orienting a seller to a brand-new
// major step *within* a flow, never as a running list (see globals.css).
const HOW_IT_WORKS = [
  {
    title: "Send the link",
    body: "One link to the seller — no account for them, nothing to install.",
  },
  {
    title: "They run the test",
    body: "A short, guided test on the actual device, right in their phone's camera. About one to two minutes.",
  },
  {
    title: "You get the verdict",
    body: "A plain-language DEMONSTRATED, INCONCLUSIVE, or FAILED — with the evidence attached, not just an opinion.",
  },
];

// Wave 2 — homepage editorial pass. Large-scale renders of the same
// CategoryIcon glyphs used (small, functional) in the category grid below
// — not stock photography or a new illustration set, but the product's
// own real device iconography, blown up and arranged like a scattered
// photo collage. Deliberately confined to a right-hand gutter that only
// exists at lg+ (the text column stays max-w-2xl inside a max-w-5xl page,
// which leaves real empty space to its right on a wide screen) so these
// can never overlap the headline or collide with each other at any
// viewport — restrained placement over a wider spread of icons. Each is
// aria-hidden and pointer-events-none: pure atmosphere, no information a
// screen reader or pointer needs to reach here that isn't already in the
// category grid with its own visible label.
const HERO_GLYPHS: { category: Parameters<typeof CategoryIcon>[0]["category"]; className: string }[] = [
  { category: "dji", className: "absolute right-6 top-0 h-24 w-24 -rotate-[10deg] text-signal/15" },
  { category: "switch", className: "absolute right-32 top-36 h-14 w-14 rotate-[8deg] text-ink/10" },
  { category: "ps5", className: "absolute right-0 top-64 h-20 w-20 -rotate-[6deg] text-signal/12" },
  { category: "steamdeck", className: "absolute right-40 top-[19rem] h-16 w-16 rotate-[4deg] text-ink/8" },
];

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      {/* min-h reserves real vertical room (lg+ only, matching the glyphs'
          own lg:block gate) for the scattered-glyph spread below — without
          it, the absolutely-positioned glyphs would render past the text
          block's natural height and bleed into the How it works section. */}
      <div className="relative lg:min-h-[24rem]">
        <div className="reveal relative z-10 max-w-2xl">
          {/* The one dominant idea, per the Jobs test — everything else on
              this screen exists to get out of the way of it. The blue rule
              is the same structural mark the wordmark uses, not a new motif. */}
          <span className="block h-[3px] w-9 bg-signal" aria-hidden="true" />
          {/* type-display is the marketing-hero role reserved in globals.css
              for exactly this — the one H1 that isn't a page-title. Sized up
              further at wider viewports (the utility itself is a fixed 40px)
              so the headline still leads the page on a desktop-width screen.
              The <em> renders in the serif's real italic — see type-display's
              nested rule in globals.css — as the one word of emphasis. */}
          <h1 className="type-display mt-4 sm:text-[52px] lg:text-[64px]">
            Test it <em>before</em> you pay.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-secondary">
            The seller says it works. TestPass sends a short, guided test to the actual device — the
            seller taps one link, no account, no install, about one to two minutes — and reports only
            what the evidence supports.
          </p>
        </div>

        <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
          {HERO_GLYPHS.map((glyph) => (
            <CategoryIcon key={glyph.category} category={glyph.category} className={glyph.className} />
          ))}
        </div>
      </div>

      <div
        className="reveal mt-14 grid grid-cols-1 gap-x-6 gap-y-7 sm:grid-cols-3"
        style={{ animationDelay: "90ms" }}
      >
        {HOW_IT_WORKS.map((step, i) => (
          <div key={step.title}>
            <span className="font-mono text-xs font-bold text-signal">{String(i + 1).padStart(2, "0")}</span>
            <p className="mt-1.5 text-sm font-semibold">{step.title}</p>
            <p className="mt-1 text-sm text-ink-secondary">{step.body}</p>
          </div>
        ))}
      </div>

      <h2 className="type-label mt-14">Pick what you&apos;re buying</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CATEGORY_ORDER.map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const tile = (
            <div
              className={`group h-full rounded-[var(--radius-lg)] border bg-card p-6 shadow-card transition duration-150 ${
                cfg.available
                  ? "border-border-control hover:border-signal hover:shadow-raised hover:-translate-y-0.5"
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
                    <span className="type-label">{cfg.capabilityLabel}</span>
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

      {/* What a result actually looks like — the single highest-leverage
          thing a first-time visitor hasn't seen yet. Deliberately mirrors
          SessionStatus.tsx's real EvidenceReport reading order and
          VerdictHeading treatment (typography + a short colored rule, never
          a colored pill — see that file's note on why) rather than
          inventing a new "verdict chip" for the marketing page. Clearly
          labeled as an example so it's never mistaken for a real session. */}
      <div className="mt-16 max-w-2xl">
        <h2 className="type-label">What a result looks like</h2>
        <div className="mt-4 rounded-[var(--radius-lg)] border border-border-subtle bg-card p-6 shadow-card">
          <p className="type-label">What was tested</p>
          <p className="mt-1 text-base font-semibold">Analog stick calibration, both sticks</p>

          <div className="mt-4 border-t border-border-subtle pt-4">
            <p className="type-label">What TestPass observed</p>
            <p className="mt-1 text-sm text-foreground">
              Both stick indicators moved smoothly through their full range in every frame, with no
              drift at rest.
            </p>
          </div>

          <div className="mt-4 border-t border-border-subtle pt-4">
            <p className="text-sm font-bold uppercase tracking-wide text-proof">Demonstrated</p>
            <span className="mt-1.5 block h-0.5 w-8 rounded-full bg-proof" aria-hidden="true" />
          </div>

          <p className="mt-4 border-t border-border-subtle pt-4 text-xs text-ink-secondary">
            Example shown for illustration — not a real session.
          </p>
        </div>
      </div>

      {/* Deliberately not another card — this is a scope note, not a fourth
          thing competing with the category grid for the same visual
          weight. A rule and quiet type say "aside," not "action." */}
      <div className="mt-10 max-w-2xl border-t border-border-subtle pt-6 text-sm text-ink-secondary">
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
