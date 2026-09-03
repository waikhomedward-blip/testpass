import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "TestPass — Test it before you pay",
  description:
    "TestPass sends the seller a short, guided test of the actual used device — not another AI guess from listing photos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-border-subtle">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            {/* Wordmark uses the approved chassis (Direction C, "Signal &
                Grid"): a short structural blue rule, not a boxed monogram
                — the registration-corner mark stays reserved for captured
                evidence and never appears here. */}
            <Link href="/" className="flex items-center gap-2.5 text-[15px] font-extrabold tracking-tight">
              <span className="h-[3px] w-[18px] shrink-0 bg-signal" aria-hidden="true" />
              TestPass
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
            TestPass reports only what the evidence supports. A DEMONSTRATED verdict describes what
            happened during this session — it is not a guarantee of future reliability or complete
            device condition.
          </div>
        </footer>
      </body>
    </html>
  );
}
