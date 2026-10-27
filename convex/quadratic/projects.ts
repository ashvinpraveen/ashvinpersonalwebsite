import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { fail, getMemberContext, getOwned, requireMember } from "./access";
import { createProject, updateProject } from "./model";
import { projectHealthValidator } from "./tables";
import { projectFieldsValidator } from "./validators";

export const get = query({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    projectId: v.id("quadraticProjects"),
  },
  handler: async (ctx, args) => {
    const context = await getMemberContext(ctx, args.token, args.workspaceId);
    if (!context) return null;
    const project = await ctx.db.get("quadraticProjects", args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) return null;
    const updates = await ctx.db
      .query("quadraticProjectUpdates")
      .withIndex("by_projectId", (q) => q.eq("projectId", project._id))
      .order("desc")
      .take(50);
    return { project, updates };
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    ...projectFieldsValidator,
    name: v.string(),
  },
  returns: v.id("quadraticProjects"),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    const { token, workspaceId, ...input } = args;
    return await createProject(ctx, actor, input);
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    projectId: v.id("quadraticProjects"),
    patch: v.object(projectFieldsValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    await updateProject(ctx, actor, args.projectId, args.patch);
    return null;
  },
});

export const archive = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    projectId: v.id("quadraticProjects"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    const project = await getOwned(ctx, "quadraticProjects", args.projectId, actor, "Project");
    await ctx.db.patch("quadraticProjects", project._id, { archivedAt: Date.now() });
    const issues = await ctx.db
      .query("quadraticIssues")
      .withIndex("by_projectId", (q) => q.eq("projectId", project._id))
      .take(1000);
    for (const issue of issues) {
      await ctx.db.patch("quadraticIssues", issue._id, { projectId: undefined, updatedAt: Date.now() });
    }
    return null;
  },
});

export const postUpdate = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    projectId: v.id("quadraticProjects"),
    health: projectHealthValidator,
    body: v.string(),
  },
  returns: v.id("quadraticProjectUpdates"),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    const project = await getOwned(ctx, "quadraticProjects", args.projectId, actor, "Project");
    const body = args.body.trim();
    if (!body) fail("Write a short update first.");
    if (body.length > 20_000) fail("Update is too long.");
    const now = Date.now();
    await ctx.db.patch("quadraticProjects", project._id, { health: args.health, updatedAt: now });
    return await ctx.db.insert("quadraticProjectUpdates", {
      workspaceId: actor.workspaceId,
      projectId: project._id,
      authorId: actor.userId,
      health: args.health,
      body,
      createdAt: now,
    });
  },
});
