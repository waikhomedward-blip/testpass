"use client";

import { RunnerConfig } from "@/lib/runner-types";
import GuidedCaptureRunner from "./GuidedCaptureRunner";

const runnerConfig: RunnerConfig = {
  category: "printer3d",
  filenamePrefix: "printer3d",
  includeProductPhoto: true,
  productPhotoDeviceLabel: "3D printer",
  useChallenge: true,
  challengePrefix: "TP-",
  reviewNote:
    "This is deliberately narrow: it checks whether the printer's own Selftest result screen can be captured clearly and freshly. It does not certify print quality or every mechanical part.",
  prepare: {
    showStandardInstructions: true,
    challengeHint:
      "On the printer's LCD: Calibration → Selftest → Start. Stay nearby for the Loadcell, Gearbox, and Filament sensor steps, which need you to respond on screen.",
    buttonLabel: "I ran Selftest — turn on camera",
  },
  steps: [
    {
      type: "single-capture",
      id: "selftest-result",
      label: "Selftest result + code",
      instructionText: (challenge) =>
        `Frame the whole LCD showing the Selftest result screen, with ${challenge ?? "your code"} written on paper or held next to it, both readable in one photo.`,
      buttonLabel: "Capture Selftest result",
      quality: 0.9,
    },
  ],
  buildSubmission: ({ challenge, productPhoto }) => ({
    context: `Expected one-time code: ${challenge}. The image is a photo of the printer's own built-in Selftest result screen (LCD Menu → Calibration → Selftest), with the code written on or placed next to it.${
      productPhoto ? " The final image is a general photo of the whole printer — not the Selftest screen." : ""
    }`,
    rawData: { expectedCode: challenge, hasProductPhoto: !!productPhoto },
  }),
};

export default function Printer3DFlow({ sessionId }: { sessionId: string }) {
  return <GuidedCaptureRunner sessionId={sessionId} config={runnerConfig} />;
}
