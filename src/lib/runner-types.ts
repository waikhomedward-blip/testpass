import { Category } from "./types";

// GuidedCaptureRunner's config surface — the primitives it actually
// understands, and nothing more. Per the founder-fit audit: this list was
// originally just what Switch, DJI, and PS5 already did (instruction,
// camera_capture as a burst or a single shot, product_photo, review,
// submit). GoPro's Bluetooth read stays on its own hand-written flow —
// nothing else needs it yet. Digicam's file-upload path was ALSO
// hand-written originally; "file-upload" is now a real runner step type
// (see below) so other categories can reuse it declaratively instead of
// forking a whole new flow component.
//
// ONE-PHONE SELLER PRINCIPLE (evidence-UX doctrine, added in the
// one-phone-seller-evidence pass): a seller should never need a second
// phone, a second tablet, a borrowed screen, or a handwritten/printed
// TestPass code just to produce evidence. The normal setup is the
// seller's own phone + the product being sold + whatever that product
// ordinarily needs to operate (printer paper, a console's usual
// TV/controller, its own network). TestPass itself must never manufacture
// a new hardware dependency. Two structural tools this file gives every
// category to honor that:
//   1. "file-upload" steps — for evidence that already lives in an app on
//      the SAME phone (a manufacturer app's own screen). The seller
//      switches apps, takes a native OS screenshot, switches back, and
//      picks that file — never photographs one phone with another.
//   2. Session-bound live-camera capture — every "single-capture" and
//      "countdown-burst" shot is already timestamped and tied to this
//      session by the server that receives it (see submit/route.ts's
//      serverReceivedAt). That's what proves a live capture is fresh; a
//      seller no longer needs to hold a physical code in the frame to
//      prove the same thing, and categories should prefer dropping a held
//      code over asking for a second display to show it on.
// A "file-upload" step's evidence is honestly weaker on capture-freshness
// than a live camera capture (a screenshot could in principle be older
// than the session), and category configs must say so in their
// evaluationPromptSystem rather than let it inherit live-capture strength.

export interface CaptureShot {
  stepId: string;
  label: string;
  base64: string;
  capturedAt: number;
  // How this shot was produced. Defaults to "live_camera" (the runner's
  // own getUserMedia capture) when omitted by older call sites.
  // "screenshot_upload" is a file-upload step's picked file — the same-phone
  // companion-app path. Categories must reflect this honestly in their
  // evaluator prompt: a screenshot proves less about capture freshness than
  // a live capture, even though both are equally session-bound in storage.
  method?: "live_camera" | "screenshot_upload";
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
    }
  | {
      // Same-phone companion-app evidence: no camera involved in this step
      // at all. The seller does something in ANOTHER app already on this
      // phone (open a manufacturer app, cast, screenshot), then comes back
      // to TestPass and picks that file from their own photo library — the
      // same file-picker pattern DigicamFlow already used, generalized so
      // any category can declare it instead of hand-writing a whole flow.
      // Never require the seller to leave this phone to produce the file.
      type: "file-upload";
      id: string;
      label: string;
      // Static — file-upload steps don't hold a physical code in the shot,
      // so there's nothing for a challenge code to be interpolated into.
      instructionText: string;
      pickerLabel: string;
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
