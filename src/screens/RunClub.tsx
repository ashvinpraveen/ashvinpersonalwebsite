"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import {
  MapPinned,
  MessageCircle,
  Navigation,
  Pause,
  Play,
  Square,
  X,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import FeatureUnavailable from "@/components/FeatureUnavailable";
import { readStoredProfile, getRunClubErrorMessage } from "@/features/run-club/browser";
import {
  DEFAULT_START,
  MAX_PATH_POINTS,
  MAX_ROUTE_WAYPOINTS,
  PRESENCE_HEARTBEAT_MS,
  TRACK_SAMPLE_METERS,
} from "@/features/run-club/config";
import {
  computeSplitDurations,
  distanceMeters,
  formatDistance,
  formatDuration,
  formatPace,
  pathDistanceMeters,
  samplePath,
} from "@/features/run-club/geo";
import LiveChat from "@/features/run-club/LiveChat";
import RouteDrawingBar from "@/features/run-club/RouteDrawingBar";
import RoutesPanel from "@/features/run-club/RoutesPanel";
import RunClubShell from "@/features/run-club/RunClubShell";
import { meetupCountdown } from "@/features/run-club/schedule";
import type { LatLng, RouteWaypoint, TrackPoint } from "@/features/run-club/types";
import JoinGate from "@/features/run-club/JoinGate";
import { useRunClubProfile } from "@/features/run-club/useRunClubProfile";
import { isRunClubEnabled } from "@/lib/features";

const ClubMap = dynamic(() => import("@/features/run-club/ClubMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-[#123526] text-[#b8e05c]">
      Loading map…
    </div>
  ),
});

type Panel = "none" | "chat" | "guide";
type ActivityType = "run" | "walk" | "jog";

const ACTIVITY_TYPES: ActivityType[] = ["run", "walk", "jog"];

export default function RunClub() {
  if (!isRunClubEnabled) {
    return (
      <RunClubShell fullBleed hideTabs>
        <div className="mx-auto flex min-h-dvh max-w-lg items-center px-4 pb-16 pt-20">
          <FeatureUnavailable
            title="AI Run Club"
            description="Turn on Convex and NEXT_PUBLIC_ENABLE_RUN_CLUB to host live meetups, chat, and distance tracking."
          />
        </div>
      </RunClubShell>
    );
  }

  return <RunClubApp />;
}

function RunClubApp() {
  const router = useRouter();
  const { profile, ready, join } = useRunClubProfile();
  const [joining, setJoining] = useState(false);
  const [panel, setPanel] = useState<Panel>("none");
  const [activityType, setActivityType] = useState<ActivityType>("run");
  const [tracking, setTracking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [livePosition, setLivePosition] = useState<LatLng | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [pausedTotalMs, setPausedTotalMs] = useState(0);
  const [wallElapsedMs, setWallElapsedMs] = useState(0);
  const [movingElapsedMs, setMovingElapsedMs] = useState(0);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [draftWaypoints, setDraftWaypoints] = useState<RouteWaypoint[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSampleRef = useRef<LatLng | null>(null);
  const pausedRef = useRef(false);

  const heartbeat = useMutation(api.runClub.heartbeat);
  const leavePresence = useMutation(api.runClub.leavePresence);
  const sendMessage = useMutation(api.runClub.sendMessage);
  const finishActivity = useMutation(api.runClub.finishActivity);
  const createRoute = useMutation(api.runClubRoutes.createRoute);
  const deleteRoute = useMutation(api.runClubRoutes.deleteRoute);
  const applyRouteToSession = useMutation(api.runClubRoutes.applyRouteToSession);
  const clearSessionRoute = useMutation(api.runClubRoutes.clearSessionRoute);

  const meetup = useQuery(api.runClub.getMeetup);
  const presence = useQuery(api.runClub.listPresence) ?? [];
  const messages = useQuery(api.runClub.listMessages);
  const clubRoutes = useQuery(api.runClubRoutes.listRoutes);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (!tracking || !startedAt) return;
    const tick = () => {
      const now = Date.now();
      const wall = now - startedAt;
      const pausedExtra = paused && pausedAt ? now - pausedAt : 0;
      setWallElapsedMs(wall);
      setMovingElapsedMs(Math.max(0, wall - pausedTotalMs - pausedExtra));
    };
    tick();
    const timer = window.setInterval(tick, 500);
    return () => window.clearInterval(timer);
  }, [startedAt, tracking, paused, pausedAt, pausedTotalMs]);

  useEffect(() => {
    if (!profile || !livePosition) return;

    const tick = () => {
      void heartbeat({
        clientId: profile.clientId,
        displayName: profile.displayName,
        avatarHue: profile.avatarHue,
        lat: livePosition.lat,
        lng: livePosition.lng,
        isTracking: tracking && !paused,
        sessionId: meetup?._id as Id<"runClubSessions"> | undefined,
      }).catch(() => undefined);
    };

    tick();
    const timer = window.setInterval(tick, PRESENCE_HEARTBEAT_MS);
    return () => window.clearInterval(timer);
  }, [heartbeat, livePosition, meetup?._id, paused, profile, tracking]);

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
  const route = useMemo<RouteWaypoint[]>(() => {
    if (drawing) return draftWaypoints;
    if (meetup?.routeWaypoints?.length) return meetup.routeWaypoints;
    const selected = clubRoutes?.find((item) => item._id === selectedRouteId);
    return selected?.waypoints ?? [];
  }, [clubRoutes, draftWaypoints, drawing, meetup?.routeWaypoints, selectedRouteId]);

  const draftDistanceMeters = useMemo(
    () => pathDistanceMeters(draftWaypoints),
    [draftWaypoints],
  );


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
        if (pausedRef.current) return;
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
    setStartedAt(Date.now());
    setPaused(false);
    setPausedAt(null);
    setPausedTotalMs(0);
    setWallElapsedMs(0);
    setMovingElapsedMs(0);
    setTracking(true);
    setPanel("none");
    setGeoError(null);
    requestPosition(true);
  }

  function pauseTracking() {
    if (!tracking || paused) return;
    setPaused(true);
    setPausedAt(Date.now());
  }

  function resumeTracking() {
    if (!tracking || !paused || !pausedAt) return;
    setPausedTotalMs((total) => total + (Date.now() - pausedAt));
    setPaused(false);
    setPausedAt(null);
    lastSampleRef.current = trackPoints[trackPoints.length - 1] ?? null;
  }

  async function stopTracking() {
    if (!profile || !startedAt || finishing) return;
    setFinishing(true);

    const finishStartedAt = startedAt;
    const finishPausedTotalMs = pausedTotalMs;
    const finishPausedAt = paused ? pausedAt : null;
    const finishPoints = trackPoints;

    setTracking(false);
    setPaused(false);
    setPausedAt(null);

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const now = Date.now();
    const durationMs = now - finishStartedAt;
    const pausedExtra = finishPausedAt ? now - finishPausedAt : 0;
    const movingDurationMs = Math.max(0, durationMs - finishPausedTotalMs - pausedExtra);
    const finalDistance = pathDistanceMeters(finishPoints);
    const path = samplePath(finishPoints, MAX_PATH_POINTS);
    const splitsMeters = computeSplitDurations(
      finishPoints.map((point) => ({ lat: point.lat, lng: point.lng })),
      movingDurationMs,
    );
    const title = activityTitle(activityType, finalDistance);

    if (finalDistance < 20) {
      setGeoError("Need a bit more movement before we can share a finish.");
      setStartedAt(null);
      setFinishing(false);
      return;
    }

    try {
      const result = await finishActivity({
        clientId: profile.clientId,
        displayName: profile.displayName,
        avatarHue: profile.avatarHue,
        sessionId: meetup?._id,
        activityType,
        title,
        distanceMeters: finalDistance,
        durationMs,
        movingDurationMs,
        splitsMeters,
        path,
      });
      setStartedAt(null);
      router.push(`/run/a/${result.shareSlug}`);
    } catch (error) {
      setGeoError(
        getRunClubErrorMessage(error, "Could not save this finish. Try again."),
      );
      setStartedAt(null);
      setFinishing(false);
    }
  }

  if (!ready) {
    return (
      <RunClubShell fullBleed hideTabs>
        <div className="grid h-dvh place-items-center px-4 text-sm text-[color:var(--run-muted)]" style={{ paddingTop: "var(--run-club-nav-h)" }}>
          Loading…
        </div>
      </RunClubShell>
    );
  }

  const hideTabs = !profile || tracking || drawing;

  return (
    <RunClubShell fullBleed hideTabs={hideTabs}>
      <div className="relative h-dvh max-h-dvh overflow-hidden" style={{ paddingTop: "var(--run-club-nav-h)" }}>
        <div className="run-club-map-layer absolute inset-0" style={{ top: "var(--run-club-nav-h)" }}>
          <ClubMap
            start={start}
            route={route}
            presence={presence}
            selfClientId={profile?.clientId}
            selfPath={trackPoints}
            selfPosition={livePosition}
            followSelf={tracking && !paused}
            drawing={drawing && !tracking}
            showWaypoints={
              (drawing || route.length > 0) &&
              route.length <= MAX_ROUTE_WAYPOINTS
            }
            onMapClick={(point) => {
              if (!drawing || tracking) return;
              setDraftWaypoints((current) => {
                if (current.length >= MAX_ROUTE_WAYPOINTS) return current;
                return [...current, point];
              });
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,transparent_40%,rgba(10,40,28,0.18))]" />
        </div>

        <AnimatePresence>
          {!profile ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 flex items-end justify-center overflow-y-auto overscroll-contain bg-[#0d281c]/35 px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-20 backdrop-blur-[2px] sm:items-center sm:pb-6"
            >
              <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.45 }}
                className="my-auto w-full max-w-md"
              >
                <JoinGate
                  busy={joining}
                  onJoin={async (details) => {
                    setJoining(true);
                    try {
                      await join(details);
                      requestPosition(false);
                    } finally {
                      setJoining(false);
                    }
                  }}
                />
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {profile ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3 md:px-5"
            style={{
              paddingBottom:
                "calc(var(--run-club-tab-h, 0px) + max(0.75rem, env(safe-area-inset-bottom, 0px)))",
            }}
          >
            <div className="pointer-events-auto mx-auto flex max-w-3xl flex-col gap-2">
              {geoError ? (
                <div className="rounded-2xl border border-red-300/60 bg-red-50/90 px-4 py-2 text-sm text-red-800">
                  {geoError}
                </div>
              ) : null}

              {drawing ? (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  <RouteDrawingBar
                    draftWaypoints={draftWaypoints}
                    draftDistanceMeters={draftDistanceMeters}
                    onUndoPoint={() =>
                      setDraftWaypoints((current) => current.slice(0, -1))
                    }
                    onClearDraft={() => setDraftWaypoints([])}
                    onCancelDrawing={() => {
                      setDrawing(false);
                      setDraftWaypoints([]);
                    }}
                    onSaveDraft={async (name) => {
                      const routeId = await createRoute({
                        clientId: profile.clientId,
                        displayName: profile.displayName,
                        avatarHue: profile.avatarHue,
                        name,
                        waypoints: draftWaypoints,
                      });
                      setDrawing(false);
                      setDraftWaypoints([]);
                      setSelectedRouteId(routeId);
                      setPanel("guide");
                    }}
                  />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="rounded-[22px] border border-white/50 bg-[color:var(--run-panel)] p-2.5 shadow-[0_18px_50px_rgba(12,40,28,0.22)] backdrop-blur-md"
                >
                  {!tracking ? (
                    <div className="mb-2 flex gap-1 px-0.5">
                      {ACTIVITY_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setActivityType(type)}
                          disabled={finishing}
                          className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                            activityType === type
                              ? "bg-[color:var(--run-ink)] text-[color:var(--run-accent)]"
                              : "bg-white/70 text-[color:var(--run-ink)] hover:bg-white"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between gap-3 px-0.5">
                    <div className="min-w-0">
                      <p className="font-[family-name:var(--run-display)] text-3xl leading-none tracking-tight text-[color:var(--run-ink)]">
                        {tracking
                          ? formatDistance(distance)
                          : meetup
                            ? meetupCountdown(meetup.startsAt)
                            : "—"}
                      </p>
                      {tracking ? (
                        <p className="mt-1 text-xs text-[color:var(--run-muted)]">
                          {paused ? "Paused · " : ""}
                          {formatDuration(movingElapsedMs)} · {formatPace(distance, movingElapsedMs)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                      {!tracking ? (
                        <>
                          <HudButton
                            label="Routes"
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
                          <button
                            type="button"
                            onClick={startTracking}
                            disabled={!profile}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--run-ink)] px-3.5 py-2.5 text-sm font-semibold text-[color:var(--run-accent)] disabled:opacity-40"
                          >
                            <Navigation size={15} />
                            Start
                          </button>
                        </>
                      ) : (
                        <>
                          {paused ? (
                            <button
                              type="button"
                              onClick={resumeTracking}
                              disabled={finishing}
                              className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--run-ink)] px-3.5 py-2.5 text-sm font-semibold text-[color:var(--run-accent)] disabled:opacity-40"
                            >
                              <Play size={14} fill="currentColor" />
                              Resume
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={pauseTracking}
                              disabled={finishing}
                              className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--run-line)] bg-white/80 px-3.5 py-2.5 text-sm font-semibold text-[color:var(--run-ink)] disabled:opacity-40"
                            >
                              <Pause size={14} />
                              Pause
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void stopTracking()}
                            disabled={finishing}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#8b2e2e] px-3.5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                          >
                            <Square size={14} fill="currentColor" />
                            {finishing ? "…" : "Finish"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {panel !== "none" && !tracking ? (
                      <motion.div
                        key={panel}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2.5 max-h-[min(34dvh,16rem)] overflow-y-auto border-t border-[color:var(--run-line)] pt-2.5">
                          <div className="mb-1.5 flex items-center justify-end px-0.5">
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
                            <div className="h-[34vh] min-h-[200px]">
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

                          {panel === "guide" ? (
                            <RoutesPanel
                              startLabel={start.label}
                              address={DEFAULT_START.address}
                              routes={clubRoutes}
                              selectedRouteId={meetup?.routeId ?? selectedRouteId}
                              selfClientId={profile?.clientId}
                              canEditMeetup={Boolean(profile && meetup)}
                              onLocate={() => requestPosition(tracking)}
                              onSelectRoute={(routeId) => {
                                setSelectedRouteId(routeId);
                                setDrawing(false);
                                setDraftWaypoints([]);
                              }}
                              onApplyToMeetup={(routeId) => {
                                if (!profile || !meetup) return;
                                void applyRouteToSession({
                                  sessionId: meetup._id,
                                  routeId: routeId as Id<"runClubRoutes">,
                                  clientId: profile.clientId,
                                });
                              }}
                              onClearMeetupRoute={() => {
                                if (!profile || !meetup) return;
                                void clearSessionRoute({
                                  sessionId: meetup._id,
                                  clientId: profile.clientId,
                                });
                                setSelectedRouteId(null);
                              }}
                              onStartDrawing={() => {
                                setDraftWaypoints([]);
                                setSelectedRouteId(null);
                                setPanel("none");
                                setDrawing(true);
                              }}
                              onDeleteRoute={(routeId) => {
                                if (!profile) return;
                                void deleteRoute({
                                  routeId: routeId as Id<"runClubRoutes">,
                                  clientId: profile.clientId,
                                });
                                if (selectedRouteId === routeId) setSelectedRouteId(null);
                              }}
                            />
                          ) : null}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </RunClubShell>
  );
}

function activityTitle(activityType: ActivityType, distanceMeters: number) {
  const km = (distanceMeters / 1000).toFixed(distanceMeters >= 10_000 ? 1 : 2);
  const label =
    activityType === "run" ? "Run" : activityType === "jog" ? "Jog" : "Walk";
  return `${label} · ${km} km`;
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
