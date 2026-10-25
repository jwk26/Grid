# Phase 43 — Ordinary Write Functions

## Completion-time scope

Closed 2026-10-25. Tasks 219–220 are user-accepted. SaaS lane, part 2: the
ordinary write functions that replace the Dexie write paths. Task 219 ported
the Node, Bit and Chunk writes (`create_node`, `create_bit`, `update_bit`,
`create_chunk`, `update_chunk`, `delete_chunk`, `reorder_chunks`; `update_node`
from Task 217 unchanged) in two migrations; Task 220 ported the lifecycle
writes (`soft_delete_*`, `restore_*`, `archive_*`, `unarchive_*`,
`hard_delete_*`, `empty_trash`, `cleanup_expired_trash`,
`promote_bit_to_node`) in four migrations. Both tasks ran in stages with a
checkpoint each, ported the Dexie scenarios to `supabase/tests/` and got an
`expert` SQL review with no blocking finding. No client code changed beyond
the generated `database.types.ts`; the client switches to these functions in
Phase 45. Ran on branch `phase-43/ordinary-write-functions` under the
lightweight Claude workflow; at close it took in `main` (the Phase 23–30 body
move, PR #59) and applied the six migrations to production.

Deviations from Dexie that the user decided during the phase are written into
SCHEMA's Application Hooks 2–6 and 9–11 and §Result envelope in the close
commit. Carried in: MI-1 (Phase 42). Carried over: MI-1 (an uncaptured
intermittent `pnpm test` failure, now a Phase 44 gate watch) in
[`Issues_Deferred.md`](../../issues/Issues_Deferred.md). Advisory notes for
Tasks 221 and 227 stay in the ledger's Task 220 log. Ledger:
[`Issues_Phase_43.md`](../../issues/Issues_Phase_43.md).

## Task contracts at close

### Task 219: [x] Port the Node, Bit and Chunk write functions

**Files and actions:**
- Migrations: `create_node`, `update_node` (extended from Task 217 only where
  this task's hooks need it; system-Node `hiddenFromGrid` with first-free-cell
  placement on show through `internal.pick_free_cell` and `p_reserved_cells`
  is already in Task 217's function and suite, so it is kept and rechecked,
  not rebuilt — Phase 43 start drift D1), `create_bit`, `update_bit` (with the parent deadline
  extension, Hook 2), `create_chunk`, `update_chunk` (with the parent Bit
  extension for the Calendar answer, Hook 2), `delete_chunk`, `reorder_chunks`
  (one call for a Chunk reorder); Hooks
  1, 2, 3, 8 and 12; lifecycle and Grid locks; account limits with
  `account_limit` and `rejection.limit` (S37); parent-change moves take the
  client's cell and refuse
  a taken one (S43 (3)); system-managed fields stay unsettable from create
  paths.
- `supabase/tests/`: ported scenarios from `mtime-cascade`,
  `deadline-hierarchy`, `auto-completion`, `grid-uniqueness`, `revision` and
  the create/update parts of `indexeddb.test.ts`; limits per table, real and
  guest; two creates into one cell.

**Dependencies:** Phase 42 Final Close and `main` sync; this phase's lifecycle
gate; production limits confirmed by Task 218.

**Authority:** S08, S12, S15 (last write wins), S30, S37, S43 (3); SCHEMA
Hooks 1–3, 8, 12, §Database Functions.

**Observable acceptance:** every ported scenario passes against the functions;
every function passes its cross-account, concurrency and change-set cases;
`coverage.db.test.ts` passes.

**Verification:** full gate; `expert` review with the SQL checklist.

**Commit message:** `feat(db): port the node, bit and chunk write functions`.

### Task 220: [x] Port the lifecycle write functions

**Files and actions:**
- Migrations: `soft_delete_node`, `soft_delete_bit`, `restore_node`,
  `restore_bit` (Hooks 4–5, the Inbox sentinel rule), `archive_node`,
  `archive_bit`, `unarchive_node`, `unarchive_bit` (Hooks 10–11),
  `hard_delete_node`, `hard_delete_bit` (Hook 6, candidates before sources),
  `empty_trash()` (one transaction), `cleanup_expired_trash()` (Hook 7, and it
  records the visit), `promote_bit_to_node` (Hook 9, with the Node and Bit
  account limits); closure `for update` and
  parent `for update` locks (SCHEMA §Locks); `restore_*`, `unarchive_*` and
  `promote_bit_to_node` take `p_reserved_cells` and choose every relocated or
  new cell through `internal.pick_free_cell` (feedback F34), with the
  cell-picking cases in their suites, including the promotion's new chunk Bits
  (first free cell in row-major order, skipping the reserved block).
- `supabase/tests/`: ported scenarios from `cascade-delete`, `cascade-restore`,
  `cascade-hard-delete`, `auto-cleanup`, `archive`, `archive-sweep`,
  `promotion` and `scratch-aggregate-hard-delete`; trashing a Node while a Bit
  is created in a descendant Grid; Empty Trash failure deletes nothing.

**Dependencies:** Task 219.

**Authority:** S08, S15, S18, S30; SCHEMA Hooks 4–11, §Locks; user additions
(2026-10-22).

**Observable acceptance:** as Task 219, plus: no live item ever ends under a
trashed, archived or deleted Node in the concurrency case;
`cleanup_expired_trash()` advances `last_visit_at`.

**Verification:** full gate; `expert` review with the SQL checklist; no new
Security Advisor warning at phase close.

**Commit message:** `feat(db): port the lifecycle write functions`.
