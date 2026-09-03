"use client";

import { RunnerConfig } from "@/lib/runner-types";
import GuidedCaptureRunner from "./GuidedCaptureRunner";

// One-Phone Seller Principle redesign — see the "quest" entry in
// src/lib/primitives.ts. The old design pointed TestPass's own camera at a
// SECOND phone doing the casting, with a code held next to it — a Quest
// test silently required two phones plus a code. Both evidence steps are
// now same-phone screenshot handoffs: the seller casts and screenshots on
// the one phone also running TestPass, then picks those files here. No
// challenge code — there's nothing to hold up in a photo anymore.
const runnerConfig: RunnerConfig = {
  category: "quest",
  filenamePrefix: "quest",
  includeProductPhoto: true,
  productPhotoDeviceLabel: "headset",
  reviewNote:
    "This is deliberately narrow: these are screenshots of a cast, not live captures, so they can't prove the headset's connection is live right now. It does not certify the headset's complete condition, and it can't rule out a block Meta applies later.",
  prepare: {
    showStandardInstructions: true,
    buttonLabel: "Continue",
  },
  steps: [
    {
      type: "file-upload",
      id: "device-info",
      label: "Device info",
      instructionText:
        "With the headset cast to this phone via the Meta Horizon app, go to Settings → System → Device Info in the headset so the cast shows the serial number, then screenshot this phone's cast view and choose that screenshot below.",
      pickerLabel: "Choose Device Info screenshot",
    },
    {
      type: "file-upload",
      id: "store-access",
      label: "Store access",
      instructionText:
        "Still casting, open the Meta Quest Store in the headset and wait for real content to load. Screenshot the cast, then choose it below.",
      pickerLabel: "Choose Store screenshot",
    },
  ],
  buildSubmission: ({ shots, productPhoto }) => ({
    context: `Owner-validation check. Both images are same-phone screenshots of a cast, not live camera captures. Image 1 should show the headset's cast Device Info screen with a visible serial number. Image 2 should show the Meta Quest Store loaded with real content on the same cast phone screen, taken moments later. Do not infer a device block from a generic connection failure — only from an explicit "can't be activated"-style block message.${
      productPhoto ? " The final image is a general, live-camera photo of the whole headset — cosmetic only, not one of the cast screens." : ""
    }`,
    rawData: {
      shotLabels: shots.map((s) => s.label),
      evidenceMethod: "screenshot_upload",
      hasProductPhoto: !!productPhoto,
    },
  }),
};

export default function MetaQuestFlow({ sessionId }: { sessionId: string }) {
  return <GuidedCaptureRunner sessionId={sessionId} config={runnerConfig} />;
}
