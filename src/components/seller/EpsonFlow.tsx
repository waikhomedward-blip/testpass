"use client";

import { RunnerConfig } from "@/lib/runner-types";
import GuidedCaptureRunner from "./GuidedCaptureRunner";

const runnerConfig: RunnerConfig = {
  category: "epson",
  filenamePrefix: "epson",
  includeProductPhoto: true,
  productPhotoDeviceLabel: "printer",
  useChallenge: true,
  challengePrefix: "TP-",
  prepare: {
    showStandardInstructions: true,
    buttonLabel: "I printed it — turn on camera",
  },
  steps: [
    {
      type: "single-capture",
      id: "nozzle-check-page",
      label: "Nozzle check page",
      instructionText: (challenge) =>
        `Frame the whole printed nozzle-check page with ${challenge ?? "your code"} written on it (or placed next to it), and every color's line readable.`,
      buttonLabel: "Capture nozzle check page",
      quality: 0.9,
    },
  ],
  buildSubmission: ({ shots, challenge, productPhoto }) => ({
    context: `Expected one-time code: ${challenge}. The image is a photo of the printer's own built-in nozzle-check test page (from its Maintenance menu), with the code written on or placed next to it.${
      productPhoto ? " The final image is a general photo of the whole printer — not the nozzle-check page." : ""
    }`,
    rawData: { expectedCode: challenge, hasProductPhoto: !!productPhoto, capturedAt: shots[0]?.capturedAt ?? null },
  }),
};

export default function EpsonFlow({ sessionId }: { sessionId: string }) {
  return <GuidedCaptureRunner sessionId={sessionId} config={runnerConfig} />;
}
