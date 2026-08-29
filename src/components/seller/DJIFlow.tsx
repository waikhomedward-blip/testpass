"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORY_CONFIG } from "@/lib/primitives";
import StepIndicator from "./StepIndicator";

const config = CATEGORY_CONFIG.dji;
const STEPS = ["Instructions", "Capture screens", "Review", "Submit"];

type Phase =
  | "instructions"
  | "camera-error"
  | "capture-status"
  | "capture-battery"
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase("capture-status");
    } catch {
      setPhase("camera-error");
    }
  }

  function captureCurrent(label: string, next: Phase) {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setShots((prev) => [...prev, { label, base64: dataUrl.split(",")[1] }]);
    if (next === "review") streamRef.current?.getTracks().forEach((t) => t.stop());
    setPhase(next);
  }

  function retake() {
    setShots([]);
    startCamera();
  }

  async function submit() {
    setPhase("submitting");
    setErrorMsg(null);
    const context = `Screens captured, in order: ${shots.map((s) => s.label).join(", ")}.`;
    try {
      const res = await fetch("/api/sessions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          images: shots.map((s, i) => ({
            base64: s.base64,
            mediaType: "image/jpeg",
            filename: `dji-${i}-${s.label.toLowerCase().replace(/\s+/g, "-")}.jpg`,
          })),
          context,
          rawData: { shotLabels: shots.map((s) => s.label) },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed.");
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
          onClick={startCamera}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Turn on camera
        </button>
      </div>
    );
  }

  if (phase === "camera-error") {
    return (
      <div className="space-y-3 text-sm">
        <p>TestPass couldn&apos;t access your camera. Check your browser&apos;s camera permission for this site and try again.</p>
        <button onClick={startCamera} className="rounded-lg border border-border px-4 py-2 text-sm font-medium">
          Try again
        </button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-lg font-semibold">Submitted — thanks!</p>
        <p className="mt-2 text-sm text-foreground/60">The buyer has your test result now. You&apos;re done.</p>
      </div>
    );
  }

  const stepIndex = phase === "submitting" || phase === "submit-error" ? 3 : phase === "review" ? 2 : 1;

  return (
    <div className="space-y-4">
      <StepIndicator steps={STEPS} current={stepIndex} />

      {phase !== "review" && (
        <>
          <div className="relative overflow-hidden rounded-xl border border-border bg-black">
            <video ref={videoRef} className="aspect-video w-full object-cover" playsInline muted />
          </div>
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
                : captureCurrent("Battery screen", "review")
            }
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            {phase === "capture-status" ? "Capture status screen" : "Capture battery screen"}
          </button>
        </>
      )}

      {phase === "review" && (
        <div className="space-y-3">
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
