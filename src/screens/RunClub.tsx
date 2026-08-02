"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { motion, AnimatePresence } from "motion/react";
import {
  MapPinned,
  MessageCircle,
  Navigation,
  Square,
  ChartNoAxesCombined,
  Footprints,
  X,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import SiteNav from "@/components/SiteNav";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import {
  getOrCreateRunClubClientId,
  normalizeDisplayName,
  pickAvatarHue,
  readStoredProfile,
  saveProfile,
} from "@/features/run-club/browser";
import {
  CLUB_SCHEDULE,
  DEFAULT_ROUTE,
  DEFAULT_START,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_PATH_POINTS,
  PRESENCE_HEARTBEAT_MS,
  TRACK_SAMPLE_METERS,
} from "@/features/run-club/config";
import {
  distanceMeters,
  formatDistance,
  formatDuration,
  formatPace,
  pathDistanceMeters,
  samplePath,
} from "@/features/run-club/geo";
import LiveChat from "@/features/run-club/LiveChat";
import ShareCard from "@/features/run-club/ShareCard";
import StatsPanel from "@/features/run-club/StatsPanel";
import { meetupCountdown, formatMeetupWhen } from "@/features/run-club/schedule";
import type { LatLng, RunClubProfile, RouteWaypoint, TrackPoint } from "@/features/run-club/types";
import { isConvexConfigured, isRunClubEnabled } from "@/lib/features";

const ClubMap = dynamic(() => import("@/features/run-club/ClubMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-[#123526] text-[#b8e05c]">
      Loading map…
    </div>
  ),
});

type Panel = "none" | "chat" | "stats" | "guide" | "share";

type FinishedShare = {
  shareSlug: string;
  distanceMeters: number;
  durationMs: number;
  path: LatLng[];
  createdAt: number;
  displayName: string;
  avatarHue: number;
};

export default function RunClub() {
  if (!isRunClubEnabled) {
    return (
      <main className="min-h-dvh bg-background px-4 pb-16 pt-20">
        <SiteNav variant="light" />
        <div className="mx-auto max-w-lg pt-10">
          <FeatureUnavailable
            title="AI Run Club"
            description="Turn on Convex and NEXT_PUBLIC_ENABLE_RUN_CLUB to host live meetups, chat, and distance tracking."
          />
        </div>
      </main>
    );
  }

  return <RunClubApp />;
}

function RunClubApp() {
  const [profile, setProfile] = useState<RunClubProfile | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [panel, setPanel] = useState<Panel>("none");
  const [tracking, setTracking] = useState(false);
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [livePosition, setLivePosition] = useState<LatLng | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [finished, setFinished] = useState<FinishedShare | null>(null);
  const [joining, setJoining] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastSampleRef = useRef<LatLng | null>(null);

  const upsertMember = useMutation(api.runClub.upsertMember);
  const ensureMeetup = useMutation(api.runClub.ensureMeetup);
  const heartbeat = useMutation(api.runClub.heartbeat);
  const leavePresence = useMutation(api.runClub.leavePresence);
  const sendMessage = useMutation(api.runClub.sendMessage);
  const finishActivity = useMutation(api.runClub.finishActivity);

  const meetup = useQuery(api.runClub.getMeetup);
  const presence = useQuery(api.runClub.listPresence) ?? [];
  const messages = useQuery(api.runClub.listMessages);
  const myStats = useQuery(
    api.runClub.getMyStats,
    profile ? { clientId: profile.clientId } : "skip",
  );
  const leaderboard = useQuery(api.runClub.leaderboard);
  const clubTotals = useQuery(api.runClub.clubTotals);

  useEffect(() => {
    const stored = readStoredProfile();
    if (stored) {
      setProfile(stored);
      setNameDraft(stored.displayName);
    } else {
      setNameDraft("");
    }
    void ensureMeetup({}).catch(() => undefined);
  }, [ensureMeetup]);

  useEffect(() => {
    if (!tracking || !startedAt) return;
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 500);
    return () => window.clearInterval(timer);
  }, [startedAt, tracking]);

  useEffect(() => {
    if (!profile || !livePosition) return;

    const tick = () => {
      void heartbeat({
        clientId: profile.clientId,
        displayName: profile.displayName,
        avatarHue: profile.avatarHue,
        lat: livePosition.lat,
        lng: livePosition.lng,
        isTracking: tracking,
        sessionId: meetup?._id as Id<"runClubSessions"> | undefined,
      }).catch(() => undefined);
    };

    tick();
    const timer = window.setInterval(tick, PRESENCE_HEARTBEAT_MS);
    return () => window.clearInterval(timer);
  }, [heartbeat, livePosition, meetup?._id, profile, tracking]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      const stored = readStoredProfile();
      if (stored) {
        void leavePresence({ clientId: stored.clientId }).catch(() => undefined);
      }
    };
  }, [leavePresence]);

  const distance = useMemo(() => pathDistanceMeters(trackPoints), [trackPoints]);
  const start = useMemo(
    () =>
      meetup
        ? {
            lat: meetup.startLat,
            lng: meetup.startLng,
            label: meetup.startLabel,
          }
        : { ...DEFAULT_START },
    [meetup],
  );
  const route = useMemo<RouteWaypoint[]>(
    () => (meetup?.routeWaypoints?.length ? meetup.routeWaypoints : [...DEFAULT_ROUTE]),
    [meetup],
  );

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    const displayName = normalizeDisplayName(nameDraft);
    if (!displayName || joining) return;
    setJoining(true);
    try {
      const clientId = getOrCreateRunClubClientId();
      const avatarHue = pickAvatarHue(clientId);
      await upsertMember({ clientId, displayName, avatarHue });
      const next = { clientId, displayName, avatarHue };
      saveProfile(next);
      setProfile(next);
      await ensureMeetup({});
      requestPosition(false);
    } catch (error) {
      setGeoError(error instanceof Error ? error.message : "Could not join.");
    } finally {
      setJoining(false);
    }
  }

  function requestPosition(enableWatch: boolean) {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not available in this browser.");
      return;
    }
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLivePosition(next);
      },
      () => {
        setGeoError("Allow location to see yourself on the map and track distance.");
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 12_000 },
    );

    if (!enableWatch) return;
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          recordedAt: Date.now(),
        };
        setLivePosition(next);
        setTrackPoints((current) => {
          const last = lastSampleRef.current;
          if (last && distanceMeters(last, next) < TRACK_SAMPLE_METERS) {
            return current;
          }
          lastSampleRef.current = next;
          return [...current, next];
        });
      },
      () => {
        setGeoError("Lost GPS signal. Keep the screen on and try again outdoors.");
      },
      { enableHighAccuracy: true, maximumAge: 2_000, timeout: 15_000 },
    );
  }

  function startTracking() {
    if (!profile) return;
    setTrackPoints([]);
    lastSampleRef.current = null;
    setFinished(null);
    setStartedAt(Date.now());
    setElapsedMs(0);
    setTracking(true);
    setPanel("none");
    requestPosition(true);
  }

  async function stopTracking() {
    if (!profile || !startedAt) return;
    setTracking(false);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const durationMs = Date.now() - startedAt;
    const finalDistance = pathDistanceMeters(trackPoints);
    const path = samplePath(trackPoints, MAX_PATH_POINTS);

    if (finalDistance < 20) {
      setGeoError("Need a bit more movement before we can share a finish.");
      setStartedAt(null);
      return;
    }

    try {
      const result = await finishActivity({
        clientId: profile.clientId,
        displayName: profile.displayName,
        avatarHue: profile.avatarHue,
        sessionId: meetup?._id,
        distanceMeters: finalDistance,
        durationMs,
        path,
      });
      setFinished({
        shareSlug: result.shareSlug,
        distanceMeters: finalDistance,
        durationMs,
        path,
        createdAt: Date.now(),
        displayName: profile.displayName,
        avatarHue: profile.avatarHue,
      });
      setPanel("share");
    } catch (error) {
      setGeoError(error instanceof Error ? error.message : "Could not save this finish.");
    } finally {
      setStartedAt(null);
    }
  }

  const showJoin = !profile;

  return (
    <main className="run-club-shell relative min-h-dvh overflow-hidden text-[color:var(--run-ink)]">
      <SiteNav variant="light" />

      <div className="relative h-dvh pt-12">
        <div className="run-club-map-layer absolute inset-0 top-12">
          <ClubMap
            start={start}
            route={route}
            presence={presence}
            selfClientId={profile?.clientId}
            selfPath={trackPoints}
            selfPosition={livePosition}
            followSelf={tracking}
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,transparent_40%,rgba(10,40,28,0.18))]" />
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-14 z-20 px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none max-w-xl"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[color:var(--run-accent-deep)]">
              Malaysian.ai
            </p>
            <h1 className="mt-1 font-[family-name:var(--run-display)] text-4xl leading-none tracking-tight text-[color:var(--run-ink)] md:text-5xl">
              AI Run Club
            </h1>
            <p className="mt-2 max-w-md text-sm text-[color:var(--run-muted)] md:text-base">
              Walk or jog together — live map, club chat, and a shareable finish at the end.
            </p>
          </motion.div>
        </div>

        <AnimatePresence>
          {showJoin ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 grid place-items-end bg-[#0d281c]/35 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-24 backdrop-blur-[2px] sm:place-items-center sm:pb-0"
            >
              <motion.form
                onSubmit={handleJoin}
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.45 }}
                className="w-full max-w-md rounded-[28px] border border-white/40 bg-[color:var(--run-panel)] p-6 shadow-[0_24px_80px_rgba(12,40,28,0.28)]"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--run-muted)]">
                  Join tonight&apos;s pack
                </p>
                <h2 className="mt-2 font-[family-name:var(--run-display)] text-3xl text-[color:var(--run-ink)]">
                  What should we call you?
                </h2>
                <p className="mt-2 text-sm text-[color:var(--run-muted)]">
                  {CLUB_SCHEDULE.days.join(" & ")} · {CLUB_SCHEDULE.localTime} · {CLUB_SCHEDULE.venue}
                </p>
                <input
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  maxLength={MAX_DISPLAY_NAME_LENGTH}
                  placeholder="Your name"
                  className="mt-5 w-full rounded-full border border-[color:var(--run-line)] bg-white/80 px-4 py-3 text-base outline-none focus:border-[color:var(--run-accent-deep)]"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={joining || !normalizeDisplayName(nameDraft)}
                  className="mt-4 w-full rounded-full bg-[color:var(--run-ink)] px-4 py-3 text-sm font-semibold text-[color:var(--run-accent)] transition enabled:hover:bg-[#1a4634] disabled:opacity-40"
                >
                  {joining ? "Joining…" : "Enter the club"}
                </button>
                {!isConvexConfigured ? (
                  <p className="mt-3 text-xs text-red-700">Convex is not configured in this environment.</p>
                ) : null}
              </motion.form>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-5 md:pb-5">
          <div className="pointer-events-auto mx-auto flex max-w-3xl flex-col gap-3">
            {geoError ? (
              <div className="rounded-2xl border border-red-300/60 bg-red-50/90 px-4 py-2 text-sm text-red-800">
                {geoError}
              </div>
            ) : null}

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="rounded-[28px] border border-white/50 bg-[color:var(--run-panel)] p-3 shadow-[0_18px_50px_rgba(12,40,28,0.22)] backdrop-blur-md"
            >
              <div className="flex flex-wrap items-end justify-between gap-3 px-1">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--run-muted)]">
                    {tracking ? "Live distance" : "Next meetup"}
                  </p>
                  <p className="font-[family-name:var(--run-display)] text-3xl tracking-tight text-[color:var(--run-ink)]">
                    {tracking
                      ? formatDistance(distance)
                      : meetup
                        ? meetupCountdown(meetup.startsAt)
                        : "Soon"}
                  </p>
                  <p className="text-xs text-[color:var(--run-muted)]">
                    {tracking
                      ? `${formatDuration(elapsedMs)} · ${formatPace(distance, elapsedMs)}`
                      : meetup
                        ? `${formatMeetupWhen(meetup.startsAt)} · ${meetup.startLabel}`
                        : `${CLUB_SCHEDULE.days.join(" & ")} · ${CLUB_SCHEDULE.localTime}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <HudButton
                    label="Guide"
                    icon={<MapPinned size={16} />}
                    active={panel === "guide"}
                    onClick={() => setPanel(panel === "guide" ? "none" : "guide")}
                  />
                  <HudButton
                    label="Chat"
                    icon={<MessageCircle size={16} />}
                    active={panel === "chat"}
                    onClick={() => setPanel(panel === "chat" ? "none" : "chat")}
                  />
                  <HudButton
                    label="Stats"
                    icon={<ChartNoAxesCombined size={16} />}
                    active={panel === "stats"}
                    onClick={() => setPanel(panel === "stats" ? "none" : "stats")}
                  />
                  {tracking ? (
                    <button
                      type="button"
                      onClick={() => void stopTracking()}
                      className="inline-flex items-center gap-2 rounded-full bg-[#8b2e2e] px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      <Square size={14} fill="currentColor" />
                      Finish
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startTracking}
                      disabled={!profile}
                      className="inline-flex items-center gap-2 rounded-full bg-[color:var(--run-ink)] px-4 py-2.5 text-sm font-semibold text-[color:var(--run-accent)] disabled:opacity-40"
                    >
                      <Navigation size={16} />
                      Start
                    </button>
                  )}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {panel !== "none" ? (
                  <motion.div
                    key={panel}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 max-h-[46vh] overflow-y-auto border-t border-[color:var(--run-line)] pt-3">
                      <div className="mb-2 flex items-center justify-between px-1">
                        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--run-muted)]">
                          {panel === "chat"
                            ? "Club chat"
                            : panel === "stats"
                              ? "Accumulated stats"
                              : panel === "guide"
                                ? "Start & route"
                                : "Shareable finish"}
                        </p>
                        <button
                          type="button"
                          onClick={() => setPanel("none")}
                          className="rounded-full p-1 text-[color:var(--run-muted)] hover:text-[color:var(--run-ink)]"
                          aria-label="Close panel"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {panel === "chat" ? (
                        <div className="h-[38vh] min-h-[220px]">
                          <LiveChat
                            messages={messages}
                            selfClientId={profile?.clientId}
                            disabled={!profile}
                            onSend={async (body) => {
                              if (!profile) return;
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

                      {panel === "stats" ? (
                        <StatsPanel
                          mine={myStats}
                          leaderboard={leaderboard}
                          clubTotals={clubTotals}
                          selfClientId={profile?.clientId}
                        />
                      ) : null}

                      {panel === "guide" ? (
                        <GuidePanel
                          startLabel={start.label}
                          address={DEFAULT_START.address}
                          notes={meetup?.notes}
                          routeLabels={route.flatMap((point) =>
                            "label" in point && point.label ? [point.label] : [],
                          )}
                          onLocate={() => requestPosition(tracking)}
                        />
                      ) : null}

                      {panel === "share" && finished ? (
                        <ShareCard {...finished} />
                      ) : null}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>

            <div className="flex items-center justify-between px-1 text-[11px] text-[color:var(--run-ink)]/70">
              <span className="inline-flex items-center gap-1">
                <Footprints size={12} />
                {presence.length} nearby
              </span>
              <Link href="/" className="hover:underline">
                ashvinpraveen.com
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function HudButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition ${
        active
          ? "bg-[color:var(--run-ink)] text-[color:var(--run-accent)]"
          : "bg-white/70 text-[color:var(--run-ink)] hover:bg-white"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function GuidePanel({
  startLabel,
  address,
  notes,
  routeLabels,
  onLocate,
}: {
  startLabel: string;
  address: string;
  notes?: string;
  routeLabels: string[];
  onLocate: () => void;
}) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return (
    <div className="space-y-4 px-1 pb-1">
      <div>
        <p className="font-[family-name:var(--run-display)] text-2xl text-[color:var(--run-ink)]">
          {startLabel}
        </p>
        <p className="mt-1 text-sm text-[color:var(--run-muted)]">{address}</p>
      </div>
      <p className="text-sm leading-relaxed text-[color:var(--run-ink)]">
        {notes ?? "Meet at the start pin, warm up as a group, then follow the dashed loop."}
      </p>
      <ol className="space-y-1.5 text-sm text-[color:var(--run-ink)]">
        {routeLabels.map((label, index) => (
          <li key={`${label}-${index}`} className="flex gap-2">
            <span className="font-mono text-[color:var(--run-muted)]">{index + 1}.</span>
            <span>{label}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-[color:var(--run-ink)] px-4 py-2.5 text-sm font-medium text-[color:var(--run-accent)]"
        >
          Open in Maps
        </a>
        <button
          type="button"
          onClick={onLocate}
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--run-line)] bg-white/70 px-4 py-2.5 text-sm font-medium"
        >
          Use my location
        </button>
      </div>
    </div>
  );
}
