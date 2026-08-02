import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MAX_CLIENT_ID_LENGTH = 80;
const MAX_DISPLAY_NAME_LENGTH = 24;
const MAX_ROUTE_NAME_LENGTH = 60;
const MAX_ROUTE_WAYPOINTS = 40;
const ROUTE_LIST_LIMIT = 40;

const waypointValidator = v.object({
  lat: v.number(),
  lng: v.number(),
  label: v.optional(v.string()),
});

const normalizeClientId = (value: string) =>
  value.trim().slice(0, MAX_CLIENT_ID_LENGTH);

const normalizeDisplayName = (value: string) =>
  value.trim().replace(/\s+/g, " ").slice(0, MAX_DISPLAY_NAME_LENGTH);

const normalizeRouteName = (value: string) =>
  value.trim().replace(/\s+/g, " ").slice(0, MAX_ROUTE_NAME_LENGTH);

function assertFiniteCoord(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Location looks invalid.");
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error("Location is out of range.");
  }
}

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function pathDistanceMeters(points: Array<{ lat: number; lng: number }>) {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += haversineMeters(points[i - 1], points[i]);
  }
  return total;
}

function cleanWaypoints(raw: Array<{ lat: number; lng: number; label?: string }>) {
  const waypoints = raw
    .filter((point) => {
      try {
        assertFiniteCoord(point.lat, point.lng);
        return true;
      } catch {
        return false;
      }
    })
    .slice(0, MAX_ROUTE_WAYPOINTS)
    .map((point, index) => ({
      lat: point.lat,
      lng: point.lng,
      label: point.label?.trim().slice(0, 40) || (index === 0 ? "Start" : undefined),
    }));

  if (waypoints.length < 2) {
    throw new Error("Add at least two points to save a route.");
  }
  return waypoints;
}

export const listRoutes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("runClubRoutes")
      .withIndex("by_createdAt")
      .order("desc")
      .take(ROUTE_LIST_LIMIT);
  },
});

export const createRoute = mutation({
  args: {
    clientId: v.string(),
    displayName: v.string(),
    avatarHue: v.number(),
    name: v.string(),
    waypoints: v.array(waypointValidator),
  },
  handler: async (ctx, args) => {
    const clientId = normalizeClientId(args.clientId);
    const displayName = normalizeDisplayName(args.displayName);
    const name = normalizeRouteName(args.name);
    if (!clientId || !displayName) throw new Error("Join the club first.");
    if (!name) throw new Error("Give the route a name.");

    const waypoints = cleanWaypoints(args.waypoints);
    return await ctx.db.insert("runClubRoutes", {
      clientId,
      displayName,
      avatarHue: args.avatarHue,
      name,
      waypoints,
      distanceMeters: Math.round(pathDistanceMeters(waypoints)),
      createdAt: Date.now(),
    });
  },
});

export const deleteRoute = mutation({
  args: {
    routeId: v.id("runClubRoutes"),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = normalizeClientId(args.clientId);
    if (!clientId) throw new Error("Join the club first.");
    const route = await ctx.db.get("runClubRoutes", args.routeId);
    if (!route) return null;
    if (route.clientId !== clientId) {
      throw new Error("You can only delete routes you created.");
    }
    await ctx.db.delete("runClubRoutes", args.routeId);
    return null;
  },
});

export const applyRouteToSession = mutation({
  args: {
    sessionId: v.id("runClubSessions"),
    routeId: v.id("runClubRoutes"),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = normalizeClientId(args.clientId);
    if (!clientId) throw new Error("Join the club first.");

    const [session, route] = await Promise.all([
      ctx.db.get("runClubSessions", args.sessionId),
      ctx.db.get("runClubRoutes", args.routeId),
    ]);
    if (!session) throw new Error("Meetup not found.");
    if (!route) throw new Error("Route not found.");

    // Keep the meetup pin at AICB; only swap the guided path.
    await ctx.db.patch("runClubSessions", args.sessionId, {
      routeId: route._id,
      routeWaypoints: route.waypoints,
    });
    return null;
  },
});

export const clearSessionRoute = mutation({
  args: {
    sessionId: v.id("runClubSessions"),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = normalizeClientId(args.clientId);
    if (!clientId) throw new Error("Join the club first.");
    const session = await ctx.db.get("runClubSessions", args.sessionId);
    if (!session) throw new Error("Meetup not found.");

    await ctx.db.replace("runClubSessions", args.sessionId, {
      title: session.title,
      status: session.status,
      startsAt: session.startsAt,
      startLabel: session.startLabel,
      startLat: session.startLat,
      startLng: session.startLng,
      routeWaypoints: [],
      notes: session.notes,
      createdAt: session.createdAt,
    });
    return null;
  },
});
