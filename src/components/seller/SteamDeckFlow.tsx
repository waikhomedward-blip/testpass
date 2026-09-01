"use client";

import { RunnerConfig } from "@/lib/runner-types";
import GuidedCaptureRunner from "./GuidedCaptureRunner";

const runnerConfig: RunnerConfig = {
  category: "steamdeck",
  filenamePrefix: "steamdeck",
  includeProductPhoto: true,
  productPhotoDeviceLabel: "Steam Deck",
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
      capturingMessage: "Capturing… move both thumbsticks in circles",
      quality: 0.82,
    },
  ],
  buildSubmission: ({ shots, productPhoto }) => ({
    context: productPhoto
      ? "The final image is a general photo of the whole Steam Deck — not part of the calibration burst."
      : "",
    rawData: { frameCount: shots.length, burstIntervalMs: 500, hasProductPhoto: !!productPhoto },
  }),
};

export default function SteamDeckFlow({ sessionId }: { sessionId: string }) {
  return <GuidedCaptureRunner sessionId={sessionId} config={runnerConfig} />;
}
