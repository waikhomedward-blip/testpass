"use client";

import { useState } from "react";
import { CATEGORY_CONFIG } from "@/lib/primitives";
import { submitCapture } from "@/lib/submit-capture";
import StepIndicator from "./StepIndicator";
import SubmittedScreen from "./SubmittedScreen";
import { useCamera } from "./useCamera";
import CameraStage from "./CameraStage";
import ProductPhotoStage from "./ProductPhotoStage";

const config = CATEGORY_CONFIG.switch;
const BURST_COUNT = 5;
const BURST_INTERVAL_MS = 500;
const STEPS = ["Instructions", "Record", "Product photo", "Review", "Submit"];

type Phase =
  | "instructions"
  | "ready"
  | "countdown"
  | "capturing"
  | "product-photo"
  | "review"
  | "submitting"
  | "done"
  | "submit-error";

export default function SwitchFlow({ sessionId }: { sessionId: string }) {
  const [phase, setPhase] = useState<Phase>("instructions");
  const [countdown, setCountdown] = useState(3);
  const [frames, setFrames] = useState<string[]>([]); // base64 (no data: prefix)
  const [productPhoto, setProductPhoto] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);

  const { videoRef, canvasRef, state: cameraState, videoReady, setVideoReady, start, stop, capture } = useCamera();

  async function captureBurst() {
    setPhase("capturing");
    const shots: string[] = [];
    for (let i = 0; i < BURST_COUNT; i++) {
      const shot = capture(0.82);
      if (shot) shots.push(shot);
      await new Promise((r) => setTimeout(r, BURST_INTERVAL_MS));
    }
    stop();
    setFrames(shots);
    setPhase("product-photo");
  }

  function beginCountdown() {
    setPhase("countdown");
    let remaining = 3;
    setCountdown(remaining);
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(interval);
        captureBurst();
      } else {
        setCountdown(remaining);
      }
    }, 700);
  }

  function retake() {
    setFrames([]);
    start();
    setPhase("ready");
  }

  async function submit() {
    setPhase("submitting");
    setErrorMsg(null);
    try {
      const images = frames.map((base64, i) => ({
        base64,
        mediaType: "image/jpeg" as const,
        filename: `switch-frame-${i}.jpg`,
      }));
      if (productPhoto) {
        images.push({ base64: productPhoto, mediaType: "image/jpeg", filename: "product-photo.jpg" });
      }
      const { verdict } = await submitCapture({
        sessionId,
        images,
        context: productPhoto
          ? "The final image is a general photo of the whole Switch — not part of the calibration burst."
          : "",
        rawData: { frameCount: frames.length, burstIntervalMs: BURST_INTERVAL_MS, hasProductPhoto: !!productPhoto },
      });
      setVerdict(verdict);
      setPhase("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Submission failed.");
      setPhase("submit-error");
    }
  }

  if (phase === "instructions") {
    return (
      <div className="space-y-4">
        <StepIndicator steps={STEPS} current={0} />
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          {config.sellerInstructions.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        <p className="text-xs text-foreground/50">TestPass will collect: {config.dataCollected.join("; ")}.</p>
        <button
          onClick={() => {
            start();
            setPhase("ready");
          }}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Turn on camera
        </button>
      </div>
    );
  }

  if (cameraState === "error") {
    return (
      <div className="space-y-3 text-sm">
        <p>TestPass couldn&apos;t access your camera. Check your browser&apos;s camera permission for this site and try again.</p>
        <button onClick={start} className="rounded-lg border border-border px-4 py-2 text-sm font-medium">
          Try again
        </button>
      </div>
    );
  }

  if (phase === "product-photo") {
    return (
      <div className="space-y-4">
        <StepIndicator steps={STEPS} current={2} />
        <ProductPhotoStage
          deviceLabel="Nintendo Switch"
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

  const stepIndex =
    phase === "review" ? 3 : phase === "submitting" || phase === "submit-error" ? 4 : 1;

  return (
    <div className="space-y-4">
      <StepIndicator steps={STEPS} current={stepIndex} />

      {(phase === "ready" || phase === "countdown" || phase === "capturing") && (
        <CameraStage
          videoRef={videoRef}
          state={cameraState}
          videoReady={videoReady}
          onVideoReady={() => setVideoReady(true)}
          overlay={
            <>
              {phase === "countdown" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-5xl font-bold text-white">
                  {countdown || "Go!"}
                </div>
              )}
              {phase === "capturing" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-center text-lg font-medium text-white">
                  Capturing… move both sticks in circles
                </div>
              )}
            </>
          }
        />
      )}
      <canvas ref={canvasRef} className="hidden" />

      {phase === "ready" && (
        <button
          onClick={beginCountdown}
          disabled={!videoReady}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          Start test
        </button>
      )}

      {phase === "review" && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium text-foreground/50">Calibration burst</p>
            <div className="grid grid-cols-5 gap-1">
              {frames.map((f, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={`data:image/jpeg;base64,${f}`} alt={`frame ${i + 1}`} className="aspect-square rounded object-cover" />
              ))}
            </div>
          </div>
          {productPhoto && (
            <div>
              <p className="mb-2 text-xs font-medium text-foreground/50">Photo of the device</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/jpeg;base64,${productPhoto}`} alt="Switch" className="aspect-video w-full rounded-lg object-cover" />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={retake} className="flex-1 rounded-lg border border-border py-2 text-sm font-medium">
              Retake
            </button>
            <button
              onClick={submit}
              className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Submit
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
