"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";
import { ReactNode, Suspense, useEffect, useRef, useState } from "react";
import { isPostHogEnabled } from "@/lib/features";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthogClient = usePostHog();
  const lastUrl = useRef("");

  useEffect(() => {
    if (!pathname || !posthogClient) return;

    const url = window.origin + pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    if (url === lastUrl.current) return;
    lastUrl.current = url;

    posthogClient.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, posthogClient]);

  return null;
}

export default function PostHogProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isPostHogEnabled && POSTHOG_KEY) {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: "identified_only",
        capture_pageview: false,
        capture_pageleave: true,
      });
    }
    setIsReady(true);
  }, []);

  if (!isPostHogEnabled || !POSTHOG_KEY || !isReady) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}
