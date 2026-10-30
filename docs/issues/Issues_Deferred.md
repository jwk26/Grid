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
| `Issues_Phase_14.md` | Batch 1 note | Calendar performance | `toSorted()` + `useMemo` review item was deferred because the list was small and the pattern pre-existed. | Recheck only if calendar list size or render cost becomes measurable. |
| `Issues_Phase_14.md` | Batch 1 note | Accessibility | Popup item buttons lack `focus-visible` styling; pre-existing and deferred. | Include in a calendar/a11y polish pass. |
| `Issues_Phase_16.md` | ISSUE-16-02 | Accessibility | `ScratchModal` lacks focus trap and trigger-focus restoration. | Add focus trap/restoration before or during a dedicated a11y pass. |
| `Issues_Phase_16.md` | ISSUE-16-03 | Interaction | Scratch modal auto-close timer can start despite cursor already hovering on success transition. | Track hover state/ref on success entry or migrate timer logic. |
| `Issues_Phase_18.md` | ISSUE-18-08 | Visual polish | Remove-from-staging target has no entry/exit fade or scale animation. | Revisit as visual polish; likely requires delayed unmount or animation wrapper. |
| `Issues_Phase_18.md` | ISSUE-18-09 | Visual / accessibility | Remove target border/transition timing and Archive button ring-offset findings remain follow-up polish. | Decide visual treatment in the next UI polish pass. |
| `Issues_Phase_18.md` | ISSUE-18-16 | Inbox/Triage UX | Staged Node/Bit should be removable by dropping back onto the Breakdown area. | Promote to a follow-up Inbox/Triage UX task. |
| `Issues_Phase_18.md` | ISSUE-18-22 | Product policy | Duplicate Node/Bit titles are allowed globally; policy is undecided. | Decide global title uniqueness policy before implementing validation. |
| `Issues_Phase_19.md` | ISSUE-19-01 | UX follow-up | Archive menu trigger (`⋯`) on NodeCard/BitCard is too subtle and hard to click. | User to rethink interaction model before implementation. |
| `Issues_Phase_20.md` | ISSUE-20-02 | Brainstorming/Visual | BitCard does not yet consume Batch 2 color-theme surface/font/depth treatment. Needs separate design pass before implementation. | Add to brainstorming before implementation. |
| `Issues_Phase_20.md` | ISSUE-20-03 | Deferred/Low | `borderOpacity` prop in `GridCellProps` and `levelOpacityMap` in `grid-view.tsx` are now dead code, superseded by theme CSS variable system. | Candidate for cleanup in a future phase. |
| `Issues_Phase_20.md` | ISSUE-20-04 | Deferred/Behavior | Inbox and Archive system Nodes should not receive normal NodeCard aging visual treatment. | Exclude `systemRole !== null` Nodes from aging filter in a focused behavior fix. |
| `Issues_Phase_21.md` | ISSUE-21-01 | Process/Low | Sequential Codex A→B execution: B's scope verification relied on `git status` alone after A left uncommitted changes — cannot distinguish B's writes from A's. | Save `git diff --name-only` baseline before B launches, or commit A before B. |
| `Issues_Phase_21.md` | ISSUE-21-03 | UX/Low | Weekly header now shows `"June 2026"` instead of date range; cross-month weeks lose date-range information. Recipe canonical, intentional tradeoff. | Post-Phase 21 UX review — assess whether date-range label is needed alongside month name. |
| `Issues_Phase_27.md` | P27-06 | Inbox/Triage hydration | Persisted-dark reload can expose the pre-existing `ThemeToggle` Moon/Sun server/client mismatch. | Address only in a separately approved future lifecycle; comparative baseline evidence is retained with Task 144. |
| `Issues_Phase_29.md` | P29-01 | Inbox/Triage visual fidelity | Advisory: ordinary Explorer-card gap and broader eight-theme debt remain explicitly deferred, not accepted as visually complete. | Theme stage (`2026-10-17-theme-scope-replan`), after the retirement of Phases 36–40 (feedback F28, 2026-10-22); common-card Q01 requires its exact owner/design gate. The historical Phase 31 audit is not retroactively accepted and grants no repair authority. |
| `Issues_Phase_34.md` | MI-5 | Grid interaction | On the ordinary Grid, Bit options lose pointer events to another element (observed outside Phase 34 scope). | Check in the next Grid interaction pass; no phase assigned. |
| `Issues_Phase_34.md` | MI-6 | Inbox/Triage visual fidelity | Retro-mac Explorer locked-pane surface differs from the prototype, left at Task 169 acceptance with D-CARD and P29-01. | Theme stage (`2026-10-17-theme-scope-replan`), with P29-01 (feedback F28, 2026-10-22). |
| `Issues_Phase_35.md` | MI-14 | Inbox/Triage selection | Reload selects the first Scratch instead of the last one the user worked on; SPEC `Scratch Pool` "Selection and re-entry" keeps the selection only within the app session, by design. | Task 250 (feedback lane, Phase 50): the last selected Scratch persists per device in `triage-preferences-store` (feedback F27). |
| `Issues_Phase_35.md` | MI-21 | Inbox/Triage layout | At 1024px with the Pool open, Breakdown rows (title 0px) and the Staging well (Node card 14px) are too narrow; shared row grid in every theme. | Tasks 245 (22px Breakdown status slot, feedback F07) and 246 (`Nodes` zone minimum width and auto-fill grid, F10), Phase 50; options (A)–(C) are superseded. |
| `Issues_Phase_49.md` | mi-1 | Feedback copy | The two Calendar create sentences in `src/app/calendar/layout.tsx` (`No empty cells available in the root grid.`, `… in the parent node.`) do not follow the SPEC §Feedback copy create-dialog row. | Task 248 (feedback lane, Phase 50): align them, in the one feedback-lane task that edits `calendar/layout.tsx`. |
| `Issues_Phase_49.md` | mi-2 | Toasts / Calendar DnD | During a Calendar drag the toast stack stays opaque and takes the pointer, covering the Pool header, the top of the Node Pool unschedule zone and a strip of the first weekly day column; drops still resolve by rect collision. | Task 248 (Phase 50): `calendar/layout.tsx` writes the drag flag to the toast anchor the way `GridRuntime` does. |
| `Issues_Phase_49.md` | mi-3 | Grid DnD | An Escape-cancelled Grid drag leaves `useDnd`'s `activeItem` set: `data-dragging` stays on the grid (cards dimmed, wrapper clipped) and the breadcrumb stays drag-styled. Pre-existing. | Task 248 (Phase 50): `use-dnd.ts` clears `activeItem` on drag cancel, with a test. |
| `Issues_Phase_42.md` | MI-8 | SaaS performance (D8) | On production the limit-sized snapshot load took 6,963 ms once and 2,300 and 2,208 ms twice against the 3 s target; the one-tenth account passed (160–230 ms against 1 s). Cause not established. | Task 240 (Phase 48): measure again on production after an `analyze`, server and network time apart; if it fails, a migration lowers the account limits before the Phase 48 close (user, 2026-10-24). |
| `Issues_Phase_45.md` | MI-24 | Theme legibility | In `retro-mac` the session-expired and load-failure screens put the muted reason line straight on the 4px dither (SA-4 option C, no card), so it is hard to read; the title a little less so. | Theme stage (`2026-10-17-theme-scope-replan`): the SA-4 look stays as recorded until then (user, 2026-10-29). |
| `Issues_Phase_45.md` | mi-1 | Inbox status copy | In `retro-mac` and `neumorphism` the Add `account_limit` line under the Breakdown input is cut off with an ellipsis at 1280px. | Task 245 (Phase 50): the rebuilt Breakdown and Add status surface shows the whole `account_limit` reason (user, 2026-10-29). |
| `Issues_Phase_45.md` | mi-2 | Inbox status copy | In `neumorphism` the rejected placement line inside the `Confirm placement` card in the Home column is clipped at the bottom of the narrow column at 1280px. | Task 246 (Phase 50): the rebuilt Staging status surface shows the whole `account_limit` reason (user, 2026-10-29). |
| `Issues_Phase_45.md` | mi-3 | Fixture / Grid full | The Full folder fixture does not read as full: the Create dialog uses the measured breadcrumb zone, smaller than the reserved 3×2 block, so a Bit can land in a block cell the fixture may not fill (F34). | Task 249 (Phase 50): after the zone guards move to the server, check that the 156-Bit Full folder reads as full; until then the `inbox-triage.js` header recipe applies (user, 2026-10-29). |

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
| `Issues_Phase_18.md` | ISSUE-18-17 | Closed — Phase 22 T97/T98: state model separates Scratch selection from first-keystroke Pool collapse. |
| `Issues_Phase_18.md` | ISSUE-18-18 | Closed — Phase 22 T98: Enter keeps focus in the add-note input after Breakdown submit. |
| `Issues_Phase_18.md` | ISSUE-18-19 | Closed — Phase 22 T98: compact selected-Scratch context strip at the top-left of the Breakdown section. |
| `Issues_Phase_18.md` | ISSUE-18-20 | Closed — Phase 22 T99/T100: invalid drop state uses muted/unavailable visual language instead of destructive red. |
| `Issues_Phase_18.md` | ISSUE-18-21 | Closed — Phase 22 T100: scoped active-section search with a persistent filter indicator. |
| `Issues_Phase_34.md` | MI-9 | Phase 35 Task 178: the Archive confirmation detail moved into `INBOX_TRIAGE_COPY.archive.confirmationDetail`; Neumorphism keeps it hidden (user, option A, 2026-10-19). |
| `Issues_Phase_34.md` | Close Advisory A2 | Phase 35 Task 178: Archive handoff focus is recorded through `onBeforeDestination`, as Trash does; `expert` review found no regression or ref leak. |
| `Issues_Phase_35.md` | MI-2 | Dropped (user, 2026-10-20): one unreproduced `hierarchy-explorer.test.tsx` failure; 20 isolated runs and every later full run passed. A new failure opens a new item. |
| `Issues_Phase_41.md` | MI-2 | Dropped (user, 2026-10-22): the Terminal theme leaves and Task 180 is retired (feedback F28). |
| `Issues_Phase_3.md` | Issue 6 | Closed (user, 2026-10-22): stale; hooks reach the store through `getDataStore()` and none imports `indexedDBStore`. |
| `Issues_Phase_27.md` | P27-08 | Closed (user, 2026-10-22): moot under SaaS S18; the confirmed-orphan command and its audit store are removed, since a foreign key from a candidate to its source makes an orphan impossible. |
| `Issues_Phase_20.md` | ISSUE-20-01 | Phase 49 Task 241: the store and the no-flash script read one non-client list in `src/lib/color-themes.ts`, with the four-theme set. |
| `Issues_Phase_35.md` | MI-13 | Phase 49 Task 241: the color themes are `griddo`, `retro-mac`, `neumorphism` and `claymorphism`; Paper replaces `griddo` in the theme stage (feedback F28, SaaS S40). |
| `EXECUTION_PLAN.md` (user, 2026-10-22) | Phase 23–30 bodies | Resolved (user, 2026-10-25): each body was compared with its archive; the Phase 24–30 task contracts moved verbatim into their archives, the duplicated Close Notes and Phase 23 Notes were dropped, and the plan keeps one short archive link per phase. No anchor link pointed into the removed sections. |
| `Issues_Phase_42.md` | MI-1 | Closed at the Phase 44 close by the user's 2026-10-25 rule: no recurrence in the Phase 43 and Phase 44 gates (every full `pnpm test` run saved to a file). A new failure opens a new item. |
| `Issues_Phase_35.md` | MI-19 | Phase 45 Task 229: the lifecycle handoff reads the Pool search, the sort and the fallback Pool from the stores after `await readTerminalSnapshot`, with three tests; closed by the user (2026-10-29). |
| `Issues_Phase_35.md` | MI-23 | Phase 45 Task 228 (the load-failure screen) and Phase 47 Task 234 (the delayed Loading screen); closed by the user (2026-10-30). |
