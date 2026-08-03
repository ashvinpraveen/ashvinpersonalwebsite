"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import { avatarColor, normalizeDisplayName, normalizePhone } from "@/features/run-club/browser";
import { MAX_DISPLAY_NAME_LENGTH, MAX_PHONE_LENGTH } from "@/features/run-club/config";
import { formatDistance, formatDuration } from "@/features/run-club/geo";
import RunClubShell from "@/features/run-club/RunClubShell";
import JoinGate from "@/features/run-club/JoinGate";
import { useRunClubProfile } from "@/features/run-club/useRunClubProfile";
import { isRunClubEnabled } from "@/lib/features";

export default function RunClubYou() {
  if (!isRunClubEnabled) {
    return (
      <RunClubShell title="You">
        <FeatureUnavailable
          title="Profile unavailable"
          description="Enable Convex to track your streak, calendar, and history."
        />
      </RunClubShell>
    );
  }
  return <YouApp />;
}

function YouApp() {
  const { profile, ready, join, updateProfile } = useRunClubProfile();
  const [joining, setJoining] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const mine = useQuery(
    api.runClub.getMyStats,
    profile ? { clientId: profile.clientId } : "skip",
  );
  const calendar = useQuery(
    api.runClubSocial.getProfileCalendar,
    profile ? { clientId: profile.clientId } : "skip",
  );

  if (!ready) {
    return (
      <RunClubShell title="You">
        <p className="text-sm text-[color:var(--run-muted)]">Loading…</p>
      </RunClubShell>
    );
  }

  if (!profile) {
    return (
      <RunClubShell title="You" subtitle="Your streak, week, and history.">
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

  const stats = mine?.stats;

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault();
    setProfileError(null);
    setSavingProfile(true);
    try {
      await updateProfile({ name: nameDraft, phone: phoneDraft });
      setEditingProfile(false);
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : "Could not update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <RunClubShell title={profile.displayName} subtitle="Your trail with the club.">
      <div className="mb-5 flex items-center gap-3">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold text-white"
          style={{ background: avatarColor(profile.avatarHue) }}
        >
          {(profile.displayName[0] || "?").toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[color:var(--run-muted)]">Streak</p>
          <p className="font-[family-name:var(--run-display)] text-3xl">
            {stats?.streakDays ?? 0} days
          </p>
        </div>
      </div>

      <section className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--run-muted)]">
          Profile
        </p>
        {editingProfile ? (
          <form onSubmit={handleSaveProfile} className="mt-3 space-y-3">
            <input
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              maxLength={MAX_DISPLAY_NAME_LENGTH}
              placeholder="Name"
              autoFocus
              autoComplete="nickname"
              className="w-full rounded-full border border-[color:var(--run-line)] bg-white/80 px-4 py-3 text-base outline-none focus:border-[color:var(--run-accent-deep)]"
            />
            <input
              value={phoneDraft}
              onChange={(event) => setPhoneDraft(event.target.value)}
              maxLength={MAX_PHONE_LENGTH}
              placeholder="Phone"
              inputMode="tel"
              autoComplete="tel"
              className="w-full rounded-full border border-[color:var(--run-line)] bg-white/80 px-4 py-3 text-base outline-none focus:border-[color:var(--run-accent-deep)]"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={
                  savingProfile ||
                  !normalizeDisplayName(nameDraft) ||
                  !normalizePhone(phoneDraft)
                }
                className="rounded-full bg-[color:var(--run-ink)] px-4 py-2.5 text-sm font-semibold text-[color:var(--run-accent)] disabled:opacity-40"
              >
                {savingProfile ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                disabled={savingProfile}
                onClick={() => {
                  setEditingProfile(false);
                  setProfileError(null);
                }}
                className="rounded-full border border-[color:var(--run-line)] bg-white/70 px-4 py-2.5 text-sm font-medium text-[color:var(--run-ink)] disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
            {profileError ? <p className="text-sm text-red-700">{profileError}</p> : null}
          </form>
        ) : (
          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg text-[color:var(--run-ink)]">{profile.displayName}</p>
              <p className="mt-0.5 truncate text-sm text-[color:var(--run-muted)]">
                {profile.phone || "No phone yet"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setNameDraft(profile.displayName);
                setPhoneDraft(profile.phone ?? "");
                setProfileError(null);
                setEditingProfile(true);
              }}
              className="shrink-0 rounded-full border border-[color:var(--run-line)] bg-white/70 px-4 py-2 text-sm font-medium text-[color:var(--run-ink)]"
            >
              Change
            </button>
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Distance" value={formatDistance(stats?.totalDistanceMeters ?? 0)} />
        <Stat label="This week" value={formatDistance(stats?.weekDistanceMeters ?? 0)} />
        <Stat label="Activities" value={String(stats?.activityCount ?? 0)} />
        <Stat label="Time" value={formatDuration(stats?.totalDurationMs ?? 0)} />
      </div>

      <section className="mt-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--run-muted)]">
          Activity calendar
        </p>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {buildCalendarCells(calendar ?? []).map((cell) => (
            <div
              key={cell.key}
              title={cell.title}
              className="aspect-square rounded-md"
              style={{
                background:
                  cell.level === 0
                    ? "rgba(18,53,38,0.08)"
                    : `rgba(63,143,74,${0.25 + cell.level * 0.18})`,
              }}
            />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--run-muted)]">
          Recent finishes
        </p>
        <ul className="mt-3 space-y-2">
          {(mine?.recent ?? []).map((activity) => (
            <li key={activity._id}>
              <Link
                href={`/run/a/${activity.shareSlug}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--run-line)] bg-white/70 px-4 py-3 text-sm"
              >
                <span>
                  {activity.title ?? "Activity"} ·{" "}
                  {new Intl.DateTimeFormat("en-MY", {
                    month: "short",
                    day: "numeric",
                  }).format(new Date(activity.createdAt))}
                </span>
                <span className="font-mono">{formatDistance(activity.distanceMeters)}</span>
              </Link>
            </li>
          ))}
          {(mine?.recent.length ?? 0) === 0 ? (
            <li className="text-sm text-[color:var(--run-muted)]">
              No finishes yet — open Record and start moving.
            </li>
          ) : null}
        </ul>
      </section>
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

function buildCalendarCells(
  days: Array<{ dayKey: string; distanceMeters: number; count: number }>,
) {
  const byKey = new Map(days.map((day) => [day.dayKey, day]));
  const cells: Array<{ key: string; level: number; title: string }> = [];
  const today = new Date();
  for (let offset = 27; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    const hit = byKey.get(key);
    const meters = hit?.distanceMeters ?? 0;
    const level =
      meters <= 0 ? 0 : meters < 2000 ? 1 : meters < 5000 ? 2 : meters < 10000 ? 3 : 4;
    cells.push({
      key,
      level,
      title: hit
        ? `${key}: ${formatDistance(meters)} · ${hit.count} activit${hit.count === 1 ? "y" : "ies"}`
        : key,
    });
  }
  return cells;
}
