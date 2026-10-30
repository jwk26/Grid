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
  StagedCandidate,
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

/**
 * The rule a `rejected` answer names (SCHEMA §Result envelope). Only the Supabase store sets it;
 * `account_limit` carries `table` and `limit` so the rejected state can show its reason.
 */
export type CommandRejection = Readonly<{ code: string; table?: string; limit?: number }>;

export type AddBreakdownResult = RepositoryOperationResult<{
  status: RepositoryOperationStatus;
  breakdown: ScratchBreakdown | null;
  scratch: Bit | null;
  rejection?: CommandRejection;
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
  rejection?: CommandRejection;
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

/** The subscribe shape hooks observe a live read through. */
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
  /** `options.id`: the caller picks the id, so it can register it before the new Bit shows (Inbox capture). */
  createBit(data: CreateBit, options?: { id?: string }): Promise<Bit>;
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
  getScratchBreakdowns(scratchBitId: string): Promise<ScratchBreakdown[]>;
  /** Every Breakdown row of the account, in `id` order. */
  getAllScratchBreakdowns(): Promise<ScratchBreakdown[]>;
  /** Staged Candidates of one Scratch, in `id` order. */
  getStagedCandidates(scratchBitId: string): Promise<StagedCandidate[]>;
  /** Every staged Candidate of the account, in `id` order. */
  getAllStagedCandidates(): Promise<StagedCandidate[]>;

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
  /**
   * The Undo verdict of a placement, judged from the stored account rows. Sends no request, so a
   * live read may call it on every change; the reconcile methods stay for an unknown outcome.
   */
  getPlacementUndoTruth(
    command: DirectPlacementUndoCommand | StagedPlacementUndoCommand,
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

// The in-flight promise is cached, so callers that ask before the account is ready share one
// store.
let dataStorePromise: Promise<DataStore> | null = null;

async function createDataStore(): Promise<DataStore> {
  // Production store (Phase 45): the Supabase store over the account snapshot. It exists once
  // entry has made a session, prepared the account and loaded the snapshot.
  const [{ getSessionController }, { createSupabaseStore }] = await Promise.all([
    import("@/lib/auth/session"),
    import("@/lib/db/supabase-store"),
  ]);
  const controller = getSessionController();
  await controller.whenReady();
  if (process.env.NODE_ENV === "development") {
    // Development state switch (feedback F30): the ordinary writes are injected at the Supabase
    // client, below the pending layer; the Inbox commands at the DataStore.
    const [{ withDevInjection, withDevClient }, { getSupabaseClient }] = await Promise.all([
      import("@/lib/dev/state-switch"),
      import("@/lib/db/supabase-client"),
    ]);
    return withDevInjection(createSupabaseStore(controller.store, withDevClient(getSupabaseClient)));
  }
  return createSupabaseStore(controller.store);
}

export function getDataStore(): Promise<DataStore> {
  dataStorePromise ??= createDataStore().catch((error: unknown) => {
    // A failed start is not kept: the next caller tries again.
    dataStorePromise = null;
    throw error;
  });
  return dataStorePromise;
}
