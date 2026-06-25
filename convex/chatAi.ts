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
      }>;
    };
  }>;
};

type GeminiErrorResponse = {
  error?: {
    message?: unknown;
  };
};

function extractGeminiText(payload: GeminiResponse) {
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter((text): text is string => typeof text === "string")
    .join("\n")
    .trim();

  return text || "I had trouble forming a reply there. Try asking that a different way?";
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

export const send = action({
  args: {
    clientId: v.string(),
    threadId: v.optional(v.id("chatThreads")),
    body: v.string(),
    images: v.optional(
      v.array(
        v.object({
          data: v.string(),
          mimeType: v.union(v.literal("image/jpeg"), v.literal("image/png"), v.literal("image/webp")),
        }),
      ),
    ),
  },
  handler: async (ctx, args): Promise<{ reply: string }> => {
    if (!env.GOOGLE_AI_API_KEY) {
      throw new Error("AI chat is not configured yet.");
    }

    const threadId = await ctx.runMutation(internal.chat.reserveVisitorMessage, {
      clientId: args.clientId,
      threadId: args.threadId,
      body: args.body,
    });
    const recentMessages = await ctx.runQuery(internal.chat.getRecentMessages, { threadId });
    const images = (args.images ?? []).slice(0, 3).filter((image) => image.data);

    const model = env.GOOGLE_AI_MODEL ?? "gemini-2.5-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(env.GOOGLE_AI_API_KEY)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: toGeminiContents(recentMessages, images),
          generationConfig: {
            maxOutputTokens: 420,
            temperature: 0.7,
          },
        }),
      },
    );

    if (!response.ok) {
      const detail = await readGeminiError(response);
      throw new Error(`AI Ashvin could not reply right now. ${detail}`);
    }

    const payload = (await response.json()) as GeminiResponse;
    const reply = extractGeminiText(payload);

    await ctx.runMutation(internal.chat.addAshvinMessage, {
      threadId,
      body: reply,
    });

    return { reply };
  },
});
