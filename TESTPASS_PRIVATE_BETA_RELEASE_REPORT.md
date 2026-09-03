# TESTPASS — PRIVATE BETA RELEASE REPORT

**Date:** 2026-09-03
**Merge commit:** `8cd42489d5bffe25b44fae1281f74f72bf7ae864` (PR #3, `integration/private-beta-ui-evidence` → `main`)
**Production:** https://testpass-q39kbc1rp-edwardteam.vercel.app (deployed from the merge commit, status **Active**)

## 1. What shipped

This release merges the two independently-developed branches that had each already been reviewed and approved on their own:

- **`design/testpass-visual-system`** — the full visual system: design tokens (`--paper`, `--ink`, `--signal`, `--proof`, `--caution`, `--failure`, radii, shadows), the `.evidence-frame` registration-corner treatment, `ChallengeCode` and `NumberedSteps` shared components, and the light-mode-only styling pass across every screen.
- **`fix/one-phone-seller-evidence`** — the evidence-mechanics rewrite: the Capture Correction Principle (retake/redo before anything is submitted), the Atomic Evidence Principle for burst captures, per-step independent redo on the review screen, and the GoPro BLE capability-routing rework.

They were combined on `integration/private-beta-ui-evidence`, branched from `main`. Git auto-merged everything except five files where both branches had touched the same code; those five (`CameraStage.tsx`, `ProductPhotoStage.tsx`, `GuidedCaptureRunner.tsx`, `GoProFlow.tsx`, `DigicamFlow.tsx`) were hand-merged by reading both versions in full and re-authoring each one to keep both branches' intent — the evidence-branch mechanics as the structural base, with design's tokens and components applied throughout, including to UI states the design pass never saw (e.g. the per-step "redoing this step" banner, styled by analogy to the existing proof-wash/caution-wash convention rather than inventing new visual language).

**Net diff vs. the pre-existing `main`:** 29 files, +2,903/−763, entirely confined to `src/app/**`, `src/components/**`, and `src/lib/primitives.ts` / `src/lib/runner-types.ts`. Zero changes to `src/lib/db.ts`, `src/lib/stripe.ts`, `src/lib/evaluate.ts`, the Stripe webhook/checkout routes, or the retention/cleanup route — confirmed by `git diff` returning empty on each of those files individually.

## 2. Static verification

- `npm run lint` — clean, zero errors, on the final integration branch.
- `npm run build` — clean, zero errors. The three fully-hand-rewritten files (`GuidedCaptureRunner.tsx`, `GoProFlow.tsx`, `DigicamFlow.tsx`) type-check correctly against the shared `runner-types.ts` discriminated unions.
- The integration branch was pushed to GitHub via the web upload flow (direct `git push` is blocked from this environment) and verified byte-identical to the local tree via `git diff <local> <origin> --stat` returning empty, both before opening the PR and again on `origin/main` after the merge.
- A real Vercel Preview deployment for the integration branch reached **Ready** (build commit `f839022`, 22s build) before the PR was opened, and the PR's own "Vercel Preview Comments" check reported 0 unresolved feedback.

## 3. Functional smoke test (non-hardware)

Run against the live Preview deployment, using fresh sessions per category (not reused from earlier work):

- **Homepage, buyer-create, seller intro/instructions** — verified across Switch, GoPro, DJI, and NAS. `NumberedSteps` and `ChallengeCode` render correctly, including the DJI flow's correct absence of a challenge code and NAS's server-name-rename code.
- **File-upload evidence primitive** — verified end-to-end on DJI (2 steps: status + battery screenshot) and NAS (1 step: drive-health screenshot). The pending-file confirm screen renders with visible `.evidence-frame` registration corners on real uploaded images.
- **Independent per-item replace on review** — verified on DJI: from the review screen, "Choose different file" on the Status screen item alone triggers the `editingStepId` "Redoing this step — your other evidence is unaffected" banner, the replacement image is confirmed, and the flow returns straight to review with the Status item updated and the Battery item completely untouched. This was the primary un-verified piece of the hand-merged `GuidedCaptureRunner.tsx` and it behaves exactly as designed.
- **GoPro Bluetooth capability routing** — verified both branches: this sandboxed Chrome reports `navigator.bluetooth` present, so "Connect via Bluetooth" is offered; clicking it actually opens the native chooser, which (correctly, since no real GoPro is in range) returns nothing, and the app shows the honest "No GoPro was found nearby, or the picker was cancelled" fallback with a working "Use photo test" escape hatch into the photo-based flow. This was flagged as possibly untestable in this environment — it turned out to be fully exercisable and passed.
- **Camera-unavailable path** — Switch, GoPro, NAS, and DJI's optional product-photo step all hit "Turn on camera" and consistently show the honest, non-crashing `text-failure` error with a working "Try again". **This environment has no camera hardware**, so the live-camera and atomic-burst capture categories (Switch's main test, PS5, SteamDeck/ROG Ally, live-camera-of-screen flows) could not be exercised past this point. That is a sandbox limitation, not a code defect — logged here rather than claimed GREEN, per the standing instruction. Real device testing of these paths is now the job of the first private-beta participants.
- **Submission → evaluation → result** — the DJI session was submitted with synthetic placeholder images; the evaluator correctly reported it couldn't confirm the content (rather than hallucinating a pass on obviously-fake evidence), which is the honest behavior expected of `evaluate.ts`.
- **Paywall lock, checked two ways:** the buyer result page for the completed-but-unlocked DJI session shows only the neutral "COMPLETED" status and an "Unlock result — $5.00" card, no verdict or evidence. A direct `fetch('/api/sessions/<id>')` call from the page (bypassing the UI entirely) confirmed the raw JSON also has `evidence: []` and no verdict/reasoning fields — the server strips protected content before a locked response ever leaves the route, not just the client hiding it. **No unlock was purchased and no Stripe checkout was initiated at any point in this verification.**

## 4. Payment/production safety regression check

No payment code changed in this release (confirmed by empty diffs on `stripe.ts`, the webhook route, and the checkout route). Behavior re-confirmed against the live app:

- Locked sessions fail closed: `evidence: []` server-side regardless of what the client requests.
- The `?checkout=success|cancelled|unavailable` query param the checkout route redirects back with is read client-side only to pick which banner text to show — it has no path to `session.unlocked`, so a forged success URL cannot unlock a result.
- The Stripe webhook is the only code path that ever sets `unlocked = true`; it verifies the signature (`stripe.webhooks.constructEvent`), fails closed on a missing/invalid signature, an unpaid `payment_status`, or an unknown `sessionId`, and dedupes `payment_completed` via a DB-enforced unique `dedupe_key` so a retried delivery can't double-log (or double-charge — `unlockSessionForPayment` is itself idempotent).
- Retention/cleanup route (`src/app/api/cleanup/route.ts`) is unchanged: 7-day raw-content redaction, 90-day full deletion, gated by `CRON_SECRET`.
- **Zero real Stripe transactions, zero paid test transactions, and no card data was ever entered or inspected during this entire verification pass.**

## 5. Security/privacy regression check

Not a new audit — a regression check against the already-established posture:

- Storage access confirmed via `createSignedUrls` (private bucket, time-limited signed URLs), not `getPublicUrl`; `src/lib/db.ts` has zero diff vs. `main`.
- No `"use client"` component references `process.env` directly; the one plaintext mention of `SUPABASE_SERVICE_ROLE_KEY` in the codebase is a server-component setup-instructions string, not a leaked value.
- No `console.log`/`debug`/`info` calls were introduced in any of the hand-merged or hand-rewritten files.
- `next.config.ts` is untouched — production client source maps remain off by default.

## 6. Instrumentation check

All nine required event types are present in the codebase: `session_created`, `seller_opened`, `seller_started`, `seller_submitted`, `evaluation_result`, `buyer_viewed_result`, `checkout_started`, `payment_completed`, `error`. Dedup is enforced at the database level via a unique constraint on `dedupe_key` (`event_type:session_id`), not just application logic, and that code path has zero diff vs. `main`.

Empirically confirmed against the sessions created during this verification pass (queried directly in Supabase): `session_created` → `seller_opened` → `seller_started` → `seller_submitted` → `evaluation_result` all fired exactly once each, with correct dedupe keys, for the DJI, NAS, and GoPro sessions. `checkout_started` / `payment_completed` correctly did **not** fire (no checkout was ever initiated), and `buyer_viewed_result` correctly did **not** fire for the locked DJI result (that event is gated behind an actual unlocked view of real evidence, by design — not behind merely landing on the paywall page). No `error` events were recorded for any of the test sessions.

## 7. Decision gate: GREEN

Every gate that can be checked without physical devices came back clean: static checks, a real Preview deployment, a byte-verified push, a full non-hardware smoke test (including the two previously-open questions — independent per-item replace, and GoPro's BLE-present-no-device fallback — both of which passed), a payment/security regression check with no code changes in that surface at all, and intact instrumentation. The only gap is device-dependent: live-camera and burst-capture flows need a real camera, which this sandbox doesn't have, and that gap is explicitly not being claimed as verified.

**Action taken:** PR #3 (`integration/private-beta-ui-evidence` → `main`) was opened, showed "Able to merge" / "No conflicts with base branch" / all checks passed, and was merged (merge commit `8cd42489`). Vercel's GitHub integration deployed that commit to the **Production** environment automatically; the deployment shows **Active** and is serving the merged build at the Production URL above, confirmed by loading it directly.

## 8. What this means

The integration is merged and live in Production. Engineering broad-build phase is over. Controlled private beta begins now — the first beta participants, testing on real phones with real cameras and real GoPros/DJI drones/NAS boxes, are the real-world validation for the one class of behavior this environment structurally cannot verify (live camera capture and burst sequences on physical hardware). Nothing about that gap was papered over: it's called out above, and it's the reason this is a *controlled* private beta rather than a wider release. No public announcement has been made as part of this work.
