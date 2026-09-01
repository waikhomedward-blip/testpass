"use client";

import { RunnerConfig } from "@/lib/runner-types";
import GuidedCaptureRunner from "./GuidedCaptureRunner";

const runnerConfig: RunnerConfig = {
  category: "projector",
  filenamePrefix: "projector",
  includeProductPhoto: true,
  productPhotoDeviceLabel: "projector",
  useChallenge: true,
  challengePrefix: "TP-",
  reviewNote:
    "This is deliberately narrow: it checks for visible dead pixels, discoloration, and focus unevenness in the projector's own test pattern. It is not a brightness or lumen measurement.",
  prepare: {
    showStandardInstructions: true,
    challengeHint:
      "On the projector: Menu → Settings → Test Pattern → select a pattern. Point it at any wall in a reasonably dim room — no computer or HDMI source needed.",
    buttonLabel: "Pattern's up — turn on camera",
  },
  steps: [
    {
      type: "single-capture",
      id: "test-pattern",
      label: "Test pattern + code",
      instructionText: (challenge) =>
        `Frame the whole projected test pattern with ${challenge ?? "your code"} held in the same shot (without blocking the image), both readable.`,
      buttonLabel: "Capture test pattern",
      quality: 0.9,
    },
  ],
  buildSubmission: ({ challenge, productPhoto }) => ({
    context: `Expected one-time code: ${challenge}. The image is a photo of the projector's own built-in test pattern (from its Settings → Test Pattern menu), projected onto a wall or screen, with the code held or placed in the same frame. This test does not measure brightness or lumen output — do not infer that from the photo.${
      productPhoto ? " The final image is a general photo of the whole projector — not the projected pattern." : ""
    }`,
    rawData: { expectedCode: challenge, hasProductPhoto: !!productPhoto },
  }),
};

export default function ProjectorFlow({ sessionId }: { sessionId: string }) {
  return <GuidedCaptureRunner sessionId={sessionId} config={runnerConfig} />;
}
