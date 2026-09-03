# TESTPASS EARLY ACCESS — DEPLOYED, NOT YET LIVE FOR PAYMENT

_Prepared 2026-09-03/04. Release `5d86947` (+ follow-up `079faa9`), deployed to Production._

This is the closing report for the "launch → acquire → observe → charge → learn → fix →
repeat" operating shift. Per the operating directive's own instruction, this is reported
honestly: **TestPass cannot yet be declared fully live for real paid transactions.** Two
owner-only actions remain, both outside what this session is authorized or able to do. Everything
else on the launch gate is clean and verified against the live Production deployment.

## What's actually true right now

**Live and working, verified against Production this session:**

- Homepage renders with the "TestPass · Early Access" badge and "Test it before you pay."
  positioning.
- Buyer create flow shows the exact price-disclosure copy before session creation: *"Creating
  the test is free. It's $5.00, one time, only if you unlock the finished result — and only
  after the seller completes it. The seller never pays anything."*
- Creating a session produces a seller link with both a plain **Copy** button and a **Copy a
  ready-to-send message instead** button (pre-written, trust-preserving wording).
- The buyer status page polls live and correctly reflected the seller opening the link
  (`NOT STARTED` → `IN PROGRESS`) during this verification pass — confirms the funnel and the
  earlier polling-bug fix both work.
- Seller page carries the trust copy: *"This is free for you — TestPass never charges the
  seller, only the buyer, and only after the result exists,"* plus a consent line linking to
  `/privacy`, and a visible **Report a problem** link.
- A completed, locked result shows a neutral paywall — no verdict leakage — with the exact
  price ($5.00), "One-time payment. No subscription. The seller pays nothing," and a
  **Unlock result — $5.00** button.
- `/privacy` and `/terms` both render correctly as honest, plain-language drafts matching
  actual product behavior (marked for legal review, not final legal documents).
- `/robots.txt` is correct: marketing pages allowed, `/buyer/session/`, `/buyer/mine`, and
  `/seller/` disallowed. Both a seller page and a buyer result page were fetched directly and
  confirmed to carry `<meta name="robots" content="noindex, nofollow">`.
- Clicking "Unlock result" does successfully create a Stripe Checkout Session and render
  Stripe's hosted payment page (see the Stripe finding below for why that isn't the same as
  "payments work").
- Still only a `*.vercel.app` URL — no regression, but also no progress on the domain (see
  below).

**Category and safety posture:** all 13 categories are live, the chargeable-result gate
(`technical_error` flag) is wired end-to-end so a TestPass-side failure is never charged, and
the category/payment kill switches are live and documented in `docs/BETA_RUNBOOK.md`.

## The two things only you can unblock

### 1. Custom domain — not connected

`vercel.com/edwardteam/testpass` → Domains is still empty. Every customer currently sees a
`testpass-sigma.vercel.app` URL, which the operating directive is right to flag as a trust
problem. The app already builds every link from the live request origin, so connecting a
domain requires **zero code changes** — it's purely a Vercel dashboard action (and a domain
you own or are willing to buy; I have not purchased one on your behalf).

**Your action:** buy or point a domain at the Vercel project, then add it under Domains.

### 2. Stripe account — not activated for real charges

This needed a second, closer look this session, because the surface signal is misleading:
clicking "Unlock result" *does* successfully open a real Stripe Checkout page with a card
form — that's because your **live** API keys (`pk_live_...`) are already wired into
Production, and Stripe lets a live key create a Checkout Session and render the payment UI
before the account is fully activated. That is not the same as being able to actually complete
a charge. I did not enter any card details or attempt to submit a payment — I'm not able to
handle payment credentials on your behalf, and doing so wouldn't reliably tell us whether a
charge would succeed anyway.

What I confirmed directly in the Stripe dashboard (`acct_1U9jBCDvE8FU7I5E`), read-only:

- **Business details → Business information: Incomplete**
- **Business details → Customer-facing information: Incomplete**
- **Business details → Account representative (identity): Incomplete**
- **Business details → Statement descriptor: Incomplete** (minor — just what shows on the
  buyer's card statement)
- **Account details → Phone verification: not done** — Stripe's own note here is explicit:
  *"You must verify your phone number via SMS to process payments from the Dashboard."*
- **Linked accounts and payouts: no bank account on file** in any currency — even once
  activated, there's nowhere for money to actually settle yet.

None of this is something I can complete for you — it requires your personal identity
details, business details, and banking information, which I'm not able to enter on your
behalf under any circumstance.

**Your action:** open the Stripe dashboard for this account and work through Settings →
Business (business info, representative identity, statement descriptor) plus phone
verification and adding a payout bank account. Stripe will tell you if anything else is
outstanding once those are filled in.

Until both of these are done, real buyers can reach the paywall and see a correct $5 price,
but a real charge is not guaranteed to complete, and no customer should be sent a
`*.vercel.app` link to pay through.

## Everything else from the operating directive — status

All of the following were built, wired to the live database, deployed, and re-verified against
Production this session: server-side chargeable/non-chargeable billing gate, `paywall_viewed`
funnel event (full funnel now instrumented end to end), the minimal seller/buyer feedback
system (`feedback` table + UI on both sides), the "Report a problem" affordance (present on
buyer, seller, and result surfaces), the `physical_qa` vs. genuine-buyer cohort tag
(admin/server-set only, no public field), category and global payment kill switches, draft
Privacy/Terms pages, seller trust and consent copy, noindex on every session/result page,
the buyer→seller copy-message feature, and `docs/BETA_RUNBOOK.md` /
`docs/BETA_LEARNINGS.md` / `docs/LAUNCH_STATE.md` as the operational reference set.

One open, non-blocking item: **`docs/support-contact`** — I did not invent a support email
address, per your own instruction. "Report a problem" (which auto-attaches session ID,
category, stage, and timestamp) is the functioning contact path for beta. If you want a real
monitored email address surfaced instead of or alongside it, that's a one-line change once you
tell me what it is — I won't guess one.

## 7-day plan

1. **Day 0 (you):** resolve the domain and Stripe activation items above — everything else is
   ready and waiting on those two.
2. **Days 1–2:** once live, send TestPass to a small number of real buyers you know personally
   (not a broad announcement — the directive is explicit about this). Watch `paywall_viewed →
   checkout_started → payment_completed` in the events table daily.
3. **Days 3–5:** read every `feedback` row and every "Report a problem" submission as they come
   in. Triage with the P0–P3 levels in `docs/BETA_RUNBOOK.md`. Fix only what's confirmed by
   real usage, not speculative improvement.
4. **Days 6–7:** write the first real entries in `docs/BETA_LEARNINGS.md` once there's enough
   independent-user evidence to say something at Level 3 (conclusion), not just Level 1/2 (raw
   events/feedback). Do not extrapolate from a single session.

## 30-day goal

Reach 25–50 genuine paywall opportunities (real buyer, real completed seller test, real locked
result seen) before touching the $5 price or the core flow again. Below that, funnel and
feedback data are too thin to justify a pricing or product change — that's the price freeze
condition from the operating directive, and it's designed to protect you from reacting to
noise.

## The instruction I'm holding myself to

Per your own closing line in the operating directive: further TestPass work from here should
be earned by customers, funnel data, payment data, or a confirmed defect — not by what I can
think of to improve. Beyond the two items above, I'm not going to touch the product until one
of those shows up.
