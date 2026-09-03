"use client";

import { useRef, useState } from "react";
import { CATEGORY_CONFIG } from "@/lib/primitives";
import { newChallengeCode } from "@/lib/challenge";
import { resizeImageFile } from "@/lib/image-resize";
import { submitCapture } from "@/lib/submit-capture";
import StepIndicator from "./StepIndicator";
import SubmittedScreen from "./SubmittedScreen";
import ProductPhotoStage from "./ProductPhotoStage";
import { useCamera } from "./useCamera";
import CameraStage from "./CameraStage";

const config = CATEGORY_CONFIG.camera;
const STEPS = ["Zoom test", "Product photo", "Review", "Submit"];

// EVIDENCE SURFACE RULE re-audit (physical-feasibility + error-recovery
// audit, round 2): the previous default asked the seller to photograph a
// one-time code with the digicam itself, then "transfer both photos to
// this phone — Wi-Fi transfer, SD card, however the camera normally
// exports." That transfer step is real, ordinary friction for a lot of
// digicams (no Wi-Fi export, no card reader on hand) that TestPass was
// quietly requiring as if it were part of "just use your phone and the
// product." Per Evidence Surface Rule case A, the evidence this test
// actually needs — the digicam's optical zoom visibly changing framing —
// already appears on the digicam's OWN operating display (its rear LCD),
// so TestPass's own live camera can observe it directly, the same way it
// already observes a Switch or Steam Deck's own screen. No file transfer,
// no code, no second device.
//
// New default: TestPass's live camera photographs the digicam's rear
// screen twice — once at wide zoom, once at full zoom, same framed
// subject — proving the zoom mechanism moved during this live session
// (freshness now comes from the server-timestamped live capture, per the
// same doctrine every other live-camera category already uses, not a
// held code). Two independent Retake/Use confirms, per the Capture
// Correction Principle, since a shaky or unreadable LCD photo is easy to
// get wrong on the first try.
//
// The original design — the digicam's own full-resolution photos of a
// one-time code, transferred and uploaded — genuinely is stronger
// evidence where a seller can do it without a hunt for a cable or reader
// (sharper, no LCD glare/moiré, and the code still gives an extra
// same-session freshness signal on top). Rather than deleting that path,
// it's now an explicit OPTIONAL step offered at review, clearly framed as
// a bonus a seller can skip — never the thing standing between them and
// Submit.
type Phase =
  | "instructions"
  | "live-wide"
  | "live-zoom"
  | "product-photo"
  | "review"
  | "optional-instructions"
  | "optional-upload"
  | "submitting"
  | "done"
  | "submit-error";

interface UploadShot {
  base64: string;
  previewUrl: string;
}

export default function DigicamFlow({ sessionId }: { sessionId: string }) {
  const [phase, setPhase] = useState<Phase>("instructions");

  // Default evidence: two live TestPass captures of the digicam's own
  // screen. Staged as "pending" first so each gets its own Retake/Use
  // confirm before it counts (Capture Correction Principle) — capture()
  // doesn't stop the stream, so Retake never needs a camera restart.
  const [pendingLiveWide, setPendingLiveWide] = useState<string | null>(null);
  const [pendingLiveZoom, setPendingLiveZoom] = useState<string | null>(null);
  const [liveWide, setLiveWide] = useState<string | null>(null);
  const [liveZoom, setLiveZoom] = useState<string | null>(null);

  const [productPhoto, setProductPhoto] = useState<string | null>(null);

  // Optional stronger-evidence path: the digicam's own original files of a
  // fresh one-time code, wide and zoomed. Code is generated on demand (only
  // once the seller opts in), well after hydration, so there's no
  // server/client mismatch to guard against the way an always-generated
  // code needs.
  const [optionalCode, setOptionalCode] = useState<string | null>(null);
  const [optWide, setOptWide] = useState<UploadShot | null>(null);
  const [optZoom, setOptZoom] = useState<UploadShot | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const optWideInputRef = useRef<HTMLInputElement>(null);
  const optZoomInputRef = useRef<HTMLInputElement>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [startedInstrumented, setStartedInstrumented] = useState(false);

  const { videoRef, canvasRef, state: cameraState, videoReady, setVideoReady, start, stop, capture } = useCamera();

  function pingStartedOnce() {
    if (startedInstrumented) return;
    setStartedInstrumented(true);
    fetch(`/api/sessions/${sessionId}/start`, { method: "POST" }).catch(() => {});
  }

  function beginLiveTest() {
    pingStartedOnce();
    start();
    setPhase("live-wide");
  }

  function captureLiveWide() {
    const shot = capture(0.85);
    if (!shot) return;
    setPendingLiveWide(shot);
  }

  function confirmLiveWide(action: "retake" | "use") {
    if (action === "retake") {
      setPendingLiveWide(null);
      return;
    }
    setLiveWide(pendingLiveWide);
    setPendingLiveWide(null);
    setPhase("live-zoom");
  }

  function captureLiveZoom() {
    const shot = capture(0.85);
    if (!shot) return;
    setPendingLiveZoom(shot);
  }

  function confirmLiveZoom(action: "retake" | "use") {
    if (action === "retake") {
      setPendingLiveZoom(null);
      return;
    }
    setLiveZoom(pendingLiveZoom);
    setPendingLiveZoom(null);
    stop();
    setPhase("product-photo");
  }

  function retakeLiveWide() {
    setLiveWide(null);
    setPendingLiveWide(null);
    start();
    setPhase("live-wide");
  }

  function retakeLiveZoom() {
    setLiveZoom(null);
    setPendingLiveZoom(null);
    start();
    setPhase("live-zoom");
  }

  function retakeProductPhoto() {
    setPhase("product-photo");
  }

  function beginOptional() {
    if (!optionalCode) setOptionalCode(newChallengeCode());
    setPhase("optional-instructions");
  }

  function skipOptional() {
    // Nothing to discard unless they'd already picked files, in which case
    // "skip" is really "remove" — handled separately below, since once
    // files exist the review screen shows them with their own controls.
    setPhase("review");
  }

  function removeOptional() {
    setOptWide(null);
    setOptZoom(null);
    setOptionalCode(null);
    if (optWideInputRef.current) optWideInputRef.current.value = "";
    if (optZoomInputRef.current) optZoomInputRef.current.value = "";
    setPhase("review");
  }

  async function onPickOptional(which: "wide" | "zoom", file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    try {
      const { base64, previewUrl } = await resizeImageFile(file);
      if (which === "wide") setOptWide({ base64, previewUrl });
      else setOptZoom({ base64, previewUrl });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Couldn't read that photo. Try picking it again.");
    }
  }

  async function submit() {
    if (!liveWide || !liveZoom) return;
    setPhase("submitting");
    setErrorMsg(null);
    try {
      const images: { base64: string; mediaType: "image/jpeg"; filename: string }[] = [
        { base64: liveWide, mediaType: "image/jpeg", filename: "digicam-live-wide.jpg" },
        { base64: liveZoom, mediaType: "image/jpeg", filename: "digicam-live-zoom.jpg" },
      ];
      const hasOptional = !!optWide && !!optZoom;
      if (hasOptional) {
        images.push({ base64: optWide!.base64, mediaType: "image/jpeg", filename: "digicam-original-wide.jpg" });
        images.push({ base64: optZoom!.base64, mediaType: "image/jpeg", filename: "digicam-original-zoom.jpg" });
      }
      if (productPhoto) {
        images.push({ base64: productPhoto, mediaType: "image/jpeg", filename: "product-photo.jpg" });
      }

      const parts = [
        "Images 1-2 are TestPass's own live camera capturing the digicam's rear screen: Image 1 at the digicam's widest zoom, Image 2 at full zoom, same framed subject, captured moments apart in this session.",
      ];
      if (hasOptional) {
        parts.push(
          `Images 3-4 are an OPTIONAL stronger-evidence pair: original photos taken by the digicam itself (not TestPass's camera) of a one-time code, wide then zoomed. Expected code: ${optionalCode}.`
        );
      }
      if (productPhoto) {
        parts.push(
          `The final image is a live-camera photo of the whole digicam, taken by TestPass itself — cosmetic only, not part of the zoom test.`
        );
      }

      const { verdict } = await submitCapture({
        sessionId,
        images,
        context: parts.join(" "),
        rawData: {
          evidenceMethod: "live_camera_of_screen",
          hasOptionalOriginalFiles: hasOptional,
          optionalExpectedCode: hasOptional ? optionalCode : null,
          hasProductPhoto: !!productPhoto,
        },
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
          <li>Point the digicam you&apos;re selling at something across the room, zoomed all the way OUT (widest setting).</li>
          <li>Turn on TestPass&apos;s camera below and photograph the digicam&apos;s own rear screen, showing that wide view.</li>
          <li>Without moving the digicam, zoom it all the way IN (full telephoto), then photograph the digicam&apos;s screen again with TestPass&apos;s camera.</li>
          <li>Finally, take one photo of the digicam itself.</li>
        </ol>
        <p className="text-xs text-foreground/50">TestPass will collect: {config.dataCollected.join("; ")}.</p>
        <button
          onClick={beginLiveTest}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Turn on camera
        </button>
      </div>
    );
  }

  if (phase === "done") {
    return <SubmittedScreen verdict={verdict} />;
  }

  if (cameraState === "error" && (phase === "live-wide" || phase === "live-zoom")) {
    return (
      <div className="space-y-3 text-sm">
        <p>TestPass couldn&apos;t access your camera. Check your browser&apos;s camera permission for this site and try again.</p>
        <button onClick={start} className="rounded-lg border border-border px-4 py-2 text-sm font-medium">
          Try again
        </button>
      </div>
    );
  }

  if (phase === "live-wide") {
    return (
      <div className="space-y-4">
        <StepIndicator steps={STEPS} current={0} />
        {!pendingLiveWide && (
          <p className="text-sm text-foreground/70">
            Frame the digicam&apos;s rear screen so its WIDE view is clearly readable, then capture.
          </p>
        )}
        {pendingLiveWide ? (
          <>
            <p className="text-sm text-foreground/70">Is the digicam&apos;s screen clearly readable?</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/jpeg;base64,${pendingLiveWide}`}
              alt="Digicam screen, wide"
              className="aspect-video w-full rounded-lg object-cover"
            />
            <div className="flex gap-2">
              <button
                onClick={() => confirmLiveWide("retake")}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-foreground/5"
              >
                Retake
              </button>
              <button
                onClick={() => confirmLiveWide("use")}
                className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90"
              >
                Use photo
              </button>
            </div>
          </>
        ) : (
          <>
            <CameraStage videoRef={videoRef} state={cameraState} videoReady={videoReady} onVideoReady={() => setVideoReady(true)} />
            <button
              onClick={captureLiveWide}
              disabled={!videoReady}
              className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              Capture wide view
            </button>
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  if (phase === "live-zoom") {
    return (
      <div className="space-y-4">
        <StepIndicator steps={STEPS} current={0} />
        {!pendingLiveZoom && (
          <p className="text-sm text-foreground/70">
            Now, without moving the digicam, zoom it all the way in and capture the screen again.
          </p>
        )}
        {pendingLiveZoom ? (
          <>
            <p className="text-sm text-foreground/70">Is the zoomed-in view clearly readable?</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/jpeg;base64,${pendingLiveZoom}`}
              alt="Digicam screen, zoomed"
              className="aspect-video w-full rounded-lg object-cover"
            />
            <div className="flex gap-2">
              <button
                onClick={() => confirmLiveZoom("retake")}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-foreground/5"
              >
                Retake
              </button>
              <button
                onClick={() => confirmLiveZoom("use")}
                className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90"
              >
                Use photo
              </button>
            </div>
          </>
        ) : (
          <>
            <CameraStage videoRef={videoRef} state={cameraState} videoReady={videoReady} onVideoReady={() => setVideoReady(true)} />
            <button
              onClick={captureLiveZoom}
              disabled={!videoReady}
              className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              Capture zoomed-in view
            </button>
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  if (phase === "product-photo") {
    return (
      <div className="space-y-4">
        <StepIndicator steps={STEPS} current={1} />
        <ProductPhotoStage
          deviceLabel="digicam"
          onCaptured={(b64) => {
            setProductPhoto(b64);
            setPhase("review");
          }}
          onSkip={() => setPhase("review")}
        />
      </div>
    );
  }

  if (phase === "optional-instructions") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">Your one-time code</p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-widest">{optionalCode}</p>
          <p className="mt-2 text-xs text-foreground/50">Keep this visible — you&apos;ll photograph it twice, with the digicam.</p>
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">Optional — stronger evidence</p>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>Using the digicam you&apos;re selling, take one photo of the code above from a few feet away, zoomed all the way OUT (widest setting).</li>
          <li>Without moving the digicam or the code, zoom it all the way IN (full telephoto) and take a second photo of the same code.</li>
          <li>Transfer both photos to this phone — Wi-Fi transfer, SD card, however the digicam normally exports — then upload them here.</li>
        </ol>
        <button
          onClick={() => setPhase("optional-upload")}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          I&apos;ve taken both photos — upload them
        </button>
        <button onClick={skipOptional} className="w-full text-center text-xs text-foreground/40 underline">
          Never mind, skip this
        </button>
      </div>
    );
  }

  if (phase === "optional-upload") {
    const bothPicked = !!optWide && !!optZoom;
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-dashed border-border px-3 py-2 text-center text-xs text-foreground/50">
          Code for this pair: <span className="font-mono font-semibold text-foreground/70">{optionalCode}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <OptionalPhotoSlot
            label="Wide shot"
            hint="Widest zoom setting"
            shot={optWide}
            inputRef={optWideInputRef}
            onChange={(f) => onPickOptional("wide", f)}
          />
          <OptionalPhotoSlot
            label="Zoom shot"
            hint="Full telephoto zoom"
            shot={optZoom}
            inputRef={optZoomInputRef}
            onChange={(f) => onPickOptional("zoom", f)}
          />
        </div>
        {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
        <button
          onClick={() => setPhase("review")}
          disabled={!bothPicked}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          Continue
        </button>
        <button onClick={skipOptional} className="w-full text-center text-xs text-foreground/40 underline">
          Never mind, skip this
        </button>
      </div>
    );
  }

  // "review" / "submitting" / "submit-error"
  const hasOptional = !!optWide && !!optZoom;
  return (
    <div className="space-y-4">
      <StepIndicator steps={STEPS} current={phase === "review" ? 2 : 3} />

      <div>
        <p className="mb-2 text-xs font-medium text-foreground/50">Live zoom test (TestPass&apos;s camera, of the digicam&apos;s screen)</p>
        <div className="grid grid-cols-2 gap-2">
          {liveWide && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`data:image/jpeg;base64,${liveWide}`} alt="Wide view" className="aspect-square w-full rounded-lg object-cover" />
          )}
          {liveZoom && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`data:image/jpeg;base64,${liveZoom}`} alt="Zoomed view" className="aspect-square w-full rounded-lg object-cover" />
          )}
        </div>
        <div className="mt-1.5 flex gap-4">
          <button onClick={retakeLiveWide} className="text-xs font-medium text-accent hover:underline">
            Retake wide view
          </button>
          <button onClick={retakeLiveZoom} className="text-xs font-medium text-accent hover:underline">
            Retake zoomed view
          </button>
        </div>
      </div>

      {productPhoto && (
        <div>
          <p className="mb-2 text-xs font-medium text-foreground/50">Photo of the digicam</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/jpeg;base64,${productPhoto}`} alt="Digicam" className="aspect-video w-full rounded-lg object-cover" />
          <button onClick={retakeProductPhoto} className="mt-1.5 text-xs font-medium text-accent hover:underline">
            Retake device photo
          </button>
        </div>
      )}

      {hasOptional ? (
        <div>
          <p className="mb-2 text-xs font-medium text-foreground/50">Optional: original digicam files (code {optionalCode})</p>
          <div className="grid grid-cols-2 gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={optWide!.previewUrl} alt="Original wide" className="aspect-square w-full rounded-lg object-cover" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={optZoom!.previewUrl} alt="Original zoom" className="aspect-square w-full rounded-lg object-cover" />
          </div>
          <button onClick={removeOptional} className="mt-1.5 text-xs font-medium text-accent hover:underline">
            Remove this pair
          </button>
        </div>
      ) : (
        phase === "review" && (
          <button
            onClick={beginOptional}
            className="w-full rounded-lg border border-dashed border-border py-2.5 text-sm font-medium text-foreground/70 hover:bg-foreground/5"
          >
            + Add stronger evidence (optional): upload the digicam&apos;s own photos
          </button>
        )
      )}

      {phase === "review" && (
        <button
          onClick={submit}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Submit
        </button>
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

function OptionalPhotoSlot({
  label,
  hint,
  shot,
  inputRef,
  onChange,
}: {
  label: string;
  hint: string;
  shot: UploadShot | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (file: File | undefined) => void;
}) {
  return (
    <label className="block cursor-pointer">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0])}
      />
      <div
        className={`flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl border ${
          shot ? "border-accent" : "border-dashed border-border"
        } bg-card text-center`}
      >
        {shot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot.previewUrl} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="px-3">
            <p className="text-sm font-medium">{label}</p>
            <p className="mt-1 text-xs text-foreground/50">{hint}</p>
            <p className="mt-2 text-xs font-medium text-accent">Tap to choose photo</p>
          </div>
        )}
      </div>
    </label>
  );
}
