"use client";

import { RunnerConfig } from "@/lib/runner-types";
import GuidedCaptureRunner from "./GuidedCaptureRunner";

// One-Phone Seller Principle redesign — see the "dji" entry in
// src/lib/primitives.ts for the full story. The old design asked the
// seller to hold a TestPass code next to a screen shown on the very phone
// that was about to become the camera, which is physically impossible
// without a second device. Both status/battery steps are same-phone
// companion-app screenshot handoffs instead of live captures, so no
// challenge code is generated at all — there's nothing left to hold up in
// a photo.
//
// EVIDENCE SURFACE RULE round 2 (physical-feasibility + error-recovery
// audit): the owner flagged that even after the one-phone fix, the
// distinction between "screenshot the DJI app" and "photograph the
// aircraft" wasn't conceptually obvious enough in the flow. Fixed at the
// copy level below (every screenshot instruction says "on this phone",
// every camera instruction says "TestPass's own camera" / "in front of
// you" — never an ambiguous "take a picture of this screen"), not just by
// restructuring steps — Norman: the mechanic was already right, the
// seller just couldn't tell which mode they were in from the words alone.
//
// Screen count: kept at two screenshots (status, then battery), not
// merged into one. Verified via DJI Fly/GO 4 documentation and third-party
// walkthroughs (support.dji.com blocks automated fetches, so this used
// secondary sources) that the aircraft's serial/binding/warning info and
// its battery cycle-count/health live on two separate screens reached via
// different menu paths in DJI Fly — inventing a single merged screen that
// wasn't confirmed to exist would violate "verify before claiming."
// Instruction text below describes each screen by what it shows and where
// it's generally found, not a rigid tap-by-tap path, since exact wording
// varies by DJI Fly version and aircraft model.
//
// Same-unit serial matching: NOT implemented as an automated check this
// round. DJI Fly's aircraft-status screen very likely shows an "Aircraft
// SN", and most aircraft also carry a physical serial label — but its
// exact on-screen wording and the label's exact physical location vary
// enough by app version and model that an automated vision-model
// comparison risks a confident-sounding false match or false mismatch,
// which is worse than the honest WEAK association this category already
// declares. Per the instruction to keep association honestly weak absent
// a verified reliable identifier: the product photo below now asks the
// seller to include the visible serial label if it's easily readable
// without disassembly, purely so a buyer can eyeball it against the app
// screenshot themselves — the evaluator may mention it in the optional,
// non-scoring cosmetic_note, but association_strength still stays capped
// at WEAK (see the evaluationPromptSystem in primitives.ts).
const runnerConfig: RunnerConfig = {
  category: "dji",
  filenamePrefix: "dji",
  includeProductPhoto: true,
  productPhotoDeviceLabel: "drone",
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
        "On this same phone, open DJI Fly (or DJI GO 4) and find the aircraft's status / device info screen — it shows the serial number, binding status, and any active warnings. Take a screenshot on this phone (your phone's own screenshot function, not TestPass's camera), then come back here and choose that screenshot below.",
      pickerLabel: "Choose status screenshot",
    },
    {
      type: "file-upload",
      id: "battery-screen",
      label: "Battery screen",
      instructionText:
        "Now, still in the DJI app on this phone, find the battery detail screen (cycle count / health, if it's shown). Take a screenshot on this phone, then choose it below.",
      pickerLabel: "Choose battery screenshot",
    },
  ],
  buildSubmission: ({ shots, productPhoto }) => ({
    context: `Screens submitted, in order: ${shots.map((s) => s.label).join(", ")}. Both are same-phone screenshots of the DJI app, not live camera captures — Image 1 is the aircraft status screen, Image 2 is the battery detail screen, taken moments apart in the same session.${
      productPhoto
        ? " The final image is a live-camera photo of the whole aircraft, taken by TestPass itself (not a screenshot) — cosmetic only, and it may show the aircraft's physical serial label if the seller could read it without disassembly."
        : ""
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
