"use client";

import { RunnerConfig } from "@/lib/runner-types";
import GuidedCaptureRunner from "./GuidedCaptureRunner";

// Scope A: guided capture of DSM's own Storage Manager health page (already
// labeled Healthy/Warning/Critical by DSM itself), not a bespoke SMART/RAID
// telemetry integration. DSM is a browser dashboard, so the seller
// photographs whatever monitor is showing it — same idiom as photographing
// a TV for PS5/Xbox. No new runner primitive or file-upload step needed.
const runnerConfig: RunnerConfig = {
  category: "nas",
  filenamePrefix: "nas",
  includeProductPhoto: true,
  productPhotoDeviceLabel: "NAS",
  useChallenge: true,
  challengePrefix: "TP-",
  reviewNote:
    "This is deliberately narrow: it checks whether DSM's own drive health page can be captured clearly and freshly. It does not certify the enclosure's fans, power supply, or network hardware.",
  prepare: {
    showStandardInstructions: true,
    challengeHint:
      "In DSM: Control Panel → Network (General tab) → Server Name. Enter this code exactly, then Apply — you can change it back afterward, that doesn't affect this test.",
    buttonLabel: "I renamed it — turn on camera",
  },
  steps: [
    {
      type: "single-capture",
      id: "storage-health",
      label: "Drive health + code",
      instructionText: (challenge) =>
        `Point this camera at the monitor showing DSM's Storage Manager → HDD/SSD page, with every drive's health status readable, and ${challenge ?? "your code"} visible somewhere in the same browser window (the tab title or a DSM header showing the renamed server).`,
      buttonLabel: "Capture drive health",
      quality: 0.9,
    },
  ],
  buildSubmission: ({ challenge, productPhoto }) => ({
    context: `Owner-validation check. Expected one-time server-name code: ${challenge}. The image is a photo of a monitor showing the DSM Storage Manager drive health page, with the code visible as the DSM server's own name somewhere in the same captured browser window (not a separately held object).${
      productPhoto ? " The final image is a general photo of the whole NAS enclosure — not the DSM screen." : ""
    }`,
    rawData: { expectedCode: challenge, hasProductPhoto: !!productPhoto },
  }),
};

export default function NASFlow({ sessionId }: { sessionId: string }) {
  return <GuidedCaptureRunner sessionId={sessionId} config={runnerConfig} />;
}
