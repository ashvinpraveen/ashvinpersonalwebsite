"use client";

import { ReactNode, useMemo, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

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
    <MaybeConvexProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <Analytics />
            <Toaster />
            <Sonner />
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </MaybeConvexProvider>
  );
}
