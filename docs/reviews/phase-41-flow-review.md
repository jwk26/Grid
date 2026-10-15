# Phase 41 Flow Review: Scratch Trash and post-Phase-34 Inbox corrections

## Round 1: 2026-10-15

**Reviewer:** expert subagent, independent of the plan author (PLANNING_STANDARD §3)

**Inputs:**
- `origin/main` = `309e432` (baseline).
- `HEAD` = `9367229`, committed: `DECISION.md`, `SCHEMA.md`, `SPEC.md` and three recipe supplements.
- Working tree, uncommitted: `docs/EXECUTION_PLAN.md` (Phase 41, Tasks 209–212) and `docs/PLANNING_STANDARD.md`.
- Code read at `HEAD`:
  - `src/lib/db/indexeddb.ts`
  - Inbox hooks: `use-inbox`, `use-archive-scratch`, `use-triage-operation-lock`, `use-triage-departure`, `use-triage-newly-placed`, `use-external-scratch-removal-data`, `use-scratch-breakdowns`, `use-staged-candidates`
  - `triage-store`
  - Triage components: Pool, Breakdown, Workspace, Explorer
  - Quick-capture components
  - `bit-detail-popup`, `search-overlay`, `ui/alert-dialog`, `globals.css`

Status: ✅ Owned | ⚠️ Weak | ❌ Gap | ⏸️ Deferred

### Flow-Trace Table

| ID | Flow | Owner | Status | Notes |
|---|---|---|---|---|
| F01 | Pool row Trash on an unselected Scratch | 209, 210 | ⚠️ | No focus target when no visible row remains (W8d) |
| F02 | Pool row Trash on the selected Scratch, Archive-style handoff | 209, 210 | ⚠️ | Wrong place for the handoff source (W2) and for VQ-01 suppression (W1) |
| F03 | Retro Mac Context `[X]` opens the same dialog | 210 | ✅ | Supersede the accepted Phase 34 assertions (A9); inert under overlays (A10) |
| F04 | `[X]` hidden and not focusable in the other themes | 210 | ✅ | `globals.css:5172` hides the strip outside Retro Mac |
| F05 | Staged-candidate disclosure with a live count | 209, 210 | ⚠️ | Unresolved-source candidate blocks Trash (W6); capture time of `expectedVersion` (A7) |
| F06 | Candidate staged in another tab after the dialog opened | 209 | ✅ | Live count, then conflict and re-confirm at the transaction |
| F07 | Draft/editor disclosure, discarded on success | 210 | ❌ | G1 |
| F08 | Pending row save / intent / Archive / Undo | 209 | ✅ | Operation lock disables Trash |
| F09 | Placement flow open | none | ❌ | G2 |
| F10 | Completion overlay open | 210 | ✅ | A10 |
| F11 | Explorer search / Newly markers | 209 | ✅ | |
| F12 | Dialog pending/failure/unknown/conflict | 209, 210 | ⚠️ | Dismissibility unspecified (W5) |
| F13 | Native unload / route-exit lock while pending | 209 | ✅ | Needs a `"trash"` lock kind (W10) |
| F14 | Scratch inactive elsewhere while the dialog is open | 210 | ✅ | |
| F15 | Own Trash vs external removal (VQ-01) | 209 | ⚠️ | W1 |
| F16 | Undo after own Trash | 209 | ⚠️ | W3 |
| F17 | Undo after Archive / external Trash | 209 | ⚠️ | W3 |
| F18 | Trash restore keeps the sentinel | 209, 210 | ⚠️ | W4 |
| F19 | Restore status vs remote arrival | existing | ✅ | |
| F20 | Hard delete / Empty trash of a trashed Scratch | existing | ✅ | `deletePlannedAggregate` |
| F21 | Bit detail "Move to trash" on a Scratch | none | ⚠️ | W9 |
| F22 | Retro Mac departure sheet | 211 | ✅ | |
| F23 | Retro Mac Breakdown Delete dialog | 210 | ✅ | A6 |
| F24 | Pool row control in base + Retro Mac | 210 | ⚠️ | All-theme impact (W7) |
| F25 | Capture, Inbox mounted, no draft | 212 | ✅ | |
| F26 | Capture with an Add draft (VQ-03) | 212 | ⚠️ | Focus after Discard (W8b) |
| F27 | Capture with a dirty inline editor | 212 | ⚠️ | W8c |
| F28 | Capture while switching is locked | 212 | ✅ | |
| F29 | Capture with an active query / collapsed Pool | 212 | ✅ | |
| F30 | Capture from another route | 212 | ⚠️ | Slot lifetime (W8a) |
| F31 | New capture never a remote arrival | existing/212 | ✅ | |
| F32 | Auto-close timing / Capture another | 212 | ✅ | |
| F33 | Theme/mode change during the dialog | 208 only | ⚠️ | W11 |
| F34 | One tree / DataStore-only / no op log | 209–212 | ✅ | |
| F35 | Writer register / Phase 35 dependency | plan | ⚠️ | W10, A1 |

### Findings

**Gaps**
- **G1:** Valid-blur save fires when the user activates Pool Trash or `[X]`. Activation saves the dirty editor and takes the edit lock, so the H08 "discard" disclosure is almost unreachable.
- **G2:** An open placement flow holds no lock, so Trash stays enabled. It can delete the candidate under the open flow and perform a forbidden Scratch switch.

**Weak**
- **W1:** VQ-01 is entered through the `triage-store` `reconcileScratchPoolContext`, `use-external-scratch-removal-data` and the workspace, not through `use-inbox`. The own-Trash marker must be mounted-page `{scratchId, expectedVersion}` state, set at dispatch and cleared at the terminal result. A conflict while the Scratch is inactive enters VQ-01.
- **W2:** The Archive handoff lives in `triage-workspace.tsx` `handleArchiveApplied` plus `triage-store` `finishScratchArchive`, not in `use-archive-scratch.ts`.
- **W3:**
  - SPEC says "dispatch" in one place and "success" in another for Undo unavailability.
  - Undo reconciliation has no owner check.
  - The reason copy is mapped in `hierarchy-explorer.tsx`.
- **W4:** `restoreBit` relocates the Scratch away from `(0,0)` today; the fix belongs to `restoreBit` plus `cascade-restore.test.ts`.
- **W5:** Cancel and Escape must not dismiss the dialog while it is pending or unknown.
- **W6:** An unresolved-source candidate makes Trash impossible.
- **W7:** The Pool row restructure affects all eight themes; verify them all.
- **W8:**
  - a: capture slot lifetime
  - b: focus after Discard from a capture
  - c: dirty editor at capture close
  - d: unselected Trash with no visible row left
- **W9:** The Bit detail popup can still trash a Scratch through `softDeleteBit`.
- **W10:** Files missing from the tasks: `use-triage-operation-lock.ts`, `use-external-scratch-removal-data.ts`, `cascade-restore.test.ts`, `triage-undo.test.ts`, `hierarchy-explorer.tsx`.
- **W11:** UF-29 preservation for the Trash dialog.

**Advisory**
- **A1:** Graph: draw `212 → 173`.
- **A2:** Task 165 row still says 29 UF; it is historical.
- **A3:** L1/L2 authority lines and the placement of the L2 note.
- **A4:** UF-08 add 212; AF-04 add 209.
- **A5:** Phase 41 row in PLANNING_STANDARD §5.2.
- **A6:** `ui/alert-dialog.tsx` overlay hook and animation.
- **A7:** Read `expectedVersion` live at confirm.
- **A8:** Give the Pool control its own data role.
- **A9:** Supersede the Phase 34 `[X]` assertions.
- **A10:** `[X]` is inert under overlays.
- **A11:** Clear the departure Add draft on Trash success.
- **A12:** Record the 16px `[X]` target-size rationale.

**Verdict, round 1:** Gaps remain (G1, G2).

## Round 2: 2026-10-15

**Inputs:** the round-1 fixes on top of `9367229`. User decisions H17–H21 cover G1(a), G2, W6, W3 (archived copy) and W9 (hide popup Trash). Only the amended sections were re-read.

### Status of round-1 findings

| ID | Status |
|---|---|
| G1 | Resolved by H17: blur-save exception, `handleFieldBlur` data-attribute exemption, acceptance added |
| G2 | Resolved by H18: placement-open disables Trash with a reason |
| W1 | Resolved. Suppression is owned in `triage-store`, `use-external-scratch-removal-data` and `use-inbox`, keyed on `{scratchId, expectedVersion}`; the clearing point was fixed under N2 |
| W2–W11, W8a–d | Resolved |
| A1, A4–A12 | Resolved |
| A2 | Accepted as a historical record |
| A3 | Resolved after round 2: the Phase 35–39 L1 authority lines now cite `UF-01–05/28–30` |

### New findings in round 2, all fixed in the same session

- **N1 (Weak): the dialog has no `rejected` state.**
  - SPEC: Confirm is disabled when an unresolved-source candidate appears; a `rejected` result shows that reason with Cancel only, and the lock is released.
  - Recipe: rejected copy added, and `rejected` listed among the dismissible states.
  - Task 210: acceptance added.
- **N2 (Weak): the own-Trash marker was cleared too early.** It is now cleared once the Pool lifecycle projection has observed the deletion, or at a terminal result other than applied. Task 209 acceptance adds the "emission after the result" ordering.
- **N3 (Advisory): source of the Undo reason.** The hook reads the owning Scratch lifecycle through the DataStore, and owner-inactive takes precedence over `invalid-provenance`. The Undo result shape is unchanged.
- **N4 (Advisory): per-row unresolved-source flag.** It is kept live by `use-trash-scratch` over `stagedCandidates` and `scratchBreakdowns`.
- **N5 (Advisory): Phase 41 authority line.** It now cites H01–H21.

### Summary

- Flows: 35. Owned 35, Weak 0, Gap 0, Deferred 0. F12 and F15 are closed by the N1 and N2 fixes.
- Flow ownership: **PASS**.
- Implementation readiness: **READY** after the Phase 41 lifecycle gate (`/run-phase 41`).

**Verdict:** No Gap remains.
