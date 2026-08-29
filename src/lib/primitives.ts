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
    shortPitch: "Telemetry & binding-status evidence.",
    available: false,
    modelFamily: "DJI consumer drones (Mini / Air / Mavic series)",
    knownFailureMode: "Account-bound ('activation locked') unit, battery/warning history",
    functionTested: "Account-binding status and battery/warning telemetry",
    primitiveLevel: "Level 2 — Telemetry",
    capabilityLabel: "UNAVAILABLE",
    estimatedSeconds: 0,
    sellerInstructions: [],
    dataCollected: [],
    evaluationPromptSystem: "",
  },
  camera: {
    category: "camera",
    label: "Camera",
    shortPitch: "Zoom, focus and same-unit evidence from a fresh test shot.",
    available: false,
    modelFamily: "Digital cameras (model-specific spike required)",
    knownFailureMode: "Zoom/focus mechanism failure, sensor defects",
    functionTested: "Optical zoom and focus, via a fresh challenge target",
    primitiveLevel: "Level 3 — Device-generated challenge artifact",
    capabilityLabel: "UNAVAILABLE",
    estimatedSeconds: 0,
    sellerInstructions: [],
    dataCollected: [],
    evaluationPromptSystem: "",
  },
};

export const CATEGORY_ORDER: Category[] = ["switch", "gopro", "dji", "camera"];
