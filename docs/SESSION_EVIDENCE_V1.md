# TestPass Session Evidence v1 — Phase 0 Audit Patch (Narrow)

**Status:** Narrow patch only. This document does not replace or reopen the locked Session Evidence v1 spec's sections on beta pricing, the 3D/AR roadmap, native apps, App Attest/Play Integrity, liveness ML, anti-replay, or paywall — those remain untouched and out of scope here. This patch only documents what the Phase 0 code audit actually found, classified strictly as either (A) documented pre-existing doctrine already in the codebase, or (B) Cowork's own synthesis/inference. Nothing below is described as "hardware-tested" beyond what is explicitly supported.

## 1. Confirmed pre-existing doctrines (A — quoted from `src/lib/runner-types.ts`)

Four doctrines exist verbatim as code comments in `src/lib/runner-types.ts`, not authored by Cowork:

- **One-Phone Seller Principle** — the seller's own phone is the single evidence-capture device; no second device or app required.
- **Evidence Surface Rule** — four permitted evidence surfaces: (A) live camera pointed at the product itself, (B) same-phone screenshot handoff via `file-upload`, (C) product-generated files with an audited transfer, (D) direct BLE/telemetry — only labeled "direct" after a real parsed hardware response, never assumed.
- **Capture Correction Principle** — every capture step is correctable immediately, and the final review step is a second, independent safety net, not the only chance to fix a bad shot.
- **Atomic Evidence Principle** — a burst is one undividable evidence unit ("the Anderson/Farid distinction"): redo-all or use-all, never a partial accept of some frames from a burst.

All four are implemented in code, not just commented: `GuidedCaptureRunner.tsx`'s state machine (`captureBurst()`/`confirmBurst()` for the Atomic Evidence Principle, `beginEditStep()` for per-step correction without disturbing other confirmed evidence, `retakeEverything()` as a full-reset escape hatch) matches each doctrine's description.

## 2. GoPro hardware-testing facts (exact, no overclaiming)

- **Mechanism:** direct Web Bluetooth read against `GOPRO_SERVICE_UUID = b5f9fea6-aa8d-11e3-9046-0002a5d5c51b`. Get Hardware Info (`0x3C`) is parsed for model + firmware and is what gates a "direct_ble" success. Get Status Values (`0x13`, battery %) is bonus-only and never gates success.
- **The only hardware-testing claim in the repo** is a single code comment in `GoProFlow.tsx`, attributed to "the owner" (not independently verified by Cowork this pass): Bluetooth worked from a supported desktop browser but not from Safari/iOS on a real iPhone, because iOS Safari does not expose Web Bluetooth at all — a platform gap, not an app bug.
- **Not confirmed this pass:** exact GoPro model/firmware tested, repeat-count, or whether this was validated on a deployed build vs. a branch. Do not state these as known facts until re-verified with the owner directly.

## 3. Switch burst-testing facts (exact, no overclaiming)

- `SwitchFlow.tsx` is a 17-line declarative `RunnerConfig`: `shotCount: 5, intervalMs: 500, countdownSeconds: 3, quality: 0.82`, prompt "Capturing… move both sticks in circles."
- **No testing-claim comment exists for Switch**, unlike GoPro's one comment. This is a real asymmetry: Switch's burst capture is presumed sound because it reuses the same shared `GuidedCaptureRunner` engine as GoPro and six other flows, not because Switch itself carries any documented test record.

## 4. iPhone / no-Web-Bluetooth as a first-class constraint (already shipped, not a gap to build)

This fallback already exists in `GoProFlow.tsx` and should be documented, not rebuilt:

- Detected via `bleState === "unsupported"` (checked from `!!navigator.bluetooth`).
- Renders a dedicated path, never a dead end: "We'll test this GoPro with your camera... Direct Bluetooth checking isn't available on this phone, so TestPass will use visual evidence instead," with one "Continue with camera test" button.
- Never names Safari or iOS, never suggests switching browsers.

## 5. Browser-capability branching auto-continues (already shipped)

A failed or cancelled Bluetooth attempt routes to an explicit `bluetooth-result` phase with two choices — "Try Bluetooth again" or "Use photo test" — never a silent auto-fallback and never a technical dead end.

## 6. Evidence-unit correction carried forward

Per the prior amendment: one step is one atomic evidence unit. This is not a mandate for universal video capture — GoPro's Bluetooth path and Switch's photo burst stay exactly as built. Video remains a future additional evidence adapter for specific categories where it fits, never a blanket replacement.

## 7. Analytics stay evidence-neutral

No vocabulary change to analytics/event naming as a result of this patch.
