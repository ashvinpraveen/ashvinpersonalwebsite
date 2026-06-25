import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

const MAX_CLIENT_ID_LENGTH = 80;
const MAX_MESSAGE_LENGTH = 900;
const MESSAGE_LIST_LIMIT = 80;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_MESSAGES = 10;

const normalizeClientId = (value: string) =>
  value.trim().slice(0, MAX_CLIENT_ID_LENGTH);

const normalizeMessage = (value: string) =>
  value.trim().replace(/\r\n/g, "\n").slice(0, MAX_MESSAGE_LENGTH);

async function findThreadByClientId(
  ctx: QueryCtx,
  clientId: string,
) {
  return await ctx.db
    .query("chatThreads")
    .withIndex("by_clientId", (q) => q.eq("clientId", clientId))
    .unique();
}

export const getForClient = query({
  args: {
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = normalizeClientId(args.clientId);
    if (!clientId) return null;

    const thread = await findThreadByClientId(ctx, clientId);
    if (!thread) return null;

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_threadId_and_createdAt", (q) => q.eq("threadId", thread._id))
      .order("asc")
      .take(MESSAGE_LIST_LIMIT);

    return { thread, messages };
  },
});

export const reserveVisitorMessage = internalMutation({
  args: {
    clientId: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = normalizeClientId(args.clientId);
    if (!clientId) {
      throw new Error("Could not start chat.");
    }

    const body = normalizeMessage(args.body);
    if (!body) {
      throw new Error("Message cannot be empty.");
    }

    const now = Date.now();
    const rateLimitKey = `browser:${clientId}`;
    const rateLimit = await ctx.db
      .query("chatRateLimits")
      .withIndex("by_key", (q) => q.eq("key", rateLimitKey))
      .unique();

    if (rateLimit && now - rateLimit.windowStart < RATE_LIMIT_WINDOW_MS) {
      if (rateLimit.count >= RATE_LIMIT_MAX_MESSAGES) {
        const retryAt = rateLimit.windowStart + RATE_LIMIT_WINDOW_MS;
        throw new Error(
          `AI Ashvin is taking a breather. Try again after ${new Date(retryAt).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}.`,
        );
      }

      await ctx.db.patch(rateLimit._id, {
        count: rateLimit.count + 1,
        updatedAt: now,
      });
    } else if (rateLimit) {
      await ctx.db.patch(rateLimit._id, {
        windowStart: now,
        count: 1,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("chatRateLimits", {
        key: rateLimitKey,
        windowStart: now,
        count: 1,
        updatedAt: now,
      });
    }

    const existingThread = await ctx.db
      .query("chatThreads")
      .withIndex("by_clientId", (q) => q.eq("clientId", clientId))
      .unique();

    const threadId: Id<"chatThreads"> =
      existingThread?._id ??
      (await ctx.db.insert("chatThreads", {
        clientId,
        status: "open",
        lastMessageAt: now,
        createdAt: now,
      }));

    if (existingThread) {
      await ctx.db.patch(threadId, {
        status: "open",
        lastMessageAt: now,
      });
    }

    await ctx.db.insert("chatMessages", {
      threadId,
      author: "visitor",
      body,
      createdAt: now,
    });

    return threadId;
  },
});

export const addAshvinMessage = internalMutation({
  args: {
    threadId: v.id("chatThreads"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const body = normalizeMessage(args.body);
    if (!body) {
      throw new Error("Reply cannot be empty.");
    }

    const now = Date.now();
    await ctx.db.insert("chatMessages", {
      threadId: args.threadId,
      author: "ashvin",
      body,
      createdAt: now,
    });
    await ctx.db.patch(args.threadId, {
      status: "open",
      lastMessageAt: now,
    });
  },
});

export const getRecentMessages = internalQuery({
  args: {
    threadId: v.id("chatThreads"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_threadId_and_createdAt", (q) => q.eq("threadId", args.threadId))
      .order("desc")
      .take(12);

    return messages.reverse() as Doc<"chatMessages">[];
  },
});
