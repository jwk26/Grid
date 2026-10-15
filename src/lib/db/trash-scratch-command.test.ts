import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrashScratchCommand, TrashScratchResult } from "@/lib/db/datastore";
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

type TrashStore = {
  trashScratch(command: TrashScratchCommand): Promise<TrashScratchResult>;
  reconcileTrashScratch(command: TrashScratchCommand): Promise<TrashScratchResult>;
  restoreBit(id: string): Promise<void>;
  softDeleteBit(id: string): Promise<void>;
};

type CheckpointHook = (name: string) => undefined;

const IDS = {
  operation: transactionTestUuid(12601),
  lateCandidate: transactionTestUuid(12602),
  lateSource: transactionTestUuid(12603),
  otherScratch: transactionTestUuid(12604),
  otherOperation: transactionTestUuid(12605),
} as const;

const SCRATCH_VERSION = 4;

function command(overrides: Partial<TrashScratchCommand> = {}): TrashScratchCommand {
  return {
    operationId: IDS.operation,
    scratchBitId: TRANSACTION_TEST_IDS.scratchBit,
    expectedVersion: SCRATCH_VERSION,
    candidates: [
      {
        candidateId: TRANSACTION_TEST_IDS.stagedCandidate,
        candidateExpectedVersion: 2,
        sourceBreakdownId: TRANSACTION_TEST_IDS.sourceBreakdown,
        sourceExpectedVersion: 2,
      },
    ],
    ...overrides,
  };
}

function emptySet(seed: SevenStoreSnapshot): void {
  seed.stagedCandidates = [];
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("authoritative Scratch Trash command", () => {
  it("applies atomically: Scratch trashed, candidates deleted, sources unstaged, Inbox touched, no audit event", async () => {
    await withTrashStore(undefined, async (database, store) => {
      vi.spyOn(Date, "now").mockReturnValue(500);
      const before = await snapshotSevenStores(database);

      const result = await store.trashScratch(command());

      expect(result).toMatchObject({
        status: "applied",
        scratch: { deletedAt: 500, mtime: 500, version: SCRATCH_VERSION + 1, archivedAt: null },
        candidates: [],
      });
      const after = await snapshotSevenStores(database);
      expect(after.stagedCandidates).toEqual([]);
      expect(after.scratchBreakdowns).toEqual([
        { ...before.scratchBreakdowns[0], version: 3 },
      ]);
      expect(after.bits[0]).toMatchObject({ deletedAt: 500, version: SCRATCH_VERSION + 1 });
      expect(after.nodes[0]).toMatchObject({ mtime: 500, version: before.nodes[0]!.version });
      expect(after.chunks).toEqual(before.chunks);
      expect(after.candidateOrphanAuditEvents).toEqual(before.candidateOrphanAuditEvents);
    });
  });

  it("trashes a Scratch with no candidates and keeps Breakdown rows", async () => {
    await withTrashStore(emptySet, async (database, store) => {
      const before = await snapshotSevenStores(database);
      await expect(store.trashScratch(command({ candidates: [] }))).resolves.toMatchObject({
        status: "applied",
      });
      const after = await snapshotSevenStores(database);
      expect(after.scratchBreakdowns).toEqual(before.scratchBreakdowns);
    });
  });

  it("returns already_applied when the complete postcondition holds, without writing", async () => {
    await withTrashStore(undefined, async (database, store) => {
      await store.trashScratch(command());
      const applied = await snapshotSevenStores(database);

      await expect(store.trashScratch(command())).resolves.toMatchObject({
        status: "already_applied",
      });
      await expect(store.reconcileTrashScratch(command())).resolves.toMatchObject({
        status: "already_applied",
      });
      expect(await snapshotSevenStores(database)).toEqual(applied);
    });
  });

  it("reconciles not_applied for the exact precondition and writes nothing", async () => {
    await withTrashStore(undefined, async (database, store) => {
      const before = await snapshotSevenStores(database);
      await expect(store.reconcileTrashScratch(command())).resolves.toMatchObject({
        status: "not_applied",
        scratch: { version: SCRATCH_VERSION },
      });
      expect(await snapshotSevenStores(database)).toEqual(before);
    });
  });

  it("conflicts when a candidate was staged after the confirmation and removes nothing", async () => {
    await withTrashStore(undefined, async (database, store) => {
      await database.scratchBreakdowns.put({
        id: IDS.lateSource,
        scratchBitId: TRANSACTION_TEST_IDS.scratchBit,
        content: "Late",
        order: 1,
        createdAt: 120,
        consumedAt: null,
        version: 2,
      });
      await database.stagedCandidates.put({
        id: IDS.lateCandidate,
        scratchBitId: TRANSACTION_TEST_IDS.scratchBit,
        sourceBreakdownId: IDS.lateSource,
        resultType: "bit",
        lifecycle: "staged",
        createdAt: 120,
        updatedAt: 120,
        version: 1,
      });
      const before = await snapshotSevenStores(database);

      await expect(store.trashScratch(command())).resolves.toMatchObject({ status: "conflict" });
      await expect(store.reconcileTrashScratch(command())).resolves.toMatchObject({
        status: "conflict",
      });
      expect(await snapshotSevenStores(database)).toEqual(before);
    });
  });

  it("conflicts when a confirmed candidate was removed before dispatch", async () => {
    await withTrashStore(undefined, async (database, store) => {
      await database.stagedCandidates.delete(TRANSACTION_TEST_IDS.stagedCandidate);
      const before = await snapshotSevenStores(database);
      await expect(store.trashScratch(command())).resolves.toMatchObject({ status: "conflict" });
      expect(await snapshotSevenStores(database)).toEqual(before);
    });
  });

  it.each([
    ["source row version", (database: Db) =>
      database.scratchBreakdowns.update(TRANSACTION_TEST_IDS.sourceBreakdown, { version: 3 })],
    ["candidate version", (database: Db) =>
      database.stagedCandidates.update(TRANSACTION_TEST_IDS.stagedCandidate, { version: 3 })],
    ["Scratch version", (database: Db) =>
      database.bits.update(TRANSACTION_TEST_IDS.scratchBit, { version: SCRATCH_VERSION + 1 })],
  ])("conflicts when the %s changed", async (_label, mutate) => {
    await withTrashStore(undefined, async (database, store) => {
      await mutate(database);
      const before = await snapshotSevenStores(database);
      await expect(store.trashScratch(command())).resolves.toMatchObject({ status: "conflict" });
      await expect(store.reconcileTrashScratch(command())).resolves.toMatchObject({
        status: "conflict",
      });
      expect(await snapshotSevenStores(database)).toEqual(before);
    });
  });

  it("conflicts when the Scratch was archived or trashed elsewhere", async () => {
    await withTrashStore(undefined, async (database, store) => {
      await database.bits.update(TRANSACTION_TEST_IDS.scratchBit, { archivedAt: 300, version: 5 });
      const before = await snapshotSevenStores(database);
      await expect(
        store.trashScratch(command({ expectedVersion: 5 })),
      ).resolves.toMatchObject({ status: "conflict" });
      expect(await snapshotSevenStores(database)).toEqual(before);
    });
  });

  it("rejects with no write when a current candidate's source cannot be resolved", async () => {
    await withTrashStore(undefined, async (database, store) => {
      await database.scratchBreakdowns.delete(TRANSACTION_TEST_IDS.sourceBreakdown);
      const before = await snapshotSevenStores(database);
      await expect(store.trashScratch(command())).resolves.toMatchObject({ status: "rejected" });
      expect(await snapshotSevenStores(database)).toEqual(before);
    });
  });

  it("rejects a duplicated candidate in the submitted set instead of leaving one behind", async () => {
    await withTrashStore(undefined, async (_database, store) => {
      const [only] = command().candidates;
      await expect(
        store.trashScratch(command({ candidates: [only!, only!] })),
      ).rejects.toThrow();
    });
  });

  it("rejects a Scratch that is not Inbox-parented", async () => {
    await withTrashStore(undefined, async (database, store) => {
      await database.nodes.update(TRANSACTION_TEST_IDS.inboxNode, { systemRole: null });
      const before = await snapshotSevenStores(database);
      await expect(store.trashScratch(command())).resolves.toMatchObject({ status: "rejected" });
      expect(await snapshotSevenStores(database)).toEqual(before);
    });
  });

  it("ambiguous Trash followed by a confirmed Trash restore reconciles as conflict and never re-trashes", async () => {
    await withTrashStore(undefined, async (database, store) => {
      await store.trashScratch(command());
      await store.restoreBit(TRANSACTION_TEST_IDS.scratchBit);
      const restored = await snapshotSevenStores(database);
      expect(restored.bits[0]).toMatchObject({
        deletedAt: null,
        version: SCRATCH_VERSION + 2,
        x: 0,
        y: 0,
      });
      expect(restored.stagedCandidates).toEqual([]);

      await expect(store.reconcileTrashScratch(command())).resolves.toMatchObject({
        status: "conflict",
      });
      await expect(store.trashScratch(command())).resolves.toMatchObject({ status: "conflict" });
      expect(await snapshotSevenStores(database)).toEqual(restored);
    });
  });

  it("Trash restore with another active Scratch returns the 0,0 sentinel with active rows and no candidate", async () => {
    await withTrashStore(
      (seed) => {
        seed.bits.push({ ...seed.bits[0]!, id: IDS.otherScratch, title: "Other" });
      },
      async (database, store) => {
        await store.trashScratch(command());
        await store.restoreBit(TRANSACTION_TEST_IDS.scratchBit);
        const after = await snapshotSevenStores(database);
        expect(after.bits.find(({ id }) => id === TRANSACTION_TEST_IDS.scratchBit)).toMatchObject({
          x: 0,
          y: 0,
          deletedAt: null,
        });
        expect(after.scratchBreakdowns).toEqual([
          expect.objectContaining({ consumedAt: null, version: 3 }),
        ]);
        expect(after.stagedCandidates).toEqual([]);
      },
    );
  });

  it.each([
    "inbox.trash-scratch.after.candidates",
    "inbox.trash-scratch.after.sources",
    "inbox.trash-scratch.after.scratch",
    "inbox.trash-scratch.after.inbox",
  ])("rolls back with no partial write when failing at %s", async (checkpoint) => {
    await withTrashStore(
      undefined,
      async (database, store) => {
        const before = await snapshotSevenStores(database);
        await expect(store.trashScratch(command())).rejects.toThrow(checkpoint);
        expect(await snapshotSevenStores(database)).toEqual(before);
      },
      failAt(checkpoint),
    );
  });
});

type Db = Awaited<ReturnType<typeof openTransactionTestDatabase>>;

function failAt(expectedCheckpoint: string): CheckpointHook {
  return (checkpoint) => {
    if (checkpoint === expectedCheckpoint) throw new Error(checkpoint);
    return undefined;
  };
}

async function withTrashStore(
  configure: ((seed: SevenStoreSnapshot) => void) | undefined,
  run: (database: Db, store: TrashStore) => Promise<void>,
  onCheckpoint?: CheckpointHook,
): Promise<void> {
  const database = await openTransactionTestDatabase();
  try {
    const seed = createSevenStoreSeed();
    configure?.(seed);
    await seedSevenStores(database, seed);
    const store = new IndexedDBDataStore(database, onCheckpoint) as unknown as TrashStore;
    await run(database, store);
  } finally {
    database.close();
  }
}
