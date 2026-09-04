# TestPass — Full Status Report

_Prepared 2026-09-04. Written as a standalone handoff document — no prior context assumed._

## What TestPass is

TestPass is a buyer-initiated, pre-purchase testing service for used tech (Nintendo Switch,
GoPro, DJI drones, digital cameras, PS5, Epson printers, Xbox, Steam Deck, Meta Quest, NAS
devices, 3D printers, projectors, ROG Ally — 13 categories total). Positioning: **"Test it
before you pay."**

The flow: a buyer who's about to purchase a used device from a seller (e.g. on a
marketplace listing) creates a free TestPass session and sends the seller a link. The seller
opens it on their own phone — no account, no app install, no password, ever — and runs a
short guided test (60–120 seconds): live photos of a calibration/status screen, a direct
Bluetooth read where available, or a guided capture sequence, depending on category. TestPass
evaluates the submitted evidence and returns a verdict: **DEMONSTRATED**, **FAILED**, or
**INCONCLUSIVE** (when the evidence is too weak to support a confident call either way).

The buyer sees the verdict is available but the *reasoning and evidence* stay locked behind a
paywall: **$5.00 USD, one-time, no subscription**, charged only after a real result exists,
and never charged to the seller. This is the entire business model — one-time unlock fees,
no ads, no data resale, no credits or subscription tiers.

## Architecture

- **Next.js 16** (App Router), Tailwind v4 for styling, TypeScript throughout.
- **Supabase (Postgres)** as the sole datastore — sessions, evidence, events, feedback tables.
  Shared identically between Preview and Production; schema evolved via additive
  `supabase/add-*.sql` migrations run manually in the Supabase SQL editor.
- **Vercel** for hosting — Production and Preview deployments, environment variables, and (as
  of today) domain registration/DNS.
- **Stripe Checkout** (hosted, redirect-based) for the one-time $5 unlock. Webhook-authoritative
  unlock model: the app never trusts client-side `?checkout=success` state alone — a Stripe
  webhook is the sole source of truth for marking a session unlocked, and the buyer sees a
  neutral "unlocking…" polling state until the webhook lands. `unlockSessionForPayment` in
  `src/lib/db.ts` is the only code path that ever sets `sessions.unlocked = true`.
- **An AI evaluator** reads submitted evidence (photos, Bluetooth reads, etc.) per-category and
  returns a structured verdict + reasoning, per a per-category evaluation prompt in
  `src/lib/primitives.ts`.

## What has been built (cumulative, across the whole project)

This is the short version — the repo's own commit history is long and detailed:

- All 13 category flows (guided capture UIs, per-category evaluation prompts, proof primitives
  researched and audited against each device's actual first-party test/status screens).
- A shared `GuidedCaptureRunner` architecture with common capture-correction primitives
  (retake/use flows, atomic redo for burst sequences) so fixes apply once across categories
  rather than being re-implemented per flow.
- A full visual/design system pass (design tokens, typography roles, WCAG-audited).
- Server-enforced paywall (never trust client state), Stripe Checkout integration, webhook
  handler (signature-verified, idempotent, fail-closed), retention/cleanup cron
  (`/api/cleanup` — raw capture content deleted after 7 days, full session record after 90).
- Full funnel event instrumentation: `session_created → seller_opened → seller_started →
  seller_submitted → evaluation_result → paywall_viewed → checkout_started →
  payment_completed`, deduped via a Postgres partial unique index.

## The most recent work: "launch → acquire → observe → charge → learn → fix → repeat"

The most recent operating phase deliberately shifted from further feature-building to launch
readiness, under an explicit instruction: **no more improvement work should happen unless it's
earned by real customer/funnel/payment data or a confirmed defect — not because more could be
built.** This wave (release `5d86947`, merged via PR #4, deployed to Production 2026-09-04)
delivered:

- **Chargeable vs. non-chargeable billing gate** — a new `evidence.technical_error` boolean,
  orthogonal to the verdict itself. A session is only ever charged if the evaluator
  successfully returned a valid structured result (even an honest INCONCLUSIVE) — never if
  TestPass's own infrastructure failed. This is enforced server-side in
  `src/app/api/checkout/[id]/route.ts`, before Stripe is ever contacted.
- **`paywall_viewed` funnel event** (deduped, fires once per session when the locked result is
  actually viewed) — completes the funnel above end to end.
- **A minimal feedback system** — one Supabase table (`feedback`), RLS-protected, service-role
  only. Seller side: "How was this? Easy / Okay / Difficult" + optional free text after
  submitting. Buyer side: "Did TestPass help you decide? Yes / Somewhat / No" + optional free
  text after viewing an unlocked result. A small "Report a problem" link on every buyer/seller
  surface, auto-attaching session ID, category, stage, and timestamp.
- **Cohort tagging** — sessions can be tagged `cohort: physical_qa` via a private `?qa=`
  query param matched server-side against a secret env var (never a public/client field), so
  the founder's own device-testing sessions never contaminate genuine-buyer funnel data.
- **Category kill switch and global payment kill switch** — both env-var driven
  (`DISABLED_CATEGORIES`, `NEXT_PUBLIC_PAYWALL_ENABLED`), documented with exact steps in
  `docs/BETA_RUNBOOK.md`, so a systematically-failing category or a payment emergency can be
  handled without taking the whole product offline or touching code.
- **Draft Privacy and Terms pages** — honest, plain-language, reflecting actual current
  behavior (retention windows, Stripe as processor, no invented support email — routes contact
  through "Report a problem" instead), explicitly marked as drafts for eventual legal review.
- **Seller trust copy** — every seller-facing page now states plainly: a buyer requested this,
  the seller pays $0, no account/login/password is ever requested, plus a consent line linking
  to the privacy page.
- **`noindex` on every session/result page** (buyer result pages, seller pages) so no
  in-progress transaction is ever indexable, with a `BETA_NOINDEX_ALL` env var to pull the
  entire site out of search during beta if needed. `robots.txt` explicitly disallows
  `/buyer/session/`, `/buyer/mine`, and `/seller/`.
- **Buyer→seller distribution copy** — beyond a plain link-copy button, a "Copy a
  ready-to-send message instead" option with pre-written, trust-preserving wording.
- **Operational docs**: `docs/BETA_RUNBOOK.md` (kill switches, rollback procedure, P0–P3
  escalation levels, how to diagnose a paid-but-locked session, refund policy), and
  `docs/BETA_LEARNINGS.md` (a three-level model — raw events, raw feedback, actual decision-
  worthy learnings — kept empty until real usage exists, deliberately not pre-populated with
  speculation).

All of the above was verified locally (lint + build clean) before every deploy, pushed via
small commits/PRs, and re-verified live in Production after merge — not just claimed.

## Verification performed against the live site

Beyond code review, the following was manually checked against the running Production site
(not just assumed from the code):

- Homepage renders correctly with an "Early Access" badge and the "Test it before you pay"
  positioning.
- The buyer create-session flow shows the exact required price-disclosure copy *before* the
  create button: "Creating the test is free. It's $5.00, one time, only if you unlock the
  finished result — and only after the seller completes it. The seller never pays anything."
- Creating a session produces a seller link with both a plain copy button and the
  ready-to-send-message option.
- The buyer status page polls live and correctly reflects real seller activity (confirmed by
  opening the seller link in a second tab and watching the buyer page update from `NOT
  STARTED` to `IN PROGRESS` automatically).
- The seller page shows the trust/consent copy and a working "Report a problem" link.
- A completed, locked result shows a neutral paywall (no verdict leakage of any kind) with the
  exact $5.00 price and "One-time payment. No subscription. The seller pays nothing."
- `/privacy` and `/terms` both render correctly.
- `robots.txt` and per-page `noindex` metadata were fetched directly and confirmed correct.
- Clicking "Unlock result" successfully creates a real Stripe Checkout Session and renders
  Stripe's hosted payment page (see the Stripe section below for the important caveat this
  surfaced).

## Domain — RESOLVED today

At launch-readiness, TestPass had no custom domain — every customer-facing link was a
`*.vercel.app` URL, which is a real trust problem for a product whose whole pitch is "test it
before you pay." This is now fixed:

- The owner purchased **`testpass.me`** directly through Vercel's own domain registrar
  (chosen after comparing pricing across several options — it was the cheapest available
  option that kept the exact brand name; **note for future reference: it renews at $20.00/year
  starting 2027-09-04, after a $1.99 first-year promotional price** — worth budgeting for).
- The domain is attached to the project as the Production domain, propagated, and serving
  traffic over valid HTTPS within about 10 minutes of purchase (typical for `.me` domains).
- Verified live: the domain resolves correctly, a fresh buyer session generates a seller link
  on `https://testpass.me/seller/...` (not the old vercel.app domain), confirming the
  application's zero-hardcoded-URL design (every customer-facing link is derived from the
  live request origin) worked exactly as designed — no code changes were needed to make this
  work.
- `robots.txt` and per-session `noindex` were re-verified on the new domain and match.
- The old `testpass-sigma.vercel.app` URL remains attached and still resolves, so nothing
  breaks for any link already shared before the domain switch.
- One minor, unrelated item surfaced while doing this: Vercel is showing an account-level
  notice that the billing address on file is missing/incomplete. This doesn't block the
  domain from working, but should be cleared up before the year-two renewal charge is due.

## The one thing left: Stripe account activation

This is now the **only remaining blocker** before TestPass can be declared genuinely live for
real paid transactions. Everything else on the launch checklist is done and verified.

**The confusing part, worth stating clearly:** clicking "Unlock result" on the live site
*does* successfully open a real Stripe Checkout page with a working card-entry form. That is
not a sign payments actually work — it's because the app's live-mode Stripe API keys
(`pk_live_...`) are already correctly wired into Production, and Stripe allows a live key to
create a Checkout Session and render its hosted payment UI *before* the underlying account is
fully activated. Whether an actual charge submitted through that form would succeed is a
separate question that depends entirely on account-level activation status — and no card
details were entered to test this, deliberately, since that's not something that should be
tested by anyone other than the account owner with their own card.

Checked directly in the Stripe dashboard (`acct_1U9jBCDvE8FU7I5E`), the following are
outstanding:

- **Business details → Business information: Incomplete**
- **Business details → Customer-facing information: Incomplete**
- **Business details → Account representative (identity verification): Incomplete**
- **Business details → Statement descriptor: Incomplete** (minor — just what appears on the
  buyer's card statement; not a hard blocker, but should be set)
- **Account details → Phone verification: not completed** — Stripe's own UI states directly:
  *"You must verify your phone number via SMS to process payments from the Dashboard."*
- **Linked accounts and payouts: no bank account linked**, in any currency — so even once the
  account is otherwise activated, there is currently nowhere for collected funds to actually
  settle to.

Every one of these requires the account owner's own personal identity details, business
details, phone number, and banking information. None of it can or should be entered by anyone
other than the account owner — this is precisely the kind of information an assistant/agent
should never handle on someone else's behalf.

**What "done" looks like:** the account owner logs into the Stripe dashboard, completes the
Business details section (business info, representative identity, statement descriptor),
verifies their phone number via SMS, and adds a bank account under Linked accounts and
payouts. Stripe will surface anything else outstanding once those are filled in — there's no
way to know in advance if that's a fully exhaustive list versus what Stripe reveals
progressively. Once activation completes, no application-side changes are needed: the
Checkout/webhook integration is already built, tested at the logic level, and waiting.

## Summary

Product, category coverage, paywall logic, funnel instrumentation, feedback system, kill
switches, legal-draft pages, search-indexing safety, and now the custom domain are all built,
deployed to Production, and independently verified against the live site — not just claimed
from reading the code. The **single remaining item** between TestPass and processing its
first real paid transaction is completing Stripe's own account activation (business details,
identity verification, phone verification, and a linked payout bank account), which only the
account owner can do.
