import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms — TestPass" };

// Draft, reflecting actual current behavior (one-time $5 unlock, no
// subscriptions, refund policy per docs/BETA_RUNBOOK.md) — not a
// substitute for a real legal review. Marked for owner/legal review per
// Section 43 of the beta operating directive.
export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 text-sm text-ink-secondary">
      <p className="type-label">TestPass · Early Access</p>
      <h1 className="mt-1 type-page-title text-foreground">Terms</h1>
      <p className="mt-2 text-xs">
        This is a draft, plain-language description of how TestPass&apos;s early-access beta works.
        It isn&apos;t a substitute for legal advice, and it may change as TestPass changes.
      </p>

      <h2 className="mt-6 font-semibold text-foreground">What TestPass is</h2>
      <p className="mt-2">
        TestPass sends a short, guided test to the seller of a used device, and reports only what the
        evidence from that test supports. A DEMONSTRATED, FAILED, or INCONCLUSIVE result describes
        what happened during that one test session — it is not a certification, an inspection
        guarantee, or a promise about the device&apos;s condition beyond what was tested.
      </p>

      <h2 className="mt-6 font-semibold text-foreground">Creating and taking a test</h2>
      <p className="mt-2">
        Creating a test is free. Taking a test as a seller is free — TestPass never charges the
        seller, and never asks a seller for an account, a password, or payment details.
      </p>

      <h2 className="mt-6 font-semibold text-foreground">Unlocking a result</h2>
      <p className="mt-2">
        Once a seller completes a test, the buyer can unlock the full result for a one-time payment —
        no subscription, no recurring charge, no credits. The buyer is never charged before a real
        result exists, and is never charged again for the same result. Payment is processed by
        Stripe.
      </p>

      <h2 className="mt-6 font-semibold text-foreground">Refunds</h2>
      <p className="mt-2">
        If TestPass itself fails — for example, a technical error prevents a real result from being
        produced — that isn&apos;t charged for in the first place, and if it happens after payment,
        we&apos;ll make it right. TestPass doesn&apos;t refund a result just because the seller
        didn&apos;t participate as hoped, or because a legitimate INCONCLUSIVE result wasn&apos;t the
        answer the buyer wanted — those are logged as real product feedback instead. Use
        &quot;Report a problem&quot; on the relevant test page to raise an issue.
      </p>

      <h2 className="mt-6 font-semibold text-foreground">Early access</h2>
      <p className="mt-2">
        TestPass is being validated across real phones, devices, and categories, and things may not
        always work perfectly. If something goes wrong with TestPass itself, tell us and we&apos;ll
        make it right.
      </p>
    </div>
  );
}
