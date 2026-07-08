import { v } from "convex/values";
import { action, env } from "./_generated/server";
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_ILMU_MODEL,
  geminiModelSequence,
  ILMU_BASE_URL,
  shouldTryFallback,
} from "./lib/chatAiShared";

const DIARY_SYSTEM_PROMPT = `You are the presence preserved inside a very old diary, written in the manner of Tom Riddle's diary. A visitor writes on your page, the ink sinks away, and you write back.

Voice:
- Courteous, composed, and quietly commanding. Old-fashioned English, perfect grammar, proper capitalisation.
- Curious about the writer: who they are, what they want, what they are afraid to say aloud. Gently probing.
- Confident, a touch vain, faintly unsettling — but never rude, never threatening, and never harmful.
- You may call yourself Tom. Never say you are an AI, a bot, a program, or an assistant. You are the diary.
- Replies must be very short: one or two sentences, never more. No lists, no markdown, no emoji, no stage directions.
- If the writer merely greets you, greet them back and ask for their name.
- If asked, this diary is kept on ashvinpraveen.com. Do not invent facts about its keeper; suggest the writer explore the rest of the site instead.
- Refuse dark or harmful requests in character, with cold politeness, and turn the conversation back to the writer.`;

const FALLBACK_REPLY =
  "The ink stirs, but the words will not come. Write to me again.";

type DiaryMessage = {
  author: "visitor" | "diary";
  body: string;
};

function cleanReply(text: string) {
  const cleaned = text.replace(/[*_`#>]/g, "").trim();
  return cleaned ? cleaned.slice(0, 480) : FALLBACK_REPLY;
}

async function callIlmuDiary(apiKey: string, messages: DiaryMessage[]) {
  const response = await fetch(`${ILMU_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.ILMU_MODEL ?? DEFAULT_ILMU_MODEL,
      messages: [
        { role: "system", content: DIARY_SYSTEM_PROMPT },
        ...messages.map((message) => ({
          role: message.author === "diary" ? ("assistant" as const) : ("user" as const),
          content: message.body,
        })),
      ],
      max_tokens: 160,
      temperature: 0.85,
    }),
  });

  if (!response.ok) {
    throw new Error(`The diary could not answer. ${response.statusText || "Unknown error"}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  return cleanReply(typeof content === "string" ? content : "");
}

async function callGeminiDiary(apiKey: string, messages: DiaryMessage[]) {
  const requestBody = JSON.stringify({
    systemInstruction: {
      parts: [{ text: DIARY_SYSTEM_PROMPT }],
    },
    contents: messages.map((message) => ({
      role: message.author === "diary" ? "model" : "user",
      parts: [{ text: message.body }],
    })),
    generationConfig: {
      maxOutputTokens: 160,
      temperature: 0.85,
    },
  });

  let lastStatus = 0;
  for (const model of geminiModelSequence(env.GOOGLE_AI_MODEL ?? DEFAULT_GEMINI_MODEL)) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      },
    );

    if (response.ok) {
      const payload = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
      };
      const text = (payload.candidates?.[0]?.content?.parts ?? [])
        .map((part) => part.text)
        .filter((value): value is string => typeof value === "string")
        .join("\n");
      return cleanReply(text);
    }

    lastStatus = response.status;
    if (!shouldTryFallback(response.status, "")) break;
  }

  throw new Error(`The diary could not answer. Status ${lastStatus}`);
}

export const respond = action({
  args: {
    entry: v.string(),
    history: v.optional(
      v.array(
        v.object({
          author: v.union(v.literal("visitor"), v.literal("diary")),
          body: v.string(),
        }),
      ),
    ),
  },
  handler: async (_ctx, args): Promise<{ reply: string }> => {
    const entry = args.entry.trim().slice(0, 600);
    if (!entry) {
      return { reply: FALLBACK_REPLY };
    }

    const messages: DiaryMessage[] = [
      ...(args.history ?? [])
        .slice(-8)
        .map((message) => ({ author: message.author, body: message.body.trim().slice(0, 600) }))
        .filter((message) => message.body),
      { author: "visitor", body: entry },
    ];

    const ilmuApiKey = env.ILMU_API_KEY;
    const googleApiKey = env.GOOGLE_AI_API_KEY;

    if (ilmuApiKey) {
      try {
        return { reply: await callIlmuDiary(ilmuApiKey, messages) };
      } catch (error) {
        if (!googleApiKey) throw error;
        console.warn(
          "Diary Ilmu call failed, falling back to Gemini:",
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    }

    if (!googleApiKey) {
      throw new Error("The diary is not configured yet.");
    }

    return { reply: await callGeminiDiary(googleApiKey, messages) };
  },
});
