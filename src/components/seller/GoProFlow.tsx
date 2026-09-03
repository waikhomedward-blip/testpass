"use client";

import { useEffect, useState } from "react";
import { CATEGORY_CONFIG } from "@/lib/primitives";
import { submitCapture } from "@/lib/submit-capture";
import StepIndicator from "./StepIndicator";
import SubmittedScreen from "./SubmittedScreen";
import { useCamera } from "./useCamera";
import CameraStage from "./CameraStage";
import ProductPhotoStage from "./ProductPhotoStage";

const config = CATEGORY_CONFIG.gopro;
const STEPS = ["Bluetooth", "Photo", "Product photo", "Review", "Submit"];

// Confirmed integrity fix (one-phone-seller-evidence audit, round 2): the
// first pass of this fix stopped at confirming GoPro's Control & Query BLE
// service was present (getPrimaryService resolving) before calling a
// connection "succeeded." That's real progress over the original
// acceptAllDevices + bare gatt.connect() bug, but service discovery alone
// still isn't a device READ — it doesn't prove TestPass actually got
// anything meaningful back from the camera, which is what "Direct device
// read" is supposed to mean.
//
// Fixed properly this round, against GoPro's own Open GoPro BLE docs
// (gopro.github.io/OpenGoPro/docs/ble/{protocol/data_protocol,query,
// statuses}) as the authority for every byte value below — nothing here is
// guessed:
//   1. Device chooser filtered to GoPro's documented service (unchanged
//      from round 1) — see GOPRO_SERVICE_UUID.
//   2. After GATT connect, TestPass sends GoPro's documented Get Hardware
//      Info command (ID 0x3C) on the Command characteristic and awaits a
//      real parsed response (model name + firmware version) on Command
//      Response — not just a successful write. This is the actual read
//      GoPro's own BLE setup guide describes polling to confirm BLE
//      readiness.
//   3. Only once that response parses successfully is this "succeeded" /
//      evidenceMethod "direct_ble". Anything short of that — service
//      missing, command times out, response malformed, camera not ready —
//      falls back to the honest photo path, with a plain-language note
//      and no protocol internals shown to the seller.
//   4. As a bonus (never gates success), TestPass also sends Get Status
//      Values (ID 0x13) on the Query characteristic asking for status 70
//      (Internal Battery Percentage) and reads it off Query Response if it
//      parses cleanly.
// Both commands are documented read-only queries — nothing here changes a
// camera setting or triggers a control command.
const GOPRO_SERVICE_UUID = "b5f9fea6-aa8d-11e3-9046-0002a5d5c51b";
const GOPRO_COMMAND_UUID = "b5f90072-aa8d-11e3-9046-0002a5d5c51b";
const GOPRO_COMMAND_RESPONSE_UUID = "b5f90073-aa8d-11e3-9046-0002a5d5c51b";
const GOPRO_QUERY_UUID = "b5f90076-aa8d-11e3-9046-0002a5d5c51b";
const GOPRO_QUERY_RESPONSE_UUID = "b5f90077-aa8d-11e3-9046-0002a5d5c51b";
const GET_HARDWARE_INFO_COMMAND_ID = 0x3c;
const GET_STATUS_VALUES_COMMAND_ID = 0x13;
const BATTERY_PERCENTAGE_STATUS_ID = 70;

// Minimal Web Bluetooth typings for the subset this component uses — the
// full API isn't in lib.dom.d.ts by default, and this keeps us honest
// about exactly what we touch instead of reaching for `any`. Extended this
// round to cover writing a command and subscribing to its notified
// response, on top of the plain characteristic reads round 1 already used.
interface BleNotifyEvent {
  target: { value: DataView | null } | null;
}
interface BleCharacteristic {
  readValue(): Promise<DataView>;
  // Typed as Uint8Array (not BufferSource) deliberately: the real Web
  // Bluetooth API accepts BufferSource, but TS's current lib.dom typings
  // make ArrayBufferView generic over ArrayBuffer specifically, while
  // Uint8Array's own `buffer` property is typed as the broader
  // ArrayBufferLike (it can back onto a SharedArrayBuffer) — the two don't
  // unify even though every value we ever pass here is a plain,
  // non-shared Uint8Array. Narrowing this interface's param type sidesteps
  // that mismatch without an `as`-cast at every call site.
  writeValue(data: Uint8Array): Promise<void>;
  startNotifications(): Promise<BleCharacteristic>;
  addEventListener(type: "characteristicvaluechanged", listener: (event: BleNotifyEvent) => void): void;
  removeEventListener(type: "characteristicvaluechanged", listener: (event: BleNotifyEvent) => void): void;
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
  requestDevice(options: {
    filters?: { services?: string[] }[];
    acceptAllDevices?: boolean;
    optionalServices?: string[];
  }): Promise<BleDevice>;
}

// --- Open GoPro BLE packet framing (data_protocol docs) -------------------
// Every command write and notified response is wrapped in a small header:
// a "General" 5-bit-length header for short (<=31 byte) messages, an
// "Extended" 13-bit-length header for longer ones, and "Continuation"
// packets (top bit set) carrying the rest of a message that didn't fit in
// one BLE notification. All multi-byte values are big-endian.

// Builds a request packet: [header][commandId][param: length + value]*.
// Every command this file sends takes at most one parameter (a byte
// array), which covers Get Hardware Info (none) and Get Status Values
// (one: the array of requested status IDs).
function buildGoProRequestPacket(commandId: number, param?: Uint8Array): Uint8Array {
  const payload: number[] = [commandId];
  if (param) payload.push(param.length, ...Array.from(param));
  const len = payload.length;
  if (len <= 0x1f) {
    // General header: start=0, type=00, 5-bit length.
    return new Uint8Array([len & 0x1f, ...payload]);
  }
  // Extended header: start=0, type=01, 13-bit length across two bytes.
  return new Uint8Array([0x20 | ((len >> 8) & 0x1f), len & 0xff, ...payload]);
}

// Reassembles one or more notification packets into a complete message
// payload, per the header scheme above. Returns null until the declared
// length has actually been received.
class GoProResponseAssembler {
  private buf: number[] = [];
  private expectedLen: number | null = null;

  feed(packet: Uint8Array): Uint8Array | null {
    if (packet.length === 0) return null;
    const b0 = packet[0];
    let offset: number;
    if (this.expectedLen === null) {
      if ((b0 & 0x80) !== 0) return null; // stray continuation with nothing to continue
      const typeBits = (b0 >> 5) & 0x03;
      if (typeBits === 0) {
        this.expectedLen = b0 & 0x1f;
        offset = 1;
      } else if (typeBits === 1) {
        if (packet.length < 2) return null;
        this.expectedLen = ((b0 & 0x1f) << 8) | packet[1];
        offset = 2;
      } else {
        return null; // reserved header type — not produced by this protocol
      }
      this.buf = [];
    } else {
      offset = 1; // continuation packet: skip its 1-byte header
    }
    for (; offset < packet.length; offset++) this.buf.push(packet[offset]);
    if (this.expectedLen !== null && this.buf.length >= this.expectedLen) {
      const complete = new Uint8Array(this.buf.slice(0, this.expectedLen));
      this.expectedLen = null;
      this.buf = [];
      return complete;
    }
    return null;
  }
}

// Writes a command and resolves with the fully reassembled response
// payload — or rejects on timeout/GATT error. The notification listener is
// attached and notifications are enabled before the write goes out, so a
// fast response can't arrive before anyone is listening for it.
async function sendGoProCommand(
  gpService: BleService,
  writeCharUuid: string,
  responseCharUuid: string,
  requestPacket: Uint8Array,
  timeoutMs = 6000
): Promise<Uint8Array> {
  const [writeChar, responseChar] = await Promise.all([
    gpService.getCharacteristic(writeCharUuid),
    gpService.getCharacteristic(responseCharUuid),
  ]);
  const assembler = new GoProResponseAssembler();

  return new Promise<Uint8Array>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => finish(() => reject(new Error("timed out waiting for a response"))), timeoutMs);

    function finish(action: () => void) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      responseChar.removeEventListener("characteristicvaluechanged", onNotify);
      action();
    }

    function onNotify(event: BleNotifyEvent) {
      const dv = event.target?.value;
      if (!dv) return;
      const bytes = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
      const complete = assembler.feed(bytes);
      if (complete) finish(() => resolve(complete));
    }

    responseChar.addEventListener("characteristicvaluechanged", onNotify);
    responseChar
      .startNotifications()
      .then(() => writeChar.writeValue(requestPacket))
      .catch((err: unknown) => finish(() => reject(err instanceof Error ? err : new Error(String(err)))));
  });
}

// Get Hardware Info (command 0x3C) response fields, in the exact order
// GoPro's docs specify, each as a [length byte][value bytes] pair:
// model_number, model_name, deprecated, firmware_version, serial_number,
// ap_ssid, ap_mac_address, then 11 reserved bytes. This only reads through
// model_name and firmware_version — that's the "meaningful subset" that
// gates success, and nothing past it (serial number included) is parsed or
// retained, per the instruction to store only what's genuinely needed.
function readLengthPrefixedString(bytes: Uint8Array, offset: number): { value: string; next: number } {
  const len = bytes[offset];
  if (len === undefined) throw new Error("truncated field");
  const start = offset + 1;
  const end = start + len;
  if (end > bytes.length) throw new Error("truncated field");
  return { value: new TextDecoder().decode(bytes.slice(start, end)), next: end };
}

function parseHardwareInfoResponse(payload: Uint8Array): { modelName: string | null; firmwareVersion: string | null } {
  // Byte 0: echoed command ID. Byte 1: command status (0 = Success).
  if (payload.length < 2 || payload[1] !== 0) return { modelName: null, firmwareVersion: null };
  try {
    let offset = 2;
    offset = readLengthPrefixedString(payload, offset).next; // model_number — parsed only to advance the offset
    const modelName = readLengthPrefixedString(payload, offset);
    offset = modelName.next;
    offset = readLengthPrefixedString(payload, offset).next; // deprecated field
    const firmwareVersion = readLengthPrefixedString(payload, offset);
    return { modelName: modelName.value || null, firmwareVersion: firmwareVersion.value || null };
  } catch {
    return { modelName: null, firmwareVersion: null };
  }
}

// Get Status Values (command 0x13) response: byte 0 echoed command ID,
// byte 1 status, then repeated [status ID][length][value] entries for
// whichever statuses were requested. Only ever looked at for status 70
// (Internal Battery Percentage, a single 0-100 byte) — this never gates
// "succeeded", it's a bonus field attempted only after Get Hardware Info
// already succeeded.
function parseBatteryPercentage(payload: Uint8Array): number | null {
  if (payload.length < 2 || payload[1] !== 0) return null;
  try {
    let offset = 2;
    while (offset + 1 < payload.length) {
      const id = payload[offset];
      const len = payload[offset + 1];
      const valueStart = offset + 2;
      if (id === BATTERY_PERCENTAGE_STATUS_ID && len >= 1) return payload[valueStart];
      offset = valueStart + len;
    }
  } catch {
    /* malformed/unexpected framing — battery just stays unknown, harmless */
  }
  return null;
}

type Phase =
  | "instructions"
  | "bluetooth-connecting"
  | "bluetooth-result"
  | "camera-instructions"
  | "camera-ready"
  | "product-photo"
  | "review"
  | "submitting"
  | "done"
  | "submit-error";

// Explicit, truthful states — the seller should never be left wondering
// whether Bluetooth actually worked. "unsupported" and "idle" happen
// before any attempt; the rest track one connection attempt in progress
// or its outcome.
type BleState =
  | "unsupported"
  | "idle"
  | "requesting_device"
  | "connecting"
  | "reading_device"
  | "connected"
  | "cancelled"
  | "failed";

interface BluetoothResult {
  attempted: boolean;
  succeeded: boolean;
  deviceName: string | null;
  batteryLevel: number | null;
  manufacturer: string | null;
  model: string | null;
  // Only "direct_ble" once GoPro's Get Hardware Info command (0x3C) was
  // actually sent and its response successfully parsed (model name +
  // firmware version both present) — never on a bare gatt.connect() or
  // service-discovery success alone. Buyer result copy and the evaluator
  // prompt both key off this, not "attempted".
  evidenceMethod: "direct_ble" | "photo_fallback";
  note: string;
}

const EMPTY_BT: BluetoothResult = {
  attempted: false,
  succeeded: false,
  deviceName: null,
  batteryLevel: null,
  manufacturer: null,
  model: null,
  evidenceMethod: "photo_fallback",
  note: "Not attempted.",
};

export default function GoProFlow({ sessionId }: { sessionId: string }) {
  const [phase, setPhase] = useState<Phase>("instructions");
  const [bleState, setBleState] = useState<BleState>("idle");
  const [bt, setBt] = useState<BluetoothResult>(EMPTY_BT);
  const [frame, setFrame] = useState<string | null>(null);
  const [pendingFrame, setPendingFrame] = useState<string | null>(null);
  const [productPhoto, setProductPhoto] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);

  const { videoRef, canvasRef, state: cameraState, videoReady, setVideoReady, start, stop, capture } = useCamera();

  // Checked client-side, after hydration, same reasoning as the runner's
  // challenge-code generation: reading navigator during render can make
  // server and first-client-render HTML differ. Safari on iPhone/iPad
  // doesn't support Web Bluetooth at all (MDN lists it as limited-
  // availability generally) — those sellers should never see a button that
  // can't do anything, per the One-Phone Seller Principle's "no dead end"
  // rule.
  useEffect(() => {
    let cancelled = false;
    async function checkSupport() {
      const supported = typeof navigator !== "undefined" && !!(navigator as Navigator & { bluetooth?: unknown }).bluetooth;
      // Same fix as the runner's challenge-code effect: yield once before
      // the state update so this satisfies react-hooks/set-state-in-effect
      // instead of calling setState synchronously within the effect body.
      await Promise.resolve();
      if (!cancelled) setBleState(supported ? "idle" : "unsupported");
    }
    checkSupport();
    return () => {
      cancelled = true;
    };
  }, []);

  async function connectBluetooth() {
    setBleState("requesting_device");
    pingStarted();
    const nav = navigator as Navigator & { bluetooth?: BluetoothApi };
    if (!nav.bluetooth) {
      // Nothing to retry here — the "Connect via Bluetooth" button is
      // already hidden behind bleState === "unsupported" upfront (see the
      // instructions screen), so reaching this branch at all would mean
      // Web Bluetooth vanished mid-session. No recovery choice makes sense;
      // go straight to the photo path.
      setBleState("unsupported");
      setBt({ ...EMPTY_BT, attempted: true, note: "Web Bluetooth isn't supported in this browser." });
      setPhase("camera-instructions");
      return;
    }

    let device: BleDevice;
    try {
      device = await nav.bluetooth.requestDevice({
        // Filtering to GoPro's own service (rather than acceptAllDevices)
        // is the documented way to find real GoPros — see GOPRO_SERVICE_UUID
        // above. A service used in `filters` must also be listed in
        // `optionalServices` to actually be readable after connecting.
        filters: [{ services: [GOPRO_SERVICE_UUID] }],
        // Only GoPro's own service is ever read now — the generic SIG
        // battery_service/device_information services this used to request
        // were never reliably present on GoPro hardware anyway, and are
        // superseded by the real Get Hardware Info / Get Status Values
        // reads below.
        optionalServices: [GOPRO_SERVICE_UUID],
      });
    } catch (err) {
      // CAPTURE CORRECTION PRINCIPLE / "never force a failed direct path
      // into fallback with no recovery option": a cancelled picker isn't
      // necessarily "I want the photo test instead" — it's often "I picked
      // the wrong moment" or "I need a second to turn Bluetooth on." Route
      // to bluetooth-result so the seller explicitly chooses Try again vs.
      // Use photo test, instead of silently landing in the photo flow.
      setBleState("cancelled");
      setBt({
        ...EMPTY_BT,
        attempted: true,
        note:
          err instanceof Error && err.name === "NotFoundError"
            ? "No GoPro was found nearby, or the picker was cancelled."
            : "The Bluetooth picker was cancelled.",
      });
      setPhase("bluetooth-result");
      return;
    }

    setBleState("connecting");
    try {
      if (!device.gatt) throw new Error("this device doesn't support GATT connections");
      const server = await device.gatt.connect();
      setBleState("reading_device");

      // Confirm the connected peripheral exposes GoPro's own service at
      // all — a fast, cheap check before attempting the real command.
      const gpService = await server.getPrimaryService(GOPRO_SERVICE_UUID);

      // The actual fix: send GoPro's own documented Get Hardware Info
      // command (0x3C) and require a real, parsed response — model name
      // and firmware version both present — before this counts as
      // "succeeded". A GATT/service connection alone proved nothing about
      // whether TestPass could actually read the camera; this does.
      const hwInfoResponse = await sendGoProCommand(
        gpService,
        GOPRO_COMMAND_UUID,
        GOPRO_COMMAND_RESPONSE_UUID,
        buildGoProRequestPacket(GET_HARDWARE_INFO_COMMAND_ID)
      );
      const { modelName, firmwareVersion } = parseHardwareInfoResponse(hwInfoResponse);
      if (!modelName || !firmwareVersion) {
        throw new Error("hardware info response didn't include a model name and firmware version");
      }

      // Bonus only, never gates success: GoPro's own Get Status Values
      // query (0x13) for status 70 (Internal Battery Percentage). If this
      // fails or doesn't parse, batteryLevel just stays null — the seller
      // still gets a fully valid direct_ble result from the hardware-info
      // read alone.
      let batteryLevel: number | null = null;
      try {
        const statusResponse = await sendGoProCommand(
          gpService,
          GOPRO_QUERY_UUID,
          GOPRO_QUERY_RESPONSE_UUID,
          buildGoProRequestPacket(GET_STATUS_VALUES_COMMAND_ID, new Uint8Array([BATTERY_PERCENTAGE_STATUS_ID])),
          3000
        );
        batteryLevel = parseBatteryPercentage(statusResponse);
      } catch {
        /* Battery is a bonus field — a failed/timed-out status query
           doesn't affect the hardware-info result already in hand. */
      }

      setBleState("connected");
      setBt({
        attempted: true,
        succeeded: true,
        deviceName: device.name ?? null,
        batteryLevel,
        manufacturer: "GoPro",
        model: modelName,
        evidenceMethod: "direct_ble",
        note: "GoPro connected — read its hardware info directly over Bluetooth.",
      });
    } catch (err) {
      // Never surface protocol internals to the seller — log for our own
      // debugging, show one honest, plain-language sentence to them.
      console.error("GoPro direct BLE read failed:", err);
      setBleState("failed");
      setBt({
        ...EMPTY_BT,
        attempted: true,
        evidenceMethod: "photo_fallback",
        note: "Connected to Bluetooth, but TestPass couldn't complete a direct camera read — continuing with the photo test.",
      });
    }
    // Either branch above lands here needing a seller decision, not an
    // auto-advance: on success, "is this the right GoPro?"; on failure,
    // "try again or use the photo test?" — see the bluetooth-result phase.
    setPhase("bluetooth-result");
  }

  // Used both for "Connect a different device" (after a successful read the
  // seller doesn't want) and "Try Bluetooth again" (after a failed/
  // cancelled attempt) — both mean the same thing: discard whatever
  // Bluetooth result is on hand and reopen the device picker.
  function retryBluetooth() {
    setBt(EMPTY_BT);
    setBleState("idle");
    connectBluetooth();
  }

  function skipBluetooth() {
    setBt({ ...EMPTY_BT, attempted: true, evidenceMethod: "photo_fallback", note: "Seller skipped the Bluetooth step." });
    setPhase("camera-instructions");
    pingStarted();
  }

  // Fire-and-forget instrumentation ping — the seller_started funnel event
  // (see the /start route). Called from both connectBluetooth() and
  // skipBluetooth(): either one is the seller's first deliberate action past
  // the instructions screen, mirroring the same "leave prepare/instructions"
  // moment GuidedCaptureRunner pings from in beginCapture(). Deduped
  // server-side (once: true), so it's harmless that only one of these two
  // paths runs per session. Never blocks or gates the flow.
  function pingStarted() {
    fetch(`/api/sessions/${sessionId}/start`, { method: "POST" }).catch(() => {});
  }

  // CAPTURE CORRECTION PRINCIPLE: stage the shot instead of committing it
  // immediately. capture() only grabs a canvas frame from the still-live
  // video — it doesn't stop the stream — so the seller can Retake without
  // any camera restart, same as the shared GuidedCaptureRunner.
  function captureFrame() {
    const shot = capture(0.85);
    if (!shot) return;
    setPendingFrame(shot);
  }

  function confirmFrame(action: "retake" | "use") {
    if (action === "retake") {
      setPendingFrame(null);
      return;
    }
    setFrame(pendingFrame);
    setPendingFrame(null);
    stop();
    setPhase("product-photo");
  }

  // Review screen's "retake status photo" — independent of the product
  // photo, which has its own edit path (retakeProductPhoto below), per the
  // "each independently meaningful capture gets its own Replace control"
  // rule.
  function retake() {
    setFrame(null);
    setPendingFrame(null);
    start();
    setPhase("camera-ready");
  }

  function retakeProductPhoto() {
    setPhase("product-photo");
  }

  async function submit() {
    if (!frame) return;
    setPhase("submitting");
    setErrorMsg(null);
    const context = [
      `Bluetooth evidence method: ${bt.evidenceMethod === "direct_ble" ? "direct_ble (GoPro's own BLE service confirmed present and responding)" : "photo_fallback (no confirmed direct read)"}.`,
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
      const { verdict } = await submitCapture({
        sessionId,
        images,
        context,
        rawData: { bluetooth: bt, evidenceMethod: bt.evidenceMethod, hasProductPhoto: !!productPhoto },
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
          {config.sellerInstructions.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        <p className="text-xs text-foreground/50">TestPass will collect: {config.dataCollected.join("; ")}.</p>
        {bleState === "unsupported" ? (
          <>
            <p className="text-sm text-foreground/70">
              Direct Bluetooth checks aren&apos;t available in this browser (common on iPhone/Safari) —
              continuing with the photo check instead. One phone, no extra steps.
            </p>
            <button
              onClick={skipBluetooth}
              className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <button
              onClick={connectBluetooth}
              className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              Connect via Bluetooth
            </button>
            <button onClick={skipBluetooth} className="w-full rounded-lg border border-border py-2 text-sm font-medium">
              Skip — use photo only
            </button>
          </>
        )}
      </div>
    );
  }

  if (phase === "bluetooth-connecting") {
    const message =
      bleState === "requesting_device"
        ? "Pick your GoPro from the browser's device list…"
        : bleState === "connecting"
          ? "Connecting to GoPro…"
          : "Reading the camera's own status…";
    return <p className="text-center text-sm text-foreground/60">{message}</p>;
  }

  // CAPTURE CORRECTION PRINCIPLE for Bluetooth/telemetry: a direct BLE
  // read is either a real success worth confirming (show enough to
  // recognize the device, let the seller reject a wrong one) or a failure
  // that deserves an actual choice — never a silent, un-appealable drop
  // into the photo fallback.
  if (phase === "bluetooth-result") {
    const success = bt.evidenceMethod === "direct_ble";
    return (
      <div className="space-y-4">
        <StepIndicator steps={STEPS} current={0} />
        {success ? (
          <>
            <p className="text-sm font-medium text-accent">
              GoPro connected{bt.model ? ` — ${bt.model}` : ""}
              {bt.batteryLevel !== null ? `, battery ${bt.batteryLevel}%` : ""}.
            </p>
            <p className="text-sm text-foreground/70">
              TestPass read this directly from the camera over Bluetooth — no photo needed for this part. Is this
              the right GoPro?
            </p>
            <div className="flex gap-2">
              <button
                onClick={retryBluetooth}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-foreground/5"
              >
                Connect a different device
              </button>
              <button
                onClick={() => setPhase("camera-instructions")}
                className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90"
              >
                Use this GoPro
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-foreground/70">{bt.note}</p>
            <div className="flex gap-2">
              <button
                onClick={retryBluetooth}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-foreground/5"
              >
                Try Bluetooth again
              </button>
              <button
                onClick={() => setPhase("camera-instructions")}
                className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90"
              >
                Use photo test
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (phase === "camera-instructions") {
    return (
      <div className="space-y-4">
        <StepIndicator steps={STEPS} current={1} />
        {bt.evidenceMethod === "direct_ble" && (
          <p className="text-sm font-medium text-accent">
            GoPro connected{bt.model ? ` — ${bt.model}` : ""}
            {bt.batteryLevel !== null ? `, battery ${bt.batteryLevel}%` : ""}.
          </p>
        )}
        {bt.attempted && bt.evidenceMethod === "photo_fallback" && bleState !== "idle" && (
          <p className="text-sm text-foreground/70">{bt.note}</p>
        )}
        <p className="text-sm">Now take one clear photo of the GoPro&apos;s screen showing its battery and storage status.</p>
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
    return <SubmittedScreen verdict={verdict} />;
  }

  const stepIndex =
    phase === "review" ? 3 : phase === "submitting" || phase === "submit-error" ? 4 : 1;

  return (
    <div className="space-y-4">
      <StepIndicator steps={STEPS} current={stepIndex} />

      {phase === "camera-ready" && !pendingFrame && (
        <>
          <CameraStage
            videoRef={videoRef}
            state={cameraState}
            videoReady={videoReady}
            onVideoReady={() => setVideoReady(true)}
          />
          <button
            onClick={captureFrame}
            disabled={!videoReady}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            Capture photo
          </button>
        </>
      )}
      <canvas ref={canvasRef} className="hidden" />

      {phase === "camera-ready" && pendingFrame && (
        <div className="space-y-4">
          <p className="text-sm text-foreground/70">Can you clearly read the GoPro&apos;s battery and storage status?</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/jpeg;base64,${pendingFrame}`}
            alt="captured status screen"
            className="aspect-video w-full rounded-lg object-cover"
          />
          <div className="flex gap-2">
            <button
              onClick={() => confirmFrame("retake")}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-foreground/5"
            >
              Retake
            </button>
            <button
              onClick={() => confirmFrame("use")}
              className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              Use photo
            </button>
          </div>
        </div>
      )}

      {phase === "review" && (
        <div className="space-y-4">
          {frame && (
            <div>
              <p className="mb-2 text-xs font-medium text-foreground/50">Status screen</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/jpeg;base64,${frame}`} alt="captured status screen" className="aspect-video w-full rounded-lg object-cover" />
              <button onClick={retake} className="mt-1.5 text-xs font-medium text-accent hover:underline">
                Retake status photo
              </button>
            </div>
          )}
          {productPhoto && (
            <div>
              <p className="mb-2 text-xs font-medium text-foreground/50">Photo of the device</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/jpeg;base64,${productPhoto}`} alt="GoPro" className="aspect-video w-full rounded-lg object-cover" />
              <button onClick={retakeProductPhoto} className="mt-1.5 text-xs font-medium text-accent hover:underline">
                Retake device photo
              </button>
            </div>
          )}
          <button
            onClick={submit}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90"
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
