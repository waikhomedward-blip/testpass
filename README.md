# TestPass

Buyer-initiated, marketplace-agnostic pre-purchase testing for used tech. A buyer sends the seller
a short TestPass link; the seller opens it (no account, no install), runs a ~90-second guided test
on the actual device, and the buyer gets an automatic evidence verdict — DEMONSTRATED / FAILED /
INCONCLUSIVE — before paying. See the product thesis this build implements for the full reasoning
behind the design choices below.

**Four categories are wired up**, each an honestly-labeled primitive per the thesis doc's capability
discipline (nothing is marked CONFIRMED until it's actually worked under realistic seller conditions):

| Category | Primitive | Capability label |
|---|---|---|
| Nintendo Switch | Guided capture of the built-in controller-drift calibration screen | MODEL-DEPENDENT |
| GoPro | Bluetooth LE identity/battery + guided status photo | EXPERIMENTAL |
| DJI Drone | Guided capture of the DJI app's own status & battery screens | EXPERIMENTAL |
| Digicam | Fresh one-time-code challenge shot at wide vs. full zoom | EXPERIMENTAL |

Every one of these is a spike, not a finished product claim — see `src/lib/primitives.ts` for the
full evidence primitive definitions (instructions, evaluation prompt, capability label) per category.
Promoting a label to CONFIRMED only happens after it demonstrably works with real sellers.

**Payments are real but off by default.** `NEXT_PUBLIC_PAYWALL_ENABLED=false` means every completed
result is still shown for free — flip it to `true` (in Vercel's production env vars, once Stripe is
verified end-to-end in test mode) to actually charge. See "Payments" below.

## Stack

- Next.js 16 (App Router) + Tailwind CSS 4
- Supabase (Postgres + Storage) — accessed **server-side only** via the service role key; the browser
  never talks to Supabase directly
- Anthropic API (Claude, vision) for automatic evidence evaluation
- Deploy target: Vercel

## Local setup

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase + Anthropic keys
```

In your Supabase project's SQL Editor, run `supabase/schema.sql` once — it creates the `sessions`
and `evidence` tables and a private `captures` storage bucket.

```bash
npm run dev
```

Open http://localhost:3000. Camera and Bluetooth features (the seller flows) need HTTPS or
`localhost` — they won't work over plain HTTP on a LAN IP, which matters when testing on a phone
during development (use a tunnel like `ngrok`, or just test on the deployed Vercel URL).

## How a session works

1. **Buyer** picks a category on the front page, optionally pastes the listing URL, gets a
   `/seller/[id]` link to send.
2. **Seller** opens that link, follows the on-screen steps (camera capture for Switch; Bluetooth +
   photo for GoPro; two guided app-screen photos for DJI; two file-uploaded photos of a fresh
   one-time code for Digicam), and submits. No login, nothing installed.
3. The submit route sends the capture straight to Claude (`src/lib/evaluate.ts`) with a
   category-specific evaluation prompt, gets back a strict-JSON verdict, and stores it as an
   `evidence` row. Session status and evidence verdict are tracked as two separate fields — never
   conflated — per the thesis doc.
4. **Buyer's** `/buyer/session/[id]` page polls automatically and shows the verdict, reasoning,
   device-association strength, and a suggested BUY / ASK / NEGOTIATE / SKIP once the seller
   finishes.

## The Proof Primitive Router

`src/lib/primitives.ts` is the deterministic configuration table described in the thesis doc's "V1
implementation constraint" — one category maps to one primary evidence primitive, each honestly
labeled `CONFIRMED` / `MODEL-DEPENDENT` / `EXPERIMENTAL` / `UNAVAILABLE`. Nothing here claims
`CONFIRMED` status; that only happens once a primitive has actually worked under realistic seller
conditions, which is a behavioral-testing question, not a code question.

## Payments

One-time Stripe Checkout, V1 scope only: no subscriptions, no Customer objects, no Billing Portal.

1. Buyer clicks "Unlock result" → `POST /api/checkout/[id]` creates a Checkout Session
   (`src/lib/stripe.ts`, card only) and redirects to Stripe.
2. Stripe redirects back to `/buyer/session/[id]?checkout=success|cancelled` — that query param is
   display-only, it never grants access.
3. The actual unlock happens out-of-band: Stripe calls `POST /api/stripe/webhook`
   (`checkout.session.completed`), which verifies the signature, confirms `payment_status === "paid"`,
   and sets `sessions.unlocked = true` plus the two Stripe reconciliation columns
   (`stripe_checkout_session_id`, `stripe_payment_intent_id`).
4. `GET /api/sessions/[id]` is the enforcement point: when the paywall is on and a completed
   session isn't unlocked, evidence content (verdict, reasoning, image paths/signed URLs) never
   leaves that route, regardless of what the client asks for or what's in the URL.

Price is server config, not code: `RESULT_PRICE_AMOUNT` (cents) and `RESULT_PRICE_CURRENCY` in
`.env.local`/Vercel — change the number to run a pricing experiment, don't edit `src/lib/stripe.ts`.

Before setting `NEXT_PUBLIC_PAYWALL_ENABLED=true` in production: test the whole loop in Stripe test
mode first (test card, real webhook, confirm `unlocked` flips), and confirm a forged
`?checkout=success` URL on a locked session still shows locked.

## Instrumentation

A minimal, durable events log — no analytics platform. See `events` in
`supabase/add-beta-readiness.sql` and `recordEvent()`/`recordEventOnce` semantics in `src/lib/db.ts`.
Funnel milestones (`session_created`, `seller_opened`, `seller_started`, `seller_submitted`,
`evaluation_result`, `buyer_viewed_result`, `checkout_started`, `payment_completed`) are deduped
per-session via a `dedupe_key` unique index, so a page refresh, a status poll, or a retried Stripe
webhook can't inflate a funnel count. `error` events aren't deduped. Query `events` directly in the
Supabase SQL editor for funnel counts — nothing here needs a dashboard.

## Data retention

Submitted photos go to the private `captures` Supabase Storage bucket, scoped by session id.
`GET /api/cleanup` (Vercel Cron, see `vercel.json`, runs daily) enforces:

- **7 days**: raw capture images and free-form/sensitive evidence content (`reasoning`, `raw_data`,
  `cosmetic_note`) are deleted. Storage objects are removed before the DB row is touched — a failed
  storage deletion is retried on the next run rather than being silently marked clean.
- **90 days**: the session and its evidence row are deleted entirely. `events` rows (already
  de-identified — see Instrumentation) are pruned on the same window.

Both windows are easy to change (`RAW_RETENTION_DAYS`/`FULL_RETENTION_DAYS` in
`src/app/api/cleanup/route.ts`) — they're a starting policy, not a permanent one.

## What's genuinely unproven (from the thesis doc — carried forward, not solved by this build)

Building the app doesn't answer whether buyers will send the link, sellers will complete it, or
buyers will pay. Those are the H2a/H2b/H4 behavioral questions in the doc's hypothesis ledger — this
codebase is the instrument for running that test with real people, not a substitute for it.
