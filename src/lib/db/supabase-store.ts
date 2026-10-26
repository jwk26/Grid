import type {
  DataStore,
  LiveObservable,
  ScratchArchiveEligibility,
} from "@/lib/db/datastore";
import { buildNodeTitlePath, sortChunks, sortGridItems } from "@/lib/db/read-helpers";
import {
  bitCreateToRow,
  bitFromRow,
  bitPatchToRow,
  chunkCreateToRow,
  chunkFromRow,
  chunkPatchToRow,
  nodeCreateToRow,
  nodeFromRow,
} from "@/lib/db/row-mapping";
import type { AccountView, ChangeRow, Envelope, SnapshotStore } from "@/lib/db/snapshot-store";
import {
  chunkSchema,
  createBitSchema,
  createChunkSchema,
  createNodeSchema,
  updateBitSchema,
  updateNodeSchema,
  type Bit,
  type Chunk,
  type Node,
  type ScratchBreakdown,
  type StagedCandidate,
} from "@/lib/db/schema";
import {
  callById,
  callCleanupExpiredTrash,
  callCreateBit,
  callCreateChunk,
  callCreateNode,
  callDeleteChunk,
  callEmptyTrash,
  callEnsureAccount,
  callReorderChunks,
  callUpdateBit,
  callUpdateChunk,
  callUpdateNode,
  callWithReserved,
} from "@/lib/db/supabase-calls";
import { getSupabaseClient, type GriddoSupabaseClient } from "@/lib/db/supabase-client";
import {
  DeadlineConflictError,
  WriteOutcomeUnknownError,
  WriteRejectedError,
} from "@/lib/db/write-errors";
import { isDeadlineAfter } from "@/lib/utils/deadline";

// The DataStore over the account snapshot (SPEC Architecture Decisions 2 and 19). Task 226 is
// the read side: every read is answered in memory over the snapshot view with SCHEMA Key
// Queries semantics. Results come back in the order the Dexie store returns them: primary-key
// `id` order, then the same sort where the Dexie read sorts. Task 227 Stage 2 adds the ordinary
// writes (one call each, server-confirmed); the Inbox/Triage commands follow in Stage 3.

type ReadKey =
  | "liveRead"
  | "getNode"
  | "getNodes"
  | "getAllActiveNodes"
  | "getBit"
  | "getBits"
  | "getBitsForNode"
  | "getAllActiveBits"
  | "getScratchArchiveEligibility"
  | "getScratchBreakdowns"
  | "getAllScratchBreakdowns"
  | "getStagedCandidates"
  | "getAllStagedCandidates"
  | "getChunks"
  | "getActiveGridContents"
  | "getCalendarItems"
  | "getTrashedItems"
  | "getArchivedItems"
  | "searchAll"
  | "getGridOccupancy"
  | "getChildDeadlineConflicts";

type OrdinaryWriteKey =
  | "createNode"
  | "updateNode"
  | "softDeleteNode"
  | "restoreNode"
  | "hardDeleteNode"
  | "cleanupExpiredTrash"
  | "emptyTrash"
  | "createBit"
  | "updateBit"
  | "softDeleteBit"
  | "restoreBit"
  | "hardDeleteBit"
  | "archiveNode"
  | "archiveBit"
  | "unarchiveNode"
  | "unarchiveBit"
  | "ensureSystemNodes"
  | "createChunk"
  | "updateChunk"
  | "deleteChunk"
  | "reorderChunks"
  | "promoteBitToNode";

type WriteKey = Exclude<keyof DataStore, ReadKey>;

// The writes Task 227 Stage 3 still has to send (the Inbox/Triage commands and the writes only
// tests call). Listing each one as a key makes the compiler fail here when DataStore gains a
// method that neither Stage 2's ordinary writes nor this list covers.
const PENDING_WRITE_KEYS: Record<Exclude<WriteKey, OrdinaryWriteKey>, true> = {
  archiveScratch: true,
  classifyArchiveScratchRecovery: true,
  trashScratch: true,
  reconcileTrashScratch: true,
  createScratchBreakdown: true,
  updateScratchBreakdown: true,
  markScratchBreakdownConsumed: true,
  unconsumeScratchBreakdown: true,
  deleteScratchBreakdown: true,
  addBreakdown: true,
  reconcileAddBreakdown: true,
  saveScratchTitle: true,
  reconcileSaveScratchTitle: true,
  saveBreakdown: true,
  reconcileSaveBreakdown: true,
  deleteBreakdown: true,
  reconcileDeleteBreakdown: true,
  stageCandidate: true,
  reconcileStageCandidate: true,
  unstageCandidate: true,
  reconcileUnstageCandidate: true,
  cleanupConfirmedCandidateOrphan: true,
  reconcileConfirmedCandidateOrphanCleanup: true,
  placeStagedCandidate: true,
  reconcileStagedPlacement: true,
  placeDirectBreakdown: true,
  reconcileDirectPlacement: true,
  undoStagedPlacement: true,
  reconcileStagedPlacementUndo: true,
  undoDirectPlacement: true,
  reconcileDirectPlacementUndo: true,
  runBreadcrumbZoneMigration: true,
};

type SearchResult = Awaited<ReturnType<DataStore["searchAll"]>>[number];

// A view's maps are replaced, never mutated, so the sorted copy is cached per map reference and
// a new view starts with a fresh sort. Callers must not mutate the returned array.
const sortedById = new WeakMap<ReadonlyMap<string, never>, readonly never[]>();

function byId<T extends { id: string }>(rows: ReadonlyMap<string, T>): T[] {
  const cached = sortedById.get(rows as ReadonlyMap<string, never>);
  if (cached) return cached as unknown as T[];
  const sorted = [...rows.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  sortedById.set(rows as ReadonlyMap<string, never>, sorted as unknown as readonly never[]);
  return sorted;
}

const isActive = (row: { deletedAt: number | null; archivedAt: number | null }) =>
  row.deletedAt === null && row.archivedAt === null;

// The function each ordinary write method calls (SCHEMA §Exposed functions); a test checks that
// the method sends exactly one request to it.
export const WRITE_FUNCTION: Record<OrdinaryWriteKey, string> = {
  createNode: "create_node",
  updateNode: "update_node",
  softDeleteNode: "soft_delete_node",
  restoreNode: "restore_node",
  hardDeleteNode: "hard_delete_node",
  cleanupExpiredTrash: "cleanup_expired_trash",
  emptyTrash: "empty_trash",
  createBit: "create_bit",
  updateBit: "update_bit",
  softDeleteBit: "soft_delete_bit",
  restoreBit: "restore_bit",
  hardDeleteBit: "hard_delete_bit",
  archiveNode: "archive_node",
  archiveBit: "archive_bit",
  unarchiveNode: "unarchive_node",
  unarchiveBit: "unarchive_bit",
  ensureSystemNodes: "ensure_account",
  createChunk: "create_chunk",
  updateChunk: "update_chunk",
  deleteChunk: "delete_chunk",
  reorderChunks: "reorder_chunks",
  promoteBitToNode: "promote_bit_to_node",
};

// Methods that still throw "not supported" (Stage 3 of Task 227 and Phase 46).
export const UNSENT_WRITE_METHODS = Object.keys(PENDING_WRITE_KEYS);

const chunkUpdateSchema = chunkSchema.omit({ id: true, parentId: true }).partial();

export function createSupabaseStore(
  snapshot: SnapshotStore,
  getClient: () => GriddoSupabaseClient = getSupabaseClient,
): DataStore {
  const view = (): AccountView => snapshot.getState().view;
  const nodes = () => byId(view().nodes);
  const bits = () => byId(view().bits);
  const chunks = () => byId(view().chunks);

  // Emits the first result once the snapshot is loaded, then again each time the view changes.
  // A result that finishes after a newer read started is dropped, so the last read wins.
  const liveRead = <T>(read: (store: DataStore) => Promise<T>): LiveObservable<T> => ({
    subscribe(observer) {
      let closed = false;
      let latest = 0;
      let lastView: AccountView | null = null;
      const run = () => {
        const current = snapshot.getState();
        if (current.status.phase !== "ready" || current.view === lastView) return;
        lastView = current.view;
        const sequence = ++latest;
        read(store).then(
          (value) => {
            if (!closed && sequence === latest) observer.next?.(value);
          },
          (error: unknown) => {
            if (!closed && sequence === latest) observer.error?.(error);
          },
        );
      };
      const unsubscribe = snapshot.subscribe(run);
      run();
      return {
        unsubscribe() {
          closed = true;
          unsubscribe();
        },
      };
    },
  });

  const getNodes = async (parentId: string | null): Promise<Node[]> =>
    sortGridItems(nodes().filter((node) => node.parentId === parentId && isActive(node)));

  const getBits = async (parentId: string): Promise<Bit[]> =>
    sortGridItems(bits().filter((bit) => bit.parentId === parentId && isActive(bit)));

  const getScratchArchiveEligibility = async (
    scratchBitId: string,
  ): Promise<ScratchArchiveEligibility> => {
    const current = view();
    const scratch = current.bits.get(scratchBitId);
    const rows = [...current.scratchBreakdowns.values()].filter(
      (row) => row.scratchBitId === scratchBitId,
    );
    const consumedCount = rows.filter((row) => row.consumedAt !== null).length;
    const unconsumedCount = rows.length - consumedCount;
    const stagedCandidateCount = [...current.stagedCandidates.values()].filter(
      (candidate) => candidate.scratchBitId === scratchBitId && candidate.lifecycle === "staged",
    ).length;
    const parent = scratch ? current.nodes.get(scratch.parentId) : undefined;
    const activeInboxOwner =
      parent?.systemRole === "inbox" && parent.deletedAt === null && parent.archivedAt === null;
    const activeInboxScratch =
      scratch !== undefined && scratch.deletedAt === null && scratch.archivedAt === null && activeInboxOwner;
    return {
      eligible:
        activeInboxScratch && consumedCount >= 1 && unconsumedCount === 0 && stagedCandidateCount === 0,
      scratch: scratch ?? null,
      consumedCount,
      unconsumedCount,
      stagedCandidateCount,
    };
  };

  const searchAll = async (query: string): Promise<SearchResult[]> => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    const allNodes = nodes();
    const allBits = bits();
    const activeBitIds = new Set(allBits.filter(isActive).map((bit) => bit.id));
    const nodesById = new Map(allNodes.map((node) => [node.id, node]));
    const bitsById = new Map(allBits.map((bit) => [bit.id, bit]));
    const results: SearchResult[] = [];

    for (const node of allNodes) {
      if (isActive(node) && node.title.toLowerCase().includes(normalized)) {
        results.push({ type: "node", item: node, parentPath: buildNodeTitlePath(node.parentId, nodesById) });
      }
    }
    for (const bit of allBits) {
      if (isActive(bit) && bit.title.toLowerCase().includes(normalized)) {
        results.push({
          type: "bit",
          item: bit,
          parentPath: buildNodeTitlePath(bit.parentId, nodesById),
          parentNodeId: bit.parentId,
        });
      }
    }
    for (const chunk of chunks()) {
      if (!activeBitIds.has(chunk.parentId) || !chunk.title.toLowerCase().includes(normalized)) continue;
      const parentBit = bitsById.get(chunk.parentId);
      results.push({
        type: "chunk",
        item: chunk,
        parentPath: parentBit ? [...buildNodeTitlePath(parentBit.parentId, nodesById), parentBit.title] : [],
        parentBitId: chunk.parentId,
        grandparentNodeId: parentBit?.parentId,
      });
    }
    return results;
  };

  const reads: Pick<DataStore, ReadKey> = {
    liveRead,
    getNode: async (id) => view().nodes.get(id),
    getNodes,
    getAllActiveNodes: async () => nodes().filter(isActive),
    getBit: async (id) => view().bits.get(id),
    getBits,
    getBitsForNode: async (nodeId) => bits().filter((bit) => bit.parentId === nodeId && isActive(bit)),
    getAllActiveBits: async () => bits().filter(isActive),
    getScratchArchiveEligibility,
    getScratchBreakdowns: async (scratchBitId) =>
      byId(view().scratchBreakdowns)
        .filter((row: ScratchBreakdown) => row.scratchBitId === scratchBitId)
        .sort((left, right) => left.order - right.order),
    getAllScratchBreakdowns: async () => [...byId(view().scratchBreakdowns)],
    getStagedCandidates: async (scratchBitId) =>
      byId(view().stagedCandidates).filter(
        (candidate: StagedCandidate) => candidate.scratchBitId === scratchBitId,
      ),
    getAllStagedCandidates: async () => [...byId(view().stagedCandidates)],
    getChunks: async (bitId) => sortChunks(chunks().filter((chunk) => chunk.parentId === bitId)),
    getActiveGridContents: async (parentId) => {
      const [gridNodes, gridBits] = await Promise.all([
        getNodes(parentId),
        parentId === null ? Promise.resolve([]) : getBits(parentId),
      ]);
      return { nodes: parentId === null ? gridNodes.filter((n) => !n.hiddenFromGrid) : gridNodes, bits: gridBits };
    },
    getCalendarItems: async () => {
      const activeBits = bits().filter(isActive);
      const activeBitIds = new Set(activeBits.map((bit) => bit.id));
      return {
        bits: activeBits
          .filter((bit) => bit.deadline !== null)
          .sort((left, right) => (left.deadline ?? 0) - (right.deadline ?? 0)),
        chunks: chunks()
          .filter((chunk: Chunk) => chunk.time !== null && activeBitIds.has(chunk.parentId))
          .sort((left, right) => (left.time ?? 0) - (right.time ?? 0)),
      };
    },
    getTrashedItems: async () => ({
      nodes: nodes().filter((node) => node.deletedAt !== null),
      bits: bits().filter((bit) => bit.deletedAt !== null),
    }),
    getArchivedItems: async () => ({
      nodes: nodes().filter(
        (node) => node.archivedAt !== null && node.deletedAt === null && node.systemRole === null,
      ),
      bits: bits().filter((bit) => bit.archivedAt !== null && bit.deletedAt === null),
    }),
    searchAll,
    getGridOccupancy: async (parentId) => {
      const occupancy = new Set<string>();
      for (const node of nodes()) {
        if (node.parentId === parentId && isActive(node) && !(parentId === null && node.hiddenFromGrid)) {
          occupancy.add(`${node.x},${node.y}`);
        }
      }
      for (const bit of bits()) {
        if (bit.parentId === parentId && isActive(bit)) occupancy.add(`${bit.x},${bit.y}`);
      }
      return occupancy;
    },
    getChildDeadlineConflicts: async (nodeId, deadline, deadlineAllDay) =>
      bits().filter(
        (bit) =>
          bit.parentId === nodeId &&
          isActive(bit) &&
          bit.deadline !== null &&
          isDeadlineAfter(bit.deadline, bit.deadlineAllDay, deadline, deadlineAllDay),
      ),
  };

  // --- Ordinary writes (Task 227): one action, one call, server-confirmed ---------------------

  const client = () => getClient();

  type Rejected = { label: string; id?: string; chunk?: boolean };

  // A `rejected` envelope becomes the error callers already match: `GRID_FULL` (restore),
  // `DeadlineConflictError` (a Bit or Node past its parent's deadline), `<Label> not found: <id>`.
  // Any other code is a WriteRejectedError carrying it.
  const rejectionError = (envelope: Envelope, about: Rejected): Error => {
    const rejection = envelope.rejection ?? { code: "rejected" };
    switch (rejection.code) {
      case "grid_full":
        return new WriteRejectedError("GRID_FULL", rejection);
      case "not_found":
        return new WriteRejectedError(`${about.label} not found: ${about.id ?? ""}`, rejection);
      case "deadline_exceeds_parent":
        if (about.chunk) {
          return new WriteRejectedError(
            rejection.table === "nodes"
              ? "Chunk time cannot exceed parent node deadline"
              : "Chunk time cannot exceed parent bit deadline",
            rejection,
          );
        }
        return new DeadlineConflictError("child_exceeds_parent", about.id ? [about.id] : []);
      default:
        return new WriteRejectedError(rejection.code, rejection);
    }
  };

  // Sends one call as a command on `key` and returns its envelope when it was applied. A rejection,
  // an error or an unknown outcome throws; an unknown outcome is never resent, the snapshot store
  // refetches (S16).
  const send = async (
    key: string,
    call: (client: GriddoSupabaseClient) => Promise<Envelope>,
    about: Rejected,
  ): Promise<Envelope> => {
    const outcome = await snapshot.command({ key, send: () => call(client()) });
    switch (outcome.outcome) {
      case "applied":
        return outcome.envelope as Envelope;
      case "rejected":
        throw rejectionError(outcome.envelope as Envelope, about);
      case "error":
        throw outcome.error instanceof Error ? outcome.error : new Error(String(outcome.error));
      case "unknown":
        throw new WriteOutcomeUnknownError();
    }
  };

  const upserted = (envelope: Envelope, table: keyof Envelope["changes"], id: string): ChangeRow => {
    const row = envelope.changes[table]?.upserted.find((candidate) => candidate.id === id);
    if (!row) throw new Error(`The ${table} change set has no row ${id}`);
    return row;
  };

  const nodeAbout = (id: string): Rejected => ({ label: "Node", id });
  const bitAbout = (id: string): Rejected => ({ label: "Bit", id });
  const chunkAbout = (id: string): Rejected => ({ label: "Chunk", id, chunk: true });

  const ordinary: Pick<DataStore, OrdinaryWriteKey> = {
    createNode: async (data) => {
      const parsed = createNodeSchema.parse(data);
      const id = crypto.randomUUID();
      const envelope = await send(`nodes:${id}`, (c) => callCreateNode(c, id, nodeCreateToRow(parsed)), nodeAbout(id));
      return nodeFromRow(upserted(envelope, "nodes", id) as never);
    },
    updateNode: async (id, data) => {
      const parsed = updateNodeSchema.parse(data);
      await send(`nodes:${id}`, (c) => callUpdateNode(c, id, parsed), nodeAbout(id));
    },
    softDeleteNode: async (id) => {
      await send(`nodes:${id}`, (c) => callById(c, "soft_delete_node", id), nodeAbout(id));
    },
    restoreNode: async (id) => {
      await send(`nodes:${id}`, (c) => callWithReserved(c, "restore_node", id), nodeAbout(id));
    },
    hardDeleteNode: async (id) => {
      await send(`nodes:${id}`, (c) => callById(c, "hard_delete_node", id), nodeAbout(id));
      return { status: "deleted" };
    },
    archiveNode: async (id) => {
      await send(`nodes:${id}`, (c) => callById(c, "archive_node", id), nodeAbout(id));
    },
    unarchiveNode: async (id) => {
      await send(`nodes:${id}`, (c) => callWithReserved(c, "unarchive_node", id), nodeAbout(id));
    },
    cleanupExpiredTrash: async () => {
      await send("account", callCleanupExpiredTrash, { label: "Account" });
      return { status: "deleted" };
    },
    emptyTrash: async () => {
      await send("account", callEmptyTrash, { label: "Account" });
      return { status: "deleted" };
    },
    ensureSystemNodes: async () => {
      await send("account", callEnsureAccount, { label: "Account" }).catch((error: unknown) => {
        if (error instanceof Error && error.message === "GRID_FULL") {
          throw new WriteRejectedError("GRID_FULL: Cannot place a system node — no L0 cell available", (error as WriteRejectedError).rejection);
        }
        throw error;
      });
    },
    createBit: async (data) => {
      const parsed = createBitSchema.parse(data);
      const id = crypto.randomUUID();
      const envelope = await send(`bits:${id}`, (c) => callCreateBit(c, id, bitCreateToRow(parsed)), bitAbout(id));
      return bitFromRow(upserted(envelope, "bits", id) as never);
    },
    updateBit: async (id, data, options) => {
      const parsed = updateBitSchema.parse(data);
      await send(
        `bits:${id}`,
        (c) => callUpdateBit(c, id, bitPatchToRow(parsed), options?.extendParent === true),
        bitAbout(id),
      );
    },
    softDeleteBit: async (id) => {
      await send(`bits:${id}`, (c) => callById(c, "soft_delete_bit", id), bitAbout(id));
    },
    restoreBit: async (id) => {
      await send(`bits:${id}`, (c) => callWithReserved(c, "restore_bit", id), bitAbout(id));
    },
    hardDeleteBit: async (id) => {
      await send(`bits:${id}`, (c) => callById(c, "hard_delete_bit", id), bitAbout(id));
      return { status: "deleted" };
    },
    archiveBit: async (id) => {
      await send(`bits:${id}`, (c) => callById(c, "archive_bit", id), bitAbout(id));
    },
    unarchiveBit: async (id) => {
      await send(`bits:${id}`, (c) => callWithReserved(c, "unarchive_bit", id), bitAbout(id));
    },
    createChunk: async (data) => {
      const parsed = createChunkSchema.parse(data);
      const id = crypto.randomUUID();
      const envelope = await send(`chunks:${id}`, (c) => callCreateChunk(c, id, chunkCreateToRow(parsed)), chunkAbout(id));
      return chunkFromRow(upserted(envelope, "chunks", id) as never);
    },
    updateChunk: async (id, data, options) => {
      const parsed = chunkUpdateSchema.parse(data);
      if (parsed.order !== undefined) {
        throw new Error("A Chunk's order changes only through reorderChunks");
      }
      await send(
        `chunks:${id}`,
        (c) => callUpdateChunk(c, id, chunkPatchToRow(parsed), options?.extendParent === true),
        chunkAbout(id),
      );
    },
    deleteChunk: async (id) => {
      await send(`chunks:${id}`, (c) => callDeleteChunk(c, id), chunkAbout(id));
    },
    reorderChunks: async (bitId, chunkIds) => {
      await send(`bits:${bitId}`, (c) => callReorderChunks(c, bitId, chunkIds), bitAbout(bitId));
    },
    promoteBitToNode: async (bitId) => {
      const envelope = await send(`bits:${bitId}`, (c) => callWithReserved(c, "promote_bit_to_node", bitId), bitAbout(bitId));
      const nodeId = (envelope.result as { id?: string } | null)?.id;
      if (!nodeId) throw new Error("promote_bit_to_node returned no Node id");
      return nodeFromRow(upserted(envelope, "nodes", nodeId) as never);
    },
  };

  const pending = Object.fromEntries(
    (Object.keys(PENDING_WRITE_KEYS) as Array<keyof typeof PENDING_WRITE_KEYS>).map((key) => [
      key,
      () => Promise.reject(new Error(`${key} is not supported by the Supabase store yet`)),
    ]),
  ) as unknown as Pick<DataStore, keyof typeof PENDING_WRITE_KEYS>;

  const store: DataStore = { ...pending, ...ordinary, ...reads };
  return store;
}
