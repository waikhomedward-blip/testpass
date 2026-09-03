"use client";

import { RunnerConfig } from "@/lib/runner-types";
import GuidedCaptureRunner from "./GuidedCaptureRunner";

// One-Phone Seller Principle redesign — see the "projector" entry in
// src/lib/primitives.ts. The old design asked the seller to hold a code in
// the same frame as the projected image, but the code lived on the same
// phone that was about to become the camera — physically impossible to
// satisfy alone. No challenge code anymore: a live projected test pattern
// only exists while a working projector is actively showing it, so the
// live TestPass capture itself is the freshness signal.
const runnerConfig: RunnerConfig = {
  category: "projector",
  filenamePrefix: "projector",
  includeProductPhoto: true,
  productPhotoDeviceLabel: "projector",
  reviewNote:
    "This is deliberately narrow: it checks for visible dead pixels, discoloration, and focus unevenness in the projector's own test pattern. It is not a brightness or lumen measurement.",
  prepare: {
    showStandardInstructions: true,
    buttonLabel: "Pattern's up — turn on camera",
  },
  steps: [
    {
      type: "single-capture",
      id: "test-pattern",
      label: "Test pattern",
      instructionText: () => "Frame the whole projected test pattern in the shot, then capture.",
      buttonLabel: "Capture test pattern",
      quality: 0.9,
    },
  ],
  buildSubmission: ({ productPhoto }) => ({
    context: `The image is a live camera photo of the projector's own built-in test pattern (from its Settings → Test Pattern menu), projected onto a wall or screen. This test does not measure brightness or lumen output — do not infer that from the photo.${
      productPhoto ? " The final image is a general photo of the whole projector — not the projected pattern." : ""
    }`,
    rawData: { hasProductPhoto: !!productPhoto },
  }),
};

export default function ProjectorFlow({ sessionId }: { sessionId: string }) {
  return <GuidedCaptureRunner sessionId={sessionId} config={runnerConfig} />;
}
