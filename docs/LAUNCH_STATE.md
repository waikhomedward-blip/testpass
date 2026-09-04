---
name: LAUNCH_STATE
description: Current release hash, domain, paywall price, enabled categories, known physical limitations, primary metric, and beta phase — the single place to check "what's actually live right now." Update this on every Production deploy, not just at launch.
---

# TestPass launch state

_Last updated: 2026-09-04. Update the "Last updated" line and the fields below every time
Production changes in a way that affects this list — not a general changelog._

## Early Access (free validation period) — ACTIVE

**Pricing strategy pivot, decided 2026-09-04.** Rather than wait for Stripe activation to launch,
TestPass is launching now with the paywall globally OFF (`NEXT_PUBLIC_PAYWALL_ENABLED = false`) for
a temporary, explicitly time/volume-boxed free validation period. Nothing about the paywall
architecture, Stripe integration, or $5 pricing was removed or redesigned — this is a mode, not a
rebuild. Rationale: Stripe isn't activated yet anyway (see below), the first real users are also
functioning as physical-device QA, and the feedback/analytics infrastructure needed to make a free
period actually useful is already live. Payment infrastructure stays dormant, not deleted.

**What Early Access answers, and what it doesn't:** free Early Access tells us whether TestPass
physically works and produces a legitimate, useful result for a buyer — shared primitives holding
up across real devices, sellers completing the flow, evaluator output being trustworthy. It does
**not** tell us whether genuine buyers will pay $5 for that value. Those are two different
questions; a later paid cohort answers the second one. Free usage during Early Access must never be
read as a willingness-to-pay signal — see the cohort tagging and event metadata below, which exist
specifically to keep the two apart in later analysis.

**How it's implemented (no redesign, just the existing kill switch):**
- `NEXT_PUBLIC_PAYWALL_ENABLED=false` in Vercel Production — the same global switch already
  documented in `docs/BETA_RUNBOOK.md`. Every new session starts unlocked (`createSession` in
  `src/lib/db.ts`); no buyer is ever routed into Stripe Checkout while this is off.
- Every genuine (non-`physical_qa`) session created while the paywall is off is tagged
  `cohort: "early_access_free"` (`src/app/api/sessions/create/route.ts`), distinct from
  `physical_qa`, so later paid-conversion analysis can exclude both non-genuine categories.
- The buyer create page and the buyer result page both show honest "free during Early Access"
  copy (never fake-discount language like "$5 → $0" or "normally $5") and both auto-revert to the
  existing paid copy the instant the paywall is re-enabled — nothing to manually undo.
- The `buyer_viewed_result` funnel event now carries `metadata: { free: true }` for these views
  (`src/app/api/sessions/[id]/route.ts`) instead of a separate event type, so it stays one accurate
  "result was actually viewed" event whether the view was free or paid.
- Buyers optionally see one extra stated-preference question: "If this hadn't been free during
  Early Access, would this result have been worth $5 to you? Definitely / Maybe / No" — recorded via
  the existing `feedback` table (`stage: "pricing_early_access"`), explicitly as a stated preference,
  never labeled or treated as payment intent or conversion.

**Exit condition — review, don't auto-extend:** review monetization after roughly 30-50 genuine
(non-QA, non-Early-Access-excluded-from-the-review-itself... i.e. just real attempts) TestPass
attempts, or sooner if the evidence already shows: shared physical primitives working across real
devices, no systemic seller-flow defect, legitimate results that buyers find useful (via the
existing "Did TestPass help you decide?" feedback), and TestPass-side technical failures
(`technical_error = true`) uncommon. Do not extend free access just because usage looks exciting —
the gate is evidence-based, not vibes-based.

**When the gate is met, in order:**
1. Activate/verify the Stripe account (see "Payment processing" below — nothing here changes that
   requirement, it just no longer blocks launch).
2. Verify payment config end-to-end (Checkout, webhook, unlock) with a real low-stakes charge.
3. Flip `NEXT_PUBLIC_PAYWALL_ENABLED` back to `true` in Vercel Production and redeploy if needed.
4. Confirm the existing $5 copy is back (it auto-reverts — verify, don't assume).
5. Begin genuine willingness-to-pay testing at $5.

**Price after Early Access:** stays **$5.00 USD, one-time** — not $1, no subscription, no
multi-price A/B test yet. The price is frozen for the first meaningful paid cohort so an early
signal isn't confused with a pricing experiment.

**Refunds:** no refund automation during Early Access (nothing is being charged). Once the paid
cohort resumes, the existing manual refund policy in `docs/BETA_RUNBOOK.md` ("Refund a confirmed
TestPass technical failure") applies unchanged.

## Domain

**Resolved.** `testpass.me` was purchased by the owner through Vercel's registrar and
connected to the project's Production environment on 2026-09-04. Verified working: the
domain resolves over HTTPS with a valid certificate, and a fresh buyer session generates a
seller link on `https://testpass.me/seller/...` — confirming the zero-code-change design
(every customer-facing URL is derived from the live request origin) held as expected.
`robots.txt` and per-session `noindex` were re-verified on the new domain and match the
`testpass-sigma.vercel.app` behavior exactly. The apex domain serves directly (no forced
`www` redirect). Renews 2027-09-04 at $20.00/year (year-one promo price was $1.99) — flagged
here so the renewal isn't a surprise. Separately, Vercel is showing an account-level "billing
address missing or incomplete" notice under Settings → Billing — unrelated to the domain
itself, but worth the owner clearing up before the renewal charge is due.

The old `testpass-sigma.vercel.app` URL is still attached to the project and still resolves
(Vercel doesn't require removing it), so nothing breaks for anyone who has that link
bookmarked from before launch — but `testpass.me` is now what should be shared going forward.

## Payment processing

**Not yet resolved — owner action required — but no longer a launch blocker.** The Stripe
account (`acct_1U9jBCDvE8FU7I5E`) shows "Activation required" and cannot process any live
payment method, including a plain card, until Stripe's own business/identity/bank-verification
onboarding is completed. This is separate from and in addition to the domain issue — API keys
and webhook config being correct does not mean the account can actually charge anyone.
Application-side, the checkout flow (Stripe Checkout, one-time payment, card-only for V1,
webhook-authoritative unlock) is built and ready; it simply cannot process a real charge until
this account-level activation is done by the account owner (requires personal/business/banking
details this session cannot enter on the owner's behalf). Per the Early Access section above,
this is no longer what launch is waiting on — TestPass now launches free, and Stripe activation
becomes the blocker for exiting Early Access into the paid cohort, not for launching at all.

## Release

Release hash: `5d86947` (merge of PR #4, "Beta launch operating system: paywall integrity,
funnel, feedback, docs" — deployed to Production 2026-09-04). Update this line on every
subsequent Production deploy.

## Paywall

- Price: $5.00 USD, one-time, no subscription (`RESULT_PRICE_AMOUNT` / `RESULT_PRICE_CURRENCY`
  env vars, defaulting to 500 / "usd")
- Enabled via `NEXT_PUBLIC_PAYWALL_ENABLED` — confirm current value in Vercel before assuming
  it's on. **Currently `false` during Early Access** (see the Early Access section above) — this
  is intentional, not a regression, and is planned to flip back to `true` once the exit gate is
  met.
- Chargeable-result gate is live: a session whose evidence has `technical_error = true` is
  never charged (`src/app/api/checkout/[id]/route.ts`)

## Categories enabled

All 13 built categories have `available: true` in `src/lib/primitives.ts`: Switch, GoPro, DJI,
digital camera, PS5, Epson printer, Xbox, Steam Deck, Meta Quest, NAS, 3D printer, projector,
ROG Ally. PS5 is intentionally excluded from the homepage grid (`CATEGORY_ORDER`) while owner
validation continues, but is directly reachable and functional. Use `DISABLED_CATEGORIES` (see
`docs/BETA_RUNBOOK.md`) to pull any category if it's systematically failing.

## Known physical uncertainties

Categories vary in evidence strength depending on whether TestPass gets a direct device read
(e.g. Bluetooth) or relies on guided photos alone — the buyer-facing evidence report already
surfaces this per-result ("Direct device read" vs. "Photo fallback"). Real-device coverage
outside what's been manually verified this build cycle is genuinely unproven until real
sellers with real hardware run it — that's the point of launching now rather than waiting for
more pre-launch device acquisition (Section 62 of the beta operating directive explicitly
doesn't require the founder to acquire more physical devices first).

## Primary metric

`paid_unlocks_per_week`. Secondary: `seller_completion_rate`. Guardrail:
`usable_result_rate`. Full funnel instrumented: `session_created → seller_opened →
seller_started → seller_submitted → evaluation_result → paywall_viewed → checkout_started →
payment_completed`.

## Current beta phase

**Early Access (free) — live for real participant acquisition.** The launch-readiness wave
(release `5d86947`) is merged to `main` and deployed to Production, the custom domain is
connected, and the Early Access free-mode changes above are deployed with
`NEXT_PUBLIC_PAYWALL_ENABLED=false` in Production. Real buyers and sellers can use TestPass
today at no cost, per the pricing-strategy pivot documented above. The transition to a genuinely
paid cohort at $5 is gated on the Early Access exit condition above (roughly 30-50 genuine
attempts or clean signals sooner) plus Stripe account activation — neither is required to be
"live" right now, only to move past Early Access into paid.
