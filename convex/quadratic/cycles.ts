import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { getOwned, requireMember } from "./access";
import { ensureCycles } from "./model";

export const update = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    cycleId: v.id("quadraticCycles"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    await getOwned(ctx, "quadraticCycles", args.cycleId, actor, "Cycle");
    const patch: { name?: string; description?: string } = {};
    if (args.name !== undefined) patch.name = args.name.trim().slice(0, 80) || undefined;
    if (args.description !== undefined) patch.description = args.description.slice(0, 1000);
    await ctx.db.patch("quadraticCycles", args.cycleId, patch);
    return null;
  },
});

/** Hourly: create upcoming cycles and roll unfinished issues forward. */
export const tick = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const teams = await ctx.db
      .query("quadraticTeams")
      .withIndex("by_cyclesEnabled", (q) => q.eq("cyclesEnabled", true))
      .take(200);
    for (const team of teams) await ensureCycles(ctx, team);
    return null;
  },
});
