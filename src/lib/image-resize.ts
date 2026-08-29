// Photos picked from a phone's library (as opposed to a live camera capture,
// which is already bounded by the getUserMedia width constraint in
// useCamera.ts) can be several megabytes each at full sensor resolution.
// Two or three of those as base64 in one JSON submission comfortably clears
// serverless-function request-body limits (Vercel's default is a few MB),
// so the submit endpoint never even runs — the platform itself rejects the
// request with a 413 before our code sees it, and the seller is left with a
// cryptic error instead of a usable result. Downscaling client-side, before
// the photo ever leaves the seller's phone, is the fix: it keeps every
// submission small regardless of what camera or phone produced the original
// file, and normalizes everything to real JPEG bytes so the mediaType we
// declare to the evaluator always matches what's actually in the buffer.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

export interface ResizedImage {
  base64: string;
  previewUrl: string;
}

export function resizeImageFile(
  file: File,
  maxDimension = MAX_DIMENSION,
  quality = JPEG_QUALITY
): Promise<ResizedImage> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height / width) * maxDimension);
          width = maxDimension;
        } else {
          width = Math.round((width / height) * maxDimension);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(objectUrl);
      if (!ctx) {
        reject(new Error("Couldn't process that photo."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      const base64 = dataUrl.split(",")[1] ?? "";
      if (!base64) {
        reject(new Error("Couldn't process that photo."));
        return;
      }
      resolve({ base64, previewUrl: dataUrl });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Couldn't read that photo — try picking it again."));
    };
    img.src = objectUrl;
  });
}
