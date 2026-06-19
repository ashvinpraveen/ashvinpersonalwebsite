import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
});
