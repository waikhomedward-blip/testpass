"use client";

import { RunnerConfig } from "@/lib/runner-types";
import GuidedCaptureRunner from "./GuidedCaptureRunner";

// Scope A: guided capture of DSM's own Storage Manager health page (already
// labeled Healthy/Warning/Critical by DSM itself), not a bespoke SMART/RAID
// telemetry integration. No new runner primitive needed for DSM itself —
// see the EVIDENCE SURFACE RULE note below for how it's captured.
//
// EVIDENCE SURFACE RULE fix (physical-feasibility + error-recovery audit,
// round 2): the previous version told the seller to "point this camera at
// the monitor showing DSM" — unconditionally assuming DSM is open on a
// SEPARATE computer. DSM is a browser-based admin panel reachable from any
// device on the same network (or via QuickConnect), including the seller's
// own phone — so a seller who naturally opens DSM in their phone's own
// browser would have been asked to point TestPass's camera at the very
// phone it's running on, which is impossible. Fixed by switching to a
// same-phone screenshot handoff, exactly DJI/Quest's pattern: the seller
// opens DSM in THIS phone's browser (a "Request desktop site" toggle in
// the browser is a normal way to get DSM's fuller layout on a small
// screen, mentioned as a hint, not asserted as DSM's own mobile design —
// that specific rendering behavior isn't confirmed either way), renames
// the server, screenshots the drive-health page showing that name, and
// picks the file here. This also removes an implicit second-device
// dependency the old copy never should have assumed in the first place —
// nothing about running DSM requires a separate monitor.
//
// Freshness stays MODERATE, not downgraded to WEAK like DJI/Quest's plain
// screenshots: see the evaluationPromptSystem note in primitives.ts for
// why — the session-specific server-name rename is baked into DSM's own
// state, not just a photo taken at some point, so this screenshot can't
// pass as evidence unless the seller genuinely renamed THIS NAS during
// THIS session, moments before the screenshot.
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
    buttonLabel: "Continue",
  },
  steps: [
    {
      type: "file-upload",
      id: "storage-health",
      label: "Drive health + code",
      instructionText: (challenge) =>
        `Using this same phone's own browser, log in to your NAS's DSM and rename it to ${challenge ?? "your code"} (see the code above if you need it again). Then go to Storage Manager → HDD/SSD, where every drive's health status is readable together with the renamed server name somewhere on the page. Take a screenshot on this phone (your phone's own screenshot function, not TestPass's camera) of that page, then come back and choose it below.`,
      pickerLabel: "Choose drive-health screenshot",
    },
  ],
  buildSubmission: ({ challenge, productPhoto }) => ({
    context: `Owner-validation check. Expected one-time server-name code: ${challenge}. The image is a same-phone screenshot of the DSM Storage Manager drive health page, with the code visible as the DSM server's own name somewhere in the captured page (not a separately held object, and not a live TestPass camera capture).${
      productPhoto ? " The final image is a live-camera photo of the whole NAS enclosure, taken by TestPass itself — cosmetic only, not the DSM screen." : ""
    }`,
    rawData: { expectedCode: challenge, evidenceMethod: "screenshot_upload", hasProductPhoto: !!productPhoto },
  }),
};

export default function NASFlow({ sessionId }: { sessionId: string }) {
  return <GuidedCaptureRunner sessionId={sessionId} config={runnerConfig} />;
}
