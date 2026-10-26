import Dexie, { liveQuery, type DexieOptions, type Table } from "dexie";
import { z } from "zod";
import { GRID_COLS, GRID_ROWS, TRASH_RETENTION_DAYS } from "@/lib/constants";
import type {
  AddBreakdownCommand,
  AddBreakdownResult,
  AggregateHardDeleteResult,
  ArchiveScratchCommand,
  ArchiveScratchRecoveryResult,
  ArchiveScratchResult,
  TrashScratchCommand,
  TrashScratchResult,
  ConfirmedCandidateOrphanCleanupCommand,
  ConfirmedCandidateOrphanCleanupResult,
  DataStore,
  DeleteBreakdownCommand,
  DeleteBreakdownResult,
  DirectPlacementCommand,
  DirectPlacementUndoCommand,
  PlacementCommandBase,
  PlacementResult,
  PlacementUndoResult,
  SaveBreakdownCommand,
  SaveBreakdownResult,
  SaveScratchTitleCommand,
  SaveScratchTitleResult,
  ExtendParentOption,
  LiveObservable,
  ScratchArchiveEligibility,
  StageCandidateCommand,
  StageCandidateResult,
  StagedPlacementCommand,
  StagedPlacementUndoCommand,
  UnstageCandidateCommand,
  UnstageCandidateResult,
} from "@/lib/db/datastore";
import {
  bitSchema,
  candidateOrphanAuditEventSchema,
  chunkSchema,
  createBitSchema,
  createChunkSchema,
  createScratchBreakdownSchema,
  createNodeSchema,
  nodeSchema,
  pendingOperationRecoverySchema,
  repositoryOperationIdSchema,
  repositoryOperationStatusSchema,
  scratchBreakdownSchema,
  stagedCandidateSchema,
  updateBitSchema,
  updateNodeSchema,
  updateScratchBreakdownSchema,
  type Bit,
  type CandidateOrphanAuditEvent,
  type Chunk,
  type CreateBit,
  type CreateChunk,
  type CreateNode,
  type CreateScratchBreakdown,
  type Node,
  type PendingOperationRecovery,
  type ScratchBreakdown,
  type StagedCandidate,
  type UpdateBit,
  type UpdateNode,
  type UpdateScratchBreakdown,
} from "@/lib/db/schema";
import { buildNodeTitlePath, sortChunks, sortGridItems } from "@/lib/db/read-helpers";
import { findNearestEmptyCell } from "@/lib/utils/bfs";
import { findItemsInBlockedZone } from "@/lib/utils/breadcrumb-zone";
import { isDeadlineAfter } from "@/lib/utils/deadline";

type MutableNodeInput = Omit<Node, "id" | "createdAt" | "deletedAt" | "mtime">;
type MutableBitInput = Omit<Bit, "id" | "createdAt" | "deletedAt" | "mtime">;
type SystemNodeRole = NonNullable<Node["systemRole"]>;

type SearchResult = {
  type: "node" | "bit" | "chunk";
  item: Node | Bit | Chunk;
  parentPath: string[];
  parentNodeId?: string;
  parentBitId?: string;
  grandparentNodeId?: string;
};

type TableLike<T extends { id: string }> = {
  get(id: string): Promise<T | undefined>;
  put(value: T): Promise<unknown>;
  bulkPut(values: T[]): Promise<unknown>;
  delete(id: string): Promise<unknown>;
  bulkDelete(ids: string[]): Promise<unknown>;
  toArray(): Promise<T[]>;
};

type SettingsTableLike = {
  get(key: string): Promise<{ key: string; value: unknown } | undefined>;
  put(value: { key: string; value: unknown }): Promise<unknown>;
};

type DatabaseLike = {
  nodes: TableLike<Node>;
  bits: TableLike<Bit>;
  chunks: TableLike<Chunk>;
  settings?: SettingsTableLike;
  scratchBreakdowns?: TableLike<ScratchBreakdown>;
  stagedCandidates?: TableLike<StagedCandidate>;
  candidateOrphanAuditEvents?: TableLike<CandidateOrphanAuditEvent>;
};

type ConfirmedCandidateOrphanState = {
  candidate: StagedCandidate | undefined;
  source: ScratchBreakdown | undefined;
  auditById: CandidateOrphanAuditEvent | undefined;
  auditByCandidate: CandidateOrphanAuditEvent | undefined;
  authoritativeAudit: CandidateOrphanAuditEvent | undefined;
};

type PlacementState = {
  resultNode: Node | undefined;
  resultBit: Bit | undefined;
  source: ScratchBreakdown | undefined;
  candidate: StagedCandidate | undefined;
  sourceCandidate: StagedCandidate | undefined;
  scratch: Bit | undefined;
  nodes: Node[];
  bits: Bit[];
};

type PlacementUndoState = {
  resultNode: Node | undefined;
  resultBit: Bit | undefined;
  source: ScratchBreakdown | undefined;
  candidate: StagedCandidate | undefined;
  sourceCandidate: StagedCandidate | undefined;
  nodes: Node[];
  bits: Bit[];
  ownerIsActive: boolean;
};

type ScratchArchiveState = {
  eligibility: ScratchArchiveEligibility;
  activeInboxOwner: boolean;
};

type TrashScratchState = {
  scratch: Bit | undefined;
  ownerIsInbox: boolean;
  ownerIsActive: boolean;
  candidates: StagedCandidate[];
  sources: Map<string, ScratchBreakdown>;
};

type IndexedDBTransactionCheckpointHook = (name: string) => undefined;

const ROOT_PARENT_KEY = "__root__";
const DEFAULT_PROMOTED_NODE_COLOR = "hsl(221, 83%, 53%)";
const SYSTEM_NODE_ROLES = ["inbox", "archive_view"] as const satisfies readonly SystemNodeRole[];
const SYSTEM_NODE_SEEDS: Record<SystemNodeRole, Pick<Node, "title" | "icon" | "color">> = {
  inbox: {
    title: "Inbox",
    icon: "inbox",
    color: "hsl(221, 83%, 53%)",
  },
  archive_view: {
    title: "Archive",
    icon: "layers",
    color: "hsl(240, 4%, 46%)",
  },
};

/**
 * Thrown when a deadline write would violate the parent–child deadline constraint.
 * Consumers can catch this and surface DeadlineConflictModal or DeadlineConflictOverlay.
 */
export class DeadlineConflictError extends Error {
  constructor(
    /** "child_exceeds_parent" — bit/chunk deadline > parent deadline */
    public readonly conflictType: "child_exceeds_parent",
    /** IDs of the conflicting items */
    public readonly conflictingIds: string[],
  ) {
    super("Deadline conflict");
    this.name = "DeadlineConflictError";
  }
}

type IndexedDBMigrationStore = "nodes" | "bits" | "scratchBreakdowns";
type IndexedDBMigrationReason =
  | "invalid_row"
  | "missing_scratch_owner"
  | "scratch_owner_not_in_inbox";

export class IndexedDBMigrationError extends Error {
  constructor(
    public readonly store: IndexedDBMigrationStore,
    public readonly id: string,
    public readonly reason: IndexedDBMigrationReason,
  ) {
    super(`IndexedDB v4 migration failed for ${store}/${id}: ${reason}`);
    this.name = "IndexedDBMigrationError";
  }
}

const NODE_PERSISTED_FIELDS = nodeSchema.keyof().options;
const BIT_PERSISTED_FIELDS = bitSchema.keyof().options;
const BREAKDOWN_PERSISTED_FIELDS = scratchBreakdownSchema.keyof().options;

const chunkUpdateSchema = chunkSchema.omit({ id: true, parentId: true }).partial();
const commandVersionSchema = z.number().int().min(1);

const addBreakdownCommandSchema = z.object({
  operationId: repositoryOperationIdSchema,
  breakdownId: z.string().uuid(),
  scratchBitId: z.string().uuid(),
  scratchExpectedVersion: commandVersionSchema,
  content: z.string().min(1).max(1000),
}).strict();

const saveScratchTitleCommandSchema = z.object({
  operationId: repositoryOperationIdSchema,
  scratchBitId: z.string().uuid(),
  expectedVersion: commandVersionSchema,
  baseTitle: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
}).strict();

const saveBreakdownCommandSchema = z.object({
  operationId: repositoryOperationIdSchema,
  breakdownId: z.string().uuid(),
  expectedVersion: commandVersionSchema,
  baseContent: z.string().min(1).max(1000),
  baseOrder: z.number().int().min(0),
  content: z.string().min(1).max(1000),
  order: z.number().int().min(0),
}).strict();

const deleteBreakdownCommandSchema = z.object({
  operationId: repositoryOperationIdSchema,
  breakdownId: z.string().uuid(),
  expectedVersion: commandVersionSchema,
  scratchBitId: z.string().uuid(),
  scratchExpectedVersion: commandVersionSchema,
}).strict();

const stageCandidateCommandSchema = z.object({
  operationId: repositoryOperationIdSchema,
  candidateId: z.string().uuid(),
  scratchBitId: z.string().uuid(),
  sourceBreakdownId: z.string().uuid(),
  sourceExpectedVersion: commandVersionSchema,
  resultType: z.enum(["node", "bit"]),
}).strict();

const unstageCandidateCommandSchema = z.object({
  operationId: repositoryOperationIdSchema,
  candidateId: z.string().uuid(),
  candidateExpectedVersion: commandVersionSchema,
  sourceBreakdownId: z.string().uuid(),
  sourceExpectedVersion: commandVersionSchema,
}).strict();

const confirmedCandidateOrphanProofSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("confirmed"),
    cause: z.enum(["source_deleted", "source_tombstoned"]),
    sourceBreakdownId: z.string().uuid(),
  }).strict(),
  z.object({
    status: z.literal("unresolved"),
    reason: z.enum(["cache_miss", "offline", "delayed_subscription"]),
  }).strict(),
  z.object({
    status: z.literal("planned_aggregate"),
    sourceBreakdownId: z.string().uuid(),
  }).strict(),
]);

const confirmedCandidateOrphanCleanupCommandSchema = z.object({
  operationId: repositoryOperationIdSchema,
  auditEventId: z.string().uuid(),
  candidateId: z.string().uuid(),
  candidateExpectedVersion: commandVersionSchema,
  sourceBreakdownId: z.string().uuid(),
  scratchBitId: z.string().uuid(),
  resultType: z.enum(["node", "bit"]),
  proof: confirmedCandidateOrphanProofSchema,
}).strict();

const placementCommandShape = {
  operationId: repositoryOperationIdSchema,
  resultId: z.string().uuid(),
  scratchBitId: z.string().uuid(),
  sourceBreakdownId: z.string().uuid(),
  sourceExpectedVersion: commandVersionSchema,
  resultType: z.enum(["node", "bit"]),
  title: z.string().min(1).max(1000),
  targetParentId: z.string().uuid().nullable(),
  expectedAncestorIds: z.array(z.string().uuid()),
  x: z.number().int(),
  y: z.number().int(),
};

const stagedPlacementCommandSchema = z.object({
  ...placementCommandShape,
  candidateId: z.string().uuid(),
  candidateExpectedVersion: commandVersionSchema,
}).strict();

const directPlacementCommandSchema = z.object(placementCommandShape).strict();

const placementUndoCommandShape = {
  operationId: repositoryOperationIdSchema,
  resultSnapshot: z.union([nodeSchema, bitSchema]),
  sourceSnapshot: scratchBreakdownSchema,
};

const stagedPlacementUndoCommandSchema = z.object({
  ...placementUndoCommandShape,
  candidateSnapshot: stagedCandidateSchema,
}).strict();

const directPlacementUndoCommandSchema = z.object(placementUndoCommandShape).strict();

const archiveScratchCommandSchema = z.object({
  operationId: repositoryOperationIdSchema,
  scratchBitId: z.string().uuid(),
  expectedVersion: commandVersionSchema,
  callerAssertion: z.object({
    addDraftClear: z.literal(true),
    titleBlockerClear: z.literal(true),
  }).strict(),
}).strict();

const trashScratchCommandSchema = z.object({
  operationId: repositoryOperationIdSchema,
  scratchBitId: z.string().uuid(),
  expectedVersion: commandVersionSchema,
  candidates: z.array(z.object({
    candidateId: z.string().uuid(),
    candidateExpectedVersion: commandVersionSchema,
    sourceBreakdownId: z.string().uuid(),
    sourceExpectedVersion: commandVersionSchema,
  }).strict()).refine(
    (items) =>
      new Set(items.map((item) => item.candidateId)).size === items.length &&
      new Set(items.map((item) => item.sourceBreakdownId)).size === items.length,
    "Trash Scratch candidates must be a set",
  ),
}).strict();

const trashScratchResultSchema = z.object({
  operationId: repositoryOperationIdSchema,
  status: repositoryOperationStatusSchema,
  scratch: bitSchema.nullable(),
  candidates: z.array(stagedCandidateSchema),
}).strict();

const addBreakdownResultSchema = z.object({
  operationId: repositoryOperationIdSchema,
  status: repositoryOperationStatusSchema,
  breakdown: scratchBreakdownSchema.nullable(),
  scratch: bitSchema.nullable(),
}).strict();

const saveScratchTitleResultSchema = z.object({
  operationId: repositoryOperationIdSchema,
  status: repositoryOperationStatusSchema,
  scratch: bitSchema.nullable(),
}).strict();

const saveBreakdownResultSchema = z.object({
  operationId: repositoryOperationIdSchema,
  status: repositoryOperationStatusSchema,
  breakdown: scratchBreakdownSchema.nullable(),
  candidate: stagedCandidateSchema.nullable(),
  scratch: bitSchema.nullable(),
}).strict();

const deleteBreakdownResultSchema = z.object({
  operationId: repositoryOperationIdSchema,
  status: repositoryOperationStatusSchema,
  breakdown: scratchBreakdownSchema.nullable(),
  candidate: stagedCandidateSchema.nullable(),
  scratch: bitSchema.nullable(),
}).strict();

const stageCandidateResultSchema = z.object({
  operationId: repositoryOperationIdSchema,
  status: repositoryOperationStatusSchema,
  candidate: stagedCandidateSchema.nullable(),
  source: scratchBreakdownSchema.nullable(),
  scratch: bitSchema.nullable(),
}).strict();

const unstageCandidateResultSchema = z.object({
  operationId: repositoryOperationIdSchema,
  status: repositoryOperationStatusSchema,
  candidate: stagedCandidateSchema.nullable(),
  source: scratchBreakdownSchema.nullable(),
}).strict();

const confirmedCandidateOrphanCleanupResultSchema = z.object({
  operationId: repositoryOperationIdSchema,
  status: repositoryOperationStatusSchema,
  candidate: stagedCandidateSchema.nullable(),
  source: scratchBreakdownSchema.nullable(),
  auditEvent: candidateOrphanAuditEventSchema.nullable(),
}).strict();

const placementResultSchema = z.object({
  operationId: repositoryOperationIdSchema,
  status: repositoryOperationStatusSchema,
  result: z.union([nodeSchema, bitSchema]).nullable(),
  source: scratchBreakdownSchema.nullable(),
  candidate: stagedCandidateSchema.nullable(),
}).strict();

const placementUndoResultSchema = placementResultSchema;

const scratchArchiveEligibilitySchema = z.object({
  eligible: z.boolean(),
  scratch: bitSchema.nullable(),
  consumedCount: z.number().int().min(0),
  unconsumedCount: z.number().int().min(0),
  stagedCandidateCount: z.number().int().min(0),
}).strict();

const archiveScratchResultSchema = z.object({
  operationId: repositoryOperationIdSchema,
  status: repositoryOperationStatusSchema,
  scratch: bitSchema.nullable(),
}).strict();

const archiveScratchRecoveryResultSchema = z.union([
  z.object({
    operationId: repositoryOperationIdSchema,
    status: z.enum(["applied", "not_applied", "conflict"]),
    scratch: bitSchema.nullable(),
  }).strict(),
  z.object({
    operationId: repositoryOperationIdSchema,
    outcome: z.literal("unknown"),
  }).strict(),
]);

export class GridDODatabase extends Dexie {
  nodes!: Table<Node, string>;
  bits!: Table<Bit, string>;
  chunks!: Table<Chunk, string>;
  scratchBreakdowns!: Table<ScratchBreakdown, string>;
  stagedCandidates!: Table<StagedCandidate, string>;
  candidateOrphanAuditEvents!: Table<CandidateOrphanAuditEvent, string>;
  settings!: Table<{ key: string; value: unknown }, string>;

  constructor(options?: DexieOptions) {
    super("GridDO", options);

    this.version(1).stores({
      nodes: "id,parentId,deletedAt,[parentId+deletedAt],level",
      bits: "id,parentId,deletedAt,[parentId+deletedAt],status,deadline,[parentId+status]",
      chunks: "id,parentId,[parentId+order],time,status",
    });

    this.version(2).stores({
      settings: "key",
    });

    this.version(3)
      .stores({
        nodes: "id,parentId,deletedAt,[parentId+deletedAt],level,systemRole,archivedAt,[parentId+deletedAt+archivedAt]",
        bits: "id,parentId,deletedAt,[parentId+deletedAt],status,deadline,[parentId+status],archivedAt,[parentId+deletedAt+archivedAt]",
        scratchBreakdowns: "id,scratchBitId,[scratchBitId+order]",
      })
      .upgrade(async (tx) => {
        await tx.table("nodes").toCollection().modify((node) => {
          if (node.archivedAt === undefined) node.archivedAt = null;
          if (node.systemRole === undefined) node.systemRole = null;
          if (node.hiddenFromGrid === undefined) node.hiddenFromGrid = false;
        });
        await tx.table("bits").toCollection().modify((bit) => {
          if (bit.archivedAt === undefined) bit.archivedAt = null;
        });
      });

    this.version(4)
      .stores({
        nodes:
          "id,parentId,deletedAt,[parentId+deletedAt],level,systemRole,archivedAt,[parentId+deletedAt+archivedAt]",
        bits:
          "id,parentId,deletedAt,[parentId+deletedAt],status,deadline,[parentId+status],archivedAt,[parentId+deletedAt+archivedAt]",
        chunks: "id,parentId,[parentId+order],time,status",
        settings: "key",
        scratchBreakdowns:
          "id,scratchBitId,[scratchBitId+order],[scratchBitId+createdAt]",
        stagedCandidates:
          "id,&sourceBreakdownId,scratchBitId,lifecycle,[scratchBitId+lifecycle],[scratchBitId+resultType+createdAt]",
        candidateOrphanAuditEvents:
          "id,&candidateId,sourceBreakdownId,scratchBitId,occurredAt,[scratchBitId+occurredAt]",
      })
      .upgrade(async (tx) => {
        await tx.table("nodes").toCollection().modify((node) => {
          if (node.version === undefined) node.version = 1;
          if (node.pastDeadlineDismissed === undefined) {
            node.pastDeadlineDismissed = false;
          }
        });
        await tx.table("bits").toCollection().modify((bit) => {
          if (bit.version === undefined) bit.version = 1;
          if (bit.pastDeadlineDismissed === undefined) {
            bit.pastDeadlineDismissed = false;
          }
        });
        await tx.table("scratchBreakdowns").toCollection().modify((breakdown) => {
          if (breakdown.version === undefined) breakdown.version = 1;
        });

        const nodes = await tx.table("nodes").toArray();
        const bits = await tx.table("bits").toArray();
        const breakdowns = await tx.table("scratchBreakdowns").toArray();

        for (const node of nodes) {
          const parsed = nodeSchema.safeParse(node);
          if (!hasPersistedFields(node, NODE_PERSISTED_FIELDS) || !parsed.success) {
            throw new IndexedDBMigrationError("nodes", migrationRowId(node), "invalid_row");
          }
        }
        for (const bit of bits) {
          const parsed = bitSchema.safeParse(bit);
          if (!hasPersistedFields(bit, BIT_PERSISTED_FIELDS) || !parsed.success) {
            throw new IndexedDBMigrationError("bits", migrationRowId(bit), "invalid_row");
          }
        }

        const nodeById = new Map(nodes.map((node) => [migrationRowId(node), node]));
        const bitById = new Map(bits.map((bit) => [migrationRowId(bit), bit]));

        for (const breakdown of breakdowns) {
          const parsed = scratchBreakdownSchema.safeParse(breakdown);
          const breakdownId = migrationRowId(breakdown);
          if (
            !hasPersistedFields(breakdown, BREAKDOWN_PERSISTED_FIELDS) ||
            !parsed.success
          ) {
            throw new IndexedDBMigrationError(
              "scratchBreakdowns",
              breakdownId,
              "invalid_row",
            );
          }

          const owner = bitById.get(parsed.data.scratchBitId);
          if (!owner) {
            throw new IndexedDBMigrationError(
              "scratchBreakdowns",
              breakdownId,
              "missing_scratch_owner",
            );
          }
          const ownerParentId = typeof owner.parentId === "string" ? owner.parentId : "";
          const ownerParent = nodeById.get(ownerParentId);
          if (!ownerParent || ownerParent.systemRole !== "inbox") {
            throw new IndexedDBMigrationError(
              "scratchBreakdowns",
              breakdownId,
              "scratch_owner_not_in_inbox",
            );
          }
        }
      });
  }
}

function migrationRowId(row: unknown): string {
  if (
    typeof row === "object" &&
    row !== null &&
    "id" in row &&
    typeof row.id === "string"
  ) {
    return row.id;
  }
  return "<unknown>";
}

function hasPersistedFields(row: unknown, fields: readonly string[]): boolean {
  return (
    typeof row === "object" &&
    row !== null &&
    fields.every((field) => Object.prototype.hasOwnProperty.call(row, field))
  );
}

export class IndexedDBDataStore implements DataStore {
  constructor(
    private readonly database: DatabaseLike,
    private readonly onTransactionCheckpoint?: IndexedDBTransactionCheckpointHook,
  ) {}

  liveRead<T>(read: (store: DataStore) => Promise<T>): LiveObservable<T> {
    return liveQuery(() => read(this));
  }

  async getNode(id: string): Promise<Node | undefined> {
    return this.database.nodes.get(id);
  }

  async getNodes(parentId: string | null): Promise<Node[]> {
    const nodes = await this.database.nodes.toArray();
    return sortGridItems(
      nodes.filter(
        (node) =>
          node.parentId === parentId && node.deletedAt === null && node.archivedAt === null,
      ),
    );
  }

  async createNode(data: CreateNode): Promise<Node> {
    const parsed = createNodeSchema.parse(data);

    await this.ensureGridCellAvailable(parsed.parentId, parsed.x, parsed.y);
    if (parsed.parentId !== null) {
      await this.assertNodeDeadlineFitsParent(
        parsed.parentId,
        parsed.deadline,
        parsed.deadlineAllDay,
      );
    }

    const timestamp = Date.now();
    const node = nodeSchema.parse({
      ...parsed,
      id: crypto.randomUUID(),
      mtime: timestamp,
      createdAt: timestamp,
      version: 1,
      deletedAt: null,
      pastDeadlineDismissed: false,
    });

    await this.write(async () => {
      await this.database.nodes.put(node);

      if (node.parentId) {
        await this.touchNodeIds([node.parentId], timestamp);
      }
    });

    return node;
  }

  async updateNode(id: string, data: UpdateNode): Promise<void> {
    const parsed = updateNodeSchema.parse(data);

    await this.write(async () => {
      const existing = await this.getRequiredNode(id);
      const delta = recordDelta(existing, parsed);

      if (Object.keys(delta).length === 0) {
        return;
      }

      const next = {
        ...existing,
        ...delta,
      };

      if (
        next.parentId !== existing.parentId ||
        next.x !== existing.x ||
        next.y !== existing.y
      ) {
        await this.ensureGridCellAvailable(next.parentId, next.x, next.y, {
          excludedNodeIds: new Set([existing.id]),
        });
      }

      const timestamp = Date.now();
      if (touchesNodeMtime(delta)) {
        next.mtime = timestamp;
      }
      next.version += 1;

      await this.database.nodes.put(nodeSchema.parse(next));

      if (next.parentId !== existing.parentId) {
        await this.touchNodeIds(
          [existing.parentId, next.parentId].filter(isDefined),
          timestamp,
        );
      }
    });
  }

  async softDeleteNode(id: string): Promise<void> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.softDeleteNode(id));
    }

    const node = await this.getRequiredNode(id);

    if (node.deletedAt !== null) {
      return;
    }

    const { nodes, bits } = await this.collectNodeSubtree(id);
    const timestamp = Date.now();

    await this.write(async () => {
      await this.saveNodes(
        nodes
          .filter((item) => item.deletedAt === null)
          .map((item) => incrementVersion({
            ...item,
            deletedAt: timestamp,
          })),
      );
      await this.saveBits(
        bits
          .filter((item) => item.deletedAt === null)
          .map((item) => incrementVersion({
            ...item,
            deletedAt: timestamp,
          })),
      );

      if (node.parentId) {
        await this.touchNodeIds([node.parentId], timestamp);
      }
    });
  }

  async restoreNode(id: string): Promise<void> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.restoreNode(id));
    }

    const node = await this.getRequiredNode(id);

    if (node.parentId) {
      const parentNode = await this.database.nodes.get(node.parentId);
      if (parentNode && parentNode.deletedAt !== null) {
        await this.restoreNode(parentNode.id);
      }
    }

    const refreshedNode = await this.getRequiredNode(id);
    if (refreshedNode.deletedAt === null) {
      return;
    }

    const [allNodes, allBits] = await Promise.all([
      this.database.nodes.toArray(),
      this.database.bits.toArray(),
    ]);
    const nodesById = new Map(allNodes.map((candidate) => [candidate.id, candidate]));
    const restoreAnchor = refreshedNode.deletedAt;
    const subtreeIds = collectDescendantNodeIds(id, allNodes);
    const subtreeIdSet = new Set(subtreeIds);
    const occupiedByParent = buildOccupiedByParent(
      allNodes.filter(
        (item) =>
          item.deletedAt === null &&
          item.archivedAt === null &&
          !(item.parentId === null && item.hiddenFromGrid),
      ),
      allBits.filter((item) => item.deletedAt === null && item.archivedAt === null),
    );
    const restoredNodes: Node[] = [];
    const restorableNodeIds = new Set<string>();

    for (const nodeId of subtreeIds) {
      const current = nodesById.get(nodeId);
      if (!current) {
        continue;
      }

      if (current.deletedAt === null) {
        restorableNodeIds.add(current.id);
        continue;
      }

      if (!isWithinRestoreWindow(current.deletedAt, restoreAnchor)) {
        continue;
      }

      const restored = incrementVersion(placeRestoredGridItem(
        { ...current, deletedAt: null },
        occupiedByParent,
      ));
      restoredNodes.push(restored);
      restorableNodeIds.add(restored.id);
    }

    const restoredBits = sortGridItems(
      allBits.filter(
        (bit) =>
          subtreeIdSet.has(bit.parentId) &&
          bit.deletedAt !== null &&
          isWithinRestoreWindow(bit.deletedAt, restoreAnchor) &&
          restorableNodeIds.has(bit.parentId),
      ),
    ).map((bit) => incrementVersion(
      placeRestoredGridItem({ ...bit, deletedAt: null }, occupiedByParent),
    ));

    await this.write(async () => {
      await this.saveNodes(restoredNodes);
      await this.saveBits(restoredBits);

      if (refreshedNode.parentId) {
        await this.touchNodeIds([refreshedNode.parentId], Date.now());
      }
    });
  }

  async hardDeleteNode(id: string): Promise<AggregateHardDeleteResult> {
    return this.write(async () => {
      await this.getRequiredNode(id);
      return this.deletePlannedAggregate(new Set([id]), new Set());
    });
  }

  async emptyTrash(): Promise<AggregateHardDeleteResult> {
    return this.write(async () => {
      const [nodes, bits] = await Promise.all([
        this.database.nodes.toArray(),
        this.database.bits.toArray(),
      ]);
      return this.deletePlannedAggregate(
        new Set(nodes.filter((node) => node.deletedAt !== null).map(({ id }) => id)),
        new Set(bits.filter((bit) => bit.deletedAt !== null).map(({ id }) => id)),
      );
    });
  }

  async cleanupExpiredTrash(): Promise<AggregateHardDeleteResult> {
    return this.write(async () => {
      const expirationCutoff = Date.now() - TRASH_RETENTION_DAYS * 86_400_000;
      const [nodes, bits] = await Promise.all([
        this.database.nodes.toArray(),
        this.database.bits.toArray(),
      ]);
      const nodeIds = new Set(nodes.map(({ id }) => id));
      const expiredNodeIds = new Set(
        nodes
          .filter(
            (node) =>
              node.deletedAt !== null && node.deletedAt < expirationCutoff,
          )
          .map(({ id }) => id),
      );
      const expiredBitIds = new Set(
        bits
          .filter(
            (bit) =>
              bit.deletedAt !== null &&
              bit.deletedAt < expirationCutoff &&
              nodeIds.has(bit.parentId),
          )
          .map(({ id }) => id),
      );

      return this.deletePlannedAggregate(expiredNodeIds, expiredBitIds);
    });
  }

  async getBit(id: string): Promise<Bit | undefined> {
    return this.database.bits.get(id);
  }

  async getBits(parentId: string): Promise<Bit[]> {
    const bits = await this.database.bits.toArray();
    return sortGridItems(
      bits.filter(
        (bit) => bit.parentId === parentId && bit.deletedAt === null && bit.archivedAt === null,
      ),
    );
  }

  async getBitsForNode(nodeId: string): Promise<Bit[]> {
    const bits = await this.database.bits.toArray();
    return bits.filter((b) => b.parentId === nodeId && b.deletedAt === null && b.archivedAt === null);
  }

  async getAllActiveNodes(): Promise<Node[]> {
    const nodes = await this.database.nodes.toArray();
    return nodes.filter((n) => n.deletedAt === null && n.archivedAt === null);
  }

  async getAllActiveBits(): Promise<Bit[]> {
    const bits = await this.database.bits.toArray();
    return bits.filter((b) => b.deletedAt === null && b.archivedAt === null);
  }

  async createBit(data: CreateBit): Promise<Bit> {
    const parsed = createBitSchema.parse(data);

    await this.ensureGridCellAvailable(parsed.parentId, parsed.x, parsed.y);
    await this.assertBitDeadlineFitsParent(
      parsed.parentId,
      parsed.deadline,
      parsed.deadlineAllDay,
    );

    const timestamp = Date.now();
    const bit = bitSchema.parse({
      ...parsed,
      id: crypto.randomUUID(),
      status: "active",
      mtime: timestamp,
      createdAt: timestamp,
      version: 1,
      deletedAt: null,
      pastDeadlineDismissed: false,
    });

    await this.write(async () => {
      await this.database.bits.put(bit);
      await this.touchNodeIds([bit.parentId], timestamp);
    });

    return bit;
  }

  async updateBit(id: string, data: UpdateBit, options?: ExtendParentOption): Promise<void> {
    const parsed = updateBitSchema.parse(data);

    await this.write(async () => {
      const existing = await this.getRequiredBit(id);
      const delta = recordDelta(existing, parsed);

      if (Object.keys(delta).length === 0) {
        return;
      }

      const next = {
        ...existing,
        ...delta,
      };

      if (
        next.parentId !== existing.parentId ||
        next.x !== existing.x ||
        next.y !== existing.y
      ) {
        await this.ensureGridCellAvailable(next.parentId, next.x, next.y, {
          excludedBitIds: new Set([existing.id]),
        });
      }

      // Hook 2: a deadline past the parent's fails, unless the caller answered "update the parent
      // too": then the parent takes the Bit's deadline in this same write.
      let extendedParent: Node | null = null;
      try {
        await this.assertBitDeadlineFitsParent(
          next.parentId,
          next.deadline,
          next.deadlineAllDay,
          existing.id,
        );
      } catch (error) {
        if (!(options?.extendParent && error instanceof DeadlineConflictError)) throw error;
        extendedParent = await this.getRequiredNode(next.parentId);
      }

      const timestamp = Date.now();
      const statusChanged = delta.status !== undefined;
      if (touchesBitMtime(delta)) {
        next.mtime = timestamp;
      }
      next.version += 1;

      const mtimeTouched = touchesBitMtime(delta);

      await this.database.bits.put(bitSchema.parse(next));
      if (extendedParent) {
        await this.database.nodes.put(
          nodeSchema.parse(
            incrementVersion({
              ...extendedParent,
              deadline: next.deadline,
              deadlineAllDay: next.deadlineAllDay,
            }),
          ),
        );
      }

      const parentIds = new Set<string>();

      if (next.parentId !== existing.parentId) {
        parentIds.add(existing.parentId);
        parentIds.add(next.parentId);
      }
      if (statusChanged || mtimeTouched) {
        parentIds.add(next.parentId);
      }

      if (parentIds.size > 0) {
        await this.touchNodeIds([...parentIds], timestamp);
      }
    });
  }

  async softDeleteBit(id: string): Promise<void> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.softDeleteBit(id));
    }

    const bit = await this.getRequiredBit(id);

    if (bit.deletedAt !== null) {
      return;
    }

    const timestamp = Date.now();

    await this.write(async () => {
      await this.database.bits.put(incrementVersion({
        ...bit,
        deletedAt: timestamp,
      }));
      await this.touchNodeIds([bit.parentId], timestamp);
    });
  }

  async restoreBit(id: string): Promise<void> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.restoreBit(id));
    }

    const bit = await this.getRequiredBit(id);
    const parentNode = await this.getRequiredNode(bit.parentId);

    if (parentNode.deletedAt !== null) {
      await this.restoreNode(parentNode.id);
    }

    const refreshedBit = await this.getRequiredBit(id);
    if (refreshedBit.deletedAt === null) {
      return;
    }

    const [allNodes, allBits] = await Promise.all([
      this.database.nodes.toArray(),
      this.database.bits.toArray(),
    ]);
    const occupiedByParent = buildOccupiedByParent(
      allNodes.filter(
        (item) =>
          item.deletedAt === null &&
          item.archivedAt === null &&
          !(item.parentId === null && item.hiddenFromGrid),
      ),
      allBits.filter((item) => item.deletedAt === null && item.archivedAt === null),
    );
    // Scratch Bits live under the Inbox without a grid cell: keep the 0,0 sentinel.
    const restoredBit = incrementVersion(
      parentNode.systemRole === "inbox"
        ? { ...refreshedBit, deletedAt: null }
        : placeRestoredGridItem({ ...refreshedBit, deletedAt: null }, occupiedByParent),
    );

    await this.write(async () => {
      await this.database.bits.put(bitSchema.parse(restoredBit));
      await this.touchNodeIds([restoredBit.parentId], Date.now());
    });
  }

  async hardDeleteBit(id: string): Promise<AggregateHardDeleteResult> {
    return this.write(async () => {
      await this.getRequiredBit(id);
      return this.deletePlannedAggregate(new Set(), new Set([id]));
    });
  }

  async archiveNode(id: string): Promise<void> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.archiveNode(id));
    }

    const node = await this.getRequiredNode(id);

    if (node.systemRole !== null) {
      throw new Error("Cannot archive a system node");
    }
    if (node.archivedAt !== null) {
      return;
    }

    const { nodes, bits } = await this.collectNodeSubtree(id);
    const archiveTimestamp = Date.now();
    const updatedNodes = nodes.map((item) => incrementVersion({
      ...item,
      archivedAt: archiveTimestamp,
    }));
    const updatedBits = bits.map((item) => incrementVersion({
      ...item,
      archivedAt: archiveTimestamp,
    }));

    await this.write(async () => {
      await this.saveNodes(updatedNodes);
      await this.saveBits(updatedBits);
    });

    if (node.parentId) {
      await this.touchNodeIds([node.parentId], archiveTimestamp);
    }
  }

  async archiveBit(id: string): Promise<void> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.archiveBit(id));
    }

    const bit = await this.getRequiredBit(id);

    const parent = await this.database.nodes.get(bit.parentId);
    if (parent?.systemRole === "inbox") {
      throw new Error("Use archiveScratch for Inbox-owned Scratch Bits");
    }

    if (bit.archivedAt !== null) {
      return;
    }

    const archivedAt = Date.now();

    await this.write(async () => {
      await this.database.bits.put(bitSchema.parse(incrementVersion({ ...bit, archivedAt })));
      await this.touchNodeIds([bit.parentId], archivedAt);
    });
  }

  async getScratchArchiveEligibility(
    scratchBitId: string,
  ): Promise<ScratchArchiveEligibility> {
    if (
      this.database instanceof GridDODatabase &&
      !this.hasAmbientDatabaseTransaction()
    ) {
      return this.readInboxBreakdownSnapshot(() =>
        this.getScratchArchiveEligibility(scratchBitId),
      );
    }

    const state = await this.readScratchArchiveState(scratchBitId);
    return scratchArchiveEligibilitySchema.parse(state.eligibility);
  }

  async archiveScratch(
    command: ArchiveScratchCommand,
  ): Promise<ArchiveScratchResult> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.archiveScratch(command));
    }

    const parsed = archiveScratchCommandSchema.parse(command);
    const state = await this.readScratchArchiveState(parsed.scratchBitId);
    const eligibility = state.eligibility;
    const currentScratch = eligibility.scratch;

    if (
      currentScratch &&
      state.activeInboxOwner &&
      currentScratch.archivedAt !== null &&
      currentScratch.version === parsed.expectedVersion + 1
    ) {
      return archiveScratchResultSchema.parse({
        operationId: parsed.operationId,
        status: "already_applied",
        scratch: currentScratch,
      });
    }

    if (
      !currentScratch ||
      currentScratch.deletedAt !== null ||
      currentScratch.archivedAt !== null
    ) {
      return archiveScratchResultSchema.parse({
        operationId: parsed.operationId,
        status: "rejected",
        scratch: currentScratch,
      });
    }

    if (currentScratch.version !== parsed.expectedVersion) {
      return archiveScratchResultSchema.parse({
        operationId: parsed.operationId,
        status: "conflict",
        scratch: currentScratch,
      });
    }

    if (!eligibility.eligible) {
      return archiveScratchResultSchema.parse({
        operationId: parsed.operationId,
        status: "rejected",
        scratch: currentScratch,
      });
    }

    const timestamp = Date.now();
    const scratch = bitSchema.parse({
      ...currentScratch,
      archivedAt: timestamp,
      mtime: timestamp,
      version: currentScratch.version + 1,
    });
    await this.database.bits.put(scratch);
    this.emitTransactionCheckpoint("inbox.archive-scratch.after.scratch");

    return archiveScratchResultSchema.parse({
      operationId: parsed.operationId,
      status: "applied",
      scratch,
    });
  }

  async trashScratch(command: TrashScratchCommand): Promise<TrashScratchResult> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.trashScratch(command));
    }

    const parsed = trashScratchCommandSchema.parse(command);
    const state = await this.readTrashScratchState(parsed);
    const respond = (status: TrashScratchResult["status"], scratch = state.scratch) =>
      trashScratchResultSchema.parse({
        operationId: parsed.operationId,
        status,
        scratch: scratch ?? null,
        candidates: state.candidates,
      });

    if (matchesTrashScratchPostcondition(parsed, state)) {
      return respond("already_applied");
    }

    if (state.scratch && !state.ownerIsInbox) {
      return respond("rejected");
    }

    if (
      state.scratch &&
      state.candidates.some((candidate) => !state.sources.has(candidate.sourceBreakdownId))
    ) {
      return respond("rejected");
    }

    if (!matchesTrashScratchPrecondition(parsed, state)) {
      return respond("conflict");
    }

    const timestamp = Date.now();
    const scratch = bitSchema.parse({
      ...state.scratch!,
      deletedAt: timestamp,
      mtime: timestamp,
      version: state.scratch!.version + 1,
    });
    const candidates = this.requireStagedCandidates();
    const breakdowns = this.requireScratchBreakdowns();

    for (const item of parsed.candidates) {
      await candidates.delete(item.candidateId);
    }
    this.emitTransactionCheckpoint("inbox.trash-scratch.after.candidates");
    for (const item of parsed.candidates) {
      await breakdowns.put(
        scratchBreakdownSchema.parse(incrementVersion(state.sources.get(item.sourceBreakdownId)!)),
      );
    }
    this.emitTransactionCheckpoint("inbox.trash-scratch.after.sources");
    await this.database.bits.put(scratch);
    this.emitTransactionCheckpoint("inbox.trash-scratch.after.scratch");
    await this.touchNodeIds([scratch.parentId], timestamp);
    this.emitTransactionCheckpoint("inbox.trash-scratch.after.inbox");

    return trashScratchResultSchema.parse({
      operationId: parsed.operationId,
      status: "applied",
      scratch,
      candidates: [],
    });
  }

  async reconcileTrashScratch(command: TrashScratchCommand): Promise<TrashScratchResult> {
    if (
      this.database instanceof GridDODatabase &&
      !this.hasAmbientDatabaseTransaction()
    ) {
      return this.readInboxBreakdownSnapshot(() => this.reconcileTrashScratch(command));
    }

    const parsed = trashScratchCommandSchema.parse(command);
    const state = await this.readTrashScratchState(parsed);
    const status = matchesTrashScratchPostcondition(parsed, state)
      ? "already_applied"
      : matchesTrashScratchPrecondition(parsed, state)
        ? "not_applied"
        : "conflict";

    return trashScratchResultSchema.parse({
      operationId: parsed.operationId,
      status,
      scratch: state.scratch ?? null,
      candidates: state.candidates,
    });
  }

  async classifyArchiveScratchRecovery(
    recovery: PendingOperationRecovery,
  ): Promise<ArchiveScratchRecoveryResult> {
    const parsed = pendingOperationRecoverySchema.parse(recovery);

    try {
      if (
        this.database instanceof GridDODatabase &&
        !this.hasAmbientDatabaseTransaction()
      ) {
        return await this.readInboxBreakdownSnapshot(() =>
          this.classifyArchiveScratchRecovery(parsed),
        );
      }

      const state = await this.readScratchArchiveState(parsed.scratchBitId);
      const scratch = state.eligibility.scratch;
      const aggregateIsComplete =
        state.eligibility.consumedCount >= 1 &&
        state.eligibility.unconsumedCount === 0 &&
        state.eligibility.stagedCandidateCount === 0;
      const completePostcondition =
        scratch !== null &&
        state.activeInboxOwner &&
        scratch.deletedAt === null &&
        scratch.archivedAt !== null &&
        scratch.archivedAt >= parsed.startedAt &&
        scratch.mtime === scratch.archivedAt &&
        scratch.version === parsed.expectedVersion + 1 &&
        aggregateIsComplete;
      const completePrecondition =
        scratch !== null &&
        state.activeInboxOwner &&
        scratch.deletedAt === null &&
        scratch.archivedAt === null &&
        scratch.version === parsed.expectedVersion &&
        aggregateIsComplete;

      return archiveScratchRecoveryResultSchema.parse({
        operationId: parsed.operationId,
        status: completePostcondition
          ? "applied"
          : completePrecondition
            ? "not_applied"
            : "conflict",
        scratch,
      });
    } catch {
      return archiveScratchRecoveryResultSchema.parse({
        operationId: parsed.operationId,
        outcome: "unknown",
      });
    }
  }

  async unarchiveNode(id: string): Promise<void> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.unarchiveNode(id));
    }

    const node = await this.getRequiredNode(id);

    if (node.parentId) {
      const parentNode = await this.database.nodes.get(node.parentId);
      if (parentNode && parentNode.archivedAt !== null) {
        await this.unarchiveNode(parentNode.id);
      }
    }

    const refreshedNode = await this.getRequiredNode(id);
    if (refreshedNode.archivedAt === null) {
      return;
    }

    const [allNodes, allBits] = await Promise.all([
      this.database.nodes.toArray(),
      this.database.bits.toArray(),
    ]);
    const nodesById = new Map(allNodes.map((candidate) => [candidate.id, candidate]));
    const restoreAnchor = refreshedNode.archivedAt;
    const subtreeIds = collectDescendantNodeIds(id, allNodes);
    const subtreeIdSet = new Set(subtreeIds);
    const occupiedByParent = buildOccupiedByParent(
      allNodes.filter((item) => item.deletedAt === null && item.archivedAt === null),
      allBits.filter((item) => item.deletedAt === null && item.archivedAt === null),
    );
    const restoredNodes: Node[] = [];
    // Mirrors trash `restoreNode`: only restore a Bit when its parent Node is
    // itself being restored (or already active). Without this guard a Bit whose
    // archivedAt happens to fall inside the ±5s window could be un-archived while
    // its parent Node stays archived (parent archived outside the window),
    // producing an archived-Node-with-active-Bit state that violates the
    // archive/restore data-layer invariant.
    const restorableNodeIds = new Set<string>();

    for (const nodeId of subtreeIds) {
      const current = nodesById.get(nodeId);
      if (!current) {
        continue;
      }

      if (current.archivedAt === null) {
        restorableNodeIds.add(current.id);
        continue;
      }

      if (!isWithinRestoreWindow(current.archivedAt, restoreAnchor)) {
        continue;
      }

      const restored = incrementVersion(placeRestoredGridItem(
        { ...current, archivedAt: null },
        occupiedByParent,
      ));
      restoredNodes.push(restored);
      restorableNodeIds.add(restored.id);
    }

    const restoredBits = sortGridItems(
      allBits.filter(
        (bit) =>
          subtreeIdSet.has(bit.parentId) &&
          bit.archivedAt !== null &&
          isWithinRestoreWindow(bit.archivedAt, restoreAnchor) &&
          restorableNodeIds.has(bit.parentId),
      ),
    ).map((bit) => incrementVersion(
      placeRestoredGridItem({ ...bit, archivedAt: null }, occupiedByParent),
    ));

    await this.write(async () => {
      await this.saveNodes(restoredNodes);
      await this.saveBits(restoredBits);

      if (refreshedNode.parentId) {
        await this.touchNodeIds([refreshedNode.parentId], Date.now());
      }
    });
  }

  async unarchiveBit(id: string): Promise<void> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.unarchiveBit(id));
    }

    const bit = await this.getRequiredBit(id);

    if (bit.parentId) {
      const parentNode = await this.database.nodes.get(bit.parentId);
      if (parentNode && parentNode.archivedAt !== null) {
        await this.unarchiveNode(parentNode.id);
      }
    }

    const refreshedBit = await this.getRequiredBit(id);
    if (refreshedBit.archivedAt === null) {
      return;
    }

    const [allNodes, allBits] = await Promise.all([
      this.database.nodes.toArray(),
      this.database.bits.toArray(),
    ]);
    const occupiedByParent = buildOccupiedByParent(
      allNodes.filter((item) => item.deletedAt === null && item.archivedAt === null),
      allBits.filter((item) => item.deletedAt === null && item.archivedAt === null),
    );
    const restoredBit = incrementVersion(placeRestoredGridItem(
      { ...refreshedBit, archivedAt: null },
      occupiedByParent,
    ));

    await this.write(async () => {
      await this.database.bits.put(bitSchema.parse(restoredBit));
      await this.touchNodeIds([restoredBit.parentId], Date.now());
    });
  }

  async ensureSystemNodes(): Promise<void> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.ensureSystemNodes());
    }

    const allNodes = await this.database.nodes.toArray();
    const missingRoles: SystemNodeRole[] = [];
    const driftedRows: Array<{ role: SystemNodeRole; node: Node }> = [];

    for (const role of SYSTEM_NODE_ROLES) {
      const existing = allNodes.find((node) => node.systemRole === role);

      if (!existing) {
        missingRoles.push(role);
      } else if (existing.deletedAt !== null || existing.archivedAt !== null) {
        driftedRows.push({ role, node: existing });
      }
    }

    if (missingRoles.length === 0 && driftedRows.length === 0) {
      return;
    }

    const occupancy = new Set<string>();

    for (const node of allNodes) {
      if (
        node.parentId === null &&
        node.deletedAt === null &&
        node.archivedAt === null &&
        !node.hiddenFromGrid
      ) {
        occupancy.add(gridKey(node.x, node.y));
      }
    }

    const normalizePlan: Array<{ node: Node; x: number; y: number }> = [];
    const seedPlan: Array<{ role: SystemNodeRole; x: number; y: number }> = [];

    for (const { role, node } of driftedRows) {
      if (node.hiddenFromGrid) {
        normalizePlan.push({ node, x: node.x, y: node.y });
        continue;
      }

      if (!occupancy.has(gridKey(node.x, node.y))) {
        occupancy.add(gridKey(node.x, node.y));
        normalizePlan.push({ node, x: node.x, y: node.y });
        continue;
      }

      const cell = findFirstAvailableCell(occupancy);

      if (!cell) {
        throw new Error(
          `GRID_FULL: Cannot normalize system node "${role}" — no L0 cell available`,
        );
      }

      occupancy.add(gridKey(cell.x, cell.y));
      normalizePlan.push({ node, x: cell.x, y: cell.y });
    }

    for (const role of missingRoles) {
      const cell = findFirstAvailableCell(occupancy);

      if (!cell) {
        throw new Error(`GRID_FULL: Cannot seed system node "${role}" — no L0 cell available`);
      }

      occupancy.add(gridKey(cell.x, cell.y));
      seedPlan.push({ role, x: cell.x, y: cell.y });
    }

    const seedTimestamp = Date.now();
    const seedNodes = seedPlan.map(({ role, x, y }) =>
      nodeSchema.parse({
        id: crypto.randomUUID(),
        mtime: seedTimestamp,
        createdAt: seedTimestamp,
        version: 1,
        title: SYSTEM_NODE_SEEDS[role].title,
        icon: SYSTEM_NODE_SEEDS[role].icon,
        color: SYSTEM_NODE_SEEDS[role].color,
        systemRole: role,
        hiddenFromGrid: false,
        archivedAt: null,
        deletedAt: null,
        parentId: null,
        level: 0,
        x,
        y,
        deadline: null,
        deadlineAllDay: false,
        pastDeadlineDismissed: false,
      }),
    );

    const timestamp = Date.now();

    await this.write(async () => {
      for (const { node, x, y } of normalizePlan) {
        await this.database.nodes.put(incrementVersion({
          ...node,
          x,
          y,
          deletedAt: null,
          archivedAt: null,
          mtime: timestamp,
        }));
      }

      if (seedNodes.length > 0) {
        await this.database.nodes.bulkPut(seedNodes);
      }
    });
  }

  async addBreakdown(command: AddBreakdownCommand): Promise<AddBreakdownResult> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.addBreakdown(command));
    }

    const parsed = addBreakdownCommandSchema.parse(command);
    const breakdowns = this.requireScratchBreakdowns();
    const [currentBreakdown, currentScratch] = await Promise.all([
      breakdowns.get(parsed.breakdownId),
      this.database.bits.get(parsed.scratchBitId),
    ]);
    const scratchIsActive = await this.isActiveInboxScratch(currentScratch);

    if (
      matchesAddBreakdownPostcondition(
        parsed,
        currentBreakdown,
        currentScratch,
        scratchIsActive,
      )
    ) {
      return addBreakdownResultSchema.parse({
        operationId: parsed.operationId,
        status: "already_applied",
        breakdown: currentBreakdown ?? null,
        scratch: currentScratch ?? null,
      });
    }

    if (!scratchIsActive || !currentScratch) {
      return addBreakdownResultSchema.parse({
        operationId: parsed.operationId,
        status: "rejected",
        breakdown: currentBreakdown ?? null,
        scratch: currentScratch ?? null,
      });
    }

    if (
      currentBreakdown !== undefined ||
      currentScratch.version !== parsed.scratchExpectedVersion
    ) {
      return addBreakdownResultSchema.parse({
        operationId: parsed.operationId,
        status: "conflict",
        breakdown: currentBreakdown ?? null,
        scratch: currentScratch,
      });
    }

    const authoritativeRows = await breakdowns.toArray();
    const nextOrder = authoritativeRows.reduce(
      (maximum, row) =>
        row.scratchBitId === parsed.scratchBitId
          ? Math.max(maximum, row.order + 1)
          : maximum,
      0,
    );
    const breakdown = scratchBreakdownSchema.parse({
      id: parsed.breakdownId,
      scratchBitId: parsed.scratchBitId,
      content: parsed.content,
      order: nextOrder,
      createdAt: Date.now(),
      consumedAt: null,
      version: 1,
    });
    const scratch = bitSchema.parse(incrementVersion(currentScratch));

    await breakdowns.put(breakdown);
    this.emitTransactionCheckpoint("inbox.add.after.breakdown");
    await this.database.bits.put(scratch);
    this.emitTransactionCheckpoint("inbox.add.after.scratch");

    return addBreakdownResultSchema.parse({
      operationId: parsed.operationId,
      status: "applied",
      breakdown,
      scratch,
    });
  }

  async reconcileAddBreakdown(
    command: AddBreakdownCommand,
  ): Promise<AddBreakdownResult> {
    if (
      this.database instanceof GridDODatabase &&
      !this.hasAmbientDatabaseTransaction()
    ) {
      return this.readInboxBreakdownSnapshot(() =>
        this.reconcileAddBreakdown(command),
      );
    }

    const parsed = addBreakdownCommandSchema.parse(command);
    const breakdowns = this.requireScratchBreakdowns();
    const [currentBreakdown, currentScratch] = await Promise.all([
      breakdowns.get(parsed.breakdownId),
      this.database.bits.get(parsed.scratchBitId),
    ]);
    const scratchIsActive = await this.isActiveInboxScratch(currentScratch);
    const status = matchesAddBreakdownPostcondition(
      parsed,
      currentBreakdown,
      currentScratch,
      scratchIsActive,
    )
      ? "already_applied"
      : currentBreakdown === undefined &&
          scratchIsActive &&
          currentScratch?.version === parsed.scratchExpectedVersion
        ? "not_applied"
        : "conflict";

    return addBreakdownResultSchema.parse({
      operationId: parsed.operationId,
      status,
      breakdown: currentBreakdown ?? null,
      scratch: currentScratch ?? null,
    });
  }

  async saveScratchTitle(
    command: SaveScratchTitleCommand,
  ): Promise<SaveScratchTitleResult> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.saveScratchTitle(command));
    }

    const parsed = saveScratchTitleCommandSchema.parse(command);
    const currentScratch = await this.database.bits.get(parsed.scratchBitId);
    const scratchIsActive = await this.isActiveInboxScratch(currentScratch);

    if (
      matchesSaveScratchTitlePostcondition(
        parsed,
        currentScratch,
        scratchIsActive,
      )
    ) {
      return saveScratchTitleResultSchema.parse({
        operationId: parsed.operationId,
        status: "already_applied",
        scratch: currentScratch ?? null,
      });
    }

    if (!scratchIsActive || !currentScratch || parsed.baseTitle === parsed.title) {
      return saveScratchTitleResultSchema.parse({
        operationId: parsed.operationId,
        status: "rejected",
        scratch: currentScratch ?? null,
      });
    }

    if (
      currentScratch.version !== parsed.expectedVersion ||
      currentScratch.title !== parsed.baseTitle
    ) {
      return saveScratchTitleResultSchema.parse({
        operationId: parsed.operationId,
        status: "conflict",
        scratch: currentScratch,
      });
    }

    const scratch = bitSchema.parse({
      ...currentScratch,
      title: parsed.title,
      mtime: Date.now(),
      version: currentScratch.version + 1,
    });
    await this.database.bits.put(scratch);
    this.emitTransactionCheckpoint("inbox.save-scratch.after.scratch");

    return saveScratchTitleResultSchema.parse({
      operationId: parsed.operationId,
      status: "applied",
      scratch,
    });
  }

  async reconcileSaveScratchTitle(
    command: SaveScratchTitleCommand,
  ): Promise<SaveScratchTitleResult> {
    if (
      this.database instanceof GridDODatabase &&
      !this.hasAmbientDatabaseTransaction()
    ) {
      return this.readInboxBreakdownSnapshot(() =>
        this.reconcileSaveScratchTitle(command),
      );
    }

    const parsed = saveScratchTitleCommandSchema.parse(command);
    const currentScratch = await this.database.bits.get(parsed.scratchBitId);
    const scratchIsActive = await this.isActiveInboxScratch(currentScratch);
    const status = matchesSaveScratchTitlePostcondition(
      parsed,
      currentScratch,
      scratchIsActive,
    )
      ? "already_applied"
      : scratchIsActive &&
          currentScratch?.version === parsed.expectedVersion &&
          currentScratch.title === parsed.baseTitle
        ? "not_applied"
        : "conflict";

    return saveScratchTitleResultSchema.parse({
      operationId: parsed.operationId,
      status,
      scratch: currentScratch ?? null,
    });
  }

  async saveBreakdown(
    command: SaveBreakdownCommand,
  ): Promise<SaveBreakdownResult> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.saveBreakdown(command));
    }

    const parsed = saveBreakdownCommandSchema.parse(command);
    const breakdowns = this.requireScratchBreakdowns();
    const [currentBreakdown, currentCandidate] = await Promise.all([
      breakdowns.get(parsed.breakdownId),
      this.findCandidateBySource(parsed.breakdownId),
    ]);
    const currentScratch = currentBreakdown
      ? await this.database.bits.get(currentBreakdown.scratchBitId)
      : undefined;
    const scratchIsActive = await this.isActiveInboxScratch(currentScratch);

    if (
      matchesSaveBreakdownPostcondition(
        parsed,
        currentBreakdown,
        currentCandidate,
        scratchIsActive,
      )
    ) {
      return saveBreakdownResultSchema.parse({
        operationId: parsed.operationId,
        status: "already_applied",
        breakdown: currentBreakdown ?? null,
        candidate: currentCandidate ?? null,
        scratch: currentScratch ?? null,
      });
    }

    if (
      !currentBreakdown ||
      !scratchIsActive ||
      currentCandidate !== undefined ||
      currentBreakdown.consumedAt !== null ||
      (parsed.baseContent === parsed.content && parsed.baseOrder === parsed.order)
    ) {
      return saveBreakdownResultSchema.parse({
        operationId: parsed.operationId,
        status: "rejected",
        breakdown: currentBreakdown ?? null,
        candidate: currentCandidate ?? null,
        scratch: currentScratch ?? null,
      });
    }

    if (
      currentBreakdown.version !== parsed.expectedVersion ||
      currentBreakdown.content !== parsed.baseContent ||
      currentBreakdown.order !== parsed.baseOrder
    ) {
      return saveBreakdownResultSchema.parse({
        operationId: parsed.operationId,
        status: "conflict",
        breakdown: currentBreakdown,
        candidate: null,
        scratch: currentScratch ?? null,
      });
    }

    const breakdown = scratchBreakdownSchema.parse({
      ...currentBreakdown,
      content: parsed.content,
      order: parsed.order,
      version: currentBreakdown.version + 1,
    });
    await breakdowns.put(breakdown);
    this.emitTransactionCheckpoint("inbox.save-breakdown.after.breakdown");

    return saveBreakdownResultSchema.parse({
      operationId: parsed.operationId,
      status: "applied",
      breakdown,
      candidate: null,
      scratch: currentScratch ?? null,
    });
  }

  async reconcileSaveBreakdown(
    command: SaveBreakdownCommand,
  ): Promise<SaveBreakdownResult> {
    if (
      this.database instanceof GridDODatabase &&
      !this.hasAmbientDatabaseTransaction()
    ) {
      return this.readInboxBreakdownSnapshot(() =>
        this.reconcileSaveBreakdown(command),
      );
    }

    const parsed = saveBreakdownCommandSchema.parse(command);
    const breakdowns = this.requireScratchBreakdowns();
    const [currentBreakdown, currentCandidate] = await Promise.all([
      breakdowns.get(parsed.breakdownId),
      this.findCandidateBySource(parsed.breakdownId),
    ]);
    const currentScratch = currentBreakdown
      ? await this.database.bits.get(currentBreakdown.scratchBitId)
      : undefined;
    const scratchIsActive = await this.isActiveInboxScratch(currentScratch);
    const status = matchesSaveBreakdownPostcondition(
      parsed,
      currentBreakdown,
      currentCandidate,
      scratchIsActive,
    )
      ? "already_applied"
      : matchesSaveBreakdownPrecondition(
            parsed,
            currentBreakdown,
            currentCandidate,
            scratchIsActive,
          )
        ? "not_applied"
        : "conflict";

    return saveBreakdownResultSchema.parse({
      operationId: parsed.operationId,
      status,
      breakdown: currentBreakdown ?? null,
      candidate: currentCandidate ?? null,
      scratch: currentScratch ?? null,
    });
  }

  async deleteBreakdown(
    command: DeleteBreakdownCommand,
  ): Promise<DeleteBreakdownResult> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.deleteBreakdown(command));
    }

    const parsed = deleteBreakdownCommandSchema.parse(command);
    const breakdowns = this.requireScratchBreakdowns();
    const [currentBreakdown, currentCandidate, currentScratch] = await Promise.all([
      breakdowns.get(parsed.breakdownId),
      this.findCandidateBySource(parsed.breakdownId),
      this.database.bits.get(parsed.scratchBitId),
    ]);
    const scratchIsActive = await this.isActiveInboxScratch(currentScratch);

    if (
      matchesDeleteBreakdownPostcondition(
        parsed,
        currentBreakdown,
        currentCandidate,
        currentScratch,
        scratchIsActive,
      )
    ) {
      return deleteBreakdownResultSchema.parse({
        operationId: parsed.operationId,
        status: "already_applied",
        breakdown: null,
        candidate: null,
        scratch: currentScratch ?? null,
      });
    }

    if (
      !currentBreakdown ||
      !currentScratch ||
      !scratchIsActive ||
      currentCandidate !== undefined ||
      currentBreakdown.scratchBitId !== parsed.scratchBitId ||
      currentBreakdown.consumedAt !== null
    ) {
      return deleteBreakdownResultSchema.parse({
        operationId: parsed.operationId,
        status: "rejected",
        breakdown: currentBreakdown ?? null,
        candidate: currentCandidate ?? null,
        scratch: currentScratch ?? null,
      });
    }

    if (
      currentBreakdown.version !== parsed.expectedVersion ||
      currentScratch.version !== parsed.scratchExpectedVersion
    ) {
      return deleteBreakdownResultSchema.parse({
        operationId: parsed.operationId,
        status: "conflict",
        breakdown: currentBreakdown,
        candidate: null,
        scratch: currentScratch,
      });
    }

    const scratch = bitSchema.parse(incrementVersion(currentScratch));
    await breakdowns.delete(parsed.breakdownId);
    this.emitTransactionCheckpoint("inbox.delete.after.breakdown");
    await this.database.bits.put(scratch);
    this.emitTransactionCheckpoint("inbox.delete.after.scratch");

    return deleteBreakdownResultSchema.parse({
      operationId: parsed.operationId,
      status: "applied",
      breakdown: null,
      candidate: null,
      scratch,
    });
  }

  async reconcileDeleteBreakdown(
    command: DeleteBreakdownCommand,
  ): Promise<DeleteBreakdownResult> {
    if (
      this.database instanceof GridDODatabase &&
      !this.hasAmbientDatabaseTransaction()
    ) {
      return this.readInboxBreakdownSnapshot(() =>
        this.reconcileDeleteBreakdown(command),
      );
    }

    const parsed = deleteBreakdownCommandSchema.parse(command);
    const breakdowns = this.requireScratchBreakdowns();
    const [currentBreakdown, currentCandidate, currentScratch] = await Promise.all([
      breakdowns.get(parsed.breakdownId),
      this.findCandidateBySource(parsed.breakdownId),
      this.database.bits.get(parsed.scratchBitId),
    ]);
    const scratchIsActive = await this.isActiveInboxScratch(currentScratch);
    const status = matchesDeleteBreakdownPostcondition(
      parsed,
      currentBreakdown,
      currentCandidate,
      currentScratch,
      scratchIsActive,
    )
      ? "already_applied"
      : matchesDeleteBreakdownPrecondition(
            parsed,
            currentBreakdown,
            currentCandidate,
            currentScratch,
            scratchIsActive,
          )
        ? "not_applied"
        : "conflict";

    return deleteBreakdownResultSchema.parse({
      operationId: parsed.operationId,
      status,
      breakdown: currentBreakdown ?? null,
      candidate: currentCandidate ?? null,
      scratch: currentScratch ?? null,
    });
  }

  async stageCandidate(
    command: StageCandidateCommand,
  ): Promise<StageCandidateResult> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.stageCandidate(command));
    }

    const parsed = stageCandidateCommandSchema.parse(command);
    const breakdowns = this.requireScratchBreakdowns();
    const candidates = this.requireStagedCandidates();
    const [currentCandidate, sourceCandidate, currentSource, currentScratch] =
      await Promise.all([
        candidates.get(parsed.candidateId),
        this.findCandidateBySource(parsed.sourceBreakdownId),
        breakdowns.get(parsed.sourceBreakdownId),
        this.database.bits.get(parsed.scratchBitId),
      ]);
    const scratchIsActive = await this.isActiveInboxScratch(currentScratch);
    const authoritativeCandidate = currentCandidate ?? sourceCandidate;

    if (
      matchesStageCandidatePostcondition(
        parsed,
        currentCandidate,
        sourceCandidate,
        currentSource,
        currentScratch,
        scratchIsActive,
      )
    ) {
      return stageCandidateResultSchema.parse({
        operationId: parsed.operationId,
        status: "already_applied",
        candidate: currentCandidate ?? null,
        source: currentSource ?? null,
        scratch: currentScratch ?? null,
      });
    }

    if (
      !scratchIsActive ||
      !currentScratch ||
      !currentSource ||
      currentSource.scratchBitId !== parsed.scratchBitId ||
      currentSource.consumedAt !== null
    ) {
      return stageCandidateResultSchema.parse({
        operationId: parsed.operationId,
        status: "rejected",
        candidate: authoritativeCandidate ?? null,
        source: currentSource ?? null,
        scratch: currentScratch ?? null,
      });
    }

    if (currentCandidate !== undefined) {
      return stageCandidateResultSchema.parse({
        operationId: parsed.operationId,
        status: "conflict",
        candidate: currentCandidate,
        source: currentSource,
        scratch: currentScratch,
      });
    }

    if (sourceCandidate !== undefined) {
      return stageCandidateResultSchema.parse({
        operationId: parsed.operationId,
        status: "rejected",
        candidate: sourceCandidate,
        source: currentSource,
        scratch: currentScratch,
      });
    }

    if (currentSource.version !== parsed.sourceExpectedVersion) {
      return stageCandidateResultSchema.parse({
        operationId: parsed.operationId,
        status: "conflict",
        candidate: null,
        source: currentSource,
        scratch: currentScratch,
      });
    }

    const timestamp = Date.now();
    const candidate = stagedCandidateSchema.parse({
      id: parsed.candidateId,
      scratchBitId: parsed.scratchBitId,
      sourceBreakdownId: parsed.sourceBreakdownId,
      resultType: parsed.resultType,
      lifecycle: "staged",
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    });
    const source = scratchBreakdownSchema.parse(incrementVersion(currentSource));

    await candidates.put(candidate);
    this.emitTransactionCheckpoint("inbox.stage.after.candidate");
    await breakdowns.put(source);
    this.emitTransactionCheckpoint("inbox.stage.after.source");

    return stageCandidateResultSchema.parse({
      operationId: parsed.operationId,
      status: "applied",
      candidate,
      source,
      scratch: currentScratch,
    });
  }

  async reconcileStageCandidate(
    command: StageCandidateCommand,
  ): Promise<StageCandidateResult> {
    if (
      this.database instanceof GridDODatabase &&
      !this.hasAmbientDatabaseTransaction()
    ) {
      return this.readInboxBreakdownSnapshot(() =>
        this.reconcileStageCandidate(command),
      );
    }

    const parsed = stageCandidateCommandSchema.parse(command);
    const breakdowns = this.requireScratchBreakdowns();
    const candidates = this.requireStagedCandidates();
    const [currentCandidate, sourceCandidate, currentSource, currentScratch] =
      await Promise.all([
        candidates.get(parsed.candidateId),
        this.findCandidateBySource(parsed.sourceBreakdownId),
        breakdowns.get(parsed.sourceBreakdownId),
        this.database.bits.get(parsed.scratchBitId),
      ]);
    const scratchIsActive = await this.isActiveInboxScratch(currentScratch);
    const status = matchesStageCandidatePostcondition(
      parsed,
      currentCandidate,
      sourceCandidate,
      currentSource,
      currentScratch,
      scratchIsActive,
    )
      ? "already_applied"
      : matchesStageCandidatePrecondition(
            parsed,
            currentCandidate,
            sourceCandidate,
            currentSource,
            currentScratch,
            scratchIsActive,
          )
        ? "not_applied"
        : "conflict";

    return stageCandidateResultSchema.parse({
      operationId: parsed.operationId,
      status,
      candidate: currentCandidate ?? sourceCandidate ?? null,
      source: currentSource ?? null,
      scratch: currentScratch ?? null,
    });
  }

  async unstageCandidate(
    command: UnstageCandidateCommand,
  ): Promise<UnstageCandidateResult> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.unstageCandidate(command));
    }

    const parsed = unstageCandidateCommandSchema.parse(command);
    const breakdowns = this.requireScratchBreakdowns();
    const candidates = this.requireStagedCandidates();
    const [currentCandidate, sourceCandidate, currentSource] = await Promise.all([
      candidates.get(parsed.candidateId),
      this.findCandidateBySource(parsed.sourceBreakdownId),
      breakdowns.get(parsed.sourceBreakdownId),
    ]);
    const authoritativeCandidate = currentCandidate ?? sourceCandidate;

    if (
      matchesUnstageCandidatePostcondition(
        parsed,
        currentCandidate,
        sourceCandidate,
        currentSource,
      )
    ) {
      return unstageCandidateResultSchema.parse({
        operationId: parsed.operationId,
        status: "already_applied",
        candidate: null,
        source: currentSource ?? null,
      });
    }

    if (
      currentCandidate !== undefined &&
      (currentCandidate.sourceBreakdownId !== parsed.sourceBreakdownId ||
        (currentSource !== undefined &&
          currentCandidate.scratchBitId !== currentSource.scratchBitId))
    ) {
      return unstageCandidateResultSchema.parse({
        operationId: parsed.operationId,
        status: "rejected",
        candidate: authoritativeCandidate ?? null,
        source: currentSource ?? null,
      });
    }

    if (
      currentSource === undefined ||
      !matchesUnstageCandidatePrecondition(
        parsed,
        currentCandidate,
        sourceCandidate,
        currentSource,
      )
    ) {
      return unstageCandidateResultSchema.parse({
        operationId: parsed.operationId,
        status: "conflict",
        candidate: authoritativeCandidate ?? null,
        source: currentSource,
      });
    }

    const source = scratchBreakdownSchema.parse(incrementVersion(currentSource));
    await candidates.delete(parsed.candidateId);
    this.emitTransactionCheckpoint("inbox.unstage.after.candidate");
    await breakdowns.put(source);
    this.emitTransactionCheckpoint("inbox.unstage.after.source");

    return unstageCandidateResultSchema.parse({
      operationId: parsed.operationId,
      status: "applied",
      candidate: null,
      source,
    });
  }

  async reconcileUnstageCandidate(
    command: UnstageCandidateCommand,
  ): Promise<UnstageCandidateResult> {
    if (
      this.database instanceof GridDODatabase &&
      !this.hasAmbientDatabaseTransaction()
    ) {
      return this.readInboxBreakdownSnapshot(() =>
        this.reconcileUnstageCandidate(command),
      );
    }

    const parsed = unstageCandidateCommandSchema.parse(command);
    const breakdowns = this.requireScratchBreakdowns();
    const candidates = this.requireStagedCandidates();
    const [currentCandidate, sourceCandidate, currentSource] = await Promise.all([
      candidates.get(parsed.candidateId),
      this.findCandidateBySource(parsed.sourceBreakdownId),
      breakdowns.get(parsed.sourceBreakdownId),
    ]);
    const status = matchesUnstageCandidatePostcondition(
      parsed,
      currentCandidate,
      sourceCandidate,
      currentSource,
    )
      ? "already_applied"
      : matchesUnstageCandidatePrecondition(
            parsed,
            currentCandidate,
            sourceCandidate,
            currentSource,
          )
        ? "not_applied"
        : "conflict";

    return unstageCandidateResultSchema.parse({
      operationId: parsed.operationId,
      status,
      candidate: currentCandidate ?? sourceCandidate ?? null,
      source: currentSource ?? null,
    });
  }

  async cleanupConfirmedCandidateOrphan(
    command: ConfirmedCandidateOrphanCleanupCommand,
  ): Promise<ConfirmedCandidateOrphanCleanupResult> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.cleanupConfirmedCandidateOrphan(command));
    }

    const parsed = confirmedCandidateOrphanCleanupCommandSchema.parse(command);
    const state = await this.readConfirmedCandidateOrphanState(parsed);

    if (matchesConfirmedCandidateOrphanPostcondition(parsed, state)) {
      return confirmedCandidateOrphanCleanupResultSchema.parse({
        operationId: parsed.operationId,
        status: "already_applied",
        candidate: null,
        source: state.source ?? null,
        auditEvent: state.authoritativeAudit ?? null,
      });
    }

    if (parsed.proof.status !== "confirmed") {
      return confirmedCandidateOrphanCleanupResultSchema.parse({
        operationId: parsed.operationId,
        status: "rejected",
        candidate: state.candidate ?? null,
        source: state.source ?? null,
        auditEvent: state.authoritativeAudit ?? null,
      });
    }

    if (!matchesConfirmedCandidateOrphanPrecondition(parsed, state)) {
      return confirmedCandidateOrphanCleanupResultSchema.parse({
        operationId: parsed.operationId,
        status: "conflict",
        candidate: state.candidate ?? null,
        source: state.source ?? null,
        auditEvent: state.authoritativeAudit ?? null,
      });
    }

    const candidates = this.requireStagedCandidates();
    const audits = this.requireCandidateOrphanAuditEvents();
    const auditEvent = candidateOrphanAuditEventSchema.parse({
      id: parsed.auditEventId,
      cause: parsed.proof.cause,
      candidateId: parsed.candidateId,
      sourceBreakdownId: parsed.sourceBreakdownId,
      scratchBitId: parsed.scratchBitId,
      occurredAt: Date.now(),
    });

    await candidates.delete(parsed.candidateId);
    this.emitTransactionCheckpoint("inbox.orphan-cleanup.after.candidate");
    await audits.put(auditEvent);
    this.emitTransactionCheckpoint("inbox.orphan-cleanup.after.audit");

    return confirmedCandidateOrphanCleanupResultSchema.parse({
      operationId: parsed.operationId,
      status: "applied",
      candidate: null,
      source: null,
      auditEvent,
    });
  }

  async reconcileConfirmedCandidateOrphanCleanup(
    command: ConfirmedCandidateOrphanCleanupCommand,
  ): Promise<ConfirmedCandidateOrphanCleanupResult> {
    if (
      this.database instanceof GridDODatabase &&
      !this.hasAmbientDatabaseTransaction()
    ) {
      return this.readConfirmedCandidateOrphanSnapshot(() =>
        this.reconcileConfirmedCandidateOrphanCleanup(command),
      );
    }

    const parsed = confirmedCandidateOrphanCleanupCommandSchema.parse(command);
    const state = await this.readConfirmedCandidateOrphanState(parsed);
    const status = matchesConfirmedCandidateOrphanPostcondition(parsed, state)
      ? "already_applied"
      : parsed.proof.status !== "confirmed"
        ? "rejected"
        : matchesConfirmedCandidateOrphanPrecondition(parsed, state)
          ? "not_applied"
          : "conflict";

    return confirmedCandidateOrphanCleanupResultSchema.parse({
      operationId: parsed.operationId,
      status,
      candidate: state.candidate ?? null,
      source: state.source ?? null,
      auditEvent: state.authoritativeAudit ?? null,
    });
  }

  async placeStagedCandidate(
    command: StagedPlacementCommand,
  ): Promise<PlacementResult> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.placeStagedCandidate(command));
    }

    const parsed = stagedPlacementCommandSchema.parse(command);
    const state = await this.readPlacementState(parsed);
    const result = placementStateResult(state);
    const authoritativeCandidate = state.candidate ?? state.sourceCandidate;

    if (matchesStagedPlacementPostcondition(parsed, state)) {
      return placementResultSchema.parse({
        operationId: parsed.operationId,
        status: "already_applied",
        result,
        source: state.source ?? null,
        candidate: null,
      });
    }

    const validation = this.validatePlacementPrecondition(parsed, state, true);
    if (validation !== "valid") {
      return placementResultSchema.parse({
        operationId: parsed.operationId,
        status: validation,
        result,
        source: state.source ?? null,
        candidate: authoritativeCandidate ?? null,
      });
    }

    const timestamp = Date.now();
    const placed = createPlacementResult(parsed, state, timestamp);
    const source = scratchBreakdownSchema.parse({
      ...state.source!,
      consumedAt: timestamp,
      version: parsed.sourceExpectedVersion + 1,
    });

    await this.putPlacementResult(placed);
    if (parsed.targetParentId !== null) {
      const targetParent = state.nodes.find(({ id }) => id === parsed.targetParentId)!;
      await this.database.nodes.put({ ...targetParent, mtime: timestamp });
    }
    this.emitTransactionCheckpoint("inbox.place-staged.after.result");
    await this.requireScratchBreakdowns().put(source);
    this.emitTransactionCheckpoint("inbox.place-staged.after.source");
    await this.requireStagedCandidates().delete(parsed.candidateId);
    this.emitTransactionCheckpoint("inbox.place-staged.after.candidate");

    return placementResultSchema.parse({
      operationId: parsed.operationId,
      status: "applied",
      result: placed,
      source,
      candidate: null,
    });
  }

  async reconcileStagedPlacement(
    command: StagedPlacementCommand,
  ): Promise<PlacementResult> {
    if (
      this.database instanceof GridDODatabase &&
      !this.hasAmbientDatabaseTransaction()
    ) {
      return this.readInboxBreakdownSnapshot(() =>
        this.reconcileStagedPlacement(command),
      );
    }

    const parsed = stagedPlacementCommandSchema.parse(command);
    const state = await this.readPlacementState(parsed);
    const status = matchesStagedPlacementPostcondition(parsed, state)
      ? "already_applied"
      : this.validatePlacementPrecondition(parsed, state, true) === "valid"
        ? "not_applied"
        : "conflict";

    return placementResultSchema.parse({
      operationId: parsed.operationId,
      status,
      result: placementStateResult(state),
      source: state.source ?? null,
      candidate: state.candidate ?? state.sourceCandidate ?? null,
    });
  }

  async placeDirectBreakdown(
    command: DirectPlacementCommand,
  ): Promise<PlacementResult> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.placeDirectBreakdown(command));
    }

    const parsed = directPlacementCommandSchema.parse(command);
    const state = await this.readPlacementState(parsed);
    const result = placementStateResult(state);

    if (matchesDirectPlacementPostcondition(parsed, state)) {
      return placementResultSchema.parse({
        operationId: parsed.operationId,
        status: "already_applied",
        result,
        source: state.source ?? null,
        candidate: null,
      });
    }

    const validation = this.validatePlacementPrecondition(parsed, state, false);
    if (validation !== "valid") {
      return placementResultSchema.parse({
        operationId: parsed.operationId,
        status: validation,
        result,
        source: state.source ?? null,
        candidate: state.sourceCandidate ?? null,
      });
    }

    const timestamp = Date.now();
    const placed = createPlacementResult(parsed, state, timestamp);
    const source = scratchBreakdownSchema.parse({
      ...state.source!,
      consumedAt: timestamp,
      version: parsed.sourceExpectedVersion + 1,
    });

    await this.putPlacementResult(placed);
    if (parsed.targetParentId !== null) {
      const targetParent = state.nodes.find(({ id }) => id === parsed.targetParentId)!;
      await this.database.nodes.put({ ...targetParent, mtime: timestamp });
    }
    this.emitTransactionCheckpoint("inbox.place-direct.after.result");
    await this.requireScratchBreakdowns().put(source);
    this.emitTransactionCheckpoint("inbox.place-direct.after.source");

    return placementResultSchema.parse({
      operationId: parsed.operationId,
      status: "applied",
      result: placed,
      source,
      candidate: null,
    });
  }

  async reconcileDirectPlacement(
    command: DirectPlacementCommand,
  ): Promise<PlacementResult> {
    if (
      this.database instanceof GridDODatabase &&
      !this.hasAmbientDatabaseTransaction()
    ) {
      return this.readInboxBreakdownSnapshot(() =>
        this.reconcileDirectPlacement(command),
      );
    }

    const parsed = directPlacementCommandSchema.parse(command);
    const state = await this.readPlacementState(parsed);
    const status = matchesDirectPlacementPostcondition(parsed, state)
      ? "already_applied"
      : this.validatePlacementPrecondition(parsed, state, false) === "valid"
        ? "not_applied"
        : "conflict";

    return placementResultSchema.parse({
      operationId: parsed.operationId,
      status,
      result: placementStateResult(state),
      source: state.source ?? null,
      candidate: state.sourceCandidate ?? null,
    });
  }

  async undoStagedPlacement(
    command: StagedPlacementUndoCommand,
  ): Promise<PlacementUndoResult> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.undoStagedPlacement(command));
    }

    const parsed = stagedPlacementUndoCommandSchema.parse(command);
    return this.applyPlacementUndo(parsed, true);
  }

  async reconcileStagedPlacementUndo(
    command: StagedPlacementUndoCommand,
  ): Promise<PlacementUndoResult> {
    if (
      this.database instanceof GridDODatabase &&
      !this.hasAmbientDatabaseTransaction()
    ) {
      return this.readInboxBreakdownSnapshot(() =>
        this.reconcileStagedPlacementUndo(command),
      );
    }

    const parsed = stagedPlacementUndoCommandSchema.parse(command);
    const state = await this.readPlacementUndoState(parsed);
    return placementUndoResultSchema.parse({
      operationId: parsed.operationId,
      status: matchesPlacementUndoPostcondition(parsed, state, true)
        ? "already_applied"
        : !state.ownerIsActive
          ? "rejected"
          : matchesPlacementUndoPrecondition(parsed, state, true)
            ? "not_applied"
            : "conflict",
      result: placementUndoStateResult(state),
      source: state.source ?? null,
      candidate: state.candidate ?? state.sourceCandidate ?? null,
    });
  }

  async undoDirectPlacement(
    command: DirectPlacementUndoCommand,
  ): Promise<PlacementUndoResult> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.undoDirectPlacement(command));
    }

    const parsed = directPlacementUndoCommandSchema.parse(command);
    return this.applyPlacementUndo(parsed, false);
  }

  async reconcileDirectPlacementUndo(
    command: DirectPlacementUndoCommand,
  ): Promise<PlacementUndoResult> {
    if (
      this.database instanceof GridDODatabase &&
      !this.hasAmbientDatabaseTransaction()
    ) {
      return this.readInboxBreakdownSnapshot(() =>
        this.reconcileDirectPlacementUndo(command),
      );
    }

    const parsed = directPlacementUndoCommandSchema.parse(command);
    const state = await this.readPlacementUndoState(parsed);
    return placementUndoResultSchema.parse({
      operationId: parsed.operationId,
      status: matchesPlacementUndoPostcondition(parsed, state, false)
        ? "already_applied"
        : !state.ownerIsActive
          ? "rejected"
          : matchesPlacementUndoPrecondition(parsed, state, false)
            ? "not_applied"
            : "conflict",
      result: placementUndoStateResult(state),
      source: state.source ?? null,
      candidate: state.sourceCandidate ?? null,
    });
  }

  private async applyPlacementUndo(
    command: DirectPlacementUndoCommand | StagedPlacementUndoCommand,
    staged: boolean,
  ): Promise<PlacementUndoResult> {
    const state = await this.readPlacementUndoState(command);
    const authoritativeCandidate = state.candidate ?? state.sourceCandidate;

    if (matchesPlacementUndoPostcondition(command, state, staged)) {
      return placementUndoResultSchema.parse({
        operationId: command.operationId,
        status: "already_applied",
        result: null,
        source: state.source ?? null,
        candidate: staged ? authoritativeCandidate ?? null : null,
      });
    }

    if (!state.ownerIsActive) {
      return placementUndoResultSchema.parse({
        operationId: command.operationId,
        status: "rejected",
        result: placementUndoStateResult(state),
        source: state.source ?? null,
        candidate: authoritativeCandidate ?? null,
      });
    }

    if (!matchesPlacementUndoPrecondition(command, state, staged)) {
      return placementUndoResultSchema.parse({
        operationId: command.operationId,
        status: "conflict",
        result: placementUndoStateResult(state),
        source: state.source ?? null,
        candidate: authoritativeCandidate ?? null,
      });
    }

    const timestamp = Date.now();
    const result = command.resultSnapshot;
    if ("level" in result) {
      await this.database.nodes.delete(result.id);
    } else {
      await this.database.bits.delete(result.id);
    }
    if (result.parentId !== null) {
      const parent = state.nodes.find(({ id }) => id === result.parentId)!;
      await this.database.nodes.put({ ...parent, mtime: timestamp });
    }
    this.emitTransactionCheckpoint(
      staged ? "inbox.undo-staged.after.result" : "inbox.undo-direct.after.result",
    );

    const source = scratchBreakdownSchema.parse({
      ...command.sourceSnapshot,
      consumedAt: null,
      version: command.sourceSnapshot.version + 1,
    });
    await this.requireScratchBreakdowns().put(source);
    this.emitTransactionCheckpoint(
      staged ? "inbox.undo-staged.after.source" : "inbox.undo-direct.after.source",
    );

    let candidate: StagedCandidate | null = null;
    if (staged && "candidateSnapshot" in command) {
      candidate = stagedCandidateSchema.parse({
        ...command.candidateSnapshot,
        updatedAt: timestamp,
        version: command.candidateSnapshot.version + 1,
      });
      await this.requireStagedCandidates().put(candidate);
      this.emitTransactionCheckpoint("inbox.undo-staged.after.candidate");
    }

    return placementUndoResultSchema.parse({
      operationId: command.operationId,
      status: "applied",
      result: null,
      source,
      candidate,
    });
  }

  async createScratchBreakdown(data: CreateScratchBreakdown): Promise<ScratchBreakdown> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.createScratchBreakdown(data));
    }

    const table = this.requireScratchBreakdowns();
    const parsed = createScratchBreakdownSchema.parse(data);
    const owner = await this.getRequiredBit(parsed.scratchBitId);
    const row = scratchBreakdownSchema.parse({
      ...parsed,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      consumedAt: null,
      version: 1,
    });

    await this.write(async () => {
      await table.put(row);
      await this.database.bits.put(incrementVersion(owner));
    });

    return row;
  }

  async getScratchBreakdowns(scratchBitId: string): Promise<ScratchBreakdown[]> {
    const table = this.requireScratchBreakdowns();
    const all = await table.toArray();
    return all
      .filter((row) => row.scratchBitId === scratchBitId)
      .sort((left, right) => left.order - right.order);
  }

  async getAllScratchBreakdowns(): Promise<ScratchBreakdown[]> {
    return this.requireScratchBreakdowns().toArray();
  }

  async getStagedCandidates(scratchBitId: string): Promise<StagedCandidate[]> {
    const all = await this.requireStagedCandidates().toArray();
    return all.filter((candidate) => candidate.scratchBitId === scratchBitId);
  }

  async getAllStagedCandidates(): Promise<StagedCandidate[]> {
    return this.requireStagedCandidates().toArray();
  }

  async updateScratchBreakdown(
    id: string,
    data: UpdateScratchBreakdown,
  ): Promise<void> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.updateScratchBreakdown(id, data));
    }

    const table = this.requireScratchBreakdowns();
    const row = await table.get(id);

    if (!row) {
      throw new Error(`Scratch breakdown not found: ${id}`);
    }

    const parsed = updateScratchBreakdownSchema.parse(data);
    const delta = recordDelta(row, parsed);

    if (Object.keys(delta).length === 0) {
      return;
    }

    await table.put(scratchBreakdownSchema.parse(incrementVersion({ ...row, ...delta })));
  }

  async markScratchBreakdownConsumed(id: string): Promise<void> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.markScratchBreakdownConsumed(id));
    }

    const table = this.requireScratchBreakdowns();
    const row = await table.get(id);

    if (!row) {
      throw new Error(`Scratch breakdown not found: ${id}`);
    }
    if (row.consumedAt !== null) {
      return;
    }

    await table.put(scratchBreakdownSchema.parse(incrementVersion({
      ...row,
      consumedAt: Date.now(),
    })));
  }

  async unconsumeScratchBreakdown(id: string): Promise<void> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.unconsumeScratchBreakdown(id));
    }

    const table = this.requireScratchBreakdowns();
    const row = await table.get(id);

    if (!row) {
      throw new Error(`Scratch breakdown not found: ${id}`);
    }
    if (row.consumedAt === null) {
      return;
    }

    await table.put(scratchBreakdownSchema.parse(incrementVersion({ ...row, consumedAt: null })));
  }

  async deleteScratchBreakdown(id: string): Promise<void> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.deleteScratchBreakdown(id));
    }

    const table = this.requireScratchBreakdowns();
    const row = await table.get(id);

    if (!row) {
      return;
    }

    const owner = await this.getRequiredBit(row.scratchBitId);
    await this.write(async () => {
      await table.delete(id);
      await this.database.bits.put(incrementVersion(owner));
    });
  }

  async getChunks(bitId: string): Promise<Chunk[]> {
    const chunks = await this.database.chunks.toArray();
    return sortChunks(chunks.filter((chunk) => chunk.parentId === bitId));
  }

  async createChunk(data: CreateChunk): Promise<Chunk> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.createChunk(data));
    }

    const parsed = createChunkSchema.parse(data);
    const bit = await this.getRequiredBit(parsed.parentId);

    await this.assertChunkTimeFitsBit(bit, parsed.time, parsed.timeAllDay);

    const timestamp = Date.now();
    const chunk = chunkSchema.parse({
      ...parsed,
      id: crypto.randomUUID(),
      status: "incomplete",
    });

    await this.write(async () => {
      await this.database.chunks.put(chunk);
      await this.updateBitCompletionAndCascade(bit.id, timestamp);
    });

    return chunk;
  }

  async updateChunk(
    id: string,
    data: Partial<Chunk>,
    options?: ExtendParentOption,
  ): Promise<void> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.updateChunk(id, data, options));
    }

    const existing = await this.getRequiredChunk(id);
    const parsed = chunkUpdateSchema.parse(data);
    const bit = await this.getRequiredBit(existing.parentId);
    const next = { ...existing, ...parsed };

    // Hook 2: a time past the Bit's deadline fails, unless the caller answered "update the
    // parent too": the Bit then takes the Chunk's time as its deadline, and that must fit the Node.
    const exceedsBit =
      next.time !== null &&
      bit.deadline !== null &&
      isDeadlineAfter(next.time, next.timeAllDay, bit.deadline, bit.deadlineAllDay);
    const extendBit = exceedsBit && options?.extendParent === true;
    if (extendBit) {
      const node = await this.getRequiredNode(bit.parentId);
      if (
        node.deadline !== null &&
        isDeadlineAfter(next.time as number, next.timeAllDay, node.deadline, node.deadlineAllDay)
      ) {
        throw new Error("Chunk time cannot exceed parent node deadline");
      }
    } else {
      await this.assertChunkTimeFitsBit(bit, next.time, next.timeAllDay);
    }

    const timestamp = Date.now();
    // Detect uncheck: complete → incomplete triggers sticky force-complete rule
    const isUnchecking = existing.status === "complete" && next.status === "incomplete";

    await this.write(async () => {
      await this.database.chunks.put(chunkSchema.parse(next));
      if (extendBit) {
        await this.database.bits.put(
          bitSchema.parse(
            incrementVersion({
              ...bit,
              deadline: next.time,
              deadlineAllDay: next.timeAllDay,
              mtime: timestamp,
            }),
          ),
        );
      }
      await this.updateBitCompletionAndCascade(bit.id, timestamp, {
        stickyIfForceCompleted: isUnchecking,
        versionAlreadyBumped: extendBit,
      });
    });
  }

  async reorderChunks(bitId: string, chunkIds: readonly string[]): Promise<void> {
    await this.write(async () => {
      await this.getRequiredBit(bitId);
      const chunks = await this.getChunks(bitId);
      const current = new Set(chunks.map((chunk) => chunk.id));
      if (chunkIds.length !== current.size || new Set(chunkIds).size !== chunkIds.length || !chunkIds.every((chunkId) => current.has(chunkId))) {
        throw new Error("Chunk order must list exactly the Bit's Chunks");
      }
      const byId = new Map(chunks.map((chunk) => [chunk.id, chunk]));
      for (const [index, chunkId] of chunkIds.entries()) {
        const chunk = byId.get(chunkId) as Chunk;
        if (chunk.order !== index) {
          await this.database.chunks.put(chunkSchema.parse({ ...chunk, order: index }));
        }
      }
    });
  }

  async deleteChunk(id: string): Promise<void> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.deleteChunk(id));
    }

    const chunk = await this.getRequiredChunk(id);
    const timestamp = Date.now();

    await this.write(async () => {
      await this.database.chunks.delete(id);
      await this.updateBitCompletionAndCascade(chunk.parentId, timestamp);
    });
  }

  async getActiveGridContents(parentId: string | null): Promise<{ nodes: Node[]; bits: Bit[] }> {
    const [nodes, bits] = await Promise.all([
      this.getNodes(parentId),
      parentId === null ? Promise.resolve([]) : this.getBits(parentId),
    ]);

    const filteredNodes = parentId === null ? nodes.filter((n) => !n.hiddenFromGrid) : nodes;
    return { nodes: filteredNodes, bits };
  }

  async getCalendarItems(): Promise<{ bits: Bit[]; chunks: Chunk[] }> {
    const [bits, chunks] = await Promise.all([
      this.database.bits.toArray(),
      this.database.chunks.toArray(),
    ]);
    const activeBits = bits.filter((bit) => bit.deletedAt === null && bit.archivedAt === null);
    const activeBitIds = new Set(activeBits.map((bit) => bit.id));

    return {
      bits: [...activeBits]
        .filter((bit) => bit.deadline !== null)
        .sort((left, right) => (left.deadline ?? 0) - (right.deadline ?? 0)),
      chunks: [...chunks]
        .filter((chunk) => chunk.time !== null && activeBitIds.has(chunk.parentId))
        .sort((left, right) => (left.time ?? 0) - (right.time ?? 0)),
    };
  }

  async getTrashedItems(): Promise<{ nodes: Node[]; bits: Bit[] }> {
    const [nodes, bits] = await Promise.all([
      this.database.nodes.toArray(),
      this.database.bits.toArray(),
    ]);

    return {
      nodes: nodes.filter((node) => node.deletedAt !== null),
      bits: bits.filter((bit) => bit.deletedAt !== null),
    };
  }

  async getArchivedItems(): Promise<{ nodes: Node[]; bits: Bit[] }> {
    const [nodes, bits] = await Promise.all([
      this.database.nodes.toArray(),
      this.database.bits.toArray(),
    ]);

    return {
      nodes: nodes.filter(
        (node) =>
          node.archivedAt !== null &&
          node.deletedAt === null &&
          node.systemRole === null,
      ),
      bits: bits.filter((bit) => bit.archivedAt !== null && bit.deletedAt === null),
    };
  }

  async searchAll(query: string): Promise<SearchResult[]> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    const [nodes, bits, chunks] = await Promise.all([
      this.database.nodes.toArray(),
      this.database.bits.toArray(),
      this.database.chunks.toArray(),
    ]);
    const activeNodes = nodes.filter(
      (node) => node.deletedAt === null && node.archivedAt === null,
    );
    const activeBits = bits.filter((bit) => bit.deletedAt === null && bit.archivedAt === null);
    const activeBitIds = new Set(activeBits.map((bit) => bit.id));
    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const bitsById = new Map(bits.map((bit) => [bit.id, bit]));
    const results: SearchResult[] = [];

    for (const node of activeNodes) {
      if (node.title.toLowerCase().includes(normalized)) {
        results.push({
          type: "node",
          item: node,
          parentPath: buildNodeTitlePath(node.parentId, nodesById),
        });
      }
    }

    for (const bit of activeBits) {
      if (bit.title.toLowerCase().includes(normalized)) {
        results.push({
          type: "bit",
          item: bit,
          parentPath: buildNodeTitlePath(bit.parentId, nodesById),
          parentNodeId: bit.parentId,
        });
      }
    }

    for (const chunk of chunks) {
      if (!activeBitIds.has(chunk.parentId) || !chunk.title.toLowerCase().includes(normalized)) {
        continue;
      }

      const parentBit = bitsById.get(chunk.parentId);

      results.push({
        type: "chunk",
        item: chunk,
        parentPath: parentBit
          ? [...buildNodeTitlePath(parentBit.parentId, nodesById), parentBit.title]
          : [],
        parentBitId: chunk.parentId,
        grandparentNodeId: parentBit?.parentId,
      });
    }

    return results;
  }

  async getGridOccupancy(parentId: string | null): Promise<Set<string>> {
    const [nodes, bits] = await Promise.all([
      this.database.nodes.toArray(),
      this.database.bits.toArray(),
    ]);
    const occupancy = new Set<string>();

    for (const node of nodes) {
      if (
        node.parentId === parentId &&
        node.deletedAt === null &&
        node.archivedAt === null &&
        !(parentId === null && node.hiddenFromGrid)
      ) {
        occupancy.add(gridKey(node.x, node.y));
      }
    }

    for (const bit of bits) {
      if (bit.parentId === parentId && bit.deletedAt === null && bit.archivedAt === null) {
        occupancy.add(gridKey(bit.x, bit.y));
      }
    }

    return occupancy;
  }

  async getChildDeadlineConflicts(
    nodeId: string,
    deadline: number,
    deadlineAllDay: boolean,
  ): Promise<Bit[]> {
    const bits = await this.database.bits.toArray();
    return bits.filter(
      (bit) =>
        bit.parentId === nodeId &&
        bit.deletedAt === null &&
        bit.archivedAt === null &&
        bit.deadline !== null &&
        isDeadlineAfter(bit.deadline, bit.deadlineAllDay, deadline, deadlineAllDay),
    );
  }

  async runBreadcrumbZoneMigration(
    parentId: string | null,
    blockedCells: Set<string>,
  ): Promise<{ relocated: number }> {
    if (this.database instanceof GridDODatabase && !this.hasAmbientWriteTransaction()) {
      return this.write(() => this.runBreadcrumbZoneMigration(parentId, blockedCells));
    }

    if (!this.database.settings) {
      return { relocated: 0 };
    }

    const markerKey = `bzMigration_${parentKey(parentId)}`;
    const existing = await this.database.settings.get(markerKey);

    if (existing !== undefined) {
      return { relocated: 0 };
    }

    if (blockedCells.size === 0) {
      await this.database.settings.put({ key: markerKey, value: true });
      return { relocated: 0 };
    }

    const [allNodes, allBits] = await Promise.all([
      this.database.nodes.toArray(),
      this.database.bits.toArray(),
    ]);
    const activeNodes = allNodes.filter(
      (node) =>
        node.parentId === parentId &&
        node.deletedAt === null &&
        node.archivedAt === null &&
        !(parentId === null && node.hiddenFromGrid),
    );
    const activeBits = allBits.filter(
      (bit) => bit.parentId === parentId && bit.deletedAt === null && bit.archivedAt === null,
    );
    const overlappingNodes = findItemsInBlockedZone(activeNodes, blockedCells);
    const overlappingBits = findItemsInBlockedZone(activeBits, blockedCells);

    if (overlappingNodes.length === 0 && overlappingBits.length === 0) {
      await this.database.settings.put({ key: markerKey, value: true });
      return { relocated: 0 };
    }

    const overlappingNodeIds = new Set(overlappingNodes.map((node) => node.id));
    const overlappingBitIds = new Set(overlappingBits.map((bit) => bit.id));
    const occupancy = new Set<string>();

    for (const node of activeNodes) {
      if (!overlappingNodeIds.has(node.id)) {
        occupancy.add(gridKey(node.x, node.y));
      }
    }

    for (const bit of activeBits) {
      if (!overlappingBitIds.has(bit.id)) {
        occupancy.add(gridKey(bit.x, bit.y));
      }
    }

    type QueueEntry =
      | { kind: "node"; item: Node }
      | { kind: "bit"; item: Bit };

    const queue: QueueEntry[] = [
      ...overlappingNodes.map((item): QueueEntry => ({ kind: "node", item })),
      ...overlappingBits.map((item): QueueEntry => ({ kind: "bit", item })),
    ].sort((a, b) => a.item.y - b.item.y || a.item.x - b.item.x);

    const relocatedNodes: Node[] = [];
    const relocatedBits: Bit[] = [];

    for (const entry of queue) {
      const cell = findNearestEmptyCell(
        occupancy,
        entry.item.x,
        entry.item.y,
        blockedCells,
      );

      if (!cell) {
        return { relocated: 0 };
      }

      occupancy.add(gridKey(cell.x, cell.y));

      if (process.env.NODE_ENV === "development") {
        console.log(
          `[bzMigration] ${entry.kind} "${entry.item.title}" (${entry.item.x},${entry.item.y}) → (${cell.x},${cell.y})`,
        );
      }

      if (entry.kind === "node") {
        relocatedNodes.push(incrementVersion({ ...entry.item, x: cell.x, y: cell.y }));
      } else {
        relocatedBits.push(incrementVersion({ ...entry.item, x: cell.x, y: cell.y }));
      }
    }

    await this.write(async () => {
      if (relocatedNodes.length > 0) {
        await this.database.nodes.bulkPut(relocatedNodes);
      }
      if (relocatedBits.length > 0) {
        await this.database.bits.bulkPut(relocatedBits);
      }
      await this.database.settings!.put({ key: markerKey, value: true });
    });

    return { relocated: relocatedNodes.length + relocatedBits.length };
  }

  async promoteBitToNode(bitId: string): Promise<Node> {
    const [bit, parentNode, chunks] = await Promise.all([
      this.getRequiredBit(bitId),
      this.database.nodes.toArray(),
      this.getChunks(bitId),
    ]);
    const parent = parentNode.find((node) => node.id === bit.parentId);

    if (!parent) {
      throw new Error(`Parent node not found for bit: ${bitId}`);
    }

    if (parent.systemRole === "inbox") {
      throw new Error("Cannot promote Scratch Bit to Node");
    }

    await this.ensureGridCellAvailable(bit.parentId, bit.x, bit.y, {
      excludedBitIds: new Set([bit.id]),
    });

    const promotedLevel = parent.level + 1;
    if (promotedLevel > 2) {
      throw new Error("Cannot promote Bit to Node — maximum nesting depth reached");
    }

    const timestamp = Date.now();
    const newNode = nodeSchema.parse({
      id: crypto.randomUUID(),
      title: bit.title,
      color: DEFAULT_PROMOTED_NODE_COLOR,
      icon: bit.icon,
      deadline: bit.deadline,
      deadlineAllDay: bit.deadlineAllDay,
      mtime: timestamp,
      createdAt: timestamp,
      version: 1,
      parentId: bit.parentId,
      level: promotedLevel,
      x: bit.x,
      y: bit.y,
      deletedAt: null,
      pastDeadlineDismissed: false,
    });

    const occupancy = new Set<string>();
    const promotedBits = chunks.map((chunk) => {
      const position = findFirstAvailableCell(occupancy);

      if (!position) {
        throw new Error("No grid cells available for promoted chunk bits");
      }

      occupancy.add(gridKey(position.x, position.y));

      return bitSchema.parse({
        id: crypto.randomUUID(),
        title: chunk.title,
        description: chunk.description,
        icon: bit.icon,
        deadline: chunk.time,
        deadlineAllDay: chunk.timeAllDay,
        priority: null,
        status: chunk.status === "complete" ? "complete" : "active",
        mtime: timestamp,
        createdAt: timestamp,
        version: 1,
        parentId: newNode.id,
        x: position.x,
        y: position.y,
        deletedAt: null,
        pastDeadlineDismissed: false,
      });
    });

    await this.write(async () => {
      await this.database.nodes.put(newNode);
      await this.saveBits(promotedBits);
      await this.database.chunks.bulkDelete(chunks.map((chunk) => chunk.id));
      await this.database.bits.delete(bit.id);
      await this.touchNodeIds([parent.id], timestamp);
    });

    return newNode;
  }

  private async deletePlannedAggregate(
    nodeRootIds: ReadonlySet<string>,
    bitRootIds: ReadonlySet<string>,
  ): Promise<AggregateHardDeleteResult> {
    const [nodes, bits, chunks, scratchBreakdowns, stagedCandidates] =
      await Promise.all([
        this.database.nodes.toArray(),
        this.database.bits.toArray(),
        this.database.chunks.toArray(),
        this.database.scratchBreakdowns
          ? this.database.scratchBreakdowns.toArray()
          : Promise.resolve([] as ScratchBreakdown[]),
        this.database.stagedCandidates
          ? this.database.stagedCandidates.toArray()
          : Promise.resolve([] as StagedCandidate[]),
      ]);

    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const bitsById = new Map(bits.map((bit) => [bit.id, bit]));
    const nodeIds = new Set<string>();

    for (const rootId of nodeRootIds) {
      for (const nodeId of collectDescendantNodeIds(rootId, nodes)) {
        nodeIds.add(nodeId);
      }
    }

    const bitIds = new Set<string>(bitRootIds);
    for (const bit of bits) {
      if (nodeIds.has(bit.parentId)) {
        bitIds.add(bit.id);
      }
    }

    const chunkIds = chunks
      .filter((chunk) => bitIds.has(chunk.parentId))
      .map(({ id }) => id);
    const breakdownIds = new Set(
      scratchBreakdowns
        .filter((row) => bitIds.has(row.scratchBitId))
        .map(({ id }) => id),
    );
    const breakdownsById = new Map(
      scratchBreakdowns.map((row) => [row.id, row]),
    );
    const impactedCandidates = stagedCandidates.filter((candidate) => {
      const source = breakdownsById.get(candidate.sourceBreakdownId);
      return (
        bitIds.has(candidate.scratchBitId) ||
        (source !== undefined && breakdownIds.has(source.id))
      );
    });
    const integrityCandidates = impactedCandidates
      .filter((candidate) => {
        const source = breakdownsById.get(candidate.sourceBreakdownId);
        return !source || source.scratchBitId !== candidate.scratchBitId;
      })
      .sort((left, right) => left.id.localeCompare(right.id));

    if (integrityCandidates.length > 0) {
      return {
        status: "integrity_cleanup_required",
        candidates: integrityCandidates,
      };
    }

    const candidateIds = impactedCandidates.map(({ id }) => id);
    const parentNodeIds = new Set<string>();

    for (const rootId of nodeRootIds) {
      const parentId = nodesById.get(rootId)?.parentId;
      if (parentId !== null && parentId !== undefined) {
        parentNodeIds.add(parentId);
      }
    }
    for (const rootId of bitRootIds) {
      const parentId = bitsById.get(rootId)?.parentId;
      if (parentId !== undefined) {
        parentNodeIds.add(parentId);
      }
    }
    for (const deletedNodeId of nodeIds) {
      parentNodeIds.delete(deletedNodeId);
    }

    const timestamp = Date.now();
    const survivingParentNodes = nodes
      .filter((node) => parentNodeIds.has(node.id))
      .map((node) => ({ ...node, mtime: timestamp }));

    if (
      candidateIds.length > 0 &&
      this.database.stagedCandidates !== undefined
    ) {
      await this.database.stagedCandidates.bulkDelete(candidateIds);
      this.emitTransactionCheckpoint(
        "aggregate-delete.after.stagedCandidates",
      );
    }
    if (
      breakdownIds.size > 0 &&
      this.database.scratchBreakdowns !== undefined
    ) {
      await this.database.scratchBreakdowns.bulkDelete([...breakdownIds]);
      this.emitTransactionCheckpoint(
        "aggregate-delete.after.scratchBreakdowns",
      );
    }
    if (chunkIds.length > 0) {
      await this.database.chunks.bulkDelete(chunkIds);
      this.emitTransactionCheckpoint("aggregate-delete.after.chunks");
    }
    if (bitIds.size > 0) {
      await this.database.bits.bulkDelete([...bitIds]);
      this.emitTransactionCheckpoint("aggregate-delete.after.bits");
    }
    if (nodeIds.size > 0) {
      await this.database.nodes.bulkDelete([...nodeIds]);
      this.emitTransactionCheckpoint("aggregate-delete.after.nodes");
    }
    if (survivingParentNodes.length > 0) {
      await this.database.nodes.bulkPut(survivingParentNodes);
      this.emitTransactionCheckpoint("aggregate-delete.after.parentNodes");
    }

    return { status: "deleted" };
  }

  private async write<T>(scope: () => Promise<T>): Promise<T> {
    if (this.database instanceof GridDODatabase) {
      if (this.hasAmbientWriteTransaction()) {
        return scope();
      }

      return this.database.transaction(
        "rw",
        [
          this.database.nodes,
          this.database.bits,
          this.database.chunks,
          this.database.settings,
          this.database.scratchBreakdowns,
          this.database.stagedCandidates,
          this.database.candidateOrphanAuditEvents,
        ],
        scope,
      );
    }

    return scope();
  }

  private async readInboxBreakdownSnapshot<T>(
    scope: () => Promise<T>,
  ): Promise<T> {
    if (!(this.database instanceof GridDODatabase)) {
      return scope();
    }
    if (this.hasAmbientDatabaseTransaction()) {
      return scope();
    }

    return this.database.transaction(
      "r",
      [
        this.database.nodes,
        this.database.bits,
        this.database.scratchBreakdowns,
        this.database.stagedCandidates,
      ],
      scope,
    );
  }

  private async readConfirmedCandidateOrphanSnapshot<T>(
    scope: () => Promise<T>,
  ): Promise<T> {
    if (!(this.database instanceof GridDODatabase)) {
      return scope();
    }
    if (this.hasAmbientDatabaseTransaction()) {
      return scope();
    }

    return this.database.transaction(
      "r",
      [
        this.database.scratchBreakdowns,
        this.database.stagedCandidates,
        this.database.candidateOrphanAuditEvents,
      ],
      scope,
    );
  }

  /** @internal Narrow test seam for proving named rollback checkpoints. */
  protected async runTransactionCheckpointProbe<T>(
    scope: (checkpoint: IndexedDBTransactionCheckpointHook) => Promise<T>,
  ): Promise<T> {
    return this.write(async () =>
      scope((name) => this.emitTransactionCheckpoint(name)),
    );
  }

  private emitTransactionCheckpoint(name: string): undefined {
    if (!this.onTransactionCheckpoint) {
      return undefined;
    }
    if (
      !(this.database instanceof GridDODatabase) ||
      !this.hasAmbientWriteTransaction()
    ) {
      throw new Error(
        `IndexedDB transaction checkpoint reached outside a real rw transaction: ${name}`,
      );
    }
    this.onTransactionCheckpoint(name);
    return undefined;
  }

  private hasAmbientWriteTransaction(): boolean {
    return (
      this.database instanceof GridDODatabase &&
      Dexie.currentTransaction?.db === this.database &&
      Dexie.currentTransaction.mode === "readwrite"
    );
  }

  private hasAmbientDatabaseTransaction(): boolean {
    return (
      this.database instanceof GridDODatabase &&
      Dexie.currentTransaction?.db === this.database
    );
  }

  private async getRequiredNode(id: string): Promise<Node> {
    const node = await this.database.nodes.get(id);

    if (!node) {
      throw new Error(`Node not found: ${id}`);
    }

    return node;
  }

  private async getRequiredBit(id: string): Promise<Bit> {
    const bit = await this.database.bits.get(id);

    if (!bit) {
      throw new Error(`Bit not found: ${id}`);
    }

    return bit;
  }

  private async getRequiredChunk(id: string): Promise<Chunk> {
    const chunk = await this.database.chunks.get(id);

    if (!chunk) {
      throw new Error(`Chunk not found: ${id}`);
    }

    return chunk;
  }

  private requireScratchBreakdowns(): TableLike<ScratchBreakdown> {
    if (!this.database.scratchBreakdowns) {
      throw new Error("scratchBreakdowns store not available");
    }

    return this.database.scratchBreakdowns;
  }

  private requireStagedCandidates(): TableLike<StagedCandidate> {
    if (!this.database.stagedCandidates) {
      throw new Error("stagedCandidates store not available");
    }

    return this.database.stagedCandidates;
  }

  private requireCandidateOrphanAuditEvents(): TableLike<CandidateOrphanAuditEvent> {
    if (!this.database.candidateOrphanAuditEvents) {
      throw new Error("candidateOrphanAuditEvents store not available");
    }

    return this.database.candidateOrphanAuditEvents;
  }

  private async readConfirmedCandidateOrphanState(
    command: ConfirmedCandidateOrphanCleanupCommand,
  ): Promise<ConfirmedCandidateOrphanState> {
    const candidates = this.requireStagedCandidates();
    const breakdowns = this.requireScratchBreakdowns();
    const audits = this.requireCandidateOrphanAuditEvents();
    const [candidate, source, auditById, auditByCandidate] = await Promise.all([
      candidates.get(command.candidateId),
      breakdowns.get(command.sourceBreakdownId),
      audits.get(command.auditEventId),
      this.findCandidateOrphanAuditByCandidate(
        audits,
        command.candidateId,
      ),
    ]);

    return {
      candidate,
      source,
      auditById,
      auditByCandidate,
      authoritativeAudit: auditByCandidate ?? auditById,
    };
  }

  private async findCandidateOrphanAuditByCandidate(
    audits: TableLike<CandidateOrphanAuditEvent>,
    candidateId: string,
  ): Promise<CandidateOrphanAuditEvent | undefined> {
    if (this.database instanceof GridDODatabase) {
      return this.database.candidateOrphanAuditEvents
        .where("candidateId")
        .equals(candidateId)
        .first();
    }

    const auditRows = await audits.toArray();
    return auditRows.find((event) => event.candidateId === candidateId);
  }

  private async findCandidateBySource(
    sourceBreakdownId: string,
  ): Promise<StagedCandidate | undefined> {
    const candidates = await this.requireStagedCandidates().toArray();
    return candidates.find(
      (candidate) => candidate.sourceBreakdownId === sourceBreakdownId,
    );
  }

  private async isActiveInboxScratch(
    scratch: Bit | undefined,
  ): Promise<boolean> {
    if (
      !scratch ||
      scratch.deletedAt !== null ||
      scratch.archivedAt !== null
    ) {
      return false;
    }

    const parent = await this.database.nodes.get(scratch.parentId);
    return (
      parent?.systemRole === "inbox" &&
      parent.deletedAt === null &&
      parent.archivedAt === null
    );
  }

  private async readTrashScratchState(
    command: z.infer<typeof trashScratchCommandSchema>,
  ): Promise<TrashScratchState> {
    const breakdowns = this.requireScratchBreakdowns();
    const candidates = this.requireStagedCandidates();
    const [scratch, nodes, allCandidates, allBreakdowns] = await Promise.all([
      this.database.bits.get(command.scratchBitId),
      this.database.nodes.toArray(),
      candidates.toArray(),
      breakdowns.toArray(),
    ]);
    const owner = scratch
      ? nodes.find((node) => node.id === scratch.parentId)
      : undefined;
    const current = allCandidates.filter(
      (candidate) => candidate.scratchBitId === command.scratchBitId,
    );
    const wanted = new Set([
      ...current.map((candidate) => candidate.sourceBreakdownId),
      ...command.candidates.map((candidate) => candidate.sourceBreakdownId),
    ]);

    return {
      scratch,
      ownerIsInbox: owner?.systemRole === "inbox",
      ownerIsActive:
        owner?.systemRole === "inbox" &&
        owner.deletedAt === null &&
        owner.archivedAt === null,
      candidates: current,
      sources: new Map(
        allBreakdowns
          .filter((row) => wanted.has(row.id))
          .map((row) => [row.id, row] as const),
      ),
    };
  }

  private async readScratchArchiveState(
    scratchBitId: string,
  ): Promise<ScratchArchiveState> {
    const breakdowns = this.requireScratchBreakdowns();
    const candidates = this.requireStagedCandidates();
    const [scratch, nodes, allBreakdowns, allCandidates] = await Promise.all([
      this.database.bits.get(scratchBitId),
      this.database.nodes.toArray(),
      breakdowns.toArray(),
      candidates.toArray(),
    ]);
    const scratchBreakdowns = allBreakdowns.filter(
      (breakdown) => breakdown.scratchBitId === scratchBitId,
    );
    const consumedCount = scratchBreakdowns.filter(
      (breakdown) => breakdown.consumedAt !== null,
    ).length;
    const unconsumedCount = scratchBreakdowns.length - consumedCount;
    const stagedCandidateCount = allCandidates.filter(
      (candidate) =>
        candidate.scratchBitId === scratchBitId && candidate.lifecycle === "staged",
    ).length;
    const parent = scratch
      ? nodes.find((node) => node.id === scratch.parentId)
      : undefined;
    const activeInboxOwner =
      parent?.systemRole === "inbox" &&
      parent.deletedAt === null &&
      parent.archivedAt === null;
    const activeInboxScratch =
      scratch !== undefined &&
      scratch.deletedAt === null &&
      scratch.archivedAt === null &&
      activeInboxOwner;

    return {
      eligibility: {
        eligible:
          activeInboxScratch &&
          consumedCount >= 1 &&
          unconsumedCount === 0 &&
          stagedCandidateCount === 0,
        scratch: scratch ?? null,
        consumedCount,
        unconsumedCount,
        stagedCandidateCount,
      },
      activeInboxOwner,
    };
  }

  private async readPlacementState(
    command: PlacementCommandBase & Partial<Pick<StagedPlacementCommand, "candidateId">>,
  ): Promise<PlacementState> {
    const breakdowns = this.requireScratchBreakdowns();
    const candidates = this.requireStagedCandidates();
    const [resultNode, resultBit, source, candidate, scratch, nodes, bits, allCandidates] =
      await Promise.all([
        this.database.nodes.get(command.resultId),
        this.database.bits.get(command.resultId),
        breakdowns.get(command.sourceBreakdownId),
        command.candidateId ? candidates.get(command.candidateId) : Promise.resolve(undefined),
        this.database.bits.get(command.scratchBitId),
        this.database.nodes.toArray(),
        this.database.bits.toArray(),
        candidates.toArray(),
      ]);

    return {
      resultNode,
      resultBit,
      source,
      candidate,
      sourceCandidate: allCandidates.find(
        (item) => item.sourceBreakdownId === command.sourceBreakdownId,
      ),
      scratch,
      nodes,
      bits,
    };
  }

  private async readPlacementUndoState(
    command: DirectPlacementUndoCommand | StagedPlacementUndoCommand,
  ): Promise<PlacementUndoState> {
    const breakdowns = this.requireScratchBreakdowns();
    const candidates = this.requireStagedCandidates();
    const candidateId = "candidateSnapshot" in command
      ? command.candidateSnapshot.id
      : undefined;
    const [resultNode, resultBit, source, candidate, nodes, bits, allCandidates] =
      await Promise.all([
        this.database.nodes.get(command.resultSnapshot.id),
        this.database.bits.get(command.resultSnapshot.id),
        breakdowns.get(command.sourceSnapshot.id),
        candidateId ? candidates.get(candidateId) : Promise.resolve(undefined),
        this.database.nodes.toArray(),
        this.database.bits.toArray(),
        candidates.toArray(),
      ]);

    const owner = bits.find(({ id }) => id === command.sourceSnapshot.scratchBitId);
    const ownerParent = owner
      ? nodes.find(({ id }) => id === owner.parentId)
      : undefined;

    return {
      resultNode,
      resultBit,
      source,
      candidate,
      sourceCandidate: allCandidates.find(
        (item) => item.sourceBreakdownId === command.sourceSnapshot.id,
      ),
      nodes,
      bits,
      ownerIsActive:
        owner !== undefined &&
        owner.deletedAt === null &&
        owner.archivedAt === null &&
        ownerParent?.systemRole === "inbox" &&
        ownerParent.deletedAt === null &&
        ownerParent.archivedAt === null,
    };
  }

  private validatePlacementPrecondition(
    command: PlacementCommandBase & Partial<Pick<StagedPlacementCommand, "candidateId" | "candidateExpectedVersion">>,
    state: PlacementState,
    staged: boolean,
  ): "valid" | "rejected" | "conflict" {
    if (state.resultNode || state.resultBit) return "conflict";

    const scratchParent = state.scratch
      ? state.nodes.find(({ id }) => id === state.scratch!.parentId)
      : undefined;
    const scratchIsActive =
      state.scratch !== undefined &&
      state.scratch.deletedAt === null &&
      state.scratch.archivedAt === null &&
      scratchParent?.systemRole === "inbox" &&
      scratchParent.deletedAt === null &&
      scratchParent.archivedAt === null;
    if (
      !scratchIsActive ||
      !state.source ||
      state.source.scratchBitId !== command.scratchBitId ||
      state.source.consumedAt !== null
    ) {
      return "rejected";
    }
    if (state.source.version !== command.sourceExpectedVersion) return "conflict";

    if (staged) {
      if (
        !command.candidateId ||
        !state.candidate ||
        state.sourceCandidate?.id !== command.candidateId ||
        state.candidate.sourceBreakdownId !== command.sourceBreakdownId ||
        state.candidate.scratchBitId !== command.scratchBitId ||
        state.candidate.lifecycle !== "staged" ||
        state.candidate.resultType !== command.resultType
      ) {
        return "conflict";
      }
      if (state.candidate.version !== command.candidateExpectedVersion) return "conflict";
    } else {
      if (state.sourceCandidate) return "rejected";
      if (command.title !== state.source.content) return "rejected";
    }

    if (!placementTitleIsValid(command.resultType, command.title)) return "rejected";
    if (!targetIsValid(command, state.nodes)) return "rejected";
    if (
      command.x < 0 ||
      command.x >= GRID_COLS ||
      command.y < 0 ||
      command.y >= GRID_ROWS ||
      placementCellIsOccupied(command, state)
    ) {
      return "rejected";
    }

    return "valid";
  }

  private putPlacementResult(result: Node | Bit): Promise<unknown> {
    if ("level" in result) {
      return this.database.nodes.put(nodeSchema.parse(result));
    }
    return this.database.bits.put(bitSchema.parse(result));
  }

  private async saveNodes(nodes: Node[]): Promise<void> {
    if (nodes.length > 0) {
      await this.database.nodes.bulkPut(nodes);
    }
  }

  private async saveBits(bits: Bit[]): Promise<void> {
    if (bits.length > 0) {
      await this.database.bits.bulkPut(bits);
    }
  }

  private async touchNodeIds(nodeIds: string[], timestamp: number): Promise<void> {
    if (nodeIds.length === 0) {
      return;
    }

    const ids = new Set(nodeIds);
    const nodes = await this.database.nodes.toArray();
    const updated = nodes
      .filter((node) => ids.has(node.id))
      .map((node) => ({
        ...node,
        mtime: timestamp,
      }));

    await this.saveNodes(updated);
  }

  private async assertBitDeadlineFitsParent(
    parentId: string,
    deadline: number | null,
    deadlineAllDay: boolean,
    bitId?: string,
  ): Promise<void> {
    const parent = await this.getRequiredNode(parentId);
    if (
      deadline !== null &&
      parent.deadline !== null &&
      isDeadlineAfter(deadline, deadlineAllDay, parent.deadline, parent.deadlineAllDay)
    ) {
      throw new DeadlineConflictError("child_exceeds_parent", bitId ? [bitId] : []);
    }
  }

  private async assertNodeDeadlineFitsParent(
    parentId: string,
    deadline: number | null,
    deadlineAllDay: boolean,
  ): Promise<void> {
    const parent = await this.getRequiredNode(parentId);
    if (
      deadline !== null &&
      parent.deadline !== null &&
      isDeadlineAfter(deadline, deadlineAllDay, parent.deadline, parent.deadlineAllDay)
    ) {
      throw new DeadlineConflictError("child_exceeds_parent", []);
    }
  }

  private async assertChunkTimeFitsBit(
    bit: Bit,
    time: number | null,
    timeAllDay: boolean,
  ): Promise<void> {
    if (
      time !== null &&
      bit.deadline !== null &&
      isDeadlineAfter(time, timeAllDay, bit.deadline, bit.deadlineAllDay)
    ) {
      throw new Error("Chunk time cannot exceed parent bit deadline");
    }
  }

  private async ensureGridCellAvailable(
    parentId: string | null,
    x: number,
    y: number,
    options?: {
      excludedNodeIds?: Set<string>;
      excludedBitIds?: Set<string>;
    },
  ): Promise<void> {
    // Hook 8: Inbox Scratch Bits use the (0,0) sentinel and are uniqueness-exempt.
    if (x === 0 && y === 0 && parentId !== null) {
      const parentNode = await this.database.nodes.get(parentId);
      if (parentNode?.systemRole === "inbox") {
        return;
      }
    }

    const [nodes, bits] = await Promise.all([
      this.database.nodes.toArray(),
      this.database.bits.toArray(),
    ]);

    const occupiedByNode = nodes.some(
      (node) =>
        node.parentId === parentId &&
        node.deletedAt === null &&
        node.archivedAt === null &&
        !(parentId === null && node.hiddenFromGrid) &&
        node.x === x &&
        node.y === y &&
        !(options?.excludedNodeIds?.has(node.id) ?? false),
    );
    const occupiedByBit = bits.some(
      (bit) =>
        bit.parentId === parentId &&
        bit.deletedAt === null &&
        bit.archivedAt === null &&
        bit.x === x &&
        bit.y === y &&
        !(options?.excludedBitIds?.has(bit.id) ?? false),
    );

    if (occupiedByNode || occupiedByBit) {
      throw new Error(`Grid cell ${gridKey(x, y)} is already occupied`);
    }
  }

  private async collectNodeSubtree(id: string): Promise<{ nodes: Node[]; bits: Bit[] }> {
    const [allNodes, allBits] = await Promise.all([
      this.database.nodes.toArray(),
      this.database.bits.toArray(),
    ]);
    const nodeIds = collectDescendantNodeIds(id, allNodes);
    const nodeIdSet = new Set(nodeIds);

    return {
      nodes: nodeIds
        .map((nodeId) => allNodes.find((node) => node.id === nodeId))
        .filter(isDefined),
      bits: allBits.filter((bit) => nodeIdSet.has(bit.parentId)),
    };
  }

  private async updateBitCompletionAndCascade(
    bitId: string,
    timestamp: number,
    options?: {
      /**
       * When true, applies the sticky force-complete rule:
       * only revert a complete Bit to active if it was auto-completed
       * (i.e. exactly one chunk is now incomplete — the one just unchecked).
       * If 2+ chunks are incomplete, the Bit was force-completed → keep complete.
       */
      stickyIfForceCompleted?: boolean;
      /** The caller already counted this call's version bump on the Bit (a deadline extension). */
      versionAlreadyBumped?: boolean;
    },
  ): Promise<void> {
    const [bit, chunks] = await Promise.all([
      this.getRequiredBit(bitId),
      this.getChunks(bitId),
    ]);

    const allComplete = chunks.length > 0 && chunks.every((c) => c.status === "complete");
    let nextStatus: "active" | "complete";

    if (allComplete) {
      nextStatus = "complete";
    } else if (options?.stickyIfForceCompleted && bit.status === "complete") {
      // Sticky rule: if only 1 chunk is now incomplete, the bit was auto-completed → revert.
      // If 2+ incomplete, the bit was force-completed → remain complete.
      const incompleteCount = chunks.filter((c) => c.status === "incomplete").length;
      nextStatus = incompleteCount <= 1 ? "active" : "complete";
    } else {
      nextStatus = "active";
    }

    const nextBit = {
      ...bit,
      status: nextStatus,
      mtime: timestamp,
    };
    await this.database.bits.put(
      nextStatus === bit.status || options?.versionAlreadyBumped ? nextBit : incrementVersion(nextBit),
    );
    await this.touchNodeIds([bit.parentId], timestamp);
  }
}

function matchesAddBreakdownPostcondition(
  command: AddBreakdownCommand,
  breakdown: ScratchBreakdown | undefined,
  scratch: Bit | undefined,
  scratchIsActive: boolean,
): boolean {
  return (
    scratchIsActive &&
    breakdown?.id === command.breakdownId &&
    breakdown.scratchBitId === command.scratchBitId &&
    breakdown.content === command.content &&
    breakdown.consumedAt === null &&
    breakdown.version === 1 &&
    scratch?.version === command.scratchExpectedVersion + 1
  );
}

function matchesSaveScratchTitlePostcondition(
  command: SaveScratchTitleCommand,
  scratch: Bit | undefined,
  scratchIsActive: boolean,
): boolean {
  return (
    scratchIsActive &&
    scratch?.title === command.title &&
    scratch.version === command.expectedVersion + 1
  );
}

function matchesSaveBreakdownPrecondition(
  command: SaveBreakdownCommand,
  breakdown: ScratchBreakdown | undefined,
  candidate: StagedCandidate | undefined,
  scratchIsActive: boolean,
): boolean {
  return (
    scratchIsActive &&
    candidate === undefined &&
    breakdown?.consumedAt === null &&
    breakdown.version === command.expectedVersion &&
    breakdown.content === command.baseContent &&
    breakdown.order === command.baseOrder
  );
}

function matchesSaveBreakdownPostcondition(
  command: SaveBreakdownCommand,
  breakdown: ScratchBreakdown | undefined,
  candidate: StagedCandidate | undefined,
  scratchIsActive: boolean,
): boolean {
  return (
    scratchIsActive &&
    candidate === undefined &&
    breakdown?.consumedAt === null &&
    breakdown.version === command.expectedVersion + 1 &&
    breakdown.content === command.content &&
    breakdown.order === command.order
  );
}

function matchesDeleteBreakdownPrecondition(
  command: DeleteBreakdownCommand,
  breakdown: ScratchBreakdown | undefined,
  candidate: StagedCandidate | undefined,
  scratch: Bit | undefined,
  scratchIsActive: boolean,
): boolean {
  return (
    scratchIsActive &&
    candidate === undefined &&
    breakdown?.scratchBitId === command.scratchBitId &&
    breakdown.consumedAt === null &&
    breakdown.version === command.expectedVersion &&
    scratch?.version === command.scratchExpectedVersion
  );
}

function matchesDeleteBreakdownPostcondition(
  command: DeleteBreakdownCommand,
  breakdown: ScratchBreakdown | undefined,
  candidate: StagedCandidate | undefined,
  scratch: Bit | undefined,
  scratchIsActive: boolean,
): boolean {
  return (
    scratchIsActive &&
    breakdown === undefined &&
    candidate === undefined &&
    scratch?.version === command.scratchExpectedVersion + 1
  );
}

function matchesStageCandidatePrecondition(
  command: StageCandidateCommand,
  candidate: StagedCandidate | undefined,
  sourceCandidate: StagedCandidate | undefined,
  source: ScratchBreakdown | undefined,
  scratch: Bit | undefined,
  scratchIsActive: boolean,
): boolean {
  return (
    scratchIsActive &&
    candidate === undefined &&
    sourceCandidate === undefined &&
    source?.id === command.sourceBreakdownId &&
    source.scratchBitId === command.scratchBitId &&
    source.consumedAt === null &&
    source.version === command.sourceExpectedVersion &&
    scratch?.id === command.scratchBitId
  );
}

function matchesStageCandidatePostcondition(
  command: StageCandidateCommand,
  candidate: StagedCandidate | undefined,
  sourceCandidate: StagedCandidate | undefined,
  source: ScratchBreakdown | undefined,
  scratch: Bit | undefined,
  scratchIsActive: boolean,
): boolean {
  return (
    scratchIsActive &&
    candidate?.id === command.candidateId &&
    sourceCandidate?.id === command.candidateId &&
    candidate.scratchBitId === command.scratchBitId &&
    candidate.sourceBreakdownId === command.sourceBreakdownId &&
    candidate.resultType === command.resultType &&
    candidate.lifecycle === "staged" &&
    candidate.version === 1 &&
    candidate.createdAt === candidate.updatedAt &&
    source?.id === command.sourceBreakdownId &&
    source.scratchBitId === command.scratchBitId &&
    source.consumedAt === null &&
    source.version === command.sourceExpectedVersion + 1 &&
    scratch?.id === command.scratchBitId
  );
}

function matchesUnstageCandidatePrecondition(
  command: UnstageCandidateCommand,
  candidate: StagedCandidate | undefined,
  sourceCandidate: StagedCandidate | undefined,
  source: ScratchBreakdown | undefined,
): boolean {
  return (
    candidate?.id === command.candidateId &&
    sourceCandidate?.id === command.candidateId &&
    candidate.sourceBreakdownId === command.sourceBreakdownId &&
    candidate.lifecycle === "staged" &&
    candidate.version === command.candidateExpectedVersion &&
    source?.id === command.sourceBreakdownId &&
    source.scratchBitId === candidate.scratchBitId &&
    source.consumedAt === null &&
    source.version === command.sourceExpectedVersion
  );
}

function matchesUnstageCandidatePostcondition(
  command: UnstageCandidateCommand,
  candidate: StagedCandidate | undefined,
  sourceCandidate: StagedCandidate | undefined,
  source: ScratchBreakdown | undefined,
): boolean {
  return (
    candidate === undefined &&
    sourceCandidate === undefined &&
    source?.id === command.sourceBreakdownId &&
    source.consumedAt === null &&
    source.version === command.sourceExpectedVersion + 1
  );
}

function matchesConfirmedCandidateOrphanPrecondition(
  command: ConfirmedCandidateOrphanCleanupCommand,
  state: ConfirmedCandidateOrphanState,
): boolean {
  return (
    command.proof.status === "confirmed" &&
    command.proof.sourceBreakdownId === command.sourceBreakdownId &&
    state.source === undefined &&
    state.auditById === undefined &&
    state.auditByCandidate === undefined &&
    state.candidate?.id === command.candidateId &&
    state.candidate.version === command.candidateExpectedVersion &&
    state.candidate.sourceBreakdownId === command.sourceBreakdownId &&
    state.candidate.scratchBitId === command.scratchBitId &&
    state.candidate.resultType === command.resultType &&
    state.candidate.lifecycle === "staged"
  );
}

function matchesConfirmedCandidateOrphanPostcondition(
  command: ConfirmedCandidateOrphanCleanupCommand,
  state: ConfirmedCandidateOrphanState,
): boolean {
  return (
    command.proof.status === "confirmed" &&
    command.proof.sourceBreakdownId === command.sourceBreakdownId &&
    state.candidate === undefined &&
    matchesCandidateOrphanAuditEvent(command, state.auditById) &&
    state.auditByCandidate?.id === state.auditById?.id
  );
}

function matchesCandidateOrphanAuditEvent(
  command: ConfirmedCandidateOrphanCleanupCommand,
  event: CandidateOrphanAuditEvent | undefined,
): boolean {
  return (
    command.proof.status === "confirmed" &&
    event?.id === command.auditEventId &&
    event.cause === command.proof.cause &&
    event.candidateId === command.candidateId &&
    event.sourceBreakdownId === command.sourceBreakdownId &&
    event.scratchBitId === command.scratchBitId
  );
}

function matchesTrashScratchPrecondition(
  command: z.infer<typeof trashScratchCommandSchema>,
  state: TrashScratchState,
): boolean {
  const { scratch } = state;
  if (
    !scratch ||
    !state.ownerIsActive ||
    scratch.deletedAt !== null ||
    scratch.archivedAt !== null ||
    scratch.version !== command.expectedVersion ||
    state.candidates.length !== command.candidates.length
  ) {
    return false;
  }

  return command.candidates.every((item) => {
    const candidate = state.candidates.find(({ id }) => id === item.candidateId);
    const source = state.sources.get(item.sourceBreakdownId);
    return (
      candidate !== undefined &&
      candidate.version === item.candidateExpectedVersion &&
      candidate.sourceBreakdownId === item.sourceBreakdownId &&
      source !== undefined &&
      source.scratchBitId === command.scratchBitId &&
      source.consumedAt === null &&
      source.version === item.sourceExpectedVersion
    );
  });
}

function matchesTrashScratchPostcondition(
  command: z.infer<typeof trashScratchCommandSchema>,
  state: TrashScratchState,
): boolean {
  const { scratch } = state;
  if (
    !scratch ||
    !state.ownerIsInbox ||
    scratch.deletedAt === null ||
    scratch.archivedAt !== null ||
    scratch.version !== command.expectedVersion + 1
  ) {
    return false;
  }

  return command.candidates.every((item) => {
    const source = state.sources.get(item.sourceBreakdownId);
    return (
      !state.candidates.some(({ id }) => id === item.candidateId) &&
      source !== undefined &&
      source.consumedAt === null &&
      source.version === item.sourceExpectedVersion + 1
    );
  });
}

function placementUndoStateResult(state: PlacementUndoState): Node | Bit | null {
  return state.resultNode ?? state.resultBit ?? null;
}

function matchesPlacementUndoPrecondition(
  command: DirectPlacementUndoCommand | StagedPlacementUndoCommand,
  state: PlacementUndoState,
  staged: boolean,
): boolean {
  const result = placementUndoStateResult(state);
  if (
    !result ||
    ("level" in command.resultSnapshot ? state.resultBit !== undefined : state.resultNode !== undefined) ||
    !sameFlatRecord(result, command.resultSnapshot) ||
    !validPlacementUndoSnapshots(command, staged) ||
    !state.source ||
    !sameFlatRecord(state.source, command.sourceSnapshot) ||
    placementUndoHasDependencies(command.resultSnapshot.id, state)
  ) {
    return false;
  }

  if (
    command.resultSnapshot.parentId !== null &&
    !state.nodes.some(({ id }) => id === command.resultSnapshot.parentId)
  ) {
    return false;
  }

  if (staged) {
    return (
      "candidateSnapshot" in command &&
      state.candidate === undefined &&
      state.sourceCandidate === undefined
    );
  }
  return state.sourceCandidate === undefined;
}

function matchesPlacementUndoPostcondition(
  command: DirectPlacementUndoCommand | StagedPlacementUndoCommand,
  state: PlacementUndoState,
  staged: boolean,
): boolean {
  if (
    state.resultNode !== undefined ||
    state.resultBit !== undefined ||
    placementUndoHasDependencies(command.resultSnapshot.id, state) ||
    !state.source ||
    !sameFlatRecord(state.source, {
      ...command.sourceSnapshot,
      consumedAt: null,
      version: command.sourceSnapshot.version + 1,
    })
  ) {
    return false;
  }

  if (!staged) return state.sourceCandidate === undefined;
  if (!("candidateSnapshot" in command)) return false;

  const candidate = state.candidate ?? state.sourceCandidate;
  return (
    candidate !== undefined &&
    state.candidate?.id === state.sourceCandidate?.id &&
    candidate.updatedAt >= candidate.createdAt &&
    sameFlatRecord(candidate, {
      ...command.candidateSnapshot,
      updatedAt: candidate.updatedAt,
      version: command.candidateSnapshot.version + 1,
    })
  );
}

function validPlacementUndoSnapshots(
  command: DirectPlacementUndoCommand | StagedPlacementUndoCommand,
  staged: boolean,
): boolean {
  const result = command.resultSnapshot;
  const source = command.sourceSnapshot;
  const isNode = "level" in result;
  if (
    result.version !== 1 ||
    result.createdAt !== result.mtime ||
    result.deletedAt !== null ||
    result.archivedAt !== null ||
    source.consumedAt !== result.createdAt
  ) {
    return false;
  }
  if (isNode && (result.systemRole !== null || result.hiddenFromGrid)) return false;

  if (!staged) return !("candidateSnapshot" in command);
  if (!("candidateSnapshot" in command)) return false;
  const candidate = command.candidateSnapshot;
  return (
    candidate.scratchBitId === source.scratchBitId &&
    candidate.sourceBreakdownId === source.id &&
    candidate.resultType === (isNode ? "node" : "bit") &&
    candidate.lifecycle === "staged"
  );
}

function placementUndoHasDependencies(
  resultId: string,
  state: PlacementUndoState,
): boolean {
  return (
    state.nodes.some(({ parentId }) => parentId === resultId) ||
    state.bits.some(({ parentId }) => parentId === resultId)
  );
}

function sameFlatRecord<T extends object>(actual: T, expected: T): boolean {
  const actualRecord = actual as Record<string, unknown>;
  const expectedRecord = expected as Record<string, unknown>;
  const actualKeys = Object.keys(actualRecord);
  const expectedKeys = Object.keys(expectedRecord);
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every((key) => actualRecord[key] === expectedRecord[key])
  );
}

function placementStateResult(state: PlacementState): Node | Bit | null {
  return state.resultNode ?? state.resultBit ?? null;
}

function matchesStagedPlacementPostcondition(
  command: StagedPlacementCommand,
  state: PlacementState,
): boolean {
  const result = matchingPlacementResult(command, state);
  return (
    result !== undefined &&
    state.source?.id === command.sourceBreakdownId &&
    state.source.scratchBitId === command.scratchBitId &&
    state.source.version === command.sourceExpectedVersion + 1 &&
    state.source.consumedAt === result.createdAt &&
    state.candidate === undefined &&
    state.sourceCandidate === undefined
  );
}

function matchesDirectPlacementPostcondition(
  command: DirectPlacementCommand,
  state: PlacementState,
): boolean {
  const result = matchingPlacementResult(command, state);
  return (
    result !== undefined &&
    state.source?.id === command.sourceBreakdownId &&
    state.source.scratchBitId === command.scratchBitId &&
    state.source.version === command.sourceExpectedVersion + 1 &&
    state.source.consumedAt === result.createdAt &&
    state.sourceCandidate === undefined
  );
}

function matchingPlacementResult(
  command: PlacementCommandBase,
  state: PlacementState,
): Node | Bit | undefined {
  if (command.resultType === "node") {
    const result = state.resultNode;
    if (
      !result ||
      state.resultBit ||
      result.id !== command.resultId ||
      result.title !== command.title ||
      result.parentId !== command.targetParentId ||
      result.x !== command.x ||
      result.y !== command.y ||
      result.version !== 1 ||
      result.pastDeadlineDismissed !== false ||
      result.deletedAt !== null ||
      result.archivedAt !== null ||
      result.systemRole !== null ||
      result.hiddenFromGrid !== false ||
      result.deadline !== null ||
      result.deadlineAllDay !== false ||
      result.color !== "hsl(210, 80%, 55%)" ||
      result.icon !== "Folder" ||
      result.createdAt !== result.mtime
    ) {
      return undefined;
    }
    const expectedLevel = command.expectedAncestorIds.length;
    return result.level === expectedLevel ? result : undefined;
  }

  const result = state.resultBit;
  if (
    !result ||
    state.resultNode ||
    command.targetParentId === null ||
    result.id !== command.resultId ||
    result.title !== command.title ||
    result.parentId !== command.targetParentId ||
    result.x !== command.x ||
    result.y !== command.y ||
    result.version !== 1 ||
    result.pastDeadlineDismissed !== false ||
    result.deletedAt !== null ||
    result.archivedAt !== null ||
    result.description !== "" ||
    result.icon !== "ListTodo" ||
    result.deadline !== null ||
    result.deadlineAllDay !== false ||
    result.priority !== null ||
    result.status !== "active" ||
    result.createdAt !== result.mtime
  ) {
    return undefined;
  }
  return result;
}

function createPlacementResult(
  command: PlacementCommandBase,
  state: PlacementState,
  timestamp: number,
): Node | Bit {
  if (command.resultType === "node") {
    const parentLevel = command.targetParentId === null
      ? -1
      : state.nodes.find(({ id }) => id === command.targetParentId)!.level;
    return nodeSchema.parse({
      id: command.resultId,
      title: command.title,
      color: "hsl(210, 80%, 55%)",
      icon: "Folder",
      deadline: null,
      deadlineAllDay: false,
      mtime: timestamp,
      createdAt: timestamp,
      version: 1,
      parentId: command.targetParentId,
      level: parentLevel + 1,
      x: command.x,
      y: command.y,
      deletedAt: null,
      archivedAt: null,
      systemRole: null,
      hiddenFromGrid: false,
      pastDeadlineDismissed: false,
    });
  }

  return bitSchema.parse({
    id: command.resultId,
    title: command.title,
    description: "",
    icon: "ListTodo",
    deadline: null,
    deadlineAllDay: false,
    priority: null,
    status: "active",
    mtime: timestamp,
    createdAt: timestamp,
    version: 1,
    parentId: command.targetParentId,
    x: command.x,
    y: command.y,
    deletedAt: null,
    archivedAt: null,
    pastDeadlineDismissed: false,
  });
}

function placementTitleIsValid(type: "node" | "bit", title: string): boolean {
  return title.length >= 1 && title.length <= (type === "node" ? 100 : 200);
}

function targetIsValid(command: PlacementCommandBase, nodes: Node[]): boolean {
  if (command.targetParentId === null) {
    return command.resultType === "node" && command.expectedAncestorIds.length === 0;
  }

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const target = nodesById.get(command.targetParentId);
  if (!target || target.systemRole !== null) return false;

  const ancestorIds: string[] = [];
  const visited = new Set<string>();
  let current: Node | undefined = target;
  while (current) {
    if (
      visited.has(current.id) ||
      current.deletedAt !== null ||
      current.archivedAt !== null ||
      current.systemRole !== null ||
      current.hiddenFromGrid
    ) {
      return false;
    }
    visited.add(current.id);
    ancestorIds.unshift(current.id);
    if (current.parentId === null) break;
    const parent = nodesById.get(current.parentId);
    if (!parent) return false;
    current = parent;
  }

  if (
    ancestorIds.length !== command.expectedAncestorIds.length ||
    ancestorIds.some((id, index) => id !== command.expectedAncestorIds[index])
  ) {
    return false;
  }
  const chainIsConsistent = ancestorIds.every(
    (id, index) => nodesById.get(id)?.level === index,
  );
  if (!chainIsConsistent) return false;

  return command.resultType === "bit" || target.level < 2;
}

function placementCellIsOccupied(
  command: PlacementCommandBase,
  state: PlacementState,
): boolean {
  return (
    state.nodes.some(
      (node) =>
        node.parentId === command.targetParentId &&
        node.deletedAt === null &&
        node.archivedAt === null &&
        !(command.targetParentId === null && node.hiddenFromGrid) &&
        node.x === command.x &&
        node.y === command.y,
    ) ||
    state.bits.some(
      (bit) =>
        bit.parentId === command.targetParentId &&
        bit.deletedAt === null &&
        bit.archivedAt === null &&
        bit.x === command.x &&
        bit.y === command.y,
    )
  );
}

function touchesNodeMtime(update: Partial<MutableNodeInput>): boolean {
  return Object.keys(update).some((key) => !["parentId", "x", "y"].includes(key));
}

function touchesBitMtime(update: Partial<MutableBitInput>): boolean {
  return Object.keys(update).some((key) => !["parentId", "x", "y"].includes(key));
}

function recordDelta<T extends object>(record: T, update: Partial<T>): Partial<T> {
  const delta: Partial<T> = {};

  for (const key of Object.keys(update) as Array<keyof T>) {
    if (!Object.is(record[key], update[key])) {
      delta[key] = update[key];
    }
  }

  return delta;
}

function incrementVersion<T extends { version: number }>(record: T): T {
  return { ...record, version: record.version + 1 };
}

function gridKey(x: number, y: number): string {
  return `${x},${y}`;
}

function parentKey(parentId: string | null): string {
  return parentId ?? ROOT_PARENT_KEY;
}

function buildOccupiedByParent(
  nodes: Node[],
  bits: Bit[],
): Map<string, Set<string>> {
  const occupiedByParent = new Map<string, Set<string>>();

  for (const node of nodes) {
    addOccupiedCell(occupiedByParent, node.parentId, node.x, node.y);
  }

  for (const bit of bits) {
    addOccupiedCell(occupiedByParent, bit.parentId, bit.x, bit.y);
  }

  return occupiedByParent;
}

function addOccupiedCell(
  occupiedByParent: Map<string, Set<string>>,
  parentId: string | null,
  x: number,
  y: number,
): void {
  const key = parentKey(parentId);
  const occupied = occupiedByParent.get(key) ?? new Set<string>();
  occupied.add(gridKey(x, y));
  occupiedByParent.set(key, occupied);
}

function placeRestoredGridItem<T extends { parentId: string | null; x: number; y: number }>(
  item: T,
  occupiedByParent: Map<string, Set<string>>,
): T {
  const occupied = occupiedByParent.get(parentKey(item.parentId)) ?? new Set<string>();
  let nextX = item.x;
  let nextY = item.y;

  if (occupied.has(gridKey(item.x, item.y))) {
    const fallback = findNearestEmptyCell(occupied, item.x, item.y);

    if (!fallback) {
      throw new Error("GRID_FULL");
    }

    nextX = fallback.x;
    nextY = fallback.y;
  }

  occupied.add(gridKey(nextX, nextY));
  occupiedByParent.set(parentKey(item.parentId), occupied);

  return {
    ...item,
    x: nextX,
    y: nextY,
  };
}

function collectDescendantNodeIds(rootId: string, allNodes: Node[]): string[] {
  const nodesByParent = new Map<string | null, Node[]>();

  for (const node of allNodes) {
    const siblings = nodesByParent.get(node.parentId) ?? [];
    siblings.push(node);
    nodesByParent.set(node.parentId, siblings);
  }

  const result: string[] = [];

  function visit(nodeId: string) {
    result.push(nodeId);

    for (const child of sortGridItems(nodesByParent.get(nodeId) ?? [])) {
      visit(child.id);
    }
  }

  visit(rootId);
  return result;
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== undefined && value !== null;
}

function isWithinRestoreWindow(
  deletedAt: number | null,
  anchorDeletedAt: number | null,
): deletedAt is number {
  return deletedAt !== null && anchorDeletedAt !== null && Math.abs(deletedAt - anchorDeletedAt) <= 5_000;
}

function findFirstAvailableCell(
  occupied: Set<string>,
): { x: number; y: number } | null {
  for (let y = 0; y < GRID_ROWS; y += 1) {
    for (let x = 0; x < GRID_COLS; x += 1) {
      if (!occupied.has(gridKey(x, y))) {
        return { x, y };
      }
    }
  }

  return null;
}

export const db = new GridDODatabase();
export const indexedDBStore: DataStore = new IndexedDBDataStore(db);
