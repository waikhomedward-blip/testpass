---
name: LAUNCH_STATE
description: Current release hash, domain, paywall price, enabled categories, known physical limitations, primary metric, and beta phase — the single place to check "what's actually live right now." Update this on every Production deploy, not just at launch.
---

# TestPass launch state

_Last updated: 2026-09-04. Update the "Last updated" line and the fields below every time
Production changes in a way that affects this list — not a general changelog._

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

**Not yet resolved — owner action required.** The Stripe account (`acct_1U9jBCDvE8FU7I5E`)
shows "Activation required" and cannot process any live payment method, including a plain
card, until Stripe's own business/identity/bank-verification onboarding is completed. This is
separate from and in addition to the domain issue — API keys and webhook config being correct
does not mean the account can actually charge anyone. Application-side, the checkout flow
(Stripe Checkout, one-time payment, card-only for V1, webhook-authoritative unlock) is built
and ready; it simply cannot process a real charge until this account-level activation is done
by the account owner (requires personal/business/banking details this session cannot enter on
the owner's behalf).

## Release

Release hash: `5d86947` (merge of PR #4, "Beta launch operating system: paywall integrity,
funnel, feedback, docs" — deployed to Production 2026-09-04). Update this line on every
subsequent Production deploy.

## Paywall

- Price: $5.00 USD, one-time, no subscription (`RESULT_PRICE_AMOUNT` / `RESULT_PRICE_CURRENCY`
  env vars, defaulting to 500 / "usd")
- Enabled via `NEXT_PUBLIC_PAYWALL_ENABLED` — confirm current value in Vercel before assuming
  it's on
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

Pre-launch — the launch-readiness wave (release `5d86947`) is merged to `main` and deployed to
Production, and the custom domain is now connected. Launch still cannot be declared "live" for
real paid transactions until the Stripe activation item above is resolved by the owner — that
is now the only remaining blocker; everything else on the launch decision gate is clean.
