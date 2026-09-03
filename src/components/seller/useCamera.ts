"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraState = "idle" | "starting" | "live" | "error";

// Shared getUserMedia lifecycle for every seller camera step (diagnostic
// captures and the product-photo step alike).
//
// The previous per-flow implementations set `videoRef.current.srcObject`
// synchronously right after `getUserMedia` resolved, in the SAME function
// call that had just requested the stream. On a component's first camera
// activation that ref is still null at that point — the <video> element
// only gets mounted once React re-renders into the "camera active" phase,
// which happens *after* that function has already moved on. The stream
// would sit there granted but never attached, so the video area stayed
// black. This hook fixes that by attaching the stream in a `useEffect` keyed
// on the live camera state, which only runs after the <video> element is
// actually in the DOM — correct whether this is the first activation or a
// retake.
//
// CAPTURE CORRECTION PRINCIPLE follow-on fix: every "preview the shot,
// then Retake/Use" confirm screen (GuidedCaptureRunner, ProductPhotoStage,
// GoProFlow's status-photo step) swaps the live <video> out of the tree for
// a captured-frame <img> and back again, without ever calling stop() —
// the whole point is that Retake doesn't restart the camera. But `state`
// never changes across that round trip (the stream stays "live" the whole
// time), so the effect above never re-fires on its own, and a plain object
// ref doesn't notice a brand-new <video> DOM node mounting in the old one's
// place — it would just sit there with no srcObject, silently black, and
// `videoReady` would never flip back on since `onPlaying` can't fire.
// `videoRef` is exported as a CALLBACK ref instead so reattachment happens
// the instant React mounts (or remounts) the node, independent of `state`.
export function useCamera() {
  const videoNodeRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>("idle");
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const attachStream = useCallback(() => {
    const video = videoNodeRef.current;
    const stream = streamRef.current;
    if (!video || !stream || video.srcObject === stream) return;
    video.srcObject = stream;
    video.play().catch(() => {
      /* autoplay can reject on some browsers until a user gesture — the
         gesture that started the camera already happened, so this is
         usually a no-op guard, not a real failure. */
    });
  }, []);

  // Covers first activation: the stream can resolve after the <video> is
  // already mounted, so this catches that ordering too.
  useEffect(() => {
    if (state === "live") attachStream();
  }, [state, attachStream]);

  const videoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoNodeRef.current = node;
      if (node) attachStream();
    },
    [attachStream]
  );

  const start = useCallback(async () => {
    setVideoReady(false);
    setState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setState("live");
    } catch {
      setState("error");
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setVideoReady(false);
    setState("idle");
  }, []);

  const capture = useCallback((quality = 0.85): string | null => {
    const video = videoNodeRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality).split(",")[1];
  }, []);

  return { videoRef, canvasRef, state, videoReady, setVideoReady, start, stop, capture };
}
