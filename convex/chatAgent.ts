import { Agent, createTool, listUIMessages, stepCountIs, syncStreams, vStreamArgs } from "@convex-dev/agent";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ModelMessage } from "ai";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { z } from "zod";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, env, query, type ActionCtx } from "./_generated/server";
import { isAdmin } from "./adminAuth";
import {
  bookingFallbackReply,
  DEFAULT_CAL_TIME_ZONE,
  handleBookingToolCall,
} from "./lib/chatAiBooking";
import {
  buildSystemInstruction,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_ILMU_MODEL,
  getModelProvider,
  ILMU_BASE_URL,
  isSafePath,
  isSafeSectionId,
  type ModelProvider,
  type PageContext,
} from "./lib/chatAiShared";

const AGENT_NAME = "ashvin-site-chat";
const MAX_IMAGE_ATTACHMENTS = 3;

const pageContextValidator = v.object({
  url: v.string(),
  path: v.string(),
  title: v.string(),
  timeZone: v.optional(v.string()),
  visibleText: v.string(),
  sections: v.array(
    v.object({
      id: v.string(),
      label: v.string(),
    }),
  ),
  links: v.array(
    v.object({
      label: v.string(),
      href: v.string(),
    }),
  ),
});

const imageValidator = v.object({
  data: v.string(),
  mimeType: v.union(v.literal("image/jpeg"), v.literal("image/png"), v.literal("image/webp")),
});

const screenToolOutputSchema = z.object({
  kind: z.literal("screen_action"),
  name: z.enum(["navigate_site", "scroll_to_section", "highlight_section"]),
  args: z.record(z.string(), z.unknown()),
});

const chatTools = {
  navigate_site: createTool({
    description:
      "Navigate the visitor to another internal page on Ashvin's website. Use only when it directly helps answer the visitor.",
    inputSchema: z.object({
      path: z.string().describe("One of /, /blog, /resources, /text, /postcard, or /postcards."),
      reason: z.string().optional().describe("Short visitor-facing reason for the navigation."),
    }),
    outputSchema: screenToolOutputSchema,
    execute: async (_ctx, input) => {
      if (!isSafePath(input.path)) {
        return {
          kind: "screen_action" as const,
          name: "navigate_site" as const,
          args: { path: "/", reason: "that page isn't available from here." },
        };
      }

      return {
        kind: "screen_action" as const,
        name: "navigate_site" as const,
        args: {
          path: input.path,
          reason: input.reason,
        },
      };
    },
  }),
  scroll_to_section: createTool({
    description: "Scroll the current page to a known section. Works best on the homepage.",
    inputSchema: z.object({
      sectionId: z.string().describe("One of hero, projects, about, writing, involvement, resources, or contact."),
      reason: z.string().optional().describe("Short visitor-facing reason for the scroll."),
    }),
    outputSchema: screenToolOutputSchema,
    execute: async (_ctx, input) => {
      if (!isSafeSectionId(input.sectionId)) {
        return {
          kind: "screen_action" as const,
          name: "scroll_to_section" as const,
          args: { sectionId: "hero", reason: "i'll keep you on the main page." },
        };
      }

      return {
        kind: "screen_action" as const,
        name: "scroll_to_section" as const,
        args: {
          sectionId: input.sectionId,
          reason: input.reason,
        },
      };
    },
  }),
  highlight_section: createTool({
    description: "Briefly highlight a known section after navigating or scrolling to it.",
    inputSchema: z.object({
      sectionId: z.string().describe("One of hero, projects, about, writing, involvement, resources, or contact."),
      reason: z.string().optional().describe("Short visitor-facing reason for the highlight."),
    }),
    outputSchema: screenToolOutputSchema,
    execute: async (_ctx, input) => {
      if (!isSafeSectionId(input.sectionId)) {
        return {
          kind: "screen_action" as const,
          name: "highlight_section" as const,
          args: { sectionId: "hero", reason: "i'll point to the main intro." },
        };
      }

      return {
        kind: "screen_action" as const,
        name: "highlight_section" as const,
        args: {
          sectionId: input.sectionId,
          reason: input.reason,
        },
      };
    },
  }),
  check_booking_availability: createTool({
    description:
      "Check Ashvin's Cal.com availability when a visitor wants to book time. Use this before trying to create a booking, and when the visitor asks for available times.",
    inputSchema: z.object({
      dateFrom: z.string().describe("Start of the search window as an ISO 8601 UTC date/time or YYYY-MM-DD date."),
      dateTo: z.string().describe("End of the search window as an ISO 8601 UTC date/time or YYYY-MM-DD date."),
      timeZone: z.string().default(DEFAULT_CAL_TIME_ZONE).describe("The visitor's IANA timezone."),
      preferredStart: z.string().optional().describe("Optional preferred start time as ISO 8601."),
    }),
    outputSchema: z.string(),
    execute: async (_ctx, input, options) => {
      try {
        return await handleBookingToolCall(
          {
            name: "check_booking_availability",
            args: input,
          },
          toLegacyMessages(options.messages),
          latestVisitorBody(options.messages),
        );
      } catch (error) {
        console.warn(
          "Cal.com availability flow failed:",
          error instanceof Error ? error.message : "Unknown error",
        );
        return bookingFallbackReply();
      }
    },
  }),
  create_calendar_booking: createTool({
    description:
      "Create a Cal.com booking only after availability was offered and the visitor explicitly confirms one slot. Requires the visitor's real name, email, timezone, and the exact ISO start time.",
    inputSchema: z.object({
      start: z.string().describe("The exact confirmed slot start time as an ISO 8601 date/time, preferably UTC."),
      attendeeName: z.string().describe("The visitor's name."),
      attendeeEmail: z.string().email().describe("The visitor's email address."),
      attendeeTimeZone: z.string().default(DEFAULT_CAL_TIME_ZONE).describe("The visitor's IANA timezone."),
      notes: z.string().optional().describe("Short notes about what the visitor wants to discuss."),
    }),
    outputSchema: z.string(),
    execute: async (_ctx, input, options) => {
      try {
        return await handleBookingToolCall(
          {
            name: "create_calendar_booking",
            args: input,
          },
          toLegacyMessages(options.messages),
          latestVisitorBody(options.messages),
        );
      } catch (error) {
        console.warn(
          "Cal.com booking flow failed:",
          error instanceof Error ? error.message : "Unknown error",
        );
        return bookingFallbackReply();
      }
    },
  }),
};

function languageModelFor(provider: ModelProvider) {
  if (provider === "gemini") {
    const apiKey = env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini chat is not configured yet.");
    }
    const google = createGoogleGenerativeAI({ apiKey });
    return google(env.GOOGLE_AI_MODEL ?? DEFAULT_GEMINI_MODEL);
  }

  const apiKey = env.ILMU_API_KEY;
  if (!apiKey) {
    throw new Error("Ilmu chat is not configured yet.");
  }

  const ilmu = createOpenAICompatible({
    name: "ilmu",
    baseURL: ILMU_BASE_URL,
    apiKey,
  });
  return ilmu(env.ILMU_MODEL ?? DEFAULT_ILMU_MODEL);
}

function createSiteAgent(provider: ModelProvider, pageContext: PageContext | undefined) {
  return new Agent(components.agent, {
    name: AGENT_NAME,
    instructions: buildSystemInstruction(pageContext),
    languageModel: languageModelFor(provider),
    tools: chatTools,
    stopWhen: stepCountIs(3),
  });
}

function messageText(message: ModelMessage) {
  if (typeof message.content === "string") return message.content;
  if (!Array.isArray(message.content)) return "";
  return message.content
    .map((part) => ("text" in part && typeof part.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n");
}

function toLegacyMessages(messages: ModelMessage[]) {
  return messages
    .map((message) => {
      if (message.role === "user") {
        return { author: "visitor" as const, body: messageText(message) };
      }
      if (message.role === "assistant") {
        return { author: "ashvin" as const, body: messageText(message) };
      }
      return null;
    })
    .filter((message): message is { author: "visitor" | "ashvin"; body: string } =>
      Boolean(message?.body),
    );
}

function latestVisitorBody(messages: ModelMessage[]) {
  const latest = [...messages].reverse().find((message) => message.role === "user");
  return latest ? messageText(latest) : "";
}

async function getThread(ctx: ActionCtx, threadId: Id<"chatThreads">) {
  const thread: { agentThreadId?: string; clientId: string; title?: string } | null =
    await ctx.runQuery(internal.chat.getThreadForAgent, { threadId });
  if (!thread) {
    throw new Error("Chat thread not found.");
  }
  return thread;
}

async function ensureAgentThread(
  ctx: ActionCtx,
  appThreadId: Id<"chatThreads">,
  appThread: { agentThreadId?: string; title?: string },
  clientId: string,
  provider: ModelProvider,
  pageContext: PageContext | undefined,
) {
  if (appThread.agentThreadId) {
    return appThread.agentThreadId;
  }

  const siteAgent = createSiteAgent(provider, pageContext);
  const { threadId: agentThreadId } = await siteAgent.createThread(ctx, {
    userId: `browser:${clientId}`,
    title: appThread.title,
  });
  await ctx.runMutation(internal.chat.setAgentThreadId, {
    threadId: appThreadId,
    agentThreadId,
  });
  return agentThreadId;
}

function buildPrompt(
  body: string,
  images: Array<{
    data: string;
    mimeType: string;
  }>,
): string | ModelMessage[] {
  if (images.length === 0) return body;

  return [
    {
      role: "user" as const,
      content: [
        {
          type: "text" as const,
          text: body,
        },
        ...images.map((image) => ({
          type: "image" as const,
          image: `data:${image.mimeType};base64,${image.data}`,
          mimeType: image.mimeType,
        })),
      ],
    },
  ];
}

export const send = action({
  args: {
    clientId: v.string(),
    threadId: v.optional(v.id("chatThreads")),
    body: v.string(),
    modelProvider: v.optional(v.union(v.literal("ilmu"), v.literal("gemini"))),
    pageContext: v.optional(pageContextValidator),
    images: v.optional(v.array(imageValidator)),
  },
  handler: async (ctx, args): Promise<{ threadId: Id<"chatThreads">; agentThreadId: string }> => {
    const provider = getModelProvider(args.modelProvider);
    const appThreadId = await ctx.runMutation(internal.chat.reserveVisitorMessage, {
      clientId: args.clientId,
      threadId: args.threadId,
      body: args.body,
    });
    const appThread = await getThread(ctx, appThreadId);
    const agentThreadId = await ensureAgentThread(
      ctx,
      appThreadId,
      appThread,
      args.clientId,
      provider,
      args.pageContext,
    );
    const siteAgent = createSiteAgent(provider, args.pageContext);
    const images = (args.images ?? []).slice(0, MAX_IMAGE_ATTACHMENTS).filter((image) => image.data);

    await siteAgent.streamText(
      ctx,
      {
        userId: `browser:${args.clientId}`,
        threadId: agentThreadId,
      },
      {
        prompt: buildPrompt(args.body, images),
        maxOutputTokens: 420,
        temperature: 0.7,
      },
      {
        saveStreamDeltas: {
          returnImmediately: true,
          chunking: "word",
          throttleMs: 150,
        },
        storageOptions: {
          saveMessages: "all",
        },
      },
    );

    return { threadId: appThreadId, agentThreadId };
  },
});

export const getForClient = query({
  args: {
    clientId: v.string(),
    threadId: v.id("chatThreads"),
    paginationOpts: paginationOptsValidator,
    streamArgs: v.optional(vStreamArgs),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.clientId !== args.clientId || !thread.agentThreadId) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
        streams: undefined,
      };
    }

    const paginated = await listUIMessages(ctx, components.agent, {
      threadId: thread.agentThreadId,
      paginationOpts: args.paginationOpts,
    });
    const streams = await syncStreams(ctx, components.agent, {
      threadId: thread.agentThreadId,
      streamArgs: args.streamArgs,
    });

    return { ...paginated, streams };
  },
});

export const getForAdmin = query({
  args: {
    adminSecret: v.string(),
    threadId: v.id("chatThreads"),
    paginationOpts: paginationOptsValidator,
    streamArgs: v.optional(vStreamArgs),
  },
  handler: async (ctx, args) => {
    if (!isAdmin(args.adminSecret)) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
        streams: undefined,
      };
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread?.agentThreadId) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
        streams: undefined,
      };
    }

    const paginated = await listUIMessages(ctx, components.agent, {
      threadId: thread.agentThreadId,
      paginationOpts: args.paginationOpts,
    });
    const streams = await syncStreams(ctx, components.agent, {
      threadId: thread.agentThreadId,
      streamArgs: args.streamArgs,
    });

    return { ...paginated, streams };
  },
});
