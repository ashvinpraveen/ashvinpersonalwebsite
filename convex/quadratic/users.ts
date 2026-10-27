import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { TOKEN_PATTERN, fail, getViewer, requireViewer, sha256Hex } from "./access";
import { cleanName } from "./model";

const LOGIN_CODE_TTL = 15 * 60 * 1000;

const viewerValidator = v.object({
  _id: v.id("quadraticUsers"),
  name: v.string(),
  handle: v.string(),
  email: v.optional(v.string()),
  avatarHue: v.number(),
  lastWorkspaceId: v.optional(v.id("quadraticWorkspaces")),
});

function slugHandle(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
  return base || "user";
}

async function uniqueHandle(ctx: MutationCtx, wanted: string, self?: Id<"quadraticUsers">) {
  const base = slugHandle(wanted);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}${attempt + 1}`;
    const clash = await ctx.db
      .query("quadraticUsers")
      .withIndex("by_handle", (q) => q.eq("handle", candidate))
      .first();
    if (!clash || clash._id === self) return candidate;
  }
  return `${base}${Date.now().toString(36)}`;
}

function cleanEmail(email: string | undefined) {
  const trimmed = email?.trim().toLowerCase();
  if (!trimmed) return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) || trimmed.length > 200) {
    fail("That email doesn't look right.");
  }
  return trimmed;
}

function hueFor(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}

export const me = query({
  args: { token: v.string() },
  returns: v.union(viewerValidator, v.null()),
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx, args.token);
    if (!viewer) return null;
    return {
      _id: viewer._id,
      name: viewer.name,
      handle: viewer.handle,
      email: viewer.email,
      avatarHue: viewer.avatarHue,
      lastWorkspaceId: viewer.lastWorkspaceId,
    };
  },
});

export const signUp = mutation({
  args: { token: v.string(), name: v.string(), email: v.optional(v.string()) },
  returns: v.id("quadraticUsers"),
  handler: async (ctx, args) => {
    if (!TOKEN_PATTERN.test(args.token)) fail("Invalid session token.");
    const tokenHash = await sha256Hex(args.token);
    const existing = await ctx.db
      .query("quadraticSessions")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (existing) return existing.userId;
    const name = cleanName(args.name, "Name", 60);
    const now = Date.now();
    const userId = await ctx.db.insert("quadraticUsers", {
      name,
      handle: await uniqueHandle(ctx, name),
      email: cleanEmail(args.email),
      avatarHue: hueFor(`${name}:${now}`),
      createdAt: now,
    });
    await ctx.db.insert("quadraticSessions", { userId, tokenHash, createdAt: now });
    return userId;
  },
});

export const updateProfile = mutation({
  args: {
    token: v.string(),
    name: v.optional(v.string()),
    handle: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarHue: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.token);
    const patch: { name?: string; handle?: string; email?: string; avatarHue?: number } = {};
    if (args.name !== undefined) patch.name = cleanName(args.name, "Name", 60);
    if (args.handle !== undefined) {
      const wanted = slugHandle(args.handle);
      const clash = await ctx.db
        .query("quadraticUsers")
        .withIndex("by_handle", (q) => q.eq("handle", wanted))
        .first();
      if (clash && clash._id !== viewer._id) fail(`@${wanted} is taken.`);
      patch.handle = wanted;
    }
    if (args.email !== undefined) patch.email = cleanEmail(args.email);
    if (args.avatarHue !== undefined) patch.avatarHue = Math.round(Math.abs(args.avatarHue)) % 360;
    await ctx.db.patch("quadraticUsers", viewer._id, patch);
    return null;
  },
});

/** Registers a short-lived code another device can redeem to sign in. */
export const createLoginCode = mutation({
  args: { token: v.string(), code: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx, args.token);
    if (!TOKEN_PATTERN.test(args.code)) fail("Invalid code.");
    const previous = await ctx.db
      .query("quadraticLoginCodes")
      .withIndex("by_userId", (q) => q.eq("userId", viewer._id))
      .take(20);
    for (const code of previous) await ctx.db.delete("quadraticLoginCodes", code._id);
    const expiresAt = Date.now() + LOGIN_CODE_TTL;
    await ctx.db.insert("quadraticLoginCodes", {
      userId: viewer._id,
      codeHash: await sha256Hex(args.code),
      expiresAt,
    });
    return expiresAt;
  },
});

export const redeemLoginCode = mutation({
  args: { code: v.string(), token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!TOKEN_PATTERN.test(args.token) || !TOKEN_PATTERN.test(args.code)) fail("Invalid sign-in link.");
    const codeHash = await sha256Hex(args.code);
    const login = await ctx.db
      .query("quadraticLoginCodes")
      .withIndex("by_codeHash", (q) => q.eq("codeHash", codeHash))
      .unique();
    if (!login || login.expiresAt < Date.now()) fail("This sign-in link has expired.");
    await ctx.db.delete("quadraticLoginCodes", login._id);
    await ctx.db.insert("quadraticSessions", {
      userId: login.userId,
      tokenHash: await sha256Hex(args.token),
      createdAt: Date.now(),
    });
    return null;
  },
});

export const signOut = mutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!TOKEN_PATTERN.test(args.token)) return null;
    const tokenHash = await sha256Hex(args.token);
    const session = await ctx.db
      .query("quadraticSessions")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (session) await ctx.db.delete("quadraticSessions", session._id);
    return null;
  },
});
