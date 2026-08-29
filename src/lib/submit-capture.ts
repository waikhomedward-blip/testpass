"use client";

// Shared client-side call to POST /api/sessions/submit, used by all four
// seller flows. Centralized so every flow gets the same handling of a
// platform-level rejection (a request that's too large gets turned away by
// Vercel before our route handler ever runs, so there's no JSON error body
// to read — res.json() would throw and the seller would see a raw parse
// error instead of an explanation) as well as the normal
// application-level error responses our own route returns.
export interface SubmitCapturePayload {
  sessionId: string;
  images: { base64: string; mediaType: "image/jpeg" | "image/png"; filename: string }[];
  context?: string;
  rawData?: Record<string, unknown>;
}

export interface SubmitCaptureResult {
  verdict: string | null;
  reasoning: string | null;
}

export async function submitCapture(payload: SubmitCapturePayload): Promise<SubmitCaptureResult> {
  const res = await fetch("/api/sessions/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    if (res.status === 413) {
      throw new Error(
        "These photos are too large for TestPass to accept in one submission. Try again — captures are automatically shrunk, but if you picked very large files this can still happen; retaking usually fixes it."
      );
    }
    let message = "Submission failed.";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // The platform (not our route) rejected this request, so there's no
      // JSON body to parse — fall back to the generic message above.
    }
    throw new Error(message);
  }

  const data = await res.json();
  return { verdict: data.verdict ?? null, reasoning: data.reasoning ?? null };
}
