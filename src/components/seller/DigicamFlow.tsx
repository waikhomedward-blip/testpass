"use client";

import { useRef, useState } from "react";
import { CATEGORY_CONFIG } from "@/lib/primitives";
import { newChallengeCode } from "@/lib/challenge";
import StepIndicator from "./StepIndicator";

const config = CATEGORY_CONFIG.camera;
const STEPS = ["Your code", "Upload photos", "Review", "Submit"];

type Phase = "instructions" | "review" | "submitting" | "done" | "submit-error";

interface Shot {
  label: "Wide" | "Zoom";
  base64: string;
  previewUrl: string;
}

function readFileAsBase64(file: File): Promise<{ base64: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const result = reader.result as string;
      resolve({ base64: result.split(",")[1] ?? "", previewUrl: result });
    };
    reader.readAsDataURL(file);
  });
}

export default function DigicamFlow({ sessionId }: { sessionId: string }) {
  const [code] = useState(() => newChallengeCode());
  const [phase, setPhase] = useState<Phase>("instructions");
  const [wide, setWide] = useState<Shot | null>(null);
  const [zoom, setZoom] = useState<Shot | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const wideInputRef = useRef<HTMLInputElement>(null);
  const zoomInputRef = useRef<HTMLInputElement>(null);

  async function onPick(label: "Wide" | "Zoom", file: File | undefined) {
    if (!file) return;
    setReadError(null);
    try {
      const { base64, previewUrl } = await readFileAsBase64(file);
      const shot: Shot = { label, base64, previewUrl };
      if (label === "Wide") setWide(shot);
      else setZoom(shot);
    } catch {
      setReadError("Couldn't read that photo. Try picking it again.");
    }
  }

  function goToUpload() {
    setPhase("review"); // "review" phase doubles as the upload+review step below
  }

  function retake() {
    setWide(null);
    setZoom(null);
    if (wideInputRef.current) wideInputRef.current.value = "";
    if (zoomInputRef.current) zoomInputRef.current.value = "";
  }

  async function submit() {
    if (!wide || !zoom) return;
    setPhase("submitting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/sessions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          images: [
            { base64: wide.base64, mediaType: "image/jpeg", filename: "digicam-wide.jpg" },
            { base64: zoom.base64, mediaType: "image/jpeg", filename: "digicam-zoom.jpg" },
          ],
          context: `Expected one-time code: ${code}. First image is the WIDE shot, second image is the ZOOM shot.`,
          rawData: { expectedCode: code },
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
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">Your one-time code</p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-widest">{code}</p>
          <p className="mt-2 text-xs text-foreground/50">Keep this visible — you&apos;ll photograph it twice.</p>
        </div>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          {config.sellerInstructions.slice(1).map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        <p className="text-xs text-foreground/50">TestPass will collect: {config.dataCollected.join("; ")}.</p>
        <button
          onClick={goToUpload}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          I&apos;ve taken both photos — upload them
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

  const bothPicked = !!wide && !!zoom;

  return (
    <div className="space-y-4">
      <StepIndicator steps={STEPS} current={phase === "submitting" || phase === "submit-error" ? 3 : bothPicked ? 2 : 1} />

      <div className="rounded-lg border border-dashed border-border px-3 py-2 text-center text-xs text-foreground/50">
        Code for this session: <span className="font-mono font-semibold text-foreground/70">{code}</span>
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

      {readError && <p className="text-sm text-red-500">{readError}</p>}

      {phase === "review" && (
        <div className="flex gap-2">
          <button onClick={retake} className="flex-1 rounded-lg border border-border py-2 text-sm font-medium">
            Clear photos
          </button>
          <button
            onClick={submit}
            disabled={!bothPicked}
            className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            Submit
          </button>
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
