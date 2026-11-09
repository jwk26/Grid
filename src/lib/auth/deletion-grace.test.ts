import { describe, expect, it } from "vitest";
import {
  DELETION_GRACE_MS,
  deletionDeadline,
  deletionFieldsOf,
  deletionRemainingMs,
  formatCountdown,
  type DeletionClock,
} from "@/lib/auth/deletion-grace";

const clock = (overrides: Partial<DeletionClock> = {}): DeletionClock => ({
  requestedAt: 1_000_000,
  serverNow: 1_000_000 + 60_000,
  receivedMono: 500,
  receivedWall: 9_000_000_000,
  ...overrides,
});

describe("deletion grace clock", () => {
  it("the grace period is 24 hours and the deadline is the request plus it", () => {
    expect(DELETION_GRACE_MS).toBe(86_400_000);
    expect(deletionDeadline(clock())).toBe(1_000_000 + 86_400_000);
  });

  it("counts down from the server's time, whatever the device clock says", () => {
    const c = clock();
    expect(deletionRemainingMs(c, 500, 9_000_000_000)).toBe(86_400_000 - 60_000);
    // 10 s later on both clocks.
    expect(deletionRemainingMs(c, 10_500, 9_000_010_000)).toBe(86_400_000 - 70_000);
  });

  it("uses the larger elapsed time, so a sleep that stalls the monotonic clock never adds time", () => {
    const c = clock();
    // Monotonic clock stalled (laptop asleep), wall clock advanced one hour.
    expect(deletionRemainingMs(c, 500, 9_000_000_000 + 3_600_000)).toBe(86_400_000 - 60_000 - 3_600_000);
    // Wall clock moved back (a clock change): the monotonic elapsed time wins.
    expect(deletionRemainingMs(c, 20_500, 8_000_000_000)).toBe(86_400_000 - 60_000 - 20_000);
  });

  it("never goes below zero", () => {
    expect(deletionRemainingMs(clock(), 500 + 2 * 86_400_000, 9_000_000_000)).toBe(0);
  });

  it("formats hh:mm:ss, rounding a partial second up", () => {
    expect(formatCountdown(86_400_000)).toBe("24:00:00");
    expect(formatCountdown(3_723_000)).toBe("01:02:03");
    expect(formatCountdown(1)).toBe("00:00:01");
    expect(formatCountdown(0)).toBe("00:00:00");
  });

  it("reads the two fields of a rejection, and nothing else counts", () => {
    expect(deletionFieldsOf({ code: "account_deleting", deletion_requested_at: 5, server_now: 9 })).toEqual({
      requestedAt: 5,
      serverNow: 9,
    });
    for (const bad of [
      undefined,
      { code: "account_deleting" },
      { code: "account_deleting", deletion_requested_at: "5", server_now: 9 },
      { code: "account_deleting", deletion_requested_at: 5, server_now: Number.NaN },
    ]) {
      expect(deletionFieldsOf(bad as never)).toBeNull();
    }
  });
});
