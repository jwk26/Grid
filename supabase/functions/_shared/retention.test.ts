import { describe, expect, it } from "vitest";
import { isoWeek, planPrune } from "./retention.ts";

const ID = "3f2b8c1e-5a47-4d0e-9b6a-1c2d3e4f5a6b";
const key = (d: string) => `accounts/${ID}/${d}.json.gz`;
const keys = (dates: string[]) => dates.map(key);
const dates = (list: string[]) => list.map((k) => k.slice(-18, -8));

describe("isoWeek", () => {
  it("handles ISO week 53 and the year boundary", () => {
    expect(isoWeek("2026-12-31")).toBe("2026-W53");
    expect(isoWeek("2027-01-03")).toBe("2026-W53"); // Sunday
    expect(isoWeek("2027-01-04")).toBe("2027-W01");
    expect(isoWeek("2024-12-30")).toBe("2025-W01"); // Monday that belongs to the next ISO year
    expect(isoWeek("2026-01-01")).toBe("2026-W01");
  });
});

describe("planPrune", () => {
  it("keeps everything with fewer than 8 files", () => {
    const k = keys(["2026-11-01", "2026-11-02", "2026-11-03"]);
    expect(planPrune(ID, k)).toEqual({ keep: [k[2], k[1], k[0]], remove: [] });
  });

  it("keeps 7 files and nothing older when no older file exists", () => {
    const d = ["01", "02", "03", "04", "05", "06", "07"].map((x) => `2026-11-${x}`);
    expect(planPrune(ID, keys(d)).remove).toEqual([]);
  });

  it("keeps the 7 latest and the latest file of each of 4 earlier weeks, 14 days over 8 weeks", () => {
    // 7 recent: 2026-11-02 (Mon, W45) .. 2026-11-08; 7 older, one in each of W44..W38.
    const recent = ["02", "03", "04", "05", "06", "07", "08"].map((x) => `2026-11-${x}`);
    const older = ["2026-10-27", "2026-10-20", "2026-10-13", "2026-10-06", "2026-09-29", "2026-09-22", "2026-09-15"];
    const plan = planPrune(ID, keys([...older, ...recent]));
    expect(dates(plan.keep).sort()).toEqual([...recent, ...older.slice(0, 4)].sort());
    expect(dates(plan.remove).sort()).toEqual(older.slice(4).sort());
  });

  it("keeps only the latest of several files in one earlier week", () => {
    const recent = ["02", "03", "04", "05", "06", "07", "08"].map((x) => `2026-11-${x}`);
    const older = ["2026-10-26", "2026-10-27", "2026-10-30", "2026-10-19"]; // W44 x3, W43
    const plan = planPrune(ID, keys([...recent, ...older]));
    expect(dates(plan.keep).sort()).toEqual([...recent, "2026-10-30", "2026-10-19"].sort());
    expect(dates(plan.remove).sort()).toEqual(["2026-10-26", "2026-10-27"]);
  });

  it("does not keep an older file that is in the 7th file's own week", () => {
    // The 7th latest is 2026-11-02 (Mon, W45); 2026-11-01 (Sun) is W44, 2026-10-31 is W44.
    const seven = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"];
    // Put the 7th in the middle of a week: 7 files Wed..Tue.
    const mid = ["2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10"];
    const sameWeekOlder = "2026-11-03"; // W45, the 7th (11-04) is also W45
    const earlier = "2026-10-30"; // W44
    const plan = planPrune(ID, keys([...mid, sameWeekOlder, earlier]));
    expect(dates(plan.remove)).toEqual([sameWeekOlder]);
    expect(dates(plan.keep)).toContain(earlier);
    expect(seven.length).toBe(7);
  });

  it("spans ISO week 53 and the year boundary as separate weeks", () => {
    const recent = ["2027-01-11", "2027-01-12", "2027-01-13", "2027-01-14", "2027-01-15", "2027-01-16", "2027-01-17"];
    const older = ["2027-01-05", "2027-01-03", "2026-12-30", "2026-12-23", "2026-12-17"];
    // weeks: 2027-W01 (01-05), 2026-W53 (01-03 and 12-30), 2026-W52 (12-23), 2026-W51 (12-17)
    const plan = planPrune(ID, keys([...recent, ...older]));
    expect(dates(plan.keep).sort()).toEqual([...recent, "2027-01-05", "2027-01-03", "2026-12-23", "2026-12-17"].sort());
    expect(dates(plan.remove)).toEqual(["2026-12-30"]);
  });

  it("leaves identity.json, pre-restore files, other accounts and malformed names alone", () => {
    const other = "11111111-1111-4111-8111-111111111111";
    const k = [
      key("2026-11-05"),
      `accounts/${ID}/identity.json`,
      `accounts/${ID}/pre-restore/2026-11-05T01:00:00Z.json.gz`,
      `accounts/${other}/2026-11-01.json.gz`,
      `accounts/${ID}/2026-13-45.json.gz`,
      `accounts/${ID}/latest.json.gz`,
    ];
    expect(planPrune(ID, k)).toEqual({ keep: [key("2026-11-05")], remove: [] });
  });

  it("always keeps the newest file", () => {
    const d = Array.from({ length: 40 }, (_, i) => new Date(Date.UTC(2026, 0, 1 + i * 3)).toISOString().slice(0, 10));
    const plan = planPrune(ID, keys(d));
    expect(plan.keep[0]).toBe(key(d[d.length - 1]));
    expect(plan.keep.length).toBeLessThanOrEqual(11);
  });
});
