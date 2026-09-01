"use client";

import { RunnerConfig } from "@/lib/runner-types";
import GuidedCaptureRunner from "./GuidedCaptureRunner";

// Hardening addition (evidence-strength audit): a handwritten code next to
// the finished page only proved the photo was fresh, not that the page
// itself was printed this session (paper has no freshness signal of its
// own — an old good printout could sit under today's code indefinitely).
// Fixed by adding a live-print burst before the existing final capture,
// which is kept unchanged. See the primitives.ts comment on this category.
const runnerConfig: RunnerConfig = {
  category: "epson",
  filenamePrefix: "epson",
  includeProductPhoto: true,
  productPhotoDeviceLabel: "printer",
  useChallenge: true,
  challengePrefix: "TP-",
  prepare: {
    showStandardInstructions: true,
    buttonLabel: "I started printing — turn on camera",
  },
  steps: [
    {
      type: "countdown-burst",
      id: "nozzle-check-printing",
      label: "Printing (live)",
      shotCount: 4,
      intervalMs: 1000,
      countdownSeconds: 2,
      capturingMessage: "Capturing… keep the printer's output area in view",
      quality: 0.85,
    },
    {
      type: "single-capture",
      id: "nozzle-check-page",
      label: "Nozzle check page + code",
      instructionText: (challenge) =>
        `Once the page has fully printed, frame the whole page with ${challenge ?? "your code"} written on it (or placed next to it), and every color's line readable.`,
      buttonLabel: "Capture nozzle check page",
      quality: 0.9,
    },
  ],
  buildSubmission: ({ shots, challenge, productPhoto }) => ({
    context: `Expected one-time code: ${challenge}. The first images are a burst captured while the printer was actively printing its nozzle-check page. The final diagnostic image is a photo of the finished page (from its Maintenance menu), with the code written on or placed next to it.${
      productPhoto ? " The very last image is a general photo of the whole printer — not the nozzle-check page." : ""
    }`,
    rawData: { expectedCode: challenge, hasProductPhoto: !!productPhoto, capturedAt: shots[0]?.capturedAt ?? null },
  }),
};

export default function EpsonFlow({ sessionId }: { sessionId: string }) {
  return <GuidedCaptureRunner sessionId={sessionId} config={runnerConfig} />;
}
