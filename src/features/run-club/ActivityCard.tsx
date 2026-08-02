"use client";

import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { avatarColor } from "./browser";
import { formatDistance, formatDuration, formatPace } from "./geo";

export type FeedActivity = {
  _id: string;
  shareSlug: string;
  displayName: string;
  avatarHue: number;
  title: string;
  activityType: "run" | "walk" | "jog";
  distanceMeters: number;
  durationMs: number;
  kudosCount: number;
  commentCount: number;
  hasKudos: boolean;
  createdAt: number;
  path: Array<{ lat: number; lng: number }>;
  notes?: string;
};

function RouteThumb({ path }: { path: FeedActivity["path"] }) {
  if (path.length < 2) {
    return <div className="h-28 w-full rounded-2xl bg-[#163d2b]" />;
  }
  const width = 320;
  const height = 140;
  const pad = 12;
  let minLat = path[0].lat;
  let maxLat = path[0].lat;
  let minLng = path[0].lng;
  let maxLng = path[0].lng;
  for (const point of path) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }
  const latSpan = Math.max(0.0008, maxLat - minLat);
  const lngSpan = Math.max(0.0008, maxLng - minLng);
  const points = path
    .map((point) => {
      const x = pad + ((point.lng - minLng) / lngSpan) * (width - pad * 2);
      const y = pad + (1 - (point.lat - minLat) / latSpan) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full rounded-2xl bg-[#163d2b]">
      <polyline
        points={points}
        fill="none"
        stroke="#b8e05c"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ActivityCard({
  activity,
  onToggleKudos,
}: {
  activity: FeedActivity;
  onToggleKudos?: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-[color:var(--run-line)] bg-white/70 shadow-[0_10px_30px_rgba(12,40,28,0.08)]">
      <Link href={`/run/a/${activity.shareSlug}`} className="block">
        <RouteThumb path={activity.path} />
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ background: avatarColor(activity.avatarHue) }}
            >
              {(activity.displayName[0] || "?").toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-[color:var(--run-ink)]">
                {activity.displayName}
              </p>
              <p className="text-xs text-[color:var(--run-muted)]">
                {activity.activityType} ·{" "}
                {new Intl.DateTimeFormat("en-MY", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(activity.createdAt))}
              </p>
            </div>
          </div>
          <div>
            <h2 className="font-[family-name:var(--run-display)] text-2xl tracking-tight">
              {activity.title}
            </h2>
            {activity.notes ? (
              <p className="mt-1 line-clamp-2 text-sm text-[color:var(--run-muted)]">
                {activity.notes}
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <Stat label="Distance" value={formatDistance(activity.distanceMeters)} />
            <Stat label="Time" value={formatDuration(activity.durationMs)} />
            <Stat
              label="Pace"
              value={formatPace(activity.distanceMeters, activity.durationMs)}
            />
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-2 border-t border-[color:var(--run-line)] px-4 py-3">
        <button
          type="button"
          onClick={onToggleKudos}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
            activity.hasKudos
              ? "bg-[#123526] text-[#b8e05c]"
              : "bg-white/80 text-[color:var(--run-ink)]"
          }`}
        >
          <Heart size={14} fill={activity.hasKudos ? "currentColor" : "none"} />
          {activity.kudosCount}
        </button>
        <Link
          href={`/run/a/${activity.shareSlug}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-sm text-[color:var(--run-ink)]"
        >
          <MessageCircle size={14} />
          {activity.commentCount}
        </Link>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[color:var(--run-muted)]">{label}</p>
      <p className="font-semibold text-[color:var(--run-ink)]">{value}</p>
    </div>
  );
}
