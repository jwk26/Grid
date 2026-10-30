import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import type { DataStore } from "@/lib/db/datastore";
import { bitToRow, nodeToRow } from "@/lib/db/row-mapping";
import { SnapshotStore } from "@/lib/db/snapshot-store";
import type { GriddoSupabaseClient } from "@/lib/db/supabase-client";
import { createSupabaseStore } from "@/lib/db/supabase-store";
import { WriteOutcomeUnknownError, WriteRejectedError } from "@/lib/db/write-errors";
import {
  INJECTABLE_METHODS,
  INJECTION_OUTCOME_LABELS,
  STATE_SWITCH_MARKER,
  injectableMethodSpec,
  useStateSwitchStore,
  withDevClient,
  withDevInjection,
  type InjectableMethod,
  type InjectionOutcome,
} from "@/lib/dev/state-switch";

const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const SCRATCH_BIT = uuid(2);
const OPERATION_ID = uuid(4001);


// The methods injected at the DataStore; the ordinary writes are injected at the client.
const STORE_METHODS = INJECTABLE_METHODS.filter((method) => injectableMethodSpec(method).kind !== "write");
const WRITE_METHODS = INJECTABLE_METHODS.filter((method) => injectableMethodSpec(method).kind === "write");

/** A fake whose every injectable method answers with that method's own marker. */
function makeFakeStore() {
  const calls: Array<{ method: string; thisArg: unknown }> = [];
  const fake: Record<string, unknown> = {
    getNode: vi.fn(function (this: unknown, id: string) {
      calls.push({ method: "getNode", thisArg: this });
      return Promise.resolve({ id });
    }),
    getScratchArchiveEligibility: vi.fn(async () => ({
      eligible: true,
      scratch: { id: "scratch-current", version: 7 },
      consumedCount: 0,
      unconsumedCount: 0,
      stagedCandidateCount: 0,
    })),
  };
  for (const method of STORE_METHODS) {
    fake[method] = vi.fn(function (this: unknown, command: { operationId: string }) {
      calls.push({ method, thisArg: this });
      return Promise.resolve({
        operationId: command.operationId,
        status: "already_applied",
        records: `${method}-records`,
      });
    });
  }
  return { fake: fake as unknown as DataStore, raw: fake, calls };
}

const NON_REAL: InjectionOutcome[] = ["not_applied", "rejected", "conflict"];

beforeEach(() => {
  useStateSwitchStore.getState().reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("injectable method table", () => {
  it("covers the Inbox commands and their reconcile twins", () => {
    const names = new Set<string>(STORE_METHODS);
    for (const name of [
      "addBreakdown", "reconcileAddBreakdown",
      "saveScratchTitle", "reconcileSaveScratchTitle",
      "saveBreakdown", "reconcileSaveBreakdown",
      "deleteBreakdown", "reconcileDeleteBreakdown",
      "stageCandidate", "reconcileStageCandidate",
      "unstageCandidate", "reconcileUnstageCandidate",
      "placeStagedCandidate", "reconcileStagedPlacement",
      "placeDirectBreakdown", "reconcileDirectPlacement",
      "undoStagedPlacement", "reconcileStagedPlacementUndo",
      "undoDirectPlacement", "reconcileDirectPlacementUndo",
      "archiveScratch",
      "trashScratch", "reconcileTrashScratch",
    ]) {
      expect(names.has(name), name).toBe(true);
    }
    expect(names.size).toBe(23);
    expect(WRITE_METHODS).toHaveLength(20);
  });

  it("offers each method only the outcomes its real path can return", () => {
    for (const method of STORE_METHODS) {
      const spec = injectableMethodSpec(method);
      if (spec.kind === "command") {
        // A command answers applied, already_applied, rejected or conflict.
        expect(spec.outcomes, method).not.toContain("not_applied");
        expect(spec.outcomes, method).toContain("conflict");
        expect(spec.outcomes, method).toContain("unknown-after-commit");
      } else {
        // A reconcile answers already_applied, not_applied or conflict.
        expect(spec.outcomes, method).toContain("not_applied");
        expect(spec.outcomes, method).toContain("conflict");
        expect(spec.outcomes, method).not.toContain("unknown-after-commit");
      }
      expect(spec.outcomes[0], method).toBe("real");
    }
  });

  it("offers rejected on reconcile only where the real reconcile can reject", () => {
    const rejecting = STORE_METHODS.filter(
      (method) =>
        injectableMethodSpec(method).kind === "reconcile" &&
        injectableMethodSpec(method).outcomes.includes("rejected"),
    );
    expect(new Set(rejecting)).toEqual(
      new Set([
        "reconcileStagedPlacementUndo",
        "reconcileDirectPlacementUndo",
      ]),
    );
  });

  it("builds every injected result from a read-only records source in the table", () => {
    for (const method of STORE_METHODS) {
      const spec = injectableMethodSpec(method);
      if (spec.recordsFrom === null) {
        expect(method).toBe("archiveScratch");
        continue;
      }
      expect(INJECTABLE_METHODS, method).toContain(spec.recordsFrom);
      expect(injectableMethodSpec(spec.recordsFrom).kind, method).toBe("reconcile");
    }
  });

  it("labels every outcome", () => {
    for (const outcome of [
      "real", "unknown-before-send", "unknown-after-commit",
      ...NON_REAL,
    ] as const) {
      expect(INJECTION_OUTCOME_LABELS[outcome]).toBeTruthy();
    }
  });
});

describe("withDevInjection", () => {
  it("passes everything through when nothing is queued", async () => {
    const { fake, calls } = makeFakeStore();
    const store = withDevInjection(fake);
    const command = { operationId: OPERATION_ID };

    await expect(store.addBreakdown(command as never)).resolves.toMatchObject({
      status: "already_applied",
      records: "addBreakdown-records",
    });
    expect(calls).toHaveLength(1);
  });

  it("binds methods to the real store and passes other methods through", async () => {
    const { fake, raw, calls } = makeFakeStore();
    const store = withDevInjection(fake);

    await expect(store.getNode("n1")).resolves.toEqual({ id: "n1" });
    await store.addBreakdown({ operationId: OPERATION_ID } as never);
    for (const call of calls) expect(call.thisArg).toBe(raw);
  });

  describe.each(STORE_METHODS.map((method) => [method] as const))("%s", (method) => {
    const spec = injectableMethodSpec(method as InjectableMethod);
    const command = { operationId: OPERATION_ID, scratchBitId: "scratch-1" };

    it.each(spec.outcomes.filter((o) => NON_REAL.includes(o)))(
      "answers %s with a well-formed result built from the current records",
      async (outcome) => {
        const { fake, raw } = makeFakeStore();
        const store = withDevInjection(fake);
        useStateSwitchStore.getState().queueInjection({
          method: method as InjectableMethod,
          outcome,
          delayMs: 0,
          count: 1,
        });

        const result = (await (store[method as InjectableMethod] as (c: unknown) => Promise<Record<string, unknown>>)(command)) as Record<string, unknown>;

        expect(result.operationId).toBe(OPERATION_ID);
        expect(result.status).toBe(outcome);
        if (spec.recordsFrom === null) {
          // archiveScratch has no reconcile twin: the Scratch comes from the
          // read-only eligibility read.
          expect(result.scratch).toEqual({ id: "scratch-current", version: 7 });
          expect(raw.getScratchArchiveEligibility).toHaveBeenCalledWith("scratch-1");
        } else {
          expect(result.records).toBe(`${spec.recordsFrom}-records`);
        }
        // The real command never ran.
        if (spec.kind === "command") {
          expect(raw[method as string]).not.toHaveBeenCalled();
        }
      },
    );
  });

  it("answers unknown-before-send with a throw and never calls the real command", async () => {
    const { fake, raw } = makeFakeStore();
    const store = withDevInjection(fake);
    useStateSwitchStore.getState().queueInjection({
      method: "addBreakdown",
      outcome: "unknown-before-send",
      delayMs: 0,
      count: 1,
    });

    await expect(store.addBreakdown({ operationId: OPERATION_ID } as never)).rejects.toThrow(
      STATE_SWITCH_MARKER,
    );
    expect(raw.addBreakdown).not.toHaveBeenCalled();
  });

  it("answers unknown-after-commit by running the real command, then throwing", async () => {
    const { fake, raw } = makeFakeStore();
    const store = withDevInjection(fake);
    useStateSwitchStore.getState().queueInjection({
      method: "addBreakdown",
      outcome: "unknown-after-commit",
      delayMs: 0,
      count: 1,
    });

    await expect(store.addBreakdown({ operationId: OPERATION_ID } as never)).rejects.toThrow(
      STATE_SWITCH_MARKER,
    );
    expect(raw.addBreakdown).toHaveBeenCalledTimes(1);
  });

  it("delays the call, then lets it through to the real store", async () => {
    vi.useFakeTimers();
    const { fake, raw } = makeFakeStore();
    const store = withDevInjection(fake);
    useStateSwitchStore.getState().queueInjection({
      method: "addBreakdown",
      outcome: "real",
      delayMs: 500,
      count: 1,
    });

    const pending = store.addBreakdown({ operationId: OPERATION_ID } as never);
    await vi.advanceTimersByTimeAsync(499);
    expect(raw.addBreakdown).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toMatchObject({ status: "already_applied" });
    expect(raw.addBreakdown).toHaveBeenCalledTimes(1);
  });

  it("applies an injection to the next N calls of one method only", async () => {
    const { fake, raw } = makeFakeStore();
    const store = withDevInjection(fake);
    useStateSwitchStore.getState().queueInjection({
      method: "addBreakdown",
      outcome: "rejected",
      delayMs: 0,
      count: 2,
    });

    const add = () => store.addBreakdown({ operationId: OPERATION_ID } as never);
    await expect(add()).resolves.toMatchObject({ status: "rejected" });
    // A different method is not affected.
    await expect(
      store.deleteBreakdown({ operationId: OPERATION_ID } as never),
    ).resolves.toMatchObject({ status: "already_applied" });
    expect(useStateSwitchStore.getState().injections[0]?.remaining).toBe(1);

    await expect(add()).resolves.toMatchObject({ status: "rejected" });
    expect(useStateSwitchStore.getState().injections).toEqual([]);

    await expect(add()).resolves.toMatchObject({ status: "already_applied" });
    expect(raw.addBreakdown).toHaveBeenCalledTimes(1);
  });

  it("takes queued injections of one method in the order they were queued", async () => {
    const { fake } = makeFakeStore();
    const store = withDevInjection(fake);
    const queue = useStateSwitchStore.getState().queueInjection;
    queue({ method: "addBreakdown", outcome: "rejected", delayMs: 0, count: 1 });
    queue({ method: "addBreakdown", outcome: "conflict", delayMs: 0, count: 1 });

    const add = () => store.addBreakdown({ operationId: OPERATION_ID } as never);
    await expect(add()).resolves.toMatchObject({ status: "rejected" });
    await expect(add()).resolves.toMatchObject({ status: "conflict" });
  });
});

describe("state switch store", () => {
  it("refuses an outcome the method cannot really return", () => {
    const { queueInjection } = useStateSwitchStore.getState();
    expect(() =>
      queueInjection({ method: "addBreakdown", outcome: "not_applied", delayMs: 0, count: 1 }),
    ).toThrow(/not_applied/);
    expect(() =>
      queueInjection({ method: "reconcileAddBreakdown", outcome: "rejected", delayMs: 0, count: 1 }),
    ).toThrow(/rejected/);
    expect(useStateSwitchStore.getState().injections).toEqual([]);
  });

  it("clamps the call count and the delay", () => {
    const { queueInjection } = useStateSwitchStore.getState();
    queueInjection({ method: "addBreakdown", outcome: "conflict", delayMs: -5, count: 99 });
    const [injection] = useStateSwitchStore.getState().injections;
    expect(injection?.remaining).toBe(9);
    expect(injection?.delayMs).toBe(0);
  });

  it("forces and clears a state per item", () => {
    const { setForced, clearForced } = useStateSwitchStore.getState();
    setForced("add:s1", "unknown");
    setForced("breakdown:b1", "rejected");
    expect(useStateSwitchStore.getState().forced).toEqual({
      "add:s1": "unknown",
      "breakdown:b1": "rejected",
    });

    setForced("add:s1", null);
    expect(useStateSwitchStore.getState().forced).toEqual({ "breakdown:b1": "rejected" });

    clearForced();
    expect(useStateSwitchStore.getState().forced).toEqual({});
  });

  it("removes one injection or all of them", () => {
    const { queueInjection, removeInjection, clearInjections } = useStateSwitchStore.getState();
    queueInjection({ method: "addBreakdown", outcome: "conflict", delayMs: 0, count: 1 });
    queueInjection({ method: "deleteBreakdown", outcome: "conflict", delayMs: 0, count: 1 });
    const [first] = useStateSwitchStore.getState().injections;
    removeInjection(first!.id);
    expect(useStateSwitchStore.getState().injections).toHaveLength(1);
    clearInjections();
    expect(useStateSwitchStore.getState().injections).toEqual([]);
  });
});

/**
 * A small stateful store with the real commands' contract: the Scratch carries a version, Add
 * writes one row and increments it once, and the reconcile twin reads without writing.
 */
function makeStatefulStore() {
  const state = {
    scratch: { id: SCRATCH_BIT, version: 4, title: "Scratch" },
    rows: new Map<string, { id: string; content: string }>(),
  };
  const reconcile = async (command: { breakdownId: string }) => {
    const row = state.rows.get(command.breakdownId) ?? null;
    return {
      status: row === null ? "not_applied" : "already_applied",
      scratch: { ...state.scratch },
      breakdown: row === null ? null : { ...row },
    };
  };
  const store = {
    addBreakdown: async (command: { operationId: string; breakdownId: string; content: string }) => {
      if (state.rows.has(command.breakdownId)) {
        return { operationId: command.operationId, ...(await reconcile(command)) };
      }
      state.rows.set(command.breakdownId, { id: command.breakdownId, content: command.content });
      state.scratch.version += 1;
      return {
        operationId: command.operationId,
        status: "applied",
        scratch: { ...state.scratch },
        breakdown: { ...state.rows.get(command.breakdownId)! },
      };
    },
    reconcileAddBreakdown: reconcile,
    saveScratchTitle: vi.fn(),
    reconcileSaveScratchTitle: async () => ({ status: "not_applied", scratch: { ...state.scratch } }),
    getScratchBreakdowns: async () => [...state.rows.values()],
  };
  return { state, store: store as unknown as DataStore, raw: store };
}

describe("withDevInjection over a stateful store", () => {
  async function withStore(
    run: (
      store: DataStore,
      ctx: ReturnType<typeof makeStatefulStore>,
    ) => Promise<void>,
  ) {
    const ctx = makeStatefulStore();
    await run(withDevInjection(ctx.store), ctx);
  }

  const addCommand = () => ({
    operationId: OPERATION_ID,
    breakdownId: uuid(4002),
    scratchBitId: SCRATCH_BIT,
    scratchExpectedVersion: 4,
    content: "Added through the switch",
  });

  it("an answer lost after commit reconciles to success with the version incremented once", async () => {
    await withStore(async (store, { raw }) => {
      useStateSwitchStore.getState().queueInjection({
        method: "addBreakdown",
        outcome: "unknown-after-commit",
        delayMs: 0,
        count: 1,
      });

      await expect(store.addBreakdown(addCommand())).rejects.toThrow(STATE_SWITCH_MARKER);

      // Check again: the real reconcile finds the commit.
      await expect(store.reconcileAddBreakdown(addCommand())).resolves.toMatchObject({
        status: "already_applied",
        scratch: { version: 5 },
        breakdown: { content: "Added through the switch" },
      });
      // Retry with the same operation identity writes nothing more.
      await expect(store.addBreakdown(addCommand())).resolves.toMatchObject({
        status: "already_applied",
        scratch: { version: 5 },
      });
      expect(await raw.getScratchBreakdowns()).toHaveLength(1);
    });
  });

  it("an answer lost before send reconciles to not applied, then Retry applies it", async () => {
    await withStore(async (store) => {
      useStateSwitchStore.getState().queueInjection({
        method: "addBreakdown",
        outcome: "unknown-before-send",
        delayMs: 0,
        count: 1,
      });

      await expect(store.addBreakdown(addCommand())).rejects.toThrow(STATE_SWITCH_MARKER);
      await expect(store.reconcileAddBreakdown(addCommand())).resolves.toMatchObject({
        status: "not_applied",
        scratch: { version: 4 },
      });
      await expect(store.addBreakdown(addCommand())).resolves.toMatchObject({
        status: "applied",
        scratch: { version: 5 },
      });
    });
  });

  it.each(["rejected", "conflict"] as const)(
    "an injected %s carries the current records and writes nothing",
    async (outcome) => {
      await withStore(async (store) => {
        useStateSwitchStore.getState().queueInjection({
          method: "addBreakdown",
          outcome,
          delayMs: 0,
          count: 1,
        });

        const result = await store.addBreakdown(addCommand());
        expect(result.status).toBe(outcome);
        expect(result.operationId).toBe(OPERATION_ID);
        // The same record shape the real store returns: the current Scratch.
        expect(result).toMatchObject({ scratch: { version: 4 }, breakdown: null });
        // Nothing was committed, so the next call applies.
        await expect(store.addBreakdown(addCommand())).resolves.toMatchObject({
          status: "applied",
        });
      });
    },
  );

  it("an injected conflict on a Scratch title save carries the current Scratch", async () => {
    await withStore(async (store) => {
      useStateSwitchStore.getState().queueInjection({
        method: "saveScratchTitle",
        outcome: "conflict",
        delayMs: 0,
        count: 1,
      });
      const result = await store.saveScratchTitle({
        operationId: uuid(4003),
        scratchBitId: SCRATCH_BIT,
        expectedVersion: 4,
        baseTitle: "Scratch",
        title: "Renamed",
      });
      expect(result.status).toBe("conflict");
      // A non-null Scratch, so the editor shows its conflict view, not the recovery view.
      expect(result.scratch).toMatchObject({ id: SCRATCH_BIT });
    });
  });

  it("leaves the stored data untouched by an injected answer", async () => {
    await withStore(async (store, { state }) => {
      const before = structuredClone({ scratch: state.scratch, rows: [...state.rows] });
      useStateSwitchStore.getState().queueInjection({
        method: "addBreakdown",
        outcome: "conflict",
        delayMs: 0,
        count: 1,
      });
      await store.addBreakdown(addCommand());
      expect({ scratch: state.scratch, rows: [...state.rows] }).toEqual(before);
    });
  });
});

describe("ordinary writes (Task 231)", () => {
  it("offers every ordinary write real, rejected and both unknown outcomes, and nothing else", () => {
    for (const method of WRITE_METHODS) {
      expect(injectableMethodSpec(method).outcomes, method).toEqual([
        "real",
        "unknown-before-send",
        "unknown-after-commit",
        "rejected",
      ]);
    }
  });

  it("withDevInjection leaves the ordinary writes alone", async () => {
    const { fake, raw } = makeFakeStore();
    raw.updateBit = vi.fn(async () => "real");
    useStateSwitchStore.getState().queueInjection({ method: "updateBit", outcome: "rejected", delayMs: 0, count: 1 });
    await expect(withDevInjection(fake).updateBit("b", {})).resolves.toBe("real");
    expect(useStateSwitchStore.getState().injections).toHaveLength(1);
  });

  describe("withDevClient", () => {
    const answer = { data: { status: "applied", result: null, changes: {} }, error: null, status: 200 };
    const setup = () => {
      const rpc = vi.fn(async () => answer);
      const getClient = withDevClient(() => ({ rpc, auth: { id: "auth" } }) as unknown as GriddoSupabaseClient);
      return { rpc, client: getClient() };
    };
    const queue = (method: InjectableMethod, outcome: InjectionOutcome, delayMs = 0, count = 1) =>
      useStateSwitchStore.getState().queueInjection({ method, outcome, delayMs, count });

    it("passes a call through when nothing is queued, and other members of the client", async () => {
      const { rpc, client } = setup();
      await expect(client.rpc("update_bit" as never, { p_id: "b" } as never)).resolves.toBe(answer);
      expect(rpc).toHaveBeenCalledWith("update_bit", { p_id: "b" });
      expect((client as unknown as { auth: unknown }).auth).toEqual({ id: "auth" });
    });

    it("answers rejected without sending, with a state-dependent code", async () => {
      const { rpc, client } = setup();
      queue("updateBit", "rejected");
      queue("softDeleteBit", "rejected");
      const moved = (await client.rpc("update_bit" as never, {} as never)) as unknown as { data: unknown };
      const trashed = (await client.rpc("soft_delete_bit" as never, {} as never)) as unknown as { data: unknown };
      expect(moved.data).toMatchObject({ status: "rejected", changes: {}, rejection: { code: "cell_taken" } });
      expect(trashed.data).toMatchObject({ rejection: { code: "not_found" } });
      expect(rpc).not.toHaveBeenCalled();
    });

    it("unknown-before-send answers status 0 without sending; unknown-after-commit sends first", async () => {
      const { rpc, client } = setup();
      queue("createNode", "unknown-before-send");
      queue("createBit", "unknown-after-commit");
      const before = (await client.rpc("create_node" as never, {} as never)) as unknown as { status: number };
      expect(before.status).toBe(0);
      expect(rpc).not.toHaveBeenCalled();
      const after = (await client.rpc("create_bit" as never, {} as never)) as unknown as { status: number };
      expect(after.status).toBe(0);
      expect(rpc).toHaveBeenCalledTimes(1);
    });

    it("delays, affects only its method, and is used up after its count", async () => {
      vi.useFakeTimers();
      const { rpc, client } = setup();
      queue("updateBit", "real", 2_000, 1);
      const delayed = client.rpc("update_bit" as never, {} as never);
      await client.rpc("update_node" as never, {} as never);
      expect(rpc).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(2_000);
      await delayed;
      expect(rpc).toHaveBeenCalledTimes(2);
      await client.rpc("update_bit" as never, {} as never);
      expect(rpc).toHaveBeenCalledTimes(3);
    });

    it("never touches an Inbox command function or get_snapshot", async () => {
      const { rpc, client } = setup();
      queue("updateBit", "rejected");
      await client.rpc("get_snapshot" as never);
      await client.rpc("add_breakdown" as never, {} as never);
      expect(rpc).toHaveBeenCalledTimes(2);
      expect(useStateSwitchStore.getState().injections).toHaveLength(1);
    });
  });

  describe("through the store", () => {
    const USER = "00000000-0000-4000-8000-0000000000aa";
    const BIT = "00000000-0000-4000-8000-000000000002";
    const NODE = "00000000-0000-4000-8000-000000000001";

    async function wired() {
      const rpc = vi.fn(async () => ({ data: { status: "applied", result: null, changes: {} }, error: null, status: 200 }));
      const fetchSnapshot = vi.fn(async () => ({
        nodes: [nodeToRow({ ...baseEntities.node, id: NODE } as never, USER)],
        bits: [bitToRow({ ...baseEntities.bit, id: BIT, parentId: NODE, x: 1, y: 1 } as never, USER)],
        chunks: [],
        scratch_breakdowns: [],
        staged_candidates: [],
      }));
      const snapshot = new SnapshotStore({ fetchSnapshot, requestTimeoutMs: 1_000 });
      await snapshot.load();
      const store = createSupabaseStore(
        snapshot,
        withDevClient(() => ({ rpc }) as unknown as GriddoSupabaseClient),
      );
      return { store, snapshot, rpc, fetchSnapshot };
    }

    it("a forced rejection shows the move, then rolls it back and the method throws", async () => {
      const { store, snapshot, rpc } = await wired();
      useStateSwitchStore.getState().queueInjection({ method: "updateBit", outcome: "rejected", delayMs: 50, count: 1 });
      const moved = store.updateBit(BIT, { x: 7 }).catch((e: unknown) => e);
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(snapshot.getState().view.bits.get(BIT)?.x).toBe(7);
      expect(await moved).toBeInstanceOf(WriteRejectedError);
      expect(snapshot.getState().view.bits.get(BIT)?.x).toBe(1);
      expect(rpc).not.toHaveBeenCalled();
    });

    it("a forced lost answer is an unknown outcome: refetched, not resent", async () => {
      const { store, snapshot, rpc, fetchSnapshot } = await wired();
      useStateSwitchStore.getState().queueInjection({ method: "updateBit", outcome: "unknown-after-commit", delayMs: 0, count: 1 });
      await expect(store.updateBit(BIT, { x: 7 })).rejects.toBeInstanceOf(WriteOutcomeUnknownError);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(rpc).toHaveBeenCalledTimes(1);
      expect(fetchSnapshot).toHaveBeenCalledTimes(2);
      expect(snapshot.getState().pending).toEqual([]);
    });
  });
});
