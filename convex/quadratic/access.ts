import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Quadratic has no third-party auth provider. Each browser holds a random
 * session token (generated client-side) and the server only stores its
 * SHA-256 hash, the same way API keys for the MCP endpoint are stored.
 */
export type Actor = {
  userId: Id<"quadraticUsers">;
  workspaceId: Id<"quadraticWorkspaces">;
  viaApi?: boolean;
};

export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function fail(message: string): never {
  throw new ConvexError(message);
}

export async function getViewer(
  ctx: QueryCtx,
  token: string,
): Promise<Doc<"quadraticUsers"> | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const tokenHash = await sha256Hex(token);
  const session = await ctx.db
    .query("quadraticSessions")
    .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
    .unique();
  if (!session) return null;
  return await ctx.db.get("quadraticUsers", session.userId);
}

export async function requireViewer(ctx: QueryCtx, token: string) {
  const viewer = await getViewer(ctx, token);
  if (!viewer) fail("You are signed out. Refresh to sign in again.");
  return viewer;
}

export async function getMembership(
  ctx: QueryCtx,
  workspaceId: Id<"quadraticWorkspaces">,
  userId: Id<"quadraticUsers">,
) {
  return await ctx.db
    .query("quadraticMembers")
    .withIndex("by_workspaceId_and_userId", (q) =>
      q.eq("workspaceId", workspaceId).eq("userId", userId),
    )
    .unique();
}

/** For queries: returns null instead of throwing so the UI can show a gate. */
export async function getMemberContext(
  ctx: QueryCtx,
  token: string,
  workspaceId: Id<"quadraticWorkspaces">,
) {
  const viewer = await getViewer(ctx, token);
  if (!viewer) return null;
  const member = await getMembership(ctx, workspaceId, viewer._id);
  if (!member) return null;
  const actor: Actor = { userId: viewer._id, workspaceId };
  return { viewer, member, actor };
}

export async function requireMember(
  ctx: QueryCtx,
  token: string,
  workspaceId: Id<"quadraticWorkspaces">,
) {
  const context = await getMemberContext(ctx, token, workspaceId);
  if (!context) fail("You don't have access to this workspace.");
  return context;
}

export async function requireAdmin(
  ctx: QueryCtx,
  token: string,
  workspaceId: Id<"quadraticWorkspaces">,
) {
  const context = await requireMember(ctx, token, workspaceId);
  if (context.member.role !== "admin") fail("Only workspace admins can do that.");
  return context;
}

/** Loads a document and checks it belongs to the actor's workspace. */
export async function getOwned<
  T extends
    | "quadraticTeams"
    | "quadraticStates"
    | "quadraticLabels"
    | "quadraticProjects"
    | "quadraticCycles"
    | "quadraticIssues"
    | "quadraticComments"
    | "quadraticViews"
    | "quadraticNotifications"
    | "quadraticFavorites"
    | "quadraticApiKeys",
>(ctx: QueryCtx, table: T, id: Id<T>, actor: Actor, what: string): Promise<Doc<T>> {
  const doc = (await ctx.db.get(table, id)) as (Doc<T> & {
    workspaceId: Id<"quadraticWorkspaces">;
  }) | null;
  if (!doc || doc.workspaceId !== actor.workspaceId) fail(`${what} not found.`);
  return doc;
}

export async function assertMember(
  ctx: QueryCtx,
  actor: Actor,
  userId: Id<"quadraticUsers">,
) {
  const member = await getMembership(ctx, actor.workspaceId, userId);
  if (!member) fail("That person isn't a member of this workspace.");
  return member;
}

export type Ctx = QueryCtx | MutationCtx;
