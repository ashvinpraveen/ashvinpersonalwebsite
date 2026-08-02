"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import { avatarColor } from "@/features/run-club/browser";
import { formatDistance } from "@/features/run-club/geo";
import LiveChat from "@/features/run-club/LiveChat";
import RunClubShell from "@/features/run-club/RunClubShell";
import JoinGate from "@/features/run-club/JoinGate";
import { useRunClubProfile } from "@/features/run-club/useRunClubProfile";
import { isRunClubEnabled } from "@/lib/features";

export default function RunClubClub() {
  if (!isRunClubEnabled) {
    return (
      <RunClubShell title="Club">
        <FeatureUnavailable
          title="Club unavailable"
          description="Enable Convex for chat, members, and weekly boards."
        />
      </RunClubShell>
    );
  }
  return <ClubApp />;
}

function ClubApp() {
  const { profile, ready, join } = useRunClubProfile();
  const [joining, setJoining] = useState(false);
  const [tab, setTab] = useState<"chat" | "members" | "week">("chat");
  const messages = useQuery(api.runClub.listMessages);
  const members = useQuery(api.runClub.listMembers);
  const weekly = useQuery(api.runClub.weeklyLeaderboard);
  const allTime = useQuery(api.runClub.leaderboard);
  const totals = useQuery(api.runClub.clubTotals);
  const sendMessage = useMutation(api.runClub.sendMessage);
  const presence = useQuery(api.runClub.listPresence);

  if (!ready) {
    return (
      <RunClubShell title="Club">
        <p className="text-sm text-[color:var(--run-muted)]">Loading…</p>
      </RunClubShell>
    );
  }

  if (!profile) {
    return (
      <RunClubShell title="Club" subtitle="Chat, members, and weekly grind.">
        <JoinGate
          busy={joining}
          onJoin={async (name) => {
            setJoining(true);
            try {
              await join(name);
            } finally {
              setJoining(false);
            }
          }}
        />
      </RunClubShell>
    );
  }

  return (
    <RunClubShell
      title="Club"
      subtitle={`${presence?.length ?? 0} nearby · ${totals?.activityCount ?? 0} finishes logged`}
    >
      <div className="mb-4 flex gap-2">
        {(["chat", "members", "week"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-full px-3 py-1.5 text-sm capitalize ${
              tab === value
                ? "bg-[color:var(--run-ink)] text-[color:var(--run-accent)]"
                : "bg-white/70 text-[color:var(--run-ink)]"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {tab === "chat" ? (
        <div className="h-[60vh] min-h-[360px] rounded-[24px] border border-[color:var(--run-line)] bg-white/70 p-3">
          <LiveChat
            messages={messages}
            selfClientId={profile.clientId}
            onSend={async (body) => {
              await sendMessage({
                clientId: profile.clientId,
                displayName: profile.displayName,
                avatarHue: profile.avatarHue,
                body,
              });
            }}
          />
        </div>
      ) : null}

      {tab === "members" ? (
        <ul className="space-y-2">
          {(members ?? []).map((member) => (
            <li
              key={member._id}
              className="flex items-center gap-3 rounded-2xl border border-[color:var(--run-line)] bg-white/70 px-3 py-3"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ background: avatarColor(member.avatarHue) }}
              >
                {(member.displayName[0] || "?").toUpperCase()}
              </span>
              <div>
                <p className="font-medium">
                  {member.displayName}
                  {member.clientId === profile.clientId ? " (you)" : ""}
                </p>
                <p className="text-xs text-[color:var(--run-muted)]">
                  Joined{" "}
                  {new Intl.DateTimeFormat("en-MY", {
                    month: "short",
                    day: "numeric",
                  }).format(new Date(member.createdAt))}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "week" ? (
        <div className="space-y-6">
          <section>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--run-muted)]">
              This week
            </p>
            <ol className="mt-3 space-y-2">
              {(weekly ?? []).length === 0 ? (
                <li className="text-sm text-[color:var(--run-muted)]">No weekly distance yet.</li>
              ) : (
                (weekly ?? []).map((row, index) => (
                  <li key={row.clientId} className="flex items-center gap-3 text-sm">
                    <span className="w-5 font-mono text-[color:var(--run-muted)]">{index + 1}</span>
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                      style={{ background: avatarColor(row.avatarHue) }}
                    >
                      {(row.displayName[0] || "?").toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{row.displayName}</span>
                    <span className="font-mono">
                      {formatDistance(row.weekDistanceMeters ?? 0)}
                    </span>
                  </li>
                ))
              )}
            </ol>
          </section>
          <section>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--run-muted)]">
              All-time distance
            </p>
            <ol className="mt-3 space-y-2">
              {(allTime ?? []).map((row, index) => (
                <li key={row.clientId} className="flex items-center gap-3 text-sm">
                  <span className="w-5 font-mono text-[color:var(--run-muted)]">{index + 1}</span>
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ background: avatarColor(row.avatarHue) }}
                  >
                    {(row.displayName[0] || "?").toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{row.displayName}</span>
                  <span className="font-mono">{formatDistance(row.totalDistanceMeters)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      ) : null}
    </RunClubShell>
  );
}
