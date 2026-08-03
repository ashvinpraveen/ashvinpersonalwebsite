"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import ActivityCard from "@/features/run-club/ActivityCard";
import RunClubShell from "@/features/run-club/RunClubShell";
import JoinGate from "@/features/run-club/JoinGate";
import { useRunClubProfile } from "@/features/run-club/useRunClubProfile";
import { isRunClubEnabled } from "@/lib/features";

export default function RunClubFeed() {
  if (!isRunClubEnabled) {
    return (
      <RunClubShell title="Feed">
        <FeatureUnavailable
          title="Feed unavailable"
          description="Enable Convex and NEXT_PUBLIC_ENABLE_RUN_CLUB to load the club activity feed."
        />
      </RunClubShell>
    );
  }

  return <FeedApp />;
}

function FeedApp() {
  const { profile, ready, join } = useRunClubProfile();
  const [joining, setJoining] = useState(false);
  const feed = useQuery(
    api.runClubSocial.listFeed,
    ready ? { clientId: profile?.clientId } : "skip",
  );
  const toggleKudos = useMutation(api.runClubSocial.toggleKudos);

  if (!ready) {
    return (
      <RunClubShell title="Feed" subtitle="Club finishes as they land.">
        <p className="text-sm text-[color:var(--run-muted)]">Loading…</p>
      </RunClubShell>
    );
  }

  if (!profile) {
    return (
      <RunClubShell title="Feed" subtitle="Join once to kudos and comment.">
        <JoinGate
          busy={joining}
          onJoin={async (details) => {
            setJoining(true);
            try {
              await join(details);
            } finally {
              setJoining(false);
            }
          }}
        />
      </RunClubShell>
    );
  }

  return (
    <RunClubShell title="Feed" subtitle="Every finish from the pack.">
      <div className="space-y-4">
        {feed === undefined ? (
          <p className="text-sm text-[color:var(--run-muted)]">Loading activities…</p>
        ) : feed.length === 0 ? (
          <div className="rounded-[24px] border border-[color:var(--run-line)] bg-white/70 p-6">
            <p className="font-[family-name:var(--run-display)] text-2xl">No finishes yet</p>
            <p className="mt-2 text-sm text-[color:var(--run-muted)]">
              Hit Record, complete a walk or run, and your shareable finish shows up here.
            </p>
          </div>
        ) : (
          feed.map((activity) => (
            <ActivityCard
              key={activity._id}
              activity={activity}
              onToggleKudos={() => {
                void toggleKudos({
                  activityId: activity._id as Id<"runClubActivities">,
                  clientId: profile.clientId,
                });
              }}
            />
          ))
        )}
      </div>
    </RunClubShell>
  );
}
