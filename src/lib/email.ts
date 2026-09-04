// Outbound support-email delivery for the Contact system
// (src/app/api/contact/route.ts). Plain `fetch` against Resend's REST API
// rather than a new dependency -- one small POST doesn't need an SDK.
//
// The private support inbox (SUPPORT_INBOX) and the API key
// (RESEND_API_KEY) live only in server env vars, never NEXT_PUBLIC_*, and
// are never echoed back to the browser in any response from this app. The
// database write in submitContactMessage() happens BEFORE this is called
// and does not depend on it -- an email-provider outage must never lose a
// customer's message, only the notification about it.
export async function sendSupportEmail(input: {
    subject: string;
    text: string;
    replyEmail?: string | null;
}): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.SUPPORT_INBOX;
    const from = process.env.CONTACT_FROM_EMAIL || "TestPass <onboarding@resend.dev>";

  if (!apiKey || !to) {
        // Not configured yet -- don't throw. The message is already safely in
      // contact_messages; a missing provider just means no email ping, not a
      // failed submission. Logged server-side only so it's visible in Vercel
      // function logs without ever reaching the client.
      console.error("sendSupportEmail skipped: RESEND_API_KEY or SUPPORT_INBOX not set.");
        return false;
  }

  try {
        const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                          Authorization: `Bearer ${apiKey}`,
                          "Content-Type": "application/json",
                },
                body: JSON.stringify({
                          from,
                          to,
                          subject: input.subject,
                          text: input.text,
                          // The elegant trick: when a reply email was supplied, replying to
                          // the notification in the owner's inbox goes straight back to the
                          // customer -- the owner's own address is never exposed to them.
                          // When no reply email exists, omit Reply-To entirely rather than
                          // inventing one.
                          ...(input.replyEmail ? { reply_to: input.replyEmail } : {}),
                }),
        });
        if (!res.ok) {
                const body = await res.text().catch(() => "");
                console.error(`sendSupportEmail failed: ${res.status} ${body}`);
                return false;
        }
        return true;
  } catch (err) {
        console.error("sendSupportEmail threw:", err);
        return false;
  }
}
