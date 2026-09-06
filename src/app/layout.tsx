import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { PostHogProvider } from "@/components/PostHogProvider";

const SITE_URL = "https://testpass.me";
const SITE_DESCRIPTION =
  "TestPass sends the seller a short, guided test of the actual used device — not another AI guess from listing photos.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TestPass — Test it before you pay",
    template: "%s | TestPass",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "TestPass",
    title: "TestPass — Test it before you pay",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "TestPass — Test it before you pay",
    description: SITE_DESCRIPTION,
  },
};

// Organization + WebSite JSON-LD, per Phase 2 of the zero-budget
// distribution brief: gives search engines an unambiguous entity to tie
// every page's structured data back to, without duplicating it per page.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "TestPass",
  url: SITE_URL,
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "TestPass",
  url: SITE_URL,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <PostHogProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <header className="border-b border-border-subtle">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            {/* Wordmark uses the approved chassis (Direction C, "Signal &
                Grid"): a short structural blue rule, not a boxed monogram
                — the registration-corner mark stays reserved for captured
                evidence and never appears here. */}
            <Link href="/" className="flex items-center gap-2.5 text-[15px] font-extrabold tracking-tight">
              <span className="h-[3px] w-[18px] shrink-0 bg-signal" aria-hidden="true" />
              TestPass
              {/* Section 4 of the beta operating directive: compact, not
                  alarming — a small tag, not a banner. */}
              <span className="rounded-full border border-border-control px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-secondary">
                Early Access
              </span>
            </Link>
            <nav className="flex items-center gap-2">
              <Link
                href="/buyer/mine"
                className="rounded-lg border border-border-control px-3.5 py-1.5 text-sm font-medium text-ink-secondary transition-colors hover:border-signal hover:text-signal"
              >
                My tests
              </Link>
              <Link
                href="/"
                className="rounded-lg bg-signal px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-signal-hover"
              >
                Test a device
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
        <footer className="border-t border-border-subtle">
          <div className="mx-auto max-w-5xl px-6 py-6 text-xs text-ink-secondary">
            <p>
              TestPass reports only what the evidence supports. A DEMONSTRATED verdict describes what
              happened during this session — it is not a guarantee of future reliability or complete
              device condition.
            </p>
            <p className="mt-2">
              TestPass is being validated across real phones and devices. If something goes wrong with
              TestPass itself, use the &quot;Report a problem&quot; link on any test page and
              we&apos;ll make it right.
            </p>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              <Link href="/blog" className="hover:text-signal hover:underline">
                Blog
              </Link>
              <Link href="/privacy" className="hover:text-signal hover:underline">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-signal hover:underline">
                Terms
              </Link>
              <Link href="/contact" className="hover:text-signal hover:underline">
                Contact
              </Link>
            </p>
          </div>
        </footer>
        </PostHogProvider>
      </body>
    </html>
  );
}
