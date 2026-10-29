import Dexie from "dexie";
import { describe, expect, it, vi } from "vitest";
import type {
  AddBreakdownCommand,
  DeleteBreakdownCommand,
  DirectPlacementCommand,
  DirectPlacementUndoCommand,
  SaveBreakdownCommand,
  SaveScratchTitleCommand,
  StageCandidateCommand,
  StagedPlacementCommand,
  StagedPlacementUndoCommand,
  UnstageCandidateCommand,
} from "@/lib/db/datastore";
import type { SevenStoreSnapshot } from "@/lib/db/indexeddb.test-utils";
import {
  TRANSACTION_TEST_IDS,
  createSevenStoreSeed,
  openTransactionTestDatabase,
  seedSevenStores,
  snapshotSevenStores,
  transactionTestUuid,
} from "@/lib/db/indexeddb.test-utils";
import {
  type GridDODatabase,
  IndexedDBDataStore,
} from "@/lib/db/indexeddb";

const IDS = {
  addOperation: transactionTestUuid(1201),
  addedBreakdown: transactionTestUuid(1202),
  saveScratchOperation: transactionTestUuid(1203),
  saveBreakdownOperation: transactionTestUuid(1204),
  deleteOperation: transactionTestUuid(1205),
  competingOperation: transactionTestUuid(1206),
  stageOperation: transactionTestUuid(1207),
  stagedCandidate: transactionTestUuid(1208),
  unstageOperation: transactionTestUuid(1209),
} as const;

type CheckpointHook = (name: string) => undefined;

const RECONCILE_STORE_NAMES = [
  "nodes",
  "bits",
  "scratchBreakdowns",
  "stagedCandidates",
] as const;

describe("authoritative Inbox Breakdown commands", () => {
  it.each([
    [
      "reconcileAddBreakdown",
      (store: IndexedDBDataStore) => store.reconcileAddBreakdown(addCommand()),
    ],
    [
      "reconcileSaveScratchTitle",
      (store: IndexedDBDataStore) =>
        store.reconcileSaveScratchTitle(saveScratchCommand()),
    ],
    [
      "reconcileSaveBreakdown",
      (store: IndexedDBDataStore) =>
        store.reconcileSaveBreakdown(saveBreakdownCommand()),
    ],
    [
      "reconcileDeleteBreakdown",
      (store: IndexedDBDataStore) =>
        store.reconcileDeleteBreakdown(deleteCommand()),
    ],
    [
      "reconcileStageCandidate",
      (store: IndexedDBDataStore) =>
        store.reconcileStageCandidate(stageCommand()),
    ],
    [
      "reconcileUnstageCandidate",
      (store: IndexedDBDataStore) =>
        store.reconcileUnstageCandidate(unstageSeedCommand()),
    ],
    [
      "reconcileStagedPlacement",
      (store: IndexedDBDataStore) =>
        store.reconcileStagedPlacement(stagedPlacementSnapshotCommand()),
    ],
    [
      "reconcileDirectPlacement",
      (store: IndexedDBDataStore) =>
        store.reconcileDirectPlacement(directPlacementSnapshotCommand()),
    ],
    [
      "reconcileStagedPlacementUndo",
      (store: IndexedDBDataStore) =>
        store.reconcileStagedPlacementUndo(stagedPlacementUndoSnapshotCommand()),
    ],
    [
      "reconcileDirectPlacementUndo",
      (store: IndexedDBDataStore) =>
        store.reconcileDirectPlacementUndo(directPlacementUndoSnapshotCommand()),
    ],
  ] as const)(
    "%s reads every authoritative store from one read-only transaction snapshot",
    async (name, reconcile) => {
      await withCommandStore(undefined, async (database, store) => {
        // The Undo verdict also reads the Chunks (a Chunk under the result blocks the Undo).
        const extraStores = name.endsWith("PlacementUndo") ? ["chunks"] : [];
        await expectSingleReconcileSnapshot(database, () => reconcile(store), extraStores);
      });
    },
  );

  describe("Add Breakdown", () => {
    it("classifies the exact precondition, commits one stable row, and recognizes the complete postcondition", async () => {
      await withCommandStore(emptyBreakdownSeed, async (database, store) => {
        const command = addCommand();

        await expect(store.reconcileAddBreakdown(command)).resolves.toMatchObject({
          operationId: command.operationId,
          status: "not_applied",
          breakdown: null,
          scratch: { id: command.scratchBitId, version: command.scratchExpectedVersion },
        });

        await expect(store.addBreakdown(command)).resolves.toMatchObject({
          operationId: command.operationId,
          status: "applied",
          breakdown: {
            id: command.breakdownId,
            scratchBitId: command.scratchBitId,
            content: command.content,
            order: 0,
            consumedAt: null,
            version: 1,
          },
          scratch: { id: command.scratchBitId, version: command.scratchExpectedVersion + 1 },
        });

        const committed = await snapshotSevenStores(database);
        await expect(store.addBreakdown(command)).resolves.toMatchObject({
          status: "already_applied",
        });
        await expect(store.reconcileAddBreakdown(command)).resolves.toMatchObject({
          status: "already_applied",
        });
        expect(await snapshotSevenStores(database)).toEqual(committed);
      });
    });

    it("computes order from authoritative rows inside the transaction", async () => {
      await withCommandStore((seed) => {
        seed.stagedCandidates = [];
        seed.scratchBreakdowns = [
          { ...seed.scratchBreakdowns[0]!, order: 3 },
          {
            ...seed.scratchBreakdowns[0]!,
            id: transactionTestUuid(1210),
            content: "Later authoritative row",
            order: 8,
          },
        ];
      }, async (_database, store) => {
        await expect(store.addBreakdown(addCommand())).resolves.toMatchObject({
          status: "applied",
          breakdown: { order: 9 },
        });
      });
    });

    it("rolls the row insert back when the real transaction fails before the Scratch revision write", async () => {
      await withCommandStore(
        emptyBreakdownSeed,
        async (database, store) => {
          const before = await snapshotSevenStores(database);

          await expect(store.addBreakdown(addCommand())).rejects.toThrow(
            "inbox.add.after.breakdown",
          );
          expect(await snapshotSevenStores(database)).toEqual(before);
        },
        failAt("inbox.add.after.breakdown"),
      );
    });

    it("rejects a non-Inbox Scratch owner without writing", async () => {
      await withCommandStore((seed) => {
        emptyBreakdownSeed(seed);
        seed.nodes[0] = { ...seed.nodes[0]!, systemRole: null };
      }, async (database, store) => {
        const before = await snapshotSevenStores(database);

        await expect(store.addBreakdown(addCommand())).resolves.toMatchObject({
          status: "rejected",
        });
        expect(await snapshotSevenStores(database)).toEqual(before);
      });
    });
  });

  describe("Save Scratch title", () => {
    it("uses the exact title/version precondition and never falls back to last-write-wins", async () => {
      await withCommandStore(emptyBreakdownSeed, async (database, store) => {
        const command = saveScratchCommand();

        await expect(store.reconcileSaveScratchTitle(command)).resolves.toMatchObject({
          status: "not_applied",
          scratch: { title: command.baseTitle, version: command.expectedVersion },
        });
        await expect(store.saveScratchTitle(command)).resolves.toMatchObject({
          status: "applied",
          scratch: { title: command.title, version: command.expectedVersion + 1 },
        });
        await expect(store.reconcileSaveScratchTitle(command)).resolves.toMatchObject({
          status: "already_applied",
        });

        const committed = await snapshotSevenStores(database);
        const staleCommand: SaveScratchTitleCommand = {
          ...command,
          operationId: IDS.competingOperation,
          title: "Stale overwrite",
        };
        await expect(store.saveScratchTitle(staleCommand)).resolves.toMatchObject({
          status: "conflict",
          scratch: { title: command.title, version: command.expectedVersion + 1 },
        });
        expect(await snapshotSevenStores(database)).toEqual(committed);
      });
    });

    it("rejects archived Scratch lifecycle without writing", async () => {
      await withCommandStore((seed) => {
        emptyBreakdownSeed(seed);
        seed.bits[0] = { ...seed.bits[0]!, archivedAt: 200 };
      }, async (database, store) => {
        const before = await snapshotSevenStores(database);

        await expect(store.saveScratchTitle(saveScratchCommand())).resolves.toMatchObject({
          status: "rejected",
        });
        expect(await snapshotSevenStores(database)).toEqual(before);
      });
    });
  });

  describe("Save Breakdown", () => {
    it("conditionally saves content/order once and recognizes only its complete postcondition", async () => {
      await withCommandStore((seed) => {
        seed.stagedCandidates = [];
      }, async (database, store) => {
        const command = saveBreakdownCommand();

        await expect(store.reconcileSaveBreakdown(command)).resolves.toMatchObject({
          status: "not_applied",
          breakdown: {
            content: command.baseContent,
            order: command.baseOrder,
            version: command.expectedVersion,
          },
        });
        await expect(store.saveBreakdown(command)).resolves.toMatchObject({
          status: "applied",
          breakdown: {
            content: command.content,
            order: command.order,
            version: command.expectedVersion + 1,
          },
        });
        await expect(store.reconcileSaveBreakdown(command)).resolves.toMatchObject({
          status: "already_applied",
        });

        const committed = await snapshotSevenStores(database);
        await expect(store.saveBreakdown({
          ...command,
          operationId: IDS.competingOperation,
          content: "Stale row overwrite",
        })).resolves.toMatchObject({
          status: "conflict",
        });
        expect(await snapshotSevenStores(database)).toEqual(committed);
      });
    });

    it("rejects a staged source instead of auto-unstaging or changing either record", async () => {
      await withCommandStore(undefined, async (database, store) => {
        const before = await snapshotSevenStores(database);

        await expect(store.saveBreakdown(saveBreakdownCommand())).resolves.toMatchObject({
          status: "rejected",
          candidate: { id: TRANSACTION_TEST_IDS.stagedCandidate },
        });
        expect(await snapshotSevenStores(database)).toEqual(before);
      });
    });
  });

  describe("Delete Breakdown", () => {
    it("classifies the exact precondition, deletes once, and recognizes the complete postcondition", async () => {
      await withCommandStore((seed) => {
        seed.stagedCandidates = [];
      }, async (database, store) => {
        const command = deleteCommand();

        await expect(store.reconcileDeleteBreakdown(command)).resolves.toMatchObject({
          status: "not_applied",
          breakdown: { id: command.breakdownId, version: command.expectedVersion },
          scratch: { id: command.scratchBitId, version: command.scratchExpectedVersion },
        });
        await expect(store.deleteBreakdown(command)).resolves.toMatchObject({
          status: "applied",
          breakdown: null,
          candidate: null,
          scratch: { version: command.scratchExpectedVersion + 1 },
        });

        const committed = await snapshotSevenStores(database);
        await expect(store.deleteBreakdown(command)).resolves.toMatchObject({
          status: "already_applied",
        });
        await expect(store.reconcileDeleteBreakdown(command)).resolves.toMatchObject({
          status: "already_applied",
        });
        expect(await snapshotSevenStores(database)).toEqual(committed);
      });
    });

    it("rolls the row delete back when the real transaction fails before the Scratch revision write", async () => {
      await withCommandStore(
        (seed) => {
          seed.stagedCandidates = [];
        },
        async (database, store) => {
          const before = await snapshotSevenStores(database);

          await expect(store.deleteBreakdown(deleteCommand())).rejects.toThrow(
            "inbox.delete.after.breakdown",
          );
          expect(await snapshotSevenStores(database)).toEqual(before);
        },
        failAt("inbox.delete.after.breakdown"),
      );
    });

    it("rejects a staged source instead of cascading the candidate or row", async () => {
      await withCommandStore(undefined, async (database, store) => {
        const before = await snapshotSevenStores(database);

        await expect(store.deleteBreakdown(deleteCommand())).resolves.toMatchObject({
          status: "rejected",
          candidate: { id: TRANSACTION_TEST_IDS.stagedCandidate },
        });
        expect(await snapshotSevenStores(database)).toEqual(before);
      });
    });
  });

  describe("Stage", () => {
    it("classifies the exact precondition, stages once, and recognizes the complete postcondition", async () => {
      await withCommandStore((seed) => {
        seed.stagedCandidates = [];
      }, async (database, store) => {
        const command = stageCommand();

        await expect(store.reconcileStageCandidate(command)).resolves.toMatchObject({
          operationId: command.operationId,
          status: "not_applied",
          candidate: null,
          source: {
            id: command.sourceBreakdownId,
            version: command.sourceExpectedVersion,
          },
          scratch: { id: command.scratchBitId, version: 4 },
        });
        await expect(store.stageCandidate(command)).resolves.toMatchObject({
          operationId: command.operationId,
          status: "applied",
          candidate: {
            id: command.candidateId,
            scratchBitId: command.scratchBitId,
            sourceBreakdownId: command.sourceBreakdownId,
            resultType: command.resultType,
            lifecycle: "staged",
            version: 1,
          },
          source: { version: command.sourceExpectedVersion + 1, consumedAt: null },
        });

        const committed = await snapshotSevenStores(database);
        await expect(store.stageCandidate(command)).resolves.toMatchObject({
          status: "already_applied",
        });
        await expect(store.reconcileStageCandidate(command)).resolves.toMatchObject({
          status: "already_applied",
        });
        expect(await snapshotSevenStores(database)).toEqual(committed);
      });
    });

    it.each([
      ["an archived Scratch", (seed: SevenStoreSnapshot): void => {
        seed.stagedCandidates = [];
        seed.bits[0] = { ...seed.bits[0]!, archivedAt: 200 };
      }],
      ["a consumed source", (seed: SevenStoreSnapshot): void => {
        seed.stagedCandidates = [];
        seed.scratchBreakdowns[0] = {
          ...seed.scratchBreakdowns[0]!,
          consumedAt: 200,
        };
      }],
      ["an existing candidate for the source", (): void => {}],
    ] as const)("rejects %s without writing", async (_label, configureSeed) => {
      await withCommandStore(configureSeed, async (database, store) => {
        const before = await snapshotSevenStores(database);
        await expect(store.stageCandidate(stageCommand())).resolves.toMatchObject({
          status: "rejected",
        });
        expect(await snapshotSevenStores(database)).toEqual(before);
      });
    });
  });

  describe("Unstage", () => {
    it("classifies the exact precondition, deletes only the candidate, and advances only the source", async () => {
      await withCommandStore(undefined, async (database, store) => {
        const command = unstageSeedCommand();
        const before = await snapshotSevenStores(database);

        await expect(store.reconcileUnstageCandidate(command)).resolves.toMatchObject({
          operationId: command.operationId,
          status: "not_applied",
          candidate: {
            id: command.candidateId,
            version: command.candidateExpectedVersion,
          },
          source: {
            id: command.sourceBreakdownId,
            version: command.sourceExpectedVersion,
          },
        });
        await expect(store.unstageCandidate(command)).resolves.toMatchObject({
          status: "applied",
          candidate: null,
          source: {
            version: command.sourceExpectedVersion + 1,
            consumedAt: null,
          },
        });

        const committed = await snapshotSevenStores(database);
        expect(committed.candidateOrphanAuditEvents).toEqual(
          before.candidateOrphanAuditEvents,
        );
        expect(committed.scratchBreakdowns[0]).toEqual({
          ...before.scratchBreakdowns[0]!,
          version: command.sourceExpectedVersion + 1,
        });
        await expect(store.unstageCandidate(command)).resolves.toMatchObject({
          status: "already_applied",
        });
        await expect(store.reconcileUnstageCandidate(command)).resolves.toMatchObject({
          status: "already_applied",
        });
        expect(await snapshotSevenStores(database)).toEqual(committed);
      });
    });

    it("returns conflict without writing after a later placement consumed the source", async () => {
      await withCommandStore((seed) => {
        seed.stagedCandidates = [];
        seed.scratchBreakdowns[0] = {
          ...seed.scratchBreakdowns[0]!,
          consumedAt: 200,
          version: 3,
        };
      }, async (database, store) => {
        const before = await snapshotSevenStores(database);
        await expect(store.unstageCandidate(unstageSeedCommand())).resolves.toMatchObject({
          status: "conflict",
          candidate: null,
          source: { consumedAt: 200, version: 3 },
        });
        expect(await snapshotSevenStores(database)).toEqual(before);
      });
    });
  });

  it.each([
    ["late Stage reconciliation before duplicate Unstage", ["reconcile-stage", "unstage", "reconcile-unstage", "stage"]],
    ["duplicate Unstage before late Stage reconciliation", ["unstage", "reconcile-unstage", "stage", "reconcile-stage"]],
  ] as const)(
    "ABA-2 Stage→Unstage: %s returns conflict, preserves candidate absence/final source version, and performs no extra write",
    async (_label, delayedOrder) => {
      await withCommandStore((seed) => {
        seed.stagedCandidates = [];
      }, async (database, store) => {
        const stage = stageCommand();
        await expect(store.stageCandidate(stage)).resolves.toMatchObject({
          status: "applied",
          candidate: { id: stage.candidateId, version: 1 },
          source: { version: stage.sourceExpectedVersion + 1 },
        });

        const unstage = unstageCommand({
          candidateId: stage.candidateId,
          candidateExpectedVersion: 1,
          sourceBreakdownId: stage.sourceBreakdownId,
          sourceExpectedVersion: stage.sourceExpectedVersion + 1,
        });
        await expect(store.reconcileUnstageCandidate(unstage)).resolves.toMatchObject({
          status: "not_applied",
        });
        await expect(store.unstageCandidate(unstage)).resolves.toMatchObject({
          status: "applied",
          candidate: null,
          source: { version: stage.sourceExpectedVersion + 2 },
        });

        const afterUnstage = await snapshotSevenStores(database);
        for (const delayed of delayedOrder) {
          if (delayed === "reconcile-stage") {
            await expect(store.reconcileStageCandidate(stage)).resolves.toMatchObject({
              status: "conflict",
            });
          } else if (delayed === "stage") {
            await expect(store.stageCandidate(stage)).resolves.toMatchObject({
              status: "conflict",
            });
          } else if (delayed === "unstage") {
            await expect(store.unstageCandidate(unstage)).resolves.toMatchObject({
              status: "already_applied",
            });
          } else {
            await expect(store.reconcileUnstageCandidate(unstage)).resolves.toMatchObject({
              status: "already_applied",
            });
          }
        }

        const finalState = await snapshotSevenStores(database);
        expect(finalState).toEqual(afterUnstage);
        expect(finalState.stagedCandidates).toEqual([]);
        expect(finalState.scratchBreakdowns[0]?.version).toBe(
          stage.sourceExpectedVersion + 2,
        );
      });
    },
  );

  it.each([
    ["late Add reconciliation before duplicate Delete", ["reconcile-add", "delete", "reconcile-delete", "add"]],
    ["duplicate Delete before late Add reconciliation", ["delete", "reconcile-delete", "add", "reconcile-add"]],
  ] as const)(
    "ABA-1 Add→Delete: %s returns conflict, preserves row absence/final Scratch version, and performs no extra write",
    async (_label, delayedOrder) => {
      await withCommandStore(emptyBreakdownSeed, async (database, store) => {
        const add = addCommand();
        await expect(store.addBreakdown(add)).resolves.toMatchObject({
          status: "applied",
          breakdown: { id: add.breakdownId, version: 1 },
          scratch: { version: add.scratchExpectedVersion + 1 },
        });

        const deletion = deleteCommand({
          breakdownId: add.breakdownId,
          expectedVersion: 1,
          scratchExpectedVersion: add.scratchExpectedVersion + 1,
        });
        await expect(store.reconcileDeleteBreakdown(deletion)).resolves.toMatchObject({
          status: "not_applied",
        });
        await expect(store.deleteBreakdown(deletion)).resolves.toMatchObject({
          status: "applied",
          breakdown: null,
          scratch: { version: add.scratchExpectedVersion + 2 },
        });

        const afterDelete = await snapshotSevenStores(database);
        for (const delayed of delayedOrder) {
          if (delayed === "reconcile-add") {
            await expect(store.reconcileAddBreakdown(add)).resolves.toMatchObject({
              status: "conflict",
            });
          } else if (delayed === "add") {
            await expect(store.addBreakdown(add)).resolves.toMatchObject({
              status: "conflict",
            });
          } else if (delayed === "delete") {
            await expect(store.deleteBreakdown(deletion)).resolves.toMatchObject({
              status: "already_applied",
            });
          } else {
            await expect(store.reconcileDeleteBreakdown(deletion)).resolves.toMatchObject({
              status: "already_applied",
            });
          }
        }

        const finalState = await snapshotSevenStores(database);
        expect(finalState).toEqual(afterDelete);
        expect(finalState.scratchBreakdowns).toEqual([]);
        expect(finalState.bits.find(({ id }) => id === add.scratchBitId)?.version).toBe(
          add.scratchExpectedVersion + 2,
        );
      });
    },
  );
});

function addCommand(overrides: Partial<AddBreakdownCommand> = {}): AddBreakdownCommand {
  return {
    operationId: IDS.addOperation,
    breakdownId: IDS.addedBreakdown,
    scratchBitId: TRANSACTION_TEST_IDS.scratchBit,
    scratchExpectedVersion: 4,
    content: "New authoritative row",
    ...overrides,
  };
}

function saveScratchCommand(
  overrides: Partial<SaveScratchTitleCommand> = {},
): SaveScratchTitleCommand {
  return {
    operationId: IDS.saveScratchOperation,
    scratchBitId: TRANSACTION_TEST_IDS.scratchBit,
    expectedVersion: 4,
    baseTitle: "Scratch",
    title: "Renamed Scratch",
    ...overrides,
  };
}

function saveBreakdownCommand(
  overrides: Partial<SaveBreakdownCommand> = {},
): SaveBreakdownCommand {
  return {
    operationId: IDS.saveBreakdownOperation,
    breakdownId: TRANSACTION_TEST_IDS.sourceBreakdown,
    expectedVersion: 2,
    baseContent: "Existing source",
    baseOrder: 0,
    content: "Updated source",
    order: 2,
    ...overrides,
  };
}

function deleteCommand(
  overrides: Partial<DeleteBreakdownCommand> = {},
): DeleteBreakdownCommand {
  return {
    operationId: IDS.deleteOperation,
    breakdownId: TRANSACTION_TEST_IDS.sourceBreakdown,
    expectedVersion: 2,
    scratchBitId: TRANSACTION_TEST_IDS.scratchBit,
    scratchExpectedVersion: 4,
    ...overrides,
  };
}

function stageCommand(
  overrides: Partial<StageCandidateCommand> = {},
): StageCandidateCommand {
  return {
    operationId: IDS.stageOperation,
    candidateId: IDS.stagedCandidate,
    scratchBitId: TRANSACTION_TEST_IDS.scratchBit,
    sourceBreakdownId: TRANSACTION_TEST_IDS.sourceBreakdown,
    sourceExpectedVersion: 2,
    resultType: "node",
    ...overrides,
  };
}

function unstageCommand(
  overrides: Partial<UnstageCandidateCommand> = {},
): UnstageCandidateCommand {
  return {
    operationId: IDS.unstageOperation,
    candidateId: IDS.stagedCandidate,
    candidateExpectedVersion: 1,
    sourceBreakdownId: TRANSACTION_TEST_IDS.sourceBreakdown,
    sourceExpectedVersion: 3,
    ...overrides,
  };
}

function unstageSeedCommand(): UnstageCandidateCommand {
  return {
    operationId: IDS.unstageOperation,
    candidateId: TRANSACTION_TEST_IDS.stagedCandidate,
    candidateExpectedVersion: 2,
    sourceBreakdownId: TRANSACTION_TEST_IDS.sourceBreakdown,
    sourceExpectedVersion: 2,
  };
}

function directPlacementSnapshotCommand(): DirectPlacementCommand {
  return {
    operationId: transactionTestUuid(12320),
    resultId: transactionTestUuid(12321),
    scratchBitId: TRANSACTION_TEST_IDS.scratchBit,
    sourceBreakdownId: TRANSACTION_TEST_IDS.sourceBreakdown,
    sourceExpectedVersion: 2,
    resultType: "node" as const,
    title: "Placed Node",
    targetParentId: null,
    expectedAncestorIds: [] as string[],
    x: 2,
    y: 3,
  };
}

function stagedPlacementSnapshotCommand(): StagedPlacementCommand {
  return {
    ...directPlacementSnapshotCommand(),
    candidateId: TRANSACTION_TEST_IDS.stagedCandidate,
    candidateExpectedVersion: 2,
    resultType: "bit" as const,
    targetParentId: TRANSACTION_TEST_IDS.inboxNode,
    expectedAncestorIds: [TRANSACTION_TEST_IDS.inboxNode],
  };
}

function directPlacementUndoSnapshotCommand(): DirectPlacementUndoCommand {
  const seed = createSevenStoreSeed();
  return {
    operationId: transactionTestUuid(12420),
    resultSnapshot: seed.bits[0]!,
    sourceSnapshot: {
      ...seed.scratchBreakdowns[0]!,
      consumedAt: seed.bits[0]!.createdAt,
      version: seed.scratchBreakdowns[0]!.version + 1,
    },
  };
}

function stagedPlacementUndoSnapshotCommand(): StagedPlacementUndoCommand {
  return {
    ...directPlacementUndoSnapshotCommand(),
    candidateSnapshot: createSevenStoreSeed().stagedCandidates[0]!,
  };
}

function emptyBreakdownSeed(seed: SevenStoreSnapshot): void {
  seed.scratchBreakdowns = [];
  seed.stagedCandidates = [];
}

function failAt(expectedCheckpoint: string): CheckpointHook {
  return (checkpoint) => {
    if (checkpoint === expectedCheckpoint) {
      throw new Error(checkpoint);
    }
    return undefined;
  };
}

async function withCommandStore(
  configureSeed: ((seed: SevenStoreSnapshot) => void) | undefined,
  run: (database: GridDODatabase, store: IndexedDBDataStore) => Promise<void>,
  onCheckpoint?: CheckpointHook,
): Promise<void> {
  const database = await openTransactionTestDatabase();

  try {
    const seed = createSevenStoreSeed();
    configureSeed?.(seed);
    await seedSevenStores(database, seed);
    await run(database, new IndexedDBDataStore(database, onCheckpoint));
  } finally {
    database.close();
  }
}

async function expectSingleReconcileSnapshot(
  database: GridDODatabase,
  reconcile: () => Promise<unknown>,
  extraStores: readonly string[] = [],
): Promise<void> {
  const observedTransactions: Array<typeof Dexie.currentTransaction> = [];
  const observeTransaction = () => {
    observedTransactions.push(Dexie.currentTransaction);
  };
  const nodeGet = database.nodes.get.bind(database.nodes);
  const bitGet = database.bits.get.bind(database.bits);
  const breakdownGet = database.scratchBreakdowns.get.bind(
    database.scratchBreakdowns,
  );
  const candidatesToArray = database.stagedCandidates.toArray.bind(
    database.stagedCandidates,
  );
  const spies = [
    vi.spyOn(database.nodes, "get").mockImplementation((id) => {
      observeTransaction();
      return nodeGet(id);
    }),
    vi.spyOn(database.bits, "get").mockImplementation((id) => {
      observeTransaction();
      return bitGet(id);
    }),
    vi.spyOn(database.scratchBreakdowns, "get").mockImplementation((id) => {
      observeTransaction();
      return breakdownGet(id);
    }),
    vi.spyOn(database.stagedCandidates, "toArray").mockImplementation(() => {
      observeTransaction();
      return candidatesToArray();
    }),
  ];

  try {
    await reconcile();

    expect(observedTransactions.length).toBeGreaterThan(0);
    const transaction = observedTransactions[0];
    expect(transaction).not.toBeNull();
    expect(transaction?.mode).toBe("readonly");
    expect(
      observedTransactions.every((observed) => observed === transaction),
    ).toBe(true);
    expect([...(transaction?.storeNames ?? [])].sort()).toEqual(
      [...RECONCILE_STORE_NAMES, ...extraStores].sort(),
    );
  } finally {
    for (const spy of spies) {
      spy.mockRestore();
    }
  }
}
