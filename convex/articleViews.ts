import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const record = mutation({
  args: { articleId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("articleViews")
      .withIndex("by_articleId", (q) => q.eq("articleId", args.articleId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { views: existing.views + 1 });
    } else {
      await ctx.db.insert("articleViews", { articleId: args.articleId, views: 1 });
    }
  },
});

export const get = query({
  args: { articleId: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("articleViews")
      .withIndex("by_articleId", (q) => q.eq("articleId", args.articleId))
      .unique();

    return record?.views ?? 0;
  },
});

export const getBatch = query({
  args: { articleIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const result: Record<string, number> = {};
    for (const articleId of args.articleIds) {
      const record = await ctx.db
        .query("articleViews")
        .withIndex("by_articleId", (q) => q.eq("articleId", articleId))
        .unique();
      result[articleId] = record?.views ?? 0;
    }
    return result;
  },
});
