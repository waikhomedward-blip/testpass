"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const REASONS = [
  { value: "problem", label: "Problem with TestPass" },
  { value: "question", label: "Question" },
  { value: "feedback", label: "Feedback or idea" },
  { value: "other", label: "Something else" },
  ] as const;
type Reason = (typeof REASONS)[number]["value"];

const MAX_MESSAGE = 5000;

interface Context {
    reason: Reason | null;
    sessionId: string | null;
    actor: "buyer" | "seller" | null;
    page: string | null;
}

export default function ContactForm() {
    // Same "yield once before the state update" fix used for the ?checkout=
  // param in SessionStatus.tsx (react-hooks/set-state-in-effect) — avoids
  // needing useSearchParams() + a Suspense boundary for what's just a
  // one-time read of the URL a visitor arrived with.
  const [ctx, setCtx] = useState<Context>({ reason: null, sessionId: null, actor: null, page: null });
    const [reason, setReason] = useState<Reason | "">("");
    const [replyEmail, setReplyEmail] = useState("");
    const [message, setMessage] = useState("");
    const [company, setCompany] = useState(""); // honeypot — real visitors never see or fill this in

  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
    const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
        let cancelled = false;
        Promise.resolve().then(() => {
                if (cancelled) return;
                const params = new URLSearchParams(window.location.search);
                const reasonParam = params.get("reason");
                const resolvedReason = REASONS.some((r) => r.value === reasonParam) ? (reasonParam as Reason) : null;
                const actorParam = params.get("actor");
                const actor = actorParam === "buyer" || actorParam === "seller" ? actorParam : null;
                setCtx({
                          reason: resolvedReason,
                          sessionId: params.get("session"),
                          actor,
                          page: params.get("page"),
                });
                // Default the reason select from context (e.g. arriving via "Report a
                                     // problem") without clobbering anything the person may have already
                                     // picked by hand in this same instant.
                                     if (resolvedReason) setReason((prev) => (prev === "" ? resolvedReason : prev));
        });
        return () => {
                cancelled = true;
        };
  }, []);

  // "contact_opened" — a signal for how many people reach this page versus
  // actually send something, not the message content itself. Best-effort,
  // fire-and-forget; never blocks rendering the form.
  useEffect(() => {
        fetch("/api/contact/opened", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ page: window.location.pathname }),
        }).catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!reason || !message.trim()) return;
        setStatus("pending");
        setErrorText(null);
        try {
                const res = await fetch("/api/contact", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                                      reason,
                                      replyEmail: replyEmail.trim() || undefined,
                                      message: message.trim(),
                                      sessionId: ctx.sessionId || undefined,
                                      actor: ctx.actor || undefined,
                                      page: ctx.page || (typeof window !== "undefined" ? window.location.pathname : undefined),
                                      company,
                          }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || "Something went wrong.");
                setStatus("success");
        } catch (err) {
                setErrorText(err instanceof Error ? err.message : "Something went wrong.");
                setStatus("error");
        }
  }

  if (status === "success") {
        return (
                <div className="rounded-[var(--radius-lg)] border border-border bg-card p-6 shadow-card">
                          <p className="flex items-center gap-1.5 text-sm font-medium text-proof">
                                      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
                                                    <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
                                                    <path
                                                                    d="M6 10.5l2.5 2.5L14 7.5"
                                                                    stroke="currentColor"
                                                                    strokeWidth="1.5"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                  />
                                        
                                      </svg>
                                      Message sent
                            
                          </p>
                          <h2 className="mt-1 type-section-title">Thanks — we received it.</h2>
                          <p className="mt-2 text-sm text-ink-secondary">
                            {replyEmail.trim()
                                          ? "We'll reply there if a response is needed."
                                          : "If you'd like a reply next time, you can leave an email address — this one didn't include one."}
                            
                          </p>
                          <Link
                                      href="/"
                                      className="mt-5 inline-block rounded-lg bg-signal px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-signal-hover"
                                    >
                                      Back to TestPass
                            
                          </Link>
                </div>
              );
  }

  const pending = status === "pending";

  return (
        <form
                onSubmit={onSubmit}
                className="rounded-[var(--radius-lg)] border border-border bg-card p-6 shadow-card"
                noValidate
              >
          {ctx.sessionId && (
                        <p className="mb-4 rounded-lg bg-background px-3 py-2 text-xs text-ink-secondary">
                                    We&apos;ll include details from this TestPass so you don&apos;t have to explain everything again.
                          
                        </p>
                      )}

                <label className="block text-sm font-medium" htmlFor="contact-reason">
                        What can we help with?
                          <select
                                      id="contact-reason"
                                      required
                                      value={reason}
                                      onChange={(e) => setReason(e.target.value as Reason)}
                                      className="mt-1 w-full rounded-lg border border-border-control bg-background px-3 py-2 text-sm"
                                    >
                                      <option value="" disabled>
                                                    Choose one
                                        
                                      </option>
                            {REASONS.map((r) => (
                                                  <option key={r.value} value={r.value}>
                                                    {r.label}
                                                    
                                                  </option>
                                                ))}
                          </select>
                </label>
<label className="mt-4 block text-sm font-medium" htmlFor="contact-email">
  Your email <span className="font-normal text-ink-secondary">(optional)</span>
  <input
    id="contact-email"
    type="email"
    inputMode="email"
    autoComplete="email"
    value={replyEmail}
    onChange={(e) => setReplyEmail(e.target.value)}
    placeholder="you@example.com"
    className="mt-1 w-full rounded-lg border border-border-control bg-background px-3 py-2 text-sm"
    />
  <span className="mt-1 block text-xs font-normal text-ink-secondary">Only needed if you&apos;d like a reply.
  </span>
</label>
<label className="mt-4 block text-sm font-medium" htmlFor="contact-message">
  Message
  <textarea
    id="contact-message"
    required
value={message}
    onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
    placeholder="Tell us what happened or what's on your mind."
    rows={5}
    maxLength={MAX_MESSAGE}
    className="mt-1 w-full rounded-lg border border-border-control bg-background px-3 py-2 text-sm"
    />
  
</label>  
          {/* Honeypot — invisible and unreachable to a real visitor (off-screen,
            not tab-stoppable, hidden from assistive tech), but present in the
            DOM for a bot that fills every field it can find. Named to look
            ordinary rather than obviously bait. */}
          <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }} aria-hidden="true">
            <label>Company
              <input
                type="text"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                />
            </label>
          </div>
          {status === "error" && errorText && (
  <p className="mt-3 text-sm text-failure" role="alert">Couldn&apos;t send your message. Please try again.
  </p>
  )}
          <button
            type="submit"
            disabled={pending || !reason || !message.trim()}
            className="mt-4 w-full rounded-lg bg-signal py-2.5 text-sm font-medium text-white transition-colors hover:bg-signal-hover disabled:opacity-50"
            >{pending ? "Sending…" : "Send message"}
          </button>
          <p className="mt-4 text-xs text-ink-secondary">Don&apos;t send passwords, authentication codes, payment card details, or other sensitive
            credentials. See our{" "}
            <Link href="/privacy" className="text-signal hover:underline">Privacy Policy
            </Link>
            .
          </p>
        </form>
    );
}
