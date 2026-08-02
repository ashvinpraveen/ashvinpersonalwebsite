import { describe, expect, it } from "vitest";
import { nextMeetupStartsAt, weekKeyInClubTz } from "../../../convex/lib/runClubSchedule";
import { meetupCountdown } from "./schedule";

describe("run-club schedule", () => {
  it("picks the next Monday or Thursday 7pm MYT", () => {
    const from = Date.UTC(2026, 7, 5, 10, 0, 0);
    const next = nextMeetupStartsAt(from);
    expect(next).toBe(Date.UTC(2026, 7, 6, 11, 0, 0));
  });

  it("keeps tonight's meetup before 7pm MYT", () => {
    const from = Date.UTC(2026, 7, 3, 8, 0, 0);
    const next = nextMeetupStartsAt(from);
    expect(next).toBe(Date.UTC(2026, 7, 3, 11, 0, 0));
  });

  it("formats countdown copy", () => {
    const now = Date.UTC(2026, 7, 3, 10, 0, 0);
    expect(meetupCountdown(now - 1_000, now)).toBe("Happening now");
    expect(meetupCountdown(now + 90 * 60_000, now)).toBe("in 1h");
  });

  it("builds an ISO week key", () => {
    expect(weekKeyInClubTz(Date.UTC(2026, 7, 3, 11, 0, 0))).toMatch(/^\d{4}-W\d{2}$/);
  });
});
