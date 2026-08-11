import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 6;
const SUNO_API_BASE = "https://api.sunoapi.org";

const drumPatternValidator = v.union(
  v.literal("none"),
  v.literal("fourFloor"),
  v.literal("softPop"),
  v.literal("rockBasic"),
  v.literal("boomBap"),
);

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function requireSiteUrl() {
  const siteUrl = env("CONVEX_SITE_URL") || env("NEXT_PUBLIC_CONVEX_SITE_URL");
  if (!siteUrl) {
    throw new Error("CONVEX_SITE_URL is not configured for Suno callbacks.");
  }
  return siteUrl.replace(/\/$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

export const isPolishConfigured = query({
  args: {},
  handler: async () => {
    return Boolean(env("SUNO_API_KEY"));
  },
});

export const getTrack = query({
  args: {
    trackId: v.id("musicTracks"),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const track = await ctx.db.get(args.trackId);
    if (!track || track.clientId !== args.clientId) return null;
    return {
      _id: track._id,
      status: track.status,
      title: track.title,
      stylePrompt: track.stylePrompt,
      audioUrl: track.audioUrl ?? null,
      streamAudioUrl: track.streamAudioUrl ?? null,
      imageUrl: track.imageUrl ?? null,
      errorMessage: track.errorMessage ?? null,
      createdAt: track.createdAt,
    };
  },
});

export const listRecent = query({
  args: {
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const tracks = await ctx.db
      .query("musicTracks")
      .withIndex("by_clientId_and_createdAt", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .take(8);

    return tracks.map((track) => ({
      _id: track._id,
      status: track.status,
      title: track.title,
      stylePrompt: track.stylePrompt,
      audioUrl: track.audioUrl ?? null,
      streamAudioUrl: track.streamAudioUrl ?? null,
      imageUrl: track.imageUrl ?? null,
      errorMessage: track.errorMessage ?? null,
      createdAt: track.createdAt,
    }));
  },
});

export const createQueuedTrack = internalMutation({
  args: {
    clientId: v.string(),
    title: v.string(),
    stylePrompt: v.string(),
    tempoBpm: v.number(),
    key: v.string(),
    progression: v.string(),
    drumPatternId: drumPatternValidator,
    bars: v.number(),
    hasMicTake: v.boolean(),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.clientId.trim()) {
      throw new Error("Missing client id.");
    }
    if (!env("SUNO_API_KEY")) {
      throw new Error("Suno polish is not configured. Set SUNO_API_KEY in Convex.");
    }

    const now = Date.now();
    const rateLimitKey = `music:${args.clientId}`;
    const rateLimit = await ctx.db
      .query("musicRateLimits")
      .withIndex("by_key", (q) => q.eq("key", rateLimitKey))
      .unique();

    if (rateLimit && now - rateLimit.windowStart < RATE_LIMIT_WINDOW_MS) {
      if (rateLimit.count >= RATE_LIMIT_MAX) {
        throw new Error("Polish limit reached. Try again in a bit.");
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
      await ctx.db.insert("musicRateLimits", {
        key: rateLimitKey,
        windowStart: now,
        count: 1,
        updatedAt: now,
      });
    }

    return await ctx.db.insert("musicTracks", {
      clientId: args.clientId,
      status: "queued",
      title: args.title.slice(0, 100),
      stylePrompt: args.stylePrompt.slice(0, 1000),
      tempoBpm: args.tempoBpm,
      key: args.key,
      progression: args.progression,
      drumPatternId: args.drumPatternId,
      bars: args.bars,
      hasMicTake: args.hasMicTake,
      notes: args.notes.slice(0, 400),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const markGenerating = internalMutation({
  args: {
    trackId: v.id("musicTracks"),
    sunoTaskId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.trackId, {
      status: "generating",
      sunoTaskId: args.sunoTaskId,
      updatedAt: Date.now(),
    });
  },
});

export const markFailed = internalMutation({
  args: {
    trackId: v.id("musicTracks"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.trackId, {
      status: "failed",
      errorMessage: args.errorMessage.slice(0, 500),
      updatedAt: Date.now(),
    });
  },
});

export const applySunoResult = internalMutation({
  args: {
    sunoTaskId: v.string(),
    status: v.union(v.literal("generating"), v.literal("ready"), v.literal("failed")),
    audioUrl: v.optional(v.string()),
    streamAudioUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const track = await ctx.db
      .query("musicTracks")
      .withIndex("by_sunoTaskId", (q) => q.eq("sunoTaskId", args.sunoTaskId))
      .unique();
    if (!track) return null;

    await ctx.db.patch(track._id, {
      status: args.status,
      audioUrl: args.audioUrl ?? track.audioUrl,
      streamAudioUrl: args.streamAudioUrl ?? track.streamAudioUrl,
      imageUrl: args.imageUrl ?? track.imageUrl,
      errorMessage: args.errorMessage ?? track.errorMessage,
      updatedAt: Date.now(),
    });
    return track._id;
  },
});

export const getTrackInternal = internalQuery({
  args: { trackId: v.id("musicTracks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.trackId);
  },
});

export const polish = action({
  args: {
    clientId: v.string(),
    title: v.string(),
    stylePrompt: v.string(),
    tempoBpm: v.number(),
    key: v.string(),
    progression: v.string(),
    drumPatternId: drumPatternValidator,
    bars: v.number(),
    hasMicTake: v.boolean(),
    notes: v.string(),
  },
  handler: async (ctx, args): Promise<{ trackId: Id<"musicTracks"> }> => {
    const apiKey = env("SUNO_API_KEY");
    if (!apiKey) {
      throw new Error("Suno polish is not configured. Set SUNO_API_KEY in Convex.");
    }

    const trackId: Id<"musicTracks"> = await ctx.runMutation(
      internal.music.createQueuedTrack,
      args,
    );
    const callBackUrl = `${requireSiteUrl()}/music/suno-callback`;

    try {
      const response = await fetch(`${SUNO_API_BASE}/api/v1/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customMode: true,
          instrumental: true,
          model: env("SUNO_MODEL") || "V4_5ALL",
          style: args.stylePrompt.slice(0, 1000),
          title: args.title.slice(0, 80),
          callBackUrl,
          negativeTags: "vocals, lyrics, singing, rap, voice",
        }),
      });

      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const detail =
          (isRecord(payload) && asString(payload.msg)) ||
          (isRecord(payload) && asString(payload.message)) ||
          `Suno request failed (${response.status})`;
        await ctx.runMutation(internal.music.markFailed, {
          trackId,
          errorMessage: detail,
        });
        throw new Error(detail);
      }

      const data = isRecord(payload) ? payload.data : null;
      const taskId =
        (isRecord(data) && asString(data.taskId)) ||
        (isRecord(payload) && asString(payload.taskId));

      if (!taskId) {
        await ctx.runMutation(internal.music.markFailed, {
          trackId,
          errorMessage: "Suno did not return a task id.",
        });
        throw new Error("Suno did not return a task id.");
      }

      await ctx.runMutation(internal.music.markGenerating, {
        trackId,
        sunoTaskId: taskId,
      });

      return { trackId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Polish failed.";
      const track = await ctx.runQuery(internal.music.getTrackInternal, { trackId });
      if (track && track.status !== "failed") {
        await ctx.runMutation(internal.music.markFailed, {
          trackId,
          errorMessage: message,
        });
      }
      throw error instanceof Error ? error : new Error(message);
    }
  },
});

export const refreshFromSuno = action({
  args: {
    trackId: v.id("musicTracks"),
    clientId: v.string(),
  },
  handler: async (ctx, args): Promise<{ status: string }> => {
    const apiKey = env("SUNO_API_KEY");
    if (!apiKey) {
      throw new Error("Suno polish is not configured.");
    }

    const track = await ctx.runQuery(internal.music.getTrackInternal, {
      trackId: args.trackId,
    });
    if (!track || track.clientId !== args.clientId) {
      throw new Error("Track not found.");
    }
    if (!track.sunoTaskId) {
      return { status: track.status };
    }
    if (track.status === "ready" || track.status === "failed") {
      return { status: track.status };
    }

    const response = await fetch(
      `${SUNO_API_BASE}/api/v1/generate/record-info?taskId=${encodeURIComponent(track.sunoTaskId)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      return { status: track.status };
    }

    const data = isRecord(payload) ? payload.data : null;
    const statusRaw =
      (isRecord(data) && asString(data.status)) ||
      (isRecord(payload) && asString(payload.status)) ||
      "";

    const sunoTracks =
      (isRecord(data) && Array.isArray(data.response) && data.response) ||
      (isRecord(data) && Array.isArray(data.data) && data.data) ||
      (Array.isArray(data) ? data : []);

    const first = sunoTracks.find((item) => isRecord(item)) as
      | Record<string, unknown>
      | undefined;
    const audioUrl =
      (first && (asString(first.audio_url) || asString(first.audioUrl))) || undefined;
    const streamAudioUrl =
      (first &&
        (asString(first.stream_audio_url) || asString(first.streamAudioUrl))) ||
      undefined;
    const imageUrl =
      (first && (asString(first.image_url) || asString(first.imageUrl))) || undefined;

    const normalized = statusRaw.toLowerCase();
    if (audioUrl || normalized.includes("complete") || normalized.includes("success")) {
      await ctx.runMutation(internal.music.applySunoResult, {
        sunoTaskId: track.sunoTaskId,
        status: "ready",
        audioUrl,
        streamAudioUrl,
        imageUrl,
      });
      return { status: "ready" };
    }

    if (normalized.includes("fail") || normalized.includes("error")) {
      await ctx.runMutation(internal.music.applySunoResult, {
        sunoTaskId: track.sunoTaskId,
        status: "failed",
        errorMessage: "Suno generation failed.",
      });
      return { status: "failed" };
    }

    await ctx.runMutation(internal.music.applySunoResult, {
      sunoTaskId: track.sunoTaskId,
      status: "generating",
      streamAudioUrl,
      imageUrl,
    });
    return { status: "generating" };
  },
});
