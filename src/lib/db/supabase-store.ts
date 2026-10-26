import type {
  DataStore,
  LiveObservable,
  ScratchArchiveEligibility,
} from "@/lib/db/datastore";
import { buildNodeTitlePath, sortChunks, sortGridItems } from "@/lib/db/read-helpers";
import type { AccountView, SnapshotStore } from "@/lib/db/snapshot-store";
import type { Bit, Chunk, Node, ScratchBreakdown, StagedCandidate } from "@/lib/db/schema";
import { isDeadlineAfter } from "@/lib/utils/deadline";

// The DataStore over the account snapshot (SPEC Architecture Decisions 2 and 19). Task 226 is
// the read side: every read is answered in memory over the snapshot view with SCHEMA Key
// Queries semantics. Results come back in the order the Dexie store returns them: primary-key
// `id` order, then the same sort where the Dexie read sorts. Writes arrive in Task 227.

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

type WriteKey = Exclude<keyof DataStore, ReadKey>;

// Listing every write as a key makes the compiler fail here when DataStore gains a method.
const WRITE_KEYS: Record<WriteKey, true> = {
  createNode: true,
  updateNode: true,
  softDeleteNode: true,
  restoreNode: true,
  hardDeleteNode: true,
  cleanupExpiredTrash: true,
  createBit: true,
  updateBit: true,
  softDeleteBit: true,
  restoreBit: true,
  hardDeleteBit: true,
  archiveNode: true,
  archiveBit: true,
  unarchiveNode: true,
  unarchiveBit: true,
  archiveScratch: true,
  classifyArchiveScratchRecovery: true,
  trashScratch: true,
  reconcileTrashScratch: true,
  ensureSystemNodes: true,
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
  createChunk: true,
  updateChunk: true,
  deleteChunk: true,
  promoteBitToNode: true,
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

export function createSupabaseStore(snapshot: SnapshotStore): DataStore {
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

  const writes = Object.fromEntries(
    (Object.keys(WRITE_KEYS) as WriteKey[]).map((key) => [
      key,
      () => Promise.reject(new Error(`${key} is not supported by the Supabase store yet`)),
    ]),
  ) as unknown as Pick<DataStore, WriteKey>;

  const store: DataStore = { ...writes, ...reads };
  return store;
}
