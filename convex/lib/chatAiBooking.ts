import { env } from "../_generated/server";
import type { BookingToolCall, CalSlot } from "./chatAiTypes";

const CAL_API_BASE_URL = "https://api.cal.com/v2";
const CAL_SLOTS_API_VERSION = "2024-09-04";
const CAL_BOOKINGS_API_VERSION = "2026-02-25";
const DEFAULT_CAL_USERNAME = "ashvinpraveen";
const DEFAULT_CAL_EVENT_TYPE_SLUG = "15min";
const DEFAULT_CAL_BOOKING_LINK = "https://cal.com/ashvinpraveen/15min";
export const DEFAULT_CAL_TIME_ZONE = "Asia/Kuala_Lumpur";
const DEFAULT_CAL_DURATION_MINUTES = 15;

type CalSlotsResponse = {
  error?: {
    message?: unknown;
  };
  message?: unknown;
  data?: Record<string, Array<{ start?: unknown; end?: unknown }>>;
};

type CalBookingResponse = {
  error?: {
    message?: unknown;
  };
  message?: unknown;
  data?: {
    uid?: unknown;
    start?: unknown;
    end?: unknown;
  };
};

export function getCalBookingLink() {
  return env.CAL_BOOKING_LINK ?? DEFAULT_CAL_BOOKING_LINK;
}

export function bookingFallbackReply() {
  return `i couldn't book it directly from here. book some time **here**: ${getCalBookingLink()}`;
}

function isCalBookingUnavailableError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("already has booking") ||
    message.includes("not available") ||
    message.includes("no longer available")
  );
}

function bookingUnavailableReply(slot: CalSlot, timeZone: string) {
  return `ah, that slot didn't go through. cal.com says ${formatSlot(slot, timeZone)} may already be booked or no longer available. want me to check nearby times, or book directly **here**: ${getCalBookingLink()}`;
}

export function normalizeTimeZone(value: string | undefined) {
  const timeZone = value || DEFAULT_CAL_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return DEFAULT_CAL_TIME_ZONE;
  }
}

export function formatCurrentDate(timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone,
  }).format(new Date());
}

function isValidDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isNaN(Date.parse(value));
}

function toIsoDate(value: string) {
  const date = isValidDateInput(value) ? new Date(value) : new Date();
  return date.toISOString().slice(0, 10);
}

function addDaysIsoDate(value: string, days: number) {
  const date = new Date(`${toIsoDate(value)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function toUtcIso(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid booking time.");
  }
  return date.toISOString();
}

function dateWindowForStart(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid booking time.");
  }
  const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  return {
    dateFrom: date.toISOString().slice(0, 10),
    dateTo: nextDay.toISOString().slice(0, 10),
  };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hasExplicitBookingConfirmation(value: string) {
  return /\b(yes|yeah|yep|yup|please|confirm|confirmed|book it|book this|schedule it|go ahead|that works|works for me|sounds good|perfect|lock it in|do it)\b/i.test(
    value,
  );
}

function hasRecentBookingOffer(
  messages: Array<{
    author: "visitor" | "ashvin";
    body: string;
  }>,
) {
  return messages
    .slice(0, -1)
    .some(
      (message) =>
        message.author === "ashvin" &&
        (message.body.includes("i found a few 15 minute slots") ||
          message.body.includes("reply with the one you want") ||
          message.body.includes("cool, should i book") ||
          message.body.includes("what works?")),
    );
}

function formatSlot(slot: CalSlot, timeZone: string) {
  const date = new Date(slot.start);
  if (Number.isNaN(date.getTime())) return slot.start;

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  })
    .format(date)
    .toLowerCase();
}

function formatSlotDay(slot: CalSlot, timeZone: string) {
  const date = new Date(slot.start);
  if (Number.isNaN(date.getTime())) return slot.start;

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  })
    .format(date)
    .toLowerCase();
}

function formatSlotTime(slot: CalSlot, timeZone: string) {
  const date = new Date(slot.start);
  if (Number.isNaN(date.getTime())) return slot.start;

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  })
    .format(date)
    .toLowerCase();
}

function joinReadableOptions(options: string[]) {
  if (options.length <= 1) return options[0] ?? "";
  if (options.length === 2) return `${options[0]} or ${options[1]}`;
  return `${options.slice(0, -1).join(", ")}, or ${options[options.length - 1]}`;
}

function formatSlotOptions(slots: CalSlot[], timeZone: string) {
  const groupedSlots = new Map<string, string[]>();
  for (const slot of slots.slice(0, 4)) {
    const day = formatSlotDay(slot, timeZone);
    const times = groupedSlots.get(day) ?? [];
    times.push(formatSlotTime(slot, timeZone));
    groupedSlots.set(day, times);
  }

  return Array.from(groupedSlots.entries())
    .map(([day, times]) => `${day} at ${joinReadableOptions(times)}`)
    .join(", or ");
}

function buildAvailabilityReply(
  slots: CalSlot[],
  timeZone: string,
  options: { usedExpandedWindow?: boolean } = {},
) {
  if (slots.length === 0) {
    return `i don't see an open 15 minute slot in that window. easiest is to book some time **here**: ${getCalBookingLink()}`;
  }

  const slotOptions = formatSlotOptions(slots, timeZone);

  const intro = options.usedExpandedWindow
    ? "i didn't see anything in that exact window, but i can do"
    : "i can do";

  return `${intro} ${slotOptions}. what works?`;
}

function buildConfirmSlotReply(slot: CalSlot, timeZone: string) {
  return `cool, should i book ${formatSlot(slot, timeZone)}?`;
}

function readCalErrorMessage(payload: CalSlotsResponse | CalBookingResponse) {
  if (typeof payload.error?.message === "string") return payload.error.message.slice(0, 160);
  if (typeof payload.message === "string") return payload.message.slice(0, 160);
  return "";
}

async function readCalError(response: Response) {
  try {
    const payload = (await response.json()) as CalSlotsResponse | CalBookingResponse;
    const message = readCalErrorMessage(payload);
    if (message) return message;
  } catch {
    // Fall through to the generic status text below.
  }

  return response.statusText || "Unknown Cal.com error";
}

function calHeaders(apiKey: string, version: string) {
  return {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "cal-api-version": version,
  };
}

function appendCalEventIdentifier(params: URLSearchParams) {
  const eventTypeId = env.CAL_EVENT_TYPE_ID?.trim();
  if (eventTypeId) {
    params.set("eventTypeId", eventTypeId);
    return;
  }

  params.set("eventTypeSlug", env.CAL_EVENT_TYPE_SLUG ?? DEFAULT_CAL_EVENT_TYPE_SLUG);
  params.set("username", env.CAL_USERNAME ?? DEFAULT_CAL_USERNAME);
}

async function fetchCalSlots(
  apiKey: string,
  args: {
    dateFrom: string;
    dateTo: string;
    timeZone: string;
  },
) {
  if (!isValidDateInput(args.dateFrom) || !isValidDateInput(args.dateTo)) {
    throw new Error("Invalid availability window.");
  }

  const params = new URLSearchParams({
    start: args.dateFrom,
    end: args.dateTo,
    timeZone: normalizeTimeZone(args.timeZone),
    duration: String(DEFAULT_CAL_DURATION_MINUTES),
    format: "range",
  });
  appendCalEventIdentifier(params);

  const response = await fetch(`${CAL_API_BASE_URL}/slots?${params.toString()}`, {
    method: "GET",
    headers: calHeaders(apiKey, CAL_SLOTS_API_VERSION),
  });

  if (!response.ok) {
    const detail = await readCalError(response);
    throw new Error(`Cal.com availability failed. ${detail}`);
  }

  const payload = (await response.json()) as CalSlotsResponse;
  const slots = Object.values(payload.data ?? {})
    .flatMap((daySlots) => daySlots)
    .map((slot) => ({
      start: typeof slot.start === "string" ? slot.start : "",
      end: typeof slot.end === "string" ? slot.end : undefined,
    }))
    .filter((slot) => slot.start)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

  return slots;
}

async function fetchCalSlotsWithExpandedWindow(
  apiKey: string,
  args: {
    dateFrom: string;
    dateTo: string;
    timeZone: string;
  },
) {
  const slots = await fetchCalSlots(apiKey, args);
  if (slots.length > 0) {
    return { slots, usedExpandedWindow: false };
  }

  const expandedDateFrom = toIsoDate(args.dateFrom);
  const expandedDateTo = addDaysIsoDate(args.dateFrom, 21);
  const expandedSlots = await fetchCalSlots(apiKey, {
    dateFrom: expandedDateFrom,
    dateTo: expandedDateTo,
    timeZone: args.timeZone,
  });

  return { slots: expandedSlots, usedExpandedWindow: expandedSlots.length > 0 };
}

function findMatchingSlot(slots: CalSlot[], desiredStart: string) {
  const desiredMs = Date.parse(desiredStart);
  if (Number.isNaN(desiredMs)) return null;

  return (
    slots.find((slot) => {
      const slotMs = Date.parse(slot.start);
      return !Number.isNaN(slotMs) && Math.abs(slotMs - desiredMs) < 60 * 1000;
    }) ?? null
  );
}

async function createCalBooking(
  apiKey: string,
  args: Extract<BookingToolCall, { name: "create_calendar_booking" }>["args"],
) {
  const start = toUtcIso(args.start);
  const attendeeTimeZone = normalizeTimeZone(args.attendeeTimeZone);
  const bookingFieldsResponses = args.notes ? { notes: args.notes } : undefined;
  const eventTypeId = Number(env.CAL_EVENT_TYPE_ID?.trim());
  const eventIdentifier = Number.isFinite(eventTypeId) && eventTypeId > 0
    ? { eventTypeId }
    : {
        eventTypeSlug: env.CAL_EVENT_TYPE_SLUG ?? DEFAULT_CAL_EVENT_TYPE_SLUG,
        username: env.CAL_USERNAME ?? DEFAULT_CAL_USERNAME,
      };

  const response = await fetch(`${CAL_API_BASE_URL}/bookings`, {
    method: "POST",
    headers: calHeaders(apiKey, CAL_BOOKINGS_API_VERSION),
    body: JSON.stringify({
      start,
      ...eventIdentifier,
      attendee: {
        name: args.attendeeName,
        email: args.attendeeEmail,
        timeZone: attendeeTimeZone,
        language: "en",
      },
      bookingFieldsResponses,
      metadata: {
        source: "ashvinpersonalwebsite-chat",
      },
    }),
  });

  if (!response.ok) {
    const detail = await readCalError(response);
    throw new Error(`Cal.com booking failed. ${detail}`);
  }

  const payload = (await response.json()) as CalBookingResponse;
  return {
    uid: typeof payload.data?.uid === "string" ? payload.data.uid : "",
    start: typeof payload.data?.start === "string" ? payload.data.start : start,
    end: typeof payload.data?.end === "string" ? payload.data.end : undefined,
  };
}

export async function handleBookingToolCall(
  toolCall: BookingToolCall,
  messages: Array<{
    author: "visitor" | "ashvin";
    body: string;
  }>,
  visitorBody: string,
) {
  const apiKey = env.CAL_API_KEY;
  if (!apiKey) return bookingFallbackReply();

  if (toolCall.name === "check_booking_availability") {
    const timeZone = normalizeTimeZone(toolCall.args.timeZone);
    const result = await fetchCalSlotsWithExpandedWindow(apiKey, {
      dateFrom: toolCall.args.dateFrom,
      dateTo: toolCall.args.dateTo,
      timeZone,
    });
    return buildAvailabilityReply(result.slots, timeZone, {
      usedExpandedWindow: result.usedExpandedWindow,
    });
  }

  if (!isValidEmail(toolCall.args.attendeeEmail)) {
    return "i can book it, but i need a valid email for the calendar invite.";
  }

  const timeZone = normalizeTimeZone(toolCall.args.attendeeTimeZone);
  if (!hasRecentBookingOffer(messages)) {
    const window = dateWindowForStart(toolCall.args.start);
    const result = await fetchCalSlotsWithExpandedWindow(apiKey, { ...window, timeZone });
    const matchingSlot = findMatchingSlot(result.slots, toolCall.args.start);
    return matchingSlot
      ? buildConfirmSlotReply(matchingSlot, timeZone)
      : buildAvailabilityReply(result.slots, timeZone, {
          usedExpandedWindow: result.usedExpandedWindow,
        });
  }

  if (!hasExplicitBookingConfirmation(visitorBody)) {
    return `cool, should i book ${formatSlot({ start: toolCall.args.start }, timeZone)}?`;
  }

  let booking: Awaited<ReturnType<typeof createCalBooking>>;
  try {
    booking = await createCalBooking(apiKey, toolCall.args);
  } catch (error) {
    if (isCalBookingUnavailableError(error)) {
      return bookingUnavailableReply({ start: toolCall.args.start }, timeZone);
    }
    throw error;
  }

  const bookingCode = booking.uid ? ` booking id: ${booking.uid}.` : "";
  return `done, you're booked for ${formatSlot({ start: booking.start, end: booking.end }, timeZone)}.${bookingCode} cal.com should send the invite to ${toolCall.args.attendeeEmail}.`;
}
