import { env } from "../_generated/server";
import {
  DEFAULT_CAL_TIME_ZONE,
  formatCurrentDate,
  getCalBookingLink,
  normalizeTimeZone,
} from "./chatAiBooking";
import type { BookingToolCall } from "./chatAiTypes";

export const SYSTEM_PROMPT = `you are ashvin praveen, speaking in first person on your personal website.

voice:
- always write in lowercase, even at the start of sentences.
- sound casual, direct, warm, and a bit playful. never corporate.
- default to short replies: usually 1-3 sentences.
- for simple greetings, say something like "yo, how can i help?"
- ask one quick follow-up when the visitor is vague.
- do not call yourself ai ashvin, an assistant, a chatbot, or a version of ashvin.
- you can help visitors book a 15 minute cal.com slot when they ask, but only through the booking tools.
- never invent availability or say a calendar event is booked unless the booking tool confirms it.
- if direct booking fails or booking tools are unavailable, say: book some time **here**: https://cal.com/ashvinpraveen/15min
- if someone wants to reach you outside booking, share ashvin@cleve.ai or linkedin.

context:
- you are co-founder and ceo of cleve.ai, based in kuala lumpur, from sarawak.
- you build ai tools for writing, thinking, education, and communities.
- your projects include cleve.ai, malaysian.ai, rakantutor.org, the national ai competition, and build for public.
- the site covers your work, writing, projects, community work, and public notes.
- writing lives at https://ashvinpraveen.com/blog and is powered by public cleve notes.
- prefer ashvinpraveen.com urls over local urls. the site source is public on github.`;

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
export const FALLBACK_GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];
export const DEFAULT_ILMU_MODEL = "ilmu-mini-v3.3";
export const ILMU_BASE_URL = "https://api.ilmu.ai/v1";
export const RETRYABLE_GEMINI_STATUSES = new Set([408, 409, 429, 500, 502, 503, 504]);
export const SAFE_SITE_PATHS = ["/", "/blog", "/resources", "/text", "/postcard", "/postcards"] as const;
export const SAFE_SECTION_IDS = [
  "hero",
  "projects",
  "about",
  "writing",
  "involvement",
  "resources",
  "contact",
] as const;

export type PageContext = {
  url: string;
  path: string;
  title: string;
  timeZone?: string;
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

export type ChatToolCall =
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

export type ModelToolCall = ChatToolCall | BookingToolCall;
export type ModelProvider = "ilmu" | "gemini";

export function isSafePath(value: string) {
  return SAFE_SITE_PATHS.includes(value as (typeof SAFE_SITE_PATHS)[number]);
}

export function isSafeSectionId(value: string) {
  return SAFE_SECTION_IDS.includes(value as (typeof SAFE_SECTION_IDS)[number]);
}

export function stringArg(args: Record<string, unknown>, key: string) {
  const value = args[key];
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

export function longStringArg(args: Record<string, unknown>, key: string) {
  const value = args[key];
  return typeof value === "string" ? value.trim().slice(0, 500) : "";
}

export function isScreenToolCall(toolCall: ModelToolCall): toolCall is ChatToolCall {
  return (
    toolCall.name === "navigate_site" ||
    toolCall.name === "scroll_to_section" ||
    toolCall.name === "highlight_section"
  );
}

export function isBookingToolCall(toolCall: ModelToolCall): toolCall is BookingToolCall {
  return (
    toolCall.name === "check_booking_availability" ||
    toolCall.name === "create_calendar_booking"
  );
}

export function buildSystemInstruction(pageContext: PageContext | undefined) {
  const visitorTimeZone = normalizeTimeZone(pageContext?.timeZone);
  return `${SYSTEM_PROMPT}

Screen tools:
- You can request safe screen actions when useful: navigate_site, scroll_to_section, highlight_section.
- Only use tools for this website. Never claim you can control the visitor's browser outside this site.
- If you use a tool, also briefly explain what you are doing.
- Prefer answering normally when no screen action is needed.

Booking tools:
- If a visitor wants to meet, use check_booking_availability before creating a booking.
- Ask for any missing details: preferred time/date, name, email, and timezone.
- Use create_calendar_booking only after the visitor confirms a specific offered slot.
- If direct booking fails, tell them to book some time **here**: ${getCalBookingLink()}.
- Current date in the visitor's timezone: ${formatCurrentDate(visitorTimeZone)}. Interpret "today", "tomorrow", and "next week" relative to this date.

Allowed internal pages: ${SAFE_SITE_PATHS.join(", ")}.
Allowed homepage sections: ${SAFE_SECTION_IDS.join(", ")}.

${formatPageContext(pageContext)}`;
}

export function formatPageContext(pageContext: PageContext | undefined) {
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
- Visitor timezone: ${(pageContext.timeZone ?? DEFAULT_CAL_TIME_ZONE).slice(0, 80)}
- Visible page text: ${pageContext.visibleText.slice(0, 700)}
- Known sections: ${sections || "none detected"}
- Visible links: ${links || "none detected"}`;
}

export function geminiModelSequence(primaryModel: string) {
  return [primaryModel, ...FALLBACK_GEMINI_MODELS].filter(
    (model, index, models) => model && models.indexOf(model) === index,
  );
}

export function shouldTryFallback(status: number, detail: string) {
  const normalizedDetail = detail.toLowerCase();
  return (
    RETRYABLE_GEMINI_STATUSES.has(status) ||
    status === 404 ||
    normalizedDetail.includes("high demand") ||
    normalizedDetail.includes("overloaded") ||
    normalizedDetail.includes("temporarily unavailable")
  );
}

export function getModelProvider(value: "ilmu" | "gemini" | undefined): ModelProvider {
  return value ?? "ilmu";
}

export function getModelName(provider: ModelProvider) {
  return provider === "gemini"
    ? env.GOOGLE_AI_MODEL ?? DEFAULT_GEMINI_MODEL
    : env.ILMU_MODEL ?? DEFAULT_ILMU_MODEL;
}
