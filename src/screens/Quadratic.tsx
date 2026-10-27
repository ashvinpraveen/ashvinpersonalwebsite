"use client";

import { Suspense } from "react";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import QuadraticApp from "@/features/quadratic/QuadraticApp";
import { isConvexConfigured } from "@/lib/features";

export default function Quadratic() {
  if (!isConvexConfigured) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24">
        <FeatureUnavailable
          title="Quadratic needs Convex"
          description="Set NEXT_PUBLIC_CONVEX_URL and run `npx convex dev` to use Quadratic, the Linear-style issue tracker."
        />
      </main>
    );
  }
  return (
    <Suspense fallback={null}>
      <QuadraticApp />
    </Suspense>
  );
}
