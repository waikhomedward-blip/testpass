import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy — TestPass" };

// Draft, reflecting actual current behavior in the codebase (see
// src/app/api/cleanup/route.ts and README's "Data retention" section) —
// not a substitute for a real legal review. Marked for owner/legal review
// per Section 43 of the beta operating directive; kept short and honest
// rather than turned into a legal-research project.
export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 text-sm text-ink-secondary">
      <p className="type-label">TestPass · Early Access</p>
      <h1 className="mt-1 type-page-title text-foreground">Privacy</h1>
      <p className="mt-2 text-xs">
        This is a draft policy for TestPass&apos;s early-access beta, written to describe what the
        product actually does today. It isn&apos;t a substitute for legal advice, and it may change as
        TestPass changes.
      </p>

      <h2 className="mt-6 font-semibold text-foreground">What TestPass collects</h2>
      <p className="mt-2">
        When a buyer creates a test, TestPass stores the category, an optional listing link, an
        optional model/details field, and whatever the buyer types under &quot;what are you worried
        about?&quot;. Neither side needs an account, a password, or any contact information to use
        TestPass.
      </p>
      <p className="mt-2">
        When a seller opens the link and completes the test, TestPass stores the photos or other
        capture data the guided flow asks for, and — for some categories — a device status reading
        (for example, over Bluetooth). That capture is evaluated automatically, and the result
        (a verdict, TestPass&apos;s reasoning, and the images) is what the buyer sees.
      </p>
      <p className="mt-2">
        If a buyer unlocks a result, payment is handled entirely by Stripe through Stripe Checkout —
        TestPass never sees or stores card numbers itself. Stripe processes that payment and shares
        back only what TestPass needs to confirm it (a checkout session id and payment status).
      </p>
      <p className="mt-2">
        TestPass also logs basic usage events (for example, that a link was opened, a test was
        submitted, or a result was viewed) to understand whether the product is working — these
        events are structured and don&apos;t include capture content or free-text reasoning.
      </p>

      <h2 className="mt-6 font-semibold text-foreground">How long TestPass keeps it</h2>
      <p className="mt-2">
        Raw capture images and the detailed evidence content (TestPass&apos;s written reasoning, raw
        device data, and any cosmetic notes) are deleted 7 days after a test is completed. After that,
        only minimal structured information remains (category, status, timestamps, and the verdict
        class) — retained for up to 90 days for improving the product, and then the session is deleted
        entirely.
      </p>

      <h2 className="mt-6 font-semibold text-foreground">Who this is shared with</h2>
      <p className="mt-2">
        A buyer and the seller they send a link to can see the test result for that one session.
        TestPass&apos;s infrastructure providers (Supabase for storage/database, Vercel for hosting,
        Stripe for payment, and an AI provider used to evaluate submitted evidence) process this data
        on TestPass&apos;s behalf to run the product. TestPass doesn&apos;t sell personal data or share
        it for advertising.
      </p>

      <h2 className="mt-6 font-semibold text-foreground">Questions or problems</h2>
      <p className="mt-2">
                The fastest way to reach TestPass is the &quot;Contact&quot; link in the site footer, or &quot;Report a problem&quot; on any test page — both open the same contact form. Your message is stored so we can look into it, along with the session, page, and role automatically attached when you reach it from an active test. An email address is only required if you&apos;d like a reply, and is used solely to respond to your message — never for marketing. We keep contact messages for as long as they&apos;re operationally useful for support during Early Access, and don&apos;t share them outside TestPass&apos;s own infrastructure providers.
      </p>
    </div>
  );
}
