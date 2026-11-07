// deno-lint-ignore-file require-await
import { describe, expect, it } from "vitest";
import { beginRestore, resultFromVerdict, runRestore, type RestoreAccountAnswer, type RestoreDeps } from "./restore-run.ts";
import type { RestoreEvent } from "./sse.ts";
import type { ExportAnswer } from "./run.ts";

const USER = "3f2b8c1e-5a47-4d0e-9b6a-1c2d3e4f5a6b";
const RID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FP = "0123456789abcdef0123456789abcdef";
const P = `accounts/${USER}/`;
const input = { userId: USER, restoreId: RID, file: "2026-11-05" };
const payload = new TextEncoder().encode('{"bits": [], "nodes": []}');

type Opts = {
  exported?: ExportAnswer;
  check?: string;
  put?: () => Promise<void>;
  keys?: string[];
  remove?: () => Promise<void>;
  bytes?: Uint8Array | null | Error;
  gunzip?: Uint8Array | null | Error;
  stage?: string | Error;
  abort?: string | Error;
  restore?: RestoreAccountAnswer[]; // answers in call order
  verdict?: string | null | Error;
};

function fake(o: Opts = {}) {
  const calls: string[] = [];
  const puts: string[] = [];
  const removed: string[][] = [];
  const aborts: string[] = [];
  const logs: string[] = [];
  const answers = [...(o.restore ?? [{ kind: "answer", status: "applied" } as RestoreAccountAnswer])];
  const val = <T>(v: T | Error): T => {
    if (v instanceof Error) throw v;
    return v;
  };
  const deps: RestoreDeps = {
    now: () => new Date("2026-11-07T12:30:05Z"),
    begin: () => (calls.push("begin"), Promise.resolve({ status: "applied" })),
    exportGzip: () => (calls.push("export"), Promise.resolve(o.exported ?? { kind: "ok", body: new Uint8Array([9]), fingerprint: FP })),
    accountCheck: () => (calls.push("check"), Promise.resolve(o.check ?? "ok")),
    put: async (key) => {
      calls.push("put");
      puts.push(key);
      await (o.put ? o.put() : Promise.resolve());
    },
    getBytes: async () => (calls.push("get"), val(o.bytes === undefined ? new Uint8Array([1]) : o.bytes)),
    list: async () => (calls.push("list"), (o.keys ?? [`${P}pre-restore/2026-11-07T12-30-05Z.json.gz`]).map((key) => ({ key, size: 1 }))),
    remove: async (keys) => {
      calls.push("remove");
      removed.push(keys);
      await (o.remove ? o.remove() : Promise.resolve());
    },
    gunzip: async () => (calls.push("gunzip"), val(o.gunzip === undefined ? payload : o.gunzip)),
    stage: async () => (calls.push("stage"), val(o.stage ?? "applied")),
    abort: async (_u, _r, reason) => {
      calls.push("abort");
      aborts.push(reason);
      return val(o.abort ?? "applied");
    },
    restoreAccount: async (_r, fp) => {
      calls.push(`restore:${fp}`);
      return answers.shift() ?? { kind: "answer", status: "applied" };
    },
    verdict: async () => (calls.push("verdict"), val(o.verdict === undefined ? "not_applied" : o.verdict)),
    log: (m) => logs.push(m),
  };
  return { deps, calls, puts, removed, aborts, logs };
}

async function run(o: Opts = {}, emit?: (e: RestoreEvent) => void) {
  const f = fake(o);
  const events: RestoreEvent[] = [];
  const result = await runRestore(f.deps, input, emit ?? ((e) => events.push(e)));
  return { ...f, events, result };
}

describe("runRestore", () => {
  it("runs begin's successor steps in SCHEMA's order and emits the three steps, then the result", async () => {
    const r = await run();
    expect(r.calls).toEqual(["export", "check", "put", "list", "get", "gunzip", "stage", `restore:${FP}`]);
    expect(r.events).toEqual([
      { type: "step", step: "saving" },
      { type: "step", step: "getting" },
      { type: "step", step: "applying" },
      { type: "result", result: { status: "applied" } },
    ]);
    expect(r.result).toEqual({ status: "applied" });
    expect(r.puts).toEqual([`${P}pre-restore/2026-11-07T12-30-05Z.json.gz`]);
    expect(r.aborts).toEqual([]);
  });

  it("emits `saving` before the export starts", async () => {
    const order: string[] = [];
    const f = fake();
    const inner = f.deps.exportGzip;
    f.deps.exportGzip = (u) => (order.push("export"), inner(u));
    await runRestore(f.deps, input, (e) => order.push(e.type === "step" ? e.step : "result"));
    expect(order.slice(0, 2)).toEqual(["saving", "export"]);
  });

  it("beginRestore is the first call and a refusal leaves nothing else called", async () => {
    const f = fake();
    f.deps.begin = () => Promise.resolve({ status: "rejected", code: "rate_limited" });
    expect(await beginRestore(f.deps, { userId: USER, restoreId: RID })).toEqual({ status: "rejected", code: "rate_limited" });
    expect(f.calls).toEqual([]);
  });

  it("a failed pre-restore upload stops with nothing staged or restored and a recorded not-applied result", async () => {
    const r = await run({ put: () => Promise.reject(new Error("put_500")) });
    expect(r.calls).toEqual(["export", "check", "put", "abort"]);
    expect(r.aborts).toEqual(["upload_failed"]);
    expect(r.result).toEqual({ status: "not_applied", reason: "upload_failed" });
    expect(r.events.at(-1)).toEqual({ type: "result", result: { status: "not_applied", reason: "upload_failed" } });
  });

  it("a failed export stops with its reason, and a reason that is not a code becomes restore_failed", async () => {
    expect((await run({ exported: { kind: "failed", reason: "export_unreadable" } })).aborts).toEqual(["export_unreadable"]);
    expect((await run({ exported: { kind: "failed", reason: "Bad Reason!" } })).aborts).toEqual(["restore_failed"]);
    expect((await run({ exported: { kind: "rejection" } })).aborts).toEqual(["account_unavailable"]);
  });

  it("stops when the export carries no fingerprint, and uploads nothing", async () => {
    const r = await run({ exported: { kind: "ok", body: new Uint8Array([1]), fingerprint: null } });
    expect(r.aborts).toEqual(["fingerprint_missing"]);
    expect(r.puts).toEqual([]);
  });

  it("stops when the account has a deletion request or is gone, and uploads nothing", async () => {
    for (const check of ["account_deleting", "account_missing", "weird"]) {
      const r = await run({ check });
      expect(r.aborts).toEqual(["account_unavailable"]);
      expect(r.puts).toEqual([]);
    }
  });

  it("prunes pre-restore files to the 5 latest and never removes the chosen one", async () => {
    const chosen = `${P}pre-restore/2026-11-01T10-00-00Z.json.gz`;
    const keys = [chosen, ...[2, 3, 4, 5].map((d) => `${P}pre-restore/2026-11-0${d}T10-00-00Z.json.gz`), `${P}pre-restore/2026-11-07T12-30-05Z.json.gz`];
    const r = await runRestore(fake({ keys }).deps, { ...input, file: "pre-restore/2026-11-01T10-00-00Z" }, () => {});
    expect(r).toEqual({ status: "applied" });
    const f = fake({ keys });
    await runRestore(f.deps, { ...input, file: "pre-restore/2026-11-01T10-00-00Z" }, () => {});
    expect(f.removed).toEqual([]); // six files, the sixth being the chosen oldest: nothing removed

    const more = [`${P}pre-restore/2026-10-01T10-00-00Z.json.gz`, ...keys];
    const g = fake({ keys: more });
    await runRestore(g.deps, { ...input, file: "pre-restore/2026-11-01T10-00-00Z" }, () => {});
    expect(g.removed).toEqual([[`${P}pre-restore/2026-10-01T10-00-00Z.json.gz`]]);
  });

  it("a prune failure does not stop the restore", async () => {
    const keys = Array.from({ length: 7 }, (_, i) => `${P}pre-restore/2026-11-0${i + 1}T10-00-00Z.json.gz`);
    const r = await run({ keys, remove: () => Promise.reject(new Error("delete_500")) });
    expect(r.result).toEqual({ status: "applied" });
    expect(r.logs.some((l) => l.startsWith("pre-restore prune failed"))).toBe(true);
  });

  it("stops on a missing, unreadable or non-export backup", async () => {
    expect((await run({ bytes: null })).aborts).toEqual(["backup_missing"]);
    expect((await run({ bytes: new Error("get_500") })).aborts).toEqual(["fetch_failed"]);
    expect((await run({ gunzip: null })).aborts).toEqual(["backup_unreadable"]);
    expect((await run({ gunzip: new Error("zlib") })).aborts).toEqual(["backup_unreadable"]);
    expect((await run({ gunzip: new TextEncoder().encode('{"hello": 1}') })).aborts).toEqual(["backup_unreadable"]);
    const r = await run({ bytes: null });
    expect(r.calls).not.toContain("stage");
  });

  it("stops when staging errors or is refused", async () => {
    expect((await run({ stage: new Error("rpc_restore_stage") })).aborts).toEqual(["stage_failed"]);
    expect((await run({ stage: "not_applied" })).aborts).toEqual(["stage_refused"]);
  });

  it("calls restore_account with the fingerprint of the very export that was uploaded", async () => {
    const r = await run();
    expect(r.calls).toContain(`restore:${FP}`);
    expect(r.calls.indexOf("put")).toBeLessThan(r.calls.indexOf(`restore:${FP}`));
  });

  it("maps every restore_account answer", async () => {
    const answer = (status: string, code?: string): RestoreAccountAnswer => ({ kind: "answer", status, code });
    expect((await run({ restore: [answer("applied")] })).result).toEqual({ status: "applied" });
    expect((await run({ restore: [answer("already_applied")] })).result).toEqual({ status: "applied" });
    expect((await run({ restore: [answer("not_applied")] })).result).toEqual({ status: "not_applied" });
    for (const code of ["account_changed", "unsupported_format", "account_missing", "account_deleting", "invalid_input"]) {
      expect((await run({ restore: [answer("rejected", code)] })).result).toEqual({ status: "rejected", rejection: { code } });
    }
    // account_changed and unsupported_format already hold their result from the SQL function.
    expect((await run({ restore: [answer("rejected", "account_changed")] })).aborts).toEqual([]);
    expect((await run({ restore: [answer("rejected", "unsupported_format")] })).aborts).toEqual([]);
  });

  it("closes the row after account_missing, account_deleting or invalid_input and still reports the rejection", async () => {
    for (const code of ["account_missing", "account_deleting", "invalid_input"]) {
      const r = await run({ restore: [{ kind: "answer", status: "rejected", code }] });
      expect(r.aborts).toEqual([code]);
      expect(r.result).toEqual({ status: "rejected", rejection: { code } });
      expect(r.calls.at(-1)).toBe("abort");
    }
    // A failing abort changes nothing about the reported rejection.
    const r = await run({ restore: [{ kind: "answer", status: "rejected", code: "account_deleting" }], abort: new Error("rpc") });
    expect(r.result).toEqual({ status: "rejected", rejection: { code: "account_deleting" } });
  });

  it("retries restore_account once on a deadlock, and reports the retry's result", async () => {
    const dead: RestoreAccountAnswer = { kind: "error", sqlstate: "40P01" };
    const r = await run({ restore: [dead, { kind: "answer", status: "applied" }] });
    expect(r.calls.filter((c) => c.startsWith("restore:")).length).toBe(2);
    expect(r.result).toEqual({ status: "applied" });
    const again = await run({ restore: [dead, { kind: "answer", status: "already_applied" }] });
    expect(again.result).toEqual({ status: "applied" });
  });

  it("stops after a second deadlock, and never retries another error", async () => {
    const dead: RestoreAccountAnswer = { kind: "error", sqlstate: "40P01" };
    const twice = await run({ restore: [dead, dead] });
    expect(twice.calls.filter((c) => c.startsWith("restore:")).length).toBe(2);
    expect(twice.aborts).toEqual(["restore_failed"]);
    expect(twice.result).toEqual({ status: "not_applied", reason: "restore_failed" });
    const other = await run({ restore: [{ kind: "error", sqlstate: "23514" }] });
    expect(other.calls.filter((c) => c.startsWith("restore:")).length).toBe(1);
    expect(other.aborts).toEqual(["restore_failed"]);
  });

  it("a transport error on a call that still commits reports the verdict, never not applied (measurement b)", async () => {
    // restore_abort() waits on the row lock, finds the committed result and answers not_applied.
    const r = await run({ restore: [{ kind: "error", sqlstate: null }], abort: "not_applied", verdict: "applied" });
    expect(r.aborts).toEqual(["restore_failed"]);
    expect(r.calls.slice(-2)).toEqual(["abort", "verdict"]);
    expect(r.result).toEqual({ status: "applied" });
    expect(r.events.at(-1)).toEqual({ type: "result", result: { status: "applied" } });
  });

  it("reports unconfirmed when the abort or the verdict read fails or the verdict does not settle it", async () => {
    const err: RestoreAccountAnswer = { kind: "error", sqlstate: null };
    expect((await run({ restore: [err], abort: new Error("rpc") })).result).toEqual({ status: "unconfirmed" });
    expect((await run({ restore: [err], abort: "not_applied", verdict: new Error("rpc") })).result).toEqual({ status: "unconfirmed" });
    expect((await run({ restore: [err], abort: "not_applied", verdict: "finishing" })).result).toEqual({ status: "unconfirmed" });
    expect((await run({ restore: [err], abort: "not_applied", verdict: "account_changed" })).result).toEqual({
      status: "rejected", rejection: { code: "account_changed" },
    });
  });

  it("a stream that throws on every write changes nothing", async () => {
    const f = fake();
    const result = await runRestore(f.deps, input, () => {
      throw new TypeError("stream closed");
    });
    expect(result).toEqual({ status: "applied" });
    expect(f.calls).toContain(`restore:${FP}`);
  });

  it("an unexpected throw stops through the abort", async () => {
    const f = fake();
    f.deps.now = () => {
      throw new Error("clock");
    };
    const result = await runRestore(f.deps, input, () => {});
    expect(result).toEqual({ status: "not_applied", reason: "internal_error" });
  });
});

describe("resultFromVerdict", () => {
  it("settles only a result", () => {
    expect(resultFromVerdict("applied")).toEqual({ status: "applied" });
    expect(resultFromVerdict("not_applied")).toEqual({ status: "not_applied" });
    for (const v of ["finishing", "expired", "not_started", null, "x"]) expect(resultFromVerdict(v)).toBeNull();
  });
});
