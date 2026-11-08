import { describe, expect, it } from "vitest";
import { judgeDbTime } from "./db-time";

const a = { stage_calls: 1, stage_ms: 100, acct_calls: 1, acct_ms: 200 };
const b = { stage_calls: 2, stage_ms: 400, acct_calls: 2, acct_ms: 1200 };

describe("judgeDbTime", () => {
  it("measures the mean of the calls in between", () => {
    expect(judgeDbTime(a, b, true, 30000)).toEqual({ kind: "measured", stageMs: 300, acctMs: 1000, ok: true });
  });
  it("fails when restore_account is over the limit", () => {
    expect(judgeDbTime(a, b, true, 500).ok).toBe(false);
  });
  it("fails on a hosted target when the totals are unreadable, passes locally", () => {
    expect(judgeDbTime(null, b, true, 30000)).toMatchObject({ kind: "unproven", reason: "unreadable", ok: false });
    expect(judgeDbTime(a, null, true, 30000).ok).toBe(false);
    expect(judgeDbTime(null, null, false, 30000)).toMatchObject({ kind: "unproven", ok: true });
  });
  it("fails when either call count did not rise, even locally", () => {
    expect(judgeDbTime(a, { ...b, stage_calls: 1 }, true, 30000)).toMatchObject({ reason: "no_calls", ok: false });
    expect(judgeDbTime(a, { ...b, acct_calls: 1 }, false, 30000)).toMatchObject({ reason: "no_calls", ok: false });
    expect(judgeDbTime(a, a, true, 30000).ok).toBe(false);
  });
});
