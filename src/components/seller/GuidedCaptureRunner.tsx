"use client";

import { useEffect, useState } from "react";
import { CATEGORY_CONFIG } from "@/lib/primitives";
import { newChallengeCode } from "@/lib/challenge";
import { submitCapture } from "@/lib/submit-capture";
import { CaptureShot, RunnerConfig, RunnerStep } from "@/lib/runner-types";
import StepIndicator from "./StepIndicator";
import SubmittedScreen from "./SubmittedScreen";
import { useCamera } from "./useCamera";
import CameraStage from "./CameraStage";
import ProductPhotoStage from "./ProductPhotoStage";

type Phase = "prepare" | "capture" | "product-photo" | "review" | "submitting" | "done" | "submit-error";
type BurstSubPhase = "ready" | "countdown" | "capturing";

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "-");

// The shared seller-flow shell: instructions -> one or more labeled camera
// captures (a countdown burst or a sequence of single shots) -> optional
// product photo -> review -> submit -> done/error. This is exactly the
// shape Switch, DJI, and PS5 already had, hand-written three times — see
// the founder-fit audit. Category-specific evidence meaning (the evaluator
// prompt, the context string, raw_data, claim boundaries) never lives here;
// it comes from CATEGORY_CONFIG and each category's buildSubmission().
export default function GuidedCaptureRunner({ sessionId, config }: { sessionId: string; config: RunnerConfig }) {
  const catConfig = CATEGORY_CONFIG[config.category];
  const [phase, setPhase] = useState<Phase>("prepare");
  const [stepIndex, setStepIndex] = useState(0);
  const [burstSubPhase, setBurstSubPhase] = useState<BurstSubPhase>("ready");
  const [countdown, setCountdown] = useState(0);
  const [shots, setShots] = useState<CaptureShot[]>([]);
  const [productPhoto, setProductPhoto] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());

  const { videoRef, canvasRef, state: cameraState, videoReady, setVideoReady, start, stop, capture } = useCamera();

  // Generate the one-time challenge only after hydration, and only yield
  // once (not synchronously) before the state update so this satisfies
  // react-hooks/set-state-in-effect — the same fix already verified on the
  // PS5 experiment branch. Client Components are pre-rendered on the
  // server too, so generating randomness during render can make the
  // server HTML differ from the first client render and hydration-fail.
  useEffect(() => {
    if (!config.useChallenge) return;
    let cancelled = false;
    async function prepareChallenge() {
      await Promise.resolve();
      if (!cancelled) setChallenge(`${config.challengePrefix ?? ""}${newChallengeCode()}`);
    }
    prepareChallenge();
    return () => {
      cancelled = true;
    };
  }, [config.useChallenge, config.challengePrefix]);

  const currentStep: RunnerStep | undefined = config.steps[stepIndex];
  const isLastStep = stepIndex === config.steps.length - 1;

  function goToPostCapturePhase() {
    setPhase(config.includeProductPhoto ? "product-photo" : "review");
  }

  // Deliberately synchronous: start() fires getUserMedia and returns
  // immediately, and setPhase("capture") — which mounts CameraStage, and
  // with it the actual <video> element — happens in the same tick, before
  // getUserMedia can possibly resolve. That ordering matters: see the
  // camera-lifecycle note in useCamera.ts and the audit report for why an
  // `await start()` before mounting CameraStage is unsafe.
  function beginCapture() {
    start();
    setStepIndex(0);
    setBurstSubPhase("ready");
    setPhase("capture");
    // Fire-and-forget instrumentation ping — the seller_started funnel
    // event (see the /start route). Never blocks or gates the actual
    // capture flow; a failure here is invisible to the seller on purpose.
    fetch(`/api/sessions/${sessionId}/start`, { method: "POST" }).catch(() => {});
  }

  function beginCountdown(step: Extract<RunnerStep, { type: "countdown-burst" }>) {
    setBurstSubPhase("countdown");
    let remaining = step.countdownSeconds;
    setCountdown(remaining);
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(interval);
        captureBurst(step);
      } else {
        setCountdown(remaining);
      }
    }, 700);
  }

  async function captureBurst(step: Extract<RunnerStep, { type: "countdown-burst" }>) {
    setBurstSubPhase("capturing");
    const newShots: CaptureShot[] = [];
    for (let i = 0; i < step.shotCount; i++) {
      const shot = capture(step.quality ?? 0.82);
      if (shot) newShots.push({ stepId: step.id, label: step.label, base64: shot, capturedAt: Date.now() });
      await new Promise((r) => setTimeout(r, step.intervalMs));
    }
    setShots((prev) => [...prev, ...newShots]);
    if (isLastStep) {
      stop();
      goToPostCapturePhase();
    } else {
      setStepIndex((i) => i + 1);
      setBurstSubPhase("ready");
    }
  }

  function captureSingle(step: Extract<RunnerStep, { type: "single-capture" }>) {
    const shot = capture(step.quality ?? 0.85);
    if (!shot) return;
    setShots((prev) => [...prev, { stepId: step.id, label: step.label, base64: shot, capturedAt: Date.now() }]);
    if (isLastStep) {
      stop();
      goToPostCapturePhase();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function retake() {
    setShots([]);
    setProductPhoto(null);
    setStepIndex(0);
    setBurstSubPhase("ready");
    start();
    setPhase("capture");
  }

  async function submit() {
    setPhase("submitting");
    setErrorMsg(null);
    try {
      const images = shots.map((s, i) => ({
        base64: s.base64,
        mediaType: "image/jpeg" as const,
        filename: `${config.filenamePrefix}-${i}-${slug(s.label)}.jpg`,
      }));
      if (productPhoto) {
        images.push({ base64: productPhoto, mediaType: "image/jpeg", filename: "product-photo.jpg" });
      }
      const { context, rawData } = config.buildSubmission({ shots, productPhoto, challenge, startedAt });
      const { verdict } = await submitCapture({ sessionId, images, context, rawData });
      setVerdict(verdict);
      setPhase("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Submission failed.");
      setPhase("submit-error");
    }
  }

  const STEP_LABELS = [
    "Instructions",
    ...config.steps.map((s) => s.label),
    ...(config.includeProductPhoto ? ["Product photo"] : []),
    "Review",
    "Submit",
  ];

  if (phase === "prepare") {
    const { prepare } = config;
    return (
      <div className="space-y-5">
        <StepIndicator steps={STEP_LABELS} current={0} />
        {prepare.introTitle && (
          <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-card">
            <p className="text-sm font-semibold">{prepare.introTitle}</p>
            {prepare.introDescription && <p className="mt-1 text-sm text-ink-secondary">{prepare.introDescription}</p>}
          </div>
        )}
        {prepare.notes && prepare.notes.length > 0 && (
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground/70">
            {prepare.notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        )}
        {prepare.showStandardInstructions && (
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {catConfig.sellerInstructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        )}
        {config.useChallenge && (
          <div className="rounded-[var(--radius-lg)] border border-signal/25 bg-signal/[0.04] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-secondary">Your one-time code</p>
            <p className="mt-1 font-mono text-2xl font-semibold tracking-wider text-foreground">{challenge ?? "Preparing…"}</p>
            {prepare.challengeHint && <p className="mt-2 text-xs text-ink-secondary">{prepare.challengeHint}</p>}
          </div>
        )}
        <p className="text-xs text-ink-secondary">TestPass will collect: {catConfig.dataCollected.join("; ")}.</p>
        <button
          onClick={beginCapture}
          disabled={!!config.useChallenge && !challenge}
          className="w-full rounded-lg bg-signal py-2.5 text-sm font-medium text-white transition-colors hover:bg-signal-hover disabled:opacity-40"
        >
          {prepare.buttonLabel}
        </button>
      </div>
    );
  }

  if (cameraState === "error") {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-failure">
          TestPass couldn&apos;t access your camera. Check your browser&apos;s camera permission for this
          site and try again.
        </p>
        <button onClick={start} className="rounded-lg border border-border-control px-4 py-2 text-sm font-medium">
          Try again
        </button>
      </div>
    );
  }

  if (phase === "product-photo") {
    return (
      <div className="space-y-4">
        <StepIndicator steps={STEP_LABELS} current={1 + config.steps.length} />
        <ProductPhotoStage
          deviceLabel={config.productPhotoDeviceLabel ?? catConfig.label}
          onCaptured={(b64) => {
            setProductPhoto(b64);
            setPhase("review");
          }}
          onSkip={() => setPhase("review")}
        />
      </div>
    );
  }

  if (phase === "done") {
    return <SubmittedScreen verdict={verdict} />;
  }

  if (phase === "capture" && currentStep) {
    const stepNum = 1 + stepIndex;
    return (
      <div className="space-y-4">
        <StepIndicator steps={STEP_LABELS} current={stepNum} />

        {currentStep.type === "countdown-burst" ? (
          <>
            <CameraStage
              videoRef={videoRef}
              state={cameraState}
              videoReady={videoReady}
              onVideoReady={() => setVideoReady(true)}
              overlay={
                <>
                  {burstSubPhase === "countdown" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-5xl font-bold text-white">
                      {countdown || "Go!"}
                    </div>
                  )}
                  {burstSubPhase === "capturing" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-center text-lg font-medium text-white">
                      {currentStep.capturingMessage}
                    </div>
                  )}
                </>
              }
            />
            <canvas ref={canvasRef} className="hidden" />
            {burstSubPhase === "ready" && (
              <button
                onClick={() => beginCountdown(currentStep)}
                disabled={!videoReady}
                className="w-full rounded-lg bg-signal py-2.5 text-sm font-medium text-white transition-colors hover:bg-signal-hover disabled:opacity-40"
              >
                Start test
              </button>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-foreground/70">{currentStep.instructionText(challenge)}</p>
            <CameraStage
              videoRef={videoRef}
              state={cameraState}
              videoReady={videoReady}
              onVideoReady={() => setVideoReady(true)}
            />
            <canvas ref={canvasRef} className="hidden" />
            <button
              onClick={() => captureSingle(currentStep)}
              disabled={!videoReady}
              className="w-full rounded-lg bg-signal py-2.5 text-sm font-medium text-white transition-colors hover:bg-signal-hover disabled:opacity-40"
            >
              {currentStep.buttonLabel}
            </button>
          </>
        )}
      </div>
    );
  }

  if (phase === "review" || phase === "submitting" || phase === "submit-error") {
    const singleShots = shots.filter((s) => {
      const step = config.steps.find((st) => st.id === s.stepId);
      return step?.type === "single-capture";
    });
    const burstShots = shots.filter((s) => {
      const step = config.steps.find((st) => st.id === s.stepId);
      return step?.type === "countdown-burst";
    });
    const reviewIndex = 1 + config.steps.length + (config.includeProductPhoto ? 1 : 0);

    return (
      <div className="space-y-4">
        <StepIndicator steps={STEP_LABELS} current={phase === "review" ? reviewIndex : reviewIndex + 1} />

        {burstShots.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-ink-secondary">{burstShots[0].label}</p>
            <div className="grid grid-cols-5 gap-1">
              {burstShots.map((s, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={`data:image/jpeg;base64,${s.base64}`}
                  alt={`${s.label} ${i + 1}`}
                  className="aspect-square rounded object-cover"
                />
              ))}
            </div>
          </div>
        )}

        {singleShots.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {singleShots.map((s, i) => (
              <div key={i}>
                <p className="mb-1 text-xs font-medium text-ink-secondary">{s.label}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/jpeg;base64,${s.base64}`}
                  alt={s.label}
                  className="aspect-video w-full rounded-lg object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {productPhoto && (
          <div>
            <p className="mb-2 text-xs font-medium text-ink-secondary">Photo of the device</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`data:image/jpeg;base64,${productPhoto}`} alt={catConfig.label} className="aspect-video w-full rounded-lg object-cover" />
          </div>
        )}

        {phase === "review" && config.reviewNote && (
          <p className="text-xs text-ink-secondary">{config.reviewNote}</p>
        )}

        {phase === "review" && (
          <div className="flex gap-2">
            <button onClick={retake} className="flex-1 rounded-lg border border-border-control py-2 text-sm font-medium">
              {config.retakeButtonLabel ?? "Retake"}
            </button>
            <button
              onClick={submit}
              className="flex-1 rounded-lg bg-signal py-2 text-sm font-medium text-white transition-colors hover:bg-signal-hover"
            >
              {config.submitButtonLabel ?? "Submit"}
            </button>
          </div>
        )}

        {phase === "submitting" && <p className="text-center text-sm text-ink-secondary">Submitting…</p>}

        {phase === "submit-error" && (
          <div className="space-y-2 text-sm">
            <p className="text-failure">{errorMsg}</p>
            <button onClick={submit} className="rounded-lg border border-border-control px-4 py-2 text-sm font-medium">
              Retry submit
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
