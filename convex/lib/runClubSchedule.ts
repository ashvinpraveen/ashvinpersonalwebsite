export const CLUB_TIME_ZONE = "Asia/Kuala_Lumpur";

export function dayKeyInClubTz(timestamp: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLUB_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

/** ISO week key like 2026-W31 in Asia/Kuala_Lumpur. */
export function weekKeyInClubTz(timestamp: number) {
  const dayKey = dayKeyInClubTz(timestamp);
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function previousDayKey(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const utcNoon = Date.UTC(year, month - 1, day, 4, 0, 0);
  const previous = utcNoon - 24 * 60 * 60 * 1000;
  return dayKeyInClubTz(previous);
}

/** Next Monday or Thursday 19:00 Asia/Kuala_Lumpur as epoch ms. */
export function nextMeetupStartsAt(fromMs = Date.now()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: CLUB_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(fromMs)).map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const weekday = parts.weekday;

  const weekdayIndex: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const currentWeekday = weekdayIndex[weekday] ?? 0;
  const meetupWeekdays = [1, 4];

  for (let offset = 0; offset < 8; offset += 1) {
    const candidateWeekday = (currentWeekday + offset) % 7;
    if (!meetupWeekdays.includes(candidateWeekday)) continue;

    const candidateDate = new Date(Date.UTC(year, month - 1, day + offset, 0, 0, 0));
    // 19:00 MYT = 11:00 UTC
    const startsAt = Date.UTC(
      candidateDate.getUTCFullYear(),
      candidateDate.getUTCMonth(),
      candidateDate.getUTCDate(),
      11,
      0,
      0,
    );

    if (offset === 0 && (hour > 19 || (hour === 19 && minute > 0))) {
      continue;
    }
    if (startsAt >= fromMs - 30 * 60 * 1000) {
      return startsAt;
    }
  }

  return fromMs + 3 * 24 * 60 * 60 * 1000;
}
