"use client";

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

  function handleCapture() {
    const shot = capture(0.85);
    if (!shot) return;
    stop();
    onCaptured(shot);
  }

  if (state === "idle") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-foreground/70">
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

  return (
    <div className="space-y-4">
      <CameraStage videoRef={videoRef} state={state} videoReady={videoReady} onVideoReady={() => setVideoReady(true)} />
      <canvas ref={canvasRef} className="hidden" />
      <p className="text-sm text-foreground/70">Frame the whole {deviceLabel} in the shot, then capture.</p>
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
