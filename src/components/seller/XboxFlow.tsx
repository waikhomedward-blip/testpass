"use client";

import { RunnerConfig } from "@/lib/runner-types";
import GuidedCaptureRunner from "./GuidedCaptureRunner";

const runnerConfig: RunnerConfig = {
  category: "xbox",
  filenamePrefix: "xbox",
  includeProductPhoto: true,
  productPhotoDeviceLabel: "Xbox",
  useChallenge: true,
  challengePrefix: "TP-",
  reviewNote:
    "This is deliberately narrow: it checks whether these two pieces of evidence can be captured clearly and quickly. It does not certify the console's complete condition.",
  prepare: {
    showStandardInstructions: true,
    buttonLabel: "Turn on camera",
  },
  steps: [
    {
      type: "single-capture",
      id: "console-info",
      label: "Console info + code",
      instructionText: (challenge) =>
        `Show the Xbox Console Info screen (Settings → System → Console Info) with the serial number visible, holding ${challenge ?? "your code"} in the same frame, both readable together.`,
      buttonLabel: "Capture console info",
      quality: 0.9,
    },
    {
      type: "single-capture",
      id: "store-access",
      label: "Store access",
      instructionText: () =>
        "Without ending this TestPass camera session, open the Microsoft Store app. Wait until real content has loaded, then capture it.",
      buttonLabel: "Capture Store access",
      quality: 0.9,
    },
  ],
  buildSubmission: ({ challenge, productPhoto }) => ({
    context: `Owner-validation check. Expected one-time challenge code: ${challenge}. Image 1 should show the Xbox Console Info screen together with that code in the same frame. Image 2 should show the Microsoft Store loaded with real content on the same console immediately afterward. Do not infer a console ban from a generic connection failure.${
      productPhoto ? " The final image is a general photo of the whole console — not one of the diagnostic screens." : ""
    }`,
    rawData: { expectedCode: challenge, hasProductPhoto: !!productPhoto },
  }),
};

export default function XboxFlow({ sessionId }: { sessionId: string }) {
  return <GuidedCaptureRunner sessionId={sessionId} config={runnerConfig} />;
}
