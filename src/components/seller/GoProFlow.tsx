"use client";

import { useState } from "react";
import { CATEGORY_CONFIG } from "@/lib/primitives";
import StepIndicator from "./StepIndicator";
import { useCamera } from "./useCamera";
import CameraStage from "./CameraStage";
import ProductPhotoStage from "./ProductPhotoStage";

const config = CATEGORY_CONFIG.gopro;
const STEPS = ["Bluetooth", "Photo", "Product photo", "Review", "Submit"];

// Minimal Web Bluetooth typings for the subset this component uses — the
// full API isn't in lib.dom.d.ts by default, and this keeps us honest
// about exactly what we touch instead of reaching for `any`.
interface BleCharacteristic {
  readValue(): Promise<DataView>;
}
interface BleService {
  getCharacteristic(name: string): Promise<BleCharacteristic>;
}
interface BleServer {
  getPrimaryService(name: string): Promise<BleService>;
}
interface BleDevice {
  name?: string;
  gatt?: { connect(): Promise<BleServer> };
}
interface BluetoothApi {
  requestDevice(options: { acceptAllDevices?: boolean; optionalServices?: string[] }): Promise<BleDevice>;
}

type Phase =
  | "instructions"
  | "bluetooth-connecting"
  | "camera-instructions"
  | "camera-ready"
  | "product-photo"
  | "review"
  | "submitting"
  | "done"
  | "submit-error";

interface BluetoothResult {
  attempted: boolean;
  succeeded: boolean;
  deviceName: string | null;
  batteryLevel: number | null;
  manufacturer: string | null;
  model: string | null;
  note: string;
}

const EMPTY_BT: BluetoothResult = {
  attempted: false,
  succeeded: false,
  deviceName: null,
  batteryLevel: null,
  manufacturer: null,
  model: null,
  note: "Not attempted.",
};

export default function GoProFlow({ sessionId }: { sessionId: string }) {
  const [phase, setPhase] = useState<Phase>("instructions");
  const [bt, setBt] = useState<BluetoothResult>(EMPTY_BT);
  const [frame, setFrame] = useState<string | null>(null);
  const [productPhoto, setProductPhoto] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { videoRef, canvasRef, state: cameraState, videoReady, setVideoReady, start, stop, capture } = useCamera();

  async function connectBluetooth() {
    setPhase("bluetooth-connecting");
    const nav = navigator as Navigator & { bluetooth?: BluetoothApi };
    if (!nav.bluetooth) {
      setBt({ ...EMPTY_BT, attempted: true, note: "Web Bluetooth isn't supported in this browser." });
      setPhase("camera-instructions");
      return;
    }
    try {
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["battery_service", "device_information"],
      });
      if (!device.gatt) throw new Error("Device doesn't support GATT connections.");
      const server = await device.gatt.connect();

      let batteryLevel: number | null = null;
      try {
        const svc = await server.getPrimaryService("battery_service");
        const char = await svc.getCharacteristic("battery_level");
        const value = await char.readValue();
        batteryLevel = value.getUint8(0);
      } catch {
        /* device doesn't expose battery_service — fine, evaluator is told */
      }

      let manufacturer: string | null = null;
      let model: string | null = null;
      try {
        const svc = await server.getPrimaryService("device_information");
        try {
          const c = await svc.getCharacteristic("manufacturer_name_string");
          manufacturer = new TextDecoder().decode((await c.readValue()).buffer);
        } catch {}
        try {
          const c = await svc.getCharacteristic("model_number_string");
          model = new TextDecoder().decode((await c.readValue()).buffer);
        } catch {}
      } catch {}

      setBt({
        attempted: true,
        succeeded: true,
        deviceName: device.name ?? null,
        batteryLevel,
        manufacturer,
        model,
        note: "Connected via Bluetooth.",
      });
    } catch (err) {
      setBt({
        ...EMPTY_BT,
        attempted: true,
        note: err instanceof Error ? `Bluetooth connection failed or was cancelled: ${err.message}` : "Bluetooth connection failed or was cancelled.",
      });
    }
    setPhase("camera-instructions");
  }

  function skipBluetooth() {
    setBt({ ...EMPTY_BT, attempted: true, note: "Seller skipped the Bluetooth step." });
    setPhase("camera-instructions");
  }

  function captureFrame() {
    const shot = capture(0.85);
    if (!shot) return;
    setFrame(shot);
    stop();
    setPhase("product-photo");
  }

  function retake() {
    setFrame(null);
    start();
    setPhase("camera-ready");
  }

  async function submit() {
    if (!frame) return;
    setPhase("submitting");
    setErrorMsg(null);
    const context = [
      `Bluetooth: ${bt.note}`,
      bt.deviceName ? `Device name: ${bt.deviceName}` : null,
      bt.manufacturer ? `Manufacturer: ${bt.manufacturer}` : null,
      bt.model ? `Model: ${bt.model}` : null,
      bt.batteryLevel !== null ? `Reported battery level: ${bt.batteryLevel}%` : null,
      productPhoto ? "The final image is a general photo of the whole GoPro — not part of the status check." : null,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const images = [{ base64: frame, mediaType: "image/jpeg" as const, filename: "gopro-status.jpg" }];
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
          rawData: { bluetooth: bt, hasProductPhoto: !!productPhoto },
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
        <p className="text-xs text-foreground/50">
          TestPass will collect: {config.dataCollected.join("; ")}. Bluetooth support varies by
          camera model and browser — if it doesn&apos;t work, you can skip straight to the photo step.
        </p>
        <button
          onClick={connectBluetooth}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Connect via Bluetooth
        </button>
        <button onClick={skipBluetooth} className="w-full rounded-lg border border-border py-2 text-sm font-medium">
          Skip — use photo only
        </button>
      </div>
    );
  }

  if (phase === "bluetooth-connecting") {
    return <p className="text-center text-sm text-foreground/60">Pick your GoPro from the browser&apos;s device list…</p>;
  }

  if (phase === "camera-instructions") {
    return (
      <div className="space-y-4">
        <StepIndicator steps={STEPS} current={1} />
        <p className="text-sm">
          {bt.succeeded ? "Bluetooth connected. " : ""}Now take one clear photo of the GoPro&apos;s
          screen showing its battery and storage status.
        </p>
        <button
          onClick={() => {
            start();
            setPhase("camera-ready");
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
          deviceLabel="GoPro"
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
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-lg font-semibold">Submitted — thanks!</p>
        <p className="mt-2 text-sm text-foreground/60">The buyer has your test result now. You&apos;re done.</p>
      </div>
    );
  }

  const stepIndex =
    phase === "review" ? 3 : phase === "submitting" || phase === "submit-error" ? 4 : 1;

  return (
    <div className="space-y-4">
      <StepIndicator steps={STEPS} current={stepIndex} />

      {phase === "camera-ready" && (
        <CameraStage
          videoRef={videoRef}
          state={cameraState}
          videoReady={videoReady}
          onVideoReady={() => setVideoReady(true)}
        />
      )}
      <canvas ref={canvasRef} className="hidden" />

      {phase === "camera-ready" && (
        <button
          onClick={captureFrame}
          disabled={!videoReady}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          Capture photo
        </button>
      )}

      {phase === "review" && (
        <div className="space-y-4">
          {frame && (
            <div>
              <p className="mb-2 text-xs font-medium text-foreground/50">Status screen</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/jpeg;base64,${frame}`} alt="captured status screen" className="aspect-video w-full rounded-lg object-cover" />
            </div>
          )}
          {productPhoto && (
            <div>
              <p className="mb-2 text-xs font-medium text-foreground/50">Photo of the device</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/jpeg;base64,${productPhoto}`} alt="GoPro" className="aspect-video w-full rounded-lg object-cover" />
            </div>
          )}
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
