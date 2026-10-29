import { describe, expect, it, vi } from "vitest";
import type {
  DirectPlacementCommand,
  DirectPlacementUndoCommand,
  PlacementResult,
  PlacementUndoResult,
  StagedPlacementCommand,
  StagedPlacementUndoCommand,
} from "@/lib/db/datastore";
import type { Node, StagedCandidate } from "@/lib/db/schema";
import { nodeSchema } from "@/lib/db/schema";
import type { SevenStoreSnapshot } from "@/lib/db/indexeddb.test-utils";
import {
  TRANSACTION_TEST_IDS,
  createSevenStoreSeed,
  openTransactionTestDatabase,
  seedSevenStores,
  snapshotSevenStores,
  transactionTestUuid,
} from "@/lib/db/indexeddb.test-utils";
import { IndexedDBDataStore } from "@/lib/db/indexeddb";

type UndoStore = {
  placeStagedCandidate(command: StagedPlacementCommand): Promise<PlacementResult>;
  reconcileStagedPlacement(command: StagedPlacementCommand): Promise<PlacementResult>;
  placeDirectBreakdown(command: DirectPlacementCommand): Promise<PlacementResult>;
  reconcileDirectPlacement(command: DirectPlacementCommand): Promise<PlacementResult>;
  undoStagedPlacement(command: StagedPlacementUndoCommand): Promise<PlacementUndoResult>;
  reconcileStagedPlacementUndo(command: StagedPlacementUndoCommand): Promise<PlacementUndoResult>;
  undoDirectPlacement(command: DirectPlacementUndoCommand): Promise<PlacementUndoResult>;
  reconcileDirectPlacementUndo(command: DirectPlacementUndoCommand): Promise<PlacementUndoResult>;
  getPlacementUndoTruth(
    command: DirectPlacementUndoCommand | StagedPlacementUndoCommand,
  ): Promise<PlacementUndoResult>;
};

type CheckpointHook = (name: string) => undefined;

const IDS = {
  placementOperation: transactionTestUuid(12401),
  undoOperation: transactionTestUuid(12402),
  result: transactionTestUuid(12403),
  target: transactionTestUuid(12404),
  child: transactionTestUuid(12405),
  collisionCandidate: transactionTestUuid(12406),
  collisionSource: transactionTestUuid(12407),
  replacementResult: transactionTestUuid(12408),
  replacementPlacementOperation: transactionTestUuid(12409),
} as const;

describe("authoritative source-aware placement Undo", () => {
  it.each([
    ["staged Node", true, "node"],
    ["staged Bit", true, "bit"],
    ["direct Node", false, "node"],
    ["direct Bit", false, "bit"],
  ] as const)(
    "%s atomically deletes the exact result and restores the source with correct provenance",
    async (_label, staged, resultType) => {
      await withUndoStore(
        (seed) => configureSeed(seed, { staged, resultType }),
        async (database, store) => {
          const now = vi.spyOn(Date, "now").mockReturnValue(200);
          const placement = placementCommand({ staged, resultType });
          const candidateBefore = staged
            ? (await database.stagedCandidates.get(
                (placement as StagedPlacementCommand).candidateId,
              ))!
            : undefined;
          const placed = staged
            ? await store.placeStagedCandidate(placement as StagedPlacementCommand)
            : await store.placeDirectBreakdown(placement);
          const undo = undoCommand(placed, candidateBefore);
          now.mockReturnValue(300);

          const reconcile = staged
            ? () => store.reconcileStagedPlacementUndo(undo as StagedPlacementUndoCommand)
            : () => store.reconcileDirectPlacementUndo(undo);
          const execute = staged
            ? () => store.undoStagedPlacement(undo as StagedPlacementUndoCommand)
            : () => store.undoDirectPlacement(undo);

          await expect(reconcile()).resolves.toMatchObject({
            operationId: undo.operationId,
            status: "not_applied",
            result: undo.resultSnapshot,
            source: undo.sourceSnapshot,
            candidate: null,
          });

          const undone = await execute();
          expect(undone).toMatchObject({
            operationId: undo.operationId,
            status: "applied",
            result: null,
            source: {
              id: undo.sourceSnapshot.id,
              consumedAt: null,
              version: undo.sourceSnapshot.version + 1,
            },
            candidate: staged
              ? {
                  id: candidateBefore!.id,
                  scratchBitId: candidateBefore!.scratchBitId,
                  sourceBreakdownId: candidateBefore!.sourceBreakdownId,
                  resultType: candidateBefore!.resultType,
                  lifecycle: "staged",
                  createdAt: candidateBefore!.createdAt,
                  version: candidateBefore!.version + 1,
                }
              : null,
          });
          if (staged) {
            expect(undone.candidate!.updatedAt).toBe(300);
          }
          if (resultType === "bit") {
            await expect(database.nodes.get(IDS.target)).resolves.toMatchObject({
              mtime: 300,
              version: 1,
            });
          }

          const committed = await snapshotSevenStores(database);
          await expect(execute()).resolves.toMatchObject({ status: "already_applied" });
          await expect(reconcile()).resolves.toMatchObject({ status: "already_applied" });
          expect(await snapshotSevenStores(database)).toEqual(committed);
        },
      );
    },
  );

  it.each([
    ["result direct version changed", (state: SevenStoreSnapshot, command: DirectPlacementUndoCommand) => {
      const result = state.bits.find(({ id }) => id === command.resultSnapshot.id)!;
      Object.assign(result, { version: result.version + 1 });
    }],
    ["result lifecycle changed", (state: SevenStoreSnapshot, command: DirectPlacementUndoCommand) => {
      const result = state.bits.find(({ id }) => id === command.resultSnapshot.id)!;
      Object.assign(result, { archivedAt: 400, version: result.version + 1 });
    }],
    ["result creation snapshot changed", (state: SevenStoreSnapshot, command: DirectPlacementUndoCommand) => {
      const result = state.bits.find(({ id }) => id === command.resultSnapshot.id)!;
      Object.assign(result, { title: "Unknown mutation" });
    }],
    ["source consumption changed", (state: SevenStoreSnapshot) => {
      Object.assign(state.scratchBreakdowns[0]!, { consumedAt: 401 });
    }],
  ] as const)("%s blocks Undo without writing", async (_label, mutate) => {
    const prepared = await preparedUndo(false, "bit");
    try {
      const state = await snapshotSevenStores(prepared.database);
      mutate(state, prepared.undo);
      await prepared.database.bits.clear();
      await prepared.database.scratchBreakdowns.clear();
      await prepared.database.bits.bulkPut(state.bits);
      await prepared.database.scratchBreakdowns.bulkPut(state.scratchBreakdowns);
      const before = await snapshotSevenStores(prepared.database);

      await expect(prepared.store.undoDirectPlacement(prepared.undo)).resolves.toMatchObject({
        status: "conflict",
      });
      expect(await snapshotSevenStores(prepared.database)).toEqual(before);
    } finally {
      prepared.database.close();
    }
  });

  it("blocks a staged Undo when the candidate identity has been reused", async () => {
    const prepared = await preparedUndo(true, "bit");
    try {
      const command = prepared.undo as StagedPlacementUndoCommand;
      await prepared.database.scratchBreakdowns.put({
        id: IDS.collisionSource,
        scratchBitId: command.sourceSnapshot.scratchBitId,
        content: "Other source",
        order: 1,
        createdAt: 101,
        consumedAt: null,
        version: 1,
      });
      await prepared.database.stagedCandidates.put({
        ...command.candidateSnapshot,
        sourceBreakdownId: IDS.collisionSource,
      });
      const before = await snapshotSevenStores(prepared.database);

      await expect(prepared.store.undoStagedPlacement(command)).resolves.toMatchObject({
        status: "conflict",
      });
      expect(await snapshotSevenStores(prepared.database)).toEqual(before);
    } finally {
      prepared.database.close();
    }
  });

  it("blocks a Node Undo while a descendant survives and re-enables it after child-first recovery", async () => {
    const prepared = await preparedUndo(false, "node");
    try {
      const resultId = prepared.undo.resultSnapshot.id;
      await prepared.database.nodes.put(makeNode({
        id: IDS.child,
        parentId: resultId,
        level: 1,
      }));
      const blocked = await snapshotSevenStores(prepared.database);
      await expect(prepared.store.undoDirectPlacement(prepared.undo)).resolves.toMatchObject({
        status: "conflict",
      });
      expect(await snapshotSevenStores(prepared.database)).toEqual(blocked);

      await prepared.database.nodes.delete(IDS.child);
      await expect(prepared.store.undoDirectPlacement(prepared.undo)).resolves.toMatchObject({
        status: "applied",
        result: null,
        source: { consumedAt: null, version: prepared.undo.sourceSnapshot.version + 1 },
      });
    } finally {
      prepared.database.close();
    }
  });

  it("blocks a Bit Undo while a Chunk survives under the result, in the verdict read and the command (SCHEMA §Undo placement)", async () => {
    const prepared = await preparedUndo(false, "bit");
    try {
      const resultId = prepared.undo.resultSnapshot.id;
      await prepared.database.chunks.put({
        id: IDS.child,
        title: "Chunk",
        description: "",
        time: null,
        timeAllDay: false,
        status: "incomplete",
        order: 0,
        parentId: resultId,
      });
      const blocked = await snapshotSevenStores(prepared.database);
      await expect(prepared.store.getPlacementUndoTruth(prepared.undo)).resolves.toMatchObject({
        status: "conflict",
      });
      await expect(prepared.store.undoDirectPlacement(prepared.undo)).resolves.toMatchObject({
        status: "conflict",
      });
      expect(await snapshotSevenStores(prepared.database)).toEqual(blocked);

      await prepared.database.chunks.delete(IDS.child);
      await expect(prepared.store.getPlacementUndoTruth(prepared.undo)).resolves.toMatchObject({
        status: "not_applied",
      });
    } finally {
      prepared.database.close();
    }
  });

  it.each([
    ["staged", "trashed", true, { deletedAt: 300 }],
    ["staged", "archived", true, { archivedAt: 300 }],
    ["direct", "trashed", false, { deletedAt: 300 }],
    ["direct", "archived", false, { archivedAt: 300 }],
  ] as const)(
    "%s Undo with a %s owning Scratch is rejected in the command and reconcile with no write",
    async (_label, _reason, staged, lifecycle) => {
      const prepared = await preparedUndo(staged, "bit");
      try {
        await prepared.database.bits.update(TRANSACTION_TEST_IDS.scratchBit, lifecycle);
        const before = await snapshotSevenStores(prepared.database);
        const { store, undo } = prepared;
        const execute = staged
          ? () => store.undoStagedPlacement(undo as StagedPlacementUndoCommand)
          : () => store.undoDirectPlacement(undo);
        const reconcile = staged
          ? () => store.reconcileStagedPlacementUndo(undo as StagedPlacementUndoCommand)
          : () => store.reconcileDirectPlacementUndo(undo);

        await expect(reconcile()).resolves.toMatchObject({ status: "rejected" });
        await expect(execute()).resolves.toMatchObject({ status: "rejected" });
        expect(await snapshotSevenStores(prepared.database)).toEqual(before);
      } finally {
        prepared.database.close();
      }
    },
  );

  it("a completed Undo still reconciles as already_applied after its Scratch is later trashed", async () => {
    const prepared = await preparedUndo(false, "bit");
    try {
      await expect(prepared.store.undoDirectPlacement(prepared.undo)).resolves.toMatchObject({
        status: "applied",
      });
      await prepared.database.bits.update(TRANSACTION_TEST_IDS.scratchBit, { deletedAt: 300 });
      await expect(
        prepared.store.reconcileDirectPlacementUndo(prepared.undo),
      ).resolves.toMatchObject({ status: "already_applied" });
    } finally {
      prepared.database.close();
    }
  });

  it.each([
    "inbox.undo-staged.after.result",
    "inbox.undo-staged.after.source",
    "inbox.undo-staged.after.candidate",
  ])("rolls staged Undo back at %s", async (checkpoint) => {
    await withUndoStore(
      (seed) => configureSeed(seed, { staged: true, resultType: "bit" }),
      async (database, store) => {
        const placement = stagedPlacementCommand("bit");
        const candidate = (await database.stagedCandidates.get(placement.candidateId))!;
        const placed = await store.placeStagedCandidate(placement);
        const command = undoCommand(placed, candidate) as StagedPlacementUndoCommand;
        const before = await snapshotSevenStores(database);

        await expect(store.undoStagedPlacement(command)).rejects.toThrow(checkpoint);
        expect(await snapshotSevenStores(database)).toEqual(before);
      },
      failAt(checkpoint),
    );
  });

  it.each([
    "inbox.undo-direct.after.result",
    "inbox.undo-direct.after.source",
  ])("rolls direct Undo back at %s", async (checkpoint) => {
    await withUndoStore(
      (seed) => configureSeed(seed, { staged: false, resultType: "bit" }),
      async (database, store) => {
        const placed = await store.placeDirectBreakdown(directPlacementCommand("bit"));
        const command = undoCommand(placed);
        const before = await snapshotSevenStores(database);

        await expect(store.undoDirectPlacement(command)).rejects.toThrow(checkpoint);
        expect(await snapshotSevenStores(database)).toEqual(before);
      },
      failAt(checkpoint),
    );
  });

  it("ABA-3 Place→Undo makes late original Placement and Stage reconciliation conflict without resurrection", async () => {
    await withUndoStore(
      (seed) => configureSeed(seed, { staged: true, resultType: "bit" }),
      async (database, store) => {
        const placement = stagedPlacementCommand("bit");
        const stage = {
          operationId: transactionTestUuid(12410),
          candidateId: placement.candidateId,
          scratchBitId: placement.scratchBitId,
          sourceBreakdownId: placement.sourceBreakdownId,
          sourceExpectedVersion: placement.sourceExpectedVersion - 1,
          resultType: placement.resultType,
        } as const;
        const candidate = (await database.stagedCandidates.get(placement.candidateId))!;
        const placed = await store.placeStagedCandidate(placement);
        const undo = undoCommand(placed, candidate) as StagedPlacementUndoCommand;
        await expect(store.undoStagedPlacement(undo)).resolves.toMatchObject({ status: "applied" });

        const afterUndo = await snapshotSevenStores(database);
        await expect(store.reconcileStagedPlacement(placement)).resolves.toMatchObject({
          status: "conflict",
        });
        await expect(
          (store as unknown as IndexedDBDataStore).reconcileStageCandidate(stage),
        ).resolves.toMatchObject({ status: "conflict" });
        await expect(store.placeStagedCandidate(placement)).resolves.toMatchObject({
          status: "conflict",
        });

        const finalState = await snapshotSevenStores(database);
        expect(finalState).toEqual(afterUndo);
        expect(finalState.nodes.some(({ id }) => id === placement.resultId)).toBe(false);
        expect(finalState.bits.some(({ id }) => id === placement.resultId)).toBe(false);
        expect(finalState.scratchBreakdowns[0]).toMatchObject({
          consumedAt: null,
          version: placement.sourceExpectedVersion + 2,
        });
        expect(finalState.stagedCandidates).toEqual([
          expect.objectContaining({
            id: placement.candidateId,
            resultType: placement.resultType,
            createdAt: candidate.createdAt,
            version: placement.candidateExpectedVersion + 1,
          }),
        ]);
      },
    );
  });

  it("late ambiguous Undo conflicts after a new confirmed placement and cannot remove or restore anything", async () => {
    await withUndoStore(
      (seed) => configureSeed(seed, { staged: false, resultType: "bit" }),
      async (database, store) => {
        const firstPlacement = directPlacementCommand("bit");
        const firstPlaced = await store.placeDirectBreakdown(firstPlacement);
        const undo = undoCommand(firstPlaced);
        await expect(store.undoDirectPlacement(undo)).resolves.toMatchObject({ status: "applied" });

        const replacement = directPlacementCommand("bit", {
          operationId: IDS.replacementPlacementOperation,
          resultId: IDS.replacementResult,
          sourceExpectedVersion: undo.sourceSnapshot.version + 1,
        });
        await expect(store.placeDirectBreakdown(replacement)).resolves.toMatchObject({
          status: "applied",
          result: { id: replacement.resultId },
          source: { version: replacement.sourceExpectedVersion + 1 },
        });
        const afterReplacement = await snapshotSevenStores(database);

        await expect(store.reconcileDirectPlacementUndo(undo)).resolves.toMatchObject({
          status: "conflict",
        });
        await expect(store.undoDirectPlacement(undo)).resolves.toMatchObject({
          status: "conflict",
        });
        expect(await snapshotSevenStores(database)).toEqual(afterReplacement);
      },
    );
  });
});

function placementCommand(options: { staged: boolean; resultType: "node" | "bit" }): DirectPlacementCommand | StagedPlacementCommand {
  return options.staged
    ? stagedPlacementCommand(options.resultType)
    : directPlacementCommand(options.resultType);
}

function stagedPlacementCommand(resultType: "node" | "bit"): StagedPlacementCommand {
  return {
    ...directPlacementCommand(resultType),
    candidateId: TRANSACTION_TEST_IDS.stagedCandidate,
    candidateExpectedVersion: 2,
  };
}

function directPlacementCommand(
  resultType: "node" | "bit",
  overrides: Partial<DirectPlacementCommand> = {},
): DirectPlacementCommand {
  return {
    operationId: IDS.placementOperation,
    resultId: IDS.result,
    scratchBitId: TRANSACTION_TEST_IDS.scratchBit,
    sourceBreakdownId: TRANSACTION_TEST_IDS.sourceBreakdown,
    sourceExpectedVersion: 2,
    resultType,
    title: "Existing source",
    targetParentId: resultType === "node" ? null : IDS.target,
    expectedAncestorIds: resultType === "node" ? [] : [IDS.target],
    x: 2,
    y: 3,
    ...overrides,
  };
}

function undoCommand(
  placed: PlacementResult,
  candidate?: StagedCandidate,
): DirectPlacementUndoCommand | StagedPlacementUndoCommand {
  expect(placed.result).not.toBeNull();
  expect(placed.source).not.toBeNull();
  const base = {
    operationId: IDS.undoOperation,
    resultSnapshot: placed.result!,
    sourceSnapshot: placed.source!,
  };
  return candidate ? { ...base, candidateSnapshot: candidate } : base;
}

function configureSeed(
  seed: SevenStoreSnapshot,
  options: { staged: boolean; resultType: "node" | "bit" },
): void {
  seed.nodes.push(makeNode({ id: IDS.target, title: "Target" }));
  seed.stagedCandidates = options.staged
    ? [{ ...seed.stagedCandidates[0]!, resultType: options.resultType }]
    : [];
}

function makeNode(overrides: Partial<Node>): Node {
  return nodeSchema.parse({
    id: IDS.target,
    title: "Node",
    color: "hsl(210, 80%, 55%)",
    icon: "Folder",
    deadline: null,
    deadlineAllDay: false,
    mtime: 100,
    createdAt: 100,
    version: 1,
    parentId: null,
    level: 0,
    x: 1,
    y: 0,
    deletedAt: null,
    archivedAt: null,
    systemRole: null,
    hiddenFromGrid: false,
    pastDeadlineDismissed: false,
    ...overrides,
  });
}

async function preparedUndo(
  staged: boolean,
  resultType: "node" | "bit",
): Promise<{
  database: Awaited<ReturnType<typeof openTransactionTestDatabase>>;
  store: UndoStore;
  undo: DirectPlacementUndoCommand | StagedPlacementUndoCommand;
}> {
  const database = await openTransactionTestDatabase();
  const seed = createSevenStoreSeed();
  configureSeed(seed, { staged, resultType });
  await seedSevenStores(database, seed);
  const store = new IndexedDBDataStore(database) as unknown as UndoStore;
  const placement = placementCommand({ staged, resultType });
  const candidate = staged
    ? (await database.stagedCandidates.get((placement as StagedPlacementCommand).candidateId))!
    : undefined;
  const placed = staged
    ? await store.placeStagedCandidate(placement as StagedPlacementCommand)
    : await store.placeDirectBreakdown(placement);
  return { database, store, undo: undoCommand(placed, candidate) };
}

function failAt(expectedCheckpoint: string): CheckpointHook {
  return (checkpoint) => {
    if (checkpoint === expectedCheckpoint) throw new Error(checkpoint);
    return undefined;
  };
}

async function withUndoStore(
  configure: (seed: SevenStoreSnapshot) => void,
  run: (
    database: Awaited<ReturnType<typeof openTransactionTestDatabase>>,
    store: UndoStore,
  ) => Promise<void>,
  onCheckpoint?: CheckpointHook,
): Promise<void> {
  const database = await openTransactionTestDatabase();
  try {
    const seed = createSevenStoreSeed();
    configure(seed);
    await seedSevenStores(database, seed);
    const store = new IndexedDBDataStore(database, onCheckpoint) as unknown as UndoStore;
    await run(database, store);
  } finally {
    database.close();
    vi.restoreAllMocks();
  }
}
