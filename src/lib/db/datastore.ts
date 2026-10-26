import type {
  Node,
  CreateNode,
  UpdateNode,
  Bit,
  CreateBit,
  UpdateBit,
  Chunk,
  CreateChunk,
  ScratchBreakdown,
  CreateScratchBreakdown,
  UpdateScratchBreakdown,
  StagedCandidate,
  CandidateOrphanAuditEvent,
  RepositoryOperationCommand,
  RepositoryOperationResult,
  RepositoryOperationStatus,
  PendingOperationRecovery,
  UnknownRepositoryOperationOutcome,
} from "@/lib/db/schema";

export type AddBreakdownCommand = RepositoryOperationCommand<{
  breakdownId: string;
  scratchBitId: string;
  scratchExpectedVersion: number;
  content: string;
}>;

export type AddBreakdownResult = RepositoryOperationResult<{
  status: RepositoryOperationStatus;
  breakdown: ScratchBreakdown | null;
  scratch: Bit | null;
}>;

export type SaveScratchTitleCommand = RepositoryOperationCommand<{
  scratchBitId: string;
  expectedVersion: number;
  baseTitle: string;
  title: string;
}>;

export type SaveScratchTitleResult = RepositoryOperationResult<{
  status: RepositoryOperationStatus;
  scratch: Bit | null;
}>;

export type SaveBreakdownCommand = RepositoryOperationCommand<{
  breakdownId: string;
  expectedVersion: number;
  baseContent: string;
  baseOrder: number;
  content: string;
  order: number;
}>;

export type SaveBreakdownResult = RepositoryOperationResult<{
  status: RepositoryOperationStatus;
  breakdown: ScratchBreakdown | null;
  candidate: StagedCandidate | null;
  scratch: Bit | null;
}>;

export type DeleteBreakdownCommand = RepositoryOperationCommand<{
  breakdownId: string;
  expectedVersion: number;
  scratchBitId: string;
  scratchExpectedVersion: number;
}>;

export type DeleteBreakdownResult = RepositoryOperationResult<{
  status: RepositoryOperationStatus;
  breakdown: ScratchBreakdown | null;
  candidate: StagedCandidate | null;
  scratch: Bit | null;
}>;

export type StageCandidateCommand = RepositoryOperationCommand<{
  candidateId: string;
  scratchBitId: string;
  sourceBreakdownId: string;
  sourceExpectedVersion: number;
  resultType: StagedCandidate["resultType"];
}>;

export type StageCandidateResult = RepositoryOperationResult<{
  status: RepositoryOperationStatus;
  candidate: StagedCandidate | null;
  source: ScratchBreakdown | null;
  scratch: Bit | null;
}>;

export type UnstageCandidateCommand = RepositoryOperationCommand<{
  candidateId: string;
  candidateExpectedVersion: number;
  sourceBreakdownId: string;
  sourceExpectedVersion: number;
}>;

export type UnstageCandidateResult = RepositoryOperationResult<{
  status: RepositoryOperationStatus;
  candidate: StagedCandidate | null;
  source: ScratchBreakdown | null;
}>;

export type ConfirmedCandidateOrphanProof =
  | Readonly<{
      status: "confirmed";
      cause: CandidateOrphanAuditEvent["cause"];
      sourceBreakdownId: string;
    }>
  | Readonly<{
      status: "unresolved";
      reason: "cache_miss" | "offline" | "delayed_subscription";
    }>
  | Readonly<{
      status: "planned_aggregate";
      sourceBreakdownId: string;
    }>;

export type ConfirmedCandidateOrphanCleanupCommand = RepositoryOperationCommand<{
  auditEventId: string;
  candidateId: string;
  candidateExpectedVersion: number;
  sourceBreakdownId: string;
  scratchBitId: string;
  resultType: StagedCandidate["resultType"];
  proof: ConfirmedCandidateOrphanProof;
}>;

export type ConfirmedCandidateOrphanCleanupResult = RepositoryOperationResult<{
  status: RepositoryOperationStatus;
  candidate: StagedCandidate | null;
  source: ScratchBreakdown | null;
  auditEvent: CandidateOrphanAuditEvent | null;
}>;

export type PlacementCommandBase = RepositoryOperationCommand<{
  resultId: string;
  scratchBitId: string;
  sourceBreakdownId: string;
  sourceExpectedVersion: number;
  resultType: "node" | "bit";
  title: string;
  targetParentId: string | null;
  expectedAncestorIds: readonly string[];
  x: number;
  y: number;
}>;

export type StagedPlacementCommand = PlacementCommandBase & Readonly<{
  candidateId: string;
  candidateExpectedVersion: number;
}>;

export type DirectPlacementCommand = PlacementCommandBase;

export type PlacementResult = RepositoryOperationResult<{
  status: RepositoryOperationStatus;
  result: Node | Bit | null;
  source: ScratchBreakdown | null;
  candidate: StagedCandidate | null;
}>;

export type PlacementUndoCommandBase = RepositoryOperationCommand<{
  resultSnapshot: Node | Bit;
  sourceSnapshot: ScratchBreakdown;
}>;

export type StagedPlacementUndoCommand = PlacementUndoCommandBase & Readonly<{
  candidateSnapshot: StagedCandidate;
}>;

export type DirectPlacementUndoCommand = PlacementUndoCommandBase;

export type PlacementUndoResult = RepositoryOperationResult<{
  status: RepositoryOperationStatus;
  result: Node | Bit | null;
  source: ScratchBreakdown | null;
  candidate: StagedCandidate | null;
}>;

export type ScratchArchiveEligibility = Readonly<{
  eligible: boolean;
  scratch: Bit | null;
  consumedCount: number;
  unconsumedCount: number;
  stagedCandidateCount: number;
}>;

export type ArchiveScratchCommand = RepositoryOperationCommand<{
  scratchBitId: string;
  expectedVersion: number;
  callerAssertion: Readonly<{
    addDraftClear: true;
    titleBlockerClear: true;
  }>;
}>;

export type ArchiveScratchResult = RepositoryOperationResult<{
  status: RepositoryOperationStatus;
  scratch: Bit | null;
}>;

export type ArchiveScratchRecoveryResult =
  | RepositoryOperationResult<{
      status: "applied" | "not_applied" | "conflict";
      scratch: Bit | null;
    }>
  | UnknownRepositoryOperationOutcome;

export type TrashScratchCandidate = Readonly<{
  candidateId: string;
  candidateExpectedVersion: number;
  sourceBreakdownId: string;
  sourceExpectedVersion: number;
}>;

export type TrashScratchCommand = RepositoryOperationCommand<{
  scratchBitId: string;
  expectedVersion: number;
  candidates: readonly TrashScratchCandidate[];
}>;

export type TrashScratchResult = RepositoryOperationResult<{
  status: RepositoryOperationStatus;
  scratch: Bit | null;
  candidates: StagedCandidate[];
}>;

export type AggregateHardDeleteResult =
  | { status: "deleted" }
  | {
      status: "integrity_cleanup_required";
      candidates: StagedCandidate[];
    };

export type LiveObserver<T> = {
  next?: (value: T) => void;
  error?: (error: unknown) => void;
};

export type LiveSubscription = { unsubscribe(): void };

/** The subscribe shape of Dexie's `liveQuery`, so hooks never import `dexie`. */
export type LiveObservable<T> = {
  subscribe(observer: LiveObserver<T>): LiveSubscription;
};

/**
 * The answer to a deadline conflict (SCHEMA Hook 2): the call also extends the parent record's
 * deadline (a Bit's Node, a Chunk's Bit) in the same write, instead of failing.
 */
export type ExtendParentOption = Readonly<{ extendParent?: boolean }>;

export interface DataStore {
  /**
   * Re-runs `read` against this store on every data change and emits each
   * result. The first result is emitted without waiting for a change.
   */
  liveRead<T>(read: (store: DataStore) => Promise<T>): LiveObservable<T>;

  // --- Nodes ---
  getNode(id: string): Promise<Node | undefined>;
  getNodes(parentId: string | null): Promise<Node[]>;
  createNode(data: CreateNode): Promise<Node>;
  updateNode(id: string, data: UpdateNode): Promise<void>;
  softDeleteNode(id: string): Promise<void>;
  restoreNode(id: string): Promise<void>;
  hardDeleteNode(id: string): Promise<AggregateHardDeleteResult>;
  /** Permanently deletes every trashed Node closure and trashed Bit in one write (Hook 6). */
  emptyTrash(): Promise<AggregateHardDeleteResult>;
  cleanupExpiredTrash(): Promise<AggregateHardDeleteResult>;

  getAllActiveNodes(): Promise<Node[]>;

  // --- Bits ---
  getBit(id: string): Promise<Bit | undefined>;
  getBits(parentId: string): Promise<Bit[]>;
  getBitsForNode(nodeId: string): Promise<Bit[]>;
  getAllActiveBits(): Promise<Bit[]>;
  createBit(data: CreateBit): Promise<Bit>;
  updateBit(id: string, data: UpdateBit, options?: ExtendParentOption): Promise<void>;
  softDeleteBit(id: string): Promise<void>;
  restoreBit(id: string): Promise<void>;
  hardDeleteBit(id: string): Promise<AggregateHardDeleteResult>;

  // --- Lifecycle ---
  archiveNode(id: string): Promise<void>;
  archiveBit(id: string): Promise<void>;
  unarchiveNode(id: string): Promise<void>;
  unarchiveBit(id: string): Promise<void>;

  // --- Authoritative Inbox Scratch Archive ---
  getScratchArchiveEligibility(scratchBitId: string): Promise<ScratchArchiveEligibility>;
  archiveScratch(command: ArchiveScratchCommand): Promise<ArchiveScratchResult>;
  classifyArchiveScratchRecovery(
    recovery: PendingOperationRecovery,
  ): Promise<ArchiveScratchRecoveryResult>;

  // --- Authoritative Inbox Scratch Trash ---
  trashScratch(command: TrashScratchCommand): Promise<TrashScratchResult>;
  reconcileTrashScratch(command: TrashScratchCommand): Promise<TrashScratchResult>;

  // --- System Node Seeding ---
  /**
   * Idempotently ensures the Inbox and Archive View system nodes exist.
   * Creates only missing roles; existing nodes are never overwritten.
   * Normalizes lifecycle-drifted system nodes (deletedAt/archivedAt → null).
   * Throws "GRID_FULL: ..." if no L0 cell is available for a required node.
   */
  ensureSystemNodes(): Promise<void>;

  // --- Scratch Breakdowns ---
  createScratchBreakdown(data: CreateScratchBreakdown): Promise<ScratchBreakdown>;
  getScratchBreakdowns(scratchBitId: string): Promise<ScratchBreakdown[]>;
  /** Every Breakdown row of the account, in `id` order. */
  getAllScratchBreakdowns(): Promise<ScratchBreakdown[]>;
  /** Staged Candidates of one Scratch, in `id` order. */
  getStagedCandidates(scratchBitId: string): Promise<StagedCandidate[]>;
  /** Every staged Candidate of the account, in `id` order. */
  getAllStagedCandidates(): Promise<StagedCandidate[]>;
  updateScratchBreakdown(id: string, data: UpdateScratchBreakdown): Promise<void>;
  markScratchBreakdownConsumed(id: string): Promise<void>;
  unconsumeScratchBreakdown(id: string): Promise<void>;
  deleteScratchBreakdown(id: string): Promise<void>;

  // --- Authoritative Inbox Breakdown Commands ---
  addBreakdown(command: AddBreakdownCommand): Promise<AddBreakdownResult>;
  reconcileAddBreakdown(command: AddBreakdownCommand): Promise<AddBreakdownResult>;
  saveScratchTitle(
    command: SaveScratchTitleCommand,
  ): Promise<SaveScratchTitleResult>;
  reconcileSaveScratchTitle(
    command: SaveScratchTitleCommand,
  ): Promise<SaveScratchTitleResult>;
  saveBreakdown(command: SaveBreakdownCommand): Promise<SaveBreakdownResult>;
  reconcileSaveBreakdown(
    command: SaveBreakdownCommand,
  ): Promise<SaveBreakdownResult>;
  deleteBreakdown(command: DeleteBreakdownCommand): Promise<DeleteBreakdownResult>;
  reconcileDeleteBreakdown(
    command: DeleteBreakdownCommand,
  ): Promise<DeleteBreakdownResult>;

  // --- Authoritative Inbox Staging Commands ---
  stageCandidate(command: StageCandidateCommand): Promise<StageCandidateResult>;
  reconcileStageCandidate(
    command: StageCandidateCommand,
  ): Promise<StageCandidateResult>;
  unstageCandidate(
    command: UnstageCandidateCommand,
  ): Promise<UnstageCandidateResult>;
  reconcileUnstageCandidate(
    command: UnstageCandidateCommand,
  ): Promise<UnstageCandidateResult>;

  // --- Authoritative Candidate Integrity Commands ---
  cleanupConfirmedCandidateOrphan(
    command: ConfirmedCandidateOrphanCleanupCommand,
  ): Promise<ConfirmedCandidateOrphanCleanupResult>;
  reconcileConfirmedCandidateOrphanCleanup(
    command: ConfirmedCandidateOrphanCleanupCommand,
  ): Promise<ConfirmedCandidateOrphanCleanupResult>;

  // --- Authoritative Inbox Placement Commands ---
  placeStagedCandidate(command: StagedPlacementCommand): Promise<PlacementResult>;
  reconcileStagedPlacement(command: StagedPlacementCommand): Promise<PlacementResult>;
  placeDirectBreakdown(command: DirectPlacementCommand): Promise<PlacementResult>;
  reconcileDirectPlacement(command: DirectPlacementCommand): Promise<PlacementResult>;

  // --- Authoritative Inbox Placement Undo Commands ---
  undoStagedPlacement(command: StagedPlacementUndoCommand): Promise<PlacementUndoResult>;
  reconcileStagedPlacementUndo(
    command: StagedPlacementUndoCommand,
  ): Promise<PlacementUndoResult>;
  undoDirectPlacement(command: DirectPlacementUndoCommand): Promise<PlacementUndoResult>;
  reconcileDirectPlacementUndo(
    command: DirectPlacementUndoCommand,
  ): Promise<PlacementUndoResult>;

  // --- Chunks ---
  getChunks(bitId: string): Promise<Chunk[]>;
  createChunk(data: CreateChunk): Promise<Chunk>;
  updateChunk(id: string, data: Partial<Chunk>, options?: ExtendParentOption): Promise<void>;
  /** Writes `order` 0..n-1 in the given sequence; the list must be exactly the Bit's Chunks. */
  reorderChunks(bitId: string, chunkIds: readonly string[]): Promise<void>;
  deleteChunk(id: string): Promise<void>;

  // --- Queries ---
  getActiveGridContents(parentId: string | null): Promise<{ nodes: Node[]; bits: Bit[] }>;
  getCalendarItems(): Promise<{ bits: Bit[]; chunks: Chunk[] }>;
  getTrashedItems(): Promise<{ nodes: Node[]; bits: Bit[] }>;
  getArchivedItems(): Promise<{ nodes: Node[]; bits: Bit[] }>;
  searchAll(query: string): Promise<Array<{
    type: "node" | "bit" | "chunk";
    item: Node | Bit | Chunk;
    parentPath: string[];
    parentNodeId?: string;
    parentBitId?: string;
    grandparentNodeId?: string;
  }>>;
  getGridOccupancy(parentId: string | null): Promise<Set<string>>;
  promoteBitToNode(bitId: string): Promise<Node>;

  /** Returns child Bits whose deadlines exceed the given deadline. Used before/after updateNode to detect conflicts. */
  getChildDeadlineConflicts(nodeId: string, deadline: number, deadlineAllDay: boolean): Promise<Bit[]>;

  /**
   * Relocates active items in this parent whose position overlaps the breadcrumb
   * blocked zone. Runs exactly once per parent across sessions (durable marker).
   * Returns the count of relocated items. Aborts silently (no marker) if any item
   * cannot be placed outside the zone.
   */
  runBreadcrumbZoneMigration(
    parentId: string | null,
    blockedCells: Set<string>,
  ): Promise<{ relocated: number }>;
}

/**
 * `DataStore.liveRead` on the current store. Hooks import this; the store is
 * resolved on subscribe, and unsubscribing before it resolves subscribes nothing.
 */
export function liveRead<T>(read: (store: DataStore) => Promise<T>): LiveObservable<T> {
  return {
    subscribe(observer) {
      let closed = false;
      let inner: LiveSubscription | null = null;
      getDataStore().then(
        (store) => {
          if (closed) return;
          inner = store.liveRead(read).subscribe(observer);
        },
        (error: unknown) => {
          if (!closed) observer.error?.(error);
        },
      );
      return {
        unsubscribe() {
          closed = true;
          inner?.unsubscribe();
          inner = null;
        },
      };
    },
  };
}

let cachedDataStore: DataStore | null = null;

export async function getDataStore(): Promise<DataStore> {
  if (cachedDataStore) {
    return cachedDataStore;
  }

  const dataStoreModule = await import("@/lib/db/indexeddb");
  let dataStore: DataStore = dataStoreModule.indexedDBStore;
  if (process.env.NODE_ENV === "development") {
    // Development state switch (feedback F30): wrap whichever store is returned.
    const { withDevInjection } = await import("@/lib/dev/state-switch");
    dataStore = withDevInjection(dataStore);
  }
  cachedDataStore = dataStore;
  return cachedDataStore;
}
