import { NextRequest, NextResponse } from "next/server";
import { submitContactMessage, getSession, recordEvent } from "@/lib/db";
import { sendSupportEmail } from "@/lib/email";
import { CATEGORY_CONFIG } from "@/lib/primitives";
import { Category } from "@/lib/types";

interface ContactBody {
    reason?: string;
    replyEmail?: string;
    message?: string;
    sessionId?: string;
    actor?: string;
    page?: string;
    // Honeypot -- a field no real visitor sees or fills in (hidden in the
  // form via CSS, never via `type="hidden"`, so a bot that only looks for
  // hidden inputs still trips it). Any non-empty value here means a bot
  // filled every field it could find. We respond exactly like a real
  // success -- never reveal that the honeypot fired -- and just quietly
  // skip the DB write and the email.
  company?: string;
}

const MAX_MESSAGE = 5000;
const REASONS = ["problem", "question", "feedback", "other"] as const;
type Reason = (typeof REASONS)[number];
const REASON_LABEL: Record<Reason, string> = {
    problem: "Problem",
    question: "Question",
    feedback: "Feedback",
    other: "Other",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Simple in-memory sliding-window rate limit -- good enough for beta
// volume, no new infrastructure needed. Resets on deploy/cold-start, which
// is fine: the goal is blunting casual abuse, not a hard guarantee.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 8;
const rateLimitHits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const hits = (rateLimitHits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    hits.push(now);
    rateLimitHits.set(ip, hits);
    // Bound memory use across many distinct IPs over a long-running process.
  if (rateLimitHits.size > 5000) rateLimitHits.clear();
    return hits.length > RATE_LIMIT_MAX;
}

export async function POST(req: NextRequest) {
    let body: ContactBody;
    try {
          body = await req.json();
    } catch {
          return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(ip)) {
          // Deliberately vague and non-alarming -- same tone as a real failure,
      // no "you've been rate limited" callout to reverse-engineer.
      return NextResponse.json({ error: "Couldn't send your message. Please try again shortly." }, { status: 429 });
    }

  // Honeypot tripped -- respond exactly like success, do nothing else.
  if (body.company && body.company.trim() !== "") {
        return NextResponse.json({ ok: true });
  }

  const reason = body.reason as Reason;
    if (!REASONS.includes(reason)) {
          return NextResponse.json({ error: "Please choose what this is about." }, { status: 400 });
    }

  const message = body.message?.trim() ?? "";
    if (!message) {
          return NextResponse.json({ error: "Please enter a message." }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE) {
          return NextResponse.json({ error: "Message is too long." }, { status: 400 });
    }

  const replyEmailRaw = body.replyEmail?.trim() ?? "";
    if (replyEmailRaw && !EMAIL_RE.test(replyEmailRaw)) {
          return NextResponse.json({ error: "That email address doesn't look right." }, { status: 400 });
    }
    const replyEmail = replyEmailRaw || null;

  const actor: "buyer" | "seller" | "visitor" =
        body.actor === "buyer" || body.actor === "seller" ? body.actor : "visitor";

  // Session/category/stage are resolved from the real session row when a
  // sessionId is given, never trusted verbatim from the client -- same
  // posture as submitFeedback's category/cohort lookup in
  // src/app/api/feedback/route.ts. A sessionId that doesn't resolve to a
  // real session is simply dropped rather than stored as an opaque string.
  let sessionId: string | null = null;
    let category: string | null = null;
    let stage: string | null = null;
    if (body.sessionId) {
          const session = await getSession(body.sessionId).catch(() => null);
          if (session) {
                  sessionId = session.id;
                  category = session.category;
                  stage = session.status;
          }
    }

  const pagePath = body.page?.slice(0, 200) ?? null;

  const stored = await submitContactMessage({
        reason,
        replyEmail,
        message,
        sessionId,
        category,
        actor,
        stage,
        pagePath,
  });

  // The database write is the source of truth for "did we receive this."
  // Only report failure to the user if that write itself failed -- an
  // email-provider hiccup below must never surface as a failed submission,
  // since the message is already safely stored either way.
  if (!stored) {
        return NextResponse.json(
          { error: "Couldn't send your message. Please try again." },
          { status: 500 }
              );
  }

  const categoryLabel = category ? CATEGORY_CONFIG[category as Category]?.label ?? category : null;
    const subject = `[TestPass] ${REASON_LABEL[reason]}${categoryLabel ? ` — ${categoryLabel}` : ""}`;
    const timestamp = new Date().toISOString();
    const environment = process.env.VERCEL_ENV ?? "development";

  const lines = [
        "Message:",
        message,
        "",
        "---",
        `Reason: ${REASON_LABEL[reason]}`,
        `Reply email: ${replyEmail ?? "Not provided"}`,
        `Role: ${actor}`,
        categoryLabel ? `Category: ${categoryLabel}` : null,
        sessionId ? `Session: ${sessionId}` : null,
        stage ? `Stage: ${stage}` : null,
        pagePath ? `Page: ${pagePath}` : null,
        `Time: ${timestamp} (${environment})`,
      ].filter((l): l is string => l !== null);

  // Best-effort -- see sendSupportEmail's own comment. Never blocks or
  // changes the response the user gets; the message is already saved.
  await sendSupportEmail({ subject, text: lines.join("\n"), replyEmail });

  // Analytics signal only -- never the free-text message itself (Section
  // 29 of the spec: the message belongs in contact_messages, not events).
  await recordEvent({
        sessionId,
        eventType: "contact_submitted",
        metadata: { reason, actor, hasReplyEmail: !!replyEmail },
  });

  return NextResponse.json({ ok: true });
}
