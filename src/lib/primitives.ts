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
    estimatedSeconds: 90,
    sellerInstructions: [
      "On the Switch, go to System Settings → Controllers and Sensors → Test Input Devices, and open the calibration screen for each controller you're including.",
      "Point your phone camera at the TV or screen so the calibration screen is clearly visible.",
      "Tap Start Test below, then slowly move both analog sticks in full circles for the countdown.",
      "Hold the controller so the stick position on screen stays visible the whole time.",
    ],
    dataCollected: [
      "A short burst of photos of the on-screen calibration display",
      "Timestamps for when the burst was captured",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for a Nintendo Switch controller-drift test.
You will be shown a short burst of photos taken in sequence of a Nintendo Switch (or Joy-Con/Pro Controller) analog-stick calibration screen, while the seller was asked to move both sticks through their full range of motion.
Decide whether the photos are consistent with:
- both stick indicators moving substantially and smoothly across frames (evidence the sticks respond to input across their range), or
- a stick indicator that stays off-center at rest (possible drift), barely moves across frames (possible dead zone / stuck stick), or is inconsistent/unreadable.
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE"}.
Use INCONCLUSIVE whenever the calibration screen is not clearly visible, the photos are blurry, too dark, or you cannot confidently read stick position in at least 3 of the frames. Use FAILED only when the photos clearly show a stick that fails to center at rest or fails to move despite the seller's motion. Never guess — under-claim rather than over-claim.`,
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
    estimatedSeconds: 90,
    sellerInstructions: [
      "Turn the GoPro on and keep it within a foot of your phone or laptop.",
      "Tap Connect via Bluetooth below and pick your GoPro from the list your browser shows.",
      "If your browser or camera doesn't support this, skip to the guided photo step — take a clear photo of the camera's screen showing battery and storage remaining.",
      "Follow the on-screen prompt to confirm a fresh recording, then submit.",
    ],
    dataCollected: [
      "Device name and any Bluetooth-reported battery level (if the connection succeeds)",
      "One guided confirmation photo of the camera's on-screen status",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for a GoPro action camera pre-purchase test.
You will be given: (a) the result of a Web Bluetooth connection attempt (may have succeeded with a device name/battery reading, or may have failed/been skipped), and (b) a guided confirmation photo of the camera's screen.
Decide whether the combined evidence is consistent with a functioning camera that powers on, reports a real battery/status reading, and matches between the Bluetooth reading (if any) and the photographed screen (if legible).
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE"}.
If Bluetooth failed/was skipped and the photo is the only evidence, that is at best MODERATE or WEAK association — say so. Use INCONCLUSIVE if the photo is unreadable or nothing meaningful was captured. Use FAILED only if the evidence affirmatively shows a problem (e.g. an error screen, a dead battery indicator with no power). Never guess — under-claim rather than over-claim.`,
  },
  dji: {
    category: "dji",
    label: "DJI Drone",
    shortPitch: "Account-binding & battery/warning evidence from the DJI app itself.",
    available: true,
    modelFamily: "DJI consumer drones (Mini / Air / Mavic series) via the DJI Fly or DJI GO 4 app",
    knownFailureMode:
      "Account-bound ('activation locked') unit, hidden battery wear, unresolved flight warnings",
    functionTested: "Account-binding status and battery/warning info, as reported by the DJI app",
    // No public consumer API/Bluetooth telemetry read exists for this without the seller's own
    // DJI account — so this is guided capture of the app's own screens, not a direct pull. Being
    // honest about that (Level 5, not Level 1/2) matters more than sounding more advanced.
    primitiveLevel: "Level 5 — Guided capture (DJI app status & battery screens)",
    capabilityLabel: "EXPERIMENTAL",
    estimatedSeconds: 90,
    sellerInstructions: [
      "Power on the aircraft and open the DJI Fly (or DJI GO 4) app you normally use with it.",
      "In the app, go to the aircraft's status screen — the one showing serial number, activation/binding status, and any active warnings.",
      "Take a clear photo or screenshot of that screen.",
      "Then open the battery detail screen (cycle count / health, if your app shows it) and capture that too.",
    ],
    dataCollected: [
      "Photos or screenshots of the DJI app's aircraft status and battery screens",
      "Whatever serial, binding-status, cycle-count, and warning information is legible in them",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for a DJI drone pre-purchase test.
You will be shown one or more photos/screenshots of the DJI Fly or DJI GO 4 app's own aircraft-status and battery screens, captured live by the seller. This is guided capture of the app's UI, not a direct telemetry pull — treat it as weaker evidence than a direct machine reading, and say so in your reasoning when relevant.
Decide whether the images are consistent with a drone that powers on, connects to its app, and shows no unresolved activation-lock or critical warning — versus one that clearly shows an account-binding lock, a critical warning/error state, or a battery in poor health (very high cycle count, health warning).
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE"}.
Association strength should rarely exceed MODERATE for this primitive — a photographed app screen is not cryptographically tied to one physical aircraft. Use INCONCLUSIVE whenever the screens are unreadable, cropped, or don't show the relevant status/battery fields. Use FAILED only when the images affirmatively show a lock, error, or critical warning. Never guess — under-claim rather than over-claim.`,
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
    estimatedSeconds: 120,
    sellerInstructions: [
      "TestPass will show you a one-time code below. Keep it visible on this screen, or write it on paper next to another screen.",
      "Using the camera you're selling, take one photo of the code from a few feet away, zoomed all the way OUT (widest setting).",
      "Without moving the camera or the code, zoom the camera all the way IN (full telephoto) and take a second photo of the same code.",
      "Transfer both photos to this phone — Wi-Fi transfer, SD card, however the camera normally exports — then upload them below.",
    ],
    dataCollected: [
      "Two photos taken by the camera being tested — one at the widest zoom, one at full zoom",
      "The one-time code TestPass generated for this session, used only to confirm the photos are fresh",
    ],
    evaluationPromptSystem: `You are the TestPass evidence evaluator for a digital camera (digicam) pre-purchase zoom test.
You will be given exactly two images in this order: first a WIDE shot, second a ZOOM shot, both supposedly taken moments apart of the same one-time code by the same stationary camera at different zoom settings. The expected code and any other context will follow as text after the images.
Decide whether the evidence is consistent with the camera's optical zoom genuinely working:
1. The code is legible and matches the expected code in both images (evidence the photos are fresh, not reused/stock).
2. The ZOOM image shows meaningfully tighter, more magnified framing of the same scene than the WIDE image — the subject should appear noticeably larger/closer, not just an identical or barely-different crop.
3. Both images are reasonably sharp and in focus, not so blurry that a lens or autofocus problem would be masked.
Respond ONLY with strict JSON: {"verdict": "DEMONSTRATED" | "FAILED" | "INCONCLUSIVE", "reasoning": "one or two sentences, plain language, for a non-technical buyer", "association_strength": "STRONG" | "MODERATE" | "WEAK" | "INCONCLUSIVE"}.
Use INCONCLUSIVE if the code doesn't match or isn't legible in both images, if you can't judge the framing change confidently, or if only one usable image was provided. Use FAILED only if the code matches (so you know it's a fresh, genuine pair) but the zoom image shows essentially no magnification change, or is severely out of focus in a way that suggests a broken mechanism. Never guess — under-claim rather than over-claim.`,
  },
};

export const CATEGORY_ORDER: Category[] = ["switch", "gopro", "dji", "camera"];
