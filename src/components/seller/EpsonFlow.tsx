"use client";

import { RunnerConfig } from "@/lib/runner-types";
import GuidedCaptureRunner from "./GuidedCaptureRunner";

// Hardening addition (evidence-strength audit): a handwritten code next to
// the finished page only proved the photo was fresh, not that the page
// itself was printed this session (paper has no freshness signal of its
// own — an old good printout could sit under today's code indefinitely).
// Fixed by adding a live-print burst before the existing final capture.
//
// One-Phone Seller Principle follow-up: the burst alone now does the real
// freshness work, so the handwritten/adjacent code was dropped — it was a
// second, weaker mechanism proving less than the burst already does, and
// asking the seller to grab a pen for TestPass's sake wasn't buying
// anything. See the primitives.ts comment on this category.
const runnerConfig: RunnerConfig = {
  category: "epson",
  filenamePrefix: "epson",
  includeProductPhoto: true,
  productPhotoDeviceLabel: "printer",
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
      label: "Nozzle check page",
      instructionText: () => "Once the page has fully printed, frame the whole page with every color's line readable.",
      buttonLabel: "Capture nozzle check page",
      quality: 0.9,
    },
  ],
  buildSubmission: ({ shots, productPhoto }) => ({
    context: `The first images are a burst captured while the printer was actively printing its nozzle-check page. The final diagnostic image is a photo of the finished page (from its Maintenance menu).${
      productPhoto ? " The very last image is a general photo of the whole printer — not the nozzle-check page." : ""
    }`,
    rawData: { hasProductPhoto: !!productPhoto, capturedAt: shots[0]?.capturedAt ?? null },
  }),
};

export default function EpsonFlow({ sessionId }: { sessionId: string }) {
  return <GuidedCaptureRunner sessionId={sessionId} config={runnerConfig} />;
}
