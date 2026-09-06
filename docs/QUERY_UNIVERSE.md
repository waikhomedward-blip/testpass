---
name: QUERY_UNIVERSE
description: Living research ledger of real buyer/seller queries and pain language, clustered by intent, scored for priority, and mapped to content — the internal "query universe" from the zero-budget distribution brief (Sept 2026). This is research data, not a publishing queue; a row becomes a URL only when it earns one.
sources: cowork
---

# TestPass Query Universe

Purpose: see every meaningful way the "will this used device actually work" problem gets
expressed, cluster it by real intent, and make sure each cluster maps to the smallest number
of genuinely strong TestPass pages — never one page per keyword. See
`docs/BETA_RUNBOOK.md`/`docs/LAUNCH_STATE.md` for product state and Section 15 of the
distribution brief for the full operating instructions this file supports.

**Fields per row:** raw query/phrase examples · normalized cluster · category · intent ·
funnel stage · source(s) · pain paraphrase · recurrence (qualitative until Search Console has
data) · TestPass fit · priority score (/100) · status · mapped content · notes.

**Priority formula (100 pts):** pain recurrence/severity 20 · TestPass fit 20 · unique evidence
advantage 20 · transaction proximity 15 · search signal 10 · SERP/content gap 10 ·
freshness 5 · minus up to 20 for cannibalization/thinness/weak sourcing/policy risk.
**Status values:** researching / drafting / gate-failed (see reason) / ready-to-publish /
published / needs-update.

## Cluster 1 — "What to check before buying used [device]" (general checklist anxiety)

- Raw examples: "what do you check when buying a used camera", "used camera checklist",
-   "what's important vs overkill when buying secondhand"
-   - Category: camera (digicam), generalizable pattern for every category
    - - Intent: pre-purchase reassurance / checklist — buyer feels overwhelmed by generic advice
      - - Funnel stage: awareness → consideration
        - - Source: r/AskPhotography, Feb 2026 thread ("what do you people check when buying a used...")
          - - Pain paraphrase: beginner buyer doesn't know what's actually load-bearing vs. nice-to-know
            - - TestPass fit: strong — TestPass's whole pitch is "the shortest practical test," i.e. cutting
              -   a long checklist down to the one thing that matters (zoom motor / sensor for digicams)
              -   - Unique evidence advantage: TestPass's own primitive design docs (`src/lib/primitives.ts`)
                  -   distinguish signal from noise per category — genuinely original framing, not a rehash
                  -   - Priority: 78/100 — high pain recurrence, strong fit, real content gap (most guides list 15
                      -   generic checks; almost none say "here's the one that actually predicts failure")
                      -   - Status: researching
                          - - Mapped content: cornerstone "used camera buying checklist" guide (not yet drafted)
                           
                            - ## Cluster 2 — "How to test used [handheld] before buying / stick drift"
                           
                            - - Raw examples: "how to evaluate used ROG Ally", "what and how to check buying a used ROG
                              -   Ally", "steam deck thumbstick drift used", "switch joycon drift check before buying"
                              -   - Category: rogally, steamdeck, switch (same failure mode, three product lines)
                                  - - Intent: verification of the single most common, most expensive-to-discover-later failure
                                    -   (analog stick drift) before paying
                                    -   - Funnel stage: consideration → decision (often already has a specific listing in mind)
                                        - - Source: r/ROGAlly — corrected 2026-09-06 (see Update log; the citation previously here was
                                          -   dated Nov/Dec 2026, which cannot be real and was never independently verified). Verified real
                                          -     threads: "How to evaluate used ROGAlly" (~Jul 2026, 9 votes/8 comments,
                                          -   https://www.reddit.com/r/ROGAlly/comments/1un3zzk/how_to_evaluate_used_rogally/ — title is a
                                          -     near-exact match for this cluster's own raw query example) and "Major stick drift og ally"
                                          -   (~Jun 2026, https://www.reddit.com/r/ROGAlly/comments/1u7lf8n/major_stick_drift_og_ally/ — a
                                          -     used-purchase stick-drift complaint with real repair discussion in comments); Nintendo Switch
                                          -   is TestPass's own MODEL-DEPENDENT category with the identical calibration-screen primitive
                                          -   - Pain paraphrase: buyer knows drift is the risk but doesn't know how to provoke/see it before
                                              -   handing over money, especially for a shipped (not meetup) purchase
                                              -   - TestPass fit: excellent — this is a live, MODEL-DEPENDENT/primary primitive for all three
                                                  -   categories (built-in calibration screen, Level 5 guided capture)
                                                  -   - Unique evidence advantage: TestPass can point to its own exact seller-side steps (System
                                                      -   Settings → Controllers and Sensors → Test Input Devices, etc.) as the real procedure, not
                                                      -     paraphrased forum advice
                                                      - - Priority: 86/100 — highest transaction proximity of any cluster (people posting are actively
                                                        -   mid-purchase), strong TestPass fit, genuine content gap (forum answers are inconsistent)
                                                        -   - Status: researching
                                                            - - Mapped content: cornerstone "stick drift" guide covering all three handhelds/consoles, one
                                                              -   page, cross-linked — do not split into three near-duplicate pages (cannibalization risk)
                                                             
                                                              -   ## Cluster 3 — "Seller says it works, how do I verify" / proof vs. claim
                                                             
                                                              -   - Raw examples: "seller says it works how to verify", "video proof vs real testing used
                                                                  -   device", "can I trust a used [device] listing"
                                                                  -   - Category: cross-category (the core TestPass thesis)
                                                                      - - Intent: trust/verification — buyer explicitly distrusts seller's unverified claim
                                                                        - - Funnel stage: consideration, sometimes pre-listing (browsing before committing to any item)
                                                                          - - Source: pattern inferred from general marketplace-trust discussion; not yet a specific
                                                                            -   Search Console/Reddit citation — flag as lower-confidence until corroborated
                                                                            -   - TestPass fit: perfect — this is the literal product thesis ("the seller says it works")
                                                                                - - Unique evidence advantage: TestPass is itself the answer, not just content about the problem
                                                                                  - - Priority: 74/100 — capped below Cluster 2 until corroborating search/community evidence
                                                                                    -   exists (SERP/content-gap and search-signal points withheld pending evidence)
                                                                                    -   - Status: researching
                                                                                        - - Mapped content: "checklist vs evidence" explainer (brief's content family #6) — do not launch
                                                                                          -   with pure product pitch; must be genuinely useful independent of TestPass
                                                                                         
                                                                                          -   ## Cluster 4 — Console online-access / ban risk before buying (PS5, Xbox, Switch)
                                                                                         
                                                                                          -   - Raw examples: "used PS5 what to check before buying", "buying used Xbox account banned risk",
                                                                                              -   "console banned check before purchase"
                                                                                              -   - Category: ps5 (experimental), xbox (experimental)
                                                                                                  - - Intent: risk-avoidance — a console-level block is invisible until you're already signed in,
                                                                                                    -   which is after paying in most shipped transactions
                                                                                                    -   - Funnel stage: decision — often the last worry before paying
                                                                                                        - - Source: r/ps5india, Aug 2026 thread ("things to check and look for before buying a used...")
                                                                                                          - - Pain paraphrase: buyer has no way to check a blocklist/ban risk before money changes hands
                                                                                                            - - TestPass fit: strong but must stay honest — both categories are labeled EXPERIMENTAL and the
                                                                                                              -   evaluator prompts cap association at MODERATE; content must not overclaim what a two-photo
                                                                                                              -     challenge can prove
                                                                                                              - - Priority: 68/100 — real pain and fit, but penalized slightly for evidence/trust risk (must be
                                                                                                                -   written very carefully to match the product's own honest capability labels)
                                                                                                                -   - Status: researching
                                                                                                                    - - Mapped content: "console ban-risk check" explainer, PS5 + Xbox together, explicit about
                                                                                                                      -   EXPERIMENTAL status and what MODERATE association actually means for a buyer
                                                                                                                     
                                                                                                                      -   ## Cluster 5 — Marketplace meetup vs. shipped-purchase guidance
                                                                                                                     
                                                                                                                      -   - Raw examples: "buying on Facebook Marketplace what to check", "questions to ask seller before
                                                                                                                          -   meeting up", "is it safe to buy electronics from Facebook Marketplace"
                                                                                                                          -   - Category: cross-category, but explicitly the segment TestPass does NOT primarily serve (the
                                                                                                                              -   homepage itself says: "Bought locally instead of shipped? ... TestPass is built first for
                                                                                                                              -     shipped, pay-before-inspection purchases")
                                                                                                                              - - Intent: general marketplace safety, often for a local/meetup transaction
                                                                                                                                -   TestPass isn't optimized for
                                                                                                                                -   - TestPass fit: weak-to-moderate — genuine content opportunity (marketplace meetup guide, brief
                                                                                                                                    -   content family #4) but must be honest that meetups let you inspect in person, and gently
                                                                                                                                    -     route shipped/pay-first scenarios to TestPass rather than force-fit every visitor
                                                                                                                                    - - Priority: 41/100 — real search volume likely, but capped hard on TestPass fit per the
                                                                                                                                      -   priority formula; do not inflate by pretending TestPass serves meetups equally well
                                                                                                                                      -   - Status: researching
                                                                                                                                          - - Mapped content: none yet — lower priority than Clusters 1-4
                                                                                                                                           
                                                                                                                                            - ## Cluster 6 — DJI drone account-binding / activation lock on a used drone
                                                                                                                                           
                                                                                                                                            - - Raw examples: "used DJI drone still bound to previous owner", "how to unbind a used DJI
                                                                                                                                              -   drone", "is my used DJI drone activation locked"
                                                                                                                                              -   - Category: dji (experimental)
                                                                                                                                                  - - Intent: risk-avoidance — a used drone can be nearly unusable (geofenced to ~40m, blocked
                                                                                                                                                    -   firmware/camera features) if the previous owner's account is never unbound, and DJI generally
                                                                                                                                                    -     won't fix this for a new buyer after the fact
                                                                                                                                                    - - Funnel stage: decision — often discovered only after the buyer has already paid and tried to
                                                                                                                                                      -   fly the drone
                                                                                                                                                      -   - Source: proposed 2026-09-06 by the automated content pipeline run. Policy facts (June 19,
                                                                                                                                                          -   2025 effective date; DJI requires the original account holder's consent to unbind; scope
                                                                                                                                                          -     covers Mini/Air/Mavic/enterprise plus Osmo devices) corroborated across dronedj.com
                                                                                                                                                          -   (https://dronedj.com/2025/06/12/dji-second-hand-used-drone/ and
                                                                                                                                                          -     https://dronedj.com/2025/06/14/how-to-rebind-dji-drone/) and notebookcheck.net
                                                                                                                                                          -   (https://www.notebookcheck.net/DJI-New-changes-could-render-freshly-purchased-drones-and-cameras-unusable-if-buyers-are-not-careful.1036617.0.html).
                                                                                                                                                          -     Real buyer pain and the ~40m geofence detail sourced from two live mavicpilots.com threads
                                                                                                                                                          -   (https://mavicpilots.com/threads/if-you-bought-a-used-dji-drone-and-it-is-still-bound-to-the-previous-owner-this-might-help%E2%80%A6.133890/
                                                                                                                                                          -     and
                                                                                                                                                          -   https://mavicpilots.com/threads/dji-refuses-to-unbind-pre-owned-mini-3-pro-%E2%80%93-despite-legal-purchase-and-repair.152061/)
                                                                                                                                                          -     — a dedicated drone forum, not a confirmed-fresh Reddit thread; Reddit-specific corroboration
                                                                                                                                                          -   was not available the day this cluster was proposed (see BETA_LEARNINGS.md digest,
                                                                                                                                                          -     2026-09-06) and should be attempted in a future live-session run.
                                                                                                                                                          - - Pain paraphrase: buyer discovers, only after paying, that the drone is still tied to a
                                                                                                                                                            -   stranger's DJI account and can't be fully unlocked without that stranger's cooperation
                                                                                                                                                            -   - TestPass fit: strong — matches the existing "Account-binding (activation lock)" failure mode
                                                                                                                                                                -   already listed for DJI in `src/lib/primitives.ts`
                                                                                                                                                                -   - Unique evidence advantage: TestPass's DJI category already has the seller screenshot the
                                                                                                                                                                    -   app's own aircraft-status/battery screens as a guided pre-purchase step
                                                                                                                                                                    -   - Priority: 85/100 (recurrence/severity 17/20, TestPass fit 19/20, unique evidence advantage
                                                                                                                                                                        -   18/20, transaction proximity 12/15, search signal 6/10, SERP/content gap 8/10, freshness 5/5,
                                                                                                                                                                        -     0 penalties) — search signal capped since no Search Console data exists yet to confirm true
                                                                                                                                                                        -   search volume
                                                                                                                                                                        -   - Status: drafting (draft article committed 2026-09-06,
                                                                                                                                                                            -   `content/blog/buying-used-dji-drone-check-account-binding.md`, GREATS 29/30 — pending
                                                                                                                                                                            -     founder approval before `status: published`)
                                                                                                                                                                            - - Mapped content: "used DJI drone account-binding check" explainer
                                                                                                                                                                             
                                                                                                                                                                              - ## Category failure-mode index (source: `src/lib/primitives.ts`, current as of 2026-09-05)
                                                                                                                                                                             
                                                                                                                                                                              - Ground-truth known failure modes per live TestPass category — use these, not invented ones,
                                                                                                                                                                              - when writing failure-mode explainers (content family #3):
                                                                                                                                                                             
                                                                                                                                                                              - | Category | Known failure mode TestPass targets | Capability label |
                                                                                                                                                                              - |---|---|---|
                                                                                                                                                                              - | Nintendo Switch | Analog-stick drift (Joy-Con / Pro Controller) | MODEL-DEPENDENT |
                                                                                                                                                                              - | GoPro | Won't power on / won't hold charge / won't write to storage | EXPERIMENTAL |
                                                                                                                                                                              - | DJI Drone | Account-binding (activation lock), hidden battery wear, unresolved flight warnings | EXPERIMENTAL |
                                                                                                                                                                              - | Digicam | Zoom motor failure, stuck/loose lens, sensor defects | EXPERIMENTAL |
                                                                                                                                                                              - | PlayStation 5 | Console-level restriction blocking PlayStation online access | EXPERIMENTAL |
                                                                                                                                                                              - | Epson Photo Printer | Clogged/dead print-head nozzles from disuse | EXPERIMENTAL |
                                                                                                                                                                              - | Xbox Series X/S | Console-level enforcement blocking Xbox network/Store access | EXPERIMENTAL |
                                                                                                                                                                              - | Steam Deck | Thumbstick drift | MODEL-DEPENDENT |
                                                                                                                                                                              - | Meta Quest | Remote block via Meta's return-fraud enforcement | EXPERIMENTAL |
                                                                                                                                                                              - | Synology NAS | Silent drive failure/degradation inside the enclosure | EXPERIMENTAL |
                                                                                                                                                                              - | 3D Printer | (see primitives.ts — mechanical health via live Selftest) | EXPERIMENTAL |
                                                                                                                                                                              - | Projector | Dead pixels & panel defects | EXPERIMENTAL |
                                                                                                                                                                              - | ROG Ally | Stick & trigger drift | MODEL-DEPENDENT |
                                                                                                                                                                             
                                                                                                                                                                              - Never state a capability more strongly in content than the category's own `capabilityLabel`
                                                                                                                                                                              - and evaluator-prompt association ceiling (e.g. never call a PS5/Xbox check "proof of no ban" —
                                                                                                                                                                              - the product's own prompts cap this at MODERATE and use the word "risk," not "guarantee").
                                                                                                                                                                             
                                                                                                                                                                              - ## Research backlog (not yet clustered)
                                                                                                                                                                             
                                                                                                                                                                              - - Component-level queries not yet covered: "GoPro won't turn on used", "NAS drive health check
                                                                                                                                                                                -   before buying", "3D printer used what to check", "projector dead pixels check before buying"
                                                                                                                                                                                -     — likely fold into existing category clusters once drafted rather than becoming new clusters.
                                                                                                                                                                                - - Nintendo Switch 2 error code 2124-4508 (anti-piracy/MiG flash-cart detection, permanently
                                                                                                                                                                                  -   blocks online features, Nintendo currently can't lift it) — surfaced 2026-09-06, plausible
                                                                                                                                                                                  -     future cluster in the same family as Cluster 4, specific to Switch 2. Not yet clustered.
                                                                                                                                                                                  - - Needs Search Console data once available: nothing published yet, so no impression/query data
                                                                                                                                                                                    -   exists — revisit this file weekly once `/blog` has live pages.
                                                                                                                                                                                    -   - Needs Google Trends spot-check: relative interest in "stick drift" vs. "joystick drift" vs.
                                                                                                                                                                                        -   "thumbstick drift" wording, to pick the primary phrase for Cluster 2's title/H1.
                                                                                                                                                                                     
                                                                                                                                                                                        -   ## Update log
                                                                                                                                                                                     
                                                                                                                                                                                        -   - 2026-09-05 — file created; seeded from `src/lib/primitives.ts` category definitions and the
                                                                                                                                                                                            -   four Reddit threads cited in the Sept 2026 distribution brief. No Search Console or analytics
                                                                                                                                                                                            -     data folded in yet (none confirmed connected — see Phase 0 audit note in chat).
                                                                                                                                                                                            - - 2026-09-06 — corrected Cluster 2's source citation: the prior "r/ROGAlly, two threads
                                                                                                                                                                                              -   (Nov/Dec 2026)" was dated in the future and was never independently verified. Replaced with
                                                                                                                                                                                              -     two verified real threads (~Jun/Jul 2026, URLs above). Added Cluster 6 (DJI account-binding)
                                                                                                                                                                                              -   from the automated content-pipeline run; draft article committed pending founder approval.
                                                                                                                                                                                              -     Logged the Switch 2 error-2124-4508 lead to the research backlog.
