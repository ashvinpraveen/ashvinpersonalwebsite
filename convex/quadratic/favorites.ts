import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireMember } from "./access";
import { favoriteKindValidator } from "./tables";
import type { QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

async function targetWorkspaceId(ctx: QueryCtx, kind: Doc<"quadraticFavorites">["kind"], targetId: string) {
  switch (kind) {
    case "issue": {
      const id = ctx.db.normalizeId("quadraticIssues", targetId);
      return id ? (await ctx.db.get("quadraticIssues", id))?.workspaceId : undefined;
    }
    case "project": {
      const id = ctx.db.normalizeId("quadraticProjects", targetId);
      return id ? (await ctx.db.get("quadraticProjects", id))?.workspaceId : undefined;
    }
    case "view": {
      const id = ctx.db.normalizeId("quadraticViews", targetId);
      return id ? (await ctx.db.get("quadraticViews", id))?.workspaceId : undefined;
    }
    case "cycle": {
      const id = ctx.db.normalizeId("quadraticCycles", targetId);
      return id ? (await ctx.db.get("quadraticCycles", id))?.workspaceId : undefined;
    }
  }
}

export const toggle = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    kind: favoriteKindValidator,
    targetId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    const existing = await ctx.db
      .query("quadraticFavorites")
      .withIndex("by_userId_and_workspaceId", (q) =>
        q.eq("userId", actor.userId).eq("workspaceId", actor.workspaceId),
      )
      .take(100);
    const match = existing.find((fav) => fav.kind === args.kind && fav.targetId === args.targetId);
    if (match) {
      await ctx.db.delete("quadraticFavorites", match._id);
      return false;
    }
    if ((await targetWorkspaceId(ctx, args.kind, args.targetId)) !== actor.workspaceId) return false;
    await ctx.db.insert("quadraticFavorites", {
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      kind: args.kind,
      targetId: args.targetId,
      sortOrder: (existing.at(-1)?.sortOrder ?? 0) + 1,
      createdAt: Date.now(),
    });
    return true;
  },
});
