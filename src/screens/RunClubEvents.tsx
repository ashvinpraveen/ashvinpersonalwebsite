"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import { DEFAULT_START } from "@/features/run-club/config";
import RunClubShell from "@/features/run-club/RunClubShell";
import { formatMeetupWhen, meetupCountdown } from "@/features/run-club/schedule";
import JoinGate from "@/features/run-club/JoinGate";
import { useRunClubProfile } from "@/features/run-club/useRunClubProfile";
import { isRunClubEnabled } from "@/lib/features";

export default function RunClubEvents() {
  if (!isRunClubEnabled) {
    return (
      <RunClubShell title="Events">
        <FeatureUnavailable
          title="Events unavailable"
          description="Enable Convex to browse meetups and RSVP."
        />
      </RunClubShell>
    );
  }
  return <EventsApp />;
}

function EventsApp() {
  const { profile, ready, join } = useRunClubProfile();
  const [joining, setJoining] = useState(false);
  const ensureMeetup = useMutation(api.runClub.ensureMeetup);
  const setRsvp = useMutation(api.runClubSocial.setRsvp);
  const sessions = useQuery(api.runClub.listSessions);
  const meetup = useQuery(api.runClub.getMeetup);

  if (!ready) {
    return (
      <RunClubShell title="Events" subtitle="Mon & Thu meetups at AICB.">
        <p className="text-sm text-[color:var(--run-muted)]">Loading…</p>
      </RunClubShell>
    );
  }

  if (!profile) {
    return (
      <RunClubShell title="Events" subtitle="RSVP so the pack knows who’s coming.">
        <JoinGate
          busy={joining}
          onJoin={async (details) => {
            setJoining(true);
            try {
              await join(details);
              await ensureMeetup({});
            } finally {
              setJoining(false);
            }
          }}
        />
      </RunClubShell>
    );
  }

  return (
    <RunClubShell title="Events" subtitle="Show up, warm up, move together.">
      <div className="space-y-4">
        {(sessions ?? []).map((session) => (
          <EventCard
            key={session._id}
            session={session}
            profile={profile}
            isNext={meetup?._id === session._id}
            onRsvp={(status) =>
              void setRsvp({
                sessionId: session._id,
                clientId: profile.clientId,
                displayName: profile.displayName,
                avatarHue: profile.avatarHue,
                status,
              })
            }
          />
        ))}
        {sessions?.length === 0 ? (
          <button
            type="button"
            onClick={() => void ensureMeetup({})}
            className="rounded-full bg-[color:var(--run-ink)] px-4 py-2.5 text-sm font-medium text-[color:var(--run-accent)]"
          >
            Create next meetup
          </button>
        ) : null}
      </div>
    </RunClubShell>
  );
}

function EventCard({
  session,
  profile,
  isNext,
  onRsvp,
}: {
  session: {
    _id: Id<"runClubSessions">;
    title: string;
    status: "scheduled" | "live" | "ended";
    startsAt: number;
    startLabel: string;
    notes?: string;
  };
  profile: { clientId: string };
  isNext: boolean;
  onRsvp: (status: "going" | "maybe" | "declined") => void;
}) {
  const rsvps = useQuery(api.runClubSocial.listRsvps, {
    sessionId: session._id,
    clientId: profile.clientId,
  });
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(DEFAULT_START.address)}`;

  return (
    <article className="rounded-[24px] border border-[color:var(--run-line)] bg-white/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--run-muted)]">
            {session.status}
            {isNext ? " · next up" : ""}
          </p>
          <h2 className="mt-1 font-[family-name:var(--run-display)] text-2xl tracking-tight">
            {session.title}
          </h2>
          <p className="mt-1 text-sm text-[color:var(--run-muted)]">
            {formatMeetupWhen(session.startsAt)} · {meetupCountdown(session.startsAt)}
          </p>
          <p className="mt-1 text-sm text-[color:var(--run-ink)]">{session.startLabel}</p>
        </div>
      </div>
      {session.notes ? (
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--run-muted)]">{session.notes}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {(["going", "maybe", "declined"] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => onRsvp(status)}
            className={`rounded-full px-3 py-1.5 text-sm capitalize ${
              rsvps?.mine === status
                ? "bg-[color:var(--run-ink)] text-[color:var(--run-accent)]"
                : "bg-white/80 text-[color:var(--run-ink)]"
            }`}
          >
            {status}
            {rsvps ? ` · ${rsvps.counts[status]}` : ""}
          </button>
        ))}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-white/80 px-3 py-1.5 text-sm text-[color:var(--run-ink)]"
        >
          Open Maps
        </a>
      </div>

      {(rsvps?.going.length ?? 0) > 0 ? (
        <p className="mt-3 text-xs text-[color:var(--run-muted)]">
          Going: {rsvps!.going.map((row) => row.displayName).join(", ")}
        </p>
      ) : null}
    </article>
  );
}
