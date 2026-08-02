import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MAX_CLIENT_ID_LENGTH = 80;
const MAX_DISPLAY_NAME_LENGTH = 24;
const MAX_COMMENT_LENGTH = 280;
const FEED_LIMIT = 30;
const COMMENT_LIMIT = 80;
const RSVP_LIST_LIMIT = 60;

const normalizeClientId = (value: string) =>
  value.trim().slice(0, MAX_CLIENT_ID_LENGTH);

const normalizeDisplayName = (value: string) =>
  value.trim().replace(/\s+/g, " ").slice(0, MAX_DISPLAY_NAME_LENGTH);

const normalizeComment = (value: string) =>
  value.trim().replace(/\r\n/g, "\n").slice(0, MAX_COMMENT_LENGTH);

const rsvpStatusValidator = v.union(
  v.literal("going"),
  v.literal("maybe"),
  v.literal("declined"),
);

export const listFeed = query({
  args: {
    clientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewerId = normalizeClientId(args.clientId ?? "");
    const activities = await ctx.db
      .query("runClubActivities")
      .withIndex("by_createdAt")
      .order("desc")
      .take(FEED_LIMIT);

    return await Promise.all(
      activities.map(async (activity) => {
        let hasKudos = false;
        if (viewerId) {
          const kudos = await ctx.db
            .query("runClubKudos")
            .withIndex("by_activityId_and_clientId", (q) =>
              q.eq("activityId", activity._id).eq("clientId", viewerId),
            )
            .unique();
          hasKudos = Boolean(kudos);
        }

        return {
          ...activity,
          kudosCount: activity.kudosCount ?? 0,
          commentCount: activity.commentCount ?? 0,
          activityType: activity.activityType ?? "walk",
          title: activity.title ?? `${activity.displayName}'s activity`,
          hasKudos,
        };
      }),
    );
  },
});

export const getActivity = query({
  args: {
    shareSlug: v.string(),
    clientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const shareSlug = args.shareSlug.trim().toLowerCase();
    if (!shareSlug) return null;

    const activity = await ctx.db
      .query("runClubActivities")
      .withIndex("by_shareSlug", (q) => q.eq("shareSlug", shareSlug))
      .unique();
    if (!activity) return null;

    const viewerId = normalizeClientId(args.clientId ?? "");
    let hasKudos = false;
    if (viewerId) {
      const kudos = await ctx.db
        .query("runClubKudos")
        .withIndex("by_activityId_and_clientId", (q) =>
          q.eq("activityId", activity._id).eq("clientId", viewerId),
        )
        .unique();
      hasKudos = Boolean(kudos);
    }

    const comments = await ctx.db
      .query("runClubComments")
      .withIndex("by_activityId_and_createdAt", (q) =>
        q.eq("activityId", activity._id),
      )
      .order("asc")
      .take(COMMENT_LIMIT);

    return {
      ...activity,
      kudosCount: activity.kudosCount ?? 0,
      commentCount: activity.commentCount ?? comments.length,
      activityType: activity.activityType ?? "walk",
      title: activity.title ?? `${activity.displayName}'s activity`,
      hasKudos,
      comments,
    };
  },
});

export const toggleKudos = mutation({
  args: {
    activityId: v.id("runClubActivities"),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = normalizeClientId(args.clientId);
    if (!clientId) throw new Error("Join the club first.");

    const activity = await ctx.db.get("runClubActivities", args.activityId);
    if (!activity) throw new Error("Activity not found.");

    const existing = await ctx.db
      .query("runClubKudos")
      .withIndex("by_activityId_and_clientId", (q) =>
        q.eq("activityId", args.activityId).eq("clientId", clientId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete("runClubKudos", existing._id);
      await ctx.db.patch("runClubActivities", args.activityId, {
        kudosCount: Math.max(0, (activity.kudosCount ?? 0) - 1),
      });
      return { hasKudos: false };
    }

    await ctx.db.insert("runClubKudos", {
      activityId: args.activityId,
      clientId,
      createdAt: Date.now(),
    });
    await ctx.db.patch("runClubActivities", args.activityId, {
      kudosCount: (activity.kudosCount ?? 0) + 1,
    });
    return { hasKudos: true };
  },
});

export const addComment = mutation({
  args: {
    activityId: v.id("runClubActivities"),
    clientId: v.string(),
    displayName: v.string(),
    avatarHue: v.number(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = normalizeClientId(args.clientId);
    const displayName = normalizeDisplayName(args.displayName);
    const body = normalizeComment(args.body);
    if (!clientId || !displayName) throw new Error("Join the club first.");
    if (!body) throw new Error("Comment is empty.");

    const activity = await ctx.db.get("runClubActivities", args.activityId);
    if (!activity) throw new Error("Activity not found.");

    const commentId = await ctx.db.insert("runClubComments", {
      activityId: args.activityId,
      clientId,
      displayName,
      avatarHue: args.avatarHue,
      body,
      createdAt: Date.now(),
    });

    await ctx.db.patch("runClubActivities", args.activityId, {
      commentCount: (activity.commentCount ?? 0) + 1,
    });

    return commentId;
  },
});

export const setRsvp = mutation({
  args: {
    sessionId: v.id("runClubSessions"),
    clientId: v.string(),
    displayName: v.string(),
    avatarHue: v.number(),
    status: rsvpStatusValidator,
  },
  handler: async (ctx, args) => {
    const clientId = normalizeClientId(args.clientId);
    const displayName = normalizeDisplayName(args.displayName);
    if (!clientId || !displayName) throw new Error("Join the club first.");

    const session = await ctx.db.get("runClubSessions", args.sessionId);
    if (!session) throw new Error("Meetup not found.");

    const now = Date.now();
    const existing = await ctx.db
      .query("runClubRsvps")
      .withIndex("by_sessionId_and_clientId", (q) =>
        q.eq("sessionId", args.sessionId).eq("clientId", clientId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch("runClubRsvps", existing._id, {
        displayName,
        avatarHue: args.avatarHue,
        status: args.status,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("runClubRsvps", {
      sessionId: args.sessionId,
      clientId,
      displayName,
      avatarHue: args.avatarHue,
      status: args.status,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listRsvps = query({
  args: {
    sessionId: v.id("runClubSessions"),
    clientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewerId = normalizeClientId(args.clientId ?? "");
    const rows = await ctx.db
      .query("runClubRsvps")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .take(RSVP_LIST_LIMIT);

    const going = rows.filter((row) => row.status === "going");
    const maybe = rows.filter((row) => row.status === "maybe");
    const declined = rows.filter((row) => row.status === "declined");
    const mine = viewerId
      ? rows.find((row) => row.clientId === viewerId)?.status ?? null
      : null;

    return {
      going,
      maybe,
      declined,
      counts: {
        going: going.length,
        maybe: maybe.length,
        declined: declined.length,
      },
      mine,
    };
  },
});

export const getProfileCalendar = query({
  args: {
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = normalizeClientId(args.clientId);
    if (!clientId) return [];

    const recent = await ctx.db
      .query("runClubActivities")
      .withIndex("by_clientId_and_createdAt", (q) => q.eq("clientId", clientId))
      .order("desc")
      .take(90);

    const byDay = new Map<string, { dayKey: string; distanceMeters: number; count: number }>();
    for (const activity of recent) {
      const current = byDay.get(activity.dayKey) ?? {
        dayKey: activity.dayKey,
        distanceMeters: 0,
        count: 0,
      };
      current.distanceMeters += activity.distanceMeters;
      current.count += 1;
      byDay.set(activity.dayKey, current);
    }

    return [...byDay.values()];
  },
});
