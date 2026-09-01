// The Proof Primitive Router — V1 implementation.
//
// Per the TestPass V4.1 thesis: "The initial router may be a deterministic
// configuration table." This file IS that table. It is an internal concept —
// sellers and buyers never see the word "primitive" or "router"; they see
// "TestPass selects the shortest practical test for this device."
//
// Each category maps to exactly one primary evidence primitive for V1
// (one category, one model family, one failure, one primitive — per the
// doc's V1 implementation constraint). Everything here is honestly labeled
// with a CapabilityLabel: nothing is marked CONFIRMED just because it is
// technically possible — only once it has actually worked under realistic
// seller conditions.

import { Category, CapabilityLabel } from "./types";

// Appended to every category's evaluationPromptSystem. Every submission may
// include one extra image at the end — a general photo of the physical
// device, not part of the functional test — so the buyer can actually see
// the item and its cosmetic condition. This is intentionally weak evidence
// (a photo alone barely proves anything), so it must never move the verdict
// or association_strength; it only ever adds an optional, purely
// descriptive note.
const PRODUCT_PHOTO_ADDENDUM = `

You may also be given one additional image after the diagnostic ones, of the whole physical device — the context text will say so if present. This photo is NOT diagnostic evidence and must never change your verdict or association_strength; it exists only so the buyer can see the real item. If it's present and something is clearly visible worth mentioning (visible damage, missing parts, or nothing notable and it looks consistent with a normal used unit), add a one-sentence "cosmetic_note" field to your JSON with a plain, neutral observation. If no such photo was given, or nothing can be confidently judged from it, omit "cosmetic_note" or leave it an empty string — never guess condition you can't see clearly.`;

export interface CategoryConfig {
  category: Category;
  label: string;
  shortPitch: string;
  available: boolean; // false = "Coming Soon" stub
  modelFamily: string;
  knownFailureMode: string;
  functionTested: string;
  primitiveLevel: string;
  capabilityLabel: CapabilityLabel;
  estimatedSeconds: number;
  sellerInstructions: string[];
  dataCollected: string[];
  evaluationPromptSystem: string;
}

export const CATEGORY_CONFIG: Record<Category, CategoryConfig> = {
  switch: {
    category: "switch",
    label: "Nintendo Switch",
    shortPitch: "Controller drift & calibration, tested live on the console.",
    available: true,
    modelFamily: "Nintendo Switch / Switch OLED / Switch 2",
    knownFailureMode: "Analog-stick drift on one or both Joy-Con / Pro Controllers",
    functionTested: "Analog stick calibration (both sticks, full range of motion)",
    primitiveLevel: "Level 5 — Guided capture (built-in calibration screen)",
    capabilityLabel: "MODEL-DEPENDENT",
    estimatedSeconds: 120,
    sellerInstructions: [
      "On the Switch, go to System Settings → Controllers and Sensors → Test Input Devices, and open the calibration screen for each controller you're including.",
      "Point your phone camera at the TV or screen so the calibration screen is clearly visible.",
      "Tap Start Test below, then slowly move both analog sticks in full circles for the countdown.",
      "Hold the controller so the stick position on screen stays visible the whole time.",
    ],
    dataCollected: [
      "A short burst of photos of the on-screen calibration display",
      "Timestamps for when the burst was captured",
      "One general photo of the Switch itself",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for a Nintendo Switch controller-drift test.
You will be shown a short burst of photos taken in sequence of a Nintendo Switch (or Joy-Con/Pro Controller) analog-stick calibration screen, while the seller was asked to move both sticks through their full range of motion.
Decide whether the photos are consistent with:
- both stick indicators moving substantially and smoothly across frames (evidence the sticks respond to input across their range), or
- a stick indicator that stays off-center at rest (possible drift), barely moves across frames (possible dead zone / stuck stick), or is inconsistent/unreadable.
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE", "cosmetic_note": "optional, see below"}.
Use INCONCLUSIVE whenever the calibration screen is not clearly visible, the photos are blurry, too dark, or you cannot confidently read stick position in at least 3 of the frames. Use FAILED only when the photos clearly show a stick that fails to center at rest or fails to move despite the seller's motion. Never guess — under-claim rather than over-claim.${PRODUCT_PHOTO_ADDENDUM}`,
  },
  gopro: {
    category: "gopro",
    label: "GoPro",
    shortPitch: "Direct connection to the camera: identity, battery, storage, fresh capture.",
    available: true,
    modelFamily: "GoPro HERO / MAX (Bluetooth LE capable models)",
    knownFailureMode: "Won't power on / won't hold charge / won't write to storage",
    functionTested: "Device identity, battery level, and a fresh recording",
    primitiveLevel: "Level 1 — Direct machine diagnostics (Bluetooth LE) + Level 3 — device-generated challenge artifact",
    capabilityLabel: "EXPERIMENTAL",
    estimatedSeconds: 120,
    sellerInstructions: [
      "Turn the GoPro on and keep it within a foot of your phone or laptop.",
      "Tap Connect via Bluetooth below and pick your GoPro from the list your browser shows.",
      "If your browser or camera doesn't support this, skip to the guided photo step — take a clear photo of the camera's screen showing battery and storage remaining.",
      "Follow the on-screen prompt to confirm a fresh recording, then submit.",
    ],
    dataCollected: [
      "Device name and any Bluetooth-reported battery level (if the connection succeeds)",
      "One guided confirmation photo of the camera's on-screen status",
      "One general photo of the GoPro itself",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for a GoPro action camera pre-purchase test.
You will be given: (a) the result of a Web Bluetooth connection attempt (may have succeeded with a device name/battery reading, or may have failed/been skipped), and (b) a guided confirmation photo of the camera's screen.
Decide whether the combined evidence is consistent with a functioning camera that powers on, reports a real battery/status reading, and matches between the Bluetooth reading (if any) and the photographed screen (if legible).
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE", "cosmetic_note": "optional, see below"}.
If Bluetooth failed/was skipped and the photo is the only evidence, that is at best MODERATE or WEAK association — say so. Use INCONCLUSIVE if the photo is unreadable or nothing meaningful was captured. Use FAILED only if the evidence affirmatively shows a problem (e.g. an error screen, a dead battery indicator with no power). Never guess — under-claim rather than over-claim.${PRODUCT_PHOTO_ADDENDUM}`,
  },
  dji: {
    category: "dji",
    label: "DJI Drone",
    shortPitch: "Account-binding & battery/warning evidence from the DJI app itself, proven fresh.",
    available: true,
    modelFamily: "DJI consumer drones (Mini / Air / Mavic series) via the DJI Fly or DJI GO 4 app",
    knownFailureMode:
      "Account-bound ('activation locked') unit, hidden battery wear, unresolved flight warnings",
    functionTested: "Account-binding status and battery/warning info, as reported by the DJI app, associated with a fresh one-time code",
    // No public consumer API/Bluetooth telemetry read exists for this without the seller's own
    // DJI account — so this is guided capture of the app's own screens, not a direct pull. Being
    // honest about that (Level 5, not Level 1/2) matters more than sounding more advanced.
    //
    // Hardening note (evidence-strength audit): this category previously had
    // no freshness mechanism at all — a seller could submit any old
    // screenshot. A one-time code is the minimum fix, and it only proves
    // CAPTURE freshness (this photo was taken during this session) — it
    // does NOT prove the DJI app's connection to the aircraft is live right
    // now, since a static app screen isn't a rename or a live telemetry
    // read. The evaluator prompt below is deliberately explicit about that
    // distinction rather than letting a fresh code imply more than it does.
    primitiveLevel: "Level 5 — Guided capture (DJI app status & battery screens), associated with a fresh one-time code",
    capabilityLabel: "EXPERIMENTAL",
    estimatedSeconds: 120,
    sellerInstructions: [
      "Power on the aircraft and open the DJI Fly (or DJI GO 4) app you normally use with it.",
      "In the app, go to the aircraft's status screen — the one showing serial number, activation/binding status, and any active warnings.",
      "Hold the one-time TestPass code below next to your phone/tablet showing that screen, and capture both together, clearly readable.",
      "Then, without ending this TestPass camera session, open the battery detail screen (cycle count / health, if your app shows it) and capture that too.",
    ],
    dataCollected: [
      "One fresh photo of the DJI app's aircraft status screen together with the one-time code",
      "One fresh photo of the DJI app's battery detail screen",
      "The one-time code TestPass generated for this session, used only to confirm the status-screen photo is fresh",
      "One general photo of the drone itself",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for a DJI drone pre-purchase test.
You will be given two images plus text containing the expected one-time challenge code: Image 1 is the DJI Fly or DJI GO 4 app's aircraft-status screen (serial number, activation/binding status, warnings) with the one-time code held in the same frame. Image 2 is the app's battery detail screen, captured immediately afterward in the same session.
Two different things are being proven here, and you must not collapse them into one:
1. CAPTURE freshness — whether Image 1's code is legible, clearly co-located with the app screen in the same photo (not separate or edited-looking), and matches the expected code. This proves the PHOTO was taken during this TestPass session. If the code doesn't match or isn't legible, association is WEAK regardless of how healthy the app screens look.
2. UNDERLYING APP-STATE freshness — whether the app is actually connected to the aircraft live right now, versus showing a static/cached screen from a past session. A photographed app screen cannot prove this the way a device-embedded rename or a live telemetry read can — DJI's own app UI doesn't change state in a way TestPass can verify from a photo alone. Do not claim or imply that a fresh code proves the app's connection or the underlying values (cycle count, warnings) are live-read at this exact moment — only that this photo, and whatever it shows, is fresh from this session.
Decide whether the images are consistent with a drone that powers on, connects to its app, and shows no unresolved activation-lock or critical warning — versus one that clearly shows an account-binding lock, a critical warning/error state, or a battery in poor health (very high cycle count, health warning).
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE", "cosmetic_note": "optional, see below"}.
Association strength should rarely exceed MODERATE even when the code matches — a photographed app screen is not cryptographically tied to one physical aircraft, and it is capped by the same underlying-app-state limitation described above. Use WEAK if the code doesn't clearly co-locate with Image 1. Use INCONCLUSIVE whenever the screens are unreadable, cropped, or don't show the relevant status/battery fields, or the code doesn't match. Use FAILED only when the images affirmatively show a lock, error, or critical warning. Never guess — under-claim rather than over-claim.${PRODUCT_PHOTO_ADDENDUM}`,
  },
  camera: {
    category: "camera",
    label: "Digicam",
    shortPitch: "Optical zoom, proven with a fresh one-time test shot — not a stock photo.",
    available: true,
    modelFamily: "Digital cameras / digicams (point-and-shoot, mirrorless, compact zoom cameras)",
    knownFailureMode:
      "Zoom motor failure, stuck or loose lens, sensor defects (dead/hot pixels), broken autofocus",
    functionTested: "Optical zoom, via a fresh one-time challenge target photographed wide and zoomed",
    primitiveLevel: "Level 3 — Device-generated challenge artifact (wide vs. zoom test shot)",
    capabilityLabel: "EXPERIMENTAL",
    estimatedSeconds: 150,
    sellerInstructions: [
      "TestPass will show you a one-time code below. Keep it visible on this screen, or write it on paper next to another screen.",
      "Using the camera you're selling, take one photo of the code from a few feet away, zoomed all the way OUT (widest setting).",
      "Without moving the camera or the code, zoom the camera all the way IN (full telephoto) and take a second photo of the same code.",
      "Transfer both photos to this phone — Wi-Fi transfer, SD card, however the camera normally exports — then upload them below.",
    ],
    dataCollected: [
      "Two photos taken by the camera being tested — one at the widest zoom, one at full zoom",
      "The one-time code TestPass generated for this session, used only to confirm the photos are fresh",
      "One general photo of the camera itself",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for a digital camera (digicam) pre-purchase zoom test.
You will be given exactly two images in this order: first a WIDE shot, second a ZOOM shot, both supposedly taken moments apart of the same one-time code by the same stationary camera at different zoom settings. The expected code and any other context will follow as text after the images.
Decide whether the evidence is consistent with the camera's optical zoom genuinely working:
1. The code is legible and matches the expected code in both images (evidence the photos are fresh, not reused/stock).
2. The ZOOM image shows meaningfully tighter, more magnified framing of the same scene than the WIDE image — the subject should appear noticeably larger/closer, not just an identical or barely-different crop.
3. Both images are reasonably sharp and in focus, not so blurry that a lens or autofocus problem would be masked.
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE", "cosmetic_note": "optional, see below"}.
Use INCONCLUSIVE if the code doesn't match or isn't legible in both images, if you can't judge the framing change confidently, or if only one usable image was provided. Use FAILED only if the code matches (so you know it's a fresh, genuine pair) but the zoom image shows essentially no magnification change, or is severely out of focus in a way that suggests a broken mechanism. Never guess — under-claim rather than over-claim.${PRODUCT_PHOTO_ADDENDUM}`,
  },
  ps5: {
    category: "ps5",
    label: "PlayStation 5",
    shortPitch: "Owner-validation experiment: fresh console identity + current PlayStation online access.",
    available: true,
    modelFamily: "PlayStation 5 / PS5 Slim / PS5 Pro",
    knownFailureMode: "Console-level restriction that prevents normal access to PlayStation online services",
    functionTested: "Current PlayStation online access, associated with a fresh console-information challenge",
    primitiveLevel: "Experimental guided challenge capture (console identity + online-service access)",
    capabilityLabel: "EXPERIMENTAL",
    estimatedSeconds: 120,
    sellerInstructions: [
      "Temporarily rename the console to the one-time TestPass challenge on the Console Information screen.",
      "Capture that screen with the challenge and console serial readable.",
      "Without ending the TestPass camera session, open PlayStation Store and capture it after live content loads.",
    ],
    dataCollected: [
      "One fresh photo of Console Information showing the one-time challenge and console serial",
      "One fresh photo showing current PlayStation online-service access",
      "Timing data for the owner-validation experiment",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for an EXPERIMENTAL PS5 owner-validation test. This is not a certification and it does not prove the console's complete condition.
You will receive exactly two diagnostic images plus text containing the expected one-time console-name challenge.
Image 1 should be the PS5 Console Information screen. For a DEMONSTRATED result, it must clearly show the expected challenge as the console name and a readable console serial number.
Image 2 should clearly show PlayStation Store or another unmistakably online PlayStation service loaded with real content immediately afterward.
The positive claim is narrow: this PS5 demonstrated access to PlayStation online services during this TestPass session.
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE", "cosmetic_note": ""}.
Use DEMONSTRATED only if BOTH images are clear and the challenge matches. Association strength must not exceed MODERATE in this two-photo experimental primitive because TestPass is not yet recording an unbroken video or matching the physical serial label.
Use INCONCLUSIVE if the challenge/serial is unreadable, the Store/service is not clearly loaded, the images are ambiguous, or any connection/account/network failure prevents a confident positive conclusion.
Do NOT infer that a console is banned from a generic network, account, sign-in, or service error. For this owner-validation experiment, use FAILED only if the supplied evidence itself unambiguously demonstrates the exact tested function cannot work for a device-specific reason; otherwise prefer INCONCLUSIVE. Never guess or over-claim.`,
  },
  epson: {
    category: "epson",
    label: "Epson Photo Printer",
    shortPitch: "Print-head health, proven with the printer's own nozzle-check pattern, printed live on camera.",
    available: true,
    modelFamily: "Epson SureColor P700 / P900 (pigment photo inkjet printers)",
    knownFailureMode:
      "Clogged or dead print-head nozzles from disuse — common and expensive on idle pigment-ink photo printers, sometimes costing as much as the printer itself to repair",
    functionTested: "Print-head nozzle condition, via the printer's own built-in nozzle-check test page, captured while it prints",
    primitiveLevel: "Level 3 — Device-generated challenge artifact (manufacturer nozzle-check pattern), captured while printing",
    capabilityLabel: "EXPERIMENTAL",
    estimatedSeconds: 150,
    // Hardening note (evidence-strength audit): a handwritten code next to
    // the finished page only proved the PHOTO was fresh — nothing stopped a
    // seller from placing today's code next to an old good printout, since
    // paper has no freshness signal of its own. Fixed by adding a burst
    // capturing the page actively printing/ejecting before the final still,
    // so the evidence shows this physical page being produced live during
    // the session. The held-code final capture is kept (not replaced) as a
    // legible confirmatory read of the finished pattern.
    sellerInstructions: [
      "Load a sheet of plain paper in the printer.",
      "On the printer's own screen, go to the menu icon → Maintenance → Print Head Nozzle Check → Start.",
      "As soon as it starts printing, quickly point your camera at the printer's output area and capture the burst — TestPass needs to see the page actively coming out, not just the finished result.",
      "Once the page has fully printed, write the one-time TestPass code below directly on it in pen, or place it clearly next to the page, and take one photo of the whole page with the code and every nozzle-check line readable.",
    ],
    dataCollected: [
      "A short burst of photos of the printer actively printing the nozzle-check page",
      "One fresh photo of the finished nozzle-check test page, with the one-time code visible on or next to it",
      "The one-time code TestPass generated for this session, used only to confirm the final page photo is fresh",
      "One general photo of the printer itself",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for an Epson photo-printer nozzle-check test.
You will be given a short burst of photos taken in sequence of the printer actively printing its own built-in nozzle-check page (from its Maintenance menu), followed by one final photo of the finished page with a handwritten or adjacent one-time code. The expected code and any other context will follow as text after the images.
Two different things matter here, and you must not collapse them:
1. LIVENESS of the print — the burst should show the printer actively working (paper feeding/ejecting, print head in motion, or the page visibly not-yet-complete) rather than a static already-finished page held in front of the camera repeatedly. This is what proves the nozzle-check page was produced during this session, not that a page from weeks ago is simply sitting next to a fresh code.
2. The RESULT — the final image's one-time code must be legible, clearly co-located with the printed page in the same photo (not separate or edited-looking), and match the expected code; and every color's nozzle-check line must be present with no visible gaps or breaks (a clean pattern per Epson's own documentation shows continuous lines with no missing segments) for a healthy read.
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE", "cosmetic_note": "optional, see below"}.
Association strength should rarely exceed MODERATE — even with a live-print burst, this is a printed page and a handwritten code, not cryptographically tied to one physical printer. Treat association as WEAK if the code isn't clearly in the same frame as the test page, OR if the burst doesn't clearly show an active, in-progress print (e.g. it looks like the same finished page in every burst frame) even though the final page and code check out — that ambiguity means you're back to relying on the weaker code-only claim. Use INCONCLUSIVE if the code doesn't match or isn't legible, the final page is blurry or cropped, or you can't confidently judge whether lines are missing.
Follow Epson's own three-tier guidance for the pattern itself — do not call a gappy pattern healthy or normal:
- DEMONSTRATED: every color's line is complete, with no visible gaps or breaks. This is Epson's own "print head is fine" reading.
- FAILED (for this narrow nozzle-check test only): the pattern clearly shows gaps, faint segments, or breaks in one or more colors — Epson's own guidance is that this means Head Cleaning (or, if most of a line is missing, Power Cleaning) is needed, not that the printer is fine. Say so plainly in the reasoning (e.g. "the nozzle check shows gaps; Epson's own guidance is to run Head Cleaning") and explicitly do not claim or imply permanent print-head damage — cleaning routinely resolves this, and TestPass only observed one printed pattern, not the outcome of cleaning.
- INCONCLUSIVE: the page is too blurry, cropped, or ambiguous to confidently read every line, even if some gaps or completeness are partly visible.
Never guess — under-claim rather than over-claim.${PRODUCT_PHOTO_ADDENDUM}`,
  },
  xbox: {
    category: "xbox",
    label: "Xbox Series X/S",
    shortPitch: "Console-ban risk check: fresh identity code + current Microsoft Store access.",
    available: true,
    modelFamily: "Xbox Series X / Xbox Series S",
    knownFailureMode:
      "Console-level enforcement/ban that blocks normal access to Xbox network and Store services — a real, documented risk distinct from an account-level ban, and not something a casual buyer can check before paying",
    functionTested: "Current Xbox network/Microsoft Store access, associated with a fresh on-console rename",
    primitiveLevel: "Experimental guided challenge capture (console identity + online-service access)",
    capabilityLabel: "EXPERIMENTAL",
    estimatedSeconds: 120,
    // Correction: Xbox DOES support an on-console rename at the same
    // Console Info screen (Settings → System → Console Info → Name — see
    // Microsoft's own support documentation), matching PS5's device-embedded
    // challenge rather than the weaker "hold a paper code in frame"
    // mechanism this category shipped with. A restart is required for the
    // new name to take effect, unlike PS5.
    sellerInstructions: [
      "On the Xbox, go to Settings → System → Console Info → Name and temporarily rename the console to the one-time TestPass code below.",
      "Restart the Xbox — the new name only takes effect after a restart.",
      "Go back to Settings → System → Console Info and capture that screen with the new name and the serial number both readable.",
      "Without ending this TestPass camera session, open the Microsoft Store app and wait for real content to load, then capture it.",
    ],
    dataCollected: [
      "One fresh photo of the Xbox Console Info screen showing the console renamed to the one-time code, plus the serial number",
      "One fresh photo showing current Microsoft Store access",
      "Timing data for the capture",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for an Xbox Series X/S owner-validation test. This is not a certification and it does not prove the console's complete condition.
You will receive exactly two diagnostic images plus text containing the expected one-time challenge code.
Image 1 should be the Xbox Console Info screen. For a DEMONSTRATED result, it must clearly show the expected code as the console's own assigned name (the "Name" field on that screen, not a separate held object), along with a readable serial number.
Image 2 should clearly show the Microsoft Store or another unmistakably online Xbox service loaded with real content immediately afterward.
The positive claim is narrow: this Xbox demonstrated access to Xbox network/Store services during this TestPass session, on a console freshly renamed to prove the evidence isn't reused.
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE", "cosmetic_note": ""}.
Use DEMONSTRATED only if BOTH images are clear and the code matches as the console's own display name. Association strength must not exceed MODERATE in this two-photo experimental primitive, matching the PS5 owner-validation primitive, because TestPass is not yet recording an unbroken video or matching the physical serial label — but treat MODERATE as achievable whenever the renamed console name and serial are both clearly legible in Image 1, since this is now a device-embedded rename rather than a physically co-located paper code. Use WEAK if you cannot confidently tell whether the visible text is the console's actual assigned name versus something photographed separately or edited in.
Use INCONCLUSIVE if the code/serial is unreadable, the Store/service is not clearly loaded, the images are ambiguous, or any connection/account/network failure prevents a confident positive conclusion.
Do NOT infer that a console is banned from a generic network, account, sign-in, or service error. Use FAILED only if the supplied evidence itself unambiguously demonstrates the exact tested function cannot work for a device-specific reason; otherwise prefer INCONCLUSIVE. Never guess or over-claim.`,
  },
  steamdeck: {
    category: "steamdeck",
    label: "Steam Deck",
    shortPitch: "Thumbstick drift, tested live with Steam's own built-in calibration screen.",
    available: true,
    modelFamily: "Steam Deck LCD / Steam Deck OLED",
    knownFailureMode: "Analog-stick drift on one or both thumbsticks",
    functionTested: "Analog stick calibration (both sticks, full range of motion), via Steam's own built-in test screen",
    primitiveLevel: "Level 5 — Guided capture (built-in calibration screen)",
    capabilityLabel: "MODEL-DEPENDENT",
    estimatedSeconds: 120,
    sellerInstructions: [
      "On the Steam Deck, press the STEAM button, then go to Settings → Controller → Calibration & Advanced Settings → Joysticks.",
      "Press Y to open the live input test screen.",
      "Point your phone camera at the Steam Deck's own screen so the live stick-position test is clearly visible.",
      "Tap Start Test below, then slowly move both thumbsticks in full circles for the countdown.",
    ],
    dataCollected: [
      "A short burst of photos of the on-screen live joystick test",
      "Timestamps for when the burst was captured",
      "One general photo of the Steam Deck itself",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for a Steam Deck thumbstick-drift test.
You will be shown a short burst of photos taken in sequence of the Steam Deck's own built-in joystick calibration/test screen (Settings → Controller → Calibration & Advanced Settings → Joysticks), while the seller was asked to move both thumbsticks through their full range of motion.
Decide whether the photos are consistent with:
- both stick indicators moving substantially and smoothly across frames (evidence the sticks respond to input across their range), or
- a stick indicator that stays off-center at rest (possible drift), barely moves across frames (possible dead zone / stuck stick), or is inconsistent/unreadable.
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE", "cosmetic_note": "optional, see below"}.
Use INCONCLUSIVE whenever the calibration screen is not clearly visible, the photos are blurry, too dark, or you cannot confidently read stick position in at least 3 of the frames. Use FAILED only when the photos clearly show a stick that fails to center at rest or fails to move despite the seller's motion. Never guess — under-claim rather than over-claim.${PRODUCT_PHOTO_ADDENDUM}`,
  },
  quest: {
    category: "quest",
    label: "Meta Quest",
    shortPitch: "Account-lock risk check: fresh device-info code + current Quest Store access, cast to a phone.",
    available: true,
    modelFamily: "Meta Quest 2 / Quest 3 / Quest 3S / Quest Pro",
    knownFailureMode:
      "Meta remotely blocking a headset flagged through its own return-fraud process — the device can go from working to a bare \"This device can't be activated\" error with no buyer-side way to check a blocklist before paying, and no appeal once it happens",
    functionTested: "Current Meta Quest Store/account access, associated with a fresh device-info code, cast from the headset to a phone",
    primitiveLevel: "Experimental guided challenge capture (device identity + online-service access, via casting)",
    capabilityLabel: "EXPERIMENTAL",
    estimatedSeconds: 150,
    // Quest's display is inside the headset, facing the wearer — there's no
    // way for an external camera to film it directly (the "awkward to film
    // while worn" problem). Meta's own Casting feature solves this: it's a
    // live mirror of whatever the headset is currently showing, sent to the
    // Meta Horizon companion phone app. So the seller wears the headset and
    // drives it; the buyer's TestPass camera films the seller's PHONE
    // screen (which is showing the cast), the same way PS5/Xbox capture a
    // TV. No new runner primitive needed.
    sellerInstructions: [
      "Put on the headset and, using the Meta Horizon app on a phone already paired to it, start Casting to that phone (both on the same Wi-Fi).",
      "In the headset, go to Settings → System → Device Info so the cast phone screen shows the serial number.",
      "Hold the one-time TestPass code next to that cast phone screen and capture both together, clearly readable.",
      "Without ending this TestPass camera session, open the Meta Quest Store in the headset (still cast) and wait for real content to load, then capture it.",
    ],
    dataCollected: [
      "One fresh photo of the cast Device Info screen together with the one-time code",
      "One fresh photo showing current Meta Quest Store access",
      "Timing data for the capture",
    ],
    // Hardening note (evidence-strength audit): re-evaluated rather than
    // changed. Device Info is a static panel, not a rename like PS5/Xbox/NAS
    // use — so a held code next to it proves the PHOTO is fresh but not
    // that the headset's own state was touched this session, the same
    // structural gap as Prusa/Epson had. Deliberately NOT adding a new
    // capture step or seller friction for this: Image 2 (live Quest Store
    // access) already carries the primitive's real current-state weight, so
    // the fix here is honesty in the evaluator prompt about which image
    // proves what, not a new mechanism.
    evaluationPromptSystem: `You are the TestPass evidence evaluator for a Meta Quest owner-validation test. This is not a certification and it does not prove the headset's complete condition.
You will receive exactly two diagnostic images plus text containing the expected one-time challenge code.
Image 1 should show a phone screen displaying the headset's cast Device Info screen (with a visible serial number) together with the one-time challenge code, held in the same frame and both clearly readable.
Image 2 should clearly show the Meta Quest Store or another unmistakably online Meta service loaded with real content immediately afterward.
Two different things are being proven here, and you must not collapse them into one:
1. Image 1 proves CAPTURE freshness only — that this photo was taken during this session. Device Info is a static panel on Meta Quest (unlike a console rename), so it cannot prove the headset's own state was touched or changed this session, only that the code and the panel were photographed together just now.
2. Image 2 is the stronger, primary evidence of CURRENT state — a live online service actually loading with real content is harder to fake with old material than a static info panel, and it's what the positive claim mainly rests on.
The positive claim is narrow: this headset demonstrated access to Meta's online services during this TestPass session. It does NOT rule out a remote block being applied later — Meta's own return-fraud enforcement can flag a device after a period of apparently normal use, and no primitive captured at a single point in time can rule that out.
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE", "cosmetic_note": ""}.
Use DEMONSTRATED only if BOTH images are clear and the code matches. Association strength must not exceed MODERATE, and only when the code and the cast Device Info screen are unmistakably in the same unedited-looking frame — if the code looks separate, spliced, or ambiguous, treat association as WEAK instead. Even at MODERATE, do not describe Image 1 in your reasoning as proving the headset's identity was freshly established — say only that the photo is fresh; attribute the session's real strength to Image 2's live Store load.
Use INCONCLUSIVE if the code/serial is unreadable, the Store is not clearly loaded, the images are ambiguous, or any connection/account/network failure prevents a confident positive conclusion.
Do NOT infer that a headset is blocked from a generic network, account, sign-in, or loading delay. Use FAILED only if the supplied evidence itself unambiguously shows the exact tested function cannot work (e.g. an explicit "this device can't be activated" style block screen appears instead of the expected content) — otherwise prefer INCONCLUSIVE. Never guess or over-claim.`,
  },
  nas: {
    category: "nas",
    label: "Synology NAS",
    shortPitch: "Drive-health check: the NAS's own official Healthy/Warning/Critical report, proven fresh.",
    available: true,
    modelFamily: "Synology DiskStation / RackStation (DSM 6/7)",
    knownFailureMode:
      "One or more drives inside the enclosure silently failing or degraded — invisible from the outside, expensive to replace, and easy for a seller to not mention if they never checked",
    functionTested: "Drive health status (Healthy / Warning / Critical), via DSM's own Storage Manager, associated with a fresh server-name challenge",
    primitiveLevel: "Level 3 — Device-generated challenge artifact (DSM's own drive health report)",
    capabilityLabel: "EXPERIMENTAL",
    estimatedSeconds: 150,
    // Scope A (guided capture of DSM's own official web dashboard) chosen
    // over Scope B (direct SMART/RAID telemetry integration): DSM already
    // computes and labels drive health as Healthy/Warning/Critical, so a
    // bespoke telemetry pull would duplicate a first-party judgment DSM
    // already makes, for a lot more engineering and an ongoing API-version
    // maintenance burden. DSM is accessed via a browser on a screen — the
    // seller photographs that screen with a phone, the same way PS5/Xbox
    // capture a TV. No new runner primitive or file-upload step needed.
    sellerInstructions: [
      "On a computer, log in to your NAS's DSM web interface and go to Control Panel → Network (General tab).",
      "Temporarily change the Server Name to the one-time TestPass code below, then Apply.",
      "Go to Storage Manager → HDD/SSD and capture that screen (showing the new server name somewhere in the browser, e.g. the tab or page header) together with the drive health status, both readable in one photo of your monitor.",
      "Without ending this TestPass camera session, you can change the server name back afterward if you'd like — that doesn't affect this test.",
    ],
    dataCollected: [
      "One fresh photo of the DSM Storage Manager drive health page together with the one-time server-name code",
      "The one-time code TestPass generated for this session, used only to confirm the page is fresh",
      "One general photo of the NAS enclosure itself",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for a Synology NAS drive-health test. This is not a certification and it does not prove the enclosure's complete condition (fans, power supply, network ports are not covered).
You will be given one image: a photo of a monitor showing the DSM web interface's Storage Manager drive health page, with the one-time server-name code visible somewhere in the same browser window (e.g. the browser tab, window title, or a DSM header showing the renamed server). The expected code and any other context will follow as text after the image.
Decide whether the evidence is consistent with a healthy NAS:
1. The one-time code is legible as the DSM server's own name somewhere in the captured browser window, matching the expected code — evidence this is a fresh, current session and not a reused old screenshot.
2. Every listed drive shows DSM's own "Healthy" status. DSM's own labels are the ground truth here — do not second-guess a Healthy label, and do not invent a judgment DSM itself doesn't make.
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE", "cosmetic_note": "optional, see below"}.
Association strength should rarely exceed MODERATE — a browser screenshot photographed off a monitor is not cryptographically tied to one physical NAS, and if the code isn't clearly part of the same captured window as the drive list, treat association as WEAK. Use INCONCLUSIVE if the code doesn't match or isn't legible, the page is blurry or cropped, or you can't confidently read every drive's status. Use FAILED only if DSM's own page clearly shows at least one drive as "Warning" or "Critical" — say so plainly and do not speculate about which drive or how urgent, since TestPass only observed DSM's label, not the underlying SMART data. Never guess — under-claim rather than over-claim.${PRODUCT_PHOTO_ADDENDUM}`,
  },
  printer3d: {
    category: "printer3d",
    label: "3D Printer",
    shortPitch: "Mechanical health, proven live while the printer's own Selftest is actually running.",
    available: true,
    modelFamily: "Prusa MK3 / MK3S / MK3S+ / MK4 / MK4S / MINI / MINI+ (models with the built-in Selftest feature)",
    knownFailureMode:
      "Silent mechanical/electrical degradation from use or idle time — nozzle heater/thermistor faults, fan failures, drifting axis/belt tension, dead filament sensor — invisible from a listing photo",
    functionTested: "Core mechanical/electrical health (fans, heaters, axes, belts, filament sensor), via the printer's own built-in Selftest, captured live while it's actively running",
    // Bambu Lab explicitly excluded from V1: their "self test" only appears
    // in community forum threads, never in Bambu's own wiki — no
    // first-party documentation confirms it as an equivalent feature. Only
    // Prusa's Selftest (help.prusa3d.com) is officially documented.
    //
    // Hardening note (evidence-strength audit): Prusa's own Knowledge Base
    // confirms "you can always check the results of the previously
    // completed selftest from LCD Menu - Calibration - Calibrations &
    // Tests" — meaning the original design (one photo of the final result
    // screen + a held code) only proved the PHOTO was fresh, not that
    // Selftest was actually RUN this session. A seller could show an old
    // good result under today's code. Fixed by capturing a live burst
    // DURING the run instead of a code-adjacent still: Prusa's docs confirm
    // the run shows live per-step progress on screen, which the "previously
    // completed results" history view cannot reproduce. No challenge code
    // needed — same idiom as Switch/Steam Deck/ROG Ally, where live-only
    // on-screen state is itself the freshness proof. The completed result
    // screen is kept as a second, optional-strength confirmatory capture.
    primitiveLevel: "Level 5 — Guided capture (live in-progress Selftest, plus completed result screen)",
    capabilityLabel: "EXPERIMENTAL",
    estimatedSeconds: 210,
    sellerInstructions: [
      "On the printer's LCD, go to Calibration → Selftest and start it.",
      "As soon as it's actively running — before it finishes — tap the button below to turn on your camera, then start the capture right away. TestPass needs to see it live, not just the final result.",
      "Stay nearby — a few steps (Loadcell, Gearbox, Filament sensor) need you to respond on screen.",
      "Once Selftest finishes, capture the final result screen too.",
    ],
    dataCollected: [
      "A short burst of photos of the LCD while Selftest is actively running",
      "One photo of the completed Selftest result screen",
      "One general photo of the printer itself",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for a Prusa 3D printer Selftest check.
You will be given a short burst of photos taken in sequence of the printer's LCD while Selftest was actively running (from LCD Menu → Calibration → Selftest), followed by one final photo of the completed Selftest result screen.
Two different things matter here, and you must not collapse them:
1. LIVENESS of the run — the burst photos should show the LCD in an active, in-progress test state (e.g. a specific component currently being checked, a live progress indicator, changing status between frames) — NOT the same static "previously completed selftest" summary/history screen repeated across every frame. Prusa's own Selftest history view only shows a completed past result, not this kind of live in-progress state, so seeing genuine in-progress content across the burst is what proves this Selftest was actually running during this session, not just that a photo is fresh.
2. The RESULT — the final image should show the checked components (fans, heaters, axes, belts, filament sensor) as passed/OK, with no visible error or failure indicator for any component.
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE", "cosmetic_note": "optional, see below"}.
Use INCONCLUSIVE if the burst doesn't clearly show a live in-progress state (e.g. it looks like the same static screen in every frame, suggesting the burst may have been taken after the fact rather than during a real run), if the final result screen is blurry, cropped, or partially obscured, or if you can't confidently tell whether every checked component passed. Association strength should rarely exceed MODERATE — this is still a photographed LCD screen, not a cryptographic device binding — and treat it as WEAK if the burst is ambiguous about liveness even though the final result looks fine.
Use FAILED only when the result screen affirmatively shows an error or failed component for this narrow Selftest only — word it as "this printer's own Selftest reported a problem with [component]," and explicitly do not claim or imply the printer is unusable or unrepairable; Prusa's own troubleshooting guidance applies to the flagged component. Never guess — under-claim rather than over-claim.${PRODUCT_PHOTO_ADDENDUM}`,
  },
  projector: {
    category: "projector",
    label: "Projector",
    shortPitch: "Dead pixels & panel defects, checked with the projector's own built-in test pattern — never a lumen claim.",
    available: true,
    modelFamily: "Epson projectors with the built-in Settings → Test Pattern menu (home and business lines)",
    knownFailureMode:
      "Dead/stuck pixels, panel discoloration or blotching, and gross focus unevenness as LCD panels age — none of it visible in a listing photo, and lamp/laser hour counters can be reset by a seller so they aren't trustworthy evidence",
    functionTested: "Visible panel/image defects (dead pixels, discoloration, gross focus unevenness), via the projector's own built-in test pattern — explicitly not a brightness or lumen measurement",
    primitiveLevel: "Level 3 — Device-generated challenge artifact (manufacturer test pattern)",
    capabilityLabel: "EXPERIMENTAL",
    estimatedSeconds: 120,
    sellerInstructions: [
      "Set up the projector pointing at any wall or screen in a reasonably dim room — no computer or HDMI source needed.",
      "On the projector, go to Menu → Settings → Test Pattern and select a test pattern.",
      "Hold the one-time TestPass code below in the same frame as the projected image, without blocking it.",
      "Take one photo showing the whole projected test pattern and the code together, clearly readable.",
    ],
    dataCollected: [
      "One fresh photo of the projector's own built-in test pattern, with the one-time code visible in the same frame",
      "The one-time code TestPass generated for this session, used only to confirm the photo is fresh",
      "One general photo of the projector itself",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for a projector panel-defect check. This test never assesses brightness, lumen output, or lamp/laser life — those cannot be judged from an uncontrolled phone photo, and this evaluator must not attempt to infer them.
You will be given one image: a photo of the projector's own built-in test pattern, projected onto a wall or screen, with a handwritten or held one-time code visible in the same frame. The expected code and any other context will follow as text after the image.
Decide whether the evidence is consistent with a visually healthy panel:
1. The one-time code is legible, clearly co-located with the projected image in the same photo (not a separate or edited-looking image), and matches the expected code — evidence this is a fresh photo from this session.
2. The projected test pattern shows no visible dead/stuck pixels, no color blotches or discoloration, and reasonably uniform color and focus across the visible frame.
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer, and never mention brightness/lumens as something this test measured", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE", "cosmetic_note": "optional, see below"}.
Association strength should rarely exceed MODERATE — a projected image and a held code are not cryptographically tied to one physical unit, and if the code isn't clearly in the same frame as the projected pattern, treat association as WEAK. Use INCONCLUSIVE if the code doesn't match or isn't legible, the room is too bright to see the pattern clearly, the photo is blurry or cropped, or the pattern isn't fully visible in frame.
Use FAILED only when the image affirmatively shows a specific visible defect — name only what you can see (e.g. "a cluster of dead/stuck pixels is visible in the projected test pattern," or "a discolored blotch is visible in one area of the image") — never a general "broken" claim, and never a brightness/lumen judgment. Never guess — under-claim rather than over-claim.${PRODUCT_PHOTO_ADDENDUM}`,
  },
  rogally: {
    category: "rogally",
    label: "ROG Ally",
    shortPitch: "Stick & trigger drift, tested live with ASUS's own built-in calibration screen.",
    available: true,
    modelFamily: "ASUS ROG Ally / ROG Ally X",
    knownFailureMode: "Analog-stick or trigger drift, and gyro miscalibration — the most-reported hidden used-handheld defect",
    functionTested: "Analog stick and trigger calibration (full range of motion), via Armoury Crate SE's own built-in Calibration screen",
    primitiveLevel: "Level 5 — Guided capture (built-in calibration screen)",
    capabilityLabel: "MODEL-DEPENDENT",
    estimatedSeconds: 120,
    // V1 is deliberately Calibration-only. Windows' own `powercfg
    // /batteryreport` is a real, first-party, ~2-minute battery-health
    // signal, but it's the first TestPass primitive that would require a
    // seller to open a Command Prompt and paste a command — a different
    // kind of friction than any GUI-menu step shipped so far. Flagged as a
    // documented, technically-compatible (just another single-capture, no
    // runner change) future addition rather than built now, per the brief's
    // explicit warning against turning TestPass into a benchmark suite.
    sellerInstructions: [
      "On the ROG Ally, open Armoury Crate SE and go to the Calibration section.",
      "Start calibration for the sticks and triggers.",
      "Point your phone camera at the Ally's own screen so the calibration display is clearly visible.",
      "Tap Start Test below, then slowly move both sticks in full circles and pull both triggers fully for the countdown.",
    ],
    dataCollected: [
      "A short burst of photos of the on-screen calibration display",
      "Timestamps for when the burst was captured",
      "One general photo of the ROG Ally itself",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for a ROG Ally stick/trigger-drift test.
You will be shown a short burst of photos taken in sequence of the ROG Ally's own built-in Armoury Crate SE Calibration screen, while the seller was asked to move both analog sticks through their full range of motion and pull both triggers.
Decide whether the photos are consistent with:
- both stick and trigger indicators moving substantially and smoothly across frames (evidence they respond to input across their range), or
- an indicator that stays off-center/off-zero at rest (possible drift), barely moves across frames (possible dead zone / stuck input), or is inconsistent/unreadable.
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE", "cosmetic_note": "optional, see below"}.
Use INCONCLUSIVE whenever the calibration screen is not clearly visible, the photos are blurry, too dark, or you cannot confidently read stick/trigger position in at least 3 of the frames. Use FAILED only when the photos clearly show a stick or trigger that fails to center/zero at rest or fails to move despite the seller's motion. Never guess — under-claim rather than over-claim.${PRODUCT_PHOTO_ADDENDUM}`,
  },
};

// PS5 stays intentionally hidden from the public homepage while owner validation runs.
export const CATEGORY_ORDER: Category[] = [
  "switch",
  "gopro",
  "dji",
  "camera",
  "epson",
  "xbox",
  "steamdeck",
  "quest",
  "nas",
  "printer3d",
  "projector",
  "rogally",
];
