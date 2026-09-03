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
// ONE-PHONE SELLER PRINCIPLE — product doctrine, added in the
// one-phone-seller-evidence pass. A seller should never need a second
// phone, a second tablet, another camera, a borrowed screen, or a
// handwritten/printed TestPass code just to produce evidence. The normal
// setup is: the seller's own phone + the product being sold + whatever
// that product ordinarily needs to operate (printer paper, a console's
// usual TV/controller, its own network, a manufacturer app already on the
// seller's phone). TestPass itself must never manufacture a new hardware
// dependency. "You only need your phone and the device you're testing" is
// a real, load-bearing part of the pitch — sellers are strangers doing a
// buyer a favor, and every extra device or prop is a reason to bail.
//
// PROOF PRIMITIVE ROUTER — for each category/step, prefer the strongest
// primitive available that still satisfies the rule above, in this order:
//   1. Direct live telemetry (Bluetooth LE or similar) — see "gopro".
//   2. Live behavioral/state challenge, captured by TestPass's own live
//      camera — a device-embedded rename ("ps5", "xbox", "nas"), a live
//      built-in test/calibration screen ("switch", "steamdeck", "rogally",
//      "printer3d", "projector"), or a device-generated artifact
//      photographed live ("camera", "epson"). This is the workhorse tier:
//      the server timestamps and session-binds every live capture (see
//      submit/route.ts's serverReceivedAt), which is what proves capture
//      freshness now — not a code physically held in the frame.
//   3. Same-phone companion-app evidence ("dji", "quest") — when the
//      evidence only exists inside a manufacturer app, the seller
//      screenshots it on THIS phone and picks the file from within
//      TestPass, rather than TestPass's camera photographing a second
//      device. Always the honestly weaker tier on capture-freshness (a
//      screenshot isn't proof-of-moment the way a live frame is) — say so
//      plainly in the evaluator prompt, and cap association accordingly.
//   4. Weaker evidence / INCONCLUSIVE. Never solve a gap by asking for a
//      second phone.
// Never conflate the three separate claims a primitive can make: CAPTURE
// freshness (this file was produced during this session), UNDERLYING
// STATE freshness (the device's live condition, not a cached/old screen),
// and SAME-UNIT association (this evidence is tied to this specific
// physical item). A given primitive rarely proves all three, and category
// evaluator prompts must say which one(s) it actually establishes rather
// than let a strong claim on one imply strength on another.
//
// See src/lib/runner-types.ts for four permanent doctrine rules added in
// the physical-feasibility + error-recovery pass (Evidence Surface Rule,
// Capture Correction Principle, Atomic Evidence Principle, and this file's
// One-Phone Seller Principle restated) — every category config below, and
// every seller-facing string in it, is bound by them.

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
Association strength should not exceed MODERATE — a burst of this console's own calibration screen proves a Switch was present and responding to input during this session, but nothing in this primitive ties it to the specific physical unit in the listing rather than any other Switch the seller has access to (there is no device-embedded rename or serial check here). Use INCONCLUSIVE whenever the calibration screen is not clearly visible, the photos are blurry, too dark, or you cannot confidently read stick position in at least 3 of the frames. Use FAILED only when the photos clearly show a stick that fails to center at rest or fails to move despite the seller's motion. Never guess — under-claim rather than over-claim.${PRODUCT_PHOTO_ADDENDUM}`,
  },
  gopro: {
    category: "gopro",
    label: "GoPro",
    shortPitch: "Direct connection to the camera: identity, battery, storage, fresh capture.",
    available: true,
    modelFamily: "GoPro HERO / MAX (Bluetooth LE capable models)",
    knownFailureMode: "Won't power on / won't hold charge / won't write to storage",
    functionTested: "Device identity, battery level, and a fresh recording",
    primitiveLevel: "Level 1 — Direct machine diagnostics (Bluetooth LE, GoPro's own Get Hardware Info command read and parsed) + Level 3 — guided confirmation photo",
    capabilityLabel: "EXPERIMENTAL",
    estimatedSeconds: 120,
    // Confirmed integrity fix (one-phone-seller-evidence audit, round 2):
    // round 1 gated "direct_ble" on GoPro's BLE service merely being
    // present (getPrimaryService resolving) — real progress over the
    // original acceptAllDevices + bare gatt.connect() bug, but still not a
    // device READ. "Bluetooth evidence method" is now direct_ble only when
    // GoProFlow.tsx sent GoPro's own documented Get Hardware Info command
    // (0x3C) and received and parsed a real response (model name +
    // firmware version) — the same readiness check GoPro's own BLE setup
    // guide describes. A battery-percentage status read (0x13, status 70)
    // is attempted as a bonus and never gates success. See GoProFlow.tsx
    // for the full protocol-level story and sourcing.
    sellerInstructions: [
      "Turn the GoPro on and keep it within a foot of your phone or laptop.",
      "Tap Connect via Bluetooth below and pick your GoPro from the list your browser shows.",
      "If your browser or camera doesn't support this, TestPass will move straight to the guided photo step — take a clear photo of the camera's screen showing battery and storage remaining.",
      "Follow the on-screen prompt to confirm a fresh recording, then submit.",
    ],
    dataCollected: [
      "Device name, model, and battery level — only if TestPass actually read them from the camera over Bluetooth",
      "One guided confirmation photo of the camera's on-screen status",
      "One general photo of the GoPro itself",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for a GoPro action camera pre-purchase test.
You will be given: (a) the labeled result of a Web Bluetooth attempt — text will say "Bluetooth evidence method: direct_ble" only if TestPass sent GoPro's own Get Hardware Info command and received and parsed a real response (model and firmware) from the connected device (not merely that some Bluetooth connection was made), or "photo_fallback" otherwise — plus any device name/model/battery reading if direct_ble; and (b) a guided confirmation photo of the camera's screen.
Decide whether the combined evidence is consistent with a functioning camera that powers on, reports a real battery/status reading, and matches between the Bluetooth reading (if any) and the photographed screen (if legible).
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE", "cosmetic_note": "optional, see below"}.
If the evidence method is photo_fallback, the photo is the only evidence — that is at best MODERATE or WEAK association, say so, and never describe this submission as a "direct" or "Bluetooth-confirmed" read.
A direct_ble submission with a real battery/model reading that's consistent with the photo can reach MODERATE, not STRONG: the Get Hardware Info read is a genuine live radio exchange with a physically present, powered-on GoPro during this session (strong evidence the camera is real and responsive right now), but the model name and firmware version it returns are shared by every identical unit off the same production run — TestPass does not read or verify a device-specific serial number, so this evidence does not by itself establish that the responding camera is the exact physical unit being sold rather than some other GoPro of the same model the seller has access to. Never describe a direct_ble result as serial-verified, uniquely identified, or proven to be the listed unit. Use INCONCLUSIVE if the photo is unreadable or nothing meaningful was captured. Use FAILED only if the evidence affirmatively shows a problem (e.g. an error screen, a dead battery indicator with no power). Never guess — under-claim rather than over-claim.${PRODUCT_PHOTO_ADDENDUM}`,
  },
  dji: {
    category: "dji",
    label: "DJI Drone",
    shortPitch: "Account-binding & battery/warning evidence straight from the DJI app on the seller's own phone.",
    available: true,
    modelFamily: "DJI consumer drones (Mini / Air / Mavic series) via the DJI Fly or DJI GO 4 app",
    knownFailureMode:
      "Account-bound ('activation locked') unit, hidden battery wear, unresolved flight warnings",
    functionTested: "Account-binding status and battery/warning info, as reported by the DJI app on the seller's own phone",
    // No public consumer API/Bluetooth telemetry read exists for this without the seller's own
    // DJI account — so this is guided capture of the app's own screens, not a direct pull. Being
    // honest about that matters more than sounding more advanced.
    //
    // One-Phone Seller Principle redesign (evidence-UX audit): the previous
    // design asked the seller to "hold the one-time code next to your
    // phone/tablet showing that screen" — but the code was only ever
    // displayed on the SAME phone that was about to become the camera. A
    // phone cannot photograph its own screen, so as written this either
    // silently required a second phone/tablet just to display the code, or
    // was simply impossible to follow. Fixed by switching to a same-phone
    // companion-app handoff: the seller screenshots the DJI app's own
    // screens (normal OS screenshot, no second device) and picks those
    // files from within TestPass, still on the one phone. That is honestly
    // WEAKER on capture-freshness than a live TestPass camera frame — a
    // screenshot has no code or live-frame proof binding it to this exact
    // moment — so the evaluator prompt below caps association at WEAK
    // rather than letting it imply more. A live TestPass camera photo of
    // the physical aircraft is still collected (via includeProductPhoto),
    // but stays cosmetic-only per the shared product-photo addendum.
    //
    // Round 2 (physical-feasibility + error-recovery audit): confirmed via
    // DJI Fly/GO 4 documentation and secondary sources (support.dji.com
    // blocks automated fetches) that the aircraft status info and the
    // battery cycle-count/health live on two separate screens, not one —
    // kept as two screenshots rather than inventing an unconfirmed merged
    // screen. Also considered an automated same-unit serial match (app
    // screenshot's serial vs. the physical aircraft's serial label) but
    // did not implement it: neither the app's exact on-screen wording nor
    // the label's exact physical location is confirmed reliable enough
    // across DJI Fly versions/models for a vision-model comparison not to
    // risk a confidently wrong result — worse than staying honestly WEAK.
    // The live aircraft photo now asks the seller to include the visible
    // serial label when it's readable without disassembly, so a human
    // buyer can eyeball the comparison themselves; the evaluator may
    // mention it neutrally in the non-scoring cosmetic_note only.
    primitiveLevel: "Level 4 — Same-phone companion-app screenshots (DJI app status & battery screens); a live TestPass camera photo of the aircraft is also collected, cosmetic-only",
    capabilityLabel: "EXPERIMENTAL",
    estimatedSeconds: 120,
    sellerInstructions: [
      "Power on the aircraft and open the DJI Fly (or DJI GO 4) app on this same phone.",
      "Find the aircraft's status / device info screen (serial number, activation/binding status, any active warnings) and take a screenshot on this phone — your phone's own screenshot function, not TestPass's camera.",
      "Come back to TestPass and choose that screenshot below.",
      "Still in the DJI app, find the battery detail screen (cycle count / health, if shown). Take a screenshot on this phone, then choose it here too.",
      "Finally, use TestPass's own camera to take one live photo of the aircraft itself in front of you — including its serial label if you can read it without taking anything apart.",
    ],
    dataCollected: [
      "One screenshot of the DJI app's aircraft status screen, from this phone",
      "One screenshot of the DJI app's battery detail screen, from this phone",
      "One general photo of the drone itself, captured live by TestPass",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for a DJI drone pre-purchase test.
You will be given two images: Image 1 is a screenshot of the DJI Fly or DJI GO 4 app's aircraft-status screen (serial number, activation/binding status, warnings), taken by the seller on their own phone. Image 2 is a screenshot of the same app's battery detail screen, taken immediately afterward in the same session.
Both images are same-phone companion-app screenshots, not live TestPass camera captures — be honest about what that does and doesn't prove. TestPass knows these files were picked during this specific session, right after being asked for them, but unlike a live camera frame, a screenshot carries no code or in-session capture proof binding its actual content to this exact moment — it could in principle have been taken earlier. Never claim or imply timestamp-verified or cryptographic freshness for a screenshot, and never claim the app's connection to the aircraft is live right now — only that the file was picked during this session.
Decide whether the images are consistent with a drone that powers on, connects to its app, and shows no unresolved activation-lock or critical warning — versus one that clearly shows an account-binding lock, a critical warning/error state, or a battery in poor health (very high cycle count, health warning).
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE", "cosmetic_note": "optional, see below"}.
Association strength must never exceed WEAK for this category — a same-phone screenshot is the weakest evidence method TestPass uses, with nothing tying its content to this exact session the way a live capture or a device-embedded rename would, and there is no automated cross-check against the physical aircraft (a general photo of it may also be included, but it is cosmetic-only per the standard addendum and never strengthens association). Use INCONCLUSIVE whenever the screens are unreadable, cropped, or don't show the relevant status/battery fields. Use FAILED only when the images affirmatively show a lock, error, or critical warning. Never guess — under-claim rather than over-claim. If the optional final product photo clearly shows a legible serial number on the physical aircraft, you may note in cosmetic_note, neutrally and only as an observation for the buyer to double-check themselves, whether it appears to match or differ from the serial shown in Image 1 — this must never change association_strength or verdict, and say nothing if the serial isn't clearly legible in both places.${PRODUCT_PHOTO_ADDENDUM}`,
  },
  camera: {
    category: "camera",
    label: "Digicam",
    shortPitch: "Optical zoom, proven with a fresh one-time test shot — not a stock photo.",
    available: true,
    modelFamily: "Digital cameras / digicams (point-and-shoot, mirrorless, compact zoom cameras)",
    knownFailureMode:
      "Zoom motor failure, stuck or loose lens, sensor defects (dead/hot pixels), broken autofocus",
    functionTested: "Optical zoom, via TestPass's own live camera observing the digicam's rear screen at wide vs. full zoom",
    primitiveLevel: "Level 5 — Guided live capture (digicam's own rear screen), with an optional stronger original-file pair",
    capabilityLabel: "EXPERIMENTAL",
    estimatedSeconds: 150,
    // EVIDENCE SURFACE RULE re-audit (physical-feasibility + error-recovery
    // audit, round 2): the previous default required transferring the
    // digicam's own photos onto the seller's phone — "Wi-Fi transfer, SD
    // card, however the camera normally exports" — before they could even
    // be uploaded. That's real, ordinary friction (no Wi-Fi export, no
    // card reader on hand) that TestPass was quietly requiring, which cuts
    // against the One-Phone Seller Principle even though it never asked
    // for a second DEVICE per se. The zoom evidence this test actually
    // needs is visible on the digicam's own rear screen (Evidence Surface
    // case A), so the new default is TestPass's own live camera
    // photographing that screen at wide, then full, zoom — no code, no
    // transfer, freshness from the session-bound live capture like every
    // other live-camera category. The original design — the digicam's own
    // full-resolution photos of a one-time code — is genuinely stronger
    // where a seller CAN do the transfer easily (sharper, no screen glare/
    // moiré, and the code adds an extra freshness signal), so it's kept as
    // an explicit, clearly optional "add stronger evidence" step at
    // review, never something blocking Submit.
    sellerInstructions: [
      "Point the digicam you're selling at something across the room, zoomed all the way OUT (widest setting).",
      "Use TestPass's own camera to photograph the digicam's rear screen showing that wide view.",
      "Without moving the digicam, zoom it all the way IN (full telephoto), then photograph the digicam's screen again with TestPass's camera.",
      "Finally, take one photo of the digicam itself. At review, you can optionally add a stronger evidence pair: the digicam's own original wide/zoom photos of a one-time code, if you're able to transfer them to this phone.",
    ],
    dataCollected: [
      "Two live TestPass photos of the digicam's own rear screen — one at widest zoom, one at full zoom",
      "One general photo of the digicam itself",
      "Optionally, two original photos taken by the digicam itself of a one-time code (wide and zoomed), if the seller chooses to add them",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for a digital camera (digicam) pre-purchase zoom test.
You will always be given at least two images, in this order:
Image 1: TestPass's own live camera, photographing the digicam's rear screen at its WIDEST zoom.
Image 2: TestPass's own live camera, photographing the digicam's rear screen at FULL zoom, same subject, captured moments later in the same session.
These are photos of a screen, not the digicam's own output files — expect ordinary screen-capture artifacts (some glare, moiré, or a visible screen bezel) and judge accordingly; that alone is not a defect.
You may then be given an OPTIONAL second pair, clearly marked in the accompanying text: two original photos taken by the digicam itself (not a screen photo) of a one-time code, wide then zoomed, with the expected code given as text. Treat this pair as bonus corroboration only — never require it, and never penalize its absence.
Decide whether the evidence is consistent with the digicam's optical zoom genuinely working:
1. Image 2 shows meaningfully tighter, more magnified framing of the same scene than Image 1 — the subject should appear noticeably larger/closer on the digicam's own screen, not just an identical or barely-different crop.
2. Both images are reasonably sharp and the digicam's screen content is legible, not so blurry or glare-obscured that a lens or autofocus problem would be masked.
3. If the optional original-file pair is present: the code is legible and matches the expected code in both of those images (evidence they're fresh, not reused/stock), and the zoomed one shows meaningfully tighter framing than the wide one, consistent with Images 1-2.
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE", "cosmetic_note": "optional, see below"}.
Association strength should not exceed MODERATE. If only Images 1-2 (the live screen pair) are present and both clearly show the same subject with a confident magnification change, MODERATE is appropriate; if the framing change is only marginal or the screen is hard to read clearly, prefer WEAK rather than MODERATE — a photo of a screen is inherently a little harder to fully verify than a direct optical capture. If the optional original-file pair is also present, legible, and consistent with Images 1-2, that corroboration supports keeping it at MODERATE with more confidence, but still never STRONG on this primitive alone. Use INCONCLUSIVE whenever you can't judge the framing change confidently, the digicam's screen isn't clearly readable in one or both of Images 1-2, or (for the optional pair only) the code doesn't match or isn't legible in both of those images. Use FAILED only when Images 1-2 are both clearly readable but show essentially no magnification change, or are severely out of focus in a way that suggests a broken zoom/autofocus mechanism. Never guess — under-claim rather than over-claim.${PRODUCT_PHOTO_ADDENDUM}`,
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
    // the session.
    //
    // One-Phone Seller Principle follow-up: with the live-print burst doing
    // the real freshness work, the handwritten/adjacent code on the final
    // page became redundant — a weaker, second freshness mechanism doing a
    // job the burst already does better (the burst proves this exact page
    // was produced live; a code next to a finished page never proved more
    // than "a photo was taken now," which the server's own session-bound
    // capture timestamp already gives every live capture — see
    // submit/route.ts's serverReceivedAt). Dropped the code so the seller
    // no longer needs a pen for TestPass's sake — writing on the page is
    // still fine if useful for their own reasons, but TestPass doesn't ask
    // for it.
    sellerInstructions: [
      "Load a sheet of plain paper in the printer.",
      "On the printer's own screen, go to the menu icon → Maintenance → Print Head Nozzle Check → Start.",
      "As soon as it starts printing, quickly point your camera at the printer's output area and capture the burst — TestPass needs to see the page actively coming out, not just the finished result.",
      "Once the page has fully printed, take one photo of the whole page with every nozzle-check line readable.",
    ],
    dataCollected: [
      "A short burst of photos of the printer actively printing the nozzle-check page",
      "One fresh photo of the finished nozzle-check test page",
      "One general photo of the printer itself",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for an Epson photo-printer nozzle-check test.
You will be given a short burst of photos taken in sequence of the printer actively printing its own built-in nozzle-check page (from its Maintenance menu), followed by one final photo of the finished page.
Two different things matter here, and you must not collapse them:
1. LIVENESS of the print — the burst should show the printer actively working (paper feeding/ejecting, print head in motion, or the page visibly not-yet-complete) rather than a static already-finished page held in front of the camera repeatedly. This is what proves the nozzle-check page was produced during this session, not reused from an old print.
2. The RESULT — every color's nozzle-check line must be present in the final image with no visible gaps or breaks (a clean pattern per Epson's own documentation shows continuous lines with no missing segments) for a healthy read.
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE", "cosmetic_note": "optional, see below"}.
Association strength should rarely exceed MODERATE — even with a live-print burst, this is a printed page, not cryptographically tied to one physical printer. Treat association as WEAK if the burst doesn't clearly show an active, in-progress print (e.g. it looks like the same finished page in every burst frame) even though the final page looks fine — that ambiguity undermines the only freshness signal this category has. Use INCONCLUSIVE if the final page is blurry or cropped, or you can't confidently judge whether lines are missing.
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
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE", "cosmetic_note": "optional, see below"}.
Use DEMONSTRATED only if BOTH images are clear and the code matches as the console's own display name. Association strength must not exceed MODERATE in this two-photo experimental primitive, matching the PS5 owner-validation primitive, because TestPass is not yet recording an unbroken video or matching the physical serial label — but treat MODERATE as achievable whenever the renamed console name and serial are both clearly legible in Image 1, since this is now a device-embedded rename rather than a physically co-located paper code. Use WEAK if you cannot confidently tell whether the visible text is the console's actual assigned name versus something photographed separately or edited in.
Use INCONCLUSIVE if the code/serial is unreadable, the Store/service is not clearly loaded, the images are ambiguous, or any connection/account/network failure prevents a confident positive conclusion.
Do NOT infer that a console is banned from a generic network, account, sign-in, or service error. Use FAILED only if the supplied evidence itself unambiguously demonstrates the exact tested function cannot work for a device-specific reason; otherwise prefer INCONCLUSIVE. Never guess or over-claim.${PRODUCT_PHOTO_ADDENDUM}`,
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
Association strength should not exceed MODERATE — a burst of this Steam Deck's own calibration screen proves a Steam Deck was present and responding to input during this session, but nothing in this primitive ties it to the specific physical unit in the listing rather than any other Steam Deck the seller has access to (there is no device-embedded rename or serial check here). Use INCONCLUSIVE whenever the calibration screen is not clearly visible, the photos are blurry, too dark, or you cannot confidently read stick position in at least 3 of the frames. Use FAILED only when the photos clearly show a stick that fails to center at rest or fails to move despite the seller's motion. Never guess — under-claim rather than over-claim.${PRODUCT_PHOTO_ADDENDUM}`,
  },
  quest: {
    category: "quest",
    label: "Meta Quest",
    shortPitch: "Account-lock risk check: device-info screenshot + current Quest Store access, all on one phone.",
    available: true,
    modelFamily: "Meta Quest 2 / Quest 3 / Quest 3S / Quest Pro",
    knownFailureMode:
      "Meta remotely blocking a headset flagged through its own return-fraud process — the device can go from working to a bare \"This device can't be activated\" error with no buyer-side way to check a blocklist before paying, and no appeal once it happens",
    functionTested: "Current Meta Quest Store/account access, via the headset cast to the seller's own phone",
    primitiveLevel: "Level 4 — Same-phone companion-app screenshots (cast Device Info & Store screens); a live TestPass camera photo of the headset is also collected, cosmetic-only",
    capabilityLabel: "EXPERIMENTAL",
    estimatedSeconds: 150,
    // Quest's display is inside the headset, facing the wearer — there's no
    // way for an external camera to film it directly. Meta's own Casting
    // feature solves that: a live mirror of whatever the headset shows, sent
    // to the Meta Horizon companion app.
    //
    // One-Phone Seller Principle redesign (evidence-UX audit): the previous
    // design pointed TestPass's own camera at a SECOND phone (the one doing
    // the casting) with a code held next to it — meaning a Quest test
    // silently required two phones plus a code, the same structural bug DJI
    // had, just with an extra device. Fixed the same way: the seller casts
    // on THIS phone, takes native OS screenshots of what it's showing, and
    // picks those files from within TestPass on the same phone — one phone,
    // no code. This is honestly a capture-freshness downgrade from a live
    // TestPass camera frame (a screenshot isn't proof-of-moment the way a
    // live capture is), so the evaluator prompt caps association at WEAK
    // rather than the previous MODERATE.
    sellerInstructions: [
      "Put on the headset and, using the Meta Horizon app on this same phone, start Casting to it (both on the same Wi-Fi) — the headset's display now mirrors onto this phone's screen.",
      "In the headset, go to Settings → System → Device Info so the cast shows the serial number. Take a screenshot on this phone (your phone's own screenshot function, not TestPass's camera) of that cast view.",
      "Come back to TestPass and choose that screenshot below.",
      "Still casting, open the Meta Quest Store in the headset and wait for real content to load. Take a screenshot on this phone, then choose it here.",
      "Finally, use TestPass's own camera to take one live photo of the headset itself in front of you.",
    ],
    dataCollected: [
      "One screenshot of the cast Device Info screen, from this phone",
      "One screenshot of the cast Meta Quest Store showing real content, from this phone",
      "One general photo of the headset itself, captured live by TestPass",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for a Meta Quest owner-validation test. This is not a certification and it does not prove the headset's complete condition.
You will receive exactly two images, both same-phone screenshots (not live TestPass camera captures) of a phone's cast of the headset's display.
Image 1 should show the cast Device Info screen (Settings → System → Device Info) with a visible serial number.
Image 2 should show the cast Meta Quest Store, or another unmistakably online Meta service, loaded with real content.
Be honest about what a screenshot does and doesn't prove: TestPass knows both files were picked during this session, but unlike a live camera frame, a screenshot carries no in-session capture proof binding its actual content to this exact moment — it could in principle be older. Never claim or imply timestamp-verified freshness for either image.
The positive claim is narrow: this headset demonstrated access to Meta's online services, via screenshots taken during this TestPass session. It does NOT rule out a remote block being applied later — Meta's own return-fraud enforcement can flag a device after a period of apparently normal use, and no primitive captured at a single point in time can rule that out.
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE", "cosmetic_note": "optional, see below"}.
Association strength must never exceed WEAK for this category — same-phone screenshots are the weakest evidence method TestPass uses, with nothing tying their content to this exact session the way a live capture or a device-embedded rename would.
Use INCONCLUSIVE if the serial is unreadable, the Store is not clearly loaded, the images are ambiguous, or any connection/account/network failure prevents a confident positive conclusion.
Do NOT infer that a headset is blocked from a generic network, account, sign-in, or loading delay. Use FAILED only if the supplied evidence itself unambiguously shows the exact tested function cannot work (e.g. an explicit "this device can't be activated" style block screen appears instead of the expected content) — otherwise prefer INCONCLUSIVE. Never guess or over-claim.${PRODUCT_PHOTO_ADDENDUM}`,
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
    primitiveLevel: "Level 4 — Same-phone DSM screenshot (drive health page), strengthened by a live server-name rename baked into DSM's own state; a live TestPass camera photo of the enclosure is also collected, cosmetic-only",
    capabilityLabel: "EXPERIMENTAL",
    estimatedSeconds: 150,
    // Scope A (guided capture of DSM's own official web dashboard) chosen
    // over Scope B (direct SMART/RAID telemetry integration): DSM already
    // computes and labels drive health as Healthy/Warning/Critical, so a
    // bespoke telemetry pull would duplicate a first-party judgment DSM
    // already makes, for a lot more engineering and an ongoing API-version
    // maintenance burden.
    //
    // Round 2 (physical-feasibility + error-recovery audit): switched from
    // "photograph the monitor showing DSM" to a same-phone DSM screenshot
    // (see NASFlow.tsx for the full reasoning) — the old copy assumed a
    // second computer/monitor, which isn't a real requirement of running a
    // NAS and isn't something TestPass should manufacture, and it silently
    // broke for any seller who naturally manages DSM from their phone.
    // Association strength stays MODERATE, not downgraded to DJI/Quest's
    // WEAK, specifically because the server-name rename is baked into
    // DSM's own live state rather than being a static app screen — a
    // screenshot can only show today's code as the server's actual name if
    // the seller genuinely renamed this NAS during this session, which is
    // a real (if not cryptographic) freshness and same-unit-control signal
    // a plain "screenshot whatever's on screen" step doesn't have. Did not
    // add an automated physical-serial-label match on top of this: the
    // rename already demonstrates the seller has live administrative
    // control of this exact NAS, which is a stronger same-unit signal than
    // a photographed serial number would add, so it wasn't worth the same
    // OCR-mismatch risk flagged for DJI's serial-matching idea.
    sellerInstructions: [
      "Using this same phone's own browser, log in to your NAS's DSM web interface and go to Control Panel → Network (General tab).",
      "Temporarily change the Server Name to the one-time TestPass code below, then Apply.",
      "Go to Storage Manager → HDD/SSD, where the renamed server name and every drive's health status are both readable on the page. Take a screenshot on this phone (your phone's own screenshot function, not TestPass's camera) of that page.",
      "Come back to TestPass and choose that screenshot below. You can change the server name back afterward if you'd like — that doesn't affect this test.",
      "Finally, use TestPass's own camera to take one live photo of the NAS enclosure itself.",
    ],
    dataCollected: [
      "One same-phone screenshot of the DSM Storage Manager drive health page, showing the one-time server-name code",
      "The one-time code TestPass generated for this session, used only to confirm the page is fresh",
      "One general photo of the NAS enclosure itself, captured live by TestPass",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for a Synology NAS drive-health test. This is not a certification and it does not prove the enclosure's complete condition (fans, power supply, network ports are not covered).
You will be given one image: a same-phone screenshot (not a live TestPass camera capture) of the DSM web interface's Storage Manager drive health page, with the one-time server-name code visible somewhere on that page (e.g. a DSM header or panel showing the renamed server) — not a separately held or photographed object. The expected code and any other context will follow as text after the image.
Decide whether the evidence is consistent with a healthy NAS:
1. The one-time code is legible as the DSM server's own name somewhere on the captured page, matching the expected code — evidence the seller genuinely renamed this NAS during this session, not a reused old screenshot.
2. Every listed drive shows DSM's own "Healthy" status. DSM's own labels are the ground truth here — do not second-guess a Healthy label, and do not invent a judgment DSM itself doesn't make.
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE", "cosmetic_note": "optional, see below"}.
Association strength should rarely exceed MODERATE — TestPass has no way to verify a screenshot's pixel data was not edited or substituted, and STRONG is never appropriate here. But unlike a plain app screenshot, this one only works as evidence if the code is genuinely showing as the NAS's own current server name, which requires having just renamed this exact NAS — so MODERATE is appropriate whenever the code and every drive's status are both clearly legible on the page, not capped down to WEAK the way a screenshot with no embedded session-specific state would be. Treat association as WEAK if the code isn't clearly part of the same captured page as the drive list. Use INCONCLUSIVE if the code doesn't match or isn't legible, the page is cropped or hard to read, or you can't confidently read every drive's status. Use FAILED only if DSM's own page clearly shows at least one drive as "Warning" or "Critical" — say so plainly and do not speculate about which drive or how urgent, since TestPass only observed DSM's label, not the underlying SMART data. Never guess — under-claim rather than over-claim.${PRODUCT_PHOTO_ADDENDUM}`,
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
    // One-Phone Seller Principle redesign (evidence-UX audit): the previous
    // design asked the seller to "hold the one-time code in the same frame
    // as the projected image" — but the code was only ever displayed on the
    // same phone that was about to become the camera, the identical
    // structural bug DJI had. There's no computer in this category's setup
    // to write "written on paper" off of either, so it wasn't fixable with
    // a cheap paper trick without inventing a new prop. Fixed by dropping
    // the code entirely: this is now a plain live TestPass camera capture,
    // exactly like Switch/Steam Deck/ROG Ally/Printer3D's live-only-state
    // idiom — a projected test pattern only exists while a working
    // projector is actively projecting it, so the live capture itself is
    // the freshness signal. This doesn't weaken anything the code used to
    // prove: the code only ever established photo freshness, which the
    // server's own session-bound capture timestamp already establishes for
    // every live capture (see submit/route.ts's serverReceivedAt).
    primitiveLevel: "Level 5 — Guided capture (manufacturer test pattern, live)",
    capabilityLabel: "EXPERIMENTAL",
    estimatedSeconds: 120,
    sellerInstructions: [
      "Set up the projector pointing at any wall or screen in a reasonably dim room — no computer or HDMI source needed.",
      "On the projector, go to Menu → Settings → Test Pattern and select a test pattern.",
      "Turn on TestPass's camera and take one photo showing the whole projected test pattern, clearly readable.",
    ],
    dataCollected: [
      "One fresh photo of the projector's own built-in test pattern, captured live by TestPass",
      "One general photo of the projector itself",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for a projector panel-defect check. This test never assesses brightness, lumen output, or lamp/laser life — those cannot be judged from an uncontrolled phone photo, and this evaluator must not attempt to infer them.
You will be given one image: a live camera photo of the projector's own built-in test pattern, projected onto a wall or screen.
Decide whether the evidence is consistent with a visually healthy panel: the projected test pattern shows no visible dead/stuck pixels, no color blotches or discoloration, and reasonably uniform color and focus across the visible frame.
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer, and never mention brightness/lumens as something this test measured", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE", "cosmetic_note": "optional, see below"}.
Association strength should rarely exceed MODERATE — a projected image on a wall is not cryptographically tied to one physical unit. Use INCONCLUSIVE if the room is too bright to see the pattern clearly, the photo is blurry or cropped, or the pattern isn't fully visible in frame.
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
Association strength should not exceed MODERATE — a burst of this ROG Ally's own calibration screen proves a ROG Ally was present and responding to input during this session, but nothing in this primitive ties it to the specific physical unit in the listing rather than any other ROG Ally the seller has access to (there is no device-embedded rename or serial check here). Use INCONCLUSIVE whenever the calibration screen is not clearly visible, the photos are blurry, too dark, or you cannot confidently read stick/trigger position in at least 3 of the frames. Use FAILED only when the photos clearly show a stick or trigger that fails to center/zero at rest or fails to move despite the seller's motion. Never guess — under-claim rather than over-claim.${PRODUCT_PHOTO_ADDENDUM}`,
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
