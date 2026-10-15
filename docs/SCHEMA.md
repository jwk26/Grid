# GridDO — Data Schema

> **Scope:** This document specifies the data model. Architecture decisions live in SPEC.md.
> **Storage:** IndexedDB (local-first, single-user, no auth/RLS).
> **Validation:** Zod schemas with TypeScript type inference.
> **Production derivation evidence:** Fresh reviewed SCHEMA SHA-256
> `9338ecee14adb1f5d7b131391ad8a808db438e9b633c1cb3dfc2cb37a4a62a6b`
> is read-only evidence, not canonical authority. Production authority is the
> approved map content at `114b032` / `06bfaff9...`, its receipt at
> `90022e7`, and the approved production recipe receipt at `7a15451`.
> **Inbox/Triage amendment status:** **User-approved 2026-07-28.** The exact
> pre-receipt draft is identified below. These canonical targets are not claims
> about completed production implementation.
> **Shared-grid-validator maintenance:** **User-approved 2026-07-28.** The Zod
> example derives both Node and Bit coordinate validators from the existing
> production grid constants; the exact pre-receipt artifact is identified in
> the maintenance receipt below.
> **Scratch-promotion amendment status:** **User-approved 2026-07-28.** The
> exact pre-receipt draft is identified in the approval receipt below. Task
> 105A production implementation remains pending.
> **Scratch Trash amendment (Phase 41):** 2026-10-15, from
> [`DECISION.md`](brainstorming/2026-10-15-scratch-trash-hotfix/DECISION.md)
> H05–H12. Adds the `Trash Scratch` command, its Hook 4/13/14 boundaries, and
> the Undo active-Scratch precondition. No store, index, field or migration
> changes.
> **Promotion provenance:** selected topic
> [`DECISION.md`](brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/DECISION.md),
> approved [`PROMOTION_MAP.md`](brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/PROMOTION_MAP.md),
> and the approved recipe-package
> [navigation receipt](recipes/inbox-triage-visual-recipe-index.md). The recipe
> receipt preserves visual prerequisites but creates no data authority.
> **Baseline locator note:** promotion-map citations into the prior SCHEMA
> refer to the file at production base `a3c679c` (SHA-256 `57ec5f1d...`). Line
> numbers are historical locators and are not rewritten after this replacement.

---

## Inbox/Triage SCHEMA Approval Receipt

- **Gate:** the complete production-adapted Inbox/Triage amendment in this
  document.
- **User disposition:** approved through the prior detailed Fresh SCHEMA
  review and the user's 2026-07-28 instruction to carry the Fresh canonical
  chain through final flow review.
- **Approved artifact:** commit
  `6be49f85c16d818752a4d162b96379a2a479e12c`, containing the exact
  pre-receipt `docs/SCHEMA.md` whose SHA-256 is
  `0fb1fb17f55a507b2a799d6f485fc764324d0287090b51a025df6248535c47ca`.
- **Approved scope:** the Dexie v4 target, CAS/ABA protections, durable
  candidates, narrow orphan-integrity audit, command reconciliation, Archive
  recovery, queries, migrations, durable/non-durable ownership boundary, and
  the five explicit production-transfer design deltas.
- **Preserved constraints:** no general operation log, journal, outbox, or
  offline queue is approved; `VQ-01`–`VQ-12` remain user-owned visual Decision
  prerequisites and gain no visual authority from this data approval.
- **Next legal action:** amend only `docs/SPEC.md`, validate its complete
  affected consistency surface, and record its owning receipt before deriving
  `docs/DESIGN_TOKENS.md`.

### Grid Dimension Correction Receipt — 2026-07-28

- **Gate:** correct only the stale Node/Bit grid-coordinate bounds discovered
  while independently re-deriving `docs/EXECUTION_PLAN.md`.
- **User disposition:** approved the narrow SCHEMA correction on 2026-07-28.
- **Approved artifact:** commit
  `8e8ccb40b28ed9a1c7a26111e93f49c93cbc79ab`, containing the exact
  pre-receipt `docs/SCHEMA.md` whose SHA-256 is
  `0a38b3b38825a27e85fe6be0e6d729a40776d7cac273956215018e56dcb5084f`.
- **Correction:** Node and Bit coordinates are `x = 0–17` and `y = 0–8`,
  matching the canonical 18×9 layout in `docs/SPEC.md` and production
  `GRID_COLS = 18` / `GRID_ROWS = 9`.
- **Preserved scope:** every other SCHEMA field, migration, command,
  prerequisite, deferral, and prior approval remains unchanged. This receipt
  accepts no implementation, task, phase, branch, or completion marker.
- **Next legal action:** remove the matching upstream-authority blocker from
  the proposed execution plan, rerun its canonical review, and present the
  plan at its user-owned approval gate before regenerating the flow review.

#### Grid Validator Completion Receipt — 2026-07-28

- **Gate:** complete the same approved 18×9 correction in the Node and Bit
  Zod examples after final review found the stale `max(14)` / `max(7)` bounds.
- **User disposition:** covered by the user's approved narrow SCHEMA
  grid-dimension correction; no additional product or scope decision was made.
- **Approved artifact:** commit
  `a95d7418a7a16d73f4430e0159e9ddaa466fd4b9`, containing the exact
  pre-receipt `docs/SCHEMA.md` whose SHA-256 is
  `85aad2543f7dfbaf33059004487b19e24824c3802b579320eb46f87debbb8374`.
- **Completed correction:** both field tables and both Zod examples now use
  `x = 0–17` / `max(17)` and `y = 0–8` / `max(8)`. No stale 15×8 bound
  remains in this document.
- **Preserved scope and next action:** the preceding receipt's preserved scope
  and next legal action remain unchanged.

#### Shared Grid Validator Derivation Receipt — 2026-07-28

- **Gate:** replace duplicated current-value coordinate literals in the Zod
  example with the same shared constant-derived validators used by production.
- **User disposition:** approved on 2026-07-28 after independent byte/hash and
  production-structure verification.
- **Approved artifact:** commit
  `a53217ff08d5771974036f069e50d7131bcdea12`, containing the exact
  pre-receipt `docs/SCHEMA.md` whose SHA-256 is
  `d3b4c8c52a64d5e8c07e27c22fdcbf264c728bb449bcb6c0e9cf099dc0603a5b`.
- **Correction:** the example imports `GRID_COLS` / `GRID_ROWS`, defines one
  `gridXSchema` / `gridYSchema` pair from those symbols, and reuses the pair in
  both Node and Bit schemas, matching `src/lib/db/schema.ts`.
- **Preserved scope:** coordinate meaning remains 18×9; historical audit
  literals and descriptive field constraints remain factual records rather
  than implementation expressions. No product, migration, command, plan,
  flow, task, or implementation decision changes.
- **Next legal action:** add the separately approved draft rule that verifies
  canonical code examples and descriptive constraint cells against production
  constants, paths, exports/signatures, stores/indexes, routes, and owners;
  stop at the `docs/PLANNING_STANDARD.md` gate.

### Scratch Promotion Boundary Approval Receipt — 2026-07-28

- **Gate:** amend only Hook 9's stale applicability boundary for an
  Inbox-parented Scratch Bit.
- **User disposition:** approved explicitly on 2026-07-28 with `go ahead`
  after independent read-only review and a scope review of the proposed UI
  follow-up.
- **Approved artifact:** commit
  `67dbe521c875d5b7f0f870de39fe840e91977ccc`, containing the exact
  pre-receipt `docs/SCHEMA.md` whose SHA-256 is
  `d0307b0cea114a7708b9149ff31525cc4cc527e1ae2c3b13d3a73a3a3dd245cd`.
- **Approved scope:** `parentNode.systemRole === "inbox"` identifies a Scratch;
  that identity cannot use Bit-to-Node promotion regardless of current
  Breakdown, candidate, or Chunk presence, and rejection precedes result-ID
  allocation and every store write.
- **Preserved boundaries:** this approval creates no Breakdown/candidate
  deletion or migration policy and adopts no UI or visual-surface change. The
  reviewed suggestion to add a separate UI hiding rule is not part of this
  amendment because Task 105A owns only the repository guard and its exact
  regression.
- **Next legal action:** implement only the Task 105A repository guard and
  `promotion.test.ts` regression, then stop at the Task 105A user checkpoint
  with its `[ ]` marker unchanged.

---

## Table of Contents

- [Object Stores](#object-stores)
  - [nodes](#nodes)
  - [bits](#bits)
  - [chunks](#chunks)
  - [scratchBreakdowns](#scratchbreakdowns)
  - [stagedCandidates](#stagedcandidates)
  - [candidateOrphanAuditEvents](#candidateorphanauditevents)
- [Zod Validation Schemas](#zod-validation-schemas)
- [Repository Operation Contract](#repository-operation-contract)
- [Application Hooks](#application-hooks)
- [Key Queries](#key-queries)
- [Dexie Migration Target](#dexie-migration-target)
- [Schema Gate](#schema-gate)

---

## Current Implementation And Canonical Target

The current production source baseline is commit
`a3c679cf7ca09559ecc5e1690fd2a3707d40916c`, with `src` tree
`11e9c0f7ca226fdeee59a23ef164d3baa6823294`. The later commits in this
Fresh-map adoption branch are documentation receipts only and retain that
exact source tree. The implementation is **Dexie version 3** and must not be
confused with the proposed target below.

Verified current DB blobs are `schema.ts`
`7e78f047a01cbc45b5bccc967c58a3a701169125`, `datastore.ts`
`5177c2417c28bf86b6be0b9d413001154b8d87b1`, and `indexeddb.ts`
`a5ab6a79a7db5cef502ca6afa10e69bb56f5bb6f`.

| Area | Current implementation | Proposed canonical target |
|------|------------------------|---------------------------|
| `src/lib/db/schema.ts` | `Node`/`Bit` have the existing lifecycle/timestamp fields through `archivedAt`, but no `version`; `ScratchBreakdown` has `id`, `scratchBitId`, `content`, `order`, `createdAt`, and nullable `consumedAt`, but no `version`; there is no staged-candidate or orphan-audit schema. The current file also does not yet contain the canonically declared `pastDeadlineDismissed` field on `Node` or `Bit`. | Retain existing canonical fields; add monotonic `version` to Nodes (Undo mutation evidence), Bits (including Scratch aggregate CAS), and Breakdown rows; add `StagedCandidate` and the narrow append-only `CandidateOrphanAuditEvent`. Bring the existing `pastDeadlineDismissed: false` canonical default into the implementation migration rather than pretending it already exists. |
| `src/lib/db/datastore.ts` | Exposes ordinary CRUD, Scratch Breakdown create/update/consume/unconsume/delete, and simple archive methods. Updates accept no expected version and return no typed operation/reconciliation result. There is no candidate repository. | Add CAS-aware Scratch/row mutations, durable candidate queries/commands, atomic Inbox/Triage commands, and typed authoritative results. Exact source paths beyond the verified DataStore/repository and reactive-hook boundaries remain implementation planning work. |
| `src/lib/db/indexeddb.ts` | v1 creates `nodes`, `bits`, and `chunks`; v2 adds `settings`; v3 expands Node/Bit archive indexes and creates `scratchBreakdowns`. The v3 upgrade backfills Node `archivedAt`, `systemRole`, and `hiddenFromGrid`, and Bit `archivedAt`. It does not backfill versions or migrate staged candidates. Current v3 store declarations include `bits: "id,parentId,deletedAt,[parentId+deletedAt],status,deadline,[parentId+status],archivedAt,[parentId+deletedAt+archivedAt]"` and `scratchBreakdowns: "id,scratchBitId,[scratchBitId+order]"`. | Add Dexie v4 after v3, preserving v1→v2→v3 ordering; backfill/validate target defaults and create/index empty `stagedCandidates` and `candidateOrphanAuditEvents` stores as specified below. |
| Inbox/Triage writes | Candidates are Zustand/page-memory objects containing a duplicated `label`; archive calls `archiveBit`; placement currently creates a Node/Bit, then consumes the row, then removes an in-memory candidate in separate steps. Scratch Breakdown methods perform direct `put`/`delete` calls without CAS. | Candidate text resolves from its source row; Stage/Unstage/placement/Undo/Delete/Archive use the atomic and idempotent contracts below. Pending presentation remains transient and is not a durable candidate lifecycle. |

`mtime` remains the aging/last-modified timestamp used by existing Grid
behavior. It is not, and must never be used as, the edit concurrency token.
The proposed monotonic `version` fields own compare-and-set semantics.

**Promotion-map resolution trace:**

| Obligation / question | Proposed resolution in this document |
|-----------------------|--------------------------------------|
| `LAND-SCHEMA-VERSION` / `Q-NAME-05` | Exact current v3 reality is separated above; the target uses integer `version` revisions (not `mtime`), Dexie v4 ordering, deterministic defaults, explicit indexes, and abort-on-invalid legacy validation. Scratch title and row CAS are specified below. |
| `LAND-SCHEMA-CANDIDATE` / `Q-NAME-01` | Canonical entity/store/type names are `StagedCandidate` / `stagedCandidates`; fields, the durable `"staged"` lifecycle, source/result identity, uniqueness, ownership, lookups, joins, guards, and migration defaults are specified below. Confirmed orphan cleanup appends a narrow `CandidateOrphanAuditEvent` in the same transaction. |
| `LAND-SCHEMA-OP` / `Q-NAME-02` | Canonical operation identity is `RepositoryOperationId`. Stable created IDs plus monotonic surviving Scratch/row revisions make inverse operations ABA-safe; typed transaction/postcondition reconciliation and an Archive-specific reload descriptor satisfy the current Dexie authority without a general operation-log/journal. The orphan-audit entity is integrity evidence only and cannot answer arbitrary operation status. |

### Production transfer design deltas

These choices differ from the superseded Golden SCHEMA and are visible here
rather than being hidden as implementation detail. They carry forward the
previously user-reviewed Fresh SCHEMA and the user's 2026-07-28 instruction
to use the Fresh canonical chain.

| Delta | Production canonical choice | Consequence / guard |
|---|---|---|
| Node mutation revision | Add `Node.version` and increment it exactly once for every successful direct logical Node mutation. | Placement Undo can reject post-placement Node changes. Every existing Node mutation path becomes Task-owned regression scope; an `mtime`-only parent refresh does not increment it. |
| Scratch aggregate revision | Use the Scratch Bit's `version` for both title CAS and Breakdown-membership ABA protection. | An intervening Add/Delete conservatively conflicts an older title edit instead of allowing stale overwrite. A future split revision requires a new SCHEMA amendment. |
| Forced-Archive reload recovery | Store only the narrow non-authoritative reload/check-again descriptor in `sessionStorage` and fail closed when it cannot be written. | The descriptor never proves success and is not a durable operation log; authoritative state is re-read after reload. |
| Invalid legacy v4 row | Abort and roll back the v4 migration when required legacy values cannot be normalized safely. | No partial migration or guessed default is allowed; recovery UX is implementation-owned but may not weaken rollback. |
| Orphan-audit retention | Retain `candidateOrphanAuditEvents` indefinitely in v4 unless a later approved retention contract replaces it. | No automatic expiry is inferred. The store remains narrow integrity evidence, never a general journal/outbox. |

---

## Object Stores

Unless a field says otherwise, persisted timestamps are positive integer Unix
milliseconds (`Date.now()`). Optional lifecycle timestamps use explicit
`null`, never `undefined`; monotonic versions are non-null integers beginning
at `1`. Migration defaults follow the same representation.

### nodes

Category/container items displayed as mobile app-style icons on the grid. Nodes can nest other Nodes and Bits.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `string` | PK, UUID | `crypto.randomUUID()` | Unique identifier |
| `title` | `string` | NOT NULL, min 1 char | — | Node name. Nouns preferred (e.g., "Workout", "Finance") |
| `color` | `string` | NOT NULL | — | HSL color string (e.g., `"hsl(210, 80%, 55%)"`) for icon/accent. Propagates to child Bits at low saturation |
| `icon` | `string` | NOT NULL | — | Lucide icon name (e.g., `"dumbbell"`, `"briefcase"`) |
| `deadline` | `number \| null` | — | `null` | Unix timestamp (ms). Optional target date for the category |
| `deadlineAllDay` | `boolean` | — | `false` | `true` = date-only ("on a day"), no specific time |
| `mtime` | `number` | NOT NULL | `Date.now()` | Last modified timestamp (ms). Drives aging system |
| `createdAt` | `number` | NOT NULL | `Date.now()` | Creation timestamp (ms) |
| `version` | `number` | NOT NULL, integer ≥ 1 | `1` | Monotonic direct-record mutation revision. Required so placement Undo can detect later Node mutation without using `mtime` |
| `parentId` | `string \| null` | FK → `nodes.id` | `null` | Parent Node. `null` = Level 0 (root) |
| `level` | `number` | NOT NULL, 0–2 | — | Hierarchy depth. Derived from parent chain on creation. Nodes exist at levels 0, 1, 2 only (Level 3 = Bits only) |
| `x` | `number` | NOT NULL, 0–17 | — | Column index on the production 18-column grid |
| `y` | `number` | NOT NULL, 0–8 | — | Row index on the production 9-row grid |
| `deletedAt` | `number \| null` | — | `null` | Soft-delete timestamp. `null` = active. Non-null = trashed |
| `archivedAt` | `number \| null` | — | `null` | Archive timestamp. `null` = active (on grid). Non-null = archived (hidden from grid, shown in Archive View). Mirrors `deletedAt` semantics |
| `systemRole` | `string \| null` | enum: `"inbox"`, `"archive_view"` | `null` | System Node role. `null` = regular user Node. Immutable after creation; non-null uniqueness enforced at application level |
| `hiddenFromGrid` | `boolean` | — | `false` | When `true`, the (system) Node is not rendered on the L0 grid but remains in the sidebar. Only applicable to system nodes (`systemRole !== null`) |
| `pastDeadlineDismissed` | `boolean` | — | `false` | When `true`, the past-deadline "Done?" overlay is permanently dismissed. Set when user clicks ✗ on the overlay. |

> **Note:** Node `description` was removed in Phase 9 amendment. Existing IndexedDB rows may retain orphaned `description` fields that Dexie silently ignores on read. No migration is needed.

**Indexes:**

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `idx_nodes_parentId` | `parentId` | Grid contents query — all children of a Node |
| `idx_nodes_deletedAt` | `deletedAt` | Filter active vs trashed items |
| `idx_nodes_parent_active` | `[parentId, deletedAt]` | Compound: active children of a specific parent |
| `idx_nodes_level` | `level` | Level-specific queries |
| `idx_nodes_systemRole` | `systemRole` | Find system nodes by role (non-unique index; non-null uniqueness enforced at app level) |
| `idx_nodes_archivedAt` | `archivedAt` | Filter active vs archived |
| `idx_nodes_active_full` | `[parentId, deletedAt, archivedAt]` | Compound: active, non-archived children |

**Completion:** Node completion is **purely computed** at render time by checking whether all child Bits (active, non-deleted) have `status === "complete"`. No completion field is stored. Level 0 Nodes never complete — they represent permanent life/work domains.

**Unique constraint:** No two active items (Nodes or Bits) may occupy the same `(parentId, x, y)` cell. Enforced at application level before insert/move.

**Default System Nodes:** On first launch / migration, two system Nodes are seeded (seeding behavior in SPEC.md § System Nodes):

| Property | Inbox Node | Archive View Node |
|----------|-----------|-------------------|
| `systemRole` | `"inbox"` | `"archive_view"` |
| `title` | "Inbox" | "Archive" |
| `icon` | `"inbox"` | `"layers"` |
| `color` | `hsl(221, 83%, 53%)` | `hsl(240, 4%, 46%)` |
| `parentId` | `null` | `null` |
| `level` | `0` | `0` |

`systemRole` is immutable after creation; `title` / `icon` / `color` remain user-customizable. Non-null `systemRole` uniqueness is enforced at the application level (Dexie cannot apply a unique constraint where many rows share `null`). If no Node with a required `systemRole` exists, the system offers to recreate it. Scratch Bits (Bits parented to the Inbox Node) default to the `"sparkles"` icon.

---

### bits

Actionable tasks displayed as horizontal rectangles on the grid. Bits contain Chunks (ordered steps).

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `string` | PK, UUID | `crypto.randomUUID()` | Unique identifier |
| `title` | `string` | NOT NULL, min 1 char | — | Task name. Verbs/short sentences preferred (e.g., "Check pull requests") |
| `description` | `string` | — | `""` | Shown in Bit detail popup |
| `icon` | `string` | NOT NULL | — | Lucide icon name |
| `deadline` | `number \| null` | — | `null` | Unix timestamp (ms). Optional due date |
| `deadlineAllDay` | `boolean` | — | `false` | `true` = date-only ("on a day") |
| `priority` | `string \| null` | enum: `"high"`, `"mid"`, `"low"` | `null` | Optional priority level. Colors: high=red, mid=yellow, low=blue |
| `status` | `string` | NOT NULL, enum: `"active"`, `"complete"` | `"active"` | Completion state |
| `mtime` | `number` | NOT NULL | `Date.now()` | Last modified timestamp (ms). Drives aging system |
| `createdAt` | `number` | NOT NULL | `Date.now()` | Creation timestamp (ms) |
| `version` | `number` | NOT NULL, integer ≥ 1 | `1` | Monotonic direct-record mutation revision. Scratch title CAS and Breakdown collection membership Add/Delete compare this field; each successful Add/Delete increments it. Automatic parent `mtime`-only cascades do not increment it |
| `parentId` | `string` | NOT NULL, FK → `nodes.id` | — | Parent Node. Bits always belong to a Node |
| `x` | `number` | NOT NULL, 0–17 | — | Column index on the production 18-column grid |
| `y` | `number` | NOT NULL, 0–8 | — | Row index on the production 9-row grid |
| `deletedAt` | `number \| null` | — | `null` | Soft-delete timestamp. `null` = active |
| `archivedAt` | `number \| null` | — | `null` | Archive timestamp. `null` = active (on grid). Non-null = archived (hidden from grid, shown in Archive View). Mirrors `deletedAt` semantics |
| `pastDeadlineDismissed` | `boolean` | — | `false` | When `true`, the past-deadline "Done?" overlay is permanently dismissed. Set when user clicks ✗ on the overlay. |

**Indexes:**

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `idx_bits_parentId` | `parentId` | Grid contents — all Bits in a Node |
| `idx_bits_deletedAt` | `deletedAt` | Filter active vs trashed |
| `idx_bits_parent_active` | `[parentId, deletedAt]` | Compound: active Bits of a specific parent |
| `idx_bits_status` | `status` | Filter by completion state |
| `idx_bits_deadline` | `deadline` | Calendar queries — items with deadlines |
| `idx_bits_parent_status` | `[parentId, status]` | Node completion check — active Bits in a Node by status |
| `idx_bits_archivedAt` | `archivedAt` | Filter active vs archived |
| `idx_bits_active_full` | `[parentId, deletedAt, archivedAt]` | Compound: active, non-archived Bits |

**Grid level:** A Bit's effective grid level = `parentNode.level + 1`. Not stored; derived at query time from the parent Node's `level` field.

**Progress bar:** Computed at render time from `completedChunks / totalChunks`. Hidden when Chunk count is zero. Not stored.

**Scratch Bits (Inbox):** Bits whose `parentId` is the Inbox system Node ("Scratch") use `x = 0, y = 0` as a sentinel and are exempt from grid-cell uniqueness (Hook 8). The Triage layout renders them ordered by `createdAt`, ignoring `(x, y)`. Scratch Bits default to the `"sparkles"` icon. "Scratch" is product/UI language — there is no separate database type.

---

### chunks

Smallest units of work. Individual steps within a Bit, displayed in a vertical timeline inside the Bit detail popup.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `string` | PK, UUID | `crypto.randomUUID()` | Unique identifier |
| `title` | `string` | NOT NULL, min 1 char | — | Short, actionable step description |
| `description` | `string` | — | `""` | Additional context for the step |
| `time` | `number \| null` | — | `null` | Optional scheduled time (Unix ms). Cannot exceed parent Bit's deadline |
| `timeAllDay` | `boolean` | — | `false` | `true` = date-only scheduling |
| `status` | `string` | NOT NULL, enum: `"complete"`, `"incomplete"` | `"incomplete"` | Completion state |
| `order` | `number` | NOT NULL | — | User-defined sequence position in Bit timeline. 0-indexed |
| `parentId` | `string` | NOT NULL, FK → `bits.id` | — | Parent Bit |

**Indexes:**

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `idx_chunks_parentId` | `parentId` | All Chunks belonging to a Bit |
| `idx_chunks_parent_order` | `[parentId, order]` | Ordered Chunks for timeline rendering |
| `idx_chunks_time` | `time` | Calendar queries — Chunks with scheduled times |
| `idx_chunks_status` | `status` | Filter by completion state |

**No `deletedAt`:** Chunks do not have independent soft-delete. Behavior:
- **Individual removal** (from Bit detail): Hard delete — permanently removed from the store.
- **Cascade with parent Bit**: When a Bit is soft-deleted (trashed), its Chunks remain in the store. They become inaccessible because the parent Bit is trashed. On Bit restore, Chunks are automatically available again. No additional fields needed.

**No `mtime` or `createdAt`:** Aging is tracked at the Bit level. Chunk activity (completion, creation, deletion) resets the parent Bit's `mtime`.

---

### scratchBreakdowns

Per-Scratch idea rows created in the Triage Breakdown/Scribble area. A **dedicated store** (not Chunk reuse) because breakdown rows must not participate in Hook 3 (Bit Auto-Completion), require `createdAt` for display ordering, and have an independent `consumedAt` lifecycle.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `string` | PK, UUID | `crypto.randomUUID()` | Unique identifier |
| `scratchBitId` | `string` | NOT NULL, FK → `bits.id` | — | Parent Scratch Bit (a Bit whose `parentId` = Inbox Node) |
| `content` | `string` | NOT NULL, min 1 char | — | Idea row text |
| `order` | `number` | NOT NULL | — | Display sequence within the Scratch |
| `createdAt` | `number` | NOT NULL | `Date.now()` | Creation timestamp (ms). Drives display ordering |
| `consumedAt` | `number \| null` | — | `null` | `null` = unconsumed; timestamp = placed/consumed. Consumed rows leave the active Breakdown list but remain durable |
| `version` | `number` | NOT NULL, integer ≥ 1 | `1` | Monotonic mutation revision for content, order, candidate association (Stage/Unstage), and consumption lifecycle CAS |

**Indexes:**

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `idx_scratchBreakdowns_by_scratch` | `[scratchBitId, order]` | Retrieve rows sorted by order |
| `idx_scratchBreakdowns_scratchBitId` | `scratchBitId` | Bulk delete on Scratch Bit removal |
| `idx_scratchBreakdowns_created` | `[scratchBitId, createdAt]` | Retrieve one Scratch's rows by creation time; `order`, then stable `id`, are in-memory tie-breakers |

**Not a Chunk:** Breakdown rows do not participate in Hook 3 (Bit Auto-Completion) and carry their own `createdAt` / `consumedAt`. See Hook 3 note.

**Lifecycle:** `consumedAt === null` means active unless a durable staged
candidate exists for the row. Candidate existence derives staged state; there
is no persisted `isStaged`. `consumedAt !== null` means placed/consumed and the
row is absent from the active Breakdown list but remains durable for archive
eligibility and page-session Undo. Delete remains hard delete, guarded against
staged or already-consumed rows at the repository boundary.

---

### stagedCandidates

Durable, synchronized Node/Bit placement candidates scoped to one Scratch.
The canonical TypeScript entity and Dexie store are both named
`StagedCandidate` / `stagedCandidates`.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `string` | PK, UUID | Preallocated `crypto.randomUUID()` | Stable candidate and Stage target identifier; reused by reconciliation and by staged-source Undo restoration |
| `scratchBitId` | `string` | NOT NULL, FK → `bits.id` | — | Owning active Scratch Bit. Must equal the source row's `scratchBitId` |
| `sourceBreakdownId` | `string` | NOT NULL, FK → `scratchBreakdowns.id`, UNIQUE | — | Authoritative source identity. Enforces one candidate per source row globally; source IDs are globally unique, so this is equivalent to one per source within its Scratch |
| `resultType` | `string` | NOT NULL, enum: `"node"`, `"bit"` | — | Intended result type. Type changes require Unstage then a new Stage |
| `lifecycle` | `string` | NOT NULL, enum: `"staged"` | `"staged"` | Durable candidate truth. Pending/reconciling/placing are operation presentation, not persisted lifecycle values |
| `createdAt` | `number` | NOT NULL | Transaction `Date.now()` | Original successful Stage timestamp; Node/Bit subsections sort DESC by this field, then stable `id` |
| `updatedAt` | `number` | NOT NULL | Same as `createdAt` | Last durable candidate mutation timestamp. Undo restoration preserves `createdAt` and advances `updatedAt` |
| `version` | `number` | NOT NULL, integer ≥ 1 | `1` | Monotonic candidate revision used by Unstage, placement, and Undo CAS |

**Indexes:**

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `uq_stagedCandidates_sourceBreakdownId` | `sourceBreakdownId` (unique) | Enforce one candidate per source row and reconcile duplicate Stage |
| `idx_stagedCandidates_scratchBitId` | `scratchBitId` | All candidates owned by a Scratch and bulk lifecycle checks |
| `idx_stagedCandidates_scratch_lifecycle` | `[scratchBitId, lifecycle]` | Archive eligibility and active staged-candidate projection |
| `idx_stagedCandidates_scratch_type_created` | `[scratchBitId, resultType, createdAt]` | Node/Bit subsection query ordered by `createdAt` (DESC), then `id` |

The candidate stores no title/content snapshot, target Grid Node/path, result
title draft, placement target, `isStaged`, pending flag, selection, newly
placed marker, Undo availability, remote-arrival count, collapse exception, or
other page/session presentation. Display text is joined from the authoritative
`ScratchBreakdown.content`. A placement target is supplied as stable IDs and
an expected path to the placement command and is revalidated at commit time;
it is not candidate ownership.

Absence of a candidate represents a source that is not staged. Successful
Unstage and placement hard-delete the candidate in their transaction; no
candidate tombstone is introduced. Undo of a staged placement recreates the
same `id`, `scratchBitId`, `sourceBreakdownId`, `resultType`, and `createdAt`,
sets `updatedAt` to the Undo transaction timestamp, and sets `version` to the
prior candidate version plus one.

Candidate reads must resolve the source row. A local cache miss, offline read,
or delayed subscription is not proof of an orphan. Only authoritative source
deletion/tombstone confirmation permits cleanup. Cleanup must remove the
candidate atomically and cause counts/archive eligibility to be recomputed,
while appending the integrity event below in the same transaction. This does
not create a general operation log.

---

### candidateOrphanAuditEvents

Append-only integrity evidence for the exceptional case where an
authoritative repository confirms that a staged candidate's source Breakdown
row was already deleted or tombstoned outside the planned aggregate-delete
transaction. The canonical TypeScript entity and Dexie store are named
`CandidateOrphanAuditEvent` / `candidateOrphanAuditEvents`.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `string` | PK, UUID | Preallocated `crypto.randomUUID()` | Stable cleanup-event identity reused by retry/reconciliation |
| `cause` | `string` | NOT NULL, enum: `"source_deleted"`, `"source_tombstoned"` | — | Authoritative orphan proof category; cache miss/offline/delay are never valid causes |
| `candidateId` | `string` | NOT NULL, UNIQUE | — | Candidate removed by the same transaction; uniqueness makes cleanup/event append idempotent |
| `sourceBreakdownId` | `string` | NOT NULL | — | Missing/tombstoned source identity recorded for diagnosis |
| `scratchBitId` | `string` | NOT NULL | — | Owning Scratch identity retained after candidate removal |
| `occurredAt` | `number` | NOT NULL | Transaction `Date.now()` | Durable cleanup time (Unix ms) |

**Indexes:**

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `uq_candidateOrphanAuditEvents_candidateId` | `candidateId` (unique) | At most one orphan-cleanup event per candidate identity |
| `idx_candidateOrphanAuditEvents_sourceBreakdownId` | `sourceBreakdownId` | Diagnose cleanup by missing source identity |
| `idx_candidateOrphanAuditEvents_scratch_time` | `[scratchBitId, occurredAt]` | Repository-integrity history for one Scratch in chronological order |

Only the repository-integrity layer writes or queries this store. Events are
not user-visible activity history, operation status, an outbox, or an offline
queue. Version 4 applies no automatic retention/deletion policy; a later
canonical migration may add export/retention without reusing this store as a
general journal. A planned Scratch hard-delete transaction that still owns
both source rows and candidates deletes that aggregate atomically and is not
an orphan-cleanup event. The event is required only when the source is already
authoritatively absent/tombstoned before cleanup begins.

---

## Zod Validation Schemas

```typescript
import { z } from "zod";
import { GRID_COLS, GRID_ROWS } from "@/lib/constants";

// --- Shared ---

const idSchema = z.string().uuid();
const timestampSchema = z.number().int().positive();
const versionSchema = z.number().int().min(1);
const gridXSchema = z.number().int().min(0).max(GRID_COLS - 1);
const gridYSchema = z.number().int().min(0).max(GRID_ROWS - 1);

export const repositoryOperationIdSchema = idSchema;
export type RepositoryOperationId = z.infer<typeof repositoryOperationIdSchema>;

// --- Node ---

export const nodeSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(100),
  color: z.string().regex(/^hsl\(\d{1,3},\s*\d{1,3}%,\s*\d{1,3}%\)$/),
  icon: z.string().min(1),
  deadline: timestampSchema.nullable().default(null),
  deadlineAllDay: z.boolean().default(false),
  mtime: timestampSchema,
  createdAt: timestampSchema,
  version: versionSchema,
  parentId: idSchema.nullable().default(null),
  level: z.number().int().min(0).max(2),
  x: gridXSchema,
  y: gridYSchema,
  deletedAt: timestampSchema.nullable().default(null),
  archivedAt: timestampSchema.nullable().default(null),
  systemRole: z.enum(["inbox", "archive_view"]).nullable().default(null),
  hiddenFromGrid: z.boolean().default(false),
  pastDeadlineDismissed: z.boolean().default(false),
});

// User-facing create: system-managed lifecycle/role fields are not settable here.
// System Nodes (systemRole) are seeded via an internal path using the full nodeSchema.
export const createNodeSchema = nodeSchema.omit({
  id: true,
  mtime: true,
  createdAt: true,
  version: true,
  deletedAt: true,
  archivedAt: true,
  systemRole: true,
  hiddenFromGrid: true,
  pastDeadlineDismissed: true,
});

export type Node = z.infer<typeof nodeSchema>;
export type CreateNode = z.infer<typeof createNodeSchema>;

// --- Bit ---

export const bitSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(1000).default(""),
  icon: z.string().min(1),
  deadline: timestampSchema.nullable().default(null),
  deadlineAllDay: z.boolean().default(false),
  priority: z.enum(["high", "mid", "low"]).nullable().default(null),
  status: z.enum(["active", "complete"]).default("active"),
  mtime: timestampSchema,
  createdAt: timestampSchema,
  version: versionSchema,
  parentId: idSchema,
  x: gridXSchema,
  y: gridYSchema,
  deletedAt: timestampSchema.nullable().default(null),
  archivedAt: timestampSchema.nullable().default(null),
  pastDeadlineDismissed: z.boolean().default(false),
});

export const createBitSchema = bitSchema.omit({
  id: true,
  mtime: true,
  createdAt: true,
  version: true,
  status: true,
  deletedAt: true,
  archivedAt: true,
  pastDeadlineDismissed: true,
});

export type Bit = z.infer<typeof bitSchema>;
export type CreateBit = z.infer<typeof createBitSchema>;

// --- Chunk ---

export const chunkSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(500).default(""),
  time: timestampSchema.nullable().default(null),
  timeAllDay: z.boolean().default(false),
  status: z.enum(["complete", "incomplete"]).default("incomplete"),
  order: z.number().int().min(0),
  parentId: idSchema,
});

export const createChunkSchema = chunkSchema.omit({
  id: true,
  status: true,
});

export type Chunk = z.infer<typeof chunkSchema>;
export type CreateChunk = z.infer<typeof createChunkSchema>;

// --- ScratchBreakdown ---

export const scratchBreakdownSchema = z.object({
  id: idSchema,
  scratchBitId: idSchema,
  content: z.string().min(1).max(1000),
  order: z.number().int().min(0),
  createdAt: timestampSchema,
  consumedAt: timestampSchema.nullable().default(null),
  version: versionSchema,
});

export const createScratchBreakdownSchema = scratchBreakdownSchema.omit({
  id: true,
  createdAt: true,
  consumedAt: true,
  version: true,
});

export type ScratchBreakdown = z.infer<typeof scratchBreakdownSchema>;
export type CreateScratchBreakdown = z.infer<typeof createScratchBreakdownSchema>;

// --- StagedCandidate ---

export const stagedCandidateSchema = z.object({
  id: idSchema,
  scratchBitId: idSchema,
  sourceBreakdownId: idSchema,
  resultType: z.enum(["node", "bit"]),
  lifecycle: z.literal("staged").default("staged"),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  version: versionSchema,
});

export const createStagedCandidateSchema = stagedCandidateSchema.omit({
  id: true,
  lifecycle: true,
  createdAt: true,
  updatedAt: true,
  version: true,
});

export type StagedCandidate = z.infer<typeof stagedCandidateSchema>;
export type CreateStagedCandidate = z.infer<typeof createStagedCandidateSchema>;

// --- CandidateOrphanAuditEvent ---

export const candidateOrphanAuditEventSchema = z.object({
  id: idSchema,
  cause: z.enum(["source_deleted", "source_tombstoned"]),
  candidateId: idSchema,
  sourceBreakdownId: idSchema,
  scratchBitId: idSchema,
  occurredAt: timestampSchema,
});

export type CandidateOrphanAuditEvent = z.infer<
  typeof candidateOrphanAuditEventSchema
>;

// Non-domain, current-tab forced-reload identity. Parsed on session read.
export const pendingOperationRecoverySchema = z.object({
  operationId: repositoryOperationIdSchema,
  kind: z.literal("archive_scratch"),
  scratchBitId: idSchema,
  expectedVersion: versionSchema,
  startedAt: timestampSchema,
});

export type PendingOperationRecovery = z.infer<
  typeof pendingOperationRecoverySchema
>;
```

Each command request in the operation matrix composes
`repositoryOperationIdSchema`, the applicable entity ID schemas, and
`versionSchema`; result entities are parsed with their full schemas before
return. The recovery descriptor is validated on every `sessionStorage` read;
invalid descriptors are discarded and never used to issue a mutation.
`version` has no general-schema default: repository create paths and the v4
migration explicitly write `1`, and every later direct mutation writes the
next value. Public create/update payloads omit `version`; callers cannot reset
or supply it through the current `Partial<Node>` / `Partial<Bit>` boundary.
Implementation must replace those broad patch types with repository-owned
update inputs that exclude IDs, creation metadata, and `version`.

---

## Repository Operation Contract

Inbox/Triage mutations use one shared command/result contract through the
DataStore/repository boundary. Components and reactive hooks project these
results; they do not sequence store writes themselves.

### Identity, compare-and-set, and results

- `RepositoryOperationId` is a UUID created once when a logical mutation is
  confirmed. Every retry and reconciliation of that attempt reuses it. A new
  user-confirmed attempt after a terminal rejection/failure receives a new
  operation ID.
- IDs for records that may be created (`breakdownId`, `candidateId`, and
  placement `resultId`) are preallocated before the command. Retrying never
  allocates a replacement ID. Primary/unique constraints and these stable IDs
  are the create-operation idempotency keys. After a terminal Delete/Unstage/
  Undo, a new user-confirmed create attempt allocates a new record ID; deleted
  IDs are never reused for a different logical record. The only intentional
  same-ID recreation is staged-candidate Undo, and its higher version makes it
  distinguishable from the original Stage postcondition.
- A command carries every stable target ID plus the `expectedVersion` of each
  mutable source/candidate/result it is allowed to change. Placement also
  carries the expected ancestor ID chain and intended target parent ID; it
  never relies on a title or path-label snapshot as identity.
- `version` starts at `1`. Inside the same read-write transaction, the
  repository reads the current record, verifies exact expected-version and
  lifecycle equality, performs all writes, and increments each changed
  surviving record exactly once. Rejected/no-op commands do not increment.
  Candidate recreation during Undo uses its prior version plus one.
- Every create/hard-delete inverse pair advances a surviving monotonic owner
  so an older ambiguous operation cannot mistake a later inverse transition
  for `not_applied`: Breakdown Add/Delete increments the owning Scratch Bit
  version; Stage/Unstage/placement/Undo increments the source Breakdown row
  version; Trash Scratch and Trash restore each increment the Scratch version. Reconciliation accepts `not_applied` only when the complete original
  precondition, including those versions, still holds. A later inverse action
  therefore produces `conflict`, never resurrection (ABA protection).
- Node/Bit `version` advances for direct mutations of that record's editable,
  position, status, or lifecycle fields. An automatic `mtime` cascade caused
  only by adding/removing a child does not advance the parent's `version`;
  Undo checks surviving descendants separately so a parent can become
  reversible again after reversible children are undone. The explicit
  exception is a Scratch Bit acting as the aggregate owner for Breakdown
  Add/Delete, where collection membership advances the Scratch version.
- `mtime` may change in the same transaction under Hook 1 but is never read as
  the CAS token or as proof that an operation ran.

The authoritative repository result is one of:

| Status | Meaning |
|--------|---------|
| `applied` | This transaction committed and returns its authoritative entities/versions and postcondition |
| `already_applied` | A reconciliation query proves the requested postcondition already holds for the stable IDs; no new write ran |
| `not_applied` | The exact expected precondition still holds and none of the command's writes occurred; an allowed manual Retry may reuse the same operation ID |
| `rejected` | Commit-time lifecycle, uniqueness, target, capacity, title-limit, or blocker validation failed before any write; latest authoritative state is returned |
| `conflict` | Current state is neither the expected precondition nor the complete postcondition; no automatic retry, overwrite, cascade, or compensation is permitted |

Transport timeout, offline, or an unqueryable repository produces
`outcome: "unknown"`, which is not an authoritative mutation result. The
caller retains the same operation identity and pending/reconciling
presentation and invokes the command's reconciliation query. It must not infer
success from matching content/title or resend blindly.

### Atomic command matrix

Every row below is one all-or-nothing repository transaction over the named
stores. Validation failure writes nothing.

| Command | Stable request and transaction-time validation | Atomic writes and authoritative postcondition | Reconcile / retry query |
|---------|------------------------------------------------|-----------------------------------------------|-------------------------|
| Add Breakdown | `operationId`, preallocated `breakdownId`, `scratchBitId`/`scratchExpectedVersion`, snapshotted non-empty `content`. Require an active Inbox-parented Scratch at the exact version, require `breakdownId` absent, and compute next `order` from authoritative rows inside the transaction. | Insert one row with the stable ID, transaction `createdAt`, `consumedAt: null`, and `version: 1`; increment the Scratch version once. Postcondition: that exact row exists and the Scratch is at `scratchExpectedVersion + 1`. Duplicate Enter/Add/blur never creates another ID. | Exact row at v1 plus next Scratch version = applied. Row absent plus the exact original Scratch version/lifecycle = not applied. Any other row or Scratch revision/lifecycle = conflict; a later Delete cannot be mistaken for an uncommitted Add. Retry reuses IDs/content. |
| Save Scratch title | `operationId`, `scratchBitId`, `expectedVersion`, base title/lifecycle, and intended non-empty title. Require active Scratch and exact version. | Update title and `mtime`; increment `version` once. Postcondition: intended title at `expectedVersion + 1`. | Intended title plus next version = applied; base title/version = not applied; any other value/version/lifecycle = inline conflict or invalidation. |
| Save Breakdown content/order | `operationId`, row ID, `expectedVersion`, intended fields. Require matching active (`consumedAt: null`) row and no candidate for its source ID. | Update allowed fields and increment row `version` once. Postcondition: intended values at the next version. | Intended values/next version = applied; base values/version and no candidate = not applied; otherwise conflict/lifecycle invalidation. |
| Delete Breakdown | `operationId`, row ID/`expectedVersion`, and owner Scratch ID/`scratchExpectedVersion`. Require the exact active/unconsumed row, active Scratch, and no candidate; never auto-unstage or cascade a candidate. | Hard-delete only that row and increment the owning Scratch version once. Postcondition: row absent, candidate absent, and Scratch at `scratchExpectedVersion + 1`. | Exact absence plus next Scratch version = applied. Exact active row/source versions plus candidate absence = not applied. Any later row/candidate/Scratch revision or lifecycle = rejected/conflict. The in-place deleting projection remains until terminal. |
| Stage | `operationId`, preallocated `candidateId`, `scratchBitId`, source row ID/`expectedVersion`, `resultType`. Require active Scratch, matching active source row, exact row version, candidate ID absent, and unique `sourceBreakdownId` absent. | Insert the exact `stagedCandidates` row at version 1 and increment the still-unconsumed source row version once. Postcondition: candidate ID/source/type/lifecycle/version 1 exists and source is unconsumed at `expectedVersion + 1`. | Exact candidate v1 plus source next version = applied. No candidate plus source at the exact original version/lifecycle = not applied. Candidate recreation at a later version, candidate absence after Unstage, or any other source/candidate revision = conflict/rejected; Retry cannot restage after a later Unstage. |
| Unstage | `operationId`, candidate ID/`candidateExpectedVersion`, and source row ID/`sourceExpectedVersion`. Require the exact staged candidate and matching unconsumed source. | Delete only the candidate and increment the source row version once; content, `createdAt`, `order`, and `consumedAt` do not change. Postcondition: candidate absent and source unconsumed at `sourceExpectedVersion + 1`. | Candidate absent plus source next version = applied. Exact candidate/source base versions = not applied. A later Stage, placement, edit, deletion, or other revision = conflict. Orphan cleanup is not Unstage. |
| Place staged candidate | `operationId`, preallocated result Node/Bit ID, candidate ID/version, source row ID/version, validated result title/type, target parent ID and expected ancestor chain. Revalidate Scratch/source/candidate identity, title limit, reachable active target/type/path, and an exact free cell immediately before write. | Create the result at the stable ID/cell, set source `consumedAt` to the shared transaction timestamp and increment source version, and delete the candidate. Postcondition requires all three: exact result exists, source is consumed at next version, candidate is absent. | All postconditions = applied; result absent + unchanged source/candidate = not applied; any partial/mismatched state = conflict and never compensation. |
| Place direct row | Same as staged placement but no candidate: require source active/unconsumed, exact version, and candidate absence. Direct title limits are enforced before and again inside the command (`1–100`: Node/Bit, `101–200`: Bit only, `201–1000`: neither). | Create result and consume/increment source together. Postcondition requires exact result plus consumed source at next version. | Both = applied; neither with unchanged source = not applied; one-sided/mismatched state = conflict. No silent truncation or alternate target. |
| Undo placement | `operationId`, original stable result/source/candidate IDs, placement post-state versions/timestamps, result creation snapshot, and staged/direct provenance held by the mounted page. Revalidate result lifecycle/direct-record version and creation fields, source consumed state/version, an active owning Scratch (`deletedAt == null` and `archivedAt == null`), candidate uniqueness, and zero surviving descendants/unknown result mutation. An inactive owning Scratch is `rejected` with no write, so Undo never restores a row or recreates a candidate under a trashed or archived Scratch. | Delete the result and restore source to `consumedAt: null` with one version increment. For staged provenance, recreate the original candidate identity/type/`createdAt` at prior candidate version + 1 and `updatedAt = now`; for direct provenance create no candidate. | Complete source restoration plus result absence (and correct staged candidate presence/absence) = applied; exact placement post-state = not applied; any mutation/dependency/partial state = conflict. No cascade or best-effort source restore. |
| Confirmed candidate orphan cleanup | `operationId`, preallocated audit-event ID, exact candidate ID/version/source/Scratch/type, and authoritative `source_deleted` or `source_tombstoned` proof. Cache miss, offline, or delayed subscription fails validation. Planned aggregate deletion is a different command. | In one transaction delete the candidate and append exactly one `candidateOrphanAuditEvents` row. Postcondition: candidate absent and the unique event contains the same candidate/source/Scratch/cause. | Exact event plus candidate absence = applied. Candidate/source precondition with no event = not applied. A different event, changed candidate, or unproven source state = conflict/rejected. Unique `candidateId` prevents duplicate audit append. |
| Archive Scratch | `operationId`, Scratch ID/`expectedVersion`, and a caller assertion that the page-local Add draft and Scratch-title editor blockers are clear. Immediately before repository dispatch, the operation coordinator rechecks those transient blockers. Inside the transaction require an active Scratch, at least one consumed row, zero unconsumed rows, and zero staged candidates. | Set only the Scratch `archivedAt` to the transaction timestamp, update `mtime` under existing rules, and increment its version once. Rows/candidates are neither deleted nor rewritten. Postcondition: the exact Scratch is archived at the next version and Archive View restore remains available. | Archived Scratch at next version = applied; active Scratch at expected version with durable eligibility still true = not applied; changed lifecycle/version/eligibility = rejected/conflict. Pool removal/next selection waits for this terminal result. |
| Trash Scratch | `operationId`, Scratch ID/`expectedVersion`, and the exact staged-candidate set the confirmation showed: each candidate ID/version with its source row ID/version (possibly empty). Immediately before dispatch the operation coordinator checks that no Inbox operation is pending and locks Scratch-switching actions; page-local drafts/editors for this Scratch were disclosed by the confirmation and are discarded only after success. Inside the transaction require an active Inbox-parented Scratch at the exact version and require the current `stagedCandidates` set for that Scratch to equal the submitted set, with every candidate and source row at its submitted version. | Set the Scratch `deletedAt` to the transaction timestamp and increment its version once; touch the Inbox Node `mtime` under Hook 1. For each submitted candidate, hard-delete it and increment its unconsumed source row version once (the Unstage effect; content, `order`, `createdAt` and `consumedAt` unchanged). No other row is deleted or rewritten, and no orphan-audit event is written. Postcondition: Scratch trashed at `expectedVersion + 1`, every submitted candidate absent, and each of their sources unconsumed at submitted version + 1. | Complete postcondition = applied/already applied. Active Scratch at the exact version with the exact submitted candidate set and source versions = not applied. Any other Scratch version/lifecycle, an added/removed/changed candidate, or a changed source = conflict; the user re-confirms against the latest state as a new operation. Reload needs no recovery descriptor: the Pool converges from durable Scratch state. |

Target reachability, type, path, and capacity checks for placement run in the
same transaction as result/source/candidate writes. The page-local Archive
blockers cannot be read by IndexedDB, so they are synchronously rechecked and
locked by the operation coordinator immediately before transaction dispatch;
the durable eligibility predicates are then independently revalidated inside
the transaction. Neither layer treats a stale UI snapshot as authority.

### Operation reconciliation without a journal

No general operation-log, journal, outbox, or offline mutation queue is
selected by this amendment. Current Dexie operation status is derived from
stable target IDs, the surviving Scratch/row revisions that prevent inverse
ABA, complete authoritative postconditions, and the transaction result above.
`candidateOrphanAuditEvents` proves only its named integrity cleanup and may
not answer arbitrary operation status. Future BaaS mutations must preserve the
same conditional writes and monotonic evidence (for example, a transaction/DB
function plus primary/unique constraints). If a future remote API cannot prove
these pre/postconditions, it requires a later canonical durable idempotency
receipt; this document does not preapprove a generic log.

For a forced reload that must resume an unresolved Archive, the current tab
stores one minimal `PendingOperationRecovery` descriptor in browser
`sessionStorage` **before** dispatch:

```typescript
type PendingOperationRecovery = {
  operationId: string;
  kind: "archive_scratch";
  scratchBitId: string;
  expectedVersion: number;
  startedAt: number;
};
```

This descriptor is reload-scoped identity, not domain truth: it contains no
draft text, mutation payload, pending presentation, result cache, or queued
work; it is not synchronized and is cleared after a terminal reconcile. It is
validated and written successfully before Archive dispatch; unavailable,
quota-failed, or rejected `sessionStorage` fails closed and does not start the
Archive mutation. On reload it is read before the initial Inbox projection.
The recovery call retains the same operation ID for correlation but, because
Dexie has no operation-ID index, classifies the result from the target
Scratch's exact `version`/`archivedAt` and the authoritative Breakdown/
candidate eligibility postconditions. The UI then converges to archived/removed,
not-applied completion/reopen, or unresolved recovery presentation. Other
drafts and page/session state retain their selected non-durable lifetimes and
are never converted into this descriptor.

Minimum implementation conformance cases are mandatory before this contract
is code-ready:

- ambiguous Add, followed by confirmed Delete, reconciles as conflict and
  never recreates the row;
- ambiguous Stage, followed by confirmed Unstage, reconciles as conflict and
  never recreates the candidate;
- a candidate recreated by Undo at version greater than `1` cannot satisfy the
  original Stage postcondition;
- public Node/Bit/Breakdown update inputs cannot set/reset `version`, every
  direct mutation increments exactly once, and `mtime`-only cascades do not;
- Archive dispatch fails closed when its recovery descriptor cannot be stored,
  and reload reconciliation reads Scratch/postcondition state rather than an
  operation-log entry;
- an ambiguous Trash Scratch, followed by a confirmed Trash restore,
  reconciles as conflict (the restore advanced the Scratch version) and never
  re-trashes; a candidate staged after the confirmation was shown makes Trash
  conflict instead of removing an undisclosed candidate; and
- Undo whose owning Scratch was trashed or archived is rejected with no write.

---

## Application Hooks

No database triggers — all side effects are handled at the application layer. These hooks **must** be enforced by the data access layer (repository/service), not by individual components.

### 1. mtime Cascade

When any of these actions occur, reset `mtime = Date.now()` on the affected item:

| Action | Updates mtime on |
|--------|-----------------|
| Edit title, description, or properties of a Node | That Node |
| Edit title, description, or properties of a Bit | That Bit |
| Complete or uncomplete a Chunk | Parent Bit **AND** parent Node (two-level cascade) |
| Add or remove a Chunk from a Bit | Parent Bit **AND** parent Node |
| Add or remove a child Node or Bit from a Node | That parent Node |
| Complete or uncomplete a Bit | That Bit **AND** parent Node |

**Does NOT reset mtime:** Opening/viewing an item, repositioning on the grid.

`mtime` cascades and monotonic `version` are separate. A direct durable
mutation of a Node/Bit advances its own version; a parent touched only because
a child changed keeps its prior version so reversible-child Undo can restore
parent eligibility. Scratch/row CAS never compares `mtime`.

### 2. Deadline Hierarchy Constraint

Hard rule: **a child's deadline/time cannot exceed its parent's deadline.** Enforced at two levels:

| Relationship | Constraint |
|-------------|------------|
| Node → Bit | `bit.deadline <= parentNode.deadline` (when both have deadlines) |
| Bit → Chunk | `chunk.time <= parentBit.deadline` (when both have values) |

**Enforcement scenarios:**

1. **Child scheduled past parent deadline** → Block the action. Surface modal: "Child cannot exceed parent's deadline. Update parent's deadline too? Yes/No."
   - Yes → Extend parent deadline to accommodate child.
   - No → Cancel the action. Child retains previous value.

2. **Parent deadline shortened** → Find all children whose deadline/time exceeds the new parent deadline. Mark each as conflicting. Surface per-item: blur + "Modify timeline" overlay with check/x icon buttons.
   - Check → Open item for date editing.
   - X → Keep conflicting date (item remains in conflict state visually).

### 3. Bit Auto-Completion

When a Chunk's status changes to `"complete"`:
1. Query all Chunks for the parent Bit.
2. If every Chunk has `status === "complete"` → set `bit.status = "complete"`.
3. Apply mtime cascade (Hook 1).

When a Chunk's status changes back to `"incomplete"`:
1. If parent Bit was `"complete"` → set `bit.status = "active"`.
2. Apply mtime cascade (Hook 1).

> **`scratchBreakdowns` exclusion:** Breakdown rows live in a dedicated store, not as Chunks — they do **not** participate in this hook. Placing/consuming breakdown rows never triggers Bit auto-completion.

### 4. Cascade Soft-Delete (Trash)

System nodes (`systemRole !== null` — Inbox and Archive View) **cannot be soft-deleted / trashed**; the UI must not offer Trash for them. "Remove from grid" uses `hiddenFromGrid = true` instead. (Because hard-delete only happens from Trash, Hook 6 is therefore unreachable for system nodes. This mirrors the archive exclusion in Hook 10.)

When a **Node** is soft-deleted (`deletedAt = Date.now()`):
1. Recursively find all descendant Nodes (children, grandchildren, etc.).
2. Find all Bits whose `parentId` matches any of these Nodes.
3. Set `deletedAt = Date.now()` on all found Nodes and Bits.
4. Chunks are implicitly trashed — no update needed (they become inaccessible via their trashed parent Bit).

When a **Bit** is soft-deleted:
1. Set `deletedAt = Date.now()` on the Bit only.
2. Chunks are implicitly trashed.

An Inbox-parented Scratch is trashed from the Inbox only through the
`Trash Scratch` command in the
[atomic command matrix](#atomic-command-matrix), which also removes its staged
candidates. Its Breakdown rows stay in `scratchBreakdowns` for restore. Trash
restore uses Hook 5 unchanged and must keep the Scratch's `x = 0, y = 0`
sentinel (Hook 8 exemption); it recreates no candidate.

### 5. Cascade Restore

When a **Node** is restored (`deletedAt = null`):
1. If the Node's `parentId` points to another trashed Node → auto-restore the parent chain (no orphans). Each auto-restored Node uses BFS nearest-empty-cell placement if its original `(x, y)` is occupied.
2. Restore all descendant Nodes and Bits that were trashed in the same cascade operation.
3. For each restored item: if original `(x, y)` is occupied → BFS nearest-empty-cell from original position.

When a **Bit** is restored (`deletedAt = null`):
1. If parent Node is trashed → auto-restore parent Node (and its parent chain if needed).
2. If original `(x, y)` is occupied → BFS nearest-empty-cell.

### 6. Cascade Hard-Delete (Permanent)

When a Node or Bit is permanently deleted from trash:
1. **Node:** Delete the Node, all descendant Nodes, all descendant Bits, and all Chunks belonging to those Bits.
2. **Bit:** Delete the Bit and all its Chunks.

If a permanent-delete closure still owns Scratch Breakdown sources and their
staged candidates, delete the sources and candidates together in the same
planned aggregate transaction. This is not orphan cleanup because the source
was present when the closure was computed; do not manufacture orphan-audit
events for normal cascade deletion. If a candidate already lacks its source
before that transaction, route it through the separately audited confirmed-
orphan command instead of silently cascading it.

### 7. Trash Auto-Cleanup

Items with `deletedAt` older than 30 days are permanently deleted (Hook 6). Check on app startup and periodically during usage.

### 8. Grid Cell Uniqueness

Before inserting or moving a Node/Bit to `(parentId, x, y)`:
1. Query both `nodes` and `bits` stores for active items at that cell.
2. If occupied → reject the operation (or trigger BFS auto-placement).
3. **Exception:** Bits whose `parentId` is the Inbox system Node ("Scratch") are exempt — they use the `x = 0, y = 0` sentinel and are not subject to cell uniqueness. The Triage layout orders them by `createdAt`.

### 9. Bit-to-Node Promotion

This hook applies only to ordinary, non-Scratch Bits. A Bit whose parent Node
has `systemRole: "inbox"` is a Scratch and **cannot** be promoted to a Node,
regardless of whether it currently has Breakdown rows, staged candidates, or
Chunks. The repository rejects that identity before allocating result IDs or
writing any Node, Bit, Chunk, Breakdown, candidate, or audit store.

Scratch uses the dedicated `scratchBreakdowns` store rather than Chunk reuse,
so Hook 9's Chunk-to-child-Bit expansion has no defined Scratch meaning. The
rejection does not delete or migrate Breakdown rows or candidates, and data
presence never enables or disables the rule.

When a Bit is promoted to a Node:
1. Create a new Node with the Bit's `title`, `icon`, `deadline`. Assign default `color`. Set `level = parentNode.level + 1` (same level as the Bit's grid position).
2. For each Chunk in the Bit: create a new Bit inside the new Node. Map `chunk.title` → `bit.title`, `chunk.time` → `bit.deadline`, `chunk.timeAllDay` → `bit.deadlineAllDay`. Auto-place via BFS.
3. Delete the original Bit and its Chunks.

### 10. Archive Cascade

System nodes (`systemRole !== null`) **cannot** be archived — the UI must not offer "Archive" for them.

When a **Node** is archived:
1. Create one shared timestamp: `const archiveTimestamp = Date.now()`.
2. Set `archivedAt = archiveTimestamp` on the Node and all descendant Nodes and Bits (same cascade pattern as Hook 4). The single shared timestamp lets restore identify cascade members.
3. Chunks become inaccessible via the archived parent Bit (no update needed).

When a **Bit** is archived:
1. Set `archivedAt = Date.now()` on the Bit.

For Inbox/Triage Scratch Archive, the generic Bit path is wrapped by the
`Archive Scratch` command: exact eligibility is checked in the same
transaction and the Scratch's `version` increments. Archive is not hard
delete; `scratchBreakdowns` and any history required for restore remain.

Completion never triggers this hook — archive is a manual lifecycle action and completion stays purely computed (see nodes/bits Completion notes). Completed-but-unarchived items remain on the grid.

### 11. Archive Restore

Uses the same ±5-second timestamp-window approach as trash restore (`isWithinRestoreWindow`).

When a **Node** is restored:
1. Find descendants whose `archivedAt` is within ±5s of this Node's `archivedAt`.
2. Set `archivedAt = null` on matched descendants only — items independently archived before the cascade stay archived.
3. If original `(x, y)` is occupied → BFS auto-placement.

When a **Bit** is restored:
1. If the parent Node is archived → restore the parent chain (same window rule).
2. If original `(x, y)` is occupied → BFS auto-placement.

### Scratch Bit Permanent Deletion

When a Scratch Bit is hard-deleted (after trash retention or explicit purge),
all associated `scratchBreakdowns` rows and candidates are hard-deleted in the
same planned aggregate transaction. This normal cascade creates no orphan-
audit event. A candidate whose source is already authoritatively absent before
the cascade uses the confirmed-orphan command and event instead. **Archiving**
a Scratch Bit does not trigger either cleanup — archived Scratch retains its
breakdown history for a potential restore.

### 12. Monotonic Version / CAS

- New Nodes, Bits, Scratch Breakdown rows, and staged candidates start at
  `version = 1`; the v4 migration backfills legacy rows to `1`.
- Scratch title and Breakdown content/order saves require exact
  `expectedVersion` and a saveable lifecycle inside the write transaction.
  The write and increment to `expectedVersion + 1` commit together.
- Breakdown Add/Delete increments the owning Scratch Bit version. Stage/
  Unstage and placement/Undo increments the surviving source row version even
  when its text is unchanged. These aggregate/lifecycle increments are the
  durable evidence that prevents Add→Delete and Stage→Unstage ABA from being
  mistaken for an operation that never ran.
- All direct durable lifecycle mutations of these records use the same
  monotonic increment discipline so a stale editor cannot pass after an
  external archive, consume, restore, or direct mutation. Candidate
  existence is additionally checked for row Save/Delete.
- Stale comparison rejects the write and returns current value, version, and
  lifecycle. `use mine` is a new conditional save against the latest version
  the user acknowledged; `use latest` performs no write.
- Reload/reconnect fetches the authoritative entity. Intended value at the
  next version is success; unchanged base value/version is not-applied/Retry;
  anything else is conflict or lifecycle invalidation. There is no
  last-write-wins fallback.

### 13. Staged Candidate Integrity

Stage, Unstage, staged-source Save/Delete, placement, Undo, Trash Scratch, and
orphan cleanup transact over `bits`, `scratchBreakdowns`, `stagedCandidates`, and (for a
confirmed orphan only) `candidateOrphanAuditEvents` as their command requires.
The repository enforces:

1. candidate `scratchBitId` equals the source row owner;
2. source is unconsumed and its Scratch is active when Stage/placement needs
   it;
3. unique `sourceBreakdownId` is checked by the database constraint and in
   transaction-time validation;
4. staged-source Edit/Delete rejects without auto-unstage, edit propagation,
   or candidate cascade;
5. source staged presentation is derived only from candidate existence; and
6. authoritative orphan proof precedes atomic candidate cleanup and append-
   only audit creation. A normal candidate query never renders an unresolved
   source miss as a valid card; and
7. Trash Scratch removes exactly the confirmed candidate set as a planned
   lifecycle cascade, not orphan cleanup, so it writes no audit event and
   leaves no candidate owned by an inactive Scratch.

### 14. Inbox/Triage Atomic Operations

Add, Save, Delete, Stage, Unstage, staged/direct placement, Undo, confirmed
orphan cleanup, Scratch Archive, and Trash Scratch use the
[Repository Operation Contract](#repository-operation-contract).
Their transaction result is the only success authority. Components may show
pending projections but may not optimistically clear/remove source truth,
create a second operation, or compensate one side after a partial error.

### 15. Scratch Archive Eligibility

Durable eligibility for a selected Scratch is:

```text
Scratch exists and deletedAt == null and archivedAt == null
AND count(rows WHERE consumedAt != null) >= 1
AND count(rows WHERE consumedAt == null) == 0
AND count(stagedCandidates WHERE scratchBitId == Scratch.id
          AND lifecycle == "staged") == 0
```

The explicit consumed-row count prevents vacuous empty-`every()` eligibility.
All-staged and all-deleted-without-consumption Scratches are ineligible;
consumed rows plus deletion of remaining active rows may be eligible. A
non-empty Add draft and an open/dirty/saving/conflicted/reconciling Scratch
title editor are page-local blockers: they do not alter the persisted formula,
but the operation coordinator must recheck them immediately before dispatch
and must not invoke Archive while either exists. The repository transaction
then independently revalidates the full durable formula and Scratch version
before setting `archivedAt`.

---

## Key Queries

> **Lifecycle filter (archive sweep):** Every "active items" query below must filter `archivedAt = null` **in addition to** `deletedAt = null`. L0 grid rendering must also exclude `hiddenFromGrid = true`. Applies to: Active grid contents, Node completion check, All calendar items, Items pool, Badge computation, Global urgency, Text search, Grid occupancy, Aging state. Trash queries (Trashed items, Trash auto-cleanup) continue to key off `deletedAt` only.

| Query | Used by | Stores | Pattern |
|-------|---------|--------|---------|
| Active grid contents | Grid view (any level) | `nodes`, `bits` | Filter both stores by `parentId = X` AND `deletedAt = null` AND `archivedAt = null`. L0 also excludes `hiddenFromGrid = true`. Combine results. Use compound index `[parentId, deletedAt, archivedAt]` |
| Chunks for Bit (ordered) | Bit detail popup | `chunks` | Filter by `parentId = bitId`, sort by `order` ASC. Use compound index `[parentId, order]` |
| Node completion check | Node completion indicator | `bits` | Filter by `parentId = nodeId` AND `deletedAt = null` AND `archivedAt = null`. Check if every result has `status = "complete"`. Use compound index `[parentId, status]` |
| All calendar items | Calendar:Weekly / Monthly | `bits`, `chunks` | **Bits:** filter `deletedAt = null` AND `archivedAt = null` AND `deadline != null`, sort by `deadline`. **Chunks:** filter `time != null`, join with non-deleted, non-archived parent Bits. Use `idx_bits_deadline`, `idx_chunks_time` |
| Items pool (Calendar) | Calendar left panel | `bits`, `chunks` | All active Bits (`deletedAt = null` AND `archivedAt = null`) + all Chunks with non-deleted, non-archived parents. Sort: deadline items first (by priority rank, then deadline), no-deadline items below |
| Trashed items | Trash zone | `nodes`, `bits` | Filter `deletedAt != null`. Group by top-level trashed Node (the Node whose parent is NOT trashed). Show child counts |
| Badge computation | Node badge overlay | `bits`, `nodes` | For a given Node, find direct child Bits/Nodes (`deletedAt = null` AND `archivedAt = null`) with deadlines. Compute urgency level for each. Return the most urgent state |
| Global urgency | Calendar icon notification dot | `bits`, `nodes` | Scan all active items (`deletedAt = null` AND `archivedAt = null`) with deadlines across all stores. Find the most urgent item. Return its urgency level |
| Text search | Search overlay | `nodes`, `bits`, `chunks` | Client-side filter: iterate all active items (`deletedAt = null` AND `archivedAt = null`; Chunks via non-deleted, non-archived parents), match `title` against search term (case-insensitive substring). Return with type, parent path, deadline |
| Grid occupancy | BFS auto-placement | `nodes`, `bits` | Filter both stores by `parentId = X` AND `deletedAt = null` AND `archivedAt = null`. Collect all `(x, y)` pairs into an occupied-cells set |
| Aging state | Grid rendering | `nodes`, `bits` | Operates on grid-visible items only (`deletedAt = null` AND `archivedAt = null`; L0 also `hiddenFromGrid = false`). Compute `daysSinceMtime = (Date.now() - item.mtime) / 86400000`. Apply: 0–5 = Fresh, 6–11 = Stagnant, 12+ = Neglected |
| Trash auto-cleanup | App startup / periodic | `nodes`, `bits` | Filter `deletedAt != null` AND `deletedAt < Date.now() - (30 * 86400000)`. Permanently delete matches (Hook 6) |
| Breakdown rows for Scratch | Breakdown, CAS, placement, Archive | `scratchBreakdowns` | Filter `scratchBitId = X`. Display sort: `createdAt` DESC/ASC, then `order`, then stable `id`; lifecycle projections filter/derive active, staged, or consumed. Use `[scratchBitId, createdAt]` or `scratchBitId` |
| Staged candidates for Scratch/type | Staging and remote reconciliation | `stagedCandidates`, `scratchBreakdowns` | Filter `scratchBitId = X`, `lifecycle = "staged"`, optionally `resultType`; sort `createdAt` DESC then `id`; join `sourceBreakdownId` to the authoritative row and never use candidate-local display text |
| Candidate by source | Stage uniqueness and staged-source guards | `stagedCandidates` | Unique lookup by `sourceBreakdownId`. Presence derives staged state and blocks source Edit/Delete; absence restores stage eligibility when the row remains active |
| Archive eligibility | Completion and Archive transaction | `bits`, `scratchBreakdowns`, `stagedCandidates` | Read the active Scratch, require consumed count ≥ 1, unconsumed count = 0, and staged count = 0. Do not implement as `rows.every(...)` without the explicit consumed guard. Re-run inside Archive transaction |
| CAS entity reload | Scratch/row/candidate reconcile | `bits`, `scratchBreakdowns`, `stagedCandidates` | Primary-key read returns value, lifecycle, and monotonic version. Compare exact expected precondition versus complete intended postcondition; never compare `mtime` |
| Operation reconciliation | Add/Delete/Stage/Unstage/placement/Undo/orphan cleanup/Archive/Trash Scratch | Command-specific authoritative stores | Query the stable record/result/candidate/source IDs and the surviving Scratch/row expected/next versions listed in the command matrix. Classify complete precondition, complete postcondition, or conflict; inverse operations advance the surviving revision, so there is no ABA-based Retry and no general operation-log lookup |
| Candidate orphan confirmation | Repository integrity | `stagedCandidates`, `scratchBreakdowns`, `candidateOrphanAuditEvents` plus future remote authority | Resolve source by stable ID. Cache miss/offline/delay returns unresolved, not orphan. Only authoritative deletion/tombstone permits atomic candidate deletion plus unique append-only audit creation |

---

## Dexie Migration Target

The current database remains v3 until implementation work is separately
approved. The canonical implementation target is **Dexie version 4**, declared
after the existing v1, v2, and v3 definitions so Dexie runs every earlier
upgrade in order for older databases.

The affected v4 store/index declarations are:

```typescript
this.version(4)
  .stores({
    nodes:
      "id,parentId,deletedAt,[parentId+deletedAt],level,systemRole,archivedAt,[parentId+deletedAt+archivedAt]",
    bits:
      "id,parentId,deletedAt,[parentId+deletedAt],status,deadline,[parentId+status],archivedAt,[parentId+deletedAt+archivedAt]",
    scratchBreakdowns:
      "id,scratchBitId,[scratchBitId+order],[scratchBitId+createdAt]",
    stagedCandidates:
      "id,&sourceBreakdownId,scratchBitId,lifecycle,[scratchBitId+lifecycle],[scratchBitId+resultType+createdAt]",
    candidateOrphanAuditEvents:
      "id,&candidateId,sourceBreakdownId,scratchBitId,occurredAt,[scratchBitId+occurredAt]",
  })
  .upgrade(/* one atomic v4 backfill + validation transaction */);
```

`version` is deliberately not an IndexedDB index; CAS reads by primary key.
`chunks` and `settings` retain their prior declarations and data. Migration
ordering and behavior are:

1. Preserve the v3 upgrade exactly: it creates `scratchBreakdowns` and
   backfills the existing archive/system-node fields before v4 runs.
2. Dexie installs the v4 candidate/integrity-audit stores and affected
   indexes. Both `stagedCandidates` and `candidateOrphanAuditEvents` start
   empty. Do not infer durable candidates or historical orphan events from
   Zustand/page-memory labels, consumed rows, title equality, drafts, or any
   other session projection.
3. In the same v4 upgrade transaction, set missing `Node.version`,
   `Bit.version`, and `ScratchBreakdown.version` to `1`. Preserve any existing
   integer version ≥ 1; never derive it from `mtime` or a timestamp.
4. Reconcile the existing canonical/default gap by setting missing
   `pastDeadlineDismissed` on legacy Nodes/Bits to `false`. Preserve existing
   booleans. Preserve all existing IDs, titles/content, orders, `createdAt`,
   `mtime`, `consumedAt`, `deletedAt`, and `archivedAt` values exactly.
5. Validate every backfilled Node, Bit, and Scratch Breakdown against the
   target Zod shape and validate that each Breakdown owner resolves to an
   Inbox-parented Scratch Bit. Validation checks the known target fields while
   preserving tolerated unknown legacy fields (for example the documented
   orphaned Node `description`); it does not silently strip or rewrite them.
6. If a required legacy value/reference is invalid, or a required timestamp,
   ID, content value, or owner is missing, throw a structured migration error
   and abort v4. The upgrade transaction rolls back and the database remains
   at v3. Do not delete, quarantine, invent UUIDs/timestamps/content, mark rows
   consumed, or manufacture a candidate to make validation pass.

After v4, every create/write is parsed at the Zod write boundary. Reads remain
trusted under the existing architecture because the one-time migration has
validated legacy rows and repository writes validate new rows.

---

## Durable / Non-Durable Ownership Boundary

Durable product/integrity truth in this amendment is limited to the existing
entities, their monotonic versions, `stagedCandidates`, and the narrowly scoped
`candidateOrphanAuditEvents`. The audit store is not operation history. The
following remain outside IndexedDB/domain truth: selected Scratch, Pool
expanded/collapsed and manual
reopen exceptions, Pool/Explorer queries and scroll, Add/Edit base snapshots
and drafts, pending/deleting/reconciling presentation, placement/type/result
title drafts, remote-arrival counters, archive overlay open/Cancel state,
newly-placed markers/pinning, and Undo availability/dependency projections.
Only the minimal reload identity descriptor specified above may cross a forced
reload, and it contains no product payload or queued mutation.

This document owns data and operation semantics only. It does not select copy,
layout, color, animation, focus-surface appearance, or another visual fallback
for `VQ-01`–`VQ-12`. Their approved recipe prerequisites remain user/phase
owned, and exact implementation files beyond the current schema/DataStore/
IndexedDB and reactive-hook boundaries remain future planning work.

---

## Schema Gate

### SCHEMA-GATE-01 — Orphan-cleanup audit owner (resolved in draft)

**Status:** Resolved by canonical derivation; pending approval with the rest of
this SCHEMA amendment.

The selected decision already requires a confirmed orphan candidate to be
removed atomically **and** leave a durable event containing cause, candidate
ID, source Breakdown ID, and event time. `LAND-SCHEMA-CANDIDATE` delegates its
exact owner/shape to this document, so no new product-policy choice is needed.
The narrow append-only `CandidateOrphanAuditEvent` /
`candidateOrphanAuditEvents` contract above is that owner. It adds Scratch ID
for repository diagnosis, applies no automatic retention in v4, and is written
only by repository integrity cleanup in the same transaction as candidate
deletion.

This resolution does not repurpose `settings`, does not audit planned
aggregate deletion, and does not create an operation-log, journal, outbox, or
offline queue. The remaining user action is approval or revision of the
complete proposed SCHEMA amendment; SPEC derivation remains blocked until that
document gate passes.
