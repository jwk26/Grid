import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBackupClient, type RestoreStep } from "@/lib/backup/backup-client";
import { EDGE_REQUEST_TIMEOUT_MS } from "@/lib/constants";
import type { GriddoSupabaseClient } from "@/lib/db/supabase-client";

const ID = "00000000-0000-4000-8000-0000000000aa";
const REQ = (onStep: (s: RestoreStep) => void = () => undefined) => ({ restoreId: ID, file: "2026-11-07", etag: "abc", onStep });

type Invoked = { data: unknown; error: unknown };
function setup(impl: (name: string, opts: { body: unknown; signal?: AbortSignal }) => Promise<Invoked>, extra = {}) {
  const invoke = vi.fn(impl);
  const client = { functions: { invoke } } as unknown as GriddoSupabaseClient;
  return { invoke, api: createBackupClient({ getClient: () => client, ...extra }) };
}

const enc = new TextEncoder();
/** A stream `Response` that yields `chunks`, then ends (or stalls when `stall`). */
function stream(chunks: string[], stall = false): Response {
  let i = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(enc.encode(chunks[i++]));
      else if (!stall) controller.close();
      else return new Promise(() => undefined);
    },
  });
  return new Response(body, { headers: { "Content-Type": "text/event-stream" } });
}
const step = (s: string) => `event: step\ndata: {"step":"${s}"}\n\n`;
const result = (r: unknown) => `event: result\ndata: ${JSON.stringify(r)}\n\n`;
const streamOf = (...chunks: string[]) => async () => ({ data: stream(chunks), error: null });

afterEach(() => vi.useRealTimers());

describe("restore", () => {
  it("sends the mode, restore id, file and etag, with a signal", async () => {
    const { invoke, api } = setup(streamOf(result({ status: "applied" })));
    await api.restore(REQ());
    expect(invoke.mock.calls[0][0]).toBe("backup");
    expect(invoke.mock.calls[0][1]).toMatchObject({ body: { mode: "restore", restore_id: ID, file: "2026-11-07", etag: "abc" } });
    expect(invoke.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("reports each step as the stream reaches it, then the result", async () => {
    const steps: RestoreStep[] = [];
    const { api } = setup(streamOf(step("saving"), step("getting"), step("applying"), result({ status: "applied" })));
    expect(await api.restore(REQ((s) => steps.push(s)))).toEqual({ kind: "applied" });
    expect(steps).toEqual(["saving", "getting", "applying"]);
  });

  it("reads the same events whatever the chunk split", async () => {
    const whole = step("saving") + step("getting") + result({ status: "applied" });
    for (let i = 0; i <= whole.length; i++) {
      const steps: RestoreStep[] = [];
      const { api } = setup(streamOf(whole.slice(0, i), whole.slice(i)));
      expect(await api.restore(REQ((s) => steps.push(s)))).toEqual({ kind: "applied" });
      expect(steps).toEqual(["saving", "getting"]);
    }
  });

  it("maps every result of the vocabulary", async () => {
    const cases: [unknown, unknown][] = [
      [{ status: "applied" }, { kind: "applied" }],
      [{ status: "not_applied", reason: "upload_failed" }, { kind: "not_applied" }],
      [{ status: "rejected", rejection: { code: "account_changed" } }, { kind: "account_changed" }],
      [{ status: "rejected", rejection: { code: "unsupported_format" } }, { kind: "unsupported_format" }],
      [{ status: "rejected", rejection: { code: "rate_limited" } }, { kind: "rate_limited" }],
      [{ status: "rejected", rejection: { code: "already_running" } }, { kind: "rate_limited" }],
      [{ status: "rejected", rejection: { code: "account_deleting" } }, { kind: "not_applied" }],
      [{ status: "rejected", rejection: { code: "invalid_input" } }, { kind: "not_applied" }],
      [{ status: "unconfirmed" }, { kind: "unknown" }],
      [{ status: "huh" }, { kind: "unknown" }],
    ];
    for (const [r, expected] of cases) {
      expect(await setup(streamOf(step("saving"), result(r))).api.restore(REQ())).toEqual(expected);
    }
  });

  it("a refusal before staging arrives as JSON and maps the same way", async () => {
    const json = (data: unknown) => async () => ({ data, error: null });
    expect(await setup(json({ status: "rejected", rejection: { code: "rate_limited" } })).api.restore(REQ())).toEqual({ kind: "rate_limited" });
    expect(await setup(json({ status: "rejected", rejection: { code: "not_eligible" } })).api.restore(REQ())).toEqual({ kind: "not_applied" });
    expect(await setup(json(null)).api.restore(REQ())).toEqual({ kind: "unknown" });
  });

  it("a stream that ends with no result is unknown, at once", async () => {
    const { api } = setup(streamOf(step("saving"), step("getting")));
    expect(await api.restore(REQ())).toEqual({ kind: "unknown" });
  });

  it("an answered refusal is not applied; a no-answer status and a fetch error are unknown", async () => {
    const http = (status: number) => async () => ({ data: null, error: new FunctionsHttpError({ status } as Response) });
    for (const s of [400, 401, 403]) expect(await setup(http(s)).api.restore(REQ())).toEqual({ kind: "not_applied" });
    for (const s of [408, 500, 502, 504, 546]) expect(await setup(http(s)).api.restore(REQ())).toEqual({ kind: "unknown" });
    expect(await setup(async () => ({ data: null, error: new FunctionsFetchError({}) })).api.restore(REQ())).toEqual({ kind: "unknown" });
    expect(await setup(async () => { throw new TypeError("x"); }).api.restore(REQ())).toEqual({ kind: "unknown" });
  });

  it("headers, then a stall: the deadline from the request start ends it as unknown, never resent", async () => {
    vi.useFakeTimers();
    const steps: RestoreStep[] = [];
    const { invoke, api } = setup(async () => ({ data: stream([step("saving")], true), error: null }));
    const pending = api.restore(REQ((s) => steps.push(s)));
    await vi.advanceTimersByTimeAsync(EDGE_REQUEST_TIMEOUT_MS - 1);
    expect(invoke.mock.calls[0][1].signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual({ kind: "unknown" });
    expect(invoke.mock.calls[0][1].signal?.aborted).toBe(true);
    expect(steps).toEqual(["saving"]);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("the deadline runs from before the request, not from the headers", async () => {
    vi.useFakeTimers();
    const { api } = setup(
      (_n, opts) =>
        new Promise((resolve) => {
          // The headers arrive 100 s in; the stream then stalls.
          setTimeout(() => resolve({ data: stream([], true), error: null }), 100_000);
          opts.signal?.addEventListener("abort", () => resolve({ data: null, error: new FunctionsFetchError({}) }));
        }),
    );
    const pending = api.restore(REQ());
    await vi.advanceTimersByTimeAsync(100_000);
    await vi.advanceTimersByTimeAsync(EDGE_REQUEST_TIMEOUT_MS - 100_000);
    expect(await pending).toEqual({ kind: "unknown" });
  });

  it("clears its timer at the result", async () => {
    vi.useFakeTimers();
    const { api } = setup(streamOf(result({ status: "applied" })));
    expect(await api.restore(REQ())).toEqual({ kind: "applied" });
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("restore injections", () => {
  it("restore-unknown-before-send does not send", async () => {
    const { invoke, api } = setup(streamOf(), { takeInjection: (op: string) => (op === "restore" ? "restore-unknown-before-send" : null) });
    expect(await api.restore(REQ())).toEqual({ kind: "unknown" });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("restore-unknown-after-send sends once and answers unknown after a settle", async () => {
    const { invoke, api } = setup(streamOf(result({ status: "applied" })), {
      takeInjection: (op: string) => (op === "restore" ? "restore-unknown-after-send" : null),
    });
    vi.useFakeTimers();
    const answer = api.restore(REQ());
    await vi.advanceTimersByTimeAsync(1000);
    expect(await answer).toEqual({ kind: "unknown" });
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});

describe("readRestoreVerdict", () => {
  const ok = (data: unknown) => async () => ({ data, error: null });
  it("sends the restore id and reads the verdict", async () => {
    const { invoke, api } = setup(ok({ status: "applied", result: { restore_verdict: "finishing", backup: null } }));
    expect(await api.readRestoreVerdict(ID)).toEqual({ kind: "ok", verdict: "finishing" });
    expect(invoke.mock.calls[0][1]).toMatchObject({ body: { mode: "status", restore_id: ID } });
  });
  it("any failure is failed", async () => {
    expect(await setup(ok({ status: "applied" })).api.readRestoreVerdict(ID)).toEqual({ kind: "failed" });
    expect(await setup(async () => ({ data: null, error: new FunctionsFetchError({}) })).api.readRestoreVerdict(ID)).toEqual({ kind: "failed" });
  });
});

describe("the list in the plain status read", () => {
  const ok = (data: unknown) => async () => ({ data, error: null });
  const entry = { name: "2026-11-07", kind: "daily", at: 5, size: 9, etag: "e" };
  it("reads entries, null for a failed listing, and leaves it out when absent", async () => {
    const withList = setup(ok({ status: "applied", result: { backup: null, verdict: null, backups: [entry, { bad: 1 }] } }));
    expect(await withList.api.readStatus(null)).toMatchObject({ kind: "ok", backups: [entry] });
    const failed = setup(ok({ status: "applied", result: { backup: null, verdict: null, backups: null } }));
    expect(await failed.api.readStatus(null)).toMatchObject({ backups: null });
    const absent = setup(ok({ status: "applied", result: { backup: null, verdict: null } }));
    expect(await absent.api.readStatus(null)).not.toHaveProperty("backups");
  });
});

describe("ensureFreshSession", () => {
  function auth(expiresInMs: number, refresh: unknown = { data: { session: { user: { id: "u2" } } }, error: null }) {
    const refreshSession = vi.fn(async () => refresh);
    const getSession = vi.fn(async () => ({
      data: { session: { expires_at: Math.floor((Date.now() + expiresInMs) / 1000), user: { id: "u1" } } },
      error: null,
    }));
    const client = { auth: { getSession, refreshSession } } as unknown as GriddoSupabaseClient;
    return { refreshSession, api: createBackupClient({ getClient: () => client }) };
  }
  it("keeps a session that outlives the margin", async () => {
    const { api, refreshSession } = auth(10 * 60_000);
    expect(await api.ensureFreshSession()).toEqual({ ok: true, userId: "u1" });
    expect(refreshSession).not.toHaveBeenCalled();
  });
  it("refreshes a token expiring within 3 minutes", async () => {
    const { api, refreshSession } = auth(2 * 60_000);
    expect(await api.ensureFreshSession()).toEqual({ ok: true, userId: "u2" });
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });
  it("a failed refresh is not ok", async () => {
    expect(await auth(60_000, { data: { session: null }, error: { message: "x" } }).api.ensureFreshSession()).toEqual({ ok: false });
  });
});
