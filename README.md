# TestPass

Buyer-initiated, marketplace-agnostic pre-purchase testing for used tech. A buyer sends the seller
a short TestPass link; the seller opens it (no account, no install), runs a ~90-second guided test
on the actual device, and the buyer gets an automatic evidence verdict — DEMONSTRATED / FAILED /
INCONCLUSIVE — before paying. See the product thesis this build implements for the full reasoning
behind the design choices below.

**V1 scope:** Nintendo Switch (controller-drift test via the built-in calibration screen) and GoPro
(Bluetooth identity/battery + guided status photo) are fully wired up. DJI and Camera are stubbed as
"Coming Soon" tiles — building those out is real, separate engineering work per the thesis doc's
category-spike constraints.

**Stripe is intentionally stubbed.** The paywall UI, the `unlocked` column, and the checkout route
all exist; `src/lib/stripe.ts` is the one file to fill in when you're ready to charge for real. Until
then `NEXT_PUBLIC_PAYWALL_ENABLED=false` means every completed result is shown for free.

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
   photo for GoPro), and submits. No login, nothing installed.
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

## Data retention

Submitted photos are uploaded to the private `captures` Supabase Storage bucket, scoped by session
id. There's no automatic deletion job yet — add one (a scheduled Supabase Edge Function or a Vercel
Cron hitting a small `/api/cleanup` route) before you have real users, per the thesis doc's
data-minimization doctrine: raw artifacts should have a short, defined retention window.

## What's genuinely unproven (from the thesis doc — carried forward, not solved by this build)

Building the app doesn't answer whether buyers will send the link, sellers will complete it, or
buyers will pay. Those are the H2a/H2b/H4 behavioral questions in the doc's hypothesis ledger — this
codebase is the instrument for running that test with real people, not a substitute for it.
