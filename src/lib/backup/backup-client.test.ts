import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBackupClient } from "@/lib/backup/backup-client";
import { EDGE_REQUEST_TIMEOUT_MS, REQUEST_TIMEOUT_MS } from "@/lib/constants";
import type { GriddoSupabaseClient } from "@/lib/db/supabase-client";

const RUN = "00000000-0000-4000-8000-000000000001";
const rawBackup = { run_started_at: null, last_checked_at: 1, last_file_at: 1, last_result: "written", failure_reason: null, server_now: 9 };

type InvokeResult = { data: unknown; error: unknown };
function setup(impl: (name: string, opts: { body: unknown; signal?: AbortSignal }) => Promise<InvokeResult>, extra = {}) {
  const invoke = vi.fn(impl);
  const client = { functions: { invoke } } as unknown as GriddoSupabaseClient;
  return { invoke, api: createBackupClient({ getClient: () => client, ...extra }) };
}
const ok = (data: unknown) => async () => ({ data, error: null });
const http = (status: number) => async () => ({ data: null, error: new FunctionsHttpError({ status } as Response) });

afterEach(() => vi.useRealTimers());

describe("backUpNow", () => {
  it("sends the mode and the run id to the `backup` function, with a signal", async () => {
    const { invoke, api } = setup(ok({ status: "applied", result: { result: "unchanged" } }));
    await api.backUpNow(RUN);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke.mock.calls[0][0]).toBe("backup");
    expect(invoke.mock.calls[0][1]).toMatchObject({ body: { mode: "manual", run_id: RUN } });
    expect(invoke.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("reads a result with its backup value, or with none", async () => {
    const withBackup = setup(ok({ status: "applied", result: { result: "written" }, backup: rawBackup }));
    expect(await withBackup.api.backUpNow(RUN)).toMatchObject({ kind: "result", result: "written", backup: { serverNow: 9 } });
    const without = setup(ok({ status: "applied", result: { result: "failed", reason: "too_large" } }));
    expect(await without.api.backUpNow(RUN)).toEqual({ kind: "result", result: "failed", reason: "too_large", backup: undefined });
  });

  it("reads rate_limited and already_running rejections", async () => {
    for (const code of ["rate_limited", "already_running"] as const) {
      const { api } = setup(ok({ status: "rejected", rejection: { code } }));
      expect(await api.backUpNow(RUN)).toEqual({ kind: "rejected", code });
    }
  });

  it("every other definite refusal is `refused` (did not start)", async () => {
    for (const code of ["account_deleting", "account_missing", "not_eligible", "weird"]) {
      const { api } = setup(ok({ status: "rejected", rejection: { code } }));
      expect(await api.backUpNow(RUN)).toEqual({ kind: "refused" });
    }
    for (const status of [400, 401, 403, 404, 405, 422]) {
      expect(await setup(http(status)).api.backUpNow(RUN)).toEqual({ kind: "refused" });
    }
  });

  it("a no-answer status, a fetch or relay error and an unreadable 200 are unknown", async () => {
    for (const status of [408, 500, 502, 503, 504, 546]) {
      expect(await setup(http(status)).api.backUpNow(RUN)).toEqual({ kind: "unknown" });
    }
    for (const error of [new FunctionsFetchError({}), new FunctionsRelayError({})]) {
      expect(await setup(async () => ({ data: null, error })).api.backUpNow(RUN)).toEqual({ kind: "unknown" });
    }
    for (const data of [null, "text", { status: "applied" }, { status: "applied", result: { result: "huh" } }, { status: "unconfirmed" }]) {
      expect(await setup(ok(data)).api.backUpNow(RUN)).toEqual({ kind: "unknown" });
    }
  });

  it("waits EDGE_REQUEST_TIMEOUT_MS, then aborts and answers unknown, without resending", async () => {
    vi.useFakeTimers();
    const { invoke, api } = setup(
      (_name, opts) =>
        new Promise((resolve) => {
          opts.signal?.addEventListener("abort", () => resolve({ data: null, error: new FunctionsFetchError({}) }));
        }),
    );
    const pending = api.backUpNow(RUN);
    await vi.advanceTimersByTimeAsync(EDGE_REQUEST_TIMEOUT_MS - 1);
    expect(invoke.mock.calls[0][1].signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual({ kind: "unknown" });
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("a thrown error is unknown", async () => {
    const { api } = setup(async () => {
      throw new TypeError("network");
    });
    expect(await api.backUpNow(RUN)).toEqual({ kind: "unknown" });
  });
});

describe("readStatus", () => {
  it("sends the run id or null and reads the backup value and the verdict", async () => {
    const { invoke, api } = setup(ok({ status: "applied", result: { backup: rawBackup, verdict: "running" } }));
    expect(await api.readStatus(RUN)).toMatchObject({ kind: "ok", backup: { serverNow: 9 }, verdict: "running" });
    await api.readStatus(null);
    expect(invoke.mock.calls[1][1]).toMatchObject({ body: { mode: "status", run_id: null } });
  });

  it("a row that does not exist is a null value", async () => {
    const { api } = setup(ok({ status: "applied", result: { backup: null, verdict: null } }));
    expect(await api.readStatus(null)).toEqual({ kind: "ok", backup: null, verdict: null });
  });

  it("any failure is `failed`, including a no-answer status and an unreadable body", async () => {
    expect(await setup(http(401)).api.readStatus(null)).toEqual({ kind: "failed" });
    expect(await setup(http(504)).api.readStatus(null)).toEqual({ kind: "failed" });
    expect(await setup(ok({ status: "applied" })).api.readStatus(null)).toEqual({ kind: "failed" });
    expect(await setup(ok("x")).api.readStatus(null)).toEqual({ kind: "failed" });
  });

  it("waits REQUEST_TIMEOUT_MS", async () => {
    vi.useFakeTimers();
    const { api } = setup(
      (_n, opts) =>
        new Promise((resolve) => {
          opts.signal?.addEventListener("abort", () => resolve({ data: null, error: new FunctionsFetchError({}) }));
        }),
    );
    const pending = api.readStatus(null);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    expect(await pending).toEqual({ kind: "failed" });
  });
});

describe("development injections", () => {
  it("unknown-before-send does not send at all", async () => {
    const { invoke, api } = setup(ok({}), { takeInjection: (op: string) => (op === "manual" ? "unknown-before-send" : null) });
    expect(await api.backUpNow(RUN)).toEqual({ kind: "unknown" });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("unknown-after-send sends once and drops the answer", async () => {
    const { invoke, api } = setup(ok({ status: "applied", result: { result: "written" } }), {
      takeInjection: (op: string) => (op === "manual" ? "unknown-after-send" : null),
    });
    expect(await api.backUpNow(RUN)).toEqual({ kind: "unknown" });
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("status-failed fails the read without sending", async () => {
    const { invoke, api } = setup(ok({}), { takeInjection: (op: string) => (op === "status" ? "status-failed" : null) });
    expect(await api.readStatus(null)).toEqual({ kind: "failed" });
    expect(invoke).not.toHaveBeenCalled();
  });
});
