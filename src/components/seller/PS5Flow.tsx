"use client";

import { useEffect, useState } from "react";
import { newChallengeCode } from "@/lib/challenge";
import { submitCapture } from "@/lib/submit-capture";
import StepIndicator from "./StepIndicator";
import SubmittedScreen from "./SubmittedScreen";
import CameraStage from "./CameraStage";
import { useCamera } from "./useCamera";

const STEPS = ["Prepare", "Console info", "Online access", "Review", "Submit"];

type Phase =
  | "prepare"
  | "console-info"
  | "online-access"
  | "review"
  | "submitting"
  | "done"
  | "submit-error";

export default function PS5Flow({ sessionId }: { sessionId: string }) {
  // Generate the one-time challenge only after hydration. Client Components
  // are also pre-rendered on the server, so generating randomness during the
  // initial render can make the server HTML differ from the first browser
  // render and cause a hydration mismatch.
  const [challenge, setChallenge] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("prepare");
  const [consoleInfo, setConsoleInfo] = useState<string | null>(null);
  const [onlineAccess, setOnlineAccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [consoleInfoCapturedAt, setConsoleInfoCapturedAt] = useState<number | null>(null);
  const [onlineAccessCapturedAt, setOnlineAccessCapturedAt] = useState<number | null>(null);

  const { videoRef, canvasRef, state: cameraState, videoReady, setVideoReady, start, stop, capture } = useCamera();

  useEffect(() => {
    setChallenge(`TP-${newChallengeCode()}`);
  }, []);

  async function beginConsoleInfoCapture() {
    if (!challenge) return;
    await start();
    setPhase("console-info");
  }

  function captureConsoleInfo() {
    const shot = capture(0.9);
    if (!shot) return;
    setConsoleInfo(shot);
    setConsoleInfoCapturedAt(Date.now());
    setPhase("online-access");
  }

  function captureOnlineAccess() {
    const shot = capture(0.9);
    if (!shot) return;
    setOnlineAccess(shot);
    setOnlineAccessCapturedAt(Date.now());
    stop();
    setPhase("review");
  }

  async function retake() {
    setConsoleInfo(null);
    setOnlineAccess(null);
    setConsoleInfoCapturedAt(null);
    setOnlineAccessCapturedAt(null);
    await start();
    setPhase("console-info");
  }

  async function submit() {
    if (!challenge || !consoleInfo || !onlineAccess) return;
    setPhase("submitting");
    setErrorMsg(null);
    try {
      const { verdict } = await submitCapture({
        sessionId,
        images: [
          {
            base64: consoleInfo,
            mediaType: "image/jpeg",
            filename: "ps5-console-information.jpg",
          },
          {
            base64: onlineAccess,
            mediaType: "image/jpeg",
            filename: "ps5-online-access.jpg",
          },
        ],
        context: `Owner-validation experiment. Expected one-time console-name challenge: ${challenge}. Image 1 should show the PS5 Console Information screen with that challenge as the console name and a readable console serial. Image 2 should show PlayStation Store or another clearly online PlayStation service loaded on the same console immediately afterward. Do not infer a console ban from a generic connection failure.`,
        rawData: {
          experiment: "ps5-owner-validation-v0",
          challenge,
          totalElapsedMs: Date.now() - startedAt,
          consoleInfoCapturedAt,
          onlineAccessCapturedAt,
          captureGapMs:
            consoleInfoCapturedAt && onlineAccessCapturedAt
              ? onlineAccessCapturedAt - consoleInfoCapturedAt
              : null,
        },
      });
      setVerdict(verdict);
      setPhase("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Submission failed.");
      setPhase("submit-error");
    }
  }

  if (phase === "prepare") {
    return (
      <div className="space-y-5">
        <StepIndicator steps={STEPS} current={0} />
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-semibold">PS5 owner-validation experiment</p>
          <p className="mt-1 text-sm text-foreground/60">
            This is testing whether a normal PS5 owner can create fresh, readable evidence of console identity and current PlayStation online access in about two minutes.
          </p>
        </div>
        <div className="space-y-3 text-sm">
          <p className="font-medium">Before you start</p>
          <ul className="list-disc space-y-1.5 pl-5 text-foreground/70">
            <li>Your PS5 should already be set up and signed in to PlayStation Network.</li>
            <li>Keep this phone pointed at the TV/monitor during both captures.</li>
            <li>TestPass never asks for your PlayStation password or verification codes.</li>
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">Your one-time console name</p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-wider">
            {challenge ?? "Preparing…"}
          </p>
          <p className="mt-2 text-xs text-foreground/50">
            On the PS5, open Settings → System → System Software → Console Information and temporarily set the console name to this code. If your console does not offer a rename option there, stop — that is useful validation feedback.
          </p>
        </div>
        <button
          onClick={beginConsoleInfoCapture}
          disabled={!challenge}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          I renamed it — turn on camera
        </button>
      </div>
    );
  }

  if (cameraState === "error") {
    return (
      <div className="space-y-3 text-sm">
        <p>TestPass couldn&apos;t access your camera. Check this site&apos;s camera permission and try again.</p>
        <button onClick={start} className="rounded-lg border border-border px-4 py-2 text-sm font-medium">
          Try again
        </button>
      </div>
    );
  }

  if (phase === "done") return <SubmittedScreen verdict={verdict} />;

  const stepIndex =
    phase === "console-info"
      ? 1
      : phase === "online-access"
        ? 2
        : phase === "review"
          ? 3
          : 4;

  return (
    <div className="space-y-4">
      <StepIndicator steps={STEPS} current={stepIndex} />

      {(phase === "console-info" || phase === "online-access") && (
        <>
          <div>
            <p className="text-sm font-semibold">
              {phase === "console-info" ? "Capture Console Information" : "Now show live PlayStation access"}
            </p>
            <p className="mt-1 text-sm text-foreground/60">
              {phase === "console-info"
                ? `Keep the full Console Information screen readable. We need to see ${challenge} and the console serial in the same capture.`
                : "Without ending this TestPass camera session, return Home and open PlayStation Store. Wait until real Store content has loaded, then capture it."}
            </p>
          </div>
          <CameraStage
            videoRef={videoRef}
            state={cameraState}
            videoReady={videoReady}
            onVideoReady={() => setVideoReady(true)}
          />
          <canvas ref={canvasRef} className="hidden" />
          <button
            onClick={phase === "console-info" ? captureConsoleInfo : captureOnlineAccess}
            disabled={!videoReady}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            {phase === "console-info" ? "Capture console info" : "Capture online access"}
          </button>
        </>
      )}

      {phase === "review" && consoleInfo && onlineAccess && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="mb-1 text-xs font-medium text-foreground/50">Console information</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/jpeg;base64,${consoleInfo}`} alt="PS5 console information" className="aspect-video w-full rounded-lg object-cover" />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-foreground/50">Online access</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/jpeg;base64,${onlineAccess}`} alt="PlayStation online access" className="aspect-video w-full rounded-lg object-cover" />
            </div>
          </div>
          <p className="text-xs text-foreground/50">
            This experiment is deliberately narrow: it checks whether these two pieces of evidence can be captured clearly and quickly. It does not certify the PS5&apos;s complete condition.
          </p>
          <div className="flex gap-2">
            <button onClick={retake} className="flex-1 rounded-lg border border-border py-2 text-sm font-medium">
              Retake
            </button>
            <button onClick={submit} className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-white hover:opacity-90">
              Submit experiment
            </button>
          </div>
        </div>
      )}

      {phase === "submitting" && <p className="text-center text-sm text-foreground/60">Submitting…</p>}

      {phase === "submit-error" && (
        <div className="space-y-2 text-sm">
          <p className="text-red-500">{errorMsg}</p>
          <button onClick={submit} className="rounded-lg border border-border px-4 py-2 text-sm font-medium">
            Retry submit
          </button>
        </div>
      )}
    </div>
  );
}
