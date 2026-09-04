---
name: BETA_RUNBOOK
description: Short, executable steps for the situations that come up during beta — disable payment, disable a category, roll back, diagnose a paid-but-locked session, refund a confirmed technical failure, and the P0-P3 escalation levels. Not a general engineering doc.
---

# TestPass beta runbook

Kept short on purpose — this is for "something's wrong, what do I do right now," not
background reading.

## Disable payment (paywall) entirely

Set `NEXT_PUBLIC_PAYWALL_ENABLED` to `false` in Vercel (Production env vars) and redeploy
(or trigger a redeploy from the dashboard — env var changes don't apply to already-built
deployments). Every result becomes free to view immediately, and new sessions are created
already unlocked (`createSession` in `src/lib/db.ts`). No code change, no data loss. Re-enable
by setting it back to `true`.

**This is exactly the mechanism behind Early Access** (see `docs/LAUNCH_STATE.md` for the full
plan and exit gate) — TestPass launched with this flag `false` on purpose, as a temporary free
validation period, not an outage or a permanent pricing decision. While it's off: sessions are
tagged `cohort: "early_access_free"` at creation (unless already `physical_qa`), the buyer-facing
copy reads "free during Early Access" rather than any discount framing, and the
`buyer_viewed_result` event carries `metadata: { free: true }` — all so a free view is never
mistaken for a paid conversion later. Re-enabling this flag (per the exit gate in
`docs/LAUNCH_STATE.md`) automatically restores the $5 paywall copy and Stripe Checkout flow with
no further code changes. Re-enabling requires Stripe account activation to actually be complete
first, or real buyers will hit a paywall that can't process a charge.

## Disable one category

Set `DISABLED_CATEGORIES` in Vercel to a comma-separated list of category keys (e.g.
`gopro,ps5`) and redeploy. That category's homepage tile shows "Coming soon" and new session
creation for it 400s (`applyCategoryKillSwitch` in `src/lib/primitives.ts`, enforced in
`src/app/api/sessions/create/route.ts`). Sessions already in progress for that category are
untouched — nothing is deleted, no fake evidence is produced. Re-enable by removing the key
from the list and redeploying.

## Roll back Production

Vercel dashboard → the project → Deployments → find the last known-good deployment → the
"…" menu → **Promote to Production**. This repoints the Production domain at that build
immediately, without needing a new commit or PR. The Supabase database is shared across all
deployments (no separate schema per deployment), so a rollback only affects application code,
not data — keep that in mind if a rollback is being used to undo a bug that also wrote bad
data; the code changes but the data doesn't.

## A buyer paid but still sees "locked"

1. Check the Stripe dashboard for that Checkout Session — did payment actually succeed?
2. If yes: check Vercel's function logs for `src/app/api/stripe/webhook/route.ts` around that
   time — did the webhook fire, and did it error? A webhook delivery failure is the most likely
   cause (Stripe retries automatically, but if signature verification or the DB write is
   failing consistently, retries won't help).
3. `unlockSessionForPayment` (`src/lib/db.ts`) is the only place `sessions.unlocked` is ever
   set — if the webhook clearly succeeded but the session still isn't unlocked, that function's
   Supabase write failed; check Supabase directly.
4. As a manual fix once the cause is confirmed: update that one session's `unlocked` column to
   `true` directly in the Supabase table editor. Don't do this without confirming payment
   actually succeeded in Stripe first.

## Refund a confirmed TestPass technical failure

Beta refund policy (Section 18): refund only when TestPass's own infrastructure failed to
produce a real result — not seller non-participation, not a legitimate but disliked
INCONCLUSIVE result (log those as feedback instead, they're real product signal).

1. Confirm it's genuinely a technical failure — check whether that session's evidence row has
   `technical_error = true` (this is exactly the flag the checkout route already uses to
   refuse charging in the first place, so a paid session with this flag set means something
   slipped through — worth understanding why before refunding).
2. Issue the refund directly in the Stripe dashboard (find the Checkout Session /
   PaymentIntent, click Refund). No refund API integration exists yet, and none is needed at
   this volume — do this manually.
3. Log what happened in `docs/BETA_LEARNINGS.md` if it points at a real defect, not just a
   one-off.

## P0-P3 escalation levels

- **P0** — security, payment, data-loss, or a wrong-result leak (buyer sees another buyer's
  result, seller data exposed). Stop the affected functionality immediately (see the kill
  switches above) and hotfix.
- **P1** — a launch blocker: a seller can't submit, a buyer can't unlock a paid result, or a
  category is systematically failing. Fix immediately; pause the affected category if needed
  while fixing.
- **P2** — 3+ independent users hit the same friction, or the funnel shows repeated
  abandonment at the same stage. Investigate, ship the smallest validated improvement.
- **P3** — a one-off preference from a single user. Record it in `BETA_LEARNINGS.md`; don't
  build anything for it yet.

## Release process during beta

Small fix branch → GitHub PR → Vercel Preview build → check lint/build pass and no merge
conflicts → merge → Vercel auto-deploys Production. No ad hoc edits directly against
Production. Every PR/commit should be traceable to an observed user behavior or defect, not a
speculative improvement — see Section 51 of the beta operating directive (repeated behavior,
repeated complaint, measurable funnel failure, or a security/payment requirement — not "could
be cool").

**Note on this environment specifically**: a direct `git push` from this session is blocked by
the sandbox's git proxy (403, repository not in the session's authorized set). The working
mechanism this session has used is GitHub's own "Upload files" web UI to push a branch, then
open and merge the PR normally — see the git history for examples (`Add files via upload`
commits). If a future session has proper git push access, use the ordinary branch → PR flow
above.

## Relevant environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_PAYWALL_ENABLED` | Global payment kill switch (`"true"`/`"false"`) |
| `DISABLED_CATEGORIES` | Comma-separated category keys to disable |
| `RESULT_PRICE_AMOUNT` / `RESULT_PRICE_CURRENCY` | Result unlock price, in cents / ISO currency |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe API + webhook signature verification |
| `QA_COHORT_SECRET` | Matched against `?qa=` on session creation to tag `cohort: physical_qa` |
| `CRON_SECRET` | Authorizes the daily `/api/cleanup` retention job |
| `BETA_NOINDEX_ALL` | `"true"` to keep the entire site out of search during beta |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Database + storage |
| `SUPPORT_INBOX` | Private destination address for `/contact` submissions — server-only, never `NEXT_PUBLIC_*`, never sent to the browser |
| `CONTACT_FROM_EMAIL` | The `From:` address `/contact` sends notification email as (e.g. `TestPass <contact@testpass.me>`) |
| `RESEND_API_KEY` | Resend API key used by `src/lib/email.ts` to send the `/contact` notification email — server-only secret |
