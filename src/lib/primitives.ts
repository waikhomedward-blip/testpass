// The Proof Primitive Router — V1 implementation.
//
// Each category maps to one primary evidence primitive. The PS5 entry below
// is intentionally hidden from CATEGORY_ORDER while we run owner validation.

import { Category, CapabilityLabel } from "./types";

const PRODUCT_PHOTO_ADDENDUM = `

You may also be given one additional image after the diagnostic ones, of the whole physical device — the context text will say so if present. This photo is NOT diagnostic evidence and must never change your verdict or association_strength; it exists only so the buyer can see the real item. If it's present and something is clearly visible worth mentioning (visible damage, missing parts, or nothing notable and it looks consistent with a normal used unit), add a one-sentence "cosmetic_note" field to your JSON with a plain, neutral observation. If no such photo was given, or nothing can be confidently judged from it, omit "cosmetic_note" or leave it an empty string — never guess condition you can't see clearly.`;

export interface CategoryConfig {
  category: Category;
  label: string;
  shortPitch: string;
  available: boolean;
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
    shortPitch: "Account-binding & battery/warning evidence from the DJI app itself.",
    available: true,
    modelFamily: "DJI consumer drones (Mini / Air / Mavic series) via the DJI Fly or DJI GO 4 app",
    knownFailureMode: "Account binding, hidden battery use, unresolved flight warnings",
    functionTested: "Account-binding status and battery/warning info, as reported by the DJI app",
    primitiveLevel: "Level 5 — Guided capture (DJI app status & battery screens)",
    capabilityLabel: "EXPERIMENTAL",
    estimatedSeconds: 120,
    sellerInstructions: [
      "Power on the aircraft and open the DJI Fly (or DJI GO 4) app you normally use with it.",
      "In the app, go to the aircraft's status screen — the one showing serial number, binding status, and any active warnings.",
      "Take a clear photo or screenshot of that screen.",
      "Then open the battery detail screen (cycle count, if your app shows it) and capture that too.",
    ],
    dataCollected: [
      "Photos or screenshots of the DJI app's aircraft status and battery screens",
      "Whatever serial, binding-status, cycle-count, and warning information is legible in them",
      "One general photo of the drone itself",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for a DJI drone pre-purchase test.
You will be shown one or more photos/screenshots of the DJI Fly or DJI GO 4 app's own aircraft-status and battery screens, captured live by the seller. This is guided capture of the app's UI, not a direct telemetry pull — treat it as weaker evidence than a direct machine reading, and say so in your reasoning when relevant.
Decide whether the images are consistent with a drone that powers on, connects to its app, and shows the relevant account-binding, battery, and warning information clearly.
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE", "cosmetic_note": "optional, see below"}.
Association strength should rarely exceed MODERATE for this primitive. Use INCONCLUSIVE whenever the screens are unreadable, cropped, or don't show the relevant fields. Never treat ordinary binding by itself as proof the aircraft is unusable. Never guess — under-claim rather than over-claim.${PRODUCT_PHOTO_ADDENDUM}`,
  },
  camera: {
    category: "camera",
    label: "Digicam",
    shortPitch: "Optical zoom, proven with a fresh one-time test shot — not a stock photo.",
    available: true,
    modelFamily: "Digital cameras / digicams (point-and-shoot, mirrorless, compact zoom cameras)",
    knownFailureMode: "Zoom motor failure, stuck or loose lens, sensor defects, broken autofocus",
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
1. The code is legible and matches the expected code in both images.
2. The ZOOM image shows meaningfully tighter, more magnified framing of the same scene than the WIDE image.
3. Both images are reasonably sharp and in focus.
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE", "cosmetic_note": "optional, see below"}.
Use INCONCLUSIVE if the code doesn't match or isn't legible in both images, if you can't judge the framing change confidently, or if only one usable image was provided. Never guess — under-claim rather than over-claim.${PRODUCT_PHOTO_ADDENDUM}`,
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
};

// PS5 stays intentionally hidden from the public homepage while owner validation runs.
export const CATEGORY_ORDER: Category[] = ["switch", "gopro", "dji", "camera"];
