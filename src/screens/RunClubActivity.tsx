"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useMutation, useQuery } from "convex/react";
import { Heart, MapPinned, MessageCircle } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import { avatarColor } from "@/features/run-club/browser";
import { MAX_ROUTE_WAYPOINTS } from "@/features/run-club/config";
import {
  formatDistance,
  formatDuration,
  formatPace,
  samplePath,
} from "@/features/run-club/geo";
import RunClubShell from "@/features/run-club/RunClubShell";
import ShareCard from "@/features/run-club/ShareCard";
import { useRunClubProfile } from "@/features/run-club/useRunClubProfile";
import { isRunClubEnabled } from "@/lib/features";

const ClubMap = dynamic(() => import("@/features/run-club/ClubMap"), {
  ssr: false,
  loading: () => <div className="grid h-64 place-items-center bg-[#123526] text-[#b8e05c]">Loading map…</div>,
});

export default function RunClubActivity({ slug }: { slug: string }) {
  if (!isRunClubEnabled) {
    return (
      <RunClubShell title="Activity">
        <FeatureUnavailable
          title="Activity unavailable"
          description="Enable Convex to open shared finishes."
        />
      </RunClubShell>
    );
  }
  return <ActivityApp slug={slug} />;
}

function ActivityApp({ slug }: { slug: string }) {
  const { profile } = useRunClubProfile();
  const activity = useQuery(api.runClubSocial.getActivity, {
    shareSlug: slug,
    clientId: profile?.clientId,
  });
  const toggleKudos = useMutation(api.runClubSocial.toggleKudos);
  const addComment = useMutation(api.runClubSocial.addComment);
  const createRoute = useMutation(api.runClubRoutes.createRoute);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [savingRoute, setSavingRoute] = useState(false);
  const [routeSaved, setRouteSaved] = useState(false);

  const start = useMemo(() => {
    if (!activity?.path?.[0]) return null;
    return {
      lat: activity.path[0].lat,
      lng: activity.path[0].lng,
      label: "Start",
    };
  }, [activity]);

  async function handleComment(event: FormEvent) {
    event.preventDefault();
    if (!profile || !activity || !comment.trim()) return;
    setSending(true);
    try {
      await addComment({
        activityId: activity._id as Id<"runClubActivities">,
        clientId: profile.clientId,
        displayName: profile.displayName,
        avatarHue: profile.avatarHue,
        body: comment,
      });
      setComment("");
    } finally {
      setSending(false);
    }
  }

  async function handleSaveAsRoute() {
    if (!profile || !activity || activity.path.length < 2 || savingRoute || routeSaved) {
      return;
    }
    const defaultName = `${activity.displayName}'s ${activity.activityType}`;
    const name = window.prompt("Name this route", defaultName);
    if (!name?.trim()) return;
    setSavingRoute(true);
    try {
      await createRoute({
        clientId: profile.clientId,
        displayName: profile.displayName,
        avatarHue: profile.avatarHue,
        name: name.trim(),
        waypoints: samplePath(activity.path, MAX_ROUTE_WAYPOINTS),
      });
      setRouteSaved(true);
    } finally {
      setSavingRoute(false);
    }
  }

  if (activity === undefined) {
    return (
      <RunClubShell title="Activity">
        <p className="text-sm text-[color:var(--run-muted)]">Loading…</p>
      </RunClubShell>
    );
  }

  if (activity === null) {
    return (
      <RunClubShell title="Activity">
        <div className="rounded-[24px] border border-[color:var(--run-line)] bg-white/70 p-6">
          <p className="font-[family-name:var(--run-display)] text-2xl">Not found</p>
          <Link href="/run/feed" className="mt-4 inline-flex text-sm text-[color:var(--run-accent-deep)]">
            Back to feed →
          </Link>
        </div>
      </RunClubShell>
    );
  }

  return (
    <RunClubShell
      title={activity.title}
      subtitle={`${activity.displayName} · ${activity.activityType}`}
    >
      <div className="space-y-5">
        {start ? (
          <div className="run-club-map-layer h-64 overflow-hidden rounded-[24px] border border-[color:var(--run-line)]">
            <ClubMap
              start={start}
              route={activity.path}
              presence={[]}
              selfPath={[]}
              selfPosition={null}
              showWaypoints={false}
            />
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-3">
          <Stat label="Distance" value={formatDistance(activity.distanceMeters)} />
          <Stat label="Time" value={formatDuration(activity.durationMs)} />
          <Stat
            label="Pace"
            value={formatPace(activity.distanceMeters, activity.durationMs)}
          />
        </div>

        {(activity.splitsMeters?.length ?? 0) > 0 ? (
          <section className="rounded-[24px] border border-[color:var(--run-line)] bg-white/70 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--run-muted)]">
              Splits
            </p>
            <ol className="mt-3 space-y-1.5 text-sm">
              {activity.splitsMeters!.map((splitMs, index) => (
                <li key={`${index}-${splitMs}`} className="flex justify-between">
                  <span>Km {index + 1}</span>
                  <span className="font-mono">{formatDuration(splitMs)}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {activity.notes ? (
          <p className="text-sm leading-relaxed text-[color:var(--run-ink)]">{activity.notes}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!profile}
            onClick={() => {
              if (!profile) return;
              void toggleKudos({
                activityId: activity._id as Id<"runClubActivities">,
                clientId: profile.clientId,
              });
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm ${
              activity.hasKudos
                ? "bg-[color:var(--run-ink)] text-[color:var(--run-accent)]"
                : "bg-white/80 text-[color:var(--run-ink)]"
            }`}
          >
            <Heart size={14} fill={activity.hasKudos ? "currentColor" : "none"} />
            {activity.kudosCount} kudos
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-4 py-2 text-sm">
            <MessageCircle size={14} />
            {activity.commentCount} comments
          </span>
          {activity.path.length >= 2 ? (
            <button
              type="button"
              disabled={!profile || savingRoute || routeSaved}
              onClick={() => void handleSaveAsRoute()}
              className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--run-line)] bg-white/80 px-4 py-2 text-sm text-[color:var(--run-ink)] disabled:opacity-40"
            >
              <MapPinned size={14} />
              {routeSaved ? "Route saved" : savingRoute ? "Saving…" : "Save as route"}
            </button>
          ) : null}
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

        <section className="rounded-[24px] border border-[color:var(--run-line)] bg-white/70 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--run-muted)]">
            Comments
          </p>
          <div className="mt-3 space-y-3">
            {activity.comments.map((item) => (
              <div key={item._id} className="flex gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ background: avatarColor(item.avatarHue) }}
                >
                  {(item.displayName[0] || "?").toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-medium">{item.displayName}</p>
                  <p className="text-sm text-[color:var(--run-ink)]">{item.body}</p>
                </div>
              </div>
            ))}
            {activity.comments.length === 0 ? (
              <p className="text-sm text-[color:var(--run-muted)]">Be the first to comment.</p>
            ) : null}
          </div>
          {profile ? (
            <form onSubmit={handleComment} className="mt-4 flex gap-2">
              <input
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Nice pace!"
                className="min-w-0 flex-1 rounded-full border border-[color:var(--run-line)] bg-white/80 px-4 py-2.5 text-sm outline-none"
              />
              <button
                type="submit"
                disabled={sending || !comment.trim()}
                className="rounded-full bg-[color:var(--run-ink)] px-4 py-2.5 text-sm font-medium text-[color:var(--run-accent)] disabled:opacity-40"
              >
                Post
              </button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-[color:var(--run-muted)]">
              <Link href="/run/feed" className="underline">
                Join the club
              </Link>{" "}
              to comment.
            </p>
          )}
        </section>
      </div>
    </RunClubShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--run-line)] bg-white/70 p-3">
      <p className="text-[10px] uppercase tracking-wider text-[color:var(--run-muted)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--run-display)] text-xl">{value}</p>
    </div>
  );
}
