"use client";

import { useState } from "react";
import { CATEGORY_CONFIG } from "@/lib/primitives";
import StepIndicator from "./StepIndicator";
import SubmittedScreen from "./SubmittedScreen";
import { useCamera } from "./useCamera";
import CameraStage from "./CameraStage";
import ProductPhotoStage from "./ProductPhotoStage";

const config = CATEGORY_CONFIG.dji;
const STEPS = ["Instructions", "Capture screens", "Product photo", "Review", "Submit"];

type Phase =
  | "instructions"
  | "capture-status"
  | "capture-battery"
  | "product-photo"
  | "review"
  | "submitting"
  | "done"
  | "submit-error";

interface Shot {
  label: string;
  base64: string;
}

export default function DJIFlow({ sessionId }: { sessionId: string }) {
  const [phase, setPhase] = useState<Phase>("instructions");
  const [shots, setShots] = useState<Shot[]>([]);
  const [productPhoto, setProductPhoto] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);

  const { videoRef, canvasRef, state: cameraState, videoReady, setVideoReady, start, stop, capture } = useCamera();

  function captureCurrent(label: string, next: Phase) {
    const shot = capture(0.85);
    if (!shot) return;
    setShots((prev) => [...prev, { label, base64: shot }]);
    if (next !== "capture-battery") stop();
    setPhase(next);
  }

  function retake() {
    setShots([]);
    start();
    setPhase("capture-status");
  }

  async function submit() {
    setPhase("submitting");
    setErrorMsg(null);
    const context = `Screens captured, in order: ${shots.map((s) => s.label).join(", ")}.${
      productPhoto ? " The final image is a general photo of the whole drone — not one of the app screens." : ""
    }`;
    try {
      const images = shots.map((s, i) => ({
        base64: s.base64,
        mediaType: "image/jpeg" as const,
        filename: `dji-${i}-${s.label.toLowerCase().replace(/\s+/g, "-")}.jpg`,
      }));
      if (productPhoto) {
        images.push({ base64: productPhoto, mediaType: "image/jpeg", filename: "product-photo.jpg" });
      }
      const res = await fetch("/api/sessions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          images,
          context,
          rawData: { shotLabels: shots.map((s) => s.label), hasProductPhoto: !!productPhoto },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed.");
      setVerdict(data.verdict ?? null);
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
            setPhase("capture-status");
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
          deviceLabel="drone"
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

      {(phase === "capture-status" || phase === "capture-battery") && (
        <>
          <CameraStage
            videoRef={videoRef}
            state={cameraState}
            videoReady={videoReady}
            onVideoReady={() => setVideoReady(true)}
          />
          <canvas ref={canvasRef} className="hidden" />
          <p className="text-sm text-foreground/70">
            {phase === "capture-status"
              ? "Frame the aircraft's status screen (serial number, binding status, warnings) and capture it."
              : "Now frame the battery detail screen and capture it."}
          </p>
          <button
            onClick={() =>
              phase === "capture-status"
                ? captureCurrent("Status screen", "capture-battery")
                : captureCurrent("Battery screen", "product-photo")
            }
            disabled={!videoReady}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            {phase === "capture-status" ? "Capture status screen" : "Capture battery screen"}
          </button>
        </>
      )}

      {phase === "review" && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium text-foreground/50">App screens</p>
            <div className="grid grid-cols-2 gap-2">
              {shots.map((s, i) => (
                <div key={i}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/jpeg;base64,${s.base64}`}
                    alt={s.label}
                    className="aspect-video w-full rounded-lg object-cover"
                  />
                  <p className="mt-1 text-center text-xs text-foreground/50">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          {productPhoto && (
            <div>
              <p className="mb-2 text-xs font-medium text-foreground/50">Photo of the device</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/jpeg;base64,${productPhoto}`} alt="Drone" className="aspect-video w-full rounded-lg object-cover" />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={retake} className="flex-1 rounded-lg border border-border py-2 text-sm font-medium">
              Retake both
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
