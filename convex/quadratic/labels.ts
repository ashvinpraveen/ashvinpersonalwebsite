import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getOwned, requireMember } from "./access";
import { cleanColor, cleanName, createLabel } from "./model";

export const create = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    name: v.string(),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
    teamId: v.optional(v.id("quadraticTeams")),
  },
  returns: v.id("quadraticLabels"),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    const { token, workspaceId, ...input } = args;
    return await createLabel(ctx, actor, input);
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    labelId: v.id("quadraticLabels"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    await getOwned(ctx, "quadraticLabels", args.labelId, actor, "Label");
    const patch: { name?: string; color?: string; description?: string } = {};
    if (args.name !== undefined) patch.name = cleanName(args.name, "Label name", 60);
    if (args.color !== undefined) patch.color = cleanColor(args.color);
    if (args.description !== undefined) patch.description = args.description.slice(0, 255);
    await ctx.db.patch("quadraticLabels", args.labelId, patch);
    return null;
  },
});

export const remove = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    labelId: v.id("quadraticLabels"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    const label = await getOwned(ctx, "quadraticLabels", args.labelId, actor, "Label");
    for await (const issue of ctx.db
      .query("quadraticIssues")
      .withIndex("by_workspaceId_and_archivedAt", (q) => q.eq("workspaceId", actor.workspaceId))) {
      if (issue.labelIds.includes(label._id)) {
        await ctx.db.patch("quadraticIssues", issue._id, {
          labelIds: issue.labelIds.filter((id) => id !== label._id),
        });
      }
    }
    await ctx.db.delete("quadraticLabels", label._id);
    return null;
  },
});
