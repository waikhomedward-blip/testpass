---
name: PAIN_EVIDENCE_LIBRARY
description: Recurring buyer/seller pain around used-device purchases, each entry sourced and
  dated, with observed evidence kept separate from TestPass's interpretation of it. Bootstrapped
  2026-09-06 from evidence already cited in docs/QUERY_UNIVERSE.md and published-article
  sourceNotes; extend going forward as the daily run finds more.
sources: cowork
---

# TestPass Pain & Evidence Library

Format per entry: **Observed** (what was actually said/seen, sourced + dated) vs.
**Interpretation** (what TestPass concludes from it). Keep these separate — see
docs/GROWTH_OS.md §3.

## 1. Used-camera checklist overwhelm
- Observed: r/AskPhotography, Feb 2026 thread — buyers ask "what do you check when buying a
  used camera" / "what's important vs overkill when buying secondhand," describing generic
  15-point checklists that don't say what's actually load-bearing.
- Interpretation: signal-vs-noise gap; TestPass's zoom-motor/lens/sensor focus (per
  `src/lib/primitives.ts`) directly answers it. Mapped to QUERY_UNIVERSE Cluster 1, published as
  `content/blog/what-to-actually-check-before-buying-a-used-camera.md`.

## 2. Handheld analog-stick drift, shipped purchase
- Observed: r/ROGAlly — two real threads: "How to evaluate used ROGAlly" (~Jul 2026, 9 votes/8
  comments) and "Major stick drift og ally" (~Jun 2026, real repair discussion in comments).
  QUERY_UNIVERSE.md Cluster 2 originally cited this source as "two threads (Nov/Dec 2026 per
  brief)" — a date that postdated both its own creation date and the day it was written, so it
  could not have been a real citation. Corrected 2026-09-06 with the two verified threads above
  (URLs in QUERY_UNIVERSE.md). The underlying product mechanism (Switch/Steam Deck/ROG Ally
  calibration-screen primitive) was independently confirmed in `src/lib/primitives.ts` the whole
  time — only the citation date was wrong, not the pain pattern itself.
- Interpretation: mapped to Cluster 2, published as
  `content/blog/check-stick-drift-before-buying-used-switch-steam-deck-rog-ally.md`.

## 3. Console-level ban/restriction risk before paying
- Observed: r/ps5india, Aug 2026 thread — buyers ask what to check before buying a used PS5;
  pain is that a blocklist/ban risk is invisible until after sign-in, which is typically after
  payment in a shipped transaction.
- Interpretation: real risk, but TestPass's PS5/Xbox categories are EXPERIMENTAL with an
  evaluator association ceiling of MODERATE — content must say "risk," never "proof" or
  "guarantee." Mapped to Cluster 4, published as
  `content/blog/buying-used-ps5-xbox-check-console-ban-risk.md`.

## 4. "Seller says it works" / trust in an unverified claim
- Observed: pattern-inferred from general marketplace-trust discussion, per QUERY_UNIVERSE.md
  Cluster 3 — not yet tied to one specific dated citation, flagged there as lower-confidence.
- Interpretation: still TestPass's core product thesis (the seller's claim isn't evidence);
  published as a standalone trust framework rather than leaning on a single thread. Mapped to
  Cluster 3, `content/blog/seller-says-it-works-how-to-verify.md`.

## 5. Marketplace meetup vs. shipped purchase
- Observed: general marketplace-safety search pattern, per QUERY_UNIVERSE.md Cluster 5 — no
  single dated citation on file.
- Interpretation: genuine content opportunity, but explicitly not TestPass's primary served
  segment (a meetup already lets a buyer inspect in person) — published article says this
  honestly rather than force-fitting a pitch. Mapped to
  `content/blog/buying-used-electronics-locally-meetup-vs-shipped.md`.

## 6. DJI drone account-binding / activation lock
- Observed: policy facts (June 19, 2025 effective date; DJI requires the original account
  holder's consent to unbind; scope covers Mini/Air/Mavic/enterprise plus Osmo devices)
  corroborated across dronedj.com and notebookcheck.net. Real buyer pain and the ~40m geofence
  detail sourced from two live mavicpilots.com community threads — a dedicated drone forum, not
  a confirmed-fresh Reddit thread; Reddit-specific corroboration was not available the day this
  was drafted and should be attempted in a future live-session run.
- Interpretation: matches the existing "Account-binding (activation lock)" failure mode already
  listed for DJI in `src/lib/primitives.ts`. Mapped to QUERY_UNIVERSE Cluster 6, published as
  `content/blog/buying-used-dji-drone-check-account-binding.md`.

## 7. Open gap — GoPro / NAS / 3D printer / projector (2026-09-06 research pass, inconclusive)
- Observed: a 2026-09-06 web search for pre-purchase buyer/seller pain language on these four
  categories (GoPro won't power on/charge, NAS drive health, 3D printer mechanical condition,
  projector dead pixels/lamp hours) returned almost entirely commercial listings (eBay,
  Adorama, Slickdeals) and generic troubleshooting/enthusiast-forum threads — nothing with the
  specificity or clear buyer-pain framing of entries 1-3 above. `site:reddit.com` queries
  returned no reddit.com results at all in that unattended session, which may be a search-tool
  limitation rather than an absence of real discussion — worth re-checking by browsing r/gopro,
  r/synology, r/DataHoarder, r/3Dprinting, and r/projectors directly in a live session.
- Interpretation: not promoted to a QUERY_UNIVERSE cluster — no manufactured evidence. Matches
  the existing "Research backlog (not yet clustered)" note in QUERY_UNIVERSE.md. Worth another
  pass rather than a conclusion either way.
