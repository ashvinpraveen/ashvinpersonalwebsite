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
    lastMessageAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_clientId", ["clientId"])
    .index("by_status_and_lastMessageAt", ["status", "lastMessageAt"]),
  chatMessages: defineTable({
    threadId: v.id("chatThreads"),
    author: v.union(v.literal("visitor"), v.literal("ashvin")),
    body: v.string(),
    createdAt: v.number(),
  })
    .index("by_threadId_and_createdAt", ["threadId", "createdAt"])
    .index("by_createdAt", ["createdAt"]),
  chatRateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
