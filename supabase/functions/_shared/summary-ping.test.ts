import { describe, expect, it } from "vitest";
import { countOverdue, DELETION_OVERDUE_MS, judgeSummary } from "./summary-ping.ts";

const base = { new_failures: 0, failing: 0, missing: 0, over_limit: false, deletion_overdue: 0 };

describe("judgeSummary", () => {
  it("is a success with nothing new, even with accounts still failing", () => {
    expect(judgeSummary({ ...base, failing: 3 }).ok).toBe(true);
  });
  it("fails for each new problem with its code", () => {
    expect(judgeSummary({ ...base, new_failures: 1 })).toMatchObject({ ok: false, codes: ["new_failure"] });
    expect(judgeSummary({ ...base, missing: 2 }).codes).toEqual(["missing"]);
    expect(judgeSummary({ ...base, over_limit: true }).codes).toEqual(["over_limit"]);
    expect(judgeSummary({ ...base, deletion_overdue: 1 }).codes).toEqual(["deletion_overdue"]);
  });
  it("holds counts and codes only, no id or email", () => {
    const { body } = judgeSummary({ ...base, new_failures: 1, failing: 2 });
    expect(body).toBe("new_failures=1 failing=2 missing=0 over_limit=0 deletion_overdue=0 codes=new_failure");
    expect(body).not.toMatch(/@|[0-9a-f]{8}-[0-9a-f]{4}/);
  });
});

describe("countOverdue", () => {
  it("counts rows older than three days", () => {
    const now = 10 * DELETION_OVERDUE_MS;
    expect(countOverdue([{ requested_at: now - DELETION_OVERDUE_MS - 1 }, { requested_at: now - 1000 }], now)).toBe(1);
  });
});
