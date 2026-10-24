import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  MAX_BARS,
  STYLE_IDS,
  buildPolishPrompt,
  buildPolishTitle,
  chordName,
  clampTempo,
  keyName,
  parseChordToken,
  type Chord,
  type StyleId,
} from "./lib/musicTheory";

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io";
/** Each visitor (by browser client id) gets a few takes an hour. */
const CLIENT_WINDOW_MS = 60 * 60 * 1000;
const CLIENT_MAX = 6;
/** Site-wide guard on ElevenLabs spend. Override with MUSIC_POLISH_DAILY_LIMIT. */
const GLOBAL_WINDOW_MS = 24 * 60 * 60 * 1000;
const DEFAULT_GLOBAL_MAX = 60;
/** A generation that hasn't finished in this long is treated as failed. */
const STALE_AFTER_MS = 10 * 60 * 1000;
/** Polish generates a continuous practice take instead of a short seamless loop. */
const POLISH_DURATION_MS = 120_000;
/** Reject tiny payloads; ~2 min mp3 @ 128kbps is ~1.8MB. */
const MIN_POLISHED_AUDIO_BYTES = 80_000;

const styleValidator = v.union(...STYLE_IDS.map((id) => v.literal(id)));
const modeValidator = v.union(v.literal("major"), v.literal("minor"));

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
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

async function trackAudioUrl(ctx: QueryCtx, track: Doc<"musicTracks">) {
  if (track.storageId) {
    return (await ctx.storage.getUrl(track.storageId)) ?? null;
  }
  return track.audioUrl ?? track.streamAudioUrl ?? null;
}

async function toClientTrack(ctx: QueryCtx, track: Doc<"musicTracks">) {
  const pending = track.status === "queued" || track.status === "generating";
  const stale = pending && Date.now() - track.updatedAt > STALE_AFTER_MS;
  return {
    _id: track._id,
    status: stale ? ("failed" as const) : track.status,
    title: track.title,
    key: track.key,
    tempoBpm: track.tempoBpm,
    styleId: track.styleId ?? null,
    progression: track.progression,
    audioUrl: track.status === "ready" ? await trackAudioUrl(ctx, track) : null,
    errorMessage: stale ? "Generation timed out. Try again." : (track.errorMessage ?? null),
    createdAt: track.createdAt,
  };
}

async function bumpLimit(
  ctx: MutationCtx,
  key: string,
  windowMs: number,
  max: number,
  message: string,
) {
  const now = Date.now();
  const row = await ctx.db
    .query("musicRateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (!row) {
    await ctx.db.insert("musicRateLimits", { key, windowStart: now, count: 1, updatedAt: now });
    return;
  }
  if (now - row.windowStart >= windowMs) {
    await ctx.db.patch(row._id, { windowStart: now, count: 1, updatedAt: now });
    return;
  }
  if (row.count >= max) throw new Error(message);
  await ctx.db.patch(row._id, { count: row.count + 1, updatedAt: now });
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
    return await toClientTrack(ctx, track);
  },
});

export const listRecent = query({
  args: {
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.clientId.trim()) return [];
    const tracks = await ctx.db
      .query("musicTracks")
      .withIndex("by_clientId_and_createdAt", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .take(12);
    return await Promise.all(tracks.map((track) => toClientTrack(ctx, track)));
  },
});

export const deleteTrack = mutation({
  args: {
    trackId: v.id("musicTracks"),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = args.clientId.trim();
    if (!clientId) throw new Error("Missing client id.");

    const track = await ctx.db.get(args.trackId);
    if (!track) return null;
    if (track.clientId !== clientId) {
      throw new Error("You can only delete your own tracks.");
    }

    if (track.storageId) {
      await ctx.storage.delete(track.storageId);
    }
    await ctx.db.delete(args.trackId);
    return null;
  },
});

/**
 * Queue an ElevenLabs studio take. The prompt is built here from validated
 * musical settings, so the endpoint can't be used as a free-form generator.
 */
export const requestPolish = mutation({
  args: {
    clientId: v.string(),
    tonic: v.number(),
    mode: modeValidator,
    tempoBpm: v.number(),
    styleId: styleValidator,
    chords: v.array(v.string()),
    notes: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"musicTracks">> => {
    const clientId = args.clientId.trim().slice(0, 80);
    if (!clientId) throw new Error("Missing client id.");
    if (!env("ELEVENLABS_API_KEY")) {
      throw new Error("Studio takes aren't set up yet (ELEVENLABS_API_KEY is missing).");
    }
    if (!Number.isInteger(args.tonic) || args.tonic < 0 || args.tonic > 11) {
      throw new Error("Invalid key.");
    }
    if (args.chords.length === 0 || args.chords.length > MAX_BARS) {
      throw new Error(`Use between 1 and ${MAX_BARS} bars.`);
    }
    const chords: Chord[] = [];
    for (const token of args.chords) {
      const chord = parseChordToken(token);
      if (!chord) throw new Error("Invalid chord.");
      chords.push(chord);
    }

    await bumpLimit(
      ctx,
      `music:${clientId}`,
      CLIENT_WINDOW_MS,
      CLIENT_MAX,
      "You've made a lot of takes this hour. Give it a little while.",
    );
    const globalMax = Number(env("MUSIC_POLISH_DAILY_LIMIT")) || DEFAULT_GLOBAL_MAX;
    await bumpLimit(
      ctx,
      "music:global",
      GLOBAL_WINDOW_MS,
      globalMax,
      "The studio is fully booked today. Try again tomorrow!",
    );

    const spec = {
      tonic: args.tonic,
      mode: args.mode,
      tempoBpm: clampTempo(args.tempoBpm),
      styleId: args.styleId as StyleId,
      chords,
      notes: args.notes.slice(0, 240),
    };
    const now = Date.now();
    const trackId = await ctx.db.insert("musicTracks", {
      clientId,
      status: "queued",
      title: buildPolishTitle(spec).slice(0, 100),
      stylePrompt: buildPolishPrompt(spec).slice(0, 1800),
      tempoBpm: spec.tempoBpm,
      key: keyName(spec.tonic, spec.mode),
      mode: spec.mode,
      styleId: spec.styleId,
      progression: chords.map((ch) => chordName(ch, spec.tonic, spec.mode)).join(" "),
      drumPatternId: spec.styleId,
      bars: chords.length,
      hasMicTake: false,
      notes: spec.notes,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.music.generate, { trackId });
    return trackId;
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

async function readErrorDetail(response: Response) {
  let detail = `ElevenLabs request failed (${response.status})`;
  const text = await response.text().catch(() => "");
  try {
    const payload: unknown = JSON.parse(text);
    detail =
      (isRecord(payload) && asString(payload.detail)) ||
      (isRecord(payload) && isRecord(payload.detail) && asString(payload.detail.message)) ||
      (isRecord(payload) && asString(payload.message)) ||
      detail;
  } catch {
    if (text) detail = text.slice(0, 300);
  }
  return detail;
}

export const generate = internalAction({
  args: { trackId: v.id("musicTracks") },
  handler: async (ctx, args) => {
    const { trackId } = args;
    const track = await ctx.runQuery(internal.music.getTrackInternal, { trackId });
    if (!track || track.status !== "queued") return null;

    const apiKey = env("ELEVENLABS_API_KEY");
    if (!apiKey) {
      await ctx.runMutation(internal.music.markFailed, {
        trackId,
        errorMessage: "ElevenLabs isn't configured.",
      });
      return null;
    }
    await ctx.runMutation(internal.music.markGenerating, { trackId });

    try {
      // Prompt mode on purpose: audio conditioning cloned our local synth demo.
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
            prompt: track.stylePrompt,
            music_length_ms: POLISH_DURATION_MS,
            model_id: env("ELEVENLABS_MUSIC_MODEL") || "music_v2",
            force_instrumental: true,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(await readErrorDetail(response));
      }

      const contentType = response.headers.get("content-type") || "audio/mpeg";
      const providerSongId = response.headers.get("song-id") || undefined;
      const audioBlob = contentType.includes("multipart")
        ? extractAudioFromMultipart(await response.arrayBuffer(), contentType)
        : await response.blob();

      if (audioBlob.size < MIN_POLISHED_AUDIO_BYTES) {
        throw new Error(`ElevenLabs returned tiny audio (${audioBlob.size} bytes).`);
      }

      const storageId = await ctx.storage.store(
        new Blob([audioBlob], { type: audioBlob.type || "audio/mpeg" }),
      );
      await ctx.runMutation(internal.music.markReady, { trackId, storageId, providerSongId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Studio take failed.";
      console.error("music.generate failed", { trackId, message });
      await ctx.runMutation(internal.music.markFailed, { trackId, errorMessage: message });
    }
    return null;
  },
});
