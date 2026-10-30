import { describe, expect, it, vi } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import type { RequestResult } from "@/lib/db/connection-monitor";
import { nodeToRow } from "@/lib/db/row-mapping";
import { SnapshotStore, UnknownOutcomeError, type Envelope } from "@/lib/db/snapshot-store";

// Task 233: the store tells the connection monitor how each write request ended, once.

const USER = "00000000-0000-4000-8000-0000000000aa";
const NODE_ID = "00000000-0000-4000-8000-000000000001";
const row = nodeToRow({ ...baseEntities.node, id: NODE_ID, x: 0, y: 0 }, USER);
const empty = { nodes: [row], bits: [], chunks: [], scratch_breakdowns: [], staged_candidates: [] };
const answer: Envelope = { status: "applied", result: null, changes: { nodes: { upserted: [row], deleted: [] } } };
const rejection: Envelope = { status: "rejected", result: null, changes: {}, rejection: { code: "not_found" } };

async function setup(timeout = 1_000) {
  const results: RequestResult[] = [];
  const store = new SnapshotStore({
    fetchSnapshot: async () => empty,
    requestTimeoutMs: timeout,
    onRequestResult: (result) => results.push(result),
  });
  await store.load();
  return { store, results };
}

const patch = { kind: "patch", table: "nodes", id: NODE_ID, patch: { x: 1 } } as const;

describe("write results reach the connection monitor", () => {
  it("an applied answer is reachable", async () => {
    const { store, results } = await setup();
    await store.write({ effect: patch, send: async () => answer });
    expect(results).toEqual(["reachable"]);
  });

  it("a refusal is an answer, so reachable", async () => {
    const { store, results } = await setup();
    await store.write({ effect: patch, send: async () => rejection });
    expect(results).toEqual(["reachable"]);
  });

  it("an API error that came back is reachable", async () => {
    const { store, results } = await setup();
    await store.command({ key: "k", send: async () => Promise.reject(new Error("update_node failed: 400")) });
    expect(results).toEqual(["reachable"]);
  });

  it("a request with no answer is unreachable", async () => {
    const { store, results } = await setup();
    await store.write({ effect: patch, send: () => Promise.reject(new UnknownOutcomeError("status 0")) });
    expect(results).toEqual(["unreachable"]);
  });

  it("a timeout counts once, even when the request later ends with no answer", async () => {
    vi.useFakeTimers();
    try {
      const { store, results } = await setup(1_000);
      let fail: (error: unknown) => void = () => {};
      const outcome = store.write({
        effect: patch,
        send: () => new Promise<Envelope>((_, reject) => (fail = reject)),
      });
      await vi.advanceTimersByTimeAsync(1_000);
      await outcome;
      expect(results).toEqual(["unreachable"]);
      fail(new UnknownOutcomeError("status 0"));
      await vi.advanceTimersByTimeAsync(0);
      expect(results).toEqual(["unreachable"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("a late answer after a timeout is reachable", async () => {
    vi.useFakeTimers();
    try {
      const { store, results } = await setup(1_000);
      let done: (value: Envelope) => void = () => {};
      const outcome = store.write({ effect: patch, send: () => new Promise<Envelope>((resolve) => (done = resolve)) });
      await vi.advanceTimersByTimeAsync(1_000);
      await outcome;
      done(answer);
      await vi.advanceTimersByTimeAsync(0);
      expect(results).toEqual(["unreachable", "reachable"]);
    } finally {
      vi.useRealTimers();
    }
  });
});
