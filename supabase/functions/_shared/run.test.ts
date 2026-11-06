import { describe, expect, it } from "vitest";
import { SafeError } from "./safe-error.ts";
import { runBackup, type BeginAnswer, type ExportAnswer, type FinishArgs, type FinishResult, type RunDeps } from "./run.ts";

const ID = "3f2b8c1e-5a47-4d0e-9b6a-1c2d3e4f5a6b";
const identity = { user_id: ID, providers: [{ provider: "github", provider_user_id: "42" }] };
const body = new Uint8Array([1, 2, 3, 4]);

type Opts = {
  begin?: BeginAnswer;
  fingerprint?: string | (() => Promise<string>);
  exported?: ExportAnswer | (() => Promise<ExportAnswer>);
  check?: string | (() => Promise<string>);
  put?: (key: string) => Promise<void>;
  stored?: string | null; // the existing identity.json text
  log?: (m: string) => void;
  listed?: { key: string; size: number }[];
  remove?: () => Promise<void>;
  finish?: () => Promise<boolean>;
};

function fake(o: Opts = {}) {
  const calls: string[] = [];
  const puts: string[] = [];
  const removed: string[] = [];
  const finishes: { result: FinishResult; args?: FinishArgs }[] = [];
  const fn = <T>(v: T | (() => Promise<T>)) => (typeof v === "function" ? (v as () => Promise<T>)() : Promise.resolve(v));
  const deps: RunDeps = {
    now: () => new Date("2026-11-06T03:00:00Z"),
    begin: () => (calls.push("begin"), Promise.resolve(o.begin ?? { status: "applied", runToken: 7, lastFingerprint: "old" })),
    fingerprint: () => (calls.push("fingerprint"), fn(o.fingerprint ?? "new")),
    exportGzip: () => (calls.push("export"), fn(o.exported ?? { kind: "ok", body })),
    accountCheck: () => (calls.push("check"), fn(o.check ?? "ok")),
    put: async (key) => {
      calls.push("put");
      puts.push(key);
      await o.put?.(key);
    },
    getText: () => (calls.push("get"), Promise.resolve(o.stored === undefined ? JSON.stringify(identity) : o.stored)),
    list: () => (calls.push("list"), Promise.resolve(o.listed ?? [{ key: `accounts/${ID}/2026-11-06.json.gz`, size: 4 }, { key: `accounts/${ID}/identity.json`, size: 80 }])),
    remove: async (keys) => {
      calls.push("remove");
      await o.remove?.();
      removed.push(...keys);
    },
    finish: (_u, token, result, args) => {
      calls.push("finish");
      expect(token).toBe(7);
      finishes.push({ result, args });
      return o.finish ? o.finish() : Promise.resolve(true);
    },
    log: (m) => o.log?.(m),
  };
  return { deps, calls, puts, removed, finishes };
}
const input = { userId: ID, kind: "scheduled" as const, runId: null, identity };

describe("runBackup", () => {
  it("writes the dated file and identity.json, prunes, and records written with the sizes", async () => {
    const f = fake();
    const out = await runBackup(f.deps, input);
    expect(out).toEqual({ kind: "done", result: "written", reason: undefined, confirmed: true });
    expect(f.calls).toEqual(["begin", "fingerprint", "export", "check", "put", "put", "list", "finish"]);
    expect(f.puts).toEqual([`accounts/${ID}/2026-11-06.json.gz`, `accounts/${ID}/identity.json`]);
    expect(f.finishes[0]).toEqual({
      result: "written",
      args: { fingerprint: "new", fileAt: Date.parse("2026-11-06T03:00:00Z"), fileBytes: 4, storedBytes: 84 },
    });
  });

  it("returns a rejection from begin and does nothing else", async () => {
    const f = fake({ begin: { status: "rejected", code: "rate_limited" } });
    expect(await runBackup(f.deps, input)).toEqual({ kind: "rejected", code: "rate_limited" });
    expect(f.calls).toEqual(["begin"]);
  });

  it("an unchanged fingerprint writes nothing and records only the check", async () => {
    const f = fake({ fingerprint: "old" });
    const out = await runBackup(f.deps, input);
    expect(out).toMatchObject({ result: "unchanged", confirmed: true });
    expect(f.calls).toEqual(["begin", "fingerprint", "check", "get", "finish"]);
    expect(f.puts).toEqual([]); // identity.json is the same: nothing written
  });

  it("a first run (no stored fingerprint) always writes", async () => {
    const f = fake({ begin: { status: "applied", runToken: 7, lastFingerprint: null } });
    expect(await runBackup(f.deps, input)).toMatchObject({ result: "written" });
  });

  it.each(["account_deleting", "account_missing"])("%s at the pre-upload check uploads nothing and ends abandoned", async (check) => {
    const f = fake({ check });
    const out = await runBackup(f.deps, input);
    expect(out).toMatchObject({ result: "abandoned", confirmed: true });
    expect(f.puts).toEqual([]);
    expect(f.calls).not.toContain("list");
    expect(f.finishes).toEqual([{ result: "abandoned", args: undefined }]);
  });

  it.each(["", "OK", "ok ", "unknown"])("an unexpected check value %j uploads nothing", async (check) => {
    const f = fake({ check });
    const out = await runBackup(f.deps, input);
    expect(out).toMatchObject({ result: "failed", reason: "account_check_unexpected" });
    expect(f.puts).toEqual([]);
  });

  it("a check that throws uploads nothing and fails with a reason code", async () => {
    const f = fake({ check: () => Promise.reject(new Error("boom")) });
    expect(await runBackup(f.deps, input)).toMatchObject({ result: "failed", reason: "account_check_failed" });
    expect(f.puts).toEqual([]);
  });

  it("an export that refuses ends abandoned without a check or an upload", async () => {
    const f = fake({ exported: { kind: "rejection" } });
    expect(await runBackup(f.deps, input)).toMatchObject({ result: "abandoned" });
    expect(f.calls).toEqual(["begin", "fingerprint", "export", "finish"]);
  });

  it("a failed export is failed with its reason and uploads nothing", async () => {
    const f = fake({ exported: { kind: "failed", reason: "export_failed" } });
    expect(await runBackup(f.deps, input)).toMatchObject({ result: "failed", reason: "export_failed" });
    expect(f.puts).toEqual([]);
  });

  it("an upload error is failed with upload_failed and prunes nothing", async () => {
    const f = fake({ put: () => Promise.reject(new Error("net")) });
    expect(await runBackup(f.deps, input)).toMatchObject({ result: "failed", reason: "upload_failed" });
    expect(f.calls).not.toContain("list");
  });

  it("prunes what the plan removes and sums the size of what is left", async () => {
    const dates = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08",
      "2026-10-27", "2026-10-20", "2026-10-13", "2026-10-06", "2026-09-29", "2026-09-22", "2026-09-15"];
    const listed = dates.map((d) => ({ key: `accounts/${ID}/${d}.json.gz`, size: 10 }));
    const f = fake({ listed });
    expect(await runBackup(f.deps, input)).toMatchObject({ result: "written", confirmed: true });
    expect(f.removed.sort()).toEqual(["2026-09-15", "2026-09-22", "2026-09-29"].map((d) => `accounts/${ID}/${d}.json.gz`));
    expect(f.calls.indexOf("remove")).toBeGreaterThan(f.calls.indexOf("put"));
    expect(f.finishes[0].args?.storedBytes).toBe(110);
  });

  it("a prune that fails still records written, counting the files left", async () => {
    const dates = ["2026-10-01", "2026-10-08", "2026-10-15", "2026-10-22", "2026-10-29", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08", "2026-09-01", "2026-09-08"];
    const listed = dates.map((d) => ({ key: `accounts/${ID}/${d}.json.gz`, size: 10 }));
    const f = fake({ listed, remove: () => Promise.reject(new Error("net")) });
    const out = await runBackup(f.deps, input);
    expect(out).toMatchObject({ result: "written", confirmed: true });
    expect(f.finishes[0].args?.storedBytes).toBe(140);
  });

  it("an unexpected throw after begin is recorded as failed internal_error", async () => {
    const f = fake({ exported: () => Promise.reject(new Error("x")) });
    expect(await runBackup(f.deps, input)).toMatchObject({ result: "failed", reason: "internal_error", confirmed: true });
  });

  it("a finish the database did not confirm is reported unconfirmed", async () => {
    expect(await runBackup(fake({ finish: () => Promise.resolve(false) }).deps, input)).toMatchObject({ result: "written", confirmed: false });
    expect(await runBackup(fake({ finish: () => Promise.reject(new Error("net")) }).deps, input)).toMatchObject({ confirmed: false });
  });

  it("logs the code of a SafeError or the name of another error, never a message", async () => {
    const lines: string[] = [];
    const a = fake({ put: () => Promise.reject(new SafeError("put_403")), log: (m) => lines.push(m) });
    await runBackup(a.deps, input);
    const b = fake({ check: () => Promise.reject(new Error("https://r2.example/secret-key")), log: (m) => lines.push(m) });
    await runBackup(b.deps, input);
    expect(lines).toEqual(["upload failed: put_403", "account check failed: Error"]);
  });

  it("an unchanged run that meets a deletion request records nothing", async () => {
    const f = fake({ fingerprint: "old", check: "account_deleting" });
    expect(await runBackup(f.deps, input)).toMatchObject({ result: "abandoned" });
    expect(f.finishes).toEqual([{ result: "abandoned", args: undefined }]);
  });

  it("an unchanged run rewrites identity.json when a provider was linked, or the file is missing", async () => {
    for (const stored of [JSON.stringify({ user_id: ID, providers: [] }), null]) {
      const f = fake({ fingerprint: "old", stored });
      expect(await runBackup(f.deps, input)).toMatchObject({ result: "unchanged", confirmed: true });
      expect(f.puts).toEqual([`accounts/${ID}/identity.json`]);
    }
  });

  it("an unchanged run whose identity refresh fails is failed, not unchanged", async () => {
    const f = fake({ fingerprint: "old", stored: null, put: () => Promise.reject(new Error("net")) });
    expect(await runBackup(f.deps, input)).toMatchObject({ result: "failed", reason: "upload_failed" });
  });
});
