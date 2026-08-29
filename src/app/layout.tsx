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
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-accent text-xs font-bold text-white">
                TP
              </span>
              TestPass
            </Link>
            <nav className="text-sm text-foreground/60">
              <Link href="/" className="hover:text-foreground">
                Test a device
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
        <footer className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-6 text-xs text-foreground/50">
            TestPass reports only what the evidence supports. A DEMONSTRATED verdict describes what
            happened during this session — it is not a guarantee of future reliability or complete
            device condition.
          </div>
        </footer>
      </body>
    </html>
  );
}
