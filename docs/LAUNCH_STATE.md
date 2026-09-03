---
name: LAUNCH_STATE
description: Current release hash, domain, paywall price, enabled categories, known physical limitations, primary metric, and beta phase — the single place to check "what's actually live right now." Update this on every Production deploy, not just at launch.
---

# TestPass launch state

_Last updated: 2026-09-03. Update the "Last updated" line and the fields below every time
Production changes in a way that affects this list — not a general changelog._

## Domain

**Not yet resolved — owner action required.** No custom domain is connected in Vercel
(`vercel.com/edwardteam/testpass` → Domains is empty). Until one is connected, the only
customer-facing URL is a `*.vercel.app` preview/production URL, which the beta operating
directive explicitly says no customer should ever see. See the launch report for the exact
next step. The application code already derives every customer-facing URL from the live
request origin (`req.nextUrl.origin` / `window.location.origin`), so connecting a domain in
Vercel requires zero code changes.

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

Release hash: _fill in the merge commit SHA once the current launch-readiness branch is
merged to `main` and deployed to Production._

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

Pre-launch — code and schema changes for the launch-readiness wave are complete and verified
locally (lint + build pass); not yet merged to `main` or deployed to Production. Launch cannot
be declared "live" for real paid transactions until the domain and Stripe activation items
above are resolved by the owner.
