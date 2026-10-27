import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { fail, getOwned, requireAdmin, requireMember } from "./access";
import {
  cleanColor,
  cleanName,
  cleanTeamKey,
  createTeamWithDefaults,
  ensureCycles,
  listTeamStates,
} from "./model";
import { estimateTypeValidator, stateTypeValidator } from "./tables";

export const create = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    name: v.string(),
    key: v.string(),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  returns: v.id("quadraticTeams"),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.token, args.workspaceId);
    const existing = await ctx.db
      .query("quadraticTeams")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .take(51);
    if (existing.length >= 50) fail("A workspace can have at most 50 teams.");
    const { teamId } = await createTeamWithDefaults(ctx, args.workspaceId, args);
    return teamId;
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    teamId: v.id("quadraticTeams"),
    name: v.optional(v.string()),
    key: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.union(v.string(), v.null())),
    description: v.optional(v.string()),
    cyclesEnabled: v.optional(v.boolean()),
    cycleDurationWeeks: v.optional(v.number()),
    cycleStartDay: v.optional(v.number()),
    upcomingCycleCount: v.optional(v.number()),
    estimateType: v.optional(estimateTypeValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const team = await ctx.db.get("quadraticTeams", args.teamId);
    if (!team) fail("Team not found.");
    const { actor } = await requireMember(ctx, args.token, team.workspaceId);
    const { token, teamId, icon, ...rest } = args;
    const patch: Partial<typeof team> = {};
    if (rest.name !== undefined) patch.name = cleanName(rest.name, "Team name", 60);
    if (rest.key !== undefined && cleanTeamKey(rest.key) !== team.key) {
      const key = cleanTeamKey(rest.key);
      const clash = await ctx.db
        .query("quadraticTeams")
        .withIndex("by_workspaceId_and_key", (q) => q.eq("workspaceId", actor.workspaceId).eq("key", key))
        .unique();
      if (clash) fail(`Another team already uses the identifier ${key}.`);
      patch.key = key;
    }
    if (rest.color !== undefined) patch.color = cleanColor(rest.color);
    if (icon !== undefined) patch.icon = icon ?? undefined;
    if (rest.description !== undefined) patch.description = rest.description.slice(0, 255);
    if (rest.cyclesEnabled !== undefined) patch.cyclesEnabled = rest.cyclesEnabled;
    if (rest.cycleDurationWeeks !== undefined) {
      patch.cycleDurationWeeks = Math.max(1, Math.min(8, Math.round(rest.cycleDurationWeeks)));
    }
    if (rest.cycleStartDay !== undefined) {
      patch.cycleStartDay = Math.max(0, Math.min(6, Math.round(rest.cycleStartDay)));
    }
    if (rest.upcomingCycleCount !== undefined) {
      patch.upcomingCycleCount = Math.max(1, Math.min(6, Math.round(rest.upcomingCycleCount)));
    }
    if (rest.estimateType !== undefined) patch.estimateType = rest.estimateType;
    await ctx.db.patch("quadraticTeams", teamId, patch);
    await ensureCycles(ctx, { ...team, ...patch });
    return null;
  },
});

export const createState = mutation({
  args: {
    token: v.string(),
    teamId: v.id("quadraticTeams"),
    name: v.string(),
    type: stateTypeValidator,
    color: v.string(),
  },
  returns: v.id("quadraticStates"),
  handler: async (ctx, args) => {
    const team = await ctx.db.get("quadraticTeams", args.teamId);
    if (!team) fail("Team not found.");
    await requireMember(ctx, args.token, team.workspaceId);
    const states = await listTeamStates(ctx, team._id);
    if (states.length >= 30) fail("A team can have at most 30 statuses.");
    // Statuses are grouped by type in Linear's workflow order.
    const order = ["backlog", "unstarted", "started", "completed", "canceled"];
    const lastOfTypeOrBefore = states
      .filter((state) => order.indexOf(state.type) <= order.indexOf(args.type))
      .at(-1);
    const after = states.find((state) => state.position > (lastOfTypeOrBefore?.position ?? -1));
    const position = after
      ? ((lastOfTypeOrBefore?.position ?? after.position - 1) + after.position) / 2
      : (states.at(-1)?.position ?? 0) + 1;
    return await ctx.db.insert("quadraticStates", {
      workspaceId: team.workspaceId,
      teamId: team._id,
      name: cleanName(args.name, "Status name", 40),
      type: args.type,
      color: cleanColor(args.color),
      position,
    });
  },
});

export const updateState = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    stateId: v.id("quadraticStates"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    await getOwned(ctx, "quadraticStates", args.stateId, actor, "Status");
    const patch: { name?: string; color?: string; description?: string } = {};
    if (args.name !== undefined) patch.name = cleanName(args.name, "Status name", 40);
    if (args.color !== undefined) patch.color = cleanColor(args.color);
    if (args.description !== undefined) patch.description = args.description.slice(0, 255);
    await ctx.db.patch("quadraticStates", args.stateId, patch);
    return null;
  },
});

export const deleteState = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    stateId: v.id("quadraticStates"),
    replacementId: v.id("quadraticStates"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor } = await requireAdmin(ctx, args.token, args.workspaceId);
    const state = await getOwned(ctx, "quadraticStates", args.stateId, actor, "Status");
    const replacement = await getOwned(ctx, "quadraticStates", args.replacementId, actor, "Status");
    if (replacement.teamId !== state.teamId || replacement._id === state._id) {
      fail("Pick another status from the same team.");
    }
    const states = await listTeamStates(ctx, state.teamId);
    if (states.filter((s) => s.type === state.type).length <= 1 && ["backlog", "unstarted", "completed"].includes(state.type)) {
      fail("Each team needs at least one status of this type.");
    }
    const issues = await ctx.db
      .query("quadraticIssues")
      .withIndex("by_stateId", (q) => q.eq("stateId", state._id))
      .take(1000);
    if (issues.length === 1000) fail("Too many issues use this status to move at once.");
    for (const issue of issues) {
      await ctx.db.patch("quadraticIssues", issue._id, { stateId: replacement._id });
    }
    await ctx.db.delete("quadraticStates", state._id);
    return null;
  },
});
