# Flow-Trace Review: Phase 34 Task 171A repair scope

## Round 1

**Reviewed:** 2026-10-15 by the `expert` subagent, independent of the plan author.
**Inputs:** the uncommitted diff to `docs/EXECUTION_PLAN.md` (Task 171A; the Task 172 dependency; the Phase Index, readiness, graph and Next Numbers rows), `docs/SPEC.md` (Inbox Archive bullets, the lifetime row, VQ-07, VQ-12), both recipes' §Focus, `docs/DESIGN_TOKENS.md` (Explorer search, Archive), ledger MI-4/MI-8/MI-11. Code read: `src/hooks/use-archive-scratch.ts`, `src/components/triage/triage-workspace.tsx`, `breakdown-panel.tsx`, `src/stores/triage-store.ts`, `src/hooks/use-grid-explorer-search.ts`, `grid-explorer-search-results.tsx`. Baseline: the three targeted test files pass (122 tests). G4 was reproduced with a scratch hook test outside the repo.
**Decision prerequisites:** DP-VQ07, DP-VQ10 and DP-VQ12 are closed and unchanged. New user decisions needed: G3b and the G4 owner.

### Flow-Trace Table

| # | Flow / source | States and data effects | Task / action | Boundary cases | Status |
|---|---|---|---|---|---|
| 1 | UF-28 live Archive success | idle → pending → applied. `applyTerminal` awaits `onApplied` (`use-archive-scratch.ts:181`). `finishScratchArchive` changes `selectedScratchId` while the phase is still `pending`; only then do the lock release (`:186`) and the terminal commit happen. | Part A: gate change, focus kind consumed in a layout effect, keep the order | With the gate open, the in-between render mounts the next Scratch's `BreakdownPanel` (`key={selectedScratchId}`). `completionWithArchive` passes the `pending` operation through (`triage-workspace.tsx:963-971`), so the next Scratch shows "Archiving this Scratch…". The old focused slot is removed in the same render, so focus is on BODY until success. This contradicts the new "slot survives" wording. | ❌ G1 |
| 2 | UF-28 live unknown → Check again → reconciling → applied | The lock is held until `applyTerminal`; `reconcile` for a live operation commits `blocksProjection:false`, then follows #1. | Part A | The success path has G1. Before success the boundary is never needed. | ⚠️ (G1) |
| 3 | UF-28 live not_applied / rejected / conflict, then a Scratch switch | Terminal releases the lock, so the Pool allows a switch. Today the gate shows the boundary when the operation's Scratch is no longer selected. | Part A gate | Under the new gate, A's card with A's Retry is drawn into Scratch B, and `retry` re-dispatches A. If the card is hidden instead, Archive on B silently returns false because the guard refuses any terminal phase (`:238`). | ❌ G3b |
| 4 | UF-28 storage failure | A pre-dispatch failure is shown inline. A post-dispatch descriptor-clear failure commits `blocksProjection:true` (`:149-157`), unmounting the workspace for a live operation. | Part A | The absolute "never unmounts" wording contradicts this kept path. | ⚠️ G5 |
| 5 | UF-28 forced-reload recovery | `readInitialState` returns `recovering` or `storage_failed` with `blocksProjection:true`; reconcile carries the block until terminal. | Part A: restored flag | The restored flag has no end condition: a restored `not_applied` on the selected Scratch shows inline; Retry → applied changes the selection while the operation is "restored", so the boundary and MI-8 return. | ❌ G3a |
| 6 | UF-28 a second Archive in the same mounted page | After success the phase stays `terminal/applied`; nothing resets it to `idle` (`dismissTerminal` refuses success, `:368-380`), and `archiveScratch` refuses any terminal phase. | Not owned | Reproduced: the second `archiveScratch` returned `false` with one dispatch. Predates 171A. | ❌ G4 |
| 7 | UF-24/25 Newly marker and Undo across Archive | `useTriageNewlyPlaced` lives under the content tree (`:1266`); staying mounted fixes it. | Part A | `useArchiveScratch` and `BreakdownPanel` are mocked in `triage-workspace.test.tsx`, so an identity/marker test can pass without the fix. UF-24/25 not cited. | ⚠️ G6 |
| 8 | UF-14/16 Staging status across Archive | The Staging alert clears on Scratch switch (SPEC 591–596); a successful Archive always switches. | Part A acceptance; SPEC | "Staging status survives" contradicts SPEC. | ❌ G2 |
| 9 | UF-17–19 Explorer search across Archive | `useGridExplorerSearch` (`hierarchy-explorer.tsx:539`) survives once mounted; SPEC 713 keeps search on Scratch switch. | Part A | Covered once G1 is fixed. | ✅ |
| 10 | UF-18 error → Try again → input | `retry` (`use-grid-explorer-search.ts:386-390`) sets no focus target; the button exists only in `error`. | Part B | Trap: `INPUT_FOCUS` is one shared object and already the default, so `setFocusTarget(INPUT_FOCUS)` alone does nothing. | ✅ |
| 11 | UF-26/27 overlay, Cancel, reopen | Not touched; regression listed. | Part A regression | — | ✅ |
| 12 | Plan wiring | Phase Index, readiness, graph, Task 172 dependency, ledger consistent. | — | 171A missing from four Shared-File Writer Register rows; graph reconciliation counts stale; "Part" vs "Stage" naming; DESIGN_TOKENS Navigation/focus row silent on `Try again`. | ⚠️ W1 |

### Gaps Found

| # | Gap | Recommended resolution |
|---|---|---|
| G1 | A committed render shows the next Scratch with a pending card and focus on BODY. | Project the card only into its own Scratch's Breakdown; focus never rests on BODY at any commit. Add acceptance for every commit between dispatch and success. |
| G2 | "Staging status" cannot survive (SPEC 591–596). | Remove it from SPEC, plan and ledger wording. |
| G3a | The restored flag has no end condition. | Once an operation is shown in the workspace, none of its later states shows the recovery projection. Direct test: restored `not_applied` on the selected Scratch → Retry → applied keeps the workspace. |
| G3b | A live non-success result follows the selection; Retry targets the old Scratch. | User decision, recorded in SPEC and the recipe. |
| G4 | A second Archive in the same page silently does nothing. | Fold into Part A or give it an owner. |
| G5 | Post-dispatch storage failure blocks the projection for a live operation. | Narrow the invariant to name that exception. |
| G6 | Mocked coordinator makes identity/marker tests trivially pass. | Require one workspace test with the real coordinator or a mock reproducing pending → selection change → terminal; cite UF-24/25. |
| W1 | Register rows, counts, naming, DESIGN_TOKENS row. | Add 171A to the five register rows, update counts, use "Stage A/B", add `Try again` focus to the DESIGN_TOKENS row. |

### Summary

- Flows traced: 12. Fully owned: 3. Weak: 4. Gaps: 5. Deferred: 0.
- Flow ownership: **GAPS FOUND**. Implementation readiness: **BLOCKED_PENDING_USER_DECISIONS** (Stage A); Stage B READY.

### Resolution

- User decisions (2026-10-15): G3b — a Scratch switch after a non-success terminal result dismisses it like Cancel, with no write. G4 — folded into Stage A and recorded as MI-12.
- G1, G2, G3a, G5, G6 and W1 applied to SPEC, the Archive and Explorer recipes, DESIGN_TOKENS and the plan in the same change.

## Round 2

**Reviewed:** 2026-10-15 by the same `expert`, against the diff after the round-1 fixes.

| # | Item | Result | Status |
|---|---|---|---|
| G1 | In-between handoff render | Card only on `recovery.scratchBitId`'s Breakdown; a parent layout effect keyed on the selection change moves focus in the render that removes the old slot. | ✅ |
| G2 | Staging status | Removed; acceptance says the alert clears. | ✅ |
| G3a | Restored flag lifetime | "Restored and not yet shown, sticky once shown" covers both paths. | ✅ |
| G3b | Switch dismisses non-success | Nonterminal states still keep the lock, so the "not on Scratch switch" rule holds; the Pool allows a switch in terminal state (`scratch-pool.tsx:346-352`). The selection can also change outside the Pool (`finishExternalScratchRemoval`, `reconcileScratchPoolContext`). | ⚠️ R2-3 |
| G4 | Second Archive | Descriptor clearing is unaffected (`:178-179`), but returning to `idle` in place of the terminal commit would drop the `Scratch archived.` announcement (`triage-workspace.tsx:909-912`). | ❌ R2-2 |
| G5, G6, W1 | Storage exception, real-coordinator test, wiring | Resolved; 37 + 171A = 38 is correct. | ✅ |
| New | Pre-dispatch storage failure | `recovery: null` (`use-archive-scratch.ts:254-259`), so "card only on `recovery.scratchBitId`" would hide the existing "Archive couldn't start…" card. | ❌ R2-1 |
| UF-18 | Stage B | Consistent. | ✅ |
| Testability | Per-commit bullet | Needs a stated method. | ⚠️ advisory |

### Resolution

- R2-1: SPEC and Stage A show the pre-dispatch storage-failure card on the Scratch where Archive was activated; a selection change dismisses it like Cancel.
- R2-2: SPEC, Stage A and MI-12 keep the terminal-success commit and its one announcement, then accept a later Archive as a new operation.
- R2-3: dismissal triggers on any change of the selected Scratch (Pool, external-removal handoff, Pool reconciliation), implemented in `triage-workspace.tsx`.
- Testability: the Stage A verification states the held-promise, per-step `act` method with a `MutationObserver`.
- No new user decision; all fixes sit inside G3b and G4 and in files already listed.

## Round 3

**Reviewed:** 2026-10-15 by the same `expert`, against the diff after the round-2 fixes.

| Item | Check | Status |
|---|---|---|
| R2-1 | Pre-dispatch (`recovery:null`, `blocksProjection:false`) and post-dispatch (`blocksProjection:true`, not dismissible) storage failures are separate states; the dismiss rule names only the pre-dispatch one. | ✅ |
| R2-2 | Terminal success is committed and `Scratch archived.` renders once before a new Archive is accepted; descriptor clearing still precedes the handoff. | ✅ |
| R2-3 | The success handoff changes the selection while the phase is `pending`, so a phase-checking watcher does not dismiss it; same for Retry → pending → success. | ✅ |
| Testability | Every acceptance bullet has a direct test path. | ✅ |
| Advisory | `sidebar.tsx` also runs `useInbox` Pool reconciliation while a restored terminal is held in the recovery projection; an unrelated selection change must not dismiss it. Added to Stage A acceptance. | ⚠️ → applied |

### Summary

- Gaps: 0. Advisory: 1 (applied). Decision prerequisites: 0 open; G3b and G4 decided by the user.
- Flow ownership: **PASS**
- Implementation readiness: **READY** (Stage A and Stage B)
