"use client";

import { CameraState } from "./useCamera";

// The visual half of every camera step: nothing renders at all until a
// camera is actually starting, and the live feed fades in the instant its
// first real frame paints — no black box sitting there while the stream
// warms up. A small spinner fills that gap instead.
export default function CameraStage({
  videoRef,
  state,
  videoReady,
  onVideoReady,
  overlay,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  state: CameraState;
  videoReady: boolean;
  onVideoReady: () => void;
  overlay?: React.ReactNode;
}) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-card">
      <video
        ref={videoRef}
        onPlaying={onVideoReady}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ease-out ${
          videoReady ? "opacity-100" : "opacity-0"
        }`}
        playsInline
        muted
      />
      {!videoReady && (state === "starting" || state === "live") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-signal motion-reduce:animate-none" />
          <span className="text-xs text-ink-secondary">Starting camera…</span>
        </div>
      )}
      {videoReady && overlay}
    </div>
  );
}
