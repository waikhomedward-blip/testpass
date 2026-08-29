"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Polls quietly and refreshes the server component so the buyer's page
// updates as soon as the seller submits — no manual reload needed.
export default function AutoRefresh({ intervalMs = 4000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(t);
  }, [router, intervalMs]);
  return null;
}
