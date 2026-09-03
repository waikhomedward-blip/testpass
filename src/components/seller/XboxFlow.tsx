"use client";

import { RunnerConfig } from "@/lib/runner-types";
import GuidedCaptureRunner from "./GuidedCaptureRunner";

// Round 2 (physical-feasibility + error-recovery audit): both steps are
// already Evidence Surface A (TestPass's own live camera pointed at the
// console's normal on-screen display) — no same-phone-screenshot ambiguity
// here, and both single-capture steps automatically inherited the shared
// runner's per-shot Retake/Use confirm. The one real defect found and
// fixed here was in primitives.ts, not this file: includeProductPhoto is
// true, but this category's evaluationPromptSystem never appended
// PRODUCT_PHOTO_ADDENDUM — the evaluator model was silently handed a third
// image (the live console photo below) with no instruction about what it
// was or that it must not affect the verdict. Quest had the identical
// bug; both are fixed now.
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
    // Xbox does have an on-console rename (Settings → System → Console Info
    // → Name, per Microsoft's own support docs) — the same mechanism PS5
    // uses, not a weaker "hold a paper code" one. Unlike PS5, Xbox requires
    // a restart before the new name takes effect, so that's called out
    // explicitly right next to the code.
    challengeHint:
      "On the Xbox: Settings → System → Console Info → Name. Enter this code exactly, select Enter, then restart the console — the new name only shows up after a restart.",
    buttonLabel: "I renamed it — turn on camera",
  },
  steps: [
    {
      type: "single-capture",
      id: "console-info",
      label: "Console info + code",
      instructionText: (challenge) =>
        `After restarting, show the Xbox Console Info screen (Settings → System → Console Info) with the console's name now reading ${challenge ?? "your code"} and the serial number both readable.`,
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
    context: `Owner-validation check. Expected one-time challenge code: ${challenge}. Image 1 should show the Xbox Console Info screen with the console's own name field showing that code (a fresh on-console rename, not a held object), plus a readable serial number. Image 2 should show the Microsoft Store loaded with real content on the same console immediately afterward. Do not infer a console ban from a generic connection failure.${
      productPhoto ? " The final image is a general photo of the whole console — not one of the diagnostic screens." : ""
    }`,
    rawData: { expectedCode: challenge, hasProductPhoto: !!productPhoto },
  }),
};

export default function XboxFlow({ sessionId }: { sessionId: string }) {
  return <GuidedCaptureRunner sessionId={sessionId} config={runnerConfig} />;
}
