"use client";

import { avatarColor } from "./browser";
import { formatDistance, formatDuration } from "./geo";
import type { MemberStats, SharedActivity } from "./types";

type StatsPanelProps = {
  mine?: {
    stats: MemberStats | null;
    recent: SharedActivity[];
  } | null;
  leaderboard?: MemberStats[];
  clubTotals?: {
    trackedMembers: number;
    totalDistanceMeters: number;
    activityCount: number;
  } | null;
  selfClientId?: string;
};

export default function StatsPanel({
  mine,
  leaderboard,
  clubTotals,
  selfClientId,
}: StatsPanelProps) {
  const stats = mine?.stats;

  return (
    <div className="space-y-6">
      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--run-muted)]">
          Your trail
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Distance"
            value={formatDistance(stats?.totalDistanceMeters ?? 0)}
          />
          <Stat
            label="Activities"
            value={String(stats?.activityCount ?? 0)}
          />
          <Stat
            label="Time"
            value={formatDuration(stats?.totalDurationMs ?? 0)}
          />
          <Stat
            label="Streak"
            value={`${stats?.streakDays ?? 0}d`}
          />
        </div>
      </section>

      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--run-muted)]">
          Club pulse
        </p>
        <p className="mt-2 text-sm text-[color:var(--run-muted)]">
          {clubTotals
            ? `${formatDistance(clubTotals.totalDistanceMeters)} across ${clubTotals.activityCount} finishes from the top pack.`
            : "Stats will fill in as the club moves."}
        </p>
      </section>

      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--run-muted)]">
          Distance board
        </p>
        <ol className="mt-3 space-y-2">
          {(leaderboard ?? []).length === 0 ? (
            <li className="text-sm text-[color:var(--run-muted)]">No finishes yet — take the first lap.</li>
          ) : (
            (leaderboard ?? []).map((row, index) => (
              <li
                key={row.clientId}
                className="flex items-center gap-3 text-sm"
              >
                <span className="w-5 font-mono text-[color:var(--run-muted)]">
                  {index + 1}
                </span>
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ background: avatarColor(row.avatarHue) }}
                >
                  {(row.displayName[0] || "?").toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-[color:var(--run-ink)]">
                  {row.clientId === selfClientId ? `${row.displayName} (you)` : row.displayName}
                </span>
                <span className="font-mono text-[color:var(--run-ink)]">
                  {formatDistance(row.totalDistanceMeters)}
                </span>
              </li>
            ))
          )}
        </ol>
      </section>

      {(mine?.recent?.length ?? 0) > 0 ? (
        <section>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--run-muted)]">
            Recent finishes
          </p>
          <ul className="mt-3 space-y-2">
            {mine!.recent.map((activity) => (
              <li
                key={activity._id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-[color:var(--run-muted)]">
                  {new Intl.DateTimeFormat("en-MY", {
                    month: "short",
                    day: "numeric",
                  }).format(new Date(activity.createdAt))}
                </span>
                <span className="font-medium text-[color:var(--run-ink)]">
                  {formatDistance(activity.distanceMeters)}
                </span>
                <a
                  href={`/run-club/s/${activity.shareSlug}`}
                  className="font-mono text-xs text-[color:var(--run-accent-deep)] underline-offset-2 hover:underline"
                >
                  Share
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-[color:var(--run-muted)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--run-display)] text-2xl text-[color:var(--run-ink)]">
        {value}
      </p>
    </div>
  );
}
