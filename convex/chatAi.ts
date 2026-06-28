import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, env } from "./_generated/server";
import {
  bookingFallbackReply,
  DEFAULT_CAL_TIME_ZONE,
  handleBookingToolCall,
} from "./lib/chatAiBooking";
import type { BookingToolCall } from "./lib/chatAiTypes";
import {
  buildSystemInstruction,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_ILMU_MODEL,
  geminiModelSequence,
  getModelProvider,
  ILMU_BASE_URL,
  isBookingToolCall,
  isSafePath,
  isSafeSectionId,
  isScreenToolCall,
  longStringArg,
  SAFE_SECTION_IDS,
  SAFE_SITE_PATHS,
  shouldTryFallback,
  stringArg,
  type ChatToolCall,
  type ModelProvider,
  type ModelToolCall,
  type PageContext,
} from "./lib/chatAiShared";

type GeminiContent = {
  role: "user" | "model";
  parts: Array<
    | { text: string }
    | {
        functionCall: {
          name: string;
          args: Record<string, unknown>;
        };
      }
    | {
        inlineData: {
          mimeType: string;
          data: string;
        };
      }
  >;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: unknown;
        functionCall?: {
          name?: unknown;
          args?: unknown;
        };
      }>;
    };
  }>;
};

type GeminiErrorResponse = {
  error?: {
    message?: unknown;
  };
};

type OpenAiContentPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image_url";
      image_url: {
        url: string;
      };
    };

type OpenAiMessage = {
  role: "system" | "user" | "assistant";
  content: string | OpenAiContentPart[];
};

type OpenAiToolCall = {
  function?: {
    name?: unknown;
    arguments?: unknown;
  };
};

type OpenAiResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
      tool_calls?: OpenAiToolCall[];
    };
  }>;
};

type OpenAiErrorResponse = {
  error?: {
    message?: unknown;
  };
};

type GeminiFunctionCall = {
  name?: unknown;
  args?: unknown;
};

const screenTools = [
  {
    functionDeclarations: [
      {
        name: "navigate_site",
        description:
          "Navigate the visitor to another internal page on Ashvin's website. Use only when it directly helps answer the visitor.",
        parameters: {
          type: "OBJECT",
          properties: {
            path: {
              type: "STRING",
              description: "One of /, /blog, /resources, /text, /postcard, or /postcards.",
            },
            reason: {
              type: "STRING",
              description: "Short visitor-facing reason for the navigation.",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "scroll_to_section",
        description:
          "Scroll the current page to a known section. Works best on the homepage.",
        parameters: {
          type: "OBJECT",
          properties: {
            sectionId: {
              type: "STRING",
              description:
                "One of hero, projects, about, writing, involvement, resources, or contact.",
            },
            reason: {
              type: "STRING",
              description: "Short visitor-facing reason for the scroll.",
            },
          },
          required: ["sectionId"],
        },
      },
      {
        name: "highlight_section",
        description:
          "Briefly highlight a known section after navigating or scrolling to it.",
        parameters: {
          type: "OBJECT",
          properties: {
            sectionId: {
              type: "STRING",
              description:
                "One of hero, projects, about, writing, involvement, resources, or contact.",
            },
            reason: {
              type: "STRING",
              description: "Short visitor-facing reason for the highlight.",
            },
          },
          required: ["sectionId"],
        },
      },
      {
        name: "check_booking_availability",
        description:
          "Check Ashvin's Cal.com availability when a visitor wants to book time. Use this before trying to create a booking, and when the visitor asks for available times.",
        parameters: {
          type: "OBJECT",
          properties: {
            dateFrom: {
              type: "STRING",
              description:
                "Start of the search window as an ISO 8601 UTC date/time or YYYY-MM-DD date.",
            },
            dateTo: {
              type: "STRING",
              description:
                "End of the search window as an ISO 8601 UTC date/time or YYYY-MM-DD date.",
            },
            timeZone: {
              type: "STRING",
              description:
                "The visitor's IANA timezone, e.g. Asia/Kuala_Lumpur or America/New_York.",
            },
            preferredStart: {
              type: "STRING",
              description:
                "Optional preferred start time as ISO 8601 when the visitor asked for a specific time.",
            },
          },
          required: ["dateFrom", "dateTo", "timeZone"],
        },
      },
      {
        name: "create_calendar_booking",
        description:
          "Create a Cal.com booking only after availability was offered and the visitor explicitly confirms one slot. Requires the visitor's real name, email, timezone, and the exact ISO start time.",
        parameters: {
          type: "OBJECT",
          properties: {
            start: {
              type: "STRING",
              description:
                "The exact confirmed slot start time as an ISO 8601 date/time, preferably UTC.",
            },
            attendeeName: {
              type: "STRING",
              description: "The visitor's name.",
            },
            attendeeEmail: {
              type: "STRING",
              description: "The visitor's email address.",
            },
            attendeeTimeZone: {
              type: "STRING",
              description: "The visitor's IANA timezone.",
            },
            notes: {
              type: "STRING",
              description: "Short notes about what the visitor wants to discuss.",
            },
          },
          required: ["start", "attendeeName", "attendeeEmail", "attendeeTimeZone"],
        },
      },
    ],
  },
];

const openAiScreenTools = [
  {
    type: "function",
    function: {
      name: "navigate_site",
      description:
        "Navigate the visitor to another internal page on Ashvin's website. Use only when it directly helps answer the visitor.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "One of /, /blog, /resources, /text, /postcard, or /postcards.",
          },
          reason: {
            type: "string",
            description: "Short visitor-facing reason for the navigation.",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scroll_to_section",
      description:
        "Scroll the current page to a known section. Works best on the homepage.",
      parameters: {
        type: "object",
        properties: {
          sectionId: {
            type: "string",
            description:
              "One of hero, projects, about, writing, involvement, resources, or contact.",
          },
          reason: {
            type: "string",
            description: "Short visitor-facing reason for the scroll.",
          },
        },
        required: ["sectionId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "highlight_section",
      description:
        "Briefly highlight a known section after navigating or scrolling to it.",
      parameters: {
        type: "object",
        properties: {
          sectionId: {
            type: "string",
            description:
              "One of hero, projects, about, writing, involvement, resources, or contact.",
          },
          reason: {
            type: "string",
            description: "Short visitor-facing reason for the highlight.",
          },
        },
        required: ["sectionId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_booking_availability",
      description:
        "Check Ashvin's Cal.com availability when a visitor wants to book time. Use this before trying to create a booking, and when the visitor asks for available times.",
      parameters: {
        type: "object",
        properties: {
          dateFrom: {
            type: "string",
            description:
              "Start of the search window as an ISO 8601 UTC date/time or YYYY-MM-DD date.",
          },
          dateTo: {
            type: "string",
            description:
              "End of the search window as an ISO 8601 UTC date/time or YYYY-MM-DD date.",
          },
          timeZone: {
            type: "string",
            description:
              "The visitor's IANA timezone, e.g. Asia/Kuala_Lumpur or America/New_York.",
          },
          preferredStart: {
            type: "string",
            description:
              "Optional preferred start time as ISO 8601 when the visitor asked for a specific time.",
          },
        },
        required: ["dateFrom", "dateTo", "timeZone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_calendar_booking",
      description:
        "Create a Cal.com booking only after availability was offered and the visitor explicitly confirms one slot. Requires the visitor's real name, email, timezone, and the exact ISO start time.",
      parameters: {
        type: "object",
        properties: {
          start: {
            type: "string",
            description:
              "The exact confirmed slot start time as an ISO 8601 date/time, preferably UTC.",
          },
          attendeeName: {
            type: "string",
            description: "The visitor's name.",
          },
          attendeeEmail: {
            type: "string",
            description: "The visitor's email address.",
          },
          attendeeTimeZone: {
            type: "string",
            description: "The visitor's IANA timezone.",
          },
          notes: {
            type: "string",
            description: "Short notes about what the visitor wants to discuss.",
          },
        },
        required: ["start", "attendeeName", "attendeeEmail", "attendeeTimeZone"],
      },
    },
  },
];

function extractGeminiResult(payload: GeminiResponse) {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    ?.map((part) => part.text)
    .filter((text): text is string => typeof text === "string")
    .join("\n")
    .trim();
  const toolCalls = parts
    .map((part) => coerceToolCall(part.functionCall))
    .filter((toolCall): toolCall is ModelToolCall => toolCall !== null);

  return {
    reply: text || (toolCalls.length > 0
      ? "i'll move the page for you."
      : "i had trouble forming a reply there. try asking that a different way?"),
    toolCalls,
  };
}

function extractOpenAiResult(payload: OpenAiResponse) {
  const message = payload.choices?.[0]?.message;
  const content = typeof message?.content === "string" ? message.content.trim() : "";
  const toolCalls = (message?.tool_calls ?? [])
    .map((toolCall) => coerceOpenAiToolCall(toolCall))
    .filter((toolCall): toolCall is ModelToolCall => toolCall !== null);

  return {
    reply: content || (toolCalls.length > 0
      ? "i'll move the page for you."
      : "i had trouble forming a reply there. try asking that a different way?"),
    toolCalls,
  };
}

async function readGeminiError(response: Response) {
  try {
    const payload = (await response.json()) as GeminiErrorResponse;
    if (typeof payload.error?.message === "string") {
      return payload.error.message.slice(0, 160);
    }
  } catch {
    // Fall through to the generic status text below.
  }

  return response.statusText || "Unknown error";
}

async function readOpenAiError(response: Response) {
  try {
    const payload = (await response.json()) as OpenAiErrorResponse;
    if (typeof payload.error?.message === "string") {
      return payload.error.message.slice(0, 160);
    }
  } catch {
    // Fall through to the generic status text below.
  }

  return response.statusText || "Unknown error";
}

function coerceToolCall(functionCall: GeminiFunctionCall | undefined): ModelToolCall | null {
  if (!functionCall || typeof functionCall.name !== "string") return null;
  const args =
    functionCall.args && typeof functionCall.args === "object" && !Array.isArray(functionCall.args)
      ? (functionCall.args as Record<string, unknown>)
      : {};
  const reason = stringArg(args, "reason") || undefined;

  if (functionCall.name === "navigate_site") {
    const path = stringArg(args, "path");
    if (!isSafePath(path)) return null;
    return { name: "navigate_site", args: { path, reason } };
  }

  if (functionCall.name === "scroll_to_section") {
    const sectionId = stringArg(args, "sectionId");
    if (!isSafeSectionId(sectionId)) return null;
    return { name: "scroll_to_section", args: { sectionId, reason } };
  }

  if (functionCall.name === "highlight_section") {
    const sectionId = stringArg(args, "sectionId");
    if (!isSafeSectionId(sectionId)) return null;
    return { name: "highlight_section", args: { sectionId, reason } };
  }

  if (functionCall.name === "check_booking_availability") {
    const dateFrom = stringArg(args, "dateFrom");
    const dateTo = stringArg(args, "dateTo");
    const timeZone = stringArg(args, "timeZone") || DEFAULT_CAL_TIME_ZONE;
    const preferredStart = stringArg(args, "preferredStart") || undefined;
    if (!dateFrom || !dateTo) return null;
    return {
      name: "check_booking_availability",
      args: {
        dateFrom,
        dateTo,
        timeZone,
        preferredStart,
      },
    };
  }

  if (functionCall.name === "create_calendar_booking") {
    const start = stringArg(args, "start");
    const attendeeName = stringArg(args, "attendeeName");
    const attendeeEmail = stringArg(args, "attendeeEmail");
    const attendeeTimeZone = stringArg(args, "attendeeTimeZone") || DEFAULT_CAL_TIME_ZONE;
    const notes = longStringArg(args, "notes") || undefined;
    if (!start || !attendeeName || !attendeeEmail) return null;
    return {
      name: "create_calendar_booking",
      args: {
        start,
        attendeeName,
        attendeeEmail,
        attendeeTimeZone,
        notes,
      },
    };
  }

  return null;
}

function coerceOpenAiToolCall(toolCall: OpenAiToolCall): ModelToolCall | null {
  const name = toolCall.function?.name;
  const rawArguments = toolCall.function?.arguments;
  if (typeof name !== "string") return null;

  let args: Record<string, unknown> = {};
  if (typeof rawArguments === "string") {
    try {
      const parsedArguments = JSON.parse(rawArguments) as unknown;
      if (
        parsedArguments &&
        typeof parsedArguments === "object" &&
        !Array.isArray(parsedArguments)
      ) {
        args = parsedArguments as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  } else if (rawArguments && typeof rawArguments === "object" && !Array.isArray(rawArguments)) {
    args = rawArguments as Record<string, unknown>;
  }

  return coerceToolCall({ name, args });
}

function toGeminiContents(
  messages: Array<{
    author: "visitor" | "ashvin";
    body: string;
  }>,
  images: Array<{
    data: string;
    mimeType: string;
  }>,
): GeminiContent[] {
  const contents: GeminiContent[] = messages.map((message) => ({
    role: message.author === "ashvin" ? "model" : "user",
    parts: [{ text: message.body }],
  }));

  if (images.length > 0) {
    const lastVisitorMessage = [...contents].reverse().find((message) => message.role === "user");
    lastVisitorMessage?.parts.push(
      ...images.map((image) => ({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data,
        },
      })),
    );
  }

  return contents;
}

function toOpenAiMessages(
  messages: Array<{
    author: "visitor" | "ashvin";
    body: string;
  }>,
  images: Array<{
    data: string;
    mimeType: string;
  }>,
  systemInstruction: string,
): OpenAiMessage[] {
  const openAiMessages: OpenAiMessage[] = [
    {
      role: "system",
      content: systemInstruction,
    },
    ...messages.map((message) => ({
      role: message.author === "ashvin" ? "assistant" as const : "user" as const,
      content: message.body,
    })),
  ];

  if (images.length > 0) {
    const lastUserMessage = [...openAiMessages].reverse().find((message) => message.role === "user");
    if (lastUserMessage) {
      const text =
        typeof lastUserMessage.content === "string"
          ? lastUserMessage.content
          : lastUserMessage.content
              .filter((part): part is { type: "text"; text: string } => part.type === "text")
              .map((part) => part.text)
              .join("\n");
      lastUserMessage.content = [
        { type: "text", text },
        ...images.map((image) => ({
          type: "image_url" as const,
          image_url: {
            url: `data:${image.mimeType};base64,${image.data}`,
          },
        })),
      ];
    }
  }

  return openAiMessages;
}

async function callIlmu(
  apiKey: string,
  messages: Array<{
    author: "visitor" | "ashvin";
    body: string;
  }>,
  images: Array<{
    data: string;
    mimeType: string;
  }>,
  pageContext: PageContext | undefined,
) {
  const response = await fetch(`${ILMU_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.ILMU_MODEL ?? DEFAULT_ILMU_MODEL,
      messages: toOpenAiMessages(messages, images, buildSystemInstruction(pageContext)),
      tools: openAiScreenTools,
      max_tokens: 420,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const detail = await readOpenAiError(response);
    throw new Error(`AI Ashvin could not reply right now. ${detail}`);
  }

  const payload = (await response.json()) as OpenAiResponse;
  return extractOpenAiResult(payload);
}

async function callGemini(
  apiKey: string,
  messages: Array<{
    author: "visitor" | "ashvin";
    body: string;
  }>,
  images: Array<{
    data: string;
    mimeType: string;
  }>,
  pageContext: PageContext | undefined,
) {
  const contents = toGeminiContents(messages, images);
  const requestBody = JSON.stringify({
    systemInstruction: {
      parts: [
        {
          text: buildSystemInstruction(pageContext),
        },
      ],
    },
    contents,
    tools: screenTools,
    generationConfig: {
      maxOutputTokens: 420,
      temperature: 0.7,
    },
  });
  const models = geminiModelSequence(env.GOOGLE_AI_MODEL ?? DEFAULT_GEMINI_MODEL);
  let lastErrorDetail = "The model provider did not return a usable response.";

  for (const model of models) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: requestBody,
      },
    );

    if (response.ok) {
      const payload = (await response.json()) as GeminiResponse;
      return extractGeminiResult(payload);
    }

    const detail = await readGeminiError(response);
    lastErrorDetail = detail;
    console.warn(`Gemini model ${model} failed with ${response.status}: ${detail}`);

    if (!shouldTryFallback(response.status, detail)) {
      break;
    }
  }

  throw new Error(`AI Ashvin could not reply right now. ${lastErrorDetail}`);
}

export const send = action({
  args: {
    clientId: v.string(),
    threadId: v.optional(v.id("chatThreads")),
    body: v.string(),
    modelProvider: v.optional(v.union(v.literal("ilmu"), v.literal("gemini"))),
    pageContext: v.optional(
      v.object({
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
      }),
    ),
    images: v.optional(
      v.array(
        v.object({
          data: v.string(),
          mimeType: v.union(v.literal("image/jpeg"), v.literal("image/png"), v.literal("image/webp")),
        }),
      ),
    ),
  },
  handler: async (ctx, args): Promise<{ reply: string; toolCalls: ChatToolCall[] }> => {
    const threadId = await ctx.runMutation(internal.chat.reserveVisitorMessage, {
      clientId: args.clientId,
      threadId: args.threadId,
      body: args.body,
    });
    const recentMessages = await ctx.runQuery(internal.chat.getRecentMessages, { threadId });
    const images = (args.images ?? []).slice(0, 3).filter((image) => image.data);
    const modelProvider: ModelProvider = getModelProvider(args.modelProvider);

    let result: { reply: string; toolCalls: ModelToolCall[] };
    if (modelProvider === "gemini") {
      const googleApiKey = env.GOOGLE_AI_API_KEY;
      if (!googleApiKey) {
        throw new Error("Gemini chat is not configured yet.");
      }
      result = await callGemini(googleApiKey, recentMessages, images, args.pageContext);
    } else {
      const ilmuApiKey = env.ILMU_API_KEY;
      if (!ilmuApiKey) {
        throw new Error("Ilmu chat is not configured yet.");
      }
      result = await callIlmu(ilmuApiKey, recentMessages, images, args.pageContext);
    }

    const screenToolCalls = result.toolCalls.filter(isScreenToolCall);
    const bookingToolCall = result.toolCalls.find(isBookingToolCall);
    let reply = result.reply;

    if (bookingToolCall) {
      try {
        reply = await handleBookingToolCall(bookingToolCall, recentMessages, args.body);
      } catch (error) {
        console.warn(
          "Cal.com booking flow failed:",
          error instanceof Error ? error.message : "Unknown error",
        );
        reply = bookingFallbackReply();
      }
    }

    await ctx.runMutation(internal.chat.addAshvinMessage, {
      threadId,
      body: reply,
    });

    return {
      reply,
      toolCalls: screenToolCalls,
    };
  },
});
