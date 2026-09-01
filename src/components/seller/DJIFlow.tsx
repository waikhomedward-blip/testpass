"use client";

import { RunnerConfig } from "@/lib/runner-types";
import GuidedCaptureRunner from "./GuidedCaptureRunner";

const runnerConfig: RunnerConfig = {
  category: "dji",
  filenamePrefix: "dji",
  includeProductPhoto: true,
  productPhotoDeviceLabel: "drone",
  retakeButtonLabel: "Retake both",
  useChallenge: true,
  challengePrefix: "TP-",
  reviewNote:
    "This is deliberately narrow: the code proves the status-screen photo is fresh from this session. It does not prove the app's connection to the aircraft is live, or certify the drone's complete condition.",
  prepare: {
    showStandardInstructions: true,
    challengeHint: "Hold this code next to your phone/tablet showing the aircraft's status screen for the first capture.",
    buttonLabel: "Turn on camera",
  },
  steps: [
    {
      type: "single-capture",
      id: "status-screen",
      label: "Status screen + code",
      instructionText: (challenge) =>
        `Frame the aircraft's status screen (serial number, binding status, warnings) with ${challenge ?? "your code"} held next to your phone/tablet, both readable.`,
      buttonLabel: "Capture status screen",
    },
    {
      type: "single-capture",
      id: "battery-screen",
      label: "Battery screen",
      instructionText: () => "Without ending this TestPass camera session, now frame the battery detail screen and capture it.",
      buttonLabel: "Capture battery screen",
    },
  ],
  buildSubmission: ({ shots, challenge, productPhoto }) => ({
    context: `Expected one-time code: ${challenge}. Screens captured, in order: ${shots.map((s) => s.label).join(", ")}. Image 1 should show the code held next to the app's status screen. Image 2 is the battery detail screen, captured in the same session immediately afterward.${
      productPhoto ? " The final image is a general photo of the whole drone — not one of the app screens." : ""
    }`,
    rawData: { expectedCode: challenge, shotLabels: shots.map((s) => s.label), hasProductPhoto: !!productPhoto },
  }),
};

export default function DJIFlow({ sessionId }: { sessionId: string }) {
  return <GuidedCaptureRunner sessionId={sessionId} config={runnerConfig} />;
}
