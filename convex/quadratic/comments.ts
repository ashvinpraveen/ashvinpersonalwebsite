import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { fail, getOwned, requireMember } from "./access";
import { addComment, notify } from "./model";

const ALLOWED_REACTIONS = new Set(["👍", "👎", "❤️", "🎉", "😄", "😕", "👀", "🚀", "🔥", "✅"]);

export const create = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    issueId: v.id("quadraticIssues"),
    body: v.string(),
    parentId: v.optional(v.id("quadraticComments")),
  },
  returns: v.id("quadraticComments"),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    return await addComment(ctx, actor, args.issueId, args.body, args.parentId);
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    commentId: v.id("quadraticComments"),
    body: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    const comment = await getOwned(ctx, "quadraticComments", args.commentId, actor, "Comment");
    if (comment.authorId !== actor.userId) fail("You can only edit your own comments.");
    const body = args.body.trim();
    if (!body) fail("Comment can't be empty.");
    if (body.length > 20_000) fail("Comment is too long.");
    await ctx.db.patch("quadraticComments", comment._id, { body, editedAt: Date.now() });
    return null;
  },
});

export const remove = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    commentId: v.id("quadraticComments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor, member } = await requireMember(ctx, args.token, args.workspaceId);
    const comment = await getOwned(ctx, "quadraticComments", args.commentId, actor, "Comment");
    if (comment.authorId !== actor.userId && member.role !== "admin") {
      fail("You can only delete your own comments.");
    }
    const reactions = await ctx.db
      .query("quadraticReactions")
      .withIndex("by_commentId", (q) => q.eq("commentId", comment._id))
      .take(500);
    for (const reaction of reactions) await ctx.db.delete("quadraticReactions", reaction._id);
    await ctx.db.delete("quadraticComments", comment._id);
    return null;
  },
});

export const toggleReaction = mutation({
  args: {
    token: v.string(),
    workspaceId: v.id("quadraticWorkspaces"),
    commentId: v.id("quadraticComments"),
    emoji: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { actor } = await requireMember(ctx, args.token, args.workspaceId);
    if (!ALLOWED_REACTIONS.has(args.emoji)) fail("Unsupported reaction.");
    const comment = await getOwned(ctx, "quadraticComments", args.commentId, actor, "Comment");
    const existing = await ctx.db
      .query("quadraticReactions")
      .withIndex("by_commentId_and_userId_and_emoji", (q) =>
        q.eq("commentId", comment._id).eq("userId", actor.userId).eq("emoji", args.emoji),
      )
      .unique();
    if (existing) {
      await ctx.db.delete("quadraticReactions", existing._id);
      return null;
    }
    await ctx.db.insert("quadraticReactions", {
      commentId: comment._id,
      userId: actor.userId,
      emoji: args.emoji,
      createdAt: Date.now(),
    });
    await notify(ctx, actor, [comment.authorId], {
      kind: "reaction",
      issueId: comment.issueId,
      commentId: comment._id,
      body: args.emoji,
    });
    return null;
  },
});
