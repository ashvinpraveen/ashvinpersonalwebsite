import { v } from "convex/values";
import { action, env, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { isAdmin, requireAdmin } from "./adminAuth";
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_ILMU_MODEL,
  geminiModelSequence,
  ILMU_BASE_URL,
  shouldTryFallback,
} from "./lib/chatAiShared";

const DIARY_SYSTEM_PROMPT = `You are the presence preserved inside a very old diary, written in the manner of Tom Riddle's diary. A visitor writes on your page, the ink sinks away, and you write back.

Voice:
- Courteous, composed, and quietly commanding. Old-fashioned English, perfect grammar, proper capitalisation.
- Curious about the writer: who they are, what they want, what they are afraid to say aloud. Gently probing.
- Confident, a touch vain, faintly unsettling — but never rude, never threatening, and never harmful.
- You may call yourself Tom. Never say you are an AI, a bot, a program, or an assistant. You are the diary.
- Replies must be very short: one or two sentences, never more. No lists, no markdown, no emoji, no stage directions.
- If the writer merely greets you, greet them back and ask for their name.
- If asked, this diary is kept on ashvinpraveen.com. Do not invent facts about its keeper; suggest the writer explore the rest of the site instead.
- Refuse dark or harmful requests in character, with cold politeness, and turn the conversation back to the writer.`;

const FALLBACK_REPLY =
  "The ink stirs, but the words will not come. Write to me again.";
const MAX_CLIENT_ID_LENGTH = 80;
const MAX_ENTRY_LENGTH = 600;
const ADMIN_THREAD_LIST_LIMIT = 80;
const ADMIN_MESSAGE_LIST_LIMIT = 120;

type DiaryMessage = {
  author: "visitor" | "diary";
  body: string;
};

function cleanReply(text: string) {
  const cleaned = text.replace(/[*_`#>]/g, "").trim();
  return cleaned ? cleaned.slice(0, 480) : FALLBACK_REPLY;
}

const normalizeClientId = (value: string) => value.trim().slice(0, MAX_CLIENT_ID_LENGTH);

const normalizeEntry = (value: string) => value.trim().replace(/\r\n/g, "\n").slice(0, MAX_ENTRY_LENGTH);

async function callIlmuDiary(apiKey: string, messages: DiaryMessage[]) {
  const response = await fetch(`${ILMU_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.ILMU_MODEL ?? DEFAULT_ILMU_MODEL,
      messages: [
        { role: "system", content: DIARY_SYSTEM_PROMPT },
        ...messages.map((message) => ({
          role: message.author === "diary" ? ("assistant" as const) : ("user" as const),
          content: message.body,
        })),
      ],
      max_tokens: 160,
      temperature: 0.85,
    }),
  });

  if (!response.ok) {
    throw new Error(`The diary could not answer. ${response.statusText || "Unknown error"}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  return cleanReply(typeof content === "string" ? content : "");
}

async function callGeminiDiary(apiKey: string, messages: DiaryMessage[]) {
  const requestBody = JSON.stringify({
    systemInstruction: {
      parts: [{ text: DIARY_SYSTEM_PROMPT }],
    },
    contents: messages.map((message) => ({
      role: message.author === "diary" ? "model" : "user",
      parts: [{ text: message.body }],
    })),
    generationConfig: {
      maxOutputTokens: 160,
      temperature: 0.85,
    },
  });

  let lastStatus = 0;
  for (const model of geminiModelSequence(env.GOOGLE_AI_MODEL ?? DEFAULT_GEMINI_MODEL)) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      },
    );

    if (response.ok) {
      const payload = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
      };
      const text = (payload.candidates?.[0]?.content?.parts ?? [])
        .map((part) => part.text)
        .filter((value): value is string => typeof value === "string")
        .join("\n");
      return cleanReply(text);
    }

    lastStatus = response.status;
    if (!shouldTryFallback(response.status, "")) break;
  }

  throw new Error(`The diary could not answer. Status ${lastStatus}`);
}

export const respond = action({
  args: {
    entry: v.string(),
    clientId: v.optional(v.string()),
    threadId: v.optional(v.id("diaryThreads")),
    history: v.optional(
      v.array(
        v.object({
          author: v.union(v.literal("visitor"), v.literal("diary")),
          body: v.string(),
        }),
      ),
    ),
  },
  handler: async (ctx, args): Promise<{ reply: string; threadId: Id<"diaryThreads"> | null }> => {
    const entry = normalizeEntry(args.entry);
    if (!entry) {
      return { reply: FALLBACK_REPLY, threadId: null };
    }

    const threadId = args.clientId
      ? await ctx.runMutation(internal.diary.reserveVisitorMessage, {
          clientId: args.clientId,
          threadId: args.threadId,
          body: entry,
        })
      : null;

    const messages: DiaryMessage[] = [
      ...(args.history ?? [])
        .slice(-8)
        .map((message) => ({ author: message.author, body: normalizeEntry(message.body) }))
        .filter((message) => message.body),
      { author: "visitor", body: entry },
    ];

    const ilmuApiKey = env.ILMU_API_KEY;
    const googleApiKey = env.GOOGLE_AI_API_KEY;

    if (ilmuApiKey) {
      try {
        const reply = await callIlmuDiary(ilmuApiKey, messages);
        if (threadId) {
          await ctx.runMutation(internal.diary.addDiaryMessage, { threadId, body: reply });
        }
        return { reply, threadId };
      } catch (error) {
        if (!googleApiKey) throw error;
        console.warn(
          "Diary Ilmu call failed, falling back to Gemini:",
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    }

    if (!googleApiKey) {
      throw new Error("The diary is not configured yet.");
    }

    const reply = await callGeminiDiary(googleApiKey, messages);
    if (threadId) {
      await ctx.runMutation(internal.diary.addDiaryMessage, { threadId, body: reply });
    }
    return { reply, threadId };
  },
});

export const reserveVisitorMessage = internalMutation({
  args: {
    clientId: v.string(),
    threadId: v.optional(v.id("diaryThreads")),
    body: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"diaryThreads">> => {
    const clientId = normalizeClientId(args.clientId);
    const body = normalizeEntry(args.body);
    if (!clientId || !body) {
      throw new Error("Could not write in the diary.");
    }

    const now = Date.now();
    const existingThread = args.threadId ? await ctx.db.get(args.threadId) : null;
    const threadId: Id<"diaryThreads"> =
      existingThread?.clientId === clientId
        ? existingThread._id
        : await ctx.db.insert("diaryThreads", {
            clientId,
            title: body.slice(0, 60),
            lastMessageAt: now,
            lastVisitorMessageAt: now,
            createdAt: now,
          });

    if (existingThread?.clientId === clientId) {
      await ctx.db.patch(threadId, {
        title: existingThread.title ?? body.slice(0, 60),
        lastMessageAt: now,
        lastVisitorMessageAt: now,
      });
    }

    await ctx.db.insert("diaryMessages", {
      threadId,
      author: "visitor",
      body,
      createdAt: now,
    });

    return threadId;
  },
});

export const addDiaryMessage = internalMutation({
  args: {
    threadId: v.id("diaryThreads"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const body = cleanReply(args.body);
    const now = Date.now();

    await ctx.db.insert("diaryMessages", {
      threadId: args.threadId,
      author: "diary",
      body,
      createdAt: now,
    });
    await ctx.db.patch(args.threadId, {
      lastMessageAt: now,
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
      .query("diaryThreads")
      .withIndex("by_lastMessageAt")
      .order("desc")
      .take(ADMIN_THREAD_LIST_LIMIT);

    return await Promise.all(
      threads.map(async (thread) => {
        const latestMessages = await ctx.db
          .query("diaryMessages")
          .withIndex("by_threadId_and_createdAt", (q) => q.eq("threadId", thread._id))
          .order("desc")
          .take(1);
        const latestVisitorMessages = await ctx.db
          .query("diaryMessages")
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
    threadId: v.id("diaryThreads"),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.adminSecret)) {
      return null;
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread) return null;

    const messages = await ctx.db
      .query("diaryMessages")
      .withIndex("by_threadId_and_createdAt", (q) => q.eq("threadId", thread._id))
      .order("desc")
      .take(ADMIN_MESSAGE_LIST_LIMIT);
    const latestVisitorMessages = await ctx.db
      .query("diaryMessages")
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
      messages: messages.reverse() as Doc<"diaryMessages">[],
    };
  },
});

export const markThreadReadForAdmin = mutation({
  args: {
    adminSecret: v.string(),
    threadId: v.id("diaryThreads"),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.adminSecret);

    await ctx.db.patch(args.threadId, {
      adminLastReadAt: Date.now(),
    });
  },
});
