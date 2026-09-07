---
title: "Buying a Used Synology NAS? Check the Drives' Power-On Hours Before You Trust Them"
metaDescription: "A NAS enclosure can look brand new while the drives inside it are already years into their working life. Here's the exact check — Power-On Hours — and how a seller could hide it."
summary: "The enclosure tells you nothing about the drives inside it. Here's how to check a used Synology NAS's actual drive hours before you buy, and why 'like new' doesn't mean what you'd hope."
author: "TestPass"
datePublished: "2026-09-07"
category: "buying-guides"
device: "Synology NAS"
contentType: "explainer"
targetIntent: "verification"
primaryQuery: "how to check used NAS hard drives before buying"
supportingQueries:
  - "synology used drive power on hours"
  - "how to tell if a hard drive is really new"
  - "buying used NAS what to check"
tags: ["nas", "synology", "buying-guide", "hard-drive"]
status: "published"
sourceNotes: "Cluster 7 in docs/QUERY_UNIVERSE.md (new, proposed and drafted 2026-09-07). Real buyer pain and acceptable-hours discussion sourced from a Tom's Hardware Forum thread, 'Thinking of buying a used HDD. Are these S.M.A.R.T. values within reason?' (https://forums.tomshardware.com/threads/thinking-of-buying-a-used-hdd-are-these-s-m-a-r-t-values-within-reason.3633149/) — a genuine used-2TB-Hitachi-drive purchase question with real replies citing a ~40,000-60,000 hour typical HDD lifespan and recommending CrystalDiskInfo's Good/Caution/Bad health read. DSM navigation steps (Storage Manager → HDD/SSD → Health tab → View SMART Info → Power-On Hours) corroborated against ewall.store's Synology DSM guide (https://www.ewall.store/gb/blog/storage/how-to-check-hard-drive-usage-time-in-synology-dsm) and How-To Geek's general S.M.A.R.T. explainer (https://www.howtogeek.com/134735/check-ssd-or-hdd-health-with-smart/). 'A drive's hours can be misread if SMART was reset' caveat cross-checked against NAS Compares' used-drive-fraud guide (https://nascompares.com/answer/how-to-check-if-your-hard-drive-is-new-or-used-full-guide-for-windows-mac-linux-seagate-hdd-fraud-check/). TestPass's own NAS test mechanics (DSM Storage Manager screenshot, Healthy/Warning/Critical, EXPERIMENTAL label, MODERATE association ceiling) taken directly from src/lib/primitives.ts."
ctaTarget: "/"
---

A used Synology NAS is one of the easier things to get fooled by, because the part that actually wears out is invisible from the outside. The enclosure can be spotless, the listing can say "barely used," and the drives sitting inside it can already be three or four years into their working life — because in most home setups, the drives outlive several enclosures, get moved between them, or get sold as a bundle without anyone checking what's actually on the clock.

## The one number that tells you the truth: Power-On Hours

Every hard drive tracks its own total running time in a S.M.A.R.T. attribute called Power-On Hours, and it can't be reset by normal use — only by a full firmware-level wipe, which most sellers never do. A drive genuinely fresh out of the box reads at or near zero hours. A drive that's been running continuously in a NAS for two years reads in the range of 15,000-18,000 hours.

That number is also the one piece of real-world data buyers actually use to sanity-check a used drive. In one representative case, a buyer weighing a used 2TB drive found it showing 46,471 power-on hours — replies in the thread pointed out that a typical hard drive's working life runs somewhere around 40,000 to 60,000 hours, meaning that drive was plausibly nearer the end of its life than the middle, whatever the listing said about condition. Nobody in that conversation was accusing the seller of lying — the point was simpler: the hours are checkable, so check them instead of trusting the description.

## How to actually check it on a Synology NAS

If the seller can log into the NAS (in person, on a call, or by sending you a screenshot), the drive hours are two clicks away:

1. Open **Storage Manager** in DSM.
2. Click **HDD/SSD** in the left-hand menu and select the drive.
3. Open the **Health** tab and click **View SMART Info**.
4. Read **Power-On Hours** — DSM lists it directly, no separate software needed.

If you want a plain-language health read rather than the raw hours, DSM's own Storage Manager also gives each drive a **Healthy / Warning / Critical** status on that same screen — that label is Synology's own judgment call, not a guess, so there's no reason to second-guess a "Healthy" reading or invent a concern DSM itself hasn't flagged.

## The honest caveat: hours can be reset

A full low-level firmware wipe can zero out a drive's power-on-hours counter, which is exactly why a suspiciously low number on a drive that's clearly not new (dusty, scratched, an old model) is its own red flag, not automatically reassuring. Power-On Hours is strong evidence when it's high — that's real, unfakeable usage — but a low reading only helps if the rest of the story (the drive's visible condition, the enclosure's history, how the seller describes it) actually lines up with "genuinely fresh."

## Where TestPass fits

This is exactly the gap TestPass's NAS check is built for: instead of taking a seller's word for "barely used," the seller logs into their own DSM, renames the server to a one-time code TestPass generates, and screenshots the Storage Manager drive-health page showing that live code next to every drive's Healthy/Warning/Critical status — so you're not just seeing a number, you're seeing that it came from this NAS, right now, not an old screenshot. This is labeled EXPERIMENTAL and capped at MODERATE association strength in TestPass's own evaluator, on purpose: it confirms what DSM itself reports, it doesn't independently audit the enclosure's fans, power supply, or network ports, and it isn't a substitute for asking the seller directly for the Power-On Hours reading above if you want the raw number rather than DSM's summary label.
