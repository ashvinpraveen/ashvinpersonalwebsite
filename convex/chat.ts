import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { isAdmin, requireAdmin } from "./adminAuth";

const MAX_CLIENT_ID_LENGTH = 80;
const MAX_MESSAGE_LENGTH = 900;
const MESSAGE_LIST_LIMIT = 80;
const THREAD_LIST_LIMIT = 12;
const ADMIN_THREAD_LIST_LIMIT = 80;
const ADMIN_MESSAGE_LIST_LIMIT = 120;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_MESSAGES = 10;

const normalizeClientId = (value: string) =>
  value.trim().slice(0, MAX_CLIENT_ID_LENGTH);

const normalizeMessage = (value: string) =>
  value.trim().replace(/\r\n/g, "\n").slice(0, MAX_MESSAGE_LENGTH);

export const getForClient = query({
  args: {
    clientId: v.string(),
    threadId: v.optional(v.id("chatThreads")),
  },
  handler: async (ctx, args) => {
    const clientId = normalizeClientId(args.clientId);
    if (!clientId) return null;

    const threads = await ctx.db
      .query("chatThreads")
      .withIndex("by_clientId_and_lastMessageAt", (q) => q.eq("clientId", clientId))
      .order("desc")
      .take(THREAD_LIST_LIMIT);

    const requestedThread = args.threadId ? await ctx.db.get(args.threadId) : null;
    const thread =
      requestedThread?.clientId === clientId
        ? requestedThread
        : threads[0] ?? null;
    if (!thread) return { thread: null, threads, messages: [] };

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_threadId_and_createdAt", (q) => q.eq("threadId", thread._id))
      .order("asc")
      .take(MESSAGE_LIST_LIMIT);

    return { thread, threads, messages };
  },
});

export const startNewForClient = mutation({
  args: {
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = normalizeClientId(args.clientId);
    if (!clientId) {
      throw new Error("Could not start chat.");
    }

    const now = Date.now();
    return await ctx.db.insert("chatThreads", {
      clientId,
      status: "open",
      lastMessageAt: now,
      createdAt: now,
    });
  },
});

export const setAgentThreadId = internalMutation({
  args: {
    threadId: v.id("chatThreads"),
    agentThreadId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, {
      agentThreadId: args.agentThreadId,
    });
  },
});

export const listForAdmin = query({
  args: {
    adminSecret: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.adminSecret)) {
      return null;
    }

    const threads = await ctx.db
      .query("chatThreads")
      .withIndex("by_lastMessageAt")
      .order("desc")
      .take(ADMIN_THREAD_LIST_LIMIT);

    return await Promise.all(
      threads.map(async (thread) => {
        const latestMessages = await ctx.db
          .query("chatMessages")
          .withIndex("by_threadId_and_createdAt", (q) => q.eq("threadId", thread._id))
          .order("desc")
          .take(1);
        const latestVisitorMessages = await ctx.db
          .query("chatMessages")
          .withIndex("by_threadId_and_author_and_createdAt", (q) =>
            q.eq("threadId", thread._id).eq("author", "visitor"),
          )
          .order("desc")
          .take(1);
        const latestMessage = latestMessages[0] ?? null;
        const latestVisitorMessage = latestVisitorMessages[0] ?? null;
        const lastVisitorMessageAt =
          thread.lastVisitorMessageAt ?? latestVisitorMessage?.createdAt ?? null;

        return {
          ...thread,
          latestMessage,
          lastVisitorMessageAt,
          unread: Boolean(
            lastVisitorMessageAt && lastVisitorMessageAt > (thread.adminLastReadAt ?? 0),
          ),
        };
      }),
    );
  },
});

export const getThreadForAdmin = query({
  args: {
    adminSecret: v.string(),
    threadId: v.id("chatThreads"),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.adminSecret)) {
      return null;
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread) return null;

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_threadId_and_createdAt", (q) => q.eq("threadId", thread._id))
      .order("desc")
      .take(ADMIN_MESSAGE_LIST_LIMIT);
    const latestVisitorMessages = await ctx.db
      .query("chatMessages")
      .withIndex("by_threadId_and_author_and_createdAt", (q) =>
        q.eq("threadId", thread._id).eq("author", "visitor"),
      )
      .order("desc")
      .take(1);
    const latestVisitorMessage = latestVisitorMessages[0] ?? null;
    const lastVisitorMessageAt =
      thread.lastVisitorMessageAt ?? latestVisitorMessage?.createdAt ?? null;

    return {
      thread: {
        ...thread,
        lastVisitorMessageAt,
        unread: Boolean(
          lastVisitorMessageAt && lastVisitorMessageAt > (thread.adminLastReadAt ?? 0),
        ),
      },
      messages: messages.reverse() as Doc<"chatMessages">[],
    };
  },
});

export const markThreadReadForAdmin = mutation({
  args: {
    adminSecret: v.string(),
    threadId: v.id("chatThreads"),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.adminSecret);

    await ctx.db.patch(args.threadId, {
      adminLastReadAt: Date.now(),
    });
  },
});

export const reserveVisitorMessage = internalMutation({
  args: {
    clientId: v.string(),
    threadId: v.optional(v.id("chatThreads")),
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

    const existingThread = args.threadId ? await ctx.db.get(args.threadId) : null;

    const threadId: Id<"chatThreads"> =
      existingThread?.clientId === clientId
        ? existingThread._id
        : await ctx.db.insert("chatThreads", {
            clientId,
            status: "open",
            title: body.slice(0, 60),
            lastMessageAt: now,
            lastVisitorMessageAt: now,
            createdAt: now,
          });

    if (existingThread?.clientId === clientId) {
      await ctx.db.patch(threadId, {
        status: "open",
        title: existingThread.title ?? body.slice(0, 60),
        lastMessageAt: now,
        lastVisitorMessageAt: now,
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

export const getThreadForAgent = internalQuery({
  args: {
    threadId: v.id("chatThreads"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.threadId);
  },
});
