import { CLUB_TIME_ZONE } from "./config";

export function formatMeetupWhen(startsAt: number) {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: CLUB_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(startsAt));
}

export function meetupCountdown(startsAt: number, now = Date.now()) {
  const delta = startsAt - now;
  if (delta <= 0) return "Happening now";
  const hours = Math.floor(delta / 3_600_000);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `in ${days}d ${hours % 24}h`;
  if (hours >= 1) return `in ${hours}h`;
  const minutes = Math.max(1, Math.floor(delta / 60_000));
  return `in ${minutes}m`;
}
