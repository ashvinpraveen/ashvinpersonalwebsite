import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getMemberContext, getOwned, requireMember } from "./access";
import { liteIssue } from "./model";

export const list = query({
  args: { token: v.string(), workspaceId: v.id("quadraticWorkspaces") },
  handler: async (ctx, args) => {
    const context = await getMemberContext(ctx, args.token, args.workspaceId);
    if (!context) return null;
    const notifications = await ctx.db
      .query("quadraticNotifications")
      .withIndex("by_userId_and_workspaceId_and_createdAt", (q) =>
        q.eq("userId", context.viewer._id).eq("workspaceId", args.workspaceId),
      )
      .order("desc")
      .take(200);
    const result = [];
    for (const notification of notifications) {
      if (notification.archivedAt) continue;
      const issue = notification.issueId ? await ctx.db.get("quadraticIssues", notification.issueId) : null;
      if (notification.issueId && !issue) continue;
      result.push({ ...notification, issue: issue ? liteIssue(issue) : null });
    }
    return result;
  },
});

export const markRead = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    notificationIds: v.array(v.id("quadraticNotifications")),
    read: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    for (const id of args.notificationIds.slice(0, 200)) {
      const notification = await getOwned(ctx, "quadraticNotifications", id, actor, "Notification");
      if (notification.userId !== actor.userId) continue;
      await ctx.db.patch("quadraticNotifications", id, { readAt: args.read ? Date.now() : undefined });
    }
    return null;
  },
});

export const markAllRead = mutation({
  args: { token: v.string(), workspaceId: v.id("quadraticWorkspaces") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    const notifications = await ctx.db
      .query("quadraticNotifications")
      .withIndex("by_userId_and_workspaceId_and_createdAt", (q) =>
        q.eq("userId", actor.userId).eq("workspaceId", args.workspaceId),
      )
      .order("desc")
      .take(300);
    const now = Date.now();
    for (const notification of notifications) {
      if (!notification.readAt) await ctx.db.patch("quadraticNotifications", notification._id, { readAt: now });
    }
    return null;
  },
});

export const archive = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    notificationIds: v.array(v.id("quadraticNotifications")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    const now = Date.now();
    for (const id of args.notificationIds.slice(0, 200)) {
      const notification = await getOwned(ctx, "quadraticNotifications", id, actor, "Notification");
      if (notification.userId !== actor.userId) continue;
      await ctx.db.patch("quadraticNotifications", id, { archivedAt: now, readAt: notification.readAt ?? now });
    }
    return null;
  },
});

export const archiveRead = mutation({
  args: { token: v.string(), workspaceId: v.id("quadraticWorkspaces") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    const notifications = await ctx.db
      .query("quadraticNotifications")
      .withIndex("by_userId_and_workspaceId_and_createdAt", (q) =>
        q.eq("userId", actor.userId).eq("workspaceId", args.workspaceId),
      )
      .order("desc")
      .take(300);
    const now = Date.now();
    for (const notification of notifications) {
      if (notification.readAt && !notification.archivedAt) {
        await ctx.db.patch("quadraticNotifications", notification._id, { archivedAt: now });
      }
    }
    return null;
  },
});

export const snooze = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    notificationId: v.id("quadraticNotifications"),
    until: v.union(v.number(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    const notification = await getOwned(ctx, "quadraticNotifications", args.notificationId, actor, "Notification");
    if (notification.userId !== actor.userId) return null;
    await ctx.db.patch("quadraticNotifications", notification._id, {
      snoozedUntil: args.until ?? undefined,
    });
    return null;
  },
});
