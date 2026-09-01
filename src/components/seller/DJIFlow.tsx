"use client";

import { RunnerConfig } from "@/lib/runner-types";
import GuidedCaptureRunner from "./GuidedCaptureRunner";

const runnerConfig: RunnerConfig = {
  category: "dji",
  filenamePrefix: "dji",
  includeProductPhoto: true,
  productPhotoDeviceLabel: "drone",
  retakeButtonLabel: "Retake both",
  prepare: {
    showStandardInstructions: true,
    buttonLabel: "Turn on camera",
  },
  steps: [
    {
      type: "single-capture",
      id: "status-screen",
      label: "Status screen",
      instructionText: () => "Frame the aircraft's status screen (serial number, binding status, warnings) and capture it.",
      buttonLabel: "Capture status screen",
    },
    {
      type: "single-capture",
      id: "battery-screen",
      label: "Battery screen",
      instructionText: () => "Now frame the battery detail screen and capture it.",
      buttonLabel: "Capture battery screen",
    },
  ],
  buildSubmission: ({ shots, productPhoto }) => ({
    context: `Screens captured, in order: ${shots.map((s) => s.label).join(", ")}.${
      productPhoto ? " The final image is a general photo of the whole drone — not one of the app screens." : ""
    }`,
    rawData: { shotLabels: shots.map((s) => s.label), hasProductPhoto: !!productPhoto },
  }),
};

export default function DJIFlow({ sessionId }: { sessionId: string }) {
  return <GuidedCaptureRunner sessionId={sessionId} config={runnerConfig} />;
}
