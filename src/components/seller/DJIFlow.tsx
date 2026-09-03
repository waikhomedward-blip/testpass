"use client";

import { RunnerConfig } from "@/lib/runner-types";
import GuidedCaptureRunner from "./GuidedCaptureRunner";

// One-Phone Seller Principle redesign — see the "dji" entry in
// src/lib/primitives.ts for the full story. The old design asked the
// seller to hold a TestPass code next to a screen shown on the very phone
// that was about to become the camera, which is physically impossible
// without a second device. Both steps are now same-phone companion-app
// screenshot handoffs instead of live captures, so no challenge code is
// generated at all — there's nothing left to hold up in a photo.
const runnerConfig: RunnerConfig = {
  category: "dji",
  filenamePrefix: "dji",
  includeProductPhoto: true,
  productPhotoDeviceLabel: "drone",
  retakeButtonLabel: "Retake both",
  reviewNote:
    "This is deliberately narrow: these are screenshots from the DJI app, not live captures, so they can't prove the app's connection to the aircraft is live right now. It does not certify the drone's complete condition.",
  prepare: {
    showStandardInstructions: true,
    buttonLabel: "Continue",
  },
  steps: [
    {
      type: "file-upload",
      id: "status-screen",
      label: "Status screen",
      instructionText:
        "In the DJI Fly or DJI GO 4 app on this phone, open the aircraft's status screen (serial number, binding status, warnings) and screenshot it. Then choose that screenshot below.",
      pickerLabel: "Choose status screenshot",
    },
    {
      type: "file-upload",
      id: "battery-screen",
      label: "Battery screen",
      instructionText:
        "Now do the same for the battery detail screen (cycle count / health, if shown): screenshot it, then choose it below.",
      pickerLabel: "Choose battery screenshot",
    },
  ],
  buildSubmission: ({ shots, productPhoto }) => ({
    context: `Screens submitted, in order: ${shots.map((s) => s.label).join(", ")}. Both are same-phone screenshots of the DJI app, not live camera captures — Image 1 is the aircraft status screen, Image 2 is the battery detail screen, taken moments apart in the same session.${
      productPhoto ? " The final image is a general, live-camera photo of the whole drone — cosmetic only, not part of the app-screen evidence." : ""
    }`,
    rawData: {
      shotLabels: shots.map((s) => s.label),
      evidenceMethod: "screenshot_upload",
      hasProductPhoto: !!productPhoto,
    },
  }),
};

export default function DJIFlow({ sessionId }: { sessionId: string }) {
  return <GuidedCaptureRunner sessionId={sessionId} config={runnerConfig} />;
}
