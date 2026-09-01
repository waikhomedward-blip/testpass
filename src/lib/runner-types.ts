import { Category } from "./types";

// GuidedCaptureRunner's config surface — the primitives it actually
// understands, and nothing more. Per the founder-fit audit: this list is
// deliberately just what Switch, DJI, and PS5 already do (instruction,
// camera_capture as a burst or a single shot, product_photo, review,
// submit). GoPro's Bluetooth read and Digicam's file-upload path are NOT
// modeled here yet — they stay on their own hand-written flows until a
// second migration wave actually needs bluetooth_read / file_upload as
// runner step types. Don't add step types for devices we haven't built.

export interface CaptureShot {
  stepId: string;
  label: string;
  base64: string;
  capturedAt: number;
}

export type RunnerStep =
  | {
      type: "countdown-burst";
      id: string;
      label: string;
      shotCount: number;
      intervalMs: number;
      countdownSeconds: number;
      capturingMessage: string;
      // JPEG quality passed to canvas.toDataURL — preserves each original
      // flow's tuning (e.g. Switch's burst used 0.82) rather than forcing
      // one value on every step. Defaults applied by the runner if omitted.
      quality?: number;
    }
  | {
      type: "single-capture";
      id: string;
      label: string;
      // Shown above the camera before this step's capture. Receives the
      // challenge code (if the category uses one) so instructions can
      // reference it without every category re-implementing interpolation.
      instructionText: (challenge: string | null) => string;
      buttonLabel: string;
      quality?: number;
    };

export interface RunnerPrepareConfig {
  // Render config.sellerInstructions (from primitives.ts) as the standard
  // numbered list, exactly like the pre-runner Switch/DJI screens did.
  showStandardInstructions: boolean;
  // PS5-style richer prepare screen: an optional intro card and a bulleted
  // "before you start" list, shown in addition to (or instead of) the
  // standard instructions.
  introTitle?: string;
  introDescription?: string;
  notes?: string[];
  // Shown under the one-time challenge code itself (only relevant when
  // useChallenge is set) — e.g. PS5's "how to actually rename the console"
  // instructions, which are specific to the challenge, not the general
  // prepare notes above.
  challengeHint?: string;
  buttonLabel: string;
}

export interface RunnerSubmissionContent {
  context: string;
  rawData: Record<string, unknown>;
}

export interface RunnerConfig {
  category: Category;
  steps: RunnerStep[];
  // One-time challenge code (e.g. PS5's console-rename code). Generated
  // client-side, after hydration, exactly like the original PS5Flow fix —
  // see GuidedCaptureRunner for why this can't happen during render.
  useChallenge?: boolean;
  challengePrefix?: string;
  prepare: RunnerPrepareConfig;
  includeProductPhoto: boolean;
  productPhotoDeviceLabel?: string;
  filenamePrefix: string;
  // Shown on the review screen, above Retake/Submit — for a claim-boundary
  // note like PS5's "this doesn't certify the console's complete
  // condition." Category-specific messaging, not a generic runner string.
  reviewNote?: string;
  // Original flows didn't all use the same button wording (DJI: "Retake
  // both", PS5: "Submit experiment") — preserved per-category rather than
  // forcing generic "Retake"/"Submit" everywhere.
  retakeButtonLabel?: string;
  submitButtonLabel?: string;
  // Category-specific evidence meaning stays here, not in the runner: the
  // runner hands back the raw shots/challenge/timing, and each category
  // decides what context string the evaluator sees and what raw_data means.
  buildSubmission: (args: {
    shots: CaptureShot[];
    productPhoto: string | null;
    challenge: string | null;
    startedAt: number;
  }) => RunnerSubmissionContent;
}
