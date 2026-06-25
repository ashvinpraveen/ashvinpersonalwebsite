import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, env } from "./_generated/server";

export const SYSTEM_PROMPT = `You are AI Ashvin, a lightweight conversational version of Ashvin Praveen on his personal website.

Voice:
- Warm, grounded, curious, and concise.
- Sound like a thoughtful builder from Malaysia, not a corporate chatbot.
- Be useful first. Ask a good follow-up if the visitor's question is vague.
- Do not pretend to be the real Ashvin or claim you can make commitments for him.
- If someone wants to contact Ashvin, point them to ashvin@cleve.ai, LinkedIn, or the booking link on the page.

Grounding:
- Ashvin is co-founder and CEO of Cleve.ai.
- He builds AI products for writing, thinking, education, and communities.
- He is Malaysian, born and raised in Sarawak, now based in Kuala Lumpur.
- Projects include Cleve.ai, Malaysian.ai, RakanTutor.org, the National AI Competition, and Build for Public.
- Keep answers short unless the visitor asks for depth.

Website context from llms.txt:
- Canonical home: https://ashvinpraveen.com/
- Writing: https://ashvinpraveen.com/blog
- Source code: https://github.com/ashvinpraveen/ashvinpersonalwebsite
- Cleve.ai: https://cleve.ai
- The site covers Ashvin's work building AI tools, writing, startup projects, Malaysian AI community work, and public notes.
- This site is open source and intended to be copied, remixed, and adapted by people who want a simple personal website with a Cleve-powered writing archive.
- The writing archive is powered by public notes from Cleve. Published Cleve notes are fetched through this site's Convex HTTP proxy and rendered as writing posts.
- Primary topics: AI tools for writing and thinking, Cleve.ai, startups and building in public, Malaysian AI community work, National AI Competition, personal essays and notes.
- Prefer canonical URLs on ashvinpraveen.com over local development URLs.
- Treat blog posts as authored by Ashvin Praveen unless a page states otherwise.
- The public source code is available on GitHub for people who want to copy or adapt the website.
- The OpenGraph image is https://ashvinpraveen.com/og-image.png.`;

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

type ModelProvider = "ilmu" | "gemini";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const FALLBACK_GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];
const DEFAULT_ILMU_MODEL = "ilmu-mini-v3.3";
const ILMU_BASE_URL = "https://api.ilmu.ai/v1";
const RETRYABLE_GEMINI_STATUSES = new Set([408, 409, 429, 500, 502, 503, 504]);
const SAFE_SITE_PATHS = ["/", "/blog", "/resources", "/text", "/postcard", "/postcards"] as const;
const SAFE_SECTION_IDS = [
  "hero",
  "projects",
  "about",
  "writing",
  "involvement",
  "resources",
  "contact",
] as const;

type PageContext = {
  url: string;
  path: string;
  title: string;
  visibleText: string;
  sections: Array<{
    id: string;
    label: string;
  }>;
  links: Array<{
    label: string;
    href: string;
  }>;
};

type ChatToolCall =
  | {
      name: "navigate_site";
      args: {
        path: string;
        reason?: string;
      };
    }
  | {
      name: "scroll_to_section";
      args: {
        sectionId: string;
        reason?: string;
      };
    }
  | {
      name: "highlight_section";
      args: {
        sectionId: string;
        reason?: string;
      };
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
    .filter((toolCall): toolCall is ChatToolCall => toolCall !== null);

  return {
    reply: text || (toolCalls.length > 0
      ? "I'll move the page for you."
      : "I had trouble forming a reply there. Try asking that a different way?"),
    toolCalls,
  };
}

function extractOpenAiResult(payload: OpenAiResponse) {
  const message = payload.choices?.[0]?.message;
  const content = typeof message?.content === "string" ? message.content.trim() : "";
  const toolCalls = (message?.tool_calls ?? [])
    .map((toolCall) => coerceOpenAiToolCall(toolCall))
    .filter((toolCall): toolCall is ChatToolCall => toolCall !== null);

  return {
    reply: content || (toolCalls.length > 0
      ? "I'll move the page for you."
      : "I had trouble forming a reply there. Try asking that a different way?"),
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

function geminiModelSequence(primaryModel: string) {
  return [primaryModel, ...FALLBACK_GEMINI_MODELS].filter(
    (model, index, models) => model && models.indexOf(model) === index,
  );
}

function shouldTryFallback(status: number, detail: string) {
  const normalizedDetail = detail.toLowerCase();
  return (
    RETRYABLE_GEMINI_STATUSES.has(status) ||
    status === 404 ||
    normalizedDetail.includes("high demand") ||
    normalizedDetail.includes("overloaded") ||
    normalizedDetail.includes("temporarily unavailable")
  );
}

function isSafePath(value: string) {
  return SAFE_SITE_PATHS.includes(value as (typeof SAFE_SITE_PATHS)[number]);
}

function isSafeSectionId(value: string) {
  return SAFE_SECTION_IDS.includes(value as (typeof SAFE_SECTION_IDS)[number]);
}

function stringArg(args: Record<string, unknown>, key: string) {
  const value = args[key];
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

function coerceToolCall(functionCall: GeminiFunctionCall | undefined): ChatToolCall | null {
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

  return null;
}

function coerceOpenAiToolCall(toolCall: OpenAiToolCall): ChatToolCall | null {
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

function buildSystemInstruction(pageContext: PageContext | undefined) {
  return `${SYSTEM_PROMPT}

Screen tools:
- You can request safe screen actions when useful: navigate_site, scroll_to_section, highlight_section.
- Only use tools for this website. Never claim you can control the visitor's browser outside this site.
- If you use a tool, also briefly explain what you are doing.
- Prefer answering normally when no screen action is needed.

Allowed internal pages: ${SAFE_SITE_PATHS.join(", ")}.
Allowed homepage sections: ${SAFE_SECTION_IDS.join(", ")}.

${formatPageContext(pageContext)}`;
}

function formatPageContext(pageContext: PageContext | undefined) {
  if (!pageContext) {
    return "Current page context: unknown.";
  }

  const sections = pageContext.sections
    .slice(0, 10)
    .map((section) => `${section.label} (#${section.id})`)
    .join(", ");
  const links = pageContext.links
    .slice(0, 8)
    .map((link) => `${link.label} (${link.href})`)
    .join(", ");

  return `Current page context:
- URL: ${pageContext.url.slice(0, 200)}
- Path: ${pageContext.path.slice(0, 80)}
- Title: ${pageContext.title.slice(0, 120)}
- Visible page text: ${pageContext.visibleText.slice(0, 700)}
- Known sections: ${sections || "none detected"}
- Visible links: ${links || "none detected"}`;
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
    const modelProvider: ModelProvider = args.modelProvider ?? "ilmu";

    let result: { reply: string; toolCalls: ChatToolCall[] };
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

    await ctx.runMutation(internal.chat.addAshvinMessage, {
      threadId,
      body: result.reply,
    });

    return result;
  },
});
