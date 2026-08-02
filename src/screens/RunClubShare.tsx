"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import RunClubShell from "@/features/run-club/RunClubShell";
import ShareCard from "@/features/run-club/ShareCard";
import { isRunClubEnabled } from "@/lib/features";

export default function RunClubShare({ slug }: { slug: string }) {
  if (!isRunClubEnabled) {
    return (
      <RunClubShell title="Shared finish">
        <FeatureUnavailable
          title="Shared finish unavailable"
          description="AI Run Club needs Convex enabled to load shared distance cards."
        />
      </RunClubShell>
    );
  }

  return <RunClubShareApp slug={slug} />;
}

function RunClubShareApp({ slug }: { slug: string }) {
  const activity = useQuery(api.runClub.getSharedActivity, { shareSlug: slug });

  return (
    <RunClubShell title="Shared finish" subtitle="From AI Run Club">
      {activity === undefined ? (
        <p className="text-sm text-[color:var(--run-muted)]">Loading finish…</p>
      ) : activity === null ? (
        <div className="rounded-[24px] border border-[color:var(--run-line)] bg-white/70 p-6">
          <h2 className="font-[family-name:var(--run-display)] text-3xl">Finish not found</h2>
          <p className="mt-2 text-sm text-[color:var(--run-muted)]">
            This share link may be mistyped or from another environment.
          </p>
          <Link
            href="/run"
            className="mt-5 inline-flex rounded-full bg-[color:var(--run-ink)] px-4 py-2.5 text-sm font-medium text-[color:var(--run-accent)]"
          >
            Open AI Run Club
          </Link>
        </div>
      ) : (
        <div className="mx-auto max-w-md space-y-5">
          <ShareCard
            displayName={activity.displayName}
            avatarHue={activity.avatarHue}
            distanceMeters={activity.distanceMeters}
            durationMs={activity.durationMs}
            path={activity.path}
            shareSlug={activity.shareSlug}
            createdAt={activity.createdAt}
          />
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href={`/run/a/${activity.shareSlug}`}
              className="font-medium text-[color:var(--run-accent-deep)] underline-offset-2 hover:underline"
            >
              Open full activity →
            </Link>
            <Link
              href="/run"
              className="font-medium text-[color:var(--run-accent-deep)] underline-offset-2 hover:underline"
            >
              Record with the club →
            </Link>
          </div>
        </div>
      )}
    </RunClubShell>
  );
}
