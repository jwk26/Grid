import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { bitToRow, nodeToRow } from "@/lib/db/row-mapping";
import {
  SnapshotStore,
  UnknownOutcomeError,
  parseSnapshotValue,
  type Envelope,
  type PendingEffect,
} from "@/lib/db/snapshot-store";
import type { Node } from "@/lib/db/schema";

const USER = "00000000-0000-4000-8000-0000000000aa";
const NODE_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_ID = "00000000-0000-4000-8000-000000000002";

const nodeRow = (id: string, extra: Partial<Node> = {}) =>
  nodeToRow({ ...baseEntities.node, id, ...extra }, USER);

const snapshotOf = (rows: Array<ReturnType<typeof nodeRow>>) => ({
  nodes: rows,
  bits: [],
  chunks: [],
  scratch_breakdowns: [],
  staged_candidates: [],
});

const applied = (rows: Array<ReturnType<typeof nodeRow>>, status: Envelope["status"] = "applied"): Envelope => ({
  status,
  result: null,
  changes: { nodes: { upserted: rows, deleted: [] } },
});

const move = (id: string, x: number): PendingEffect => ({ kind: "patch", table: "nodes", id, patch: { x } });

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function nodeX(store: SnapshotStore, id = NODE_ID): number | undefined {
  return store.getState().view.nodes.get(id)?.x;
}

async function loaded(rows = [nodeRow(NODE_ID, { x: 0, y: 0 }), nodeRow(OTHER_ID, { x: 5, y: 5 })]) {
  const fetchSnapshot = vi.fn(async () => snapshotOf(rows));
  const store = new SnapshotStore({ fetchSnapshot, requestTimeoutMs: 15_000 });
  await store.load();
  return { store, fetchSnapshot };
}

describe("parseSnapshotValue", () => {
  it("maps every table through row-mapping", () => {
    const result = parseSnapshotValue({
      ...snapshotOf([nodeRow(NODE_ID)]),
      bits: [bitToRow({ ...baseEntities.bit, id: OTHER_ID } as never, USER)],
    });
    expect(result.kind).toBe("snapshot");
    if (result.kind !== "snapshot") return;
    expect(result.data.nodes.get(NODE_ID)).toMatchObject({ id: NODE_ID, deadlineAllDay: false });
    expect(result.data.bits.get(OTHER_ID)).toMatchObject({ id: OTHER_ID, parentId: baseEntities.bit.parentId });
  });

  it("treats a value that holds a rejection as a rejection, never as an empty account", () => {
    expect(parseSnapshotValue({ rejection: { code: "account_missing" } })).toEqual({
      kind: "rejection",
      code: "account_missing",
    });
  });

  it("refuses a value that is neither", () => {
    expect(() => parseSnapshotValue({ nodes: [] })).toThrow();
    expect(() => parseSnapshotValue(null)).toThrow();
  });
});

describe("SnapshotStore: base and view", () => {
  it("loads the base and exposes it as the view", async () => {
    const { store } = await loaded();
    expect(store.getState().status).toEqual({ phase: "ready" });
    expect(nodeX(store)).toBe(0);
    expect(store.getState().pending).toEqual([]);
  });

  it("a snapshot rejection puts the store in the rejected phase with no rows", async () => {
    const store = new SnapshotStore({
      fetchSnapshot: async () => ({ rejection: { code: "account_missing" } }),
      requestTimeoutMs: 15_000,
    });
    await store.load();
    expect(store.getState().status).toEqual({ phase: "rejected", code: "account_missing" });
    expect(store.getState().view.nodes.size).toBe(0);
  });

  it("applies upserted and deleted rows of an envelope to the base through row-mapping", async () => {
    const { store } = await loaded();
    const send = vi.fn(async () =>
      ({
        status: "applied",
        result: null,
        changes: {
          nodes: { upserted: [nodeRow(NODE_ID, { x: 3, version: 2 })], deleted: [OTHER_ID] },
          bits: { upserted: [bitToRow({ ...baseEntities.bit, id: "b1" } as never, USER)], deleted: [] },
        },
      }) satisfies Envelope,
    );
    const outcome = await store.write({ effect: move(NODE_ID, 3), send });
    expect(outcome.outcome).toBe("applied");
    const view = store.getState().view;
    expect(view.nodes.get(NODE_ID)).toMatchObject({ x: 3, version: 2 });
    expect(view.nodes.has(OTHER_ID)).toBe(false);
    expect(view.bits.has("b1")).toBe(true);
  });

  it("getState keeps its reference until something changes, and subscribers hear changes", async () => {
    const { store } = await loaded();
    const first = store.getState();
    expect(store.getState()).toBe(first);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const d = deferred<Envelope>();
    const write = store.write({ effect: move(NODE_ID, 1), send: () => d.promise });
    expect(listener).toHaveBeenCalled();
    expect(store.getState()).not.toBe(first);
    d.resolve(applied([nodeRow(NODE_ID, { x: 1, version: 2 })]));
    await write;
    const calls = listener.mock.calls.length;
    unsubscribe();
    store.reset();
    expect(listener.mock.calls.length).toBe(calls);
  });
});

describe("SnapshotStore: the pending-write layer", () => {
  it("a pending write shows at once; the view is base + pending", async () => {
    const { store } = await loaded();
    const d = deferred<Envelope>();
    const write = store.write({ effect: move(NODE_ID, 4), send: () => d.promise });
    expect(nodeX(store)).toBe(4);
    expect(store.getState().pending).toEqual([
      expect.objectContaining({ table: "nodes", recordId: NODE_ID, state: "sent" }),
    ]);
    d.resolve(applied([nodeRow(NODE_ID, { x: 4, version: 2 })]));
    expect((await write).outcome).toBe("applied");
    expect(store.getState().pending).toEqual([]);
    expect(nodeX(store)).toBe(4);
  });

  it("one Node moved twice quickly ends in the second cell and never jumps back", async () => {
    const { store } = await loaded();
    const seen: Array<number | undefined> = [];
    store.subscribe(() => seen.push(nodeX(store)));
    const first = deferred<Envelope>();
    const second = deferred<Envelope>();
    const sendFirst = vi.fn(() => first.promise);
    const sendSecond = vi.fn(() => second.promise);

    const w1 = store.write({ effect: move(NODE_ID, 1), send: sendFirst });
    const w2 = store.write({ effect: move(NODE_ID, 2), send: sendSecond });
    expect(nodeX(store)).toBe(2);
    await flush();
    // writes to one record go out in order: the second waits for the first
    expect(sendFirst).toHaveBeenCalledTimes(1);
    expect(sendSecond).not.toHaveBeenCalled();
    expect(store.getState().pending.map((p) => p.state)).toEqual(["sent", "queued"]);

    first.resolve(applied([nodeRow(NODE_ID, { x: 1, version: 2 })]));
    await w1;
    await flush();
    expect(nodeX(store)).toBe(2);
    expect(sendSecond).toHaveBeenCalledTimes(1);

    second.resolve(applied([nodeRow(NODE_ID, { x: 2, version: 3 })]));
    await w2;
    expect(nodeX(store)).toBe(2);
    expect(store.getState().pending).toEqual([]);
    // the view never showed the old base (0) again, and ended on 2
    expect(seen.filter((x) => x === 0)).toEqual([]);
    expect(seen.at(-1)).toBe(2);
  });

  it("writes to different records are sent without waiting for each other", async () => {
    const { store } = await loaded();
    const a = deferred<Envelope>();
    const b = deferred<Envelope>();
    const sendA = vi.fn(() => a.promise);
    const sendB = vi.fn(() => b.promise);
    const wa = store.write({ effect: move(NODE_ID, 1), send: sendA });
    const wb = store.write({ effect: move(OTHER_ID, 6), send: sendB });
    await flush();
    expect(sendA).toHaveBeenCalledTimes(1);
    expect(sendB).toHaveBeenCalledTimes(1);
    a.resolve(applied([nodeRow(NODE_ID, { x: 1, version: 2 })]));
    b.resolve(applied([nodeRow(OTHER_ID, { x: 6, version: 2 })]));
    await Promise.all([wa, wb]);
  });

  it("a focus refetch during a pending write does not hide it", async () => {
    const { store, fetchSnapshot } = await loaded();
    const d = deferred<Envelope>();
    const write = store.write({ effect: move(NODE_ID, 7), send: () => d.promise });
    expect(await store.refetch()).toBe("applied");
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
    expect(nodeX(store)).toBe(7);
    expect(store.getState().pending).toHaveLength(1);
    d.resolve(applied([nodeRow(NODE_ID, { x: 7, version: 2 })]));
    await write;
    expect(nodeX(store)).toBe(7);
  });

  it("a refetch sent before a write settled is discarded and sent again", async () => {
    const rows = [nodeRow(NODE_ID, { x: 0 })];
    const stale = deferred<unknown>();
    const fetchSnapshot = vi
      .fn<() => Promise<unknown>>()
      .mockResolvedValueOnce(snapshotOf(rows)) // load
      .mockReturnValueOnce(stale.promise) // refetch A, sent before the write settled
      .mockResolvedValueOnce(snapshotOf([nodeRow(NODE_ID, { x: 1, version: 2 })])); // sent again
    const store = new SnapshotStore({ fetchSnapshot, requestTimeoutMs: 15_000 });
    await store.load();
    const seen: Array<number | undefined> = [];
    store.subscribe(() => seen.push(nodeX(store)));

    const refetch = store.refetch();
    const d = deferred<Envelope>();
    const write = store.write({ effect: move(NODE_ID, 1), send: () => d.promise });
    d.resolve(applied([nodeRow(NODE_ID, { x: 1, version: 2 })]));
    await write; // settles while refetch A is in flight
    stale.resolve(snapshotOf(rows)); // A answers with the older state
    expect(await refetch).toBe("applied");
    expect(fetchSnapshot).toHaveBeenCalledTimes(3);
    expect(nodeX(store)).toBe(1);
    expect(seen.filter((x) => x === 0)).toEqual([]);
  });

  it("a rejected result rolls the view back to the base from the envelope's current rows", async () => {
    const { store } = await loaded();
    const send = async (): Promise<Envelope> => ({
      status: "rejected",
      result: null,
      changes: { nodes: { upserted: [nodeRow(NODE_ID, { x: 0 })], deleted: [] } },
      rejection: { code: "cell_taken" },
    });
    const write = store.write({ effect: move(NODE_ID, 9), send });
    expect(nodeX(store)).toBe(9);
    const outcome = await write;
    expect(outcome.outcome).toBe("rejected");
    expect(outcome.envelope?.rejection).toEqual({ code: "cell_taken" });
    expect(nodeX(store)).toBe(0);
    expect(store.getState().pending).toEqual([]);
  });

  it("not_applied and conflict also roll back; already_applied counts as applied", async () => {
    for (const [status, expected] of [
      ["not_applied", "rejected"],
      ["conflict", "rejected"],
      ["already_applied", "applied"],
    ] as const) {
      const { store } = await loaded();
      const result = await store.write({
        effect: move(NODE_ID, 3),
        send: async () => applied([nodeRow(NODE_ID, { x: expected === "applied" ? 3 : 0 })], status),
      });
      expect(result.outcome, status).toBe(expected);
      expect(nodeX(store), status).toBe(expected === "applied" ? 3 : 0);
    }
  });

  it("a thrown send is an error: rolled back, the base untouched", async () => {
    const { store, fetchSnapshot } = await loaded();
    const outcome = await store.write({
      effect: move(NODE_ID, 8),
      send: async () => {
        throw new Error("boom");
      },
    });
    expect(outcome.outcome).toBe("error");
    expect(outcome.error).toBeInstanceOf(Error);
    expect(nodeX(store)).toBe(0);
    expect(store.getState().pending).toEqual([]);
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
  });

  it("a later write to the same record is sent after a failed first one", async () => {
    const { store } = await loaded();
    const first = deferred<Envelope>();
    const sendSecond = vi.fn(async () => applied([nodeRow(NODE_ID, { x: 2, version: 2 })]));
    const w1 = store.write({ effect: move(NODE_ID, 1), send: () => first.promise });
    const w2 = store.write({ effect: move(NODE_ID, 2), send: sendSecond });
    await flush();
    expect(sendSecond).not.toHaveBeenCalled();
    first.reject(new Error("network"));
    expect((await w1).outcome).toBe("error");
    expect((await w2).outcome).toBe("applied");
    expect(sendSecond).toHaveBeenCalledTimes(1);
    expect(nodeX(store)).toBe(2);
  });

  it("an answer that arrives after reset does not reach the new base", async () => {
    const { store } = await loaded();
    const d = deferred<Envelope>();
    const write = store.write({ effect: move(NODE_ID, 4), send: () => d.promise });
    store.reset();
    expect(store.getState().status).toEqual({ phase: "empty" });
    d.resolve(applied([nodeRow(NODE_ID, { x: 4, version: 2 })]));
    await write;
    expect(store.getState().view.nodes.size).toBe(0);
  });

  it("a request that ended without an answer is unknown: rolled back, refetched, never resent", async () => {
    const { store, fetchSnapshot } = await loaded();
    const send = vi.fn(async (): Promise<Envelope> => {
      throw new UnknownOutcomeError("no response");
    });
    const outcome = await store.write({ effect: move(NODE_ID, 6), send });
    expect(outcome.outcome).toBe("unknown");
    await flush();
    expect(send).toHaveBeenCalledTimes(1);
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
    expect(store.getState().pending).toEqual([]);
  });

  describe("unknown outcome", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("a request with no answer within the timeout is unknown: pending dropped, refetch, never resent", async () => {
      const fetchSnapshot = vi
        .fn<() => Promise<unknown>>()
        .mockResolvedValueOnce(snapshotOf([nodeRow(NODE_ID, { x: 0 })]))
        .mockResolvedValueOnce(snapshotOf([nodeRow(NODE_ID, { x: 0 })]));
      const store = new SnapshotStore({ fetchSnapshot, requestTimeoutMs: 15_000 });
      await store.load();
      const send = vi.fn(() => new Promise<Envelope>(() => undefined));
      const write = store.write({ effect: move(NODE_ID, 5), send });
      await vi.advanceTimersByTimeAsync(0);
      expect(nodeX(store)).toBe(5);
      await vi.advanceTimersByTimeAsync(15_000);
      const outcome = await write;
      expect(outcome.outcome).toBe("unknown");
      expect(send).toHaveBeenCalledTimes(1);
      expect(store.getState().pending).toEqual([]);
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchSnapshot).toHaveBeenCalledTimes(2);
      expect(nodeX(store)).toBe(0);
    });

    it("the record's next write waits for the timed-out request itself to end; its late answer causes one refetch", async () => {
      const fetchSnapshot = vi.fn<() => Promise<unknown>>(async () => snapshotOf([nodeRow(NODE_ID, { x: 0 })]));
      const store = new SnapshotStore({ fetchSnapshot, requestTimeoutMs: 15_000 });
      await store.load();
      const first = deferred<Envelope>();
      const sendFirst = vi.fn(() => first.promise);
      const sendSecond = vi.fn(async () => applied([nodeRow(NODE_ID, { x: 2, version: 3 })]));
      const w1 = store.write({ effect: move(NODE_ID, 1), send: sendFirst });
      const w2 = store.write({ effect: move(NODE_ID, 2), send: sendSecond });
      await vi.advanceTimersByTimeAsync(15_000);
      expect((await w1).outcome).toBe("unknown");
      // W1 left the view at the timeout, but its request has not ended: W2 is still held back.
      expect(sendSecond).not.toHaveBeenCalled();
      expect(store.getState().pending.map((p) => p.state)).toEqual(["queued"]);
      const fetchesAtTimeout = fetchSnapshot.mock.calls.length;
      first.resolve(applied([nodeRow(NODE_ID, { x: 1, version: 2 })]));
      await vi.advanceTimersByTimeAsync(0);
      // the late answer is not applied to the base
      expect(store.getState().view.nodes.get(NODE_ID)?.version).not.toBe(2);
      expect(fetchSnapshot.mock.calls.length).toBe(fetchesAtTimeout + 1);
      expect(sendSecond).toHaveBeenCalledTimes(1);
      expect((await w2).outcome).toBe("applied");
    });

    it("the late answer of a timed-out write discards a refetch that started before it", async () => {
      const timeoutFetch = deferred<unknown>();
      const fetchSnapshot = vi
        .fn<() => Promise<unknown>>()
        .mockResolvedValueOnce(snapshotOf([nodeRow(NODE_ID, { x: 0 })])) // load
        .mockReturnValueOnce(timeoutFetch.promise) // the refetch sent at the timeout, may read before the commit
        .mockResolvedValueOnce(snapshotOf([nodeRow(NODE_ID, { x: 1, version: 2 })])); // after the late answer
      const store = new SnapshotStore({ fetchSnapshot, requestTimeoutMs: 15_000 });
      await store.load();
      const first = deferred<Envelope>();
      const w1 = store.write({ effect: move(NODE_ID, 1), send: () => first.promise });
      await vi.advanceTimersByTimeAsync(15_000);
      expect((await w1).outcome).toBe("unknown");
      first.resolve(applied([nodeRow(NODE_ID, { x: 1, version: 2 })])); // the late answer arrives first
      await vi.advanceTimersByTimeAsync(0);
      timeoutFetch.resolve(snapshotOf([nodeRow(NODE_ID, { x: 0 })])); // the old read answers
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchSnapshot).toHaveBeenCalledTimes(3);
      expect(nodeX(store)).toBe(1);
    });

    it("an old request ending after reset starts no fetch", async () => {
      const fetchSnapshot = vi.fn<() => Promise<unknown>>(async () => snapshotOf([nodeRow(NODE_ID)]));
      const store = new SnapshotStore({ fetchSnapshot, requestTimeoutMs: 15_000 });
      await store.load();
      const first = deferred<Envelope>();
      const w1 = store.write({ effect: move(NODE_ID, 1), send: () => first.promise });
      store.reset();
      await vi.advanceTimersByTimeAsync(15_000);
      await w1;
      first.resolve(applied([]));
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchSnapshot).toHaveBeenCalledTimes(1);
      expect(store.getState().status).toEqual({ phase: "empty" });
    });

    it("a store still not ready after the retries is failed, not left loading", async () => {
      let n = 0;
      const fetchSnapshot = vi.fn(async () => {
        // a write settles during every fetch, so each answer is discarded
        const id = `00000000-0000-4000-8000-0000000001${String(n++).padStart(2, "0")}`;
        await store.write({ effect: move(id, 1), send: async () => applied([]) });
        return snapshotOf([nodeRow(NODE_ID)]);
      });
      const store: SnapshotStore = new SnapshotStore({ fetchSnapshot, requestTimeoutMs: 15_000 });
      expect(await store.load()).toBe("failed");
      expect(fetchSnapshot).toHaveBeenCalledTimes(5);
      expect(store.getState().status).toEqual({ phase: "failed" });
    });
  });

  it("a fetch from before reset does not clear the new session's in-flight fetch", async () => {
    const a = deferred<unknown>();
    const b = deferred<unknown>();
    const fetchSnapshot = vi
      .fn<() => Promise<unknown>>()
      .mockReturnValueOnce(a.promise)
      .mockReturnValueOnce(b.promise);
    const store = new SnapshotStore({ fetchSnapshot, requestTimeoutMs: 15_000 });
    void store.load();
    store.reset();
    const second = store.load();
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
    a.resolve(snapshotOf([nodeRow(OTHER_ID)])); // the old session's answer
    await flush();
    const shared = store.refetch();
    expect(fetchSnapshot).toHaveBeenCalledTimes(2); // joined the in-flight fetch, sent no third
    b.resolve(snapshotOf([nodeRow(NODE_ID)]));
    expect(await second).toBe("applied");
    expect(await shared).toBe("applied");
    expect([...store.getState().view.nodes.keys()]).toEqual([NODE_ID]);
  });

  it("a write queued behind another is never sent after reset", async () => {
    const { store } = await loaded();
    const first = deferred<Envelope>();
    const sendSecond = vi.fn(async () => applied([]));
    const w1 = store.write({ effect: move(NODE_ID, 1), send: () => first.promise });
    const w2 = store.write({ effect: move(NODE_ID, 2), send: sendSecond });
    store.reset();
    first.resolve(applied([]));
    await w1;
    expect((await w2).outcome).toBe("error");
    expect(sendSecond).not.toHaveBeenCalled();
  });
});
