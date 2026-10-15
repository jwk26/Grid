# Deferred Issues Index

This document is a central index for deferred or follow-up issues discovered during phase execution.

It is **not** the source of truth for issue details. The source remains each `docs/issues/Issues_Phase_N.md` file. Use this index to find deferred work without manually scanning every phase issue document.

## How to Use

- Keep the full issue detail in the phase issue document where it was discovered.
- Add a short row here when an issue is explicitly deferred, promoted later, or left as a follow-up.
- When a deferred item is resolved, update both the source phase issue and this index.
- Do not use this document for active current-phase blockers. Those stay in the active phase issue document until resolved or deferred.

## Active Deferred / Follow-up Items

| Source | Item | Area | Summary | Suggested Next Step |
|---|---|---|---|---|
| `Issues_Phase_3.md` | Issue 5 | Accessibility | `CreateNodeDialog` icon picker uses radiogroup semantics but lacks single-tab-stop arrow-key navigation. | Revisit in a dedicated a11y pass; use Radix `RadioGroup` or implement full keyboard contract. |
| `Issues_Phase_3.md` | Issue 6 | Architecture | DataStore context exists, but hooks still use direct `indexedDBStore` imports. | Decide canonical data-access pattern before a broad hook refactor. |
| `Issues_Phase_14.md` | Batch 1 note | Calendar performance | `toSorted()` + `useMemo` review item was deferred because the list was small and the pattern pre-existed. | Recheck only if calendar list size or render cost becomes measurable. |
| `Issues_Phase_14.md` | Batch 1 note | Accessibility | Popup item buttons lack `focus-visible` styling; pre-existing and deferred. | Include in a calendar/a11y polish pass. |
| `Issues_Phase_16.md` | ISSUE-16-02 | Accessibility | `ScratchModal` lacks focus trap and trigger-focus restoration. | Add focus trap/restoration before or during a dedicated a11y pass. |
| `Issues_Phase_16.md` | ISSUE-16-03 | Interaction | Scratch modal auto-close timer can start despite cursor already hovering on success transition. | Track hover state/ref on success entry or migrate timer logic. |
| `Issues_Phase_18.md` | ISSUE-18-08 | Visual polish | Remove-from-staging target has no entry/exit fade or scale animation. | Revisit as visual polish; likely requires delayed unmount or animation wrapper. |
| `Issues_Phase_18.md` | ISSUE-18-09 | Visual / accessibility | Remove target border/transition timing and Archive button ring-offset findings remain follow-up polish. | Decide visual treatment in the next UI polish pass. |
| `Issues_Phase_18.md` | ISSUE-18-16 | Inbox/Triage UX | Staged Node/Bit should be removable by dropping back onto the Breakdown area. | Promote to a follow-up Inbox/Triage UX task. |
| ~~`Issues_Phase_18.md`~~ | ~~ISSUE-18-17~~ | ~~Inbox/Triage UX~~ | ~~Scratch pool sidebar folds on Scratch selection instead of Breakdown-section focus.~~ | **Closed — Phase 22 T97/T98:** state model separates selection from first-keystroke collapse. |
| ~~`Issues_Phase_18.md`~~ | ~~ISSUE-18-18~~ | ~~Inbox/Triage UX~~ | ~~`Add a note...` input loses focus after Enter, blocking rapid note entry.~~ | **Closed — Phase 22 T98:** Enter keeps focus in add-note input after Breakdown submit. |
| ~~`Issues_Phase_18.md`~~ | ~~ISSUE-18-19~~ | ~~Inbox/Triage UX~~ | ~~Breakdown panel needs visible selected Scratch context.~~ | **Closed — Phase 22 T98:** compact context strip added at top-left of Breakdown section. |
| ~~`Issues_Phase_18.md`~~ | ~~ISSUE-18-20~~ | ~~Inbox/Triage visual state~~ | ~~Invalid hierarchy/staging drop state uses destructive red treatment too strongly.~~ | **Closed — Phase 22 T99/T100:** replaced with muted/unavailable visual language (`border-muted bg-muted/10`). |
| ~~`Issues_Phase_18.md`~~ | ~~ISSUE-18-21~~ | ~~Hierarchy Explorer~~ | ~~Search bar may be missing; canonical requirement still needs confirmation.~~ | **Closed — Phase 22 T100:** scoped active-section search delivered with persistent filter indicator. |
| `Issues_Phase_18.md` | ISSUE-18-22 | Product policy | Duplicate Node/Bit titles are allowed globally; policy is undecided. | Decide global title uniqueness policy before implementing validation. |
| `Issues_Phase_19.md` | ISSUE-19-01 | UX follow-up | Archive menu trigger (`⋯`) on NodeCard/BitCard is too subtle and hard to click. | User to rethink interaction model before implementation. |
| `Issues_Phase_20.md` | ISSUE-20-01 | Deferred/Low | `no-flash` script in `layout.tsx` duplicates the 8-theme id list and persistence key from `color-theme-store.ts`. | Refactor to a shared non-client constants module in a future phase. |
| `Issues_Phase_20.md` | ISSUE-20-02 | Brainstorming/Visual | BitCard does not yet consume Batch 2 color-theme surface/font/depth treatment. Needs separate design pass before implementation. | Add to brainstorming before implementation. |
| `Issues_Phase_20.md` | ISSUE-20-03 | Deferred/Low | `borderOpacity` prop in `GridCellProps` and `levelOpacityMap` in `grid-view.tsx` are now dead code, superseded by theme CSS variable system. | Candidate for cleanup in a future phase. |
| `Issues_Phase_20.md` | ISSUE-20-04 | Deferred/Behavior | Inbox and Archive system Nodes should not receive normal NodeCard aging visual treatment. | Exclude `systemRole !== null` Nodes from aging filter in a focused behavior fix. |
| `Issues_Phase_21.md` | ISSUE-21-01 | Process/Low | Sequential Codex A→B execution: B's scope verification relied on `git status` alone after A left uncommitted changes — cannot distinguish B's writes from A's. | Save `git diff --name-only` baseline before B launches, or commit A before B. |
| `Issues_Phase_21.md` | ISSUE-21-03 | UX/Low | Weekly header now shows `"June 2026"` instead of date range; cross-month weeks lose date-range information. Recipe canonical, intentional tradeoff. | Post-Phase 21 UX review — assess whether date-range label is needed alongside month name. |
| `Issues_Phase_27.md` | P27-06 | Inbox/Triage hydration | Persisted-dark reload can expose the pre-existing `ThemeToggle` Moon/Sun server/client mismatch. | Address only in a separately approved future lifecycle; comparative baseline evidence is retained with Task 144. |
| `Issues_Phase_27.md` | P27-08 | Staging remote authority | Confirmed-orphan production/browser reachability has no authoritative proof producer or production caller. | Define remote-authority proof and reachability in a future lifecycle without inferring it from candidate disappearance. |
| `Issues_Phase_29.md` | P29-01 | Inbox/Triage visual fidelity | Advisory: ordinary Explorer-card gap and broader eight-theme debt remain explicitly deferred, not accepted as visually complete. | Approved future Phases 34–40 own region/theme realization; common-card Q01 requires its exact owner/design gate. The historical Phase 31 audit is not retroactively accepted and grants no repair authority. |
| `Issues_Phase_34.md` | MI-5 | Grid interaction | On the ordinary Grid, Bit options lose pointer events to another element (observed outside Phase 34 scope). | Check in the next Grid interaction pass; no phase assigned. |
| `Issues_Phase_34.md` | MI-6 | Inbox/Triage visual fidelity | Retro-mac Explorer locked-pane surface differs from the prototype, left at Task 169 acceptance with D-CARD and P29-01. | Same owner as P29-01: Phases 35–40 region realization. |
| `Issues_Phase_34.md` | MI-9 | Inbox/Triage copy | Archive confirmation detail string is written in `breakdown-panel.tsx`; only retro-mac shows it. Canonical in the Archive recipe Retro Mac section. | Task 178: move it into `INBOX_TRIAGE_COPY` and decide neumorphism visibility (line in the Task 178 plan section). |
| `Issues_Phase_34.md` | Close Advisory A2 | Inbox/Triage focus | Archive handoff focus relies on setting `pendingArchiveFocusRef` after `finishScratchArchive` and before React flushes the selection change. Works and is covered by real-coordinator tests. | Task 178: review setting the ref before the store update (line in the Task 178 plan section). |

## Resolved Historical Deferrals

These are listed so future sessions do not re-open already handled carryovers.

| Source | Item | Resolution |
|---|---|---|
| `Issues_Phase_5.md` | Issue 6 | Urgency hooks bypassing DataStore facade was deferred to Phase 5.5 and handled there. |
| `Issues_Phase_15.md` | ISSUE-15-01 | Runtime Dexie v3 migration verification was carried to Phase 16 and resolved with `fake-indexeddb` real migration tests. |
| `Issues_Phase_15.md` | Phase-local Q6 | Phase 19 kickoff: EXECUTION_PLAN T87 corrected to `unarchiveNode`/`unarchiveBit`; Issues_Phase_15.md Q6 marked Resolved. |
| `Issues_Phase_23.md` | P23-03 | Phase 26 Task 130 added the accepted popup visibility guard for Inbox-parented Scratch while preserving ordinary eligible Bit promotion. |
| `Issues_Phase_23.md` | P23-02 | Phase 27 Task 136 removed the retired `deleteScratchBreakdownsByScratch` test mock and no-call assertion while replacing the hook mutation surface. |
| `Issues_Phase_31.md` | WF-2026-09-07-RUN-PHASE-RUN-TASK-HANDOFF | Dropped (user, 2026-10-15): the Codex post-close audit it waited for no longer exists after the switch to the Claude workflow. |
| `Issues_Phase_31.md` | WF-2026-09-07-RUN-TASK-PREMATURE-CHECKPOINT-CLOSURE | Dropped (user, 2026-10-15): the Codex post-close audit it waited for no longer exists after the switch to the Claude workflow. |
| `Issues_Phase_31.md` | WF-2026-09-09-CRAFT-DOCS-VISUAL-REALIZATION-CLOSURE | Dropped (user, 2026-10-15): the Codex post-close audit it waited for no longer exists after the switch to the Claude workflow. |
| `Issues_Phase_31.md` | WF-2026-09-09-TASK164-BLIND-REPLAY-ISOLATION | Dropped (user, 2026-10-15): the Codex post-close audit it waited for no longer exists after the switch to the Claude workflow. |
| `Issues_Phase_31.md` | WF-2026-09-09-RUN-TASK-RESUME-SELF-PROCESS-GUARD | Dropped (user, 2026-10-15): the Codex post-close audit it waited for no longer exists after the switch to the Claude workflow. |
| `Issues_Phase_31.md` | WF-2026-09-09-RUN-TASK-CLOSURE-STATE-RECONCILIATION | Dropped (user, 2026-10-15): the Codex post-close audit it waited for no longer exists after the switch to the Claude workflow. |
