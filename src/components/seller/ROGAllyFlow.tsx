"use client";

import { RunnerConfig } from "@/lib/runner-types";
import GuidedCaptureRunner from "./GuidedCaptureRunner";

// V1 is deliberately Calibration-only — see the primitives.ts comment on
// the "rogally" category for why the powercfg battery-report signal was
// left out of this wave rather than added as a second step.
const runnerConfig: RunnerConfig = {
  category: "rogally",
  filenamePrefix: "rogally",
  includeProductPhoto: true,
  productPhotoDeviceLabel: "ROG Ally",
  prepare: {
    showStandardInstructions: true,
    buttonLabel: "Turn on camera",
  },
  steps: [
    {
      type: "countdown-burst",
      id: "calibration-burst",
      label: "Calibration burst",
      shotCount: 5,
      intervalMs: 500,
      countdownSeconds: 3,
      capturingMessage: "Capturing… move both sticks in circles and pull both triggers",
      quality: 0.82,
    },
  ],
  buildSubmission: ({ shots, productPhoto }) => ({
    context: productPhoto
      ? "The final image is a general photo of the whole ROG Ally — not part of the calibration burst."
      : "",
    rawData: { frameCount: shots.length, burstIntervalMs: 500, hasProductPhoto: !!productPhoto },
  }),
};

export default function ROGAllyFlow({ sessionId }: { sessionId: string }) {
  return <GuidedCaptureRunner sessionId={sessionId} config={runnerConfig} />;
}
