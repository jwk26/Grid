import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  DataStore,
  StageCandidateCommand,
  UnstageCandidateCommand,
} from "@/lib/db/datastore";
import type {
  RepositoryOperationStatus,
  ScratchBreakdown,
  StagedCandidate,
} from "@/lib/db/schema";
import { useStagedCandidates } from "./use-staged-candidates";

const getDataStoreMock = vi.hoisted(() => vi.fn());
const liveReadMock = vi.hoisted(() => vi.fn());
const candidateRows = vi.hoisted(() => [] as StagedCandidate[]);
const sourceRows = vi.hoisted(() => [] as ScratchBreakdown[]);

vi.mock("@/lib/db/datastore", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/db/datastore")>();
  return {
    ...original,
    getDataStore: getDataStoreMock,
    liveRead: (read: (store: unknown) => Promise<unknown>) =>
      liveReadMock(() => read(readStore)),
  };
});

// The reads the hook's live read makes; the command methods come from getDataStoreMock.
const readStore = {
  getStagedCandidates: async (scratchBitId: string) =>
    candidateRows.filter((row) => row.scratchBitId === scratchBitId),
  getAllScratchBreakdowns: async () => sourceRows,
};

type LiveQueryObserver = {
  next: (value: unknown) => void;
  error: (error: unknown) => void;
};

type LiveQuerySubscription = {
  observer?: LiveQueryObserver;
  query: () => Promise<unknown>;
  unsubscribe: ReturnType<typeof vi.fn>;
};

const subscriptions: LiveQuerySubscription[] = [];

const IDS = {
  scratch: "00000000-0000-4000-8000-000000000131",
  otherScratch: "00000000-0000-4000-8000-000000000132",
  sourceNode: "00000000-0000-4000-8000-000000000133",
  sourceBit: "00000000-0000-4000-8000-000000000134",
  sourceMissing: "00000000-0000-4000-8000-000000000135",
  candidateNode: "00000000-0000-4000-8000-000000000136",
  candidateBit: "00000000-0000-4000-8000-000000000137",
  candidateMissing: "00000000-0000-4000-8000-000000000138",
  pendingCandidate: "00000000-0000-4000-8000-000000000139",
  operation: "00000000-0000-4000-8000-000000000140",
  audit: "00000000-0000-4000-8000-000000000141",
} as const;

function breakdown(
  id: string,
  content: string,
  overrides: Partial<ScratchBreakdown> = {},
): ScratchBreakdown {
  return {
    id,
    scratchBitId: IDS.scratch,
    content,
    order: 0,
    createdAt: 1,
    consumedAt: null,
    version: 2,
    ...overrides,
  };
}

function candidate(
  id: string,
  sourceBreakdownId: string,
  resultType: StagedCandidate["resultType"],
  overrides: Partial<StagedCandidate> = {},
): StagedCandidate {
  return {
    id,
    scratchBitId: IDS.scratch,
    sourceBreakdownId,
    resultType,
    lifecycle: "staged",
    createdAt: 2,
    updatedAt: 2,
    version: 1,
    ...overrides,
  };
}

function stageCommand(
  overrides: Partial<StageCandidateCommand> = {},
): StageCandidateCommand {
  return {
    operationId: IDS.operation,
    candidateId: IDS.pendingCandidate,
    scratchBitId: IDS.scratch,
    sourceBreakdownId: IDS.sourceNode,
    sourceExpectedVersion: 2,
    resultType: "node",
    ...overrides,
  };
}

function unstageCommand(): UnstageCandidateCommand {
  return {
    operationId: IDS.operation,
    candidateId: IDS.candidateNode,
    candidateExpectedVersion: 1,
    sourceBreakdownId: IDS.sourceNode,
    sourceExpectedVersion: 2,
  };
}

function createDataStore() {
  return {
    stageCandidate: vi.fn(),
    reconcileStageCandidate: vi.fn(),
    unstageCandidate: vi.fn(),
    reconcileUnstageCandidate: vi.fn(),
  } as unknown as DataStore & Record<
    | "stageCandidate"
    | "reconcileStageCandidate"
    | "unstageCandidate"
    | "reconcileUnstageCandidate",
    ReturnType<typeof vi.fn>
  >;
}

async function refreshSubscription(index = subscriptions.length - 1) {
  const subscription = subscriptions[index];
  if (!subscription?.observer) throw new Error("subscription not ready");
  const value = await subscription.query();
  act(() => subscription.observer?.next(value));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("useStagedCandidates", () => {
  let dataStore: ReturnType<typeof createDataStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    candidateRows.length = 0;
    sourceRows.length = 0;
    subscriptions.length = 0;
    dataStore = createDataStore();
    getDataStoreMock.mockResolvedValue(dataStore);
    liveReadMock.mockImplementation((query: () => Promise<unknown>) => {
      const subscription: LiveQuerySubscription = {
        query,
        unsubscribe: vi.fn(),
      };
      subscriptions.push(subscription);
      return {
        subscribe: (observer: LiveQueryObserver) => {
          subscription.observer = observer;
          void query().then(observer.next).catch(observer.error);
          return { unsubscribe: subscription.unsubscribe };
        },
      };
    });
  });

  it("does not subscribe without a selected Scratch", () => {
    const { result } = renderHook(() => useStagedCandidates(null));

    expect(result.current.isReady).toBe(false);
    expect(result.current.candidates).toEqual([]);
    expect(result.current.unresolvedCandidates).toEqual([]);
    expect(result.current.counts.authoritative).toBe(0);
    expect(result.current.eligibility.archiveCandidateClear).toBe(true);
    expect(liveReadMock).not.toHaveBeenCalled();
  });

  it("projects readiness only after the selected Scratch receives its matching authoritative snapshot", async () => {
    liveReadMock.mockImplementation((query: () => Promise<unknown>) => {
      const subscription: LiveQuerySubscription = {
        query,
        unsubscribe: vi.fn(),
      };
      subscriptions.push(subscription);
      return {
        subscribe: (observer: LiveQueryObserver) => {
          subscription.observer = observer;
          return { unsubscribe: subscription.unsubscribe };
        },
      };
    });

    const { result, rerender } = renderHook(
      ({ scratchId }) => useStagedCandidates(scratchId),
      { initialProps: { scratchId: IDS.scratch as string | null } },
    );

    expect(result.current.isReady).toBe(false);
    await refreshSubscription(0);
    expect(result.current.isReady).toBe(true);
    expect(result.current.candidates).toEqual([]);

    rerender({ scratchId: IDS.otherScratch });
    expect(result.current.isReady).toBe(false);

    await refreshSubscription(0);
    expect(result.current.isReady).toBe(false);

    await refreshSubscription(1);
    expect(result.current.isReady).toBe(true);

    rerender({ scratchId: null });
    expect(result.current.isReady).toBe(false);
  });

  it("reconstructs durable candidates on mount and refreshes labels from remote source edits", async () => {
    candidateRows.push(candidate(IDS.candidateNode, IDS.sourceNode, "node"));
    sourceRows.push(breakdown(IDS.sourceNode, "Original source text"));

    const first = renderHook(() => useStagedCandidates(IDS.scratch));
    await waitFor(() => {
      expect(first.result.current.candidates[0]?.content).toBe(
        "Original source text",
      );
    });
    first.unmount();

    const second = renderHook(() => useStagedCandidates(IDS.scratch));
    await waitFor(() => expect(second.result.current.candidates).toHaveLength(1));

    sourceRows[0] = breakdown(IDS.sourceNode, "Remote source text", { version: 3 });
    await refreshSubscription();

    expect(second.result.current.candidates[0]).toMatchObject({
      content: "Remote source text",
      source: { version: 3 },
    });
  });

  it("keeps a delayed source miss unresolved and never treats it as a renderable candidate", async () => {
    candidateRows.push(candidate(IDS.candidateMissing, IDS.sourceMissing, "node"));

    const { result } = renderHook(() => useStagedCandidates(IDS.scratch));
    await waitFor(() => {
      expect(result.current.unresolvedCandidates).toHaveLength(1);
    });

    expect(result.current.candidates).toEqual([]);
    expect(result.current.counts).toMatchObject({
      authoritative: 1,
      renderable: 0,
    });
    expect(result.current.eligibility.archiveCandidateClear).toBe(false);

    sourceRows.push(breakdown(IDS.sourceMissing, "Arrived later"));
    await refreshSubscription();

    expect(result.current.unresolvedCandidates).toEqual([]);
    expect(result.current.candidates[0]?.content).toBe("Arrived later");
  });

  it("projects unresolved subscription states", async () => {
    candidateRows.push(
      candidate(IDS.candidateMissing, IDS.sourceMissing, "node"),
      candidate(IDS.candidateBit, IDS.sourceBit, "bit"),
    );
    sourceRows.push(
      breakdown(IDS.sourceBit, "Consumed elsewhere", { consumedAt: 20 }),
    );

    const { result } = renderHook(() => useStagedCandidates(IDS.scratch));
    await waitFor(() => {
      expect(result.current.integrityCandidates).toHaveLength(2);
    });

    expect(result.current.integrityCandidates).toEqual([
      {
        candidate: expect.objectContaining({ id: IDS.candidateMissing }),
        status: "source-unresolved",
        reason: "subscription-miss",
      },
      {
        candidate: expect.objectContaining({ id: IDS.candidateBit }),
        status: "source-unresolved",
        reason: "source-consumed",
      },
    ]);
  });

  it("exposes authoritative, renderable, type, and staged-source eligibility inputs", async () => {
    candidateRows.push(
      candidate(IDS.candidateNode, IDS.sourceNode, "node", { createdAt: 4 }),
      candidate(IDS.candidateBit, IDS.sourceBit, "bit", { createdAt: 3 }),
      candidate(IDS.candidateMissing, IDS.sourceMissing, "node", { createdAt: 2 }),
    );
    sourceRows.push(
      breakdown(IDS.sourceNode, "Node source"),
      breakdown(IDS.sourceBit, "Bit source"),
    );

    const { result } = renderHook(() => useStagedCandidates(IDS.scratch));
    await waitFor(() => expect(result.current.counts.authoritative).toBe(3));

    expect(result.current.counts).toEqual({
      authoritative: 3,
      renderable: 2,
      nodes: 1,
      bits: 1,
      visibleNodes: 1,
      visibleBits: 1,
    });
    expect(result.current.eligibility.archiveCandidateClear).toBe(false);
    expect(result.current.eligibility.stagedSourceIds).toEqual(
      new Set([IDS.sourceNode, IDS.sourceBit, IDS.sourceMissing]),
    );
    expect(result.current.eligibility.isSourceStaged(IDS.sourceMissing)).toBe(true);
  });

  it("reactively updates type counts and Archive facts for remote arrival and removal", async () => {
    candidateRows.push(candidate(IDS.candidateNode, IDS.sourceNode, "node"));
    sourceRows.push(breakdown(IDS.sourceNode, "Node source"));

    const { result } = renderHook(() => useStagedCandidates(IDS.scratch));
    await waitFor(() => expect(result.current.counts.nodes).toBe(1));
    expect(result.current.eligibility.archiveCandidateClear).toBe(false);

    candidateRows.push(candidate(IDS.candidateBit, IDS.sourceBit, "bit"));
    sourceRows.push(breakdown(IDS.sourceBit, "Remote Bit source"));
    await refreshSubscription();

    expect(result.current.counts).toMatchObject({
      authoritative: 2,
      renderable: 2,
      nodes: 1,
      bits: 1,
    });
    expect(result.current.eligibility.archiveCandidateClear).toBe(false);

    candidateRows.length = 0;
    await refreshSubscription();

    expect(result.current.counts).toMatchObject({
      authoritative: 0,
      renderable: 0,
      nodes: 0,
      bits: 0,
    });
    expect(result.current.eligibility.archiveCandidateClear).toBe(true);
  });

  it.each<RepositoryOperationStatus>([
    "applied",
    "already_applied",
    "not_applied",
    "rejected",
    "conflict",
  ])("returns the authoritative Stage %s result without copying it into durable truth", async (status) => {
    const command = stageCommand();
    dataStore.stageCandidate.mockResolvedValue({
      operationId: command.operationId,
      status,
      candidate: null,
      source: null,
      scratch: null,
    });

    const { result } = renderHook(() => useStagedCandidates(IDS.scratch));
    let outcome: Awaited<ReturnType<typeof result.current.stageCandidate>> | undefined;
    await act(async () => {
      outcome = await result.current.stageCandidate(command);
    });

    expect(outcome).toMatchObject({ operationId: command.operationId, status });
    expect(dataStore.stageCandidate).toHaveBeenCalledWith(command);
    expect(result.current.candidates).toEqual([]);
    expect(result.current.pendingOperations).toEqual([]);
    expect(result.current.unknownOperations).toEqual([]);
  });

  it("projects pending Stage separately, then preserves an unknown identity until reconciliation is terminal", async () => {
    const command = stageCommand();
    const pending = deferred<never>();
    const reconciling = deferred<{
      operationId: string;
      status: "not_applied";
      candidate: null;
      source: ScratchBreakdown | undefined;
      scratch: null;
    }>();
    dataStore.stageCandidate.mockReturnValue(pending.promise);
    dataStore.reconcileStageCandidate.mockReturnValue(reconciling.promise);
    liveReadMock.mockImplementationOnce((query: () => Promise<unknown>) => {
      const subscription: LiveQuerySubscription = {
        query,
        unsubscribe: vi.fn(),
      };
      subscriptions.push(subscription);
      return {
        subscribe: (observer: LiveQueryObserver) => {
          subscription.observer = observer;
          return { unsubscribe: subscription.unsubscribe };
        },
      };
    });

    const { result } = renderHook(() => useStagedCandidates(IDS.scratch));
    await waitFor(() => expect(subscriptions).toHaveLength(1));

    let dispatch!: Promise<unknown>;
    act(() => {
      dispatch = result.current.stageCandidate(command);
    });
    await waitFor(() => expect(result.current.pendingOperations).toHaveLength(1));
    expect(result.current.candidates).toEqual([]);
    expect(result.current.counts.visibleNodes).toBe(1);

    pending.reject(new Error("transport outcome unknown"));
    await act(async () => {
      await expect(dispatch).resolves.toEqual({
        operationId: command.operationId,
        outcome: "unknown",
      });
    });
    expect(result.current.pendingOperations).toEqual([]);
    expect(result.current.unknownOperations).toHaveLength(1);

    let reconciliation!: Promise<unknown>;
    act(() => {
      reconciliation = result.current.reconcileStageCandidate(command);
    });
    await waitFor(() =>
      expect(result.current.reconcilingOperations).toEqual([
        expect.objectContaining({
          kind: "stage",
          operationId: command.operationId,
          phase: "reconciling",
        }),
      ]),
    );
    reconciling.resolve({
      operationId: command.operationId,
      status: "not_applied",
      candidate: null,
      source: sourceRows[0],
      scratch: null,
    });
    await act(async () => {
      await expect(reconciliation).resolves.toMatchObject({
        status: "not_applied",
      });
    });
    expect(dataStore.reconcileStageCandidate).toHaveBeenCalledWith(command);
    expect(result.current.unknownOperations).toEqual([]);
    expect(result.current.reconcilingOperations).toEqual([]);
  });

  it("dispatches Unstage through the repository", async () => {
    const unstage = unstageCommand();
    dataStore.unstageCandidate.mockResolvedValue({
      operationId: unstage.operationId,
      status: "applied",
      candidate: null,
      source: null,
    });

    const { result } = renderHook(() => useStagedCandidates(IDS.scratch));
    await act(async () => {
      await expect(result.current.unstageCandidate(unstage)).resolves.toMatchObject({
        status: "applied",
      });
    });

    expect(dataStore.unstageCandidate).toHaveBeenCalledWith(unstage);
  });

  it("unsubscribes on Scratch change and unmount", async () => {
    const { rerender, unmount } = renderHook(
      ({ scratchBitId }) => useStagedCandidates(scratchBitId),
      { initialProps: { scratchBitId: IDS.scratch as string | null } },
    );
    await waitFor(() => expect(subscriptions).toHaveLength(1));

    rerender({ scratchBitId: IDS.otherScratch });
    await waitFor(() => expect(subscriptions).toHaveLength(2));
    expect(subscriptions[0]?.unsubscribe).toHaveBeenCalledTimes(1);

    unmount();
    expect(subscriptions[1]?.unsubscribe).toHaveBeenCalledTimes(1);
  });

  describe("post-terminal presentation hold", () => {
    function installManualSubscription() {
      liveReadMock.mockImplementation((query: () => Promise<unknown>) => {
        const subscription: LiveQuerySubscription = {
          query,
          unsubscribe: vi.fn(),
        };
        subscriptions.push(subscription);
        return {
          subscribe: (observer: LiveQueryObserver) => {
            subscription.observer = observer;
            return { unsubscribe: subscription.unsubscribe };
          },
        };
      });
    }

    async function deliver(index = subscriptions.length - 1) {
      await refreshSubscription(index);
    }

    function appliedStage(command: StageCandidateCommand) {
      return {
        operationId: command.operationId,
        status: "applied",
        candidate: null,
        source: null,
        scratch: null,
      };
    }

    async function mountWithSource() {
      installManualSubscription();
      sourceRows.push(breakdown(IDS.sourceNode, "Row"));
      const hook = renderHook(() => useStagedCandidates(IDS.scratch));
      await waitFor(() => expect(subscriptions).toHaveLength(1));
      await deliver();
      return hook;
    }

    it("holds an applied Stage until the snapshot lists the candidate, counting it once", async () => {
      const command = stageCommand();
      dataStore.stageCandidate.mockResolvedValue(appliedStage(command));
      const { result } = await mountWithSource();

      await act(async () => {
        await result.current.stageCandidate(command);
      });
      expect(result.current.pendingOperations).toEqual([]);
      expect(result.current.heldOperations).toEqual([
        expect.objectContaining({
          candidateId: command.candidateId,
          kind: "stage",
          phase: "pending",
          held: true,
        }),
      ]);
      expect(result.current.counts.visibleNodes).toBe(1);
      expect(result.current.stagedSourceIds.has(IDS.sourceNode)).toBe(true);
      expect(result.current.eligibility.stagedSourceIds.has(IDS.sourceNode)).toBe(
        false,
      );

      candidateRows.push(
        candidate(command.candidateId, IDS.sourceNode, "node"),
      );
      await deliver();
      expect(result.current.heldOperations).toEqual([]);
      expect(result.current.candidates).toHaveLength(1);
      expect(result.current.counts.visibleNodes).toBe(1);
    });

    it("removes an applied Stage in the same commit when the snapshot already lists it", async () => {
      const command = stageCommand();
      const gate = deferred<unknown>();
      dataStore.stageCandidate.mockReturnValue(gate.promise);
      const { result } = await mountWithSource();

      let dispatch!: Promise<unknown>;
      act(() => {
        dispatch = result.current.stageCandidate(command);
      });
      await waitFor(() => expect(result.current.pendingOperations).toHaveLength(1));
      candidateRows.push(
        candidate(command.candidateId, IDS.sourceNode, "node"),
      );
      await deliver();
      gate.resolve({ ...appliedStage(command), status: "already_applied" });
      await act(async () => {
        await dispatch;
      });
      expect(result.current.heldOperations).toEqual([]);
      expect(result.current.pendingOperations).toEqual([]);
      expect(result.current.counts.visibleNodes).toBe(1);
    });

    it("keeps the hold when a read that started before the result finishes after it", async () => {
      const command = stageCommand();
      dataStore.stageCandidate.mockResolvedValue(appliedStage(command));
      const { result } = await mountWithSource();
      const early = subscriptions[0]!.query();

      await act(async () => {
        await result.current.stageCandidate(command);
      });
      const stale = await early;
      act(() => subscriptions[0]!.observer?.next(stale));
      expect(result.current.heldOperations).toHaveLength(1);
    });

    it("ends the hold when a read that started after the result lacks the candidate", async () => {
      const command = stageCommand();
      dataStore.stageCandidate.mockResolvedValue(appliedStage(command));
      const { result } = await mountWithSource();

      await act(async () => {
        await result.current.stageCandidate(command);
      });
      expect(result.current.heldOperations).toHaveLength(1);
      await deliver();
      expect(result.current.heldOperations).toEqual([]);
      expect(result.current.counts.visibleNodes).toBe(0);
    });

    it("ends the hold on a subscription error", async () => {
      const command = stageCommand();
      dataStore.stageCandidate.mockResolvedValue(appliedStage(command));
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      const { result } = await mountWithSource();

      await act(async () => {
        await result.current.stageCandidate(command);
      });
      act(() => subscriptions[0]!.observer?.error(new Error("boom")));
      expect(result.current.heldOperations).toEqual([]);
      consoleError.mockRestore();
    });

    it("never holds non-success results", async () => {
      const command = stageCommand();
      const { result } = await mountWithSource();

      for (const status of ["rejected", "conflict", "not_applied"]) {
        dataStore.stageCandidate.mockResolvedValueOnce({
          ...appliedStage(command),
          status,
        });
        await act(async () => {
          await result.current.stageCandidate(command);
        });
        expect(result.current.heldOperations).toEqual([]);
        expect(result.current.counts.visibleNodes).toBe(0);
      }
    });

    it("holds an applied Unstage until the candidate leaves the snapshot", async () => {
      const unstage = unstageCommand();
      candidateRows.push(
        candidate(IDS.candidateNode, IDS.sourceNode, "node"),
      );
      dataStore.unstageCandidate.mockResolvedValue({
        operationId: unstage.operationId,
        status: "applied",
        candidate: null,
        source: null,
      });
      const { result } = await mountWithSource();
      expect(result.current.candidates).toHaveLength(1);

      await act(async () => {
        await result.current.unstageCandidate(unstage);
      });
      expect(result.current.pendingOperations).toEqual([]);
      expect(result.current.heldOperations).toEqual([
        expect.objectContaining({
          kind: "unstage",
          candidateId: IDS.candidateNode,
          held: true,
        }),
      ]);
      expect(result.current.counts.visibleNodes).toBe(1);

      candidateRows.length = 0;
      await deliver();
      expect(result.current.heldOperations).toEqual([]);
      expect(result.current.candidates).toEqual([]);
    });

    it("removes an applied Unstage at once when the candidate is already gone, and ends the hold on a later read that still lists it", async () => {
      const unstage = unstageCommand();
      candidateRows.push(
        candidate(IDS.candidateNode, IDS.sourceNode, "node"),
      );
      dataStore.unstageCandidate.mockResolvedValue({
        operationId: unstage.operationId,
        status: "applied",
        candidate: null,
        source: null,
      });
      const { result } = await mountWithSource();

      candidateRows.length = 0;
      await deliver();
      await act(async () => {
        await result.current.unstageCandidate(unstage);
      });
      expect(result.current.heldOperations).toEqual([]);

      candidateRows.push(
        candidate(IDS.candidateNode, IDS.sourceNode, "node"),
      );
      await deliver();
      await act(async () => {
        await result.current.unstageCandidate({
          ...unstage,
          operationId: IDS.audit,
        });
      });
      expect(result.current.heldOperations).toHaveLength(1);
      await deliver();
      expect(result.current.heldOperations).toEqual([]);
    });

    it("renders no previous-Scratch operation or hold in any commit after a Scratch switch", async () => {
      const command = stageCommand();
      dataStore.stageCandidate.mockResolvedValue(appliedStage(command));
      installManualSubscription();
      sourceRows.push(breakdown(IDS.sourceNode, "Row"));
      const renders: Array<{
        scratch: string;
        held: number;
        pending: number;
        visible: number;
        sources: number;
      }> = [];
      const { result, rerender } = renderHook(
        ({ scratchId }) => {
          const value = useStagedCandidates(scratchId);
          renders.push({
            scratch: scratchId,
            held: value.heldOperations.length,
            pending: value.pendingOperations.length,
            visible: value.counts.visibleNodes,
            sources: value.stagedSourceIds.size,
          });
          return value;
        },
        { initialProps: { scratchId: IDS.scratch as string } },
      );
      await waitFor(() => expect(subscriptions).toHaveLength(1));
      await deliver();
      await act(async () => {
        await result.current.stageCandidate(command);
      });
      expect(result.current.heldOperations).toHaveLength(1);

      renders.length = 0;
      rerender({ scratchId: IDS.otherScratch });
      expect(renders.length).toBeGreaterThan(0);
      for (const render of renders) {
        expect(render).toMatchObject({
          scratch: IDS.otherScratch,
          held: 0,
          pending: 0,
          visible: 0,
          sources: 0,
        });
      }
    });

    it("does not hold a result that arrives after the Scratch changed", async () => {
      const command = stageCommand();
      const gate = deferred<unknown>();
      dataStore.stageCandidate.mockReturnValue(gate.promise);
      installManualSubscription();
      const { result, rerender } = renderHook(
        ({ scratchId }) => useStagedCandidates(scratchId),
        { initialProps: { scratchId: IDS.scratch as string } },
      );
      await waitFor(() => expect(subscriptions).toHaveLength(1));
      await deliver();
      let dispatch!: Promise<unknown>;
      act(() => {
        dispatch = result.current.stageCandidate(command);
      });
      rerender({ scratchId: IDS.otherScratch });
      rerender({ scratchId: IDS.scratch });
      gate.resolve(appliedStage(command));
      await act(async () => {
        await dispatch;
      });
      expect(result.current.heldOperations).toEqual([]);
    });
  });
});
