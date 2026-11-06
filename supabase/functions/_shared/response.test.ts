import { describe, expect, it } from "vitest";
import { assertOwnStatus, isNoAnswerStatus, refusalBody, rejectedBody, UNCONFIRMED_STATUS } from "./response.ts";

describe("response classification", () => {
  it("names the no-answer statuses", () => {
    for (const s of [500, 502, 503, 504, 546]) expect(isNoAnswerStatus(s)).toBe(true);
    for (const s of [200, 400, 401, 403, 405]) expect(isNoAnswerStatus(s)).toBe(false);
  });
  it("lets the function use its own statuses and the one unconfirmed case only", () => {
    for (const s of [200, 400, 401, 403, 405]) expect(assertOwnStatus(s)).toBe(s);
    expect(assertOwnStatus(UNCONFIRMED_STATUS)).toBe(502);
    for (const s of [500, 503, 504, 546]) expect(() => assertOwnStatus(s)).toThrow();
  });
  it("builds the envelopes", () => {
    expect(rejectedBody("rate_limited")).toEqual({ status: "rejected", rejection: { code: "rate_limited" } });
    expect(refusalBody("guest")).toEqual({ status: "refused", code: "guest" });
  });
});
