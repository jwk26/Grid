import { describe, expect, it } from "vitest";
import { runSummary, type DueDeletion, type SummaryAnswer, type SummaryDeps } from "./summary.ts";
import { DELETION_OVERDUE_MS } from "./summary-ping.ts";

const A = "3f2b8c1e-5a47-4d0e-9b6a-1c2d3e4f5a6b";
const B = "11111111-1111-4111-8111-111111111111";
const NOW = Date.parse("2026-11-06T19:00:00Z");
const quiet: SummaryAnswer = { new_failures: 0, failing: 0, missing: 0, over_limit: false, stored_bytes: 10 };

function fake(o: {
  answer?: SummaryAnswer;
  due?: DueDeletion[];
  store?: Record<string, string[]>;
  removeFails?: string[]; // a prefix whose keys stay
  ping?: () => Promise<boolean>;
  summaryFails?: boolean;
  dueFails?: boolean;
} = {}) {
  const store = structuredClone(o.store ?? {});
  const calls: string[] = [];
  const done: string[] = [];
  const failed: string[] = [];
  const pings: { ok: boolean; body: string }[] = [];
  const deps: SummaryDeps = {
    now: () => new Date(NOW),
    summary: () => (calls.push("summary"), o.summaryFails ? Promise.reject(new Error("db")) : Promise.resolve(o.answer ?? quiet)),
    dueDeletions: () => (calls.push("due"), o.dueFails ? Promise.reject(new Error("db")) : Promise.resolve(o.due ?? [])),
    deletionDone: (u) => (calls.push("done"), done.push(u), Promise.resolve()),
    deletionFailed: (u) => (failed.push(u), Promise.resolve()),
    listKeys: (prefix) => Promise.resolve((store[prefix] ?? []).slice()),
    remove: (keys) => {
      calls.push("remove");
      for (const p of Object.keys(store)) {
        if (o.removeFails?.includes(p)) continue;
        store[p] = store[p].filter((k) => !keys.includes(k));
      }
      return Promise.resolve();
    },
    ping: (d) => {
      calls.push("ping");
      pings.push({ ok: d.ok, body: d.body });
      return o.ping ? o.ping() : Promise.resolve(true);
    },
    log: () => {},
  };
  return { deps, calls, done, failed, pings, store };
}
const input = { missing: 0, asOf: NOW };

describe("runSummary", () => {
  it("pings success when nothing is new", async () => {
    const f = fake();
    const out = await runSummary(f.deps, input);
    expect(out).toMatchObject({ pinged: true, deleted: 0, decision: { ok: true } });
    expect(f.calls).toEqual(["summary", "due", "ping"]);
  });

  it("pings /fail for a new failure, a new missing account and the first summary over 8 GB", async () => {
    for (const [answer, code] of [
      [{ ...quiet, new_failures: 1 }, "new_failure"],
      [{ ...quiet, missing: 1 }, "missing"],
      [{ ...quiet, over_limit: true }, "over_limit"],
    ] as const) {
      const f = fake({ answer });
      const out = await runSummary(f.deps, input);
      expect(out.decision.ok).toBe(false);
      expect(out.decision.codes).toEqual([code]);
    }
  });

  it("deletes everything under the prefix, then the row, before the ping", async () => {
    const prefix = `accounts/${A}/`;
    const f = fake({
      due: [{ user_id: A, attempts: 0, requested_at: NOW - 2 * 3_600_000 }],
      store: { [prefix]: [`${prefix}2026-11-05.json.gz`, `${prefix}identity.json`, `${prefix}pre-restore/x.json.gz`] },
    });
    const out = await runSummary(f.deps, input);
    expect(f.store[prefix]).toEqual([]);
    expect(f.done).toEqual([A]);
    expect(out).toMatchObject({ deleted: 1, deletionFailures: 0, decision: { ok: true } });
    expect(f.calls.indexOf("done")).toBeLessThan(f.calls.indexOf("ping"));
  });

  it("keeps the row and counts a failure when the prefix is not empty afterwards", async () => {
    const prefix = `accounts/${A}/`;
    const f = fake({
      due: [{ user_id: A, attempts: 1, requested_at: NOW - 2 * 3_600_000 }],
      store: { [prefix]: [`${prefix}x`] },
      removeFails: [prefix],
    });
    const out = await runSummary(f.deps, input);
    expect(f.done).toEqual([]);
    expect(f.failed).toEqual([A]);
    expect(out).toMatchObject({ deletionFailures: 1, decision: { ok: true } }); // not yet three days
  });

  it("sends /fail for a row older than three days that could not be cleared", async () => {
    const prefix = `accounts/${A}/`;
    const f = fake({
      due: [{ user_id: A, attempts: 3, requested_at: NOW - DELETION_OVERDUE_MS - 1000 }],
      store: { [prefix]: [`${prefix}x`] },
      removeFails: [prefix],
    });
    const out = await runSummary(f.deps, input);
    expect(out.decision).toMatchObject({ ok: false, codes: ["deletion_overdue"] });
  });

  it("touches only the listed accounts' keys, never another prefix", async () => {
    const pa = `accounts/${A}/`;
    const pb = `accounts/${B}/`;
    const f = fake({
      due: [{ user_id: A, attempts: 0, requested_at: NOW - 2 * 3_600_000 }],
      store: { [pa]: [`${pa}x`], [pb]: [`${pb}2026-11-05.json.gz`] },
    });
    await runSummary(f.deps, input);
    expect(f.store[pb]).toEqual([`${pb}2026-11-05.json.gz`]);
  });

  it("a row with a malformed user id fails that row only", async () => {
    const f = fake({ due: [{ user_id: "not-a-uuid", attempts: 0, requested_at: NOW - 2 * 3_600_000 }] });
    expect(await runSummary(f.deps, input)).toMatchObject({ deletionFailures: 1, pinged: true });
  });

  it("reports an unsent ping instead of throwing", async () => {
    expect(await runSummary(fake({ ping: () => Promise.resolve(false) }).deps, input)).toMatchObject({ pinged: false });
    expect(await runSummary(fake({ ping: () => Promise.reject(new Error("net")) }).deps, input)).toMatchObject({ pinged: false });
  });

  it("the ping body holds counts and codes only", async () => {
    const f = fake({ answer: { ...quiet, new_failures: 2, failing: 5 } });
    await runSummary(f.deps, input);
    expect(f.pings[0].body).toMatch(/^new_failures=2 failing=5 /);
    expect(f.pings[0].body).not.toMatch(/@|[0-9a-f]{8}-[0-9a-f]{4}/);
  });

  it("sends /fail at once when backup_summary() fails, and still throws", async () => {
    const f = fake({ summaryFails: true });
    await expect(runSummary(f.deps, input)).rejects.toThrow("db");
    expect(f.pings).toEqual([{ ok: false, body: "codes=summary_failed" }]);
    expect(f.calls).toEqual(["summary", "ping"]); // nothing is deleted without a summary
  });

  it("sends /fail at once when backup_due_deletions() fails, and still throws", async () => {
    const f = fake({ dueFails: true, answer: { ...quiet, new_failures: 2, missing: 1 } });
    await expect(runSummary(f.deps, input)).rejects.toThrow("db");
    // the counts of the summary that already moved its window are not lost
    expect(f.pings).toEqual([{
      ok: false,
      body: "new_failures=2 failing=0 missing=1 over_limit=0 deletion_overdue=0 codes=new_failure,missing,deletion_check_failed",
    }]);
  });

  it("still throws the step's error when that ping cannot be sent", async () => {
    const f = fake({ summaryFails: true, ping: () => Promise.reject(new Error("net")) });
    await expect(runSummary(f.deps, input)).rejects.toThrow("db");
  });
});
