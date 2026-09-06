"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

// PostHog's project token is a write-only client key — safe to ship in a
// public bundle (PostHog's own dashboard labels it this way). Added
// 2026-09-06 to answer "how many people visit testpass.me and what do they
// do" — previously nothing tracked visits at all. See docs/GROWTH_OS.md.
const POSTHOG_KEY = "phc_txprwEcrpf6i8yBEcw8Z5NnZDXrXiBHfPEwv59nGhhbV";
const POSTHOG_HOST = "https://us.i.posthog.com";

if (typeof window !== "undefined") {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    // Captured manually below so client-side Next.js App Router
    // navigations (which don't trigger a full page load) still count as
    // pageviews, not just the initial load.
    capture_pageview: false,
    capture_pageleave: true,
  });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <SuspendedPostHogPageView />
      {children}
    </PHProvider>
  );
}

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const client = usePostHog();

  useEffect(() => {
    if (!pathname || !client) return;
    let url = window.origin + pathname;
    if (searchParams && searchParams.toString()) {
      url += `?${searchParams.toString()}`;
    }
    client.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, client]);

  return null;
}

// usePathname/useSearchParams require a Suspense boundary during static
// generation of pages that don't otherwise use them.
function SuspendedPostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  );
}
