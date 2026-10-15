# Phase 41 — Scratch Trash And Post-Phase-34 Inbox Corrections

## Completion-time scope

Closed 2026-10-16. Tasks 209–212 are user-accepted. Ran on branch
`phase-41/scratch-trash` under the lightweight Claude workflow, before
Phase 35.

Carried over: MI-2 (Terminal Pool row hover contrast, pre-existing) in
[`Issues_Deferred.md`](../../issues/Issues_Deferred.md), also written into the
Task 180 plan section. Ledger: [`Issues_Phase_41.md`](../../issues/Issues_Phase_41.md).

Differences from the task contracts below, as built and accepted:

- Task 209: the Trash Scratch command and result Zod schemas
  (`trashScratchCommandSchema`, `trashScratchResultSchema`) live in
  `src/lib/db/indexeddb.ts` with every other command schema, not in
  `src/lib/db/schema.ts`. The shared handoff was extracted to
  `src/hooks/use-scratch-lifecycle-handoff.ts`.
- Task 211: the `!` mark is drawn by CSS `::before`, so no element was added
  to `breakdown-panel.tsx`.
- Task 212: the captured ID is reported once through a separate `onCaptured`
  callback, on close or on unmount of the capture surface (MI-4), and the
  workspace skips a request for a Scratch it saw in the Pool that is now gone
  (MI-5).

The task contracts below are kept as accepted at close.

Found in real use after Phase 34 closed. Phase 34 stays closed; this phase
uses the next unallocated numbers and runs before Phase 35 (DECISION H01–H02).
Authority: [DECISION](../../brainstorming/2026-10-15-scratch-trash-hotfix/DECISION.md)
H01–H21 (H17–H21 from flow-review round 1), SCHEMA `Trash Scratch` and Undo rows, SPEC Scratch Pool (Trash
Scratch, New capture) and Newly/Undo, and the Phase 41 recipe supplements.

Theme scope: shared behavior for every theme; Retro Mac realization only.
The other seven themes keep the base look until their Phases 35–39 (H03).

Flow review: [Phase 41 flow review](../../reviews/phase-41-flow-review.md).

Execution order is 209 → 210 → 211 → 212. 211 has no product dependency on
209/210, but shares `globals.css` and possibly `breakdown-panel.tsx`, so the
writer register serializes it.

### Task 209: [x] Add the Trash Scratch command, the Undo active-Scratch precondition and the Trash coordinator

**Files and actions:**
- `src/lib/db/schema.ts`: add the Trash Scratch command and result Zod
  schemas, reusing the shared repository status set.
- `src/lib/db/datastore.ts`, `src/lib/db/indexeddb.ts`: add `trashScratch`
  and `reconcileTrashScratch` as one write transaction per the SCHEMA row
  (exact Scratch version, exact submitted candidate set and source versions,
  `deletedAt` + one Scratch version increment + Inbox `mtime`, candidate
  deletes with one source-version increment each, no audit event). Add the
  active-owning-Scratch check to placement Undo (staged and direct), returning
  `rejected` with no write. The Inbox must not call `softDeleteBit` for a
  Scratch.
- `restoreBit` in `src/lib/db/indexeddb.ts`: never relocate an
  Inbox-parented Bit by occupancy (keep `x = 0, y = 0`); test in
  `src/lib/db/cascade-restore.test.ts`.
- Trash Scratch rejects when a current candidate's source cannot be resolved.
- New `src/lib/db/trash-scratch-command.test.ts`; extend
  `src/lib/db/triage-undo.test.ts` (and `inbox-operations.test.ts` where its
  harness is needed) for the Undo precondition in both the command and its
  reconciliation.
- New `src/hooks/use-trash-scratch.ts` and test: the mounted-page coordinator.
  It holds the dialog target, projects the live candidate set and the
  draft/editor disclosure flag, dispatches under
  `use-triage-operation-lock`, keeps pending/failure/unknown/conflict state
  with one operation ID per confirmation, reads the Scratch version and
  candidate set live at confirm, refuses to open or confirm while a placement
  flow is open or an unresolved-source candidate exists (with reason keys),
  reconciles unknown outcomes, holds the native unload guard while pending,
  and owns the own-Trash marker `{scratchId, expectedVersion}`, kept per
  Scratch ID in a non-persisted map (set at dispatch; kept until the
  workspace unmounts, released for that Scratch at a non-applied terminal
  result, so every mounted Inbox projection still sees a late emission as
  own Trash). It keeps a live
  per-Scratch unresolved-source flag over the Inbox's `stagedCandidates` and
  `scratchBreakdowns`, so every Pool row can show its disabled reason.
- `src/hooks/use-triage-operation-lock.ts` and test: add a `"trash"`
  operation kind.
- `src/stores/triage-store.ts` and test: `reconcileScratchPoolContext` creates
  no `externalScratchRemoval` for an own-Trash observation; reuse
  `finishScratchArchive` (or rename it to a shared lifecycle handoff) for the
  success handoff, and extract the visible-order computation from
  `triage-workspace.tsx` `handleArchiveApplied` so Archive and Trash share it.
  `use-archive-scratch.ts` is unchanged.
- `src/hooks/use-external-scratch-removal-data.ts` and test: an own-Trash
  observation sets no external lifecycle.
- `src/hooks/use-inbox.ts` and test: no Pool deleted status for own Trash.
- `src/hooks/use-triage-newly-placed.ts` and test: an inactive owning Scratch
  (Trash applied, Archive success, or external) makes Undo unavailable without
  a click, with distinct trashed/archived reason keys; markers stay. The hook
  reads the owning Scratch lifecycle through the DataStore (the Undo result
  shape is unchanged), and owner-inactive takes precedence over
  `invalid-provenance`.

**Dependencies:** Phase 34 Final Close/main sync; approved Phase 41 documents
and flow review; Phase 41 lifecycle gate.

**Authority / flows:** H05, H07–H09, H11–H12, H18–H20; SCHEMA Trash Scratch,
Hooks 4/13/14, Undo row and conformance cases; SPEC Scratch Pool Trash Scratch
and Newly/Undo; UF-05, UF-25, UF-28 preservation, UF-30; AF-01, AF-04–AF-08.

**Recipe:** none; headless.

**Observable acceptance:**
- Repository: applied/already applied, not applied, and conflict follow the
  SCHEMA row exactly, including a candidate staged after confirmation, a
  changed source row, a changed Scratch version, and ambiguous Trash followed
  by Trash restore (conflict, no re-trash).
- An injected failure at every transaction checkpoint leaves no partial
  write. Breakdown rows survive Trash.
- Trash restore, while at least one other active Scratch exists, returns the
  Scratch with its `x = 0, y = 0` sentinel, its rows active and no candidate.
- An unresolved-source candidate makes Trash rejected with no write.
- Undo with a trashed or archived owning Scratch is rejected with no write, in
  the command and in reconciliation. After Archive success, a placement from
  that Scratch shows Undo unavailable with its reason without a click.
  Existing Undo and Archive handoff tests stay green.
- Coordinator: own Trash never enters the `VQ-01` state, including when the
  live query emits the trashed Scratch before dispatch resolves, and no Pool
  deleted status appears when it emits after dispatch resolves; a conflict
  result with the Scratch inactive enters `VQ-01`; the handoff target matches
  Archive's rule; the lock blocks switching, other operations and a second
  Trash; placement-open and unresolved-source states refuse with reasons.

**Verification:** write each failing test first and observe the failure, then
implement; focused tests, then the `CLAUDE.md` gates. Expert review before
the checkpoint (repository logic).

**Commit message:** `feat(triage): add Trash Scratch command and coordinator`.

### Task 210: [x] Add the Pool Trash control, the Scratch Trash dialog, the Retro Mac Context [X] and the Retro Mac Breakdown Delete dialog

**Files and actions:**
- `src/components/triage/scratch-pool.tsx` and test: expanded rows become a
  container with the existing selection button plus a sibling Trash button
  (no nested buttons; row height `52px`); collapsed switchers unchanged.
- New `src/components/triage/scratch-trash-dialog.tsx` and test: the shared
  `AlertDialog` with class `scratch-trash-dialog`, exact copy, live staged
  count and draft line, Cancel initial focus, pending/failure/unknown/
  conflict variants driven by the Task 209 coordinator.
- `src/components/triage/breakdown-panel.tsx` and test: the Context
  title-strip `[X]` becomes a button (the left strip text stays
  aria-hidden), superseding the accepted Phase 34 assertions that the strip
  is aria-hidden with no button (H10); add a semantic blur-save exemption in
  `handleFieldBlur` for Trash entry activation, keyed on a data attribute,
  not a theme (H17); on Trash success discard that Scratch's Add draft
  (including `departure.setAddDraft("")`) and editors; add
  `breakdown-delete-dialog` to the row Delete `AlertDialog`.
- `src/components/ui/alert-dialog.tsx`: one optional, non-breaking
  `overlayClassName` prop on `AlertDialogContent`.
- `src/components/triage/hierarchy-explorer.tsx` and test: render the
  trashed/archived Undo reasons.
- `src/components/bit-detail/bit-detail-popup.tsx` and its test: hide "Move
  to trash" for an Inbox-parented Bit (H21).
- `src/components/triage/triage-workspace.tsx` and test: mount the dialog,
  connect both entries and the coordinator, apply the success selection
  handoff and the per-entry focus rules.
- `src/lib/copy/inbox-triage.ts` and test: every Phase 41 string in the
  Scratch Pool recipe supplement, the Context `[X]` accessible name, and the
  Undo-unavailable reason.
- `src/app/globals.css`: base and Retro Mac rules for the Pool Trash control,
  the Scratch Trash dialog, the `[X]` button and the Breakdown Delete dialog.
- `src/components/triage/inbox-triage-theme-realization.test.tsx`: Retro Mac
  assertions; `[X]` neither visible nor focusable in the other themes.

**Dependencies:** Task 209 accepted.

**Authority / flows:** H04, H06–H10, H14A, H17–H21; SPEC Scratch Pool Trash
Scratch, Inline editing, Newly/Undo and Bit Detail Popup; Scratch Pool recipe
Phase 41 supplement, Context recipe Phase 41 amendment, Breakdown recipe
Phase 41 Delete dialog; UF-11, UF-25, UF-29 preservation, UF-30; AF-10.

**Recipe:** those three Phase 41 sections only.

**Observable acceptance:**
- Pool row Trash and the Context `[X]` open the dialog for the right Scratch.
  Activating Trash never selects the row.
- The dialog shows the exact copy, a live staged count and the draft line.
  Cancel/Escape writes nothing and returns focus to the entry.
- Confirm shows pending, then on success removes the row once, hands off
  selection and focus per SPEC, announces the move and discards drafts.
- Failure, unknown and conflict show their variants without closing or
  resending blindly. Escape does nothing while pending or unknown. A
  `rejected` result shows its reason and closes on Cancel.
- With a dirty row editor and with a dirty title editor, activating Pool
  Trash or `[X]` opens the dialog with the draft line and dispatches no Save;
  Cancel leaves the editor dirty; success leaves no unload guard or `VQ-03`.
- With a placement open, or an unresolved-source candidate, the entries are
  disabled and expose their reasons.
- Changing color theme or light/dark while the dialog is open or pending keeps
  its target, counts, state, operation ID and focus; nothing is written or
  resent.
- Undo shows the trashed and archived reasons. The Bit detail popup of a
  Scratch has no "Move to trash"; ordinary Bits still do.
- Retro Mac light and dark match the recipe, including the Breakdown Delete
  dialog. One base theme (GridDO) shows the base look and no `[X]`.
- Restore from `/trash` brings the Scratch back to the Pool.
- The user gives a separate visual disposition for the Retro Mac surfaces.

**Verification:** component tests for structure, focus and states; running-app
check (Playwright MCP, seeded fixtures) in Retro Mac light/dark and GridDO,
keyboard path included; Pool rows (default/selected/hover/focus, 52px,
truncation before the control) in all eight themes at 1920×1080 light, Retro
Mac also dark, re-confirming the Phase 34 Retro Mac Pool disposition;
`CLAUDE.md` gates.

**Commit message:** `feat(triage): add Scratch Trash UI`.

### Task 211: [x] Realize the Retro Mac departure sheet

**Files and actions:** `src/app/globals.css`: Retro Mac rules for
`breakdown-departure-sheet` per the Breakdown recipe's Phase 41 Retro Mac
realization. Add one aria-hidden `!` mark element to the shared sheet in
`src/components/triage/breakdown-panel.tsx` (and its test) only if CSS cannot
place the mark; it is hidden in other themes. Extend
`src/components/triage/inbox-triage-theme-realization.test.tsx`.

**Dependencies:** Phase 41 lifecycle gate; writer-register serialization after
Task 210.

**Authority / flows:** H13–H14; DP-VQ03; UF-08; AF-10.

**Recipe:** Breakdown recipe `DP-VQ03` and its Phase 41 Retro Mac realization.

**Observable acceptance:** in Retro Mac light and dark, the sheet takes the
Archive-alert family and stays in flow under the Add row with no scrim,
portal, title bar or motion. Copy, action order, focus (Continue first, Escape
returns to Add with caret) and lifecycle are unchanged. The other themes are
unchanged. The user gives a separate visual disposition.

**Verification:** running-app check of a Scratch switch with an Add draft in
Retro Mac light/dark and one other theme; existing departure tests stay green;
`CLAUDE.md` gates.

**Commit message:** `feat(triage): realize retro-mac departure sheet`.

### Task 212: [x] Select a Scratch captured while the Inbox is mounted

**Files and actions:**
- `src/hooks/use-inbox.ts` and test: `createScratchBit` returns the created
  ID.
- `src/components/quick-capture/scratch-modal.tsx`,
  `src/components/quick-capture/quick-capture-overlays.tsx` and their tests:
  remember the last successful capture ID and report it when the capture
  surface closes, by auto-close or by the user.
- `src/stores/triage-store.ts` and test: a one-shot requested-selection slot,
  written only while a `TriageWorkspace` is mounted and cleared on its
  unmount.
- `src/components/triage/triage-workspace.tsx` (and `scratch-pool.tsx` only
  for revealing the row) with tests: consume the slot through the existing
  Scratch-switch path (`VQ-03` for an Add draft; Discard and move focuses the
  Selected Scratch Context); skip it while switching is locked, while an
  inline editor is open, or when the Scratch is no longer active; reveal the
  row and do not move focus otherwise.

**Dependencies:** Phase 41 lifecycle gate; writer-register serialization after
Task 211.

**Authority / flows:** H15–H16; SPEC Scratch Pool New capture and Quick
Capture; UF-31, UF-08 preservation; AF-05.

**Recipe:** none; no visual change.

**Observable acceptance:**
- In the Inbox with no draft, the captured Scratch is selected after the
  capture surface closes and its row is revealed; focus does not move.
- With an Add draft, the departure sheet appears. Continue keeps the current
  Scratch; Discard selects the new one.
- While an operation locks switching, or an inline editor is still open when
  the capture surface closes, nothing changes.
- Under an active Pool query the new Scratch is selected with the
  hidden-selection status. A collapsed Pool stays collapsed.
- A capture from another route does not navigate, and a later Inbox entry
  keeps the ordinary re-entry selection. A new Scratch never shows as a remote
  arrival.

**Verification:** write each failing hook/component test first, then
implement; running-app check of capture from the Inbox (with and without a
draft) and from another route; `CLAUDE.md` gates.

**Commit message:** `feat(triage): select newly captured Scratch in Inbox`.
