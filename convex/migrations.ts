import { Migrations } from "@convex-dev/migrations";
import { createThread, saveMessage } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { internalMutation } from "./_generated/server";

export const migrations = new Migrations(components.migrations, {
  internalMutation,
  defaultBatchSize: 10,
});

export const backfillAgentChatThreads = migrations.define({
  table: "chatThreads",
  migrateOne: async (ctx, thread) => {
    if (thread.agentThreadId) return;

    const agentThreadId = await createThread(ctx, components.agent, {
      userId: `browser:${thread.clientId}`,
      title: thread.title ?? "Website chat",
    });

    const legacyMessages = await ctx.db
      .query("chatMessages")
      .withIndex("by_threadId_and_createdAt", (q) => q.eq("threadId", thread._id))
      .order("asc")
      .take(200);

    for (const message of legacyMessages) {
      await saveMessage(ctx, components.agent, {
        threadId: agentThreadId,
        userId: `browser:${thread.clientId}`,
        agentName: "ashvin-site-chat",
        message: {
          role: message.author === "visitor" ? "user" : "assistant",
          content: message.body,
        },
      });
    }

    await ctx.db.patch(thread._id, { agentThreadId });
  },
});

export const run = migrations.runner();
