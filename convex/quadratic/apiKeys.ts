import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { fail, getMemberContext, getMembership, getOwned, requireMember, sha256Hex } from "./access";
import { cleanName } from "./model";

/** Keys look like `qk_` + 40 base62 characters and are generated in the browser;
 * only the SHA-256 hash ever reaches the database. */
export const API_KEY_PATTERN = /^qk_[A-Za-z0-9]{32,64}$/;
const TOUCH_INTERVAL = 10 * 60 * 1000;

export const list = query({
  args: { token: v.string(), workspaceId: v.id("quadraticWorkspaces") },
  handler: async (ctx, args) => {
    const context = await getMemberContext(ctx, args.token, args.workspaceId);
    if (!context) return [];
    const keys = await ctx.db
      .query("quadraticApiKeys")
      .withIndex("by_workspaceId_and_userId", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", context.viewer._id),
      )
      .take(100);
    return keys
      .filter((key) => !key.revokedAt)
      .map((key) => ({
        _id: key._id,
        name: key.name,
        prefix: key.prefix,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
      }));
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    name: v.string(),
    key: v.string(),
  },
  returns: v.id("quadraticApiKeys"),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    if (!API_KEY_PATTERN.test(args.key)) fail("Malformed API key.");
    const existing = await ctx.db
      .query("quadraticApiKeys")
      .withIndex("by_workspaceId_and_userId", (q) =>
        q.eq("workspaceId", actor.workspaceId).eq("userId", actor.userId),
      )
      .take(100);
    if (existing.filter((key) => !key.revokedAt).length >= 20) fail("You can have at most 20 active keys.");
    return await ctx.db.insert("quadraticApiKeys", {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      name: cleanName(args.name, "Key name", 60),
      keyHash: await sha256Hex(args.key),
      prefix: args.key.slice(0, 10),
      createdAt: Date.now(),
    });
  },
});

export const revoke = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    keyId: v.id("quadraticApiKeys"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    const key = await getOwned(ctx, "quadraticApiKeys", args.keyId, actor, "API key");
    if (key.userId !== actor.userId) fail("API key not found.");
    await ctx.db.patch("quadraticApiKeys", key._id, { revokedAt: Date.now() });
    return null;
  },
});

export const resolve = internalQuery({
  args: { keyHash: v.string() },
  returns: v.union(
    v.object({
      keyId: v.id("quadraticApiKeys"),
      userId: v.id("quadraticUsers"),
      workspaceId: v.id("quadraticWorkspaces"),
      lastUsedAt: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const key = await ctx.db
      .query("quadraticApiKeys")
      .withIndex("by_keyHash", (q) => q.eq("keyHash", args.keyHash))
      .unique();
    if (!key || key.revokedAt) return null;
    // Keys die with the membership that created them.
    if (!(await getMembership(ctx, key.workspaceId, key.userId))) return null;
    return { keyId: key._id, userId: key.userId, workspaceId: key.workspaceId, lastUsedAt: key.lastUsedAt };
  },
});

export const touch = internalMutation({
  args: { keyId: v.id("quadraticApiKeys") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = await ctx.db.get("quadraticApiKeys", args.keyId);
    if (!key) return null;
    const now = Date.now();
    if (!key.lastUsedAt || now - key.lastUsedAt > TOUCH_INTERVAL) {
      await ctx.db.patch("quadraticApiKeys", key._id, { lastUsedAt: now });
    }
    return null;
  },
});
