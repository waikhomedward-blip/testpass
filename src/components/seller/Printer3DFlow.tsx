"use client";

import { RunnerConfig } from "@/lib/runner-types";
import GuidedCaptureRunner from "./GuidedCaptureRunner";

// Hardening redesign (evidence-strength audit): Prusa's own Knowledge Base
// confirms a previously completed Selftest result can be viewed again later
// without re-running it — so a single photo of the result screen + a held
// code only proved the PHOTO was fresh, not that Selftest was run this
// session. Fixed by capturing a live burst DURING the run (mirrors
// Switch/Steam Deck/ROG Ally's live-only-UI idiom) instead of relying on a
// code next to a static, potentially-stale screen. No useChallenge needed —
// see the primitives.ts comment on this category for the full reasoning.
const runnerConfig: RunnerConfig = {
  category: "printer3d",
  filenamePrefix: "printer3d",
  includeProductPhoto: true,
  productPhotoDeviceLabel: "3D printer",
  reviewNote:
    "This is deliberately narrow: it checks whether the printer's own Selftest can be seen actively running, then completed, both captured clearly. It does not certify print quality or every mechanical part.",
  prepare: {
    showStandardInstructions: true,
    buttonLabel: "Selftest is running — turn on camera",
  },
  steps: [
    {
      type: "countdown-burst",
      id: "selftest-live-burst",
      label: "Selftest running (live)",
      shotCount: 5,
      intervalMs: 1500,
      countdownSeconds: 2,
      capturingMessage: "Capturing… keep the LCD in view while Selftest runs",
      quality: 0.85,
    },
    {
      type: "single-capture",
      id: "selftest-result",
      label: "Selftest result",
      instructionText: () => "Once Selftest has finished, frame the whole LCD showing the completed result screen.",
      buttonLabel: "Capture Selftest result",
      quality: 0.9,
    },
  ],
  buildSubmission: ({ productPhoto }) => ({
    context: `The first images are a burst captured while Selftest was actively running on the printer's LCD (Calibration → Selftest). The final diagnostic image is the completed Selftest result screen, captured immediately afterward in the same session.${
      productPhoto ? " The very last image is a general photo of the whole printer — not the LCD." : ""
    }`,
    rawData: { hasProductPhoto: !!productPhoto },
  }),
};

export default function Printer3DFlow({ sessionId }: { sessionId: string }) {
  return <GuidedCaptureRunner sessionId={sessionId} config={runnerConfig} />;
}
