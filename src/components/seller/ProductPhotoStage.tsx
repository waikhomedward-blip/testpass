"use client";

import { useState } from "react";
import { useCamera } from "./useCamera";
import CameraStage from "./CameraStage";

// A general photo of the physical unit itself — separate from whatever
// diagnostic capture the category's primitive uses. This is intentionally
// weak evidence (a photo alone doesn't prove much), but it's still useful:
// it lets the buyer actually see the item being tested, catch obvious
// cosmetic damage, and confirm it's a real photo of a real object rather
// than reused listing photos. TestPass is honest about that weight in the
// evaluator prompt (see PRODUCT_PHOTO_ADDENDUM in primitives.ts) — this
// step never changes a functional verdict, only adds an optional note.
//
// CAPTURE CORRECTION PRINCIPLE: this is the last capture the seller makes
// before submitting, so it's an easy place to auto-advance straight past a
// blurry or badly-framed shot. It doesn't — capture() only grabs a frame
// from the still-live video (useCamera never stops the stream on capture),
// so the seller sees exactly what was captured and can Retake it, with no
// camera restart, before it ever reaches onCaptured.
export default function ProductPhotoStage({
  deviceLabel,
  onCaptured,
  onSkip,
}: {
  deviceLabel: string;
  onCaptured: (base64: string) => void;
  onSkip?: () => void;
}) {
  const { videoRef, canvasRef, state, videoReady, setVideoReady, start, stop, capture } = useCamera();
  const [pendingShot, setPendingShot] = useState<string | null>(null);

  function handleCapture() {
    const shot = capture(0.85);
    if (!shot) return;
    setPendingShot(shot);
  }

  function retake() {
    setPendingShot(null);
  }

  function usePhoto() {
    if (!pendingShot) return;
    stop();
    onCaptured(pendingShot);
  }

  if (state === "idle") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-secondary">
          Last step: one photo of the whole {deviceLabel} itself, so the buyer can see the actual
          item — not a stock photo. This isn&apos;t part of the function test.
        </p>
        <button
          onClick={start}
          className="w-full rounded-lg bg-signal py-2.5 text-sm font-medium text-white transition-colors hover:bg-signal-hover"
        >
          Turn on camera
        </button>
        {onSkip && (
          <button onClick={onSkip} className="w-full rounded-lg border border-border-control py-2 text-sm font-medium">
            Skip this step
          </button>
        )}
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-failure">
          TestPass couldn&apos;t access your camera. Check your browser&apos;s camera permission for this
          site and try again.
        </p>
        <button onClick={start} className="rounded-lg border border-border-control px-4 py-2 text-sm font-medium">
          Try again
        </button>
        {onSkip && (
          <button onClick={onSkip} className="w-full rounded-lg border border-border-control py-2 text-sm font-medium">
            Skip this step
          </button>
        )}
      </div>
    );
  }

  if (pendingShot) {
    return (
      <div className="space-y-4">
        {/* .evidence-frame goes on this wrapper div, not the <img> — the
            corner marks are ::before/::after pseudo-elements, which don't
            render on replaced elements like img in any browser. */}
        <div className="evidence-frame relative aspect-video overflow-hidden rounded-lg border border-border-subtle">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pendingShot}
            alt={`Captured photo of the ${deviceLabel}`}
            className="h-full w-full object-cover"
          />
        </div>
        <p className="text-sm text-ink-secondary">Is the whole {deviceLabel} clearly visible?</p>
        <div className="flex gap-2">
          <button
            onClick={retake}
            className="flex-1 rounded-lg border border-border-control py-2.5 text-sm font-medium"
          >
            Retake
          </button>
          <button
            onClick={usePhoto}
            className="flex-1 rounded-lg bg-signal py-2.5 text-sm font-medium text-white transition-colors hover:bg-signal-hover"
          >
            Use photo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CameraStage videoRef={videoRef} state={state} videoReady={videoReady} onVideoReady={() => setVideoReady(true)} />
      <canvas ref={canvasRef} className="hidden" />
      <p className="text-sm text-ink-secondary">Frame the whole {deviceLabel} in the shot, then capture.</p>
      <button
        onClick={handleCapture}
        disabled={!videoReady}
        className="w-full rounded-lg bg-signal py-2.5 text-sm font-medium text-white transition-colors hover:bg-signal-hover disabled:opacity-40"
      >
        Capture photo
      </button>
    </div>
  );
}
