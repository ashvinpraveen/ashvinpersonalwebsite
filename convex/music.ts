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
const ELEVENLABS_API_BASE = "https://api.elevenlabs.io";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function musicLengthMs(bars: number, tempoBpm: number) {
  const safeBars = Math.max(1, Math.min(16, Math.round(bars)));
  const safeTempo = Math.max(60, Math.min(180, Math.round(tempoBpm)));
  const ms = Math.round(safeBars * 4 * (60_000 / safeTempo));
  return Math.min(120_000, Math.max(10_000, ms));
}

function extractBoundary(contentType: string) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  return match?.[1] ?? match?.[2] ?? null;
}

function extractAudioFromMultipart(bytes: ArrayBuffer, contentType: string) {
  const boundary = extractBoundary(contentType);
  if (!boundary) {
    return new Blob([bytes], { type: "audio/mpeg" });
  }

  const text = new TextDecoder().decode(bytes);
  const parts = text.split(`--${boundary}`);
  for (const part of parts) {
    if (!/content-type:\s*audio\//i.test(part)) continue;
    const headerEndCrLf = part.indexOf("\r\n\r\n");
    const headerEndLf = part.indexOf("\n\n");
    const headerEnd =
      headerEndCrLf >= 0
        ? headerEndCrLf + 4
        : headerEndLf >= 0
          ? headerEndLf + 2
          : -1;
    if (headerEnd < 0) continue;

    const full = new Uint8Array(bytes);
    // Re-find the audio body offset in the raw bytes by matching the first
    // audio content-type header occurrence, then the following blank line.
    const headerNeedle = new TextEncoder().encode("Content-Type: audio/");
    const altNeedle = new TextEncoder().encode("content-type: audio/");
    let headerAt = indexOfBytes(full, headerNeedle);
    if (headerAt < 0) headerAt = indexOfBytes(full, altNeedle);
    if (headerAt < 0) continue;

    const afterHeader = full.subarray(headerAt);
    const sepCrLf = indexOfBytes(afterHeader, new TextEncoder().encode("\r\n\r\n"));
    const sepLf = indexOfBytes(afterHeader, new TextEncoder().encode("\n\n"));
    const sep =
      sepCrLf >= 0 ? { at: sepCrLf, len: 4 } : sepLf >= 0 ? { at: sepLf, len: 2 } : null;
    if (!sep) continue;

    const bodyStart = headerAt + sep.at + sep.len;
    const closing = new TextEncoder().encode(`\r\n--${boundary}`);
    let bodyEnd = indexOfBytes(full.subarray(bodyStart), closing);
    if (bodyEnd < 0) {
      const closingLf = new TextEncoder().encode(`\n--${boundary}`);
      bodyEnd = indexOfBytes(full.subarray(bodyStart), closingLf);
    }
    const audioBytes =
      bodyEnd >= 0
        ? full.subarray(bodyStart, bodyStart + bodyEnd)
        : full.subarray(bodyStart);

    const typeMatch = /content-type:\s*([^\r\n;]+)/i.exec(part);
    return new Blob([audioBytes], {
      type: typeMatch?.[1]?.trim() || "audio/mpeg",
    });
  }

  return new Blob([bytes], { type: "audio/mpeg" });
}

function indexOfBytes(haystack: Uint8Array, needle: Uint8Array) {
  outer: for (let i = 0; i <= haystack.length - needle.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

async function trackAudioUrl(
  ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  track: {
    storageId?: Id<"_storage">;
    audioUrl?: string;
    streamAudioUrl?: string;
  },
) {
  if (track.storageId) {
    return (await ctx.storage.getUrl(track.storageId)) ?? null;
  }
  return track.audioUrl ?? track.streamAudioUrl ?? null;
}

export const isPolishConfigured = query({
  args: {},
  handler: async () => {
    return Boolean(env("ELEVENLABS_API_KEY"));
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
    const audioUrl = await trackAudioUrl(ctx, track);
    return {
      _id: track._id,
      status: track.status,
      title: track.title,
      stylePrompt: track.stylePrompt,
      audioUrl,
      streamAudioUrl: audioUrl,
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

    return await Promise.all(
      tracks.map(async (track) => {
        const audioUrl = await trackAudioUrl(ctx, track);
        return {
          _id: track._id,
          status: track.status,
          title: track.title,
          stylePrompt: track.stylePrompt,
          audioUrl,
          streamAudioUrl: audioUrl,
          imageUrl: track.imageUrl ?? null,
          errorMessage: track.errorMessage ?? null,
          createdAt: track.createdAt,
        };
      }),
    );
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
    if (!env("ELEVENLABS_API_KEY")) {
      throw new Error(
        "ElevenLabs polish is not configured. Set ELEVENLABS_API_KEY in Convex.",
      );
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
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.trackId, {
      status: "generating",
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

export const markReady = internalMutation({
  args: {
    trackId: v.id("musicTracks"),
    storageId: v.id("_storage"),
    providerSongId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.trackId, {
      status: "ready",
      storageId: args.storageId,
      providerSongId: args.providerSongId,
      errorMessage: undefined,
      updatedAt: Date.now(),
    });
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
  handler: async (ctx, args): Promise<{ trackId: Id<"musicTracks">; audioUrl: string | null }> => {
    const apiKey = env("ELEVENLABS_API_KEY");
    if (!apiKey) {
      throw new Error(
        "ElevenLabs polish is not configured. Set ELEVENLABS_API_KEY in Convex.",
      );
    }

    const trackId: Id<"musicTracks"> = await ctx.runMutation(
      internal.music.createQueuedTrack,
      args,
    );

    await ctx.runMutation(internal.music.markGenerating, { trackId });

    const lengthMs = musicLengthMs(args.bars, args.tempoBpm);
    const modelId = env("ELEVENLABS_MUSIC_MODEL") || "music_v2";
    const prompt = [
      args.stylePrompt.slice(0, 900),
      "seamless loopable instrumental backing track",
      "no vocals, no lyrics, no singing",
    ].join(", ");

    try {
      const response = await fetch(
        `${ELEVENLABS_API_BASE}/v1/music?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg, application/octet-stream, multipart/mixed",
          },
          body: JSON.stringify({
            prompt,
            music_length_ms: lengthMs,
            model_id: modelId,
            force_instrumental: true,
          }),
        },
      );

      if (!response.ok) {
        let detail = `ElevenLabs request failed (${response.status})`;
        try {
          const payload: unknown = await response.json();
          detail =
            (isRecord(payload) && asString(payload.detail)) ||
            (isRecord(payload) &&
              isRecord(payload.detail) &&
              asString(payload.detail.message)) ||
            (isRecord(payload) && asString(payload.message)) ||
            detail;
        } catch {
          const text = await response.text().catch(() => "");
          if (text) detail = text.slice(0, 300);
        }
        await ctx.runMutation(internal.music.markFailed, {
          trackId,
          errorMessage: detail,
        });
        throw new Error(detail);
      }

      const contentType = response.headers.get("content-type") || "audio/mpeg";
      const providerSongId =
        response.headers.get("song-id") ||
        response.headers.get("Song-Id") ||
        undefined;

      let audioBlob: Blob;
      if (contentType.includes("multipart")) {
        const bytes = await response.arrayBuffer();
        audioBlob = extractAudioFromMultipart(bytes, contentType);
      } else {
        audioBlob = await response.blob();
      }

      if (audioBlob.size < 1000) {
        await ctx.runMutation(internal.music.markFailed, {
          trackId,
          errorMessage: "ElevenLabs returned empty audio.",
        });
        throw new Error("ElevenLabs returned empty audio.");
      }

      const storageId = await ctx.storage.store(
        new Blob([audioBlob], { type: audioBlob.type || "audio/mpeg" }),
      );

      await ctx.runMutation(internal.music.markReady, {
        trackId,
        storageId,
        providerSongId,
      });

      const audioUrl = await ctx.storage.getUrl(storageId);
      return { trackId, audioUrl };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Polish failed.";
      const track = await ctx.runQuery(internal.music.getTrackInternal, { trackId });
      if (track && track.status !== "failed" && track.status !== "ready") {
        await ctx.runMutation(internal.music.markFailed, {
          trackId,
          errorMessage: message,
        });
      }
      throw error instanceof Error ? error : new Error(message);
    }
  },
});
