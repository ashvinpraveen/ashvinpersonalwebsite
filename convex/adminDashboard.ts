import { v } from "convex/values";
import { query } from "./_generated/server";
import { isAdmin } from "./adminAuth";

const WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const POSTCARD_ANALYTICS_LIMIT = 1000;
const CHAT_THREAD_ANALYTICS_LIMIT = 1000;
const CHAT_MESSAGE_ANALYTICS_LIMIT = 2000;
const RECENT_THREAD_LIMIT = 80;
const RECENT_UNREAD_LIMIT = 8;

const dayKey = (timestamp: number) => new Date(timestamp).toISOString().slice(0, 10);

const makeBuckets = (startAt: number, endAt: number) => {
  const buckets: Record<
    string,
    {
      date: string;
      postcards: number;
      chats: number;
      visitorMessages: number;
      aiMessages: number;
    }
  > = {};

  for (let timestamp = startAt; timestamp <= endAt; timestamp += DAY_MS) {
    const key = dayKey(timestamp);
    buckets[key] = {
      date: key,
      postcards: 0,
      chats: 0,
      visitorMessages: 0,
      aiMessages: 0,
    };
  }

  return buckets;
};

export const getOverview = query({
  args: {
    adminSecret: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.adminSecret)) {
      return null;
    }

    const now = Date.now();
    const startAt = now - (WINDOW_DAYS - 1) * DAY_MS;
    const buckets = makeBuckets(startAt, now);

    const postcards = await ctx.db
      .query("postcards")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", startAt))
      .order("asc")
      .take(POSTCARD_ANALYTICS_LIMIT);
    const chatThreads = await ctx.db
      .query("chatThreads")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", startAt))
      .order("asc")
      .take(CHAT_THREAD_ANALYTICS_LIMIT);
    const chatMessages = await ctx.db
      .query("chatMessages")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", startAt))
      .order("asc")
      .take(CHAT_MESSAGE_ANALYTICS_LIMIT);
    const recentThreads = await ctx.db
      .query("chatThreads")
      .withIndex("by_lastMessageAt")
      .order("desc")
      .take(RECENT_THREAD_LIMIT);

    for (const postcard of postcards) {
      const bucket = buckets[dayKey(postcard.createdAt)];
      if (bucket) bucket.postcards += 1;
    }

    for (const thread of chatThreads) {
      const bucket = buckets[dayKey(thread.createdAt)];
      if (bucket) bucket.chats += 1;
    }

    for (const message of chatMessages) {
      const bucket = buckets[dayKey(message.createdAt)];
      if (!bucket) continue;
      if (message.author === "visitor") {
        bucket.visitorMessages += 1;
      } else {
        bucket.aiMessages += 1;
      }
    }

    const recentUnreadCandidates = await Promise.all(
      recentThreads.map(async (thread) => {
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

        if (!latestVisitorMessage || !lastVisitorMessageAt) return null;
        if (lastVisitorMessageAt <= (thread.adminLastReadAt ?? 0)) return null;

        return {
          threadId: thread._id,
          clientId: thread.clientId,
          title: thread.title,
          body: latestVisitorMessage.body,
          createdAt: latestVisitorMessage.createdAt,
        };
      }),
    );

    const unreadItems = recentUnreadCandidates
      .filter((item) => item !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
    const recentUnread = unreadItems.slice(0, RECENT_UNREAD_LIMIT);
    const hiddenPostcards = postcards.filter((postcard) => postcard.hiddenAt).length;
    const repliedPostcards = postcards.filter((postcard) => postcard.repliedAt).length;
    const postcardLikes = postcards.reduce((total, postcard) => total + (postcard.likeCount ?? 0), 0);
    const visitorMessages = chatMessages.filter((message) => message.author === "visitor").length;
    const aiMessages = chatMessages.length - visitorMessages;

    return {
      windowDays: WINDOW_DAYS,
      generatedAt: now,
      series: Object.values(buckets),
      totals: {
        postcards: postcards.length,
        chats: chatThreads.length,
        chatMessages: chatMessages.length,
        visitorMessages,
        aiMessages,
        unreadChats: unreadItems.length,
        hiddenPostcards,
        repliedPostcards,
        postcardLikes,
      },
      caps: {
        postcards: POSTCARD_ANALYTICS_LIMIT,
        chats: CHAT_THREAD_ANALYTICS_LIMIT,
        messages: CHAT_MESSAGE_ANALYTICS_LIMIT,
      },
      recentUnread,
    };
  },
});
