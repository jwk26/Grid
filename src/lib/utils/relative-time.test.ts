import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatRelativeTime } from "@/lib/utils/relative-time";

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 17, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats timestamps under 60 minutes as minutes ago", () => {
    const timestamp = new Date(2026, 5, 17, 11, 15, 0).getTime();

    expect(formatRelativeTime(timestamp)).toBe("45m ago");
  });

  it("formats exactly 60 minutes and same-day timestamps as hours ago", () => {
    const exactly60Minutes = new Date(2026, 5, 17, 11, 0, 0).getTime();
    const sameDayHours = new Date(2026, 5, 17, 10, 0, 0).getTime();

    expect(formatRelativeTime(exactly60Minutes)).toBe("1h ago");
    expect(formatRelativeTime(sameDayHours)).toBe("2h ago");
  });

  it("formats timestamps at least 24 hours and under 48 hours as yesterday", () => {
    const exactly24Hours = new Date(2026, 5, 16, 12, 0, 0).getTime();
    const under48Hours = new Date(2026, 5, 15, 12, 1, 0).getTime();

    expect(formatRelativeTime(exactly24Hours)).toBe("yesterday");
    expect(formatRelativeTime(under48Hours)).toBe("yesterday");
  });

  it("formats timestamps from 2 through 6 days old as days ago", () => {
    const twoDays = new Date(2026, 5, 15, 12, 0, 0).getTime();
    const sixDays = new Date(2026, 5, 11, 12, 0, 0).getTime();

    expect(formatRelativeTime(twoDays)).toBe("2 days ago");
    expect(formatRelativeTime(sixDays)).toBe("6 days ago");
  });

  it("formats timestamps at least 7 days old as d/mm/yy", () => {
    const exactlySevenDays = new Date(2026, 5, 10, 12, 0, 0).getTime();
    const olderDate = new Date(2026, 0, 5, 9, 30, 0).getTime();

    expect(formatRelativeTime(exactlySevenDays)).toBe("10/06/26");
    expect(formatRelativeTime(olderDate)).toBe("5/01/26");
  });
});

describe("shared creation-date boundaries", () => {
  afterEach(() => vi.useRealTimers());
  it.each([
    [-1, "0m ago"], [0, "0m ago"], [59999, "0m ago"],
    [3599999, "59m ago"], [3600000, "1h ago"],
    [86399999, "23h ago"], [86400000, "yesterday"],
    [172799999, "yesterday"], [172800000, "2 days ago"],
    [604799999, "6 days ago"], [604800000, "10/06/26"],
  ])("retains exact elapsed boundary %s", (age, expected) => {
    vi.useFakeTimers();
    const now = new Date(2026, 5, 17, 12).getTime();
    vi.setSystemTime(now);
    expect(formatRelativeTime(now - age)).toBe(expected);
  });
  it.each([
    [2026, 4, 4, "4/05/26"], [2026, 0, 5, "5/01/26"],
    [2024, 1, 29, "29/02/24"], [2005, 11, 31, "31/12/05"],
    [2000, 0, 1, "1/01/00"], [2025, 11, 31, "31/12/25"],
  ])("uses local calendar fields for %s/%s/%s", (year, month, day, expected) => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 5, 17, 12));
    expect(formatRelativeTime(new Date(year, month, day, 0, 30).getTime())).toBe(expected);
  });
  it("preserves local-date interpretation of one UTC instant", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 5, 17, 12));
    const expected = process.env.TZ === "Asia/Seoul" ? "5/05/26" : "4/05/26";
    if (["UTC", "Asia/Seoul", "America/Los_Angeles"].includes(process.env.TZ ?? "")) {
      expect(formatRelativeTime(Date.UTC(2026, 4, 4, 23, 30))).toBe(expected);
    }
  });
  it("retains elapsed rather than calendar-day age across DST", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 2, 9, 0, 30));
    const expected = process.env.TZ === "America/Los_Angeles" ? "23h ago" : "yesterday";
    expect(formatRelativeTime(new Date(2026, 2, 8, 0, 30).getTime())).toBe(expected);
  });
});
