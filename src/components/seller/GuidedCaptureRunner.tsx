"use client";

import { useEffect, useState } from "react";
import { CATEGORY_CONFIG } from "@/lib/primitives";
import { newChallengeCode } from "@/lib/challenge";
import { resizeImageFile } from "@/lib/image-resize";
import { submitCapture } from "@/lib/submit-capture";
import { CaptureShot, RunnerConfig, RunnerStep } from "@/lib/runner-types";
import StepIndicator from "./StepIndicator";
import SubmittedScreen from "./SubmittedScreen";
import { useCamera } from "./useCamera";
import CameraStage from "./CameraStage";
import ProductPhotoStage from "./ProductPhotoStage";
import NumberedSteps from "./NumberedSteps";
import ChallengeCode from "./ChallengeCode";

type Phase = "prepare" | "capture" | "product-photo" | "review" | "submitting" | "done" | "submit-error";
// "confirm" is new: a burst just finished and is showing its own summary
// grid (Redo this test / Use this test) instead of the live camera or the
// next step. See the Capture Correction Principle doctrine in
// runner-types.ts — nothing auto-advances past a capture until the seller
// has looked at what was actually captured and said to keep it.
type BurstSubPhase = "ready" | "countdown" | "capturing" | "confirm";

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "-");

// The shared seller-flow shell: instructions -> one or more labeled camera
// captures (a countdown burst, a sequence of single shots, or a same-phone
// file-upload handoff) -> optional product photo -> review -> submit ->
// done/error. This is exactly the shape Switch, DJI, and PS5 already had,
// hand-written three times — see the founder-fit audit. Category-specific
// evidence meaning (the evaluator prompt, the context string, raw_data,
// claim boundaries) never lives here; it comes from CATEGORY_CONFIG and
// each category's buildSubmission().
//
// CAPTURE CORRECTION PRINCIPLE (evidence-UX doctrine, added in the
// physical-feasibility + error-recovery pass): every individual evidence
// step must be correctable immediately, before the seller ever has to
// remember a mistake until some later review screen. Don Norman's
// error-recovery principle and Jobs/Fukasawa's "don't force the user to
// hold state in their head" both point the same way. So nothing in this
// file auto-advances a step purely because a frame was captured, a file
// was picked, or a burst finished:
//   - single-capture: capture -> show the actual photo -> Retake / Use photo.
//   - file-upload: choose file -> show the actual file -> Choose different / Use.
//   - countdown-burst: burst finishes -> show a summary grid (the burst is
//     ATOMIC — see ATOMIC EVIDENCE PRINCIPLE below) -> Redo this test / Use
//     this test. Redo discards and re-shoots the WHOLE burst; there is no
//     way to swap out a single inconvenient frame from the middle, because
//     that would let a seller manufacture a fake continuity claim (Anderson
//     /Farid's point) while an honest partial retake could not.
// The final review screen stays, but it is the SECOND safety net, not the
// first opportunity to notice a bad shot: every item there carries its own
// Retake/Replace link that jumps back to exactly that step (via
// beginEditStep below) without discarding any other already-confirmed
// evidence, then returns straight to review once re-confirmed — it does
// not replay the rest of the flow.
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
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Pending evidence awaiting the seller's Retake/Use (or Redo/Use, or
  // Choose different/Use) confirmation — not yet committed to `shots`.
  const [pendingSingle, setPendingSingle] = useState<string | null>(null);
  const [pendingBurst, setPendingBurst] = useState<string[] | null>(null);
  const [pendingFile, setPendingFile] = useState<string | null>(null);

  // Set only when the seller jumped back into a step from the review
  // screen to redo it (see beginEditStep). Confirming in that mode replaces
  // just that step's evidence and returns straight to review, instead of
  // advancing forward through the rest of the flow.
  const [editingStepId, setEditingStepId] = useState<string | null>(null);

  const { videoRef, canvasRef, state: cameraState, videoReady, setVideoReady, start, stop, capture } = useCamera();

  // One-Phone Seller Principle: a "file-upload" step never touches this
  // hook's camera — it's a same-phone companion-app handoff (switch apps,
  // screenshot, come back, pick the file), not a live capture. Only start
  // the camera at all if some step in this config actually needs it, and
  // only when transitioning into/out of a step that needs it — otherwise a
  // config made entirely of file-upload steps (DJI, Quest) never prompts
  // for camera permission until the separate product-photo stage does.
  const stepNeedsCamera = (step: RunnerStep | undefined) => !!step && step.type !== "file-upload";

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

  // Normal forward flow only — never called while editingStepId is set,
  // since an edit always returns straight to review instead (see the
  // confirm* functions below).
  function advanceAfterStep() {
    if (isLastStep) {
      stop();
      goToPostCapturePhase();
    } else {
      syncCameraForStep(config.steps[stepIndex + 1]);
      setStepIndex((i) => i + 1);
    }
  }

  // Deliberately synchronous: start() fires getUserMedia and returns
  // immediately, and setPhase("capture") — which mounts CameraStage, and
  // with it the actual <video> element — happens in the same tick, before
  // getUserMedia can possibly resolve. That ordering matters: see the
  // camera-lifecycle note in useCamera.ts and the audit report for why an
  // `await start()` before mounting CameraStage is unsafe.
  function beginCapture() {
    if (stepNeedsCamera(config.steps[0])) start();
    setStepIndex(0);
    setBurstSubPhase("ready");
    setPhase("capture");
    // Fire-and-forget instrumentation ping — the seller_started funnel
    // event (see the /start route). Never blocks or gates the actual
    // capture flow; a failure here is invisible to the seller on purpose.
    fetch(`/api/sessions/${sessionId}/start`, { method: "POST" }).catch(() => {});
  }

  // Jumps back into a specific already-completed step from the review
  // screen, without disturbing any other step's already-confirmed
  // evidence. Confirming from here (see the confirm* functions) replaces
  // only this step's shot(s) and returns straight to review.
  function beginEditStep(stepId: string) {
    const idx = config.steps.findIndex((s) => s.id === stepId);
    if (idx === -1) return;
    setEditingStepId(stepId);
    setStepIndex(idx);
    setBurstSubPhase("ready");
    setPendingSingle(null);
    setPendingBurst(null);
    setPendingFile(null);
    setUploadError(null);
    syncCameraForStep(config.steps[idx]);
    setPhase("capture");
  }

  // Called after any step (camera or file-upload) advances to the next
  // step index, to put the camera in the right state for what's next
  // without forcing every config to be all-camera or all-upload.
  function syncCameraForStep(nextStep: RunnerStep | undefined) {
    if (stepNeedsCamera(nextStep)) {
      if (cameraState !== "live" && cameraState !== "starting") start();
    } else if (cameraState === "live" || cameraState === "starting") {
      stop();
    }
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

  // Captures the whole burst, then STOPS — it does not commit to `shots`
  // or advance. The seller sees every frame in a summary grid first (see
  // the "confirm" burstSubPhase render branch) and must explicitly say
  // Redo this test / Use this test. ATOMIC EVIDENCE PRINCIPLE: because
  // continuity across the frames is itself part of what a burst proves
  // (see the Epson/Prusa/Switch-style evaluator prompts), "Redo" always
  // discards and re-shoots every frame — there is no per-frame swap that
  // could let one inconvenient frame quietly disappear while the rest of
  // the sequence is kept.
  async function captureBurst(step: Extract<RunnerStep, { type: "countdown-burst" }>) {
    setBurstSubPhase("capturing");
    const newShots: string[] = [];
    for (let i = 0; i < step.shotCount; i++) {
      const shot = capture(step.quality ?? 0.82);
      if (shot) newShots.push(shot);
      await new Promise((r) => setTimeout(r, step.intervalMs));
    }
    setPendingBurst(newShots);
    setBurstSubPhase("confirm");
  }

  function confirmBurst(step: Extract<RunnerStep, { type: "countdown-burst" }>, action: "redo" | "use") {
    if (action === "redo") {
      setPendingBurst(null);
      setBurstSubPhase("ready");
      return;
    }
    const newShots: CaptureShot[] = (pendingBurst ?? []).map((base64) => ({
      stepId: step.id,
      label: step.label,
      base64,
      capturedAt: Date.now(),
      method: "live_camera",
    }));
    setPendingBurst(null);
    setBurstSubPhase("ready");
    if (editingStepId === step.id) {
      setShots((prev) => [...prev.filter((s) => s.stepId !== step.id), ...newShots]);
      setEditingStepId(null);
      stop();
      setPhase("review");
      return;
    }
    setShots((prev) => [...prev, ...newShots]);
    advanceAfterStep();
  }

  function captureSingle(step: Extract<RunnerStep, { type: "single-capture" }>) {
    const shot = capture(step.quality ?? 0.85);
    if (!shot) return;
    setPendingSingle(shot);
  }

  function confirmSingle(step: Extract<RunnerStep, { type: "single-capture" }>, action: "retake" | "use") {
    if (action === "retake") {
      setPendingSingle(null);
      return;
    }
    const base64 = pendingSingle!;
    setPendingSingle(null);
    if (editingStepId === step.id) {
      setShots((prev) => [
        ...prev.filter((s) => s.stepId !== step.id),
        { stepId: step.id, label: step.label, base64, capturedAt: Date.now(), method: "live_camera" },
      ]);
      setEditingStepId(null);
      stop();
      setPhase("review");
      return;
    }
    setShots((prev) => [
      ...prev,
      { stepId: step.id, label: step.label, base64, capturedAt: Date.now(), method: "live_camera" },
    ]);
    advanceAfterStep();
  }

  // Same-phone companion-app handoff: the seller already switched to a
  // manufacturer app on THIS phone, took a native screenshot, and is now
  // picking it from their own photo library — never a live capture, so
  // this never touches the camera hook. Reading the file just stages it as
  // "pending" so the seller can confirm they actually picked the right one
  // before it counts as evidence (per the copy audit: a mis-tapped file
  // picker is an easy, silent mistake without this).
  async function handleFileUpload(step: Extract<RunnerStep, { type: "file-upload" }>, file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    try {
      const { base64 } = await resizeImageFile(file);
      setPendingFile(base64);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Couldn't read that photo. Try picking it again.");
    }
  }

  function confirmFile(step: Extract<RunnerStep, { type: "file-upload" }>, action: "choose-different" | "use") {
    if (action === "choose-different") {
      setPendingFile(null);
      return;
    }
    const base64 = pendingFile!;
    setPendingFile(null);
    if (editingStepId === step.id) {
      setShots((prev) => [
        ...prev.filter((s) => s.stepId !== step.id),
        { stepId: step.id, label: step.label, base64, capturedAt: Date.now(), method: "screenshot_upload" },
      ]);
      setEditingStepId(null);
      setPhase("review");
      return;
    }
    setShots((prev) => [
      ...prev,
      { stepId: step.id, label: step.label, base64, capturedAt: Date.now(), method: "screenshot_upload" },
    ]);
    advanceAfterStep();
  }

  // The old, full-reset path — kept as a de-emphasized "start over
  // completely" escape hatch on the review screen (not the primary
  // correction mechanism anymore; per-step edit via beginEditStep is).
  function retakeEverything() {
    setShots([]);
    setProductPhoto(null);
    setUploadError(null);
    setPendingSingle(null);
    setPendingBurst(null);
    setPendingFile(null);
    setEditingStepId(null);
    setStepIndex(0);
    setBurstSubPhase("ready");
    if (stepNeedsCamera(config.steps[0])) start();
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
          <div>
            <p className="text-sm font-semibold">{prepare.introTitle}</p>
            {prepare.introDescription && <p className="mt-1 text-sm text-ink-secondary">{prepare.introDescription}</p>}
          </div>
        )}
        {prepare.notes && prepare.notes.length > 0 && (
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-secondary">
            {prepare.notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        )}
        {prepare.showStandardInstructions && <NumberedSteps items={catConfig.sellerInstructions} />}
        {config.useChallenge && <ChallengeCode code={challenge} hint={prepare.challengeHint} />}
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
        {editingStepId === currentStep.id && (
          <p className="rounded-lg border border-caution/30 bg-caution-wash px-3 py-2 text-xs font-medium text-caution">
            Redoing this step — your other evidence is unaffected.
          </p>
        )}

        {currentStep.type === "countdown-burst" ? (
          burstSubPhase === "confirm" && pendingBurst ? (
            <>
              <div>
                <p className="mb-2 text-xs font-medium text-ink-secondary">
                  {currentStep.label} — {pendingBurst.length} frames captured
                </p>
                {/* No .evidence-frame here deliberately — at 5-across
                    thumbnail scale the registration corners would read as
                    visual noise rather than a legible "this is evidence"
                    cue. Reserved for the larger single-shot/product-photo
                    images below. */}
                <div className="grid grid-cols-5 gap-1">
                  {pendingBurst.map((b64, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={`data:image/jpeg;base64,${b64}`}
                      alt={`${currentStep.label} frame ${i + 1}`}
                      className="aspect-square rounded object-cover"
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-ink-secondary">
                This whole sequence is one piece of evidence — redoing it retakes every frame, not just one.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => confirmBurst(currentStep, "redo")}
                  className="flex-1 rounded-lg border border-border-control py-2 text-sm font-medium"
                >
                  Redo this test
                </button>
                <button
                  onClick={() => confirmBurst(currentStep, "use")}
                  className="flex-1 rounded-lg bg-signal py-2 text-sm font-medium text-white transition-colors hover:bg-signal-hover"
                >
                  Use this test
                </button>
              </div>
            </>
          ) : (
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
          )
        ) : currentStep.type === "file-upload" ? (
          pendingFile ? (
            <>
              <p className="text-sm text-ink-secondary">Is this the right screenshot?</p>
              <div className="evidence-frame relative aspect-video overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/jpeg;base64,${pendingFile}`}
                  alt={`Selected file for ${currentStep.label}`}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => confirmFile(currentStep, "choose-different")}
                  className="flex-1 rounded-lg border border-border-control py-2 text-sm font-medium"
                >
                  Choose different screenshot
                </button>
                <button
                  onClick={() => confirmFile(currentStep, "use")}
                  className="flex-1 rounded-lg bg-signal py-2 text-sm font-medium text-white transition-colors hover:bg-signal-hover"
                >
                  Use screenshot
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Shown again here (not just on the prepare screen) for any
                  file-upload step that needs the seller to act on the code
                  in ANOTHER app before coming back — e.g. NAS's DSM rename —
                  so they don't have to hold it in memory across the
                  app-switch. Categories with no challenge, or whose
                  instructionText doesn't need it, just render nothing extra.
                  Reuses the same ChallengeCode component as the prepare
                  screen rather than a bespoke box, so the code always looks
                  like the same piece of information wherever it appears. */}
              {config.useChallenge && challenge && <ChallengeCode code={challenge} />}
              <p className="text-sm text-ink-secondary">
                {typeof currentStep.instructionText === "function"
                  ? currentStep.instructionText(challenge)
                  : currentStep.instructionText}
              </p>
              <label className="block cursor-pointer">
                {/* Native file input, same-phone companion-app handoff — the
                    seller already screenshotted the manufacturer app on this
                    phone (their own OS screenshot function) and is picking
                    that file, not photographing anything with TestPass's own
                    camera. */}
                <input
                  type="file"
                  accept="image/*"
                  className="peer sr-only"
                  onChange={(e) => handleFileUpload(currentStep, e.target.files?.[0])}
                />
                <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-control bg-card px-4 py-10 text-center peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-signal">
                  <p className="text-sm font-medium text-signal">{currentStep.pickerLabel}</p>
                  <p className="text-xs text-ink-secondary">Choose the screenshot from your photos</p>
                </div>
              </label>
              {uploadError && <p className="text-sm text-failure">{uploadError}</p>}
            </>
          )
        ) : pendingSingle ? (
          <>
            <p className="text-sm text-ink-secondary">Is this photo clear and usable?</p>
            <div className="evidence-frame relative aspect-video overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/jpeg;base64,${pendingSingle}`}
                alt={`Captured photo for ${currentStep.label}`}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => confirmSingle(currentStep, "retake")}
                className="flex-1 rounded-lg border border-border-control py-2 text-sm font-medium"
              >
                Retake
              </button>
              <button
                onClick={() => confirmSingle(currentStep, "use")}
                className="flex-1 rounded-lg bg-signal py-2 text-sm font-medium text-white transition-colors hover:bg-signal-hover"
              >
                Use photo
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-secondary">{currentStep.instructionText(challenge)}</p>
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
    // Single-capture and file-upload shots are grouped by stepId so every
    // independently meaningful item — DJI's status screenshot vs. its
    // battery screenshot, say — gets its OWN Retake/Replace control.
    // Replacing one must never touch the other (multi-file steps rule).
    const singleAndFileSteps = config.steps.filter((s) => s.type === "single-capture" || s.type === "file-upload");
    const burstSteps = config.steps.filter((s) => s.type === "countdown-burst");
    const reviewIndex = 1 + config.steps.length + (config.includeProductPhoto ? 1 : 0);
    const canEdit = phase === "review";

    return (
      <div className="space-y-4">
        <StepIndicator steps={STEP_LABELS} current={phase === "review" ? reviewIndex : reviewIndex + 1} />

        {burstSteps.map((step) => {
          const stepShots = shots.filter((s) => s.stepId === step.id);
          if (stepShots.length === 0) return null;
          return (
            <div key={step.id}>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-ink-secondary">{step.label}</p>
                {canEdit && (
                  <button onClick={() => beginEditStep(step.id)} className="text-xs font-medium text-signal">
                    Redo this test
                  </button>
                )}
              </div>
              {/* No .evidence-frame here deliberately — at 5-across
                  thumbnail scale the registration corners would read as
                  visual noise rather than a legible "this is evidence" cue.
                  Reserved for the larger single-shot/product-photo images
                  below. */}
              <div className="grid grid-cols-5 gap-1">
                {stepShots.map((s, i) => (
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
          );
        })}

        {singleAndFileSteps.map((step) => {
          const s = shots.find((sh) => sh.stepId === step.id);
          if (!s) return null;
          const isScreenshot = s.method === "screenshot_upload";
          return (
            <div key={step.id}>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-medium text-ink-secondary">{s.label}</p>
                {canEdit && (
                  <button onClick={() => beginEditStep(step.id)} className="text-xs font-medium text-signal">
                    {isScreenshot ? "Choose different file" : "Retake"}
                  </button>
                )}
              </div>
              {/* .evidence-frame goes on this wrapper div, not the <img> —
                  the corner marks are ::before/::after pseudo-elements,
                  which don't render on replaced elements like img in any
                  browser. */}
              <div className="evidence-frame relative aspect-video overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/jpeg;base64,${s.base64}`}
                  alt={s.label}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          );
        })}

        {productPhoto && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-ink-secondary">Photo of the device</p>
              {canEdit && (
                <button onClick={() => setPhase("product-photo")} className="text-xs font-medium text-signal">
                  Retake
                </button>
              )}
            </div>
            <div className="evidence-frame relative aspect-video overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/jpeg;base64,${productPhoto}`}
                alt={catConfig.label}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        )}

        {phase === "review" && config.reviewNote && (
          <p className="text-xs text-ink-secondary">{config.reviewNote}</p>
        )}

        {phase === "review" && (
          <div className="space-y-2">
            <button
              onClick={submit}
              className="w-full rounded-lg bg-signal py-2 text-sm font-medium text-white transition-colors hover:bg-signal-hover"
            >
              {config.submitButtonLabel ?? "Submit"}
            </button>
            <button onClick={retakeEverything} className="w-full text-center text-xs text-ink-secondary underline">
              Start over completely
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
