# Phase 25 — Authoritative Command DAG

## Completion Summary

Tasks 120–126 were explicitly accepted on the isolated
`phase-25/authoritative-command-dag` branch. The phase adds eleven typed
authoritative repository commands and one read-only Archive recovery
classifier. It changes no UI, hook, store, route, theme, copy, mounted-session,
or future-task owner.

| Task | Accepted deliverable | Implementation / repair | Acceptance |
| --- | --- | --- | --- |
| 120 | Atomic Breakdown Add, Scratch Save, row Save, and row Delete with exact reconciliation | `785b9d0` → `6a4523e` | `9d7a636` |
| 121 | Durable Stage and Unstage with ABA-2 no-resurrection | `d37d5cf` | `a01c854` |
| 122 | Confirmed-orphan cleanup with unique durable audit and indexed reconciliation | `6c49204` → `5d3fb54` | `dea3d09` |
| 123 | Atomic staged/direct Node and Bit Placement | `c1b62ef` | `54405de` |
| 124 | Source-aware staged/direct Undo with candidate-version ABA-3 protection | `19dc391` | `06344a7` |
| 125 | Exact Archive eligibility and guarded Scratch Archive | `a28ea53` | `4a02fc0` |
| 126 | Exact read-only Archive recovery classification | `4eb8df3` | `adb9cc3` |

## Accepted Command Foundation

- Breakdown Add/Edit/Delete, Stage/Unstage, confirmed-orphan cleanup,
  staged/direct Placement, source-aware Undo, and guarded Scratch Archive each
  validate and write a complete postcondition in one repository transaction.
- Reconciliation recognizes only the exact complete precondition, complete
  postcondition, or conflict. Multi-store authority reads share one read-only
  transaction snapshot and never retry, compensate, or select a heuristic
  target.
- Node, Bit, Breakdown, and candidate revisions remain monotonic. ABA-1/2/3
  coverage proves late or duplicated reconciliation cannot resurrect a row,
  candidate, source consumption, or placement result.
- Candidate orphan cleanup requires authoritative deletion/tombstone proof,
  appends one unique integrity audit, preserves prior audit history, and uses
  the existing unique `candidateId` index on the production path.
- Scratch Archive independently requires an active Inbox owner, consumed ≥1,
  unconsumed 0, staged 0, exact version, and explicit caller confirmation that
  Add-draft/title blockers are clear. Generic `archiveBit` cannot bypass it.
- Archive recovery validates `PendingOperationRecovery`, reads the exact
  Scratch/owner/Breakdown/candidate authority in one snapshot, and returns
  `applied`, `not_applied`, `conflict`, or `unknown` without any write.
- No general operation log, journal, outbox, queue, persisted recovery owner,
  UI sequencing, or Task 127+ behavior was introduced.

## Verification And Acceptance

Every task has a durable start, implementation/evidence commit, explicit user
acceptance, and separate acceptance commit in
[`docs/issues/Issues_Phase_25.md`](../../issues/Issues_Phase_25.md). The phase's
only execution-time repairs—`P25-120-R1`, `P25-122-R1`, and `P25-125-R1`—are
Closed under their exact accepted boundaries. Canonical impact is `None` for
every task and repair.

The final fresh serial full gate ran at Task 126 implementation commit
`4eb8df3c50455588e4ebd880d72d5e366f50d0cd`:

| Command | Exit | Result |
| --- | ---: | --- |
| `pnpm test` | 0 | 87 test files / 679 tests passed |
| `pnpm lint` | 0 | 0 errors; 11 pre-existing warnings |
| `pnpm typecheck` | 0 | TypeScript check passed |
| `pnpm build` | 0 | Next.js 16.2.1 production build passed; seven routes generated |

The Task 126 acceptance commit changed only the execution plan and phase
ledger. Its `src` tree equals the implementation commit's `src` tree at
`483c7756667335b502105dfa4a712b128a7a117b`, so end-phase reused the valid gate
without rerunning test/lint/typecheck/build. The data/nonvisual task checkpoints
and real-Dexie evidence are the applicable observable verification; Tasks
136–162 own later rendered interaction and presentation.

## Close Handoff

- Pinned pre-close SHA:
  `adb9cc35ba611521915373fa5876665dedb2fc98`.
- Approved base: `7b79a97b56a7023c5f3e803ab646fc3bb7f6be28` on `main`.
- Blocking conformance violations: 0.
- Advisory conformance violations: 0.
- Active issues: 0.
- Deferred Phase 25 issues: 0.
- Phase Notes: not used by adapter policy.
- Downstream work consumes this completed foundation only through the exact
  dependencies in the active execution plan. Phase 25 completion does not
  start Task 127, Phase 26, or any other lifecycle.

**Full issue log:**
[`docs/issues/Issues_Phase_25.md`](../../issues/Issues_Phase_25.md)

## Task Contracts

The accepted task contracts, moved verbatim from `docs/EXECUTION_PLAN.md`
on 2026-10-25; relative links are rebased to this folder.

### Task 120: [x] Implement Add, Scratch Save, row Save, and row Delete commands

**Files and actions:** modify `src/lib/db/datastore.ts` and `src/lib/db/indexeddb.ts` with typed command/reconcile inputs and results; modify `src/lib/db/scratch-breakdowns.test.ts` and **create** `src/lib/db/inbox-operations.test.ts` using Task 104's real database. Each command validates lifecycle/version inside one transaction, uses preallocated record/operation identity, increments each required surviving owner exactly once, parses writes/results, and classifies complete precondition/postcondition/conflict. Add the explicit **ABA-1 Add→Delete sequence**: an ambiguous Add commits row v1 and Scratch v+1; a later confirmed Delete removes it and advances Scratch again; late Add reconciliation must return `conflict`, leave the row absent, retain the later Scratch revision, and never recreate/resurrect the row. Delete's inverse checks must likewise never report the original Add as not-applied.

**Dependencies:** Tasks 103 and 104.

**Authority / flows:** SCHEMA Add/Save/Delete matrix; `UF-07`, `UF-09`–`UF-12`; `AF-01`, `AF-06`, `AF-07`; `NEG-09`, `NEG-15`, `NEG-19`, `NEG-20`.

**Recipe:** Not applicable — data/nonvisual.

**Observable acceptance:** Add creates one stable row and advances Scratch; saves are conditional with no last-write-wins; Delete retains no partial state; retry is possible only from exact not-applied; ABA-1 produces conflict and no resurrection under every delayed/duplicate reconciliation order.

**Verification:** `pnpm test -- src/lib/db/scratch-breakdowns.test.ts src/lib/db/inbox-operations.test.ts`; include a named ABA-1 assertion for result status, row absence, final Scratch version, and no extra write; then `pnpm typecheck`.

**Commit contract:** four Breakdown commands, real transaction/reconcile tests, and no UI; `feat(triage): add authoritative breakdown commands`.

### Task 121: [x] Implement Stage and Unstage commands

**Files and actions:** modify `src/lib/db/datastore.ts` and `src/lib/db/indexeddb.ts`; create `src/lib/db/staged-candidates.test.ts`; extend `src/lib/db/inbox-operations.test.ts`. Stage requires active Inbox Scratch, exact unconsumed source/version, absent preallocated candidate ID, and unique source; inserts candidate v1 and advances source. Unstage requires exact candidate/source; deletes only candidate and advances source. Add **ABA-2 Stage→Unstage**: ambiguous Stage commits candidate v1/source v+1; confirmed Unstage deletes candidate/source v+2; late Stage reconcile returns `conflict`, leaves candidate absent/source at later version, and never recreates/restages it. Type change remains Unstage then a new candidate ID/operation.

**Dependencies:** Tasks 103 and 104.

**Authority / flows:** SCHEMA Stage/Unstage matrix; `UF-13`–`UF-15`; `AF-06`–`AF-08`; `NEG-15`, `NEG-16`, `NEG-20`.

**Recipe:** Not applicable — data/nonvisual.

**Observable acceptance:** candidate truth survives route/reload and stores no label; source/candidate changes are atomic; same postcondition replay is idempotent; ABA-2 is conflict with no resurrection; Unstage never consumes source or creates an audit event.

**Verification:** `pnpm test -- src/lib/db/staged-candidates.test.ts src/lib/db/inbox-operations.test.ts`; include exact ABA-2 status/absence/source-version/no-write assertions; then `pnpm typecheck`.

**Commit contract:** Stage/Unstage repository contracts and real transaction tests only; `feat(triage): add durable staging commands`.

### Task 122: [x] Implement confirmed-orphan cleanup with exact reconciliation

**Files and actions:** modify `src/lib/db/datastore.ts` and `src/lib/db/indexeddb.ts`; create `src/lib/db/candidate-orphan-cleanup.test.ts` on Task 104's real database. Request contains operation ID, preallocated audit ID, exact candidate ID/version/source/Scratch/type, and authoritative `source_deleted`/`source_tombstoned` proof. In one transaction delete the exact candidate and append the exact unique-candidate audit. Define and test: exact audit plus candidate absence = `applied`/`already_applied`; untouched exact candidate/source precondition and no audit = `not_applied`; changed candidate, different audit, partial state, or mismatched proof = `conflict`; cache/offline/delayed/unproved source = `rejected`/unresolved with no write. Inject failure between delete/append and prove rollback; assert aggregate deletion Task 105 remains audit-free and prior audit rows remain indefinitely.

**Dependencies:** Tasks 104, 105, and 121.

**Authority / flows:** SCHEMA Confirmed candidate orphan cleanup and Staged Candidate Integrity; `UF-16`; `AF-04`, `AF-07`, `AF-08`.

**Recipe:** Not applicable — data/nonvisual.

**Observable acceptance:** a local source miss cannot clean anything; confirmed cleanup produces exactly one matching durable event and no candidate; every complete/untouched/partial/mismatched state has the exact authoritative result above; retry cannot append twice.

**Verification:** `pnpm test -- src/lib/db/candidate-orphan-cleanup.test.ts`; inspect every result/status/postcondition, planned-aggregate rejection, and fault checkpoint; then `pnpm typecheck`.

**Commit contract:** confirmed-orphan query/command and exact postcondition/conflict tests only; `feat(triage): audit confirmed candidate orphans`.

### Task 123: [x] Implement staged and direct Placement commands

**Files and actions:** modify `src/lib/db/datastore.ts` and `src/lib/db/indexeddb.ts`; create `src/lib/db/triage-placement.test.ts`; extend `src/lib/db/inbox-operations.test.ts`. Separate staged/direct typed commands carry preallocated result ID, exact source/candidate versions, intended type/title, target parent, expected ancestor IDs/path, and exact cell. Revalidate active reachability, hierarchy/type, title limits, capacity, candidate/source lifecycle, and cell immediately inside one transaction. Each of the four result constructors—staged Node, staged Bit, direct Node, and direct Bit—explicitly initializes `version: 1` and `pastDeadlineDismissed: false`, then parses the complete record with `nodeSchema` or `bitSchema` before any write. Staged atomically creates result, consumes/advances source, and deletes candidate; direct creates result and consumes/advances source. Reconciliation recognizes only complete all-sides postcondition, exact untouched precondition, or conflict; never alternate target, partial compensation, truncation, title heuristic, or silent resend.

**Dependencies:** Tasks 120 and 121.

**Authority / flows:** SCHEMA staged/direct placement matrix; `UF-20`–`UF-23`; `AF-06`, `AF-07`; `NEG-18`, `NEG-20`.

**Recipe:** Not applicable — data/nonvisual.

**Observable acceptance:** Confirm can yield exactly one actual Node/Bit and complete source/candidate postcondition; all four staged/direct Node/Bit outputs initialize the two required defaults and pass their full schema; stale/full/moved/invalid/over-limit input writes nothing; every injected checkpoint rolls back; unknown result reconciles by IDs/versions only.

**Verification:** `pnpm test -- src/lib/db/triage-placement.test.ts src/lib/db/inbox-operations.test.ts`; for staged Node, staged Bit, direct Node, and direct Bit, assert `version: 1`, `pastDeadlineDismissed: false`, and successful full `nodeSchema`/`bitSchema` parsing; cover every invalidity and checkpoint; then `pnpm typecheck`.

**Commit contract:** two placement commands and real transaction tests only; `feat(triage): add atomic placement commands`.

### Task 124: [x] Implement source-aware Undo with candidate-version ABA protection

**Files and actions:** modify `src/lib/db/datastore.ts` and `src/lib/db/indexeddb.ts`; create `src/lib/db/triage-undo.test.ts`; extend `src/lib/db/inbox-operations.test.ts`. Undo carries exact result/source/candidate identities, placement post-state versions/timestamps, creation snapshot, and staged/direct provenance. Inside one transaction validate unchanged result lifecycle/direct revision/creation fields, exact consumed source, candidate uniqueness, and zero surviving descendants/unknown mutation; delete exact result and restore/advance source. Staged Undo recreates the **same candidate ID/type/createdAt** at **prior candidate version + 1** with `updatedAt = now`; direct Undo creates none. Add **ABA-3 Place→Undo**: Stage candidate v1, place it, then confirmed Undo recreates that ID at v2; late original Placement and Stage reconciliation both return `conflict`, keep source restored and candidate v2, keep result absent, and never reconsume source, delete/downgrade/recreate candidate v1, or resurrect result. Also test ambiguous Undo followed by a new confirmed placement: late Undo reconciliation conflicts and cannot remove the new result or restore old source state.

**Dependencies:** Task 123.

**Authority / flows:** SCHEMA Undo matrix and ABA conformance; `UF-25`; `AF-06`, `AF-07`; `NEG-18`, `NEG-20`.

**Recipe:** Not applicable — data/nonvisual.

**Observable acceptance:** eligible Undo performs the exact inverse atomically; dependency/mutation blocks all writes; child-first recovery can re-enable; staged provenance returns the same candidate identity at v+1; every ABA-3 late reconcile conflicts with the exact no-resurrection/no-downgrade assertions.

**Verification:** `pnpm test -- src/lib/db/triage-undo.test.ts src/lib/db/inbox-operations.test.ts`; assert ABA-3 final records/versions/timestamps/status and every checkpoint; then `pnpm typecheck`.

**Commit contract:** Undo command and exact staged/direct/dependency/ABA tests only; `feat(triage): add source aware undo command`.

### Task 125: [x] Implement exact Archive eligibility and guarded Archive command

**Files and actions:** modify `src/lib/db/datastore.ts` and `src/lib/db/indexeddb.ts`; create `src/lib/db/archive-scratch-command.test.ts`; update `src/lib/db/archive.test.ts`. Add authoritative eligibility query and typed Archive request containing Scratch ID/expectedVersion plus an explicit caller assertion that Add-draft and Scratch-title blockers are clear. Repository transaction independently requires active Inbox-owned Scratch, consumed count ≥1, unconsumed count 0, candidate count 0, and exact version, then changes only Scratch `archivedAt`/`mtime`/version. Make generic `archiveBit` reject an Inbox-parented Scratch so no caller can bypass the guarded command; retain generic Direct Archive for ordinary Bits and existing Archive View restore. Test missing/false blocker assertion, durable races, same-ID replay, and rollback.

**Dependencies:** Tasks 120 and 121.

**Authority / flows:** SCHEMA Archive Scratch matrix/eligibility and SPEC coordinator boundary; `UF-26`, `UF-28`; `AF-04`, `AF-06`–`AF-08`.

**Recipe:** Not applicable — data/nonvisual.

**Observable acceptance:** empty/all-deleted/all-staged never qualify; page blocker assertion is required but never substitutes for durable transaction checks; generic `archiveBit(scratchId)` fails without mutation; ordinary Direct Archive/restore remain unchanged; rows/candidates remain retained for restore.

**Verification:** `pnpm test -- src/lib/db/archive-scratch-command.test.ts src/lib/db/archive.test.ts`; include blocker assertion, generic bypass, durable race, same operation, rollback, ordinary Bit, and restore cases; then `pnpm typecheck`.

**Commit contract:** eligibility/guarded Archive command, generic-bypass guard, and exact repository tests only; `feat(triage): guard scratch archive command`.

### Task 126: [x] Implement Archive recovery classification

**Files and actions:** modify `src/lib/db/datastore.ts` and `src/lib/db/indexeddb.ts`; create `src/lib/db/archive-scratch-recovery.test.ts`. Add read-only classification for a schema-validated `PendingOperationRecovery` using exact current Scratch ID/version/archivedAt plus Breakdown/candidate pre/postconditions: complete Archive postcondition = applied; complete eligible active precondition = not-applied; changed lifecycle/version/eligibility or partial state = conflict; authority unavailable = unknown. Invalid/foreign/stale descriptors fail closed and never invoke mutation. No operation-ID index/log is added; current-tab sessionStorage ownership remains Task 161.

**Dependencies:** Task 125.

**Authority / flows:** SCHEMA forced-Archive recovery and no-journal reconciliation; `UF-28`; `AF-05`, `AF-07`; `NEG-17`, `NEG-20`.

**Recipe:** Not applicable — data/nonvisual.

**Observable acceptance:** classification is read-only, exact, and closed over complete pre/postconditions; invalid identity cannot archive/select/retry; no draft, payload, queue, or general history is persisted.

**Verification:** `pnpm test -- src/lib/db/archive-scratch-recovery.test.ts`; cover applied/not-applied/conflict/unknown/invalid/foreign/stale descriptors and zero writes; then `pnpm typecheck`.

**Commit contract:** recovery read contract/classifier and its dedicated tests only; `feat(triage): classify archive recovery`.
