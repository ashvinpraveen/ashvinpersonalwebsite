"use client";

import { ReactNode, useMemo, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import PostHogProvider from "@/components/PostHogProvider";
import ChatWidget from "@/components/ChatWidget";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

function MaybeConvexProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => {
    if (!convexUrl) return null;
    return new ConvexReactClient(convexUrl);
  }, []);

  if (!convex) return <>{children}</>;

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <PostHogProvider>
      <MaybeConvexProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <TooltipProvider>
              <Analytics />
              <Toaster />
              <Sonner />
              {children}
              <ChatWidget />
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </MaybeConvexProvider>
    </PostHogProvider>
  );
}
