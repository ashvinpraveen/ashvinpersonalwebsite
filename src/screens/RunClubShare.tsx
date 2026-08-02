"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import SiteNav from "@/components/SiteNav";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import ShareCard from "@/features/run-club/ShareCard";
import { isRunClubEnabled } from "@/lib/features";

export default function RunClubShare({ slug }: { slug: string }) {
  if (!isRunClubEnabled) {
    return (
      <main className="min-h-dvh bg-background px-4 pb-16 pt-20">
        <SiteNav variant="light" />
        <div className="mx-auto max-w-lg pt-10">
          <FeatureUnavailable
            title="Shared finish unavailable"
            description="AI Run Club needs Convex enabled to load shared distance cards."
          />
        </div>
      </main>
    );
  }

  return <RunClubShareApp slug={slug} />;
}

function RunClubShareApp({ slug }: { slug: string }) {
  const activity = useQuery(api.runClub.getSharedActivity, { shareSlug: slug });

  return (
    <main className="run-club-shell min-h-dvh px-4 pb-16 pt-20 text-[color:var(--run-ink)]">
      <SiteNav variant="light" />
      <div className="mx-auto max-w-md pt-6">
        {activity === undefined ? (
          <p className="text-sm text-[color:var(--run-muted)]">Loading finish…</p>
        ) : activity === null ? (
          <div className="rounded-[24px] border border-[color:var(--run-line)] bg-white/70 p-6">
            <h1 className="font-[family-name:var(--run-display)] text-3xl">Finish not found</h1>
            <p className="mt-2 text-sm text-[color:var(--run-muted)]">
              This share link may be mistyped or from another environment.
            </p>
            <Link
              href="/run-club"
              className="mt-5 inline-flex rounded-full bg-[color:var(--run-ink)] px-4 py-2.5 text-sm font-medium text-[color:var(--run-accent)]"
            >
              Open AI Run Club
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--run-accent-deep)]">
                Shared finish
              </p>
              <h1 className="mt-1 font-[family-name:var(--run-display)] text-4xl tracking-tight">
                {activity.displayName}&apos;s walk
              </h1>
            </div>
            <ShareCard
              displayName={activity.displayName}
              avatarHue={activity.avatarHue}
              distanceMeters={activity.distanceMeters}
              durationMs={activity.durationMs}
              path={activity.path}
              shareSlug={activity.shareSlug}
              createdAt={activity.createdAt}
            />
            <Link
              href="/run-club"
              className="inline-flex text-sm font-medium text-[color:var(--run-accent-deep)] underline-offset-2 hover:underline"
            >
              Join the next meetup →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
