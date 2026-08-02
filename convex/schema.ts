import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  articleViews: defineTable({
    articleId: v.string(),
    views: v.number(),
  }).index("by_articleId", ["articleId"]),
  postcards: defineTable({
    name: v.string(),
    location: v.string(),
    message: v.string(),
    drawingDataUrl: v.union(v.string(), v.null()),
    clientId: v.optional(v.string()),
    reply: v.optional(v.string()),
    repliedAt: v.optional(v.number()),
    hiddenAt: v.optional(v.number()),
    likeCount: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
  postcardLikes: defineTable({
    postcardId: v.id("postcards"),
    clientId: v.string(),
    createdAt: v.number(),
  })
    .index("by_postcardId_and_clientId", ["postcardId", "clientId"])
    .index("by_postcardId", ["postcardId"]),
  chatThreads: defineTable({
    clientId: v.string(),
    status: v.union(v.literal("open"), v.literal("closed")),
    title: v.optional(v.string()),
    agentThreadId: v.optional(v.string()),
    adminLastReadAt: v.optional(v.number()),
    lastMessageAt: v.number(),
    lastVisitorMessageAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_clientId", ["clientId"])
    .index("by_clientId_and_lastMessageAt", ["clientId", "lastMessageAt"])
    .index("by_lastMessageAt", ["lastMessageAt"])
    .index("by_status_and_lastMessageAt", ["status", "lastMessageAt"]),
  chatMessages: defineTable({
    threadId: v.id("chatThreads"),
    author: v.union(v.literal("visitor"), v.literal("ashvin")),
    body: v.string(),
    createdAt: v.number(),
  })
    .index("by_threadId_and_createdAt", ["threadId", "createdAt"])
    .index("by_threadId_and_author_and_createdAt", ["threadId", "author", "createdAt"])
    .index("by_createdAt", ["createdAt"]),
  chatRateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
  diaryThreads: defineTable({
    clientId: v.string(),
    title: v.optional(v.string()),
    adminLastReadAt: v.optional(v.number()),
    lastMessageAt: v.number(),
    lastVisitorMessageAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_clientId_and_lastMessageAt", ["clientId", "lastMessageAt"])
    .index("by_lastMessageAt", ["lastMessageAt"])
    .index("by_createdAt", ["createdAt"]),
  diaryMessages: defineTable({
    threadId: v.id("diaryThreads"),
    author: v.union(v.literal("visitor"), v.literal("diary")),
    body: v.string(),
    createdAt: v.number(),
  })
    .index("by_threadId_and_createdAt", ["threadId", "createdAt"])
    .index("by_threadId_and_author_and_createdAt", ["threadId", "author", "createdAt"])
    .index("by_createdAt", ["createdAt"]),
  runClubMembers: defineTable({
    clientId: v.string(),
    displayName: v.string(),
    avatarHue: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clientId", ["clientId"])
    .index("by_updatedAt", ["updatedAt"]),
  runClubSessions: defineTable({
    title: v.string(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("live"),
      v.literal("ended"),
    ),
    startsAt: v.number(),
    startLabel: v.string(),
    startLat: v.number(),
    startLng: v.number(),
    routeWaypoints: v.array(
      v.object({
        lat: v.number(),
        lng: v.number(),
        label: v.optional(v.string()),
      }),
    ),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_startsAt", ["startsAt"])
    .index("by_status_and_startsAt", ["status", "startsAt"]),
  runClubPresence: defineTable({
    clientId: v.string(),
    sessionId: v.optional(v.id("runClubSessions")),
    displayName: v.string(),
    avatarHue: v.number(),
    lat: v.number(),
    lng: v.number(),
    isTracking: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_clientId", ["clientId"])
    .index("by_updatedAt", ["updatedAt"]),
  runClubActivities: defineTable({
    clientId: v.string(),
    displayName: v.string(),
    avatarHue: v.number(),
    sessionId: v.optional(v.id("runClubSessions")),
    activityType: v.optional(
      v.union(v.literal("run"), v.literal("walk"), v.literal("jog")),
    ),
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
    distanceMeters: v.number(),
    durationMs: v.number(),
    movingDurationMs: v.optional(v.number()),
    path: v.array(
      v.object({
        lat: v.number(),
        lng: v.number(),
      }),
    ),
    splitsMeters: v.optional(v.array(v.number())),
    kudosCount: v.optional(v.number()),
    commentCount: v.optional(v.number()),
    shareSlug: v.string(),
    createdAt: v.number(),
    dayKey: v.string(),
  })
    .index("by_clientId_and_createdAt", ["clientId", "createdAt"])
    .index("by_shareSlug", ["shareSlug"])
    .index("by_createdAt", ["createdAt"]),
  runClubMemberStats: defineTable({
    clientId: v.string(),
    displayName: v.string(),
    avatarHue: v.number(),
    totalDistanceMeters: v.number(),
    totalDurationMs: v.number(),
    activityCount: v.number(),
    streakDays: v.number(),
    lastDayKey: v.optional(v.string()),
    weekDistanceMeters: v.optional(v.number()),
    weekKey: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_clientId", ["clientId"])
    .index("by_totalDistanceMeters", ["totalDistanceMeters"])
    .index("by_weekDistanceMeters", ["weekDistanceMeters"]),
  runClubMessages: defineTable({
    clientId: v.string(),
    displayName: v.string(),
    avatarHue: v.number(),
    body: v.string(),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
  runClubKudos: defineTable({
    activityId: v.id("runClubActivities"),
    clientId: v.string(),
    createdAt: v.number(),
  })
    .index("by_activityId_and_clientId", ["activityId", "clientId"])
    .index("by_activityId", ["activityId"])
    .index("by_clientId_and_createdAt", ["clientId", "createdAt"]),
  runClubComments: defineTable({
    activityId: v.id("runClubActivities"),
    clientId: v.string(),
    displayName: v.string(),
    avatarHue: v.number(),
    body: v.string(),
    createdAt: v.number(),
  })
    .index("by_activityId_and_createdAt", ["activityId", "createdAt"])
    .index("by_createdAt", ["createdAt"]),
  runClubRsvps: defineTable({
    sessionId: v.id("runClubSessions"),
    clientId: v.string(),
    displayName: v.string(),
    avatarHue: v.number(),
    status: v.union(
      v.literal("going"),
      v.literal("maybe"),
      v.literal("declined"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sessionId_and_clientId", ["sessionId", "clientId"])
    .index("by_sessionId", ["sessionId"])
    .index("by_sessionId_and_status", ["sessionId", "status"])
    .index("by_clientId_and_updatedAt", ["clientId", "updatedAt"]),
});
