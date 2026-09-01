"use client";

import { RunnerConfig } from "@/lib/runner-types";
import GuidedCaptureRunner from "./GuidedCaptureRunner";

// The headset's own display faces the wearer — there's no way for an
// external camera to film it directly. Meta's Casting feature (headset →
// Meta Horizon phone app, same Wi-Fi) solves this: it's a live mirror, so
// the seller wears the headset and drives it, and the buyer's TestPass
// camera films the seller's PHONE screen showing the cast, the same way
// PS5/Xbox capture a TV. No new runner primitive needed.
const runnerConfig: RunnerConfig = {
  category: "quest",
  filenamePrefix: "quest",
  includeProductPhoto: true,
  productPhotoDeviceLabel: "headset",
  useChallenge: true,
  challengePrefix: "TP-",
  reviewNote:
    "This is deliberately narrow: it checks whether these two pieces of evidence can be captured clearly and quickly. It does not certify the headset's complete condition, and it can't rule out a block Meta applies later.",
  prepare: {
    showStandardInstructions: true,
    buttonLabel: "I'm casting — turn on camera",
  },
  steps: [
    {
      type: "single-capture",
      id: "device-info",
      label: "Device info + code",
      instructionText: (challenge) =>
        `Point this camera at the phone showing the cast. It should display the headset's Device Info screen (Settings → System → Device Info) with the serial number, and ${challenge ?? "your code"} held next to that phone, both readable together.`,
      buttonLabel: "Capture device info",
      quality: 0.9,
    },
    {
      type: "single-capture",
      id: "store-access",
      label: "Store access",
      instructionText: () =>
        "Without ending this TestPass camera session, open the Meta Quest Store in the headset (still cast to the phone). Wait until real content has loaded, then capture the phone screen.",
      buttonLabel: "Capture Store access",
      quality: 0.9,
    },
  ],
  buildSubmission: ({ challenge, productPhoto }) => ({
    context: `Owner-validation check. Expected one-time challenge code: ${challenge}. Image 1 should show a phone screen displaying the headset's cast Device Info screen together with that code in the same frame. Image 2 should show the Meta Quest Store loaded with real content on the same cast phone screen immediately afterward. Do not infer a device block from a generic connection failure — only from an explicit "can't be activated"-style block message.${
      productPhoto ? " The final image is a general photo of the whole headset — not one of the cast screens." : ""
    }`,
    rawData: { expectedCode: challenge, hasProductPhoto: !!productPhoto },
  }),
};

export default function MetaQuestFlow({ sessionId }: { sessionId: string }) {
  return <GuidedCaptureRunner sessionId={sessionId} config={runnerConfig} />;
}
