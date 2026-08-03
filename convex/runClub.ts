import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import {
  dayKeyInClubTz,
  nextMeetupStartsAt,
  previousDayKey,
  weekKeyInClubTz,
} from "./lib/runClubSchedule";

const MAX_CLIENT_ID_LENGTH = 80;
const MAX_DISPLAY_NAME_LENGTH = 24;
const MAX_PHONE_LENGTH = 32;
const MAX_CHAT_LENGTH = 280;
const MAX_PATH_POINTS = 120;
const MAX_MESSAGES = 80;
const MAX_LEADERBOARD = 20;
const MAX_RECENT_ACTIVITIES = 24;
const MAX_TITLE_LENGTH = 80;
const MAX_NOTES_LENGTH = 280;
const activityTypeValidator = v.union(
  v.literal("run"),
  v.literal("walk"),
  v.literal("jog"),
);
const PRESENCE_TTL_MS = 60_000;
const PRESENCE_LIST_LIMIT = 80;

const DEFAULT_START = {
  label: "AICB (Wisma AICB)",
  lat: 3.1489,
  lng: 101.6854,
};

/** Old seeded Lake Gardens loop — strip it so meetups start with no guided path. */
function isLegacyDefaultRoute(
  waypoints: Array<{ lat: number; lng: number; label?: string }>,
) {
  if (waypoints.length !== 7) return false;
  return waypoints[0]?.label === "Start · AICB" && waypoints[6]?.label === "Finish · AICB";
}

const normalizeClientId = (value: string) =>
  value.trim().slice(0, MAX_CLIENT_ID_LENGTH);

const normalizeDisplayName = (value: string) =>
  value.trim().replace(/\s+/g, " ").slice(0, MAX_DISPLAY_NAME_LENGTH);

const normalizePhone = (value: string) =>
  value.trim().replace(/\s+/g, " ").slice(0, MAX_PHONE_LENGTH);

const normalizeChatBody = (value: string) =>
  value.trim().replace(/\r\n/g, "\n").slice(0, MAX_CHAT_LENGTH);

function assertFiniteCoord(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Location looks invalid.");
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error("Location is out of range.");
  }
}

function makeShareSlug() {
  const alphabet = "abcdefghijkmnopqrstuvwxyz23456789";
  let slug = "";
  for (let i = 0; i < 10; i += 1) {
    slug += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return slug;
}

function samplePath(
  points: Array<{ lat: number; lng: number }>,
  maxPoints: number,
) {
  const toPoint = (point: { lat: number; lng: number }) => ({
    lat: point.lat,
    lng: point.lng,
  });
  if (points.length <= maxPoints) return points.map(toPoint);
  if (maxPoints < 2) return [toPoint(points[0])];
  const sampled = [toPoint(points[0])];
  const middleSlots = maxPoints - 2;
  for (let i = 1; i <= middleSlots; i += 1) {
    const index = Math.round((i * (points.length - 1)) / (middleSlots + 1));
    sampled.push(toPoint(points[index]));
  }
  sampled.push(toPoint(points[points.length - 1]));
  return sampled;
}

function sessionTitle(startsAt: number) {
  const label = new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(startsAt));
  return `AI Run Club · ${label}`;
}

async function ensureUpcomingSession(ctx: MutationCtx) {
  const now = Date.now();
  const upcoming = await ctx.db
    .query("runClubSessions")
    .withIndex("by_startsAt")
    .order("desc")
    .take(8);

  const liveOrSoon = upcoming.find((session) => {
    if (session.status === "ended") return false;
    const endsAt = session.startsAt + 3 * 60 * 60 * 1000;
    return endsAt >= now - 15 * 60 * 1000;
  });

  if (liveOrSoon) {
    let session = liveOrSoon;
    if (!session.routeId && isLegacyDefaultRoute(session.routeWaypoints)) {
      await ctx.db.patch("runClubSessions", session._id, {
        routeWaypoints: [],
        notes: "Meet at AICB. Warm up together, then pick or draw a route as a group.",
      });
      session = { ...session, routeWaypoints: [], notes: "Meet at AICB. Warm up together, then pick or draw a route as a group." };
    }

    const shouldBeLive =
      now >= session.startsAt - 30 * 60 * 1000 &&
      now <= session.startsAt + 3 * 60 * 60 * 1000;
    if (shouldBeLive && session.status !== "live") {
      await ctx.db.patch("runClubSessions", session._id, { status: "live" });
      return { ...session, status: "live" as const };
    }
    if (!shouldBeLive && now > session.startsAt + 3 * 60 * 60 * 1000) {
      await ctx.db.patch("runClubSessions", session._id, { status: "ended" });
    } else {
      return session;
    }
  }

  const startsAt = nextMeetupStartsAt(now);
  const sessionId = await ctx.db.insert("runClubSessions", {
    title: sessionTitle(startsAt),
    status:
      now >= startsAt - 30 * 60 * 1000 && now <= startsAt + 3 * 60 * 60 * 1000
        ? "live"
        : "scheduled",
    startsAt,
    startLabel: DEFAULT_START.label,
    startLat: DEFAULT_START.lat,
    startLng: DEFAULT_START.lng,
    routeWaypoints: [],
    notes: "Meet at AICB. Warm up together, then pick or draw a route as a group.",
    createdAt: now,
  });

  const created = await ctx.db.get("runClubSessions", sessionId);
  if (!created) throw new Error("Could not create the next meetup.");
  return created;
}

export const upsertMember = mutation({
  args: {
    clientId: v.string(),
    displayName: v.string(),
    avatarHue: v.number(),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clientId = normalizeClientId(args.clientId);
    const displayName = normalizeDisplayName(args.displayName);
    const phone =
      typeof args.phone === "string" ? normalizePhone(args.phone) : undefined;
    if (!clientId) throw new Error("Missing runner id.");
    if (!displayName) throw new Error("Pick a display name.");
    if (!Number.isFinite(args.avatarHue)) throw new Error("Pick an avatar color.");

    const now = Date.now();
    const existing = await ctx.db
      .query("runClubMembers")
      .withIndex("by_clientId", (q) => q.eq("clientId", clientId))
      .unique();

    if (existing) {
      await ctx.db.patch("runClubMembers", existing._id, {
        displayName,
        avatarHue: args.avatarHue,
        updatedAt: now,
        ...(phone ? { phone } : {}),
      });
      return existing._id;
    }

    return await ctx.db.insert("runClubMembers", {
      clientId,
      displayName,
      avatarHue: args.avatarHue,
      ...(phone ? { phone } : {}),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const ensureMeetup = mutation({
  args: {},
  handler: async (ctx) => {
    return await ensureUpcomingSession(ctx);
  },
});

export const getMeetup = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sessions = await ctx.db
      .query("runClubSessions")
      .withIndex("by_startsAt")
      .order("desc")
      .take(12);

    const active = sessions.find((session) => {
      if (session.status === "ended") return false;
      return session.startsAt + 3 * 60 * 60 * 1000 >= now - 15 * 60 * 1000;
    });

    return active ?? sessions[0] ?? null;
  },
});

export const heartbeat = mutation({
  args: {
    clientId: v.string(),
    displayName: v.string(),
    avatarHue: v.number(),
    lat: v.number(),
    lng: v.number(),
    isTracking: v.boolean(),
    sessionId: v.optional(v.id("runClubSessions")),
  },
  handler: async (ctx, args) => {
    const clientId = normalizeClientId(args.clientId);
    const displayName = normalizeDisplayName(args.displayName);
    if (!clientId || !displayName) throw new Error("Join the club first.");
    assertFiniteCoord(args.lat, args.lng);

    const now = Date.now();
    const existing = await ctx.db
      .query("runClubPresence")
      .withIndex("by_clientId", (q) => q.eq("clientId", clientId))
      .unique();

    const payload = {
      clientId,
      sessionId: args.sessionId,
      displayName,
      avatarHue: args.avatarHue,
      lat: args.lat,
      lng: args.lng,
      isTracking: args.isTracking,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch("runClubPresence", existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("runClubPresence", payload);
  },
});

export const listPresence = query({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - PRESENCE_TTL_MS;
    const recent = await ctx.db
      .query("runClubPresence")
      .withIndex("by_updatedAt")
      .order("desc")
      .take(PRESENCE_LIST_LIMIT);

    return recent.filter((row) => row.updatedAt >= cutoff);
  },
});

export const leavePresence = mutation({
  args: {
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = normalizeClientId(args.clientId);
    if (!clientId) return null;

    const existing = await ctx.db
      .query("runClubPresence")
      .withIndex("by_clientId", (q) => q.eq("clientId", clientId))
      .unique();

    if (existing) {
      await ctx.db.delete("runClubPresence", existing._id);
    }
    return null;
  },
});

export const sendMessage = mutation({
  args: {
    clientId: v.string(),
    displayName: v.string(),
    avatarHue: v.number(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = normalizeClientId(args.clientId);
    const displayName = normalizeDisplayName(args.displayName);
    const body = normalizeChatBody(args.body);
    if (!clientId || !displayName) throw new Error("Join the club first.");
    if (!body) throw new Error("Message is empty.");

    return await ctx.db.insert("runClubMessages", {
      clientId,
      displayName,
      avatarHue: args.avatarHue,
      body,
      createdAt: Date.now(),
    });
  },
});

export const listMessages = query({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db
      .query("runClubMessages")
      .withIndex("by_createdAt")
      .order("desc")
      .take(MAX_MESSAGES);
    return messages.reverse();
  },
});

export const finishActivity = mutation({
  args: {
    clientId: v.string(),
    displayName: v.string(),
    avatarHue: v.number(),
    sessionId: v.optional(v.id("runClubSessions")),
    activityType: v.optional(activityTypeValidator),
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
    distanceMeters: v.number(),
    durationMs: v.number(),
    movingDurationMs: v.optional(v.number()),
    splitsMeters: v.optional(v.array(v.number())),
    path: v.array(
      v.object({
        lat: v.number(),
        lng: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const clientId = normalizeClientId(args.clientId);
    const displayName = normalizeDisplayName(args.displayName);
    if (!clientId || !displayName) throw new Error("Join the club first.");
    if (!Number.isFinite(args.distanceMeters) || args.distanceMeters < 0) {
      throw new Error("Distance looks invalid.");
    }
    if (!Number.isFinite(args.durationMs) || args.durationMs < 0) {
      throw new Error("Duration looks invalid.");
    }

    const path = samplePath(
      args.path.filter((point) => {
        try {
          assertFiniteCoord(point.lat, point.lng);
          return true;
        } catch {
          return false;
        }
      }),
      MAX_PATH_POINTS,
    );

    const activityType = args.activityType ?? "walk";
    const title =
      args.title?.trim().replace(/\s+/g, " ").slice(0, MAX_TITLE_LENGTH) ||
      defaultActivityTitle(activityType, Math.round(args.distanceMeters));
    const notes = args.notes?.trim().replace(/\r\n/g, "\n").slice(0, MAX_NOTES_LENGTH);

    const now = Date.now();
    const dayKey = dayKeyInClubTz(now);
    const weekKey = weekKeyInClubTz(now);
    let shareSlug = makeShareSlug();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const collision = await ctx.db
        .query("runClubActivities")
        .withIndex("by_shareSlug", (q) => q.eq("shareSlug", shareSlug))
        .unique();
      if (!collision) break;
      shareSlug = makeShareSlug();
    }

    const distanceMeters = Math.round(args.distanceMeters);
    const durationMs = Math.round(args.durationMs);
    const movingDurationMs = Math.round(args.movingDurationMs ?? durationMs);
    const splitsMeters = (args.splitsMeters ?? [])
      .filter((value) => Number.isFinite(value) && value > 0)
      .slice(0, 42)
      .map((value) => Math.round(value));

    // Convex rejects `undefined` field values — omit optionals instead of setting them.
    const activityId = await ctx.db.insert("runClubActivities", {
      clientId,
      displayName,
      avatarHue: args.avatarHue,
      ...(args.sessionId ? { sessionId: args.sessionId } : {}),
      activityType,
      title,
      ...(notes ? { notes } : {}),
      distanceMeters,
      durationMs,
      movingDurationMs,
      path,
      ...(splitsMeters.length > 0 ? { splitsMeters } : {}),
      kudosCount: 0,
      commentCount: 0,
      shareSlug,
      createdAt: now,
      dayKey,
    });

    const stats = await ctx.db
      .query("runClubMemberStats")
      .withIndex("by_clientId", (q) => q.eq("clientId", clientId))
      .unique();

    let streakDays = 1;
    if (stats?.lastDayKey === dayKey) {
      streakDays = stats.streakDays;
    } else if (stats?.lastDayKey && stats.lastDayKey === previousDayKey(dayKey)) {
      streakDays = stats.streakDays + 1;
    }

    const weekDistanceMeters =
      stats?.weekKey === weekKey
        ? (stats.weekDistanceMeters ?? 0) + distanceMeters
        : distanceMeters;

    if (stats) {
      await ctx.db.patch("runClubMemberStats", stats._id, {
        displayName,
        avatarHue: args.avatarHue,
        totalDistanceMeters: stats.totalDistanceMeters + distanceMeters,
        totalDurationMs: stats.totalDurationMs + durationMs,
        activityCount: stats.activityCount + 1,
        streakDays,
        lastDayKey: dayKey,
        weekDistanceMeters,
        weekKey,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("runClubMemberStats", {
        clientId,
        displayName,
        avatarHue: args.avatarHue,
        totalDistanceMeters: distanceMeters,
        totalDurationMs: durationMs,
        activityCount: 1,
        streakDays: 1,
        lastDayKey: dayKey,
        weekDistanceMeters,
        weekKey,
        updatedAt: now,
      });
    }

    return { activityId, shareSlug };
  },
});

function defaultActivityTitle(
  activityType: "run" | "walk" | "jog",
  distanceMeters: number,
) {
  const km = (distanceMeters / 1000).toFixed(distanceMeters >= 10000 ? 1 : 2);
  const label =
    activityType === "run" ? "Run" : activityType === "jog" ? "Jog" : "Walk";
  return `${label} · ${km} km`;
}

export const getSharedActivity = query({
  args: {
    shareSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const shareSlug = args.shareSlug.trim().toLowerCase();
    if (!shareSlug) return null;
    return await ctx.db
      .query("runClubActivities")
      .withIndex("by_shareSlug", (q) => q.eq("shareSlug", shareSlug))
      .unique();
  },
});

export const getMyStats = query({
  args: {
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = normalizeClientId(args.clientId);
    if (!clientId) return null;

    const stats = await ctx.db
      .query("runClubMemberStats")
      .withIndex("by_clientId", (q) => q.eq("clientId", clientId))
      .unique();

    const recent = await ctx.db
      .query("runClubActivities")
      .withIndex("by_clientId_and_createdAt", (q) => q.eq("clientId", clientId))
      .order("desc")
      .take(MAX_RECENT_ACTIVITIES);

    return {
      stats,
      recent,
    };
  },
});

export const leaderboard = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("runClubMemberStats")
      .withIndex("by_totalDistanceMeters")
      .order("desc")
      .take(MAX_LEADERBOARD);
    return rows;
  },
});

export const clubTotals = query({
  args: {},
  handler: async (ctx) => {
    const top = await ctx.db
      .query("runClubMemberStats")
      .withIndex("by_totalDistanceMeters")
      .order("desc")
      .take(MAX_LEADERBOARD);

    let totalDistanceMeters = 0;
    let activityCount = 0;
    for (const row of top) {
      totalDistanceMeters += row.totalDistanceMeters;
      activityCount += row.activityCount;
    }

    return {
      trackedMembers: top.length,
      totalDistanceMeters,
      activityCount,
    };
  },
});

export const listSessions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("runClubSessions")
      .withIndex("by_startsAt")
      .order("desc")
      .take(12);
  },
});

export const listMembers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("runClubMembers")
      .withIndex("by_updatedAt")
      .order("desc")
      .take(40);
  },
});

export const weeklyLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const weekKey = weekKeyInClubTz(Date.now());
    const rows = await ctx.db
      .query("runClubMemberStats")
      .withIndex("by_weekDistanceMeters")
      .order("desc")
      .take(MAX_LEADERBOARD);
    return rows
      .filter((row) => row.weekKey === weekKey && (row.weekDistanceMeters ?? 0) > 0)
      .slice(0, MAX_LEADERBOARD);
  },
});
