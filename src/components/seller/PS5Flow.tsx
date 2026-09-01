"use client";

import { RunnerConfig } from "@/lib/runner-types";
import GuidedCaptureRunner from "./GuidedCaptureRunner";

const runnerConfig: RunnerConfig = {
  category: "ps5",
  filenamePrefix: "ps5",
  includeProductPhoto: false,
  reviewNote:
    "This experiment is deliberately narrow: it checks whether these two pieces of evidence can be captured clearly and quickly. It does not certify the PS5's complete condition.",
  submitButtonLabel: "Submit experiment",
  useChallenge: true,
  challengePrefix: "TP-",
  prepare: {
    showStandardInstructions: false,
    introTitle: "PS5 owner-validation experiment",
    introDescription:
      "This is testing whether a normal PS5 owner can create fresh, readable evidence of console identity and current PlayStation online access in about two minutes.",
    notes: [
      "Your PS5 should already be set up and signed in to PlayStation Network.",
      "Keep this phone pointed at the TV/monitor during both captures.",
      "TestPass never asks for your PlayStation password or verification codes.",
    ],
    challengeHint:
      "On the PS5, open Settings → System → System Software → Console Information and temporarily set the console name to this code. If your console does not offer a rename option there, stop — that is useful validation feedback.",
    buttonLabel: "I renamed it — turn on camera",
  },
  steps: [
    {
      type: "single-capture",
      id: "console-information",
      label: "Console information",
      instructionText: (challenge) =>
        `Keep the full Console Information screen readable. We need to see ${challenge ?? "your code"} and the console serial in the same capture.`,
      buttonLabel: "Capture console info",
      quality: 0.9,
    },
    {
      type: "single-capture",
      id: "online-access",
      label: "Online access",
      instructionText: () =>
        "Without ending this TestPass camera session, return Home and open PlayStation Store. Wait until real Store content has loaded, then capture it.",
      buttonLabel: "Capture online access",
      quality: 0.9,
    },
  ],
  buildSubmission: ({ shots, challenge, startedAt }) => {
    const consoleInfo = shots.find((s) => s.stepId === "console-information");
    const onlineAccess = shots.find((s) => s.stepId === "online-access");
    return {
      context: `Owner-validation experiment. Expected one-time console-name challenge: ${challenge}. Image 1 should show the PS5 Console Information screen with that challenge as the console name and a readable console serial. Image 2 should show PlayStation Store or another clearly online PlayStation service loaded on the same console immediately afterward. Do not infer a console ban from a generic connection failure.`,
      rawData: {
        experiment: "ps5-owner-validation-v0",
        challenge,
        totalElapsedMs: Date.now() - startedAt,
        consoleInfoCapturedAt: consoleInfo?.capturedAt ?? null,
        onlineAccessCapturedAt: onlineAccess?.capturedAt ?? null,
        captureGapMs:
          consoleInfo && onlineAccess ? onlineAccess.capturedAt - consoleInfo.capturedAt : null,
      },
    };
  },
};

export default function PS5Flow({ sessionId }: { sessionId: string }) {
  return <GuidedCaptureRunner sessionId={sessionId} config={runnerConfig} />;
}
