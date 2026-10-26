# Phase 44 — Inbox/Triage Command Functions

## Completion-time scope

Closed 2026-10-26. Tasks 221–224 are user-accepted. SaaS lane, part 3: the
Inbox/Triage atomic commands as database functions, one per row of the SCHEMA
atomic command matrix, with a read-only reconcile function for each. Task 221
ported Add, Save Scratch title, Save and Delete Breakdown; Task 222 Stage and
Unstage; Task 223 staged and direct placement and their two Undo commands;
Task 224 Archive Scratch with its recovery classification and Trash Scratch,
and wrote every SCHEMA conformance case into `conformance.db.test.ts`. Four
migrations add 24 `public` functions (12 write functions and 12 reconcile or
classification functions) and their `internal` helpers. Each task ran in
stages with a checkpoint each, ported the Dexie scenarios to `supabase/tests/`
with cross-account, change-set, atomicity and lock-wait concurrency cases, and
got an `expert` SQL review with no blocking finding. No client code changed
beyond the generated `database.types.ts`; the DataStore switches to these
functions in Phase 45 (Task 227 reads the ledger's Task 227 notes). Ran on
branch `phase-44/inbox-triage-commands`; at close the four migrations were
applied to production and the dashboard Security Advisor showed only the
accepted warning type (22 → 34).

The command contract choices made during the phase (rejection codes per
command, function shapes, the Dexie deviations) are written into SCHEMA
§Database Functions, Inbox/Triage command functions, in the close commit.
Carried in: MI-1 (Phase 42), closed at this close with no recurrence. Carried
over: none. Ledger: [`Issues_Phase_44.md`](../../issues/Issues_Phase_44.md).

## Task contracts at close

Each command keeps the SCHEMA command/result contract. The confirmed-orphan
command and its audit store are not ported (S18).

### Task 221: [x] Port the Breakdown and Scratch title commands

**Files and actions:** migrations for `add_breakdown`, `save_scratch_title`,
`save_breakdown`, `delete_breakdown` and their read-only reconcile functions
(`reconcile_add_breakdown` and the like), with the Scratch row lock, exact
`expectedVersion`, the Scratch aggregate version and account limits on Add;
ported scenarios from `scratch-breakdowns`, `revision` and the Breakdown parts
of `inbox-operations.test.ts`, including "ambiguous Add, then confirmed Delete,
reconciles as conflict".

**Dependencies:** Phase 43 Final Close and `main` sync; this phase's lifecycle
gate.

**Authority:** S08, S30, S37; SCHEMA §Atomic command matrix (Add, Save Scratch
title, Save, Delete), §Operation reconciliation.

**Observable acceptance:** every ported scenario and conformance case passes;
cross-account, concurrency and change-set cases pass; a guest at the Breakdown
limit gets `rejected` with `account_limit`.

**Verification:** full gate; `expert` review with the SQL checklist.

**Commit message:** `feat(db): port the breakdown and scratch title commands`.

### Task 222: [x] Port the Stage and Unstage commands

**Files and actions:** migrations for `stage_candidate`, `unstage_candidate`
and their reconcile functions; ported `staged-candidates` and Stage/Unstage
`inbox-operations` scenarios, including "ambiguous Stage, then confirmed
Unstage, reconciles as conflict" and "a candidate recreated by Undo cannot
satisfy the original Stage postcondition"; deleting a staged source is refused
(S18).

**Dependencies:** Task 221.

**Authority:** SCHEMA §Atomic command matrix (Stage, Unstage), Hook 13.

**Observable acceptance:** as Task 221.

**Verification:** full gate; `expert` review with the SQL checklist.

**Commit message:** `feat(db): port the stage and unstage commands`.

### Task 223: [x] Port the Placement and Undo commands

**Files and actions:** migrations for `place_staged_candidate`,
`place_direct_breakdown`, `undo_staged_placement`, `undo_direct_placement`
and their reconcile functions, with target reachability, type, path, title
limit, Grid lock and free-cell checks in the same transaction, the
active-owning-Scratch Undo rule and account limits on the result; ported
`triage-placement` and `triage-undo` scenarios.

**Dependencies:** Task 222.

**Authority:** SCHEMA §Atomic command matrix (placement, Undo), Hooks 8, 12,
13.

**Observable acceptance:** as Task 221; a placement into a full target or past
a limit is `rejected` with no write.

**Verification:** full gate; `expert` review with the SQL checklist.

**Commit message:** `feat(db): port the placement and undo commands`.

### Task 224: [x] Port the Archive and Trash Scratch commands and close the conformance cases

**Files and actions:** migrations for `archive_scratch`,
`classify_archive_scratch_recovery`, `trash_scratch`, `reconcile_trash_scratch`
(Hook 15 eligibility re-run inside the transaction; exact submitted candidate
set); ported `archive-scratch-command`, `archive-scratch-recovery` and
`trash-scratch-command` scenarios; every SCHEMA conformance case in
`supabase/tests/conformance.db.test.ts`. The Archive descriptor case is split:
the database suite proves that reload reconciliation reads Scratch and
postcondition state with no operation table; the fail-closed dispatch when
`sessionStorage` cannot store the descriptor is browser-side and stays covered
by `src/hooks/use-archive-scratch.test.ts` in `pnpm test` (Phase 44 start
drift D1).

**Dependencies:** Task 223.

**Authority:** SCHEMA §Atomic command matrix (Archive, Trash Scratch), Hooks
13–15, conformance cases.

**Observable acceptance:** every conformance case passes, including "ambiguous
Trash Scratch, then confirmed restore, reconciles as conflict" and "Undo whose
owning Scratch is trashed or archived is rejected"; no new Security Advisor
warning at phase close.

**Verification:** full gate; `expert` review with the SQL checklist.

**Commit message:** `feat(db): port the archive and trash scratch commands`.
