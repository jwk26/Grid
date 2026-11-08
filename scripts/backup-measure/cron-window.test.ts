import { describe, expect, it } from "vitest";
import { cronWindowProblem, measureWindowProblem } from "./cron-window";

const at = (hh: number, mm: number) => new Date(Date.UTC(2026, 10, 8, hh, mm));

describe("cronWindowProblem", () => {
  it("refuses within 25 minutes before and 8 minutes after a cron run", () => {
    expect(cronWindowProblem(at(16, 35))).toContain("backup-dispatch");
    expect(cronWindowProblem(at(17, 8))).toContain("behind");
    expect(cronWindowProblem(at(18, 40))).toContain("backup-summary-dispatch");
    expect(cronWindowProblem(at(3, 20))).toContain("cleanup-guests");
  });
  it("allows the time outside the windows", () => {
    expect(cronWindowProblem(at(16, 34))).toBeNull();
    expect(cronWindowProblem(at(17, 9))).toBeNull();
    expect(cronWindowProblem(at(9, 9))).toBeNull();
  });
});

describe("measureWindowProblem", () => {
  const base = { isLocal: false, skipWindow: false, cronActive: 3, now: at(9, 9) };
  it("never refuses a local run", () => {
    expect(measureWindowProblem({ ...base, isLocal: true, now: at(17, 0) })).toBeNull();
  });
  it("refuses --skip-cron-window while any cron job is active", () => {
    expect(measureWindowProblem({ ...base, skipWindow: true })).toContain("3 active");
  });
  it("allows --skip-cron-window when every job is unscheduled", () => {
    expect(measureWindowProblem({ ...base, skipWindow: true, cronActive: 0, now: at(17, 0) })).toBeNull();
  });
  it("applies the window when the skip flag is absent", () => {
    expect(measureWindowProblem({ ...base, now: at(17, 0) })).toContain("backup-dispatch");
    expect(measureWindowProblem(base)).toBeNull();
  });
});
