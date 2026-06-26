import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { isAdmin, requireAdmin } from "./adminAuth";

const MAX_NAME_LENGTH = 40;
const MAX_LOCATION_LENGTH = 60;
const MAX_MESSAGE_LENGTH = 500;
const MAX_REPLY_LENGTH = 500;
const MAX_CLIENT_ID_LENGTH = 80;
const MAX_DRAWING_DATA_URL_LENGTH = 180_000;
const POSTCARD_LIMIT = 64;
const POSTCARD_CANDIDATE_LIMIT = 128;

const trimToLength = (value: string, maxLength: number) =>
  value.trim().replace(/\s+/g, " ").slice(0, maxLength);

const trimMessage = (value: string) =>
  value.trim().replace(/\r\n/g, "\n").slice(0, MAX_MESSAGE_LENGTH);

const normalizeDrawing = (value: string | null) => {
  if (!value) return null;
  if (!value.startsWith("data:image/png;base64,")) return null;
  if (value.length > MAX_DRAWING_DATA_URL_LENGTH) {
    throw new Error("Drawing is too large. Try a simpler sketch.");
  }
  return value;
};

const normalizeClientId = (value: string | undefined) =>
  value?.trim().slice(0, MAX_CLIENT_ID_LENGTH) ?? "";

export const list = query({
  args: {
    clientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clientId = normalizeClientId(args.clientId);
    const postcards = await ctx.db
      .query("postcards")
      .withIndex("by_createdAt")
      .order("desc")
      .take(POSTCARD_CANDIDATE_LIMIT);

    const rankedPostcards = postcards
      .filter((postcard) => !postcard.hiddenAt)
      .sort((a, b) => {
        const likeDifference = (b.likeCount ?? 0) - (a.likeCount ?? 0);
        if (likeDifference !== 0) return likeDifference;
        return b.createdAt - a.createdAt;
      })
      .slice(0, POSTCARD_LIMIT);

    return await Promise.all(
      rankedPostcards.map(async (postcard) => {
        if (!clientId) {
          return {
            ...postcard,
            likeCount: postcard.likeCount ?? 0,
            isLiked: false,
            canEdit: false,
          };
        }

        const like = await ctx.db
          .query("postcardLikes")
          .withIndex("by_postcardId_and_clientId", (q) =>
            q.eq("postcardId", postcard._id).eq("clientId", clientId),
          )
          .unique();

        return {
          ...postcard,
          likeCount: postcard.likeCount ?? 0,
          isLiked: Boolean(like),
          canEdit: postcard.clientId === clientId,
        };
      }),
    );
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

    return await ctx.db
      .query("postcards")
      .withIndex("by_createdAt")
      .order("desc")
      .take(POSTCARD_LIMIT);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    location: v.string(),
    message: v.string(),
    clientId: v.optional(v.string()),
    drawingDataUrl: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const clientId = normalizeClientId(args.clientId);

    const message = trimMessage(args.message);
    if (message.length === 0) {
      throw new Error("Postcard needs a message.");
    }

    return await ctx.db.insert("postcards", {
      name: trimToLength(args.name, MAX_NAME_LENGTH),
      location: trimToLength(args.location, MAX_LOCATION_LENGTH),
      message,
      ...(clientId ? { clientId } : {}),
      drawingDataUrl: normalizeDrawing(args.drawingDataUrl),
      likeCount: 0,
      createdAt: Date.now(),
    });
  },
});

export const updateOwn = mutation({
  args: {
    postcardId: v.id("postcards"),
    clientId: v.string(),
    name: v.string(),
    location: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = normalizeClientId(args.clientId);
    if (!clientId) {
      throw new Error("Could not update postcard.");
    }

    const postcard = await ctx.db.get(args.postcardId);
    if (!postcard || postcard.clientId !== clientId) {
      throw new Error("Postcard not found.");
    }

    const message = trimMessage(args.message);
    if (message.length === 0) {
      throw new Error("Postcard needs a message.");
    }

    await ctx.db.patch(args.postcardId, {
      name: trimToLength(args.name, MAX_NAME_LENGTH),
      location: trimToLength(args.location, MAX_LOCATION_LENGTH),
      message,
    });
  },
});

const deletePostcardAndLikes = async (
  ctx: MutationCtx,
  postcardId: Id<"postcards">,
) => {
  const likes = ctx.db
    .query("postcardLikes")
    .withIndex("by_postcardId", (q) => q.eq("postcardId", postcardId));

  for await (const like of likes) {
    await ctx.db.delete(like._id);
  }

  await ctx.db.delete(postcardId);
};

export const deleteOwn = mutation({
  args: {
    postcardId: v.id("postcards"),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = normalizeClientId(args.clientId);
    if (!clientId) {
      throw new Error("Could not delete postcard.");
    }

    const postcard = await ctx.db.get(args.postcardId);
    if (!postcard || postcard.clientId !== clientId) {
      throw new Error("Postcard not found.");
    }

    await deletePostcardAndLikes(ctx, args.postcardId);
  },
});

export const toggleLike = mutation({
  args: {
    postcardId: v.id("postcards"),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const clientId = normalizeClientId(args.clientId);
    if (!clientId) {
      throw new Error("Could not save like.");
    }

    const postcard = await ctx.db.get(args.postcardId);
    if (!postcard) {
      throw new Error("Post not found.");
    }

    const existingLike = await ctx.db
      .query("postcardLikes")
      .withIndex("by_postcardId_and_clientId", (q) =>
        q.eq("postcardId", args.postcardId).eq("clientId", clientId),
      )
      .unique();

    if (existingLike) {
      await ctx.db.delete(existingLike._id);
      await ctx.db.patch(args.postcardId, {
        likeCount: Math.max((postcard.likeCount ?? 0) - 1, 0),
      });
      return { liked: false };
    }

    await ctx.db.insert("postcardLikes", {
      postcardId: args.postcardId,
      clientId,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.postcardId, {
      likeCount: (postcard.likeCount ?? 0) + 1,
    });
    return { liked: true };
  },
});

export const reply = mutation({
  args: {
    adminSecret: v.string(),
    postcardId: v.id("postcards"),
    reply: v.string(),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.adminSecret);

    const reply = trimMessage(args.reply).slice(0, MAX_REPLY_LENGTH);
    await ctx.db.patch(args.postcardId, {
      reply,
      repliedAt: reply.length > 0 ? Date.now() : 0,
    });
  },
});

export const deleteForAdmin = mutation({
  args: {
    adminSecret: v.string(),
    postcardId: v.id("postcards"),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.adminSecret);

    await deletePostcardAndLikes(ctx, args.postcardId);
  },
});

export const setHiddenForAdmin = mutation({
  args: {
    adminSecret: v.string(),
    postcardId: v.id("postcards"),
    hidden: v.boolean(),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.adminSecret);

    await ctx.db.patch(args.postcardId, {
      hiddenAt: args.hidden ? Date.now() : 0,
    });
  },
});
