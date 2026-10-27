import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { fail, getOwned, requireMember } from "./access";
import { cleanColor, cleanName } from "./model";

function cleanJson(value: string, what: string) {
  if (value.length > 10_000) fail(`${what} are too large.`);
  try {
    JSON.parse(value);
  } catch {
    fail(`${what} must be valid JSON.`);
  }
  return value;
}

export const create = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    filters: v.string(),
    display: v.optional(v.string()),
    teamId: v.optional(v.id("quadraticTeams")),
    shared: v.optional(v.boolean()),
  },
  returns: v.id("quadraticViews"),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    if (args.teamId) await getOwned(ctx, "quadraticTeams", args.teamId, actor, "Team");
    const now = Date.now();
    return await ctx.db.insert("quadraticViews", {
      workspaceId: actor.workspaceId,
      creatorId: actor.userId,
      teamId: args.teamId,
      name: cleanName(args.name, "View name", 80),
      description: args.description?.slice(0, 255) || undefined,
      color: cleanColor(args.color ?? "#5e6ad2"),
      filters: cleanJson(args.filters, "Filters"),
      display: args.display ? cleanJson(args.display, "Display options") : undefined,
      shared: args.shared ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    viewId: v.id("quadraticViews"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    filters: v.optional(v.string()),
    display: v.optional(v.string()),
    shared: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    const view = await getOwned(ctx, "quadraticViews", args.viewId, actor, "View");
    if (!view.shared && view.creatorId !== actor.userId) fail("View not found.");
    const patch: Partial<typeof view> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = cleanName(args.name, "View name", 80);
    if (args.description !== undefined) patch.description = args.description.slice(0, 255) || undefined;
    if (args.color !== undefined) patch.color = cleanColor(args.color);
    if (args.filters !== undefined) patch.filters = cleanJson(args.filters, "Filters");
    if (args.display !== undefined) patch.display = cleanJson(args.display, "Display options");
    if (args.shared !== undefined) patch.shared = args.shared;
    await ctx.db.patch("quadraticViews", view._id, patch);
    return null;
  },
});

export const remove = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    viewId: v.id("quadraticViews"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor, member } = await requireMember(ctx, args.token, args.workspaceId);
    const view = await getOwned(ctx, "quadraticViews", args.viewId, actor, "View");
    if (view.creatorId !== actor.userId && member.role !== "admin") {
      fail("Only the creator or an admin can delete this view.");
    }
    await ctx.db.delete("quadraticViews", view._id);
    return null;
  },
});
