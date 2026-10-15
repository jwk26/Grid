# Issues — Phase 41: Scratch Trash and post-Phase-34 Inbox corrections

Branch: phase-41/scratch-trash · Started: 2026-10-15
Carried over: none. For reference only: Close Advisory A2 / MI-8 (Archive handoff focus timing, owned by Task 178) bears on the shared handoff that Tasks 209/210 reuse; ISSUE-16-02/16-03 (ScratchModal focus trap and auto-close timer) bear on the capture-close path Task 212 extends.

## Task 209 — Trash Scratch command, Undo active-Scratch precondition, Trash coordinator

### Current state
- Status: Accepted
- Next: Task 210 wires the coordinator into the UI
- Open: none

### Log
- Decision: own-Trash marker lives outside the persisted triage-store, is released when the Pool projection observes the deletion or at a non-applied result, and is cleared on workspace unmount; no module-global Set (user, 2026-10-15).
- Decision: Undo command and reconcile order is postcondition → already_applied, inactive owning Scratch → rejected, precondition → not_applied, else conflict (user, 2026-10-15).
- Decision: `softDeleteBit` is left unchanged; Undo reason keys are `trashed`/`archived` (user, 2026-10-15).
- Decision: the own-Trash marker lives in `triage-store` as `ownTrashMarkers`, a per-Scratch-ID map (non-persisted, so the store key-set test changed); `reconcileScratchPoolContext` takes an optional `ownTrashIds`. Unload guard comes from the existing lock check in `use-triage-departure` (the lock is held while pending/unknown).
- MI-1 [Resolved by user decision, pending acceptance]: expert review — with several mounted `useInbox` instances (sidebar, quick-capture, workspace, Pool, Breakdown) the marker is released as soon as one instance observed the deletion, so a later-emitting instance, notably the Pool's, classifies the own Trash as `delete` → Pool "1 deleted" status, and may briefly move the selection before the handoff — cause: release-on-first-observation (decision of 2026-10-15) — proposed fix: keep the version-keyed marker until workspace unmount (SPEC allows it), or defer release until every Pool subscriber observed it. Decision (user, 2026-10-15): option A — keep the marker until workspace unmount; release only at a non-applied result for that Scratch. The `observed` flag and `markOwnTrashObserved` were removed. Plan Task 209 wording updated. Regression tests (two `useInbox` instances, two Scratches trashed back to back, restore then external Trash = VQ-01) were written first and failed for the intended reason.
- Fixed: `trashScratch` accepted a duplicated candidate and left another behind; the command schema now requires a set. The applied-ids bookkeeping moved after the handoff.
- Note: the command/result Zod schemas (`trashScratchCommandSchema`, `trashScratchResultSchema`) live in `src/lib/db/indexeddb.ts` next to the Archive schemas, not in `schema.ts` as the plan text says; behavior is unaffected.
- Note: SPEC Scratch Pool / DECISION still describe release "once the Pool lifecycle projection has observed that deletion"; the SPEC itself allows keeping it until unmount. Wording left for an Opus session to align.
- Resolved (Opus session, 2026-10-15): SPEC Scratch Pool marker wording aligned to the unmount lifetime in `c6c954a`; DECISION.md has no marker wording, so nothing to change there. This also closes the "Unresolved" line of the Task 209 checkpoint.
- Mutation check of the tests written after the code (store marker, `use-trash-scratch`, newly-placed owner): 13 deliberate breaks of the key branches, 13 caught (own selection hold, external-removal guard, marker release, non-applied marker release, conflict+inactive, Cancel while pending, unmount release, placement-open refusal, same-operation Retry incl. lock release, owner precedence over conflict and over already-undone, hard-deleted owner, rejected-terminal owner correction). One first survived (Retry with a new ID), the test was strengthened and then caught it.
- Review (expert, 2 rounds): duplicate-candidate hole in `trashScratch` → fixed (Zod set refine); own-Trash marker released on first observation with several mounted `useInbox` instances → fixed by MI-1 option A; own Trash racing an external v+1 Trash left the selection pinned after a conflict release → fixed (`useInbox` derives `ownTrashIds` from the live marker map; the store keeps a held own-Trash selection tracked in the Pool order so a released marker reads as external removal), with a failing test written first.
- Task 210 note: mount `useTrashScratch` at workspace lifetime (marker lifetime is tied to its unmount); `useExternalScratchRemovalData({ ownTrash })` takes an array, so convert `Object.values(ownTrashMarkers)`.

### Checkpoint
- Changed: `indexeddb.ts`/`datastore.ts` (`trashScratch`, `reconcileTrashScratch`, Undo active-owner precondition, `restoreBit` Inbox sentinel); `triage-store.ts` (own-Trash marker map, `ownTrashIds`); `use-inbox.ts`, `use-external-scratch-removal-data.ts`; new `use-trash-scratch.ts` (coordinator + live snapshot), `use-scratch-lifecycle-handoff.ts` (extracted from `triage-workspace.tsx`); `use-triage-newly-placed.ts` (trashed/archived reasons); `use-triage-operation-lock.ts` (`trash`); plan Task 209 marker wording.
- Verified: `git diff --check`, `pnpm test` (1579), `lint` (0 errors), `typecheck`, `build`; existing Archive/handoff/focus tests unchanged and green; mutation check 13/13.
- Please check: the plan/SCHEMA conformance cases listed for Task 209; the marker policy (unmount-lifetime) and the follow-ups for SPEC/DECISION wording; nothing is visible in the UI yet.
- Unresolved: SPEC/DECISION still say "released once the Pool projection observed the deletion".
