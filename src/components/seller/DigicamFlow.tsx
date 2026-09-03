"use client";

import { useRef, useState } from "react";
import { CATEGORY_CONFIG } from "@/lib/primitives";
import { newChallengeCode } from "@/lib/challenge";
import { resizeImageFile } from "@/lib/image-resize";
import { submitCapture } from "@/lib/submit-capture";
import StepIndicator from "./StepIndicator";
import SubmittedScreen from "./SubmittedScreen";
import ProductPhotoStage from "./ProductPhotoStage";
import NumberedSteps from "./NumberedSteps";
import ChallengeCode from "./ChallengeCode";

const config = CATEGORY_CONFIG.camera;
const STEPS = ["Your code", "Upload photos", "Product photo", "Review", "Submit"];

type Phase = "instructions" | "upload" | "product-photo" | "review" | "submitting" | "done" | "submit-error";

interface Shot {
  label: "Wide" | "Zoom";
  base64: string;
  previewUrl: string;
}

export default function DigicamFlow({ sessionId }: { sessionId: string }) {
  const [code] = useState(() => newChallengeCode());
  const [phase, setPhase] = useState<Phase>("instructions");
  const [wide, setWide] = useState<Shot | null>(null);
  const [zoom, setZoom] = useState<Shot | null>(null);
  const [productPhoto, setProductPhoto] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const wideInputRef = useRef<HTMLInputElement>(null);
  const zoomInputRef = useRef<HTMLInputElement>(null);

  async function onPick(label: "Wide" | "Zoom", file: File | undefined) {
    if (!file) return;
    setReadError(null);
    try {
      // Photos picked from a phone's library can be several megabytes at
      // full resolution — resized here, before they ever leave the phone,
      // so two or three of them never come close to the submit endpoint's
      // request-size ceiling. See src/lib/image-resize.ts.
      const { base64, previewUrl } = await resizeImageFile(file);
      const shot: Shot = { label, base64, previewUrl };
      if (label === "Wide") setWide(shot);
      else setZoom(shot);
    } catch (err) {
      setReadError(err instanceof Error ? err.message : "Couldn't read that photo. Try picking it again.");
    }
  }

  function goToUpload() {
    setPhase("upload");
    // Fire-and-forget instrumentation ping — the seller_started funnel event
    // (see the /start route). This is the seller's first deliberate action
    // past the instructions screen (they've already photographed the code
    // with the camera under test and are now committing to upload it),
    // mirroring the same "leave prepare/instructions" moment GuidedCaptureRunner
    // pings from in beginCapture(). Never blocks or gates the flow.
    fetch(`/api/sessions/${sessionId}/start`, { method: "POST" }).catch(() => {});
  }

  function retake() {
    setWide(null);
    setZoom(null);
    if (wideInputRef.current) wideInputRef.current.value = "";
    if (zoomInputRef.current) zoomInputRef.current.value = "";
    setPhase("upload");
  }

  async function submit() {
    if (!wide || !zoom) return;
    setPhase("submitting");
    setErrorMsg(null);
    try {
      const images: { base64: string; mediaType: "image/jpeg"; filename: string }[] = [
        { base64: wide.base64, mediaType: "image/jpeg", filename: "digicam-wide.jpg" },
        { base64: zoom.base64, mediaType: "image/jpeg", filename: "digicam-zoom.jpg" },
      ];
      if (productPhoto) {
        images.push({ base64: productPhoto, mediaType: "image/jpeg", filename: "product-photo.jpg" });
      }
      const { verdict } = await submitCapture({
        sessionId,
        images,
        context: `Expected one-time code: ${code}. First image is the WIDE shot, second image is the ZOOM shot.${
          productPhoto ? " The third image is a general photo of the whole camera — not part of the zoom test." : ""
        }`,
        rawData: { expectedCode: code, hasProductPhoto: !!productPhoto },
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
        <ChallengeCode code={code} hint="Keep this visible — you'll photograph it twice." />
        <NumberedSteps items={config.sellerInstructions.slice(1)} />
        <p className="text-xs text-ink-secondary">TestPass will collect: {config.dataCollected.join("; ")}.</p>
        <button
          onClick={goToUpload}
          className="w-full rounded-lg bg-signal py-2.5 text-sm font-medium text-white transition-colors hover:bg-signal-hover"
        >
          I&apos;ve taken both photos — upload them
        </button>
      </div>
    );
  }

  if (phase === "done") {
    return <SubmittedScreen verdict={verdict} />;
  }

  if (phase === "product-photo") {
    return (
      <div className="space-y-4">
        <StepIndicator steps={STEPS} current={2} />
        <ProductPhotoStage
          deviceLabel="camera"
          onCaptured={(b64) => {
            setProductPhoto(b64);
            setPhase("review");
          }}
          onSkip={() => setPhase("review")}
        />
      </div>
    );
  }

  const bothPicked = !!wide && !!zoom;

  if (phase === "review" || phase === "submitting" || phase === "submit-error") {
    return (
      <div className="space-y-4">
        <StepIndicator steps={STEPS} current={phase === "review" ? 3 : 4} />
        <div>
          <p className="mb-2 text-xs font-medium text-ink-secondary">Wide &amp; zoom test shots</p>
          <div className="grid grid-cols-2 gap-2">
            {wide && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={wide.previewUrl} alt="Wide shot" className="evidence-frame aspect-square w-full rounded-lg object-cover" />
            )}
            {zoom && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={zoom.previewUrl} alt="Zoom shot" className="evidence-frame aspect-square w-full rounded-lg object-cover" />
            )}
          </div>
        </div>
        {productPhoto && (
          <div>
            <p className="mb-2 text-xs font-medium text-ink-secondary">Photo of the device</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/jpeg;base64,${productPhoto}`}
              alt="Camera"
              className="evidence-frame aspect-video w-full rounded-lg object-cover"
            />
          </div>
        )}
        {phase === "review" && (
          <div className="flex gap-2">
            <button onClick={retake} className="flex-1 rounded-lg border border-border-control py-2 text-sm font-medium">
              Clear photos
            </button>
            <button
              onClick={submit}
              disabled={!bothPicked}
              className="flex-1 rounded-lg bg-signal py-2 text-sm font-medium text-white transition-colors hover:bg-signal-hover disabled:opacity-40"
            >
              Submit
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

  // "upload"
  return (
    <div className="space-y-4">
      <StepIndicator steps={STEPS} current={1} />

      <div className="flex items-center justify-center gap-2 text-xs text-ink-secondary">
        <span className="h-3 w-0.5 shrink-0 bg-signal" aria-hidden="true" />
        Code for this session: <span className="font-mono font-semibold text-foreground">{code}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PhotoSlot
          label="Wide shot"
          hint="Widest zoom setting"
          shot={wide}
          inputRef={wideInputRef}
          onChange={(f) => onPick("Wide", f)}
        />
        <PhotoSlot
          label="Zoom shot"
          hint="Full telephoto zoom"
          shot={zoom}
          inputRef={zoomInputRef}
          onChange={(f) => onPick("Zoom", f)}
        />
      </div>

      {readError && <p className="text-sm text-failure">{readError}</p>}

      <button
        onClick={() => setPhase("product-photo")}
        disabled={!bothPicked}
        className="w-full rounded-lg bg-signal py-2.5 text-sm font-medium text-white transition-colors hover:bg-signal-hover disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}

function PhotoSlot({
  label,
  hint,
  shot,
  inputRef,
  onChange,
}: {
  label: string;
  hint: string;
  shot: Shot | null;
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
        className={`flex aspect-square flex-col items-center justify-center overflow-hidden rounded-[var(--radius-lg)] border ${
          shot ? "evidence-frame border-signal shadow-card" : "border-dashed border-border-control"
        } bg-card text-center`}
      >
        {shot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot.previewUrl} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="px-3">
            <p className="text-sm font-medium">{label}</p>
            <p className="mt-1 text-xs text-ink-secondary">{hint}</p>
            <p className="mt-2 text-xs font-medium text-signal">Tap to choose photo</p>
          </div>
        )}
      </div>
    </label>
  );
}
