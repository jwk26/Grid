# Phase 35 — Neumorphism Regional Realization

## Completion-time scope

Closed 2026-10-20. Tasks 173–179 and repair Tasks 176A and 179A are
user-accepted. Theme set: `neumorphism`. Ran on branch
`phase-35/neumorphism` under the lightweight Claude workflow, after Phase 41.

Carried in: MI-9 and Close Advisory A2 from Phase 34, both resolved in Task 178.
Carried over: MI-13, MI-14, MI-19, MI-21 and MI-23, deferred to the Phases
36–40 re-plan (`/craft-docs`, before `/run-phase 36`) in
[`Issues_Deferred.md`](../../issues/Issues_Deferred.md). MI-2 (one unreproduced
test failure) was dropped. Ledger:
[`Issues_Phase_35.md`](../../issues/Issues_Phase_35.md).

Differences from the Neumorphism-only task contracts below, as built and
accepted (each approved during its task and recorded in the ledger):

- Task 176: MI-10 stopped the urgency blink of Inbox Explorer Bit rows in every
  theme (`bit-card.tsx`); MI-12 put the Remove and Return-to-Breakdown targets
  first in `use-dnd.ts` collision detection.
- Task 176A: the Stage/Unstage commit-to-snapshot repair changed
  `use-staged-candidates.ts` (MI-15) for every theme.
- Task 178: A2 moved the Archive handoff focus to `onBeforeDestination`
  (`triage-workspace.tsx`, comment in `use-scratch-lifecycle-handoff.ts`).
- Task 179: MI-4 fixed the shared, unscoped external-removal panel rule for
  every theme (long unbroken titles).
- Task 179A: the Explorer title tooltip is its own file,
  `src/components/grid/explorer-title-tooltip.tsx`; MI-22 made the workspace
  pass the selected Scratch into `BreakdownPanel` for every theme.

The task contracts below are kept as accepted at close.

Visual reference: prototype route `/prototype/inbox-triage-neumorphism` in the read-only worktree `/Users/jwk/Documents/griddo2-claude-themes2-3` (commit `4f39709`). View it only; never copy its source or assets.

Flow review: [Inbox/Triage theme realization](../../reviews/2026-10-03-inbox-triage-theme-realization-flow-review.md) covers Phases 34–40.

### Task 173: [x] Fix the common frame and realize Scratch Pool

**Files and actions:** bind L1's exact per-file actions to `neumorphism` only. Conditional owner/decision gates remain in force. User-approved addition (2026-10-16): `src/lib/copy/inbox-triage.ts` may gain only the two visual sort-capsule labels `OLD`/`NEW` defined in the Scratch Pool recipe's Neumorphism section; no other copy changes.

**Dependencies:** Task 172 accepted and actual Phase 34 Final Close/main sync; Tasks 209–212 accepted and actual Phase 41 close/main sync; approved document/flow chain and this phase's fresh lifecycle gate. The matching L1 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L1; UF-01–05/28–30, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L1; no adjacent or experimental fallback.

**Observable acceptance:** Every L1 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L1, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize neumorphism frame-pool`.

### Task 174: [x] Realize Selected Scratch Context and Breakdown

**Files and actions:** bind L2's exact per-file actions to `neumorphism` only. Conditional owner/decision gates remain in force. User-approved addition (2026-10-16): `breakdown-panel.tsx` may mount the existing `sortTrackOld`/`sortTrackNew` copy as the one aria-hidden current-order sort label defined in the Selected Scratch Context recipe's Neumorphism section; no new or changed copy. User-approved addition (2026-10-16): in `src/app/globals.css`, the accepted neumorphism Pool rules may gain only the collapse-toggle and row-Trash interaction defined in the Scratch Pool recipe's Neumorphism section; no other Pool change.

**Dependencies:** Task 173 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L2 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L2; UF-06–12/14–15/26/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L2; no adjacent or experimental fallback.

**Observable acceptance:** Every L2 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L2, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize neumorphism context-breakdown`.

### Task 175: [x] Realize Staging and drag presentation

**Files and actions:** bind L3's exact per-file actions to `neumorphism` only. Conditional owner/decision gates remain in force. User-approved addition (2026-10-16): realize the L1 "Section header icons" clause for `neumorphism` here — `src/components/triage/triage-workspace.tsx` and `triage-workspace.test.tsx` may add the two aria-hidden heading icons, and `src/app/globals.css` shows them for `neumorphism` only; the L3 "Drop targets" clause applies, including the Breakdown Return overlay through `globals.css`. User-approved addition (2026-10-16, amended 2026-10-17): in `src/app/globals.css`, the accepted neumorphism Breakdown staged-row rules may change only to the staged-row look and contrast exception defined in the Breakdown row recipe's Neumorphism section; no JSX, copy or other Breakdown change. User-approved addition (2026-10-17): in `src/app/globals.css`, the neumorphism Remove-from-staging target and the Staging columns may take the drag-time layout defined in the Staging recipe's Neumorphism section, as an exception to the fixed list geometry in L3 "Drop targets"; no JSX, copy, delivery or other-theme change.

**Dependencies:** Task 174 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L3 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L3; UF-13–16/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L3; no adjacent or experimental fallback.

**Observable acceptance:** Every L3 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L3, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize neumorphism staging`.

### Task 176: [x] Realize Explorer base and replacement search

**Files and actions:** bind L4's exact per-file actions to `neumorphism` only. Conditional owner/decision gates remain in force. User-approved addition (2026-10-17): realize the L4 "Column drop region" amendment here, in Stage 2 with the neumorphism target states; Retro Mac's accepted target look moves with the hooks and is rechecked on the widened region. User-approved addition (2026-10-17): realize the L4 "Explorer urgency" amendment (MI-10) in Stage 2 as well, covered by the same `expert` review. User-approved addition (2026-10-17), Stage 4: (a) realize the L3 "Subsection drop region" amendment; (b) the neumorphism Staging well states drop the base line cues (dashed border, `ring-primary`) for the depth-and-tint language of the Explorer targets, in `globals.css` only; (c) MI-11 — a revealed row below its column's fold scrolls into view inside that column's own viewport only, never the page or the Explorer shell, in `hierarchy-explorer.tsx` with its test. One `expert` review covers (a) and (c). User-approved addition (2026-10-17), Stage 4 follow-up: (d) MI-12 — in `src/hooks/use-dnd.ts`, after the `pointerWithin` filter, put the Remove-from-staging and Return-to-Breakdown candidates first (a stable partition; other order unchanged), with a direct collision test in a new `src/hooks/use-dnd.test.ts`, so SPEC's Remove priority holds in every theme; (e) the neumorphism target transition adopted in the Staging and Explorer recipes, `globals.css` only; (f) Retro Mac — remove the well's leftover drop-state line now that the subsection carries the state, `globals.css` only. (d) gets an `expert` look. User-approved addition (2026-10-17), Stage 4 second follow-up, `globals.css` only unless (j) shows otherwise: (g) the neumorphism Remove target and Return overlay take the subsection hover transition and fade in at drag start (opacity only); (h) the neumorphism Return overlay covers the whole Breakdown body below the heading; (i) Retro Mac — no drop-state line on the wells; the eligible and the restored unavailable/invalid dashed frames on the whole subsection; hovered valid shows only the hatch; (j) the Staging flicker — while a Breakdown row is staged or a staged candidate is returned, the other candidates of that subsection, possibly including other Scratches' candidates, appear one after another over the moved card; reproduce it, compare with `2f094de` (before Stage 4) to tell whether Stage 4 caused it, and find the root cause with evidence, not a hypothesis — record the exact steps, which hook or projection emits which candidate list with which Scratch ids at each render, and whether other Scratches' candidates are really shown; record it as an issue with that cause, get an `expert` review of the diagnosis, and stop for the user's decision before any fix outside this task's listed files.

**Dependencies:** Task 175 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L4 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L4; UF-17–19/22/24–25/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L4; no adjacent or experimental fallback.

**Observable acceptance:** Every L4 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L4, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize neumorphism explorer-search`.

### Task 176A: [x] Repair the Staging Stage/Unstage commit-to-snapshot gap

A bounded repair of shared hook and component behavior found in Task 176
(MI-15 in `docs/issues/Issues_Phase_35.md`). It predates Phase 35 (reproduced
at `2f094de`) and applies to every theme. Scope review:
[Task 176A repair scope](../../reviews/phase-35-task-176A-scope-review.md).

**Files and actions:** `src/hooks/use-staged-candidates.ts` and
`use-staged-candidates.test.tsx`; `src/components/triage/staging-zone.tsx`
and `staging-zone.test.tsx`; `src/components/triage/triage-workspace.tsx`
and `triage-workspace.test.tsx`; `src/components/triage/breakdown-panel.tsx`
and `breakdown-panel.test.tsx`; `src/components/triage/inbox-triage-theme-realization.test.tsx`
(its `BreakdownPanel` renders move from the hook mock to the new props);
`src/app/globals.css` only for the dimmed card keeping its attached status
line at full ink, in every theme, and for (e). No new
store, timer, copy or repository change; `src/hooks/use-dnd.ts` stays
unchanged.

- (a) Post-terminal presentation hold, per SPEC Durable Staging (amended
  2026-10-18): Stage projections and retained Unstage candidates after
  `applied`/`already_applied`, checked at the result and on every later
  snapshot; "a read that started after the result" is decided by a
  generation counter captured when the live-query querier starts, not by
  arrival order; a subscription error ends the hold; orphan cleanup and every
  non-success result are never held. The hold keeps the current phase and
  copy, holds no lock or guard and makes no new announcement. Held state is
  derived during render, not cleared in an effect, and excludes IDs that the
  snapshot holds as integrity slots. The hook marks held operations; locks,
  guards and the live sentence skip them, and they keep their pending
  interactivity (a held candidate is not draggable; a held source row's grip,
  Edit and Delete stay disabled). The DOM exposes the hold for tests
  (`data-triage-hold`), and no CSS keys on the displayed phase of a held item.
- (b) Position: Stage projections render at the top of their list, newest
  first.
- (c) Source dimming from operation state, not the drag state: the staged
  card stays dimmed while its Unstage is pending, and a held Unstage keeps
  the dimming of the phase it was held from; it is not dimmed in unknown or
  reconciling. The dim is not ancestor `opacity` (which would fade the status
  line too): the card's other children are dimmed and its surface fades by
  alpha, or the line leaves the dimmed element while Retro Mac's
  `:has(.staging-operation-status)` layout is kept; the same treatment serves
  the drag-time and the post-drop dim, so nothing changes at drop, and the
  neumorphism `.opacity-30` inset rule is re-keyed to it. The Breakdown
  source row keeps the existing staged look (`opacity-50`) from drop until
  its Stage settles and the hold ends. `BreakdownPanel` drops its own
  `useStagedCandidates` instance and takes the workspace instance's state as
  props — `stagedSourceIds` (staged, plus pending, unknown, reconciling and
  held Stage sources) and `archiveCandidateClear` (replacing
  `stagedCandidateCounts.authoritative`, `breakdown-panel.tsx:1774`) — so
  both regions change in one commit.
- (d) Scratch isolation: hook operations and the workspace's
  `newCandidateIds`, `stagingAlert` and `operationMeta` carry their Scratch
  ID, and a mismatch with the selected Scratch renders empty values, so no
  commit after a Scratch switch shows the previous Scratch's operation rows,
  counts, `N new` indicator or alert.
- (e) User-approved addition (2026-10-18, mi-14): the Stage and Unstage
  pending phases, and a hold from pending, show no in-card status line; the
  pending sentence stays in the Staging live region only, with unchanged copy.
  Unknown and reconciling, and a hold from reconciling, keep the line, and
  integrity slots keep their status. A Stage projection renders the
  candidate's icon and title in the durable Node card's or Bit row's layout,
  so the replacement shows no content change; it stays non-draggable. In
  `globals.css`, one unscoped rule fits a Node card's status line to the card
  width (`align-self: stretch`, `max-inline-size: 100%`) so it ellipsizes in
  every theme, replacing the neumorphism-only mi-14 rule. The alpha-surface
  dim stays as implemented. No further `expert` review; the JSX change gets
  an advisory diff look at the checkpoint.

**Dependencies:** Task 176 accepted. Task 177 cannot start before this task
is accepted.

**Authority / flows:** SPEC Durable Staging (presentation total, post-terminal
presentation hold, Unstage hold and source dimming, as amended 2026-10-18),
the Staging recipe operation-status lifetime and DESIGN_TOKENS Staging
operation rows as amended with it, PLANNING_STANDARD authoritative operation
state (the hold is not `pending`), and the local-first command feedback rule
(CLAUDE.md Architecture 6); UF-14–16. DP-VQ02 is unchanged; DP-VQ06-STAGING
copy and placement are unchanged and its status-line lifetime gains the hold.

**Observable acceptance:**
- Stage into either subsection: after the projection appears at the top, no
  existing card moves, the card replaces the projection in place at equal
  size, no commit shows a gap, and the heading total never dips. The
  projection shows the candidate's icon and title and no status line.
- `applied` or `already_applied` whose ID is already in the current snapshot
  removes the projection in the same commit; otherwise both hold like
  `applied`. Non-success results behave as before.
- Unstage: the dragged card stays dimmed, with no status line while
  pending, until it leaves; unknown or reconciling shows it undimmed with its
  status line inside the card. The Breakdown
  source row never brightens and dims again on Stage or Unstage.
- A Scratch switch during a hold, or with an `N new` indicator or alert
  showing, never renders the previous Scratch's rows, counts, indicator or
  alert in any commit.
- No removal is decided by a timer or elapsed time; the hold never keeps a
  lock.

**Verification:** new hook tests — hold until the snapshot contains the ID;
an early snapshot already containing it; a read that started before the
result and finished after it does not end the hold; a read that started after
it without the ID ends it; subscription error ends it; non-success and orphan
cleanup never held; the Unstage hold; a held projection across a Scratch
`rerender`. Staging tests for projection order, the projection's icon and
title, no pending status line, and the dimmed card; a `breakdown-panel.test.tsx` case for the source-row
dimming; workspace tests for the indicator and alert. Single-commit claims
(Scratch switch, gap, dimming) are checked per commit with a layout-effect
probe or `MutationObserver` records, not by assertions after `act`. A mounted
animation-frame sample of Stage and Unstage, like the MI-15 diagnosis, in
neumorphism, Retro Mac and GridDO, with the projection and card rects equal
and no pending status line, plus an unknown or reconciling Node card whose
line lies inside the card rect (jsdom cannot show this);
the full gate; an `expert` review.

**Commit message:** `fix(triage): close the staging commit-to-snapshot gap`.

### Task 177: [x] Realize Placement followed by Newly/Undo

**Files and actions:** bind L5's exact per-file actions to `neumorphism` only. Conditional owner/decision gates remain in force. User-approved addition (2026-10-18), Stage 1: realize the Placement recipe's Neumorphism user-adopted hierarchy (muted heading label with bottom spacing, inset title well, inset Node/Bit tag at the title's right, vertical Staged stack with OK above Cancel by CSS placement only, neutral Cancel hover and inset press, `transform`-only hover-lift transition outside reduced motion) and hide the header close button, as the DESIGN_TOKENS Neumorphism exception row states, in `globals.css` only; an element CSS cannot reach stops for the user. User-approved addition (2026-10-19), Stage 2, every theme: the ordinary Finder Undo `placement-open` reason moves from the visible rail to the existing above-action tooltip, as the Newly/Undo recipe's Ordinary Finder amendment and DESIGN_TOKENS "Three tooltip states only" state; `hierarchy-explorer.tsx` (`getOrdinaryNewlyUndoPresentation`) and `hierarchy-explorer.test.tsx` only; this supersedes the L5 Ordinary Finder amendment's two-state tooltip limit for that one reason in every later L5 task; search-result Undo keeps its visible rail; covered by the task's `expert` review.

**Dependencies:** Task 176 and repair Task 176A accepted, including their required user visual dispositions; this phase's approved lifecycle scope. The matching L5 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L5; UF-19–25/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L5; no adjacent or experimental fallback.

**Observable acceptance:** Every L5 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L5, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize neumorphism placement-newly-undo`.

### Task 178: [x] Realize completion and Archive

**Files and actions:** bind L6's exact per-file actions to `neumorphism` only. Conditional owner/decision gates remain in force.
Carried from Phase 34 (`Issues_Deferred.md`): move the Archive confirmation detail string from `breakdown-panel.tsx` into `INBOX_TRIAGE_COPY` with its direct test, and get the user's decision whether neumorphism shows `archive-confirmation-detail` (MI-9). While touching the Archive handoff, review whether `pendingArchiveFocusRef` can be set before `finishScratchArchive` instead of relying on React flushing after it (Phase 34 close Advisory).
User-approved addition (2026-10-19), Stage 3, every theme: per the `DP-VQ11` amendment in the Archive/completion, Breakdown and Context recipes and DESIGN_TOKENS, remove the Add-draft completion blocker and the four Scratch-title completion sentences (eyebrow and issue-overlay forms) with their marks, live regions and programmatic associations, and their copy keys; the blocker snapshots keep suppressing the completion presentation, the eyebrow keeps `Selected Scratch`, and the withdrawal status is unchanged. Files: `breakdown-panel.tsx` and its test, `src/lib/copy/inbox-triage.ts` and its test, `globals.css` (the retired blocker rules in every theme) and the shared conformance test. Also `globals.css` only: the neumorphism Reopen takes the Archive capsules' hover lift, eased on `transform` only outside reduced motion, as the Archive recipe's Neumorphism section states.

**Dependencies:** Task 177 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L6 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L6; UF-02/12/26–29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L6; no adjacent or experimental fallback.

**Observable acceptance:** Every L6 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L6, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize neumorphism archive`.

### Task 179: [x] Complete supported modes, accessibility and regression

**Files and actions:** bind L7's exact per-file actions to `neumorphism` only. Conditional owner/decision gates remain in force. User-approved addition (2026-10-17): repair the neumorphism Scratch Pool collapse/expand motion (Task 173's L1 surface), which stutters because it animates the Pool's `inline-size` and so re-lays out the whole workspace each frame; keep the adopted toggle look and timing token, `globals.css` (and `triage-workspace.tsx` only if a CSS-only fix cannot reach it). User-approved addition (2026-10-17): realize the collapsed-Pool Scratch-switch motion adopted in the Pool recipe, in the same files.

**Dependencies:** Task 178 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L7 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L7; UF-01–31 preservation, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L7; no adjacent or experimental fallback.

**Observable acceptance:** Every L7 current-theme supported-mode criterion and separate user visual disposition, with the user's first judgment recorded separately from the final disposition; no silent component repair or full-campaign pass claim. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L7, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize neumorphism theme-conformance`.

### Task 179A: [x] Repair Explorer truncated titles and the Retro Mac complete Context icon

A bounded repair of two user requests from the Task 179 Stage 2 visual check
(2026-10-19, `docs/issues/Issues_Phase_35.md` Task 179). (a) applies to every
theme through shared JSX; (b) changes the accepted Retro Mac Context only. It
runs after Task 179 is accepted and before Phase 35 closes. Scope review:
[Task 179A repair scope](../../reviews/phase-35-task-179A-scope-review.md).

**Files and actions:**
- (a) `src/components/grid/node-card.tsx`, `bit-card.tsx` and their tests,
  exactly the four changes of the L4 Explorer truncated-title amendment: the
  title tooltip is rendered through a small sub-component used only for
  `inbox-explorer`; one card-local state (`"title" | "undo" | null`) drives
  both tooltips through `open`/`onOpenChange`; the title opens on card focus
  only when the card root itself is the target and matches `:focus-visible`;
  truncation is measured at open (`scrollWidth > clientWidth`, or a `Range`
  width against the element width to catch sub-pixel overflow), and a resize
  while open does not close it; side `top` and open delay 0, as the Undo
  tooltip; the trigger is `asChild` on `explorer-card-title` only, the card's
  `aria-label`/`aria-describedby` stay untouched and the title
  `TooltipContent` is `aria-hidden="true"`. `hierarchy-explorer.tsx` and
  `grid-explorer-search-results.tsx` are unchanged (search-result titles wrap,
  with no ellipsis).
- `src/app/globals.css`: the base plate for `explorer-title-tooltip` and the
  Retro Mac rules (b) go before the `/* Neumorphism L1 (Task 173)` marker, next
  to the base `newly-undo-tooltip` rule and the Retro Mac complete-title rule;
  the Neumorphism plate extends its Task 177 Undo plate rule, before the L6
  marker. No theme-id branch in components.
- `src/components/triage/inbox-triage-theme-realization.test.tsx`.
- (b) `src/app/globals.css` in the Retro Mac scope only, from the existing
  `context-signature-plate[data-triage-state="complete"]` selector: the folder
  is hidden, the identity box drops its top stripe and draws a filled System 7
  checkbox (an ink square with a check in `--triage-context-surface`) in CSS,
  with no new asset file and no JSX; the struck-through title stays.
- User-approved addition (2026-10-19), Stage 3, every theme (MI-22): a Scratch
  switch remounts `BreakdownPanel` (`key={selectedScratchId}`), and the new
  instance's own `useInbox()` and `useScratchBreakdowns()` start empty, so for
  one to three frames the Context reads `Unknown Scratch` without its date (its
  texts move 9–10px) and the rows area shows the ordinary empty state before the
  rows arrive. `src/components/triage/triage-workspace.tsx` passes the selected
  Scratch, from its existing `useInbox()`, to `BreakdownPanel` as a prop;
  `src/components/triage/breakdown-panel.tsx` drops its own `useInbox()` call
  and, while `useScratchBreakdowns` is not `isReady`, renders neither rows nor
  an empty or completion state in the rows area; their tests. The
  `key={selectedScratchId}` remount stays.
- User-approved addition (2026-10-19), Stage 4, Neumorphism only: in
  `src/app/globals.css`, next to the Neumorphism `context-title` rule (Task 174
  L2 block), the Context title of a `Scratch complete` plate
  (`.triage-fixed-context[data-triage-state="complete"]`) is struck through and
  drawn in `hsl(var(--foreground) / 0.75)` in light and dark (5.03:1 and
  8.30:1 on the page surface); the title editor, the working state and other
  themes are unchanged; `inbox-triage-theme-realization.test.tsx`. No JSX.
- No store, copy, hook or repository change.

**Dependencies:** Task 179 accepted. Phase 35 Final Close cannot start before
this task is accepted.

**Authority / flows:** SPEC "Explorer truncated titles" (2026-10-19); the
Explorer recipe's truncated-title amendment; DESIGN_TOKENS Newly/Undo central
roles; the Selected Scratch Context recipe, Retro Mac (2026-10-19); UF-17 and
UF-19 preservation; AF-05/10; all NEG. DP-VQ06-EXPLORER/07/10 are unchanged;
the Task 177 Undo tooltip keeps its behavior except for the mutual exclusion.

**Observable acceptance:**
- (a) In every theme, an Explorer Node or Bit title cut by its ellipsis shows
  the full stored title above it while the pointer is over the title, or while
  the card root holds visible keyboard focus (a Node card reached by Tab, or a
  Node or Bit card focused by placement, reveal, Undo or arrival after a
  keyboard action); a title that fits shows none, and focus after a pointer
  action or a mouse click shows none. Bit cards stay out of the Tab order.
  Esc dismisses it until focus leaves the card or the pointer leaves the
  title; it does not show while a drag is active; it and the Undo tooltip are
  never shown at once; the card's accessible name and `aria-describedby` are
  the same before and after opening. Selection, focus, navigation, drag and
  placement behave as before. The ordinary Grid card is unchanged. The plate
  wraps a long title within its maximum width; it is static.
- (b) Retro Mac, `Scratch complete`: the identity box shows the checkbox in
  light and dark; every other state keeps the folder; other themes are
  unchanged.
- Stage 3 (MI-22): in every theme, switching the selected Scratch shows the new
  Scratch's title and date in their places from the first frame, never
  `Unknown Scratch`, and the rows area never shows `Add a note...`, `All items
  processed` or `Scratch complete` before the new Scratch's rows are read; a
  Scratch with no rows still shows its empty state. Add, edit, delete,
  completion, Archive and the external-removal handoff behave as before.
- Stage 4: Neumorphism `Scratch complete` Context title is struck through and
  dimmed, readable at 4.5:1 or more in light and dark; the working title, the
  title editor and the other themes look as before.
- The user's first judgment of each stage is recorded apart from the final
  disposition.

**Verification:** direct card tests (with `scrollWidth`/`clientWidth`
stubbed): truncated and fitting title; pointer and `:focus-visible` opening;
no opening on programmatic focus after a pointer interaction or on a mouse
click; Esc and its stickiness; no tooltip with an active drag (mocked
`useDndContext`); Undo focused then title hover, and title open then Undo
focus/hover; no tooltip in the ordinary Grid presentation; unchanged
accessible name and `aria-describedby`. An `expert` review of the card change.
Mounted checks in Neumorphism and Retro Mac light/dark at 1920×1080 and
1024px, including the compact NEW/Undo cards from Task 179 and a 100-character
title, and a GridDO spot check of the base plate. (b) Retro Mac light/dark
complete and non-complete Context with a long title at 1920×1080 and 1440px.
Stage 3: a panel test that the empty state is not rendered before the
Breakdown read resolves and is rendered after an empty read, and that the
Context shows the passed Scratch title on the first render; a frame probe of
Scratch switches (rows, empty, complete) in Neumorphism and Retro Mac showing no
`Unknown Scratch` frame and no empty-state frame before rows.
Stage 4: a region test of the Neumorphism complete-title rule (selector scoped
to the complete plate and `context-title`, placement in the Neumorphism block);
mounted Neumorphism light/dark complete and working Context at 1920×1080 and
1024px (narrow Context).
Existing region tests keep passing. Full logical gates.

**Commit message:** `fix(triage): show truncated Explorer titles and the Retro Mac complete icon`.
