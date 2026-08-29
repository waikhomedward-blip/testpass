"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORY_CONFIG } from "@/lib/primitives";

const config = CATEGORY_CONFIG.switch;
const BURST_COUNT = 5;
const BURST_INTERVAL_MS = 500;

type Phase = "instructions" | "camera-error" | "ready" | "countdown" | "capturing" | "review" | "submitting" | "done" | "submit-error";

export default function SwitchFlow({ sessionId }: { sessionId: string }) {
  const [phase, setPhase] = useState<Phase>("instructions");
  const [countdown, setCountdown] = useState(3);
  const [frames, setFrames] = useState<string[]>([]); // base64 (no data: prefix)
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
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
      setPhase("ready");
    } catch {
      setPhase("camera-error");
    }
  }

  async function captureBurst() {
    setPhase("capturing");
    const shots: string[] = [];
    const video = videoRef.current;
    const canvas = canvasRef.current;
    for (let i = 0; i < BURST_COUNT; i++) {
      if (video && canvas) {
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          shots.push(dataUrl.split(",")[1]);
        }
      }
      await new Promise((r) => setTimeout(r, BURST_INTERVAL_MS));
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setFrames(shots);
    setPhase("review");
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
    startCamera();
  }

  async function submit() {
    setPhase("submitting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/sessions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          images: frames.map((base64, i) => ({
            base64,
            mediaType: "image/jpeg",
            filename: `switch-frame-${i}.jpg`,
          })),
          context: "",
          rawData: { frameCount: frames.length, burstIntervalMs: BURST_INTERVAL_MS },
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

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-xl border border-border bg-black">
        <video ref={videoRef} className="aspect-video w-full object-cover" playsInline muted />
        {phase === "countdown" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-5xl font-bold text-white">
            {countdown || "Go!"}
          </div>
        )}
        {phase === "capturing" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-lg font-medium text-white">
            Capturing… move both sticks in circles
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {phase === "ready" && (
        <button
          onClick={beginCountdown}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Start test
        </button>
      )}

      {phase === "review" && (
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-1">
            {frames.map((f, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={`data:image/jpeg;base64,${f}`} alt={`frame ${i + 1}`} className="aspect-square rounded object-cover" />
            ))}
          </div>
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
