import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { fail, getMemberContext, getOwned, requireMember } from "./access";
import {
  createIssue,
  findIssueByIdentifier,
  identifierFor,
  liteIssue,
  setArchived,
  subscribe,
  unsubscribe,
  updateIssue,
} from "./model";
import { relationTypeValidator } from "./tables";
import { issueFieldsValidator, issuePatchValidator } from "./validators";

const MAX_LIST = 3000;

/** Every live issue in the workspace without descriptions. The client filters,
 * groups and sorts locally, which keeps navigation instant like Linear's sync engine. */
export const list = query({
  args: { token: v.string(), workspaceId: v.id("quadraticWorkspaces") },
  handler: async (ctx, args) => {
    const context = await getMemberContext(ctx, args.token, args.workspaceId);
    if (!context) return null;
    const issues = await ctx.db
      .query("quadraticIssues")
      .withIndex("by_workspaceId_and_archivedAt", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("archivedAt", undefined),
      )
      .take(MAX_LIST);
    return issues.map(liteIssue);
  },
});

export const listArchived = query({
  args: { token: v.string(), workspaceId: v.id("quadraticWorkspaces") },
  handler: async (ctx, args) => {
    const context = await getMemberContext(ctx, args.token, args.workspaceId);
    if (!context) return null;
    const issues = await ctx.db
      .query("quadraticIssues")
      .withIndex("by_workspaceId_and_archivedAt", (q) =>
        q.eq("workspaceId", args.workspaceId).gt("archivedAt", 0),
      )
      .order("desc")
      .take(200);
    return issues.map(liteIssue);
  },
});

export const search = query({
  args: { token: v.string(), workspaceId: v.id("quadraticWorkspaces"), query: v.string() },
  handler: async (ctx, args) => {
    const context = await getMemberContext(ctx, args.token, args.workspaceId);
    if (!context || !args.query.trim()) return [];
    const issues = await ctx.db
      .query("quadraticIssues")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.query).eq("workspaceId", args.workspaceId),
      )
      .take(50);
    return issues.filter((issue) => !issue.archivedAt).map(liteIssue);
  },
});

async function relatedLite(
  ctx: Parameters<typeof findIssueByIdentifier>[0],
  issueId: Id<"quadraticIssues">,
) {
  const issue = await ctx.db.get("quadraticIssues", issueId);
  if (!issue) return null;
  return liteIssue(issue);
}

export const get = query({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    identifier: v.string(),
  },
  handler: async (ctx, args) => {
    const context = await getMemberContext(ctx, args.token, args.workspaceId);
    if (!context) return null;
    const found = await findIssueByIdentifier(ctx, args.workspaceId, args.identifier);
    if (!found) return null;
    const { issue, team } = found;

    const comments = await ctx.db
      .query("quadraticComments")
      .withIndex("by_issueId", (q) => q.eq("issueId", issue._id))
      .take(500);
    const commentsWithReactions = [];
    for (const comment of comments) {
      const reactions = await ctx.db
        .query("quadraticReactions")
        .withIndex("by_commentId", (q) => q.eq("commentId", comment._id))
        .take(200);
      const grouped = new Map<string, Id<"quadraticUsers">[]>();
      for (const reaction of reactions) {
        grouped.set(reaction.emoji, [...(grouped.get(reaction.emoji) ?? []), reaction.userId]);
      }
      commentsWithReactions.push({
        ...comment,
        reactions: [...grouped.entries()].map(([emoji, userIds]) => ({ emoji, userIds })),
      });
    }

    const history = await ctx.db
      .query("quadraticHistory")
      .withIndex("by_issueId", (q) => q.eq("issueId", issue._id))
      .take(300);

    const relations = [];
    const outgoing = await ctx.db
      .query("quadraticRelations")
      .withIndex("by_issueId", (q) => q.eq("issueId", issue._id))
      .take(100);
    for (const relation of outgoing) {
      const other = await relatedLite(ctx, relation.relatedIssueId);
      if (other) relations.push({ _id: relation._id, type: relation.type, direction: "outgoing" as const, issue: other });
    }
    const incoming = await ctx.db
      .query("quadraticRelations")
      .withIndex("by_relatedIssueId", (q) => q.eq("relatedIssueId", issue._id))
      .take(100);
    for (const relation of incoming) {
      const other = await relatedLite(ctx, relation.issueId);
      if (other) relations.push({ _id: relation._id, type: relation.type, direction: "incoming" as const, issue: other });
    }

    const subscriptions = await ctx.db
      .query("quadraticSubscriptions")
      .withIndex("by_issueId", (q) => q.eq("issueId", issue._id))
      .take(200);

    return {
      issue,
      identifier: identifierFor(team, issue),
      comments: commentsWithReactions,
      history,
      relations,
      subscriberIds: subscriptions.map((sub) => sub.userId),
      subscribed: subscriptions.some((sub) => sub.userId === context.viewer._id),
    };
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    teamId: v.id("quadraticTeams"),
    ...issueFieldsValidator,
    title: v.string(),
  },
  returns: v.object({ issueId: v.id("quadraticIssues"), identifier: v.string() }),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    const { token, workspaceId, ...input } = args;
    return await createIssue(ctx, actor, input);
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    issueId: v.id("quadraticIssues"),
    patch: issuePatchValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    await updateIssue(ctx, actor, args.issueId, args.patch);
    return null;
  },
});

export const bulkUpdate = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    issueIds: v.array(v.id("quadraticIssues")),
    patch: issuePatchValidator,
    /** Toggle labels instead of replacing them (multi-select "L" in Linear). */
    addLabelIds: v.optional(v.array(v.id("quadraticLabels"))),
    removeLabelIds: v.optional(v.array(v.id("quadraticLabels"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    if (args.issueIds.length > 250) fail("Select at most 250 issues at a time.");
    for (const issueId of args.issueIds) {
      const patch = { ...args.patch };
      if (args.addLabelIds?.length || args.removeLabelIds?.length) {
        const issue: Doc<"quadraticIssues"> = await getOwned(ctx, "quadraticIssues", issueId, actor, "Issue");
        const next = new Set(issue.labelIds);
        for (const id of args.addLabelIds ?? []) next.add(id);
        for (const id of args.removeLabelIds ?? []) next.delete(id);
        patch.labelIds = [...next];
      }
      await updateIssue(ctx, actor, issueId, patch);
    }
    return null;
  },
});

export const setArchivedState = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    issueIds: v.array(v.id("quadraticIssues")),
    archived: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    if (args.issueIds.length > 250) fail("Select at most 250 issues at a time.");
    for (const issueId of args.issueIds) await setArchived(ctx, actor, issueId, args.archived);
    return null;
  },
});

export const setSubscribed = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    issueId: v.id("quadraticIssues"),
    subscribed: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    await getOwned(ctx, "quadraticIssues", args.issueId, actor, "Issue");
    if (args.subscribed) await subscribe(ctx, args.issueId, actor.userId);
    else await unsubscribe(ctx, args.issueId, actor.userId);
    return null;
  },
});

export const addRelation = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    issueId: v.id("quadraticIssues"),
    relatedIssueId: v.id("quadraticIssues"),
    type: v.union(relationTypeValidator, v.literal("blockedBy")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    if (args.issueId === args.relatedIssueId) fail("An issue can't relate to itself.");
    await getOwned(ctx, "quadraticIssues", args.issueId, actor, "Issue");
    await getOwned(ctx, "quadraticIssues", args.relatedIssueId, actor, "Issue");
    const [from, to, type] =
      args.type === "blockedBy"
        ? [args.relatedIssueId, args.issueId, "blocks" as const]
        : [args.issueId, args.relatedIssueId, args.type];
    const existing = await ctx.db
      .query("quadraticRelations")
      .withIndex("by_issueId", (q) => q.eq("issueId", from))
      .take(100);
    if (existing.some((relation) => relation.relatedIssueId === to)) return null;
    await ctx.db.insert("quadraticRelations", {
      workspaceId: actor.workspaceId,
      issueId: from,
      relatedIssueId: to,
      type,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const removeRelation = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    relationId: v.id("quadraticRelations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    const relation = await ctx.db.get("quadraticRelations", args.relationId);
    if (!relation || relation.workspaceId !== actor.workspaceId) return null;
    await ctx.db.delete("quadraticRelations", relation._id);
    return null;
  },
});

/** Issue ids the viewer subscribes to (the client intersects with its issue list). */
export const subscribedIds = query({
  args: { token: v.string(), workspaceId: v.id("quadraticWorkspaces") },
  handler: async (ctx, args) => {
    const context = await getMemberContext(ctx, args.token, args.workspaceId);
    if (!context) return [];
    const subscriptions = await ctx.db
      .query("quadraticSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", context.viewer._id))
      .take(2000);
    return subscriptions.map((sub) => sub.issueId);
  },
});
