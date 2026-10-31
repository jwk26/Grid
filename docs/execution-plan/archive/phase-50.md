# Phase 50 — Inbox Status, Breadcrumb Reveal And Last Scratch

## Completion-time scope

Closed 2026-10-31. Tasks 245–250 and repair Task 245A are user-accepted.
Feedback lane, part 2 (promotion ②): Inbox statuses on the item (Breakdown, Add,
editors, Staging, the Undo slot), an unknown editor or Staging command that can
be checked again instead of a silent lock, the wider Nodes zone, the sidebar
Home button and breadcrumb reveal, the removal of the blocked breadcrumb zone,
and the last selected Scratch per device. Ran on branch
`phase-50/inbox-status-breadcrumb-reveal` beside the SaaS lane's Phases 46–48.

Carried in: Phase 35 MI-14 and MI-21, Phase 45 mi-1, mi-2 and mi-3, Phase 49
mi-1, mi-2 and mi-3, all closed in these tasks. Carried over: mi-1 (Task 235,
Phase 48), mi-6, mi-7 (theme stage), mi-8, mi-10 and the Task 245A and Task 246
locks left by a failed background check, in
[`Issues_Deferred.md`](../../issues/Issues_Deferred.md). Task 245A mi-3 was
checked in the browser at the close, the owed half of Task 233's Verification.
No migration changed, so nothing went to production. Ledger:
[`Issues_Phase_50.md`](../../issues/Issues_Phase_50.md).

## Task contracts at close

Waits for: Phase 49 and Phase 45 Final Close and `main` sync (runs beside
Phases 46–48). Does not block Phase 48; closes before the theme stage. Its
checks run on local Supabase (Shared rules above).

Task order (user, 2026-10-29): Task 250 runs first, since it shares no file
with Phase 46's Task 230; then Tasks 245–249 in their dependency order.
Task 245A (user, 2026-10-30, Phase 50 mi-2) runs right after Task 245 and
before Task 246.

### Task 245: [x] Show Breakdown, Add and editor statuses on the item

**Files and actions:**
- `src/components/triage/breakdown-panel.tsx` and test: remove the `DP-VQ02`
  wash, check, visible text and 160px slot; add the 22px status slot with the
  status icon, emphasis and tooltip on the row's grip and slot; the Add field
  icon at its right end with emphasis and tooltip, `Check again` and
  `Retry Add` beside Add; Delete's `Check again` in the action cluster; the
  editor states of `DP-VQ04`'s amendment (loader, `!`, tooltip, `Stay here`);
  the hidden polite `Added.` and `Saved.` (F01, F04–F07).
- `src/hooks/use-scratch-breakdowns.ts` and test: an editor save attempted
  while offline keeps the draft and shows the offline write-attempt toast
  (SPEC §Toasts), through the Task 232 helper and the Task 233 monitor if they
  are on `main`, otherwise a direct call and `navigator.onLine`. Whichever of
  Task 233 and this task lands second also removes `breakdown-panel.tsx`'s own
  `navigator.onLine` subscription for the offline Retry.
- `src/components/triage/triage-workspace.tsx` and test: the Unstage success
  projection that drove the `DP-VQ02` row signal now feeds only the hidden
  announcement.
- `src/lib/copy/inbox-triage.ts` and test: tooltip use of the existing
  sentences; no visible success key.
- `src/app/globals.css`: the Breakdown row grid with the status slot; remove
  the success roles.
- `inbox-triage-theme-realization.test.tsx`: the new roles.

**Dependencies:** Phase 49 and Phase 45 Final Close and `main` sync; this
phase's lifecycle gate; `DP-FB-01` recorded; if Phase 46 is merged into
`origin/main` by then, `origin/main` is merged (not rebased) into the phase
branch first, so the files both phases change are resolved before the task
starts (user, 2026-10-29).

**Authority:** F01, F02, F04–F07, F09; MI-21 (row part); Phase 45 mi-1; SPEC
§Item status presentation, §Breakdown and Selected Scratch Context;
DESIGN_TOKENS `DP-VQ02` retirement and the `DP-VQ04`, `DP-VQ05` amendments.

**Observable acceptance:** at 1024px with the Pool open a Breakdown row's title
keeps its width (the row reserves 22px, not 160px); an Add success shows
nothing on screen and a screen reader hears `Added.`; a slow Add shows the
loader only after 300ms; unknown shows `?` with `Check again`, not applied
`!` with `Retry Add`, each with emphasis and its sentence on hover and focus;
Delete and the editors follow the same rule; an offline editor save keeps the
draft and shows the toast; the conflict view is unchanged; a status icon on a
locked row is reachable by keyboard and shows its sentence on focus; the Add
`account_limit` reason shows in full, not cut off with an ellipsis, in
`retro-mac` and `neumorphism` at 1280px (Phase 45 mi-1).

**Verification:** gate; `expert` review (state-to-presentation mapping and
timing); browser checkpoint with the state switch.

**Commit message:** `feat(inbox): show Breakdown and editor statuses on the item`.

### Task 245A: [x] Check an inline-editor save whose outcome is unknown

Phase 50 mi-2 (Task 245 `expert` review, user 2026-10-30). A save that throws
(`WriteOutcomeUnknownError` after the Task 227 request timeout, or any error)
leaves the editor in `reconciling` with the operation lock held, and nothing
calls `editor.reconcile()`: the loader turns forever, Save, Cancel and Escape do
nothing, and every other Inbox write stays locked until reload. The defect dates
from the conditional editor (`bba0da0`, 2026-08-14); the request timeout makes it
reachable on a slow or dropped connection.

**Files and actions:**
- `src/hooks/use-scratch-breakdowns.ts` and test: an `unknown` editor phase. A
  thrown save or reconcile enters `unknown` with its command kept and the lock
  still held; it never resends the save (CLAUDE.md Architecture 6). `reconcile()`
  runs from `unknown` (read-only `reconcileSave…`), passes through
  `reconciling`, and its terminal result applies as a save result does
  (applied closes with `Saved.`, `not_applied` gives `!`, conflict opens the
  conflict view, invalidated the recovery view); a reconcile that throws
  returns to `unknown`. Cancel, Escape, edits and blur save stay unavailable
  in `unknown` and `reconciling`. Entering `unknown` drops a pending navigation
  intent, as `Stay here` does, so a later `Check again` never navigates.
  An editor invalidated while it holds a command (from `unknown`, or from
  `saving` or `reconciling` whose request then throws) enters the recovery view
  at once and runs the read-only reconcile once in the background; a terminal
  answer releases the lock and clears the command, and the recovery view stays.
  A background reconcile that throws returns to `invalidated` with the command
  kept and is never retried on its own. `cancel()` (Close) is unavailable while
  an invalidated editor holds a command (Phase 50 mi-3).
- `src/components/triage/breakdown-panel.tsx` and test: `unknown` shows `?` at
  once in the editor status box with field emphasis and the field tooltip, and
  a compact `Check again` in place of Save and Cancel (`[box][Check again]`,
  inside the `9.5rem` region). `Check again`
  turns unavailable at once and stays focused through reconcile, as Add's does.
  The new state is announced once through the editor's live container. While
  the recovery view holds a command, it offers `Check again` beside Copy and
  Close is unavailable.
- `src/lib/copy/inbox-triage.ts` and test: `inlineEditor.status.unknown`:
  `We couldn't confirm whether your changes were saved.`; `Check again` reuses
  `reliability.actions.checkAgain`.
- `src/components/dev/state-switch-panel.tsx` and test: the editor rows offer
  `unknown`.

**Dependencies:** Task 245.

**Authority:** Phase 50 mi-2, mi-3; SPEC §Item status presentation (Unknown,
Reconciling) and the Editor states bullet; DESIGN_TOKENS `DP-VQ04` amendment
(`unknown` and `invalidated` rows); CLAUDE.md Architecture 6 and 9.

**Observable acceptance:** with `save_breakdown` or `save_scratch_title`
answered `Unknown — request lost`, the editor shows `?` with emphasis and
`Check again`, never the endless loader; no second save is sent; `Check again`
shows `?` then the loader after 300ms and ends in the right state for an
applied, not applied or conflicting answer; while unknown, other Inbox writes
stay locked, and after the terminal answer they work again without reload; a
reconcile that fails again returns to `?`. When another tab deletes or stages
the row while the editor is unknown, the recovery view appears, one read-only
check is sent, and other Inbox writes work again without reload; if that check
fails (offline), it is sent only once, Close stays unavailable and
`Check again` is offered.

**Verification:** gate; `expert` review (state logic and lock release); browser
checkpoint with the state switch in `griddo`, `retro-mac` and `neumorphism`, light
and dark, at 1024px with the Pool open (`Check again` width).

**Commit message:** `fix(inbox): check an inline-editor save whose outcome is unknown`.

### Task 246: [x] Show Staging statuses on the item and widen the Nodes zone

**Files and actions:**
- `src/components/triage/staging-zone.tsx` and test: the status icon at a Node
  card's top-right corner and a Bit row's end in place of the in-card line;
  the problem tooltip leads with the full title, since the label truncates,
  unless the sentence contains it; the status icon is focusable where its host
  is not in the Tab order (a Stage projection, an integrity slot); an Unstage
  failure shows `!` on its candidate (cleared by a new operation for it, its
  disappearance or a Scratch switch); the alert band only for Stage failures
  and the stale-invalidation notices; the integrity slot's `!`; the Staging
  side of the Unstage hold and clear, while the hidden `Returned to Breakdown.`
  stays with Task 245's workspace projection, so it is announced once (F01, F04,
  F06–F09).
- `src/components/triage/triage-workspace.tsx` and test, where the Stage and
  Unstage alerts are created, and `src/hooks/use-staged-candidates.ts` and
  test: route Unstage failures to the candidate instead of the alert; the
  stale-invalidation notices (changed-elsewhere drop cancellation, placement
  closed) stay in the band.
- Unknown recovery (Phase 50 mi-11, user 2026-10-30): `src/hooks/use-dnd.ts`
  (`useTriageDnd`, `finishStage`/`finishUnstage`) and test,
  `staging-zone.tsx`, `triage-workspace.tsx`: when the automatic read-only
  check after an unknown Stage or Unstage also fails, the command stays held
  with the lock, and the item's `?` is a button that runs the read-only
  reconcile again (never a resend); it turns unavailable at once, a terminal
  answer applies as the command's result and releases the lock, a check that
  fails returns to `?`. A Scratch removed elsewhere while a Staging command is
  held, or a held command's candidate that leaves the list while its Scratch
  stays selected (Phase 50 mi-12), gets one background read-only check, at
  most one per command and never retried on its own; if it fails, the
  remaining lock is a residual bound to Task 233's browser check.
- `src/components/triage/hierarchy-explorer.tsx` or CSS only: the `Confirm
  placement` reason (Phase 45 mi-2).
- `src/app/globals.css`: the `staging-node-grid` (one card's minimum width,
  auto-fill, one or two columns) (F10).
- `src/lib/copy/inbox-triage.ts` (`Select to check again.`, which Task 247
  reuses); `inbox-triage-theme-realization.test.tsx`.

**Dependencies:** Task 245.

**Authority:** F06–F10; MI-21 (Staging part); Phase 45 mi-2; Phase 50 mi-11, mi-12;
SPEC §Durable Staging, §Item status presentation; DESIGN_TOKENS
`DP-VQ06-STAGING` amendment (Unknown recovery).

**Observable acceptance:** at 1024px with the Pool open a Node card is never
narrower than one card and the well shows one column, two when they fit;
pending shows the loader after 300ms; unknown and reconciling show `?`; an
Unstage failure shows `!` on the candidate and no band; a Stage failure keeps
the band, and so do the stale-invalidation notices; the status icon of a Stage
projection or integrity slot is reachable by keyboard and shows its sentence on
focus; in `neumorphism` at 1280px the rejected placement reason inside the
`Confirm placement` card in the Home column shows in full, not clipped
(Phase 45 mi-2); with Stage or Unstage and its reconcile both answered
`Unknown — request lost`, the item keeps `?` and selecting it sends one
read-only check and no second command, a terminal answer ends in the right
state and other Inbox writes work again without reload, and a check that
fails again returns to `?` (Phase 50 mi-11).

**Verification:** gate; `expert` review (failure routing, lock release);
browser checkpoint with the state switch.

**Commit message:** `feat(inbox): show Staging statuses on the item and widen the Nodes zone`.

### Task 247: [x] Carry the Undo status in the Undo slot

**Files and actions:** `src/components/triage/hierarchy-explorer.tsx`,
`src/components/grid/node-card.tsx`, `src/components/grid/bit-card.tsx`,
`src/components/triage/grid-explorer-search-results.tsx` and their tests;
`src/lib/copy/inbox-triage.ts`; `src/app/globals.css`: remove the
`newly-status-rail` and its text recovery actions; the slot states of
DESIGN_TOKENS §Undo slot status amendment for ordinary rows and search results;
an unavailable `↶` and an action-less `!` use `aria-disabled="true"`, never
`disabled`; the slot tooltip adds `Select to check again.` or
`Select to try again.`; the card body keeps its Task 179A title tooltip and the
slot shows only its own, one tooltip at a time.

**Dependencies:** Task 246.

**Authority:** F06, F07, F09; SPEC §Actual-card Newly Placed and Undo;
DESIGN_TOKENS Undo slot status amendment.

**Observable acceptance:** each Undo state shows in the slot and no rail
remains; the row keeps its width; `?` checks again and `!` retries; an
unavailable control takes focus and shows its reason on keyboard focus and on
hover; search results behave the same; focus destinations are unchanged; the
card body's Task 179A title tooltip still shows and never doubles with the slot
tooltip.

**Verification:** gate; `expert` review; browser checkpoint with the state
switch, ordinary columns and search; one check of Add, Stage and Undo under
browser network throttling on local Supabase, so the loader and the 300ms delay
are judged under real latency (SPEC §Write feel).

**Commit message:** `feat(inbox): carry the Undo status in the Undo slot`.

### Task 248: [x] Add the Home button and the breadcrumb reveal

**Files and actions:**
- `src/components/layout/home-button.tsx` and test: top-most on every route;
  navigates to `/` through the sidebar's departure-guarded `navigate`
  (`requestActiveTriageDeparture`), so an Add draft or a pending Inbox
  operation keeps its guard; `aria-current="page"` on L0; the landing emphasis (F21,
  F23).
- `src/components/layout/sidebar.tsx` and test: the order Home, account icon
  (when present), `+`; the Calendar and system-route-only Home goes.
- `src/hooks/use-breadcrumb-reveal.ts` and test: the triggers (hover or focus
  on Home or the breadcrumb, 3 seconds after entering a Node, any Node or Bit
  drag), the 1-second hide with the fade, the deadline picker hold, the `Esc`
  order of SPEC; after `Esc` the hover and focus triggers stay suppressed until
  pointer and focus leave and return, and `Esc` on a segment moves focus to
  Home (F22, F23). Until Task 249 the zone keeps reserving the cells under the
  bar's shown position, as today.
- `src/components/layout/breadcrumbs.tsx`, `breadcrumb-deadline.tsx` and tests:
  the reveal surface in DOM order right after the Home button (no positive
  `tabindex`); only segments and the chip take the pointer; during a drag each
  ancestor segment is a drop target and only the one under the pointer shows
  a light signal (user, 2026-10-31), the surface keeps its
  resting look (no added transparency; user, 2026-10-31) and the chip is
  hidden; the chip in the breadcrumb row (F24, F25).
- Tab titles of SPEC §Feedback copy: `src/components/layout/grid-runtime.tsx`
  sets `{title} – {APP_NAME}` on a Node's Grid, `Inbox – {APP_NAME}` and
  `Archive – {APP_NAME}` on the system Nodes and `APP_NAME` alone on L0; the
  Calendar pages (`src/app/calendar/weekly/page.tsx`, `monthly/page.tsx`) and
  `src/app/trash/page.tsx` set `Calendar – {APP_NAME}` and `Trash – {APP_NAME}`;
  `APP_NAME` in `src/lib/constants.ts` (`GridDO` until Task 239).
- `src/components/grid/edit-mode-overlay.tsx`: its document-level `Esc` yields
  to the layer order, so edit mode exits only after the dialog layer, the
  deadline picker and the breadcrumb (user, 2026-10-22).
- `src/lib/animations/motion-language.ts` and `src/lib/constants.ts`: the
  breadcrumb motion and timing tokens of DESIGN_TOKENS §Motion Language.
- `src/hooks/use-toast-anchor.ts`: the stack follows the revealed breadcrumb
  (F12).
- `src/app/globals.css`: `home-button`, `breadcrumb-reveal`,
  `breadcrumb-drop-target`.
- Drag cancel (Phase 49 mi-3): `useDnd`, the Grid hook in
  `src/hooks/use-dnd.ts` (`useTriageDnd` in the same file already has one),
  and its test gain a cancel handler that clears `activeItem` and the drag state `handleDragEnd`
  clears, without a write; the `DndContext` in `grid-runtime.tsx` and in
  `src/app/calendar/layout.tsx` wire it to `onDragCancel`, so an
  `Esc`-cancelled drag no longer leaves the cards dimmed, the scroll wrapper
  clipped or the breadcrumb drag-styled or revealed.
- Calendar (Phase 49 mi-1, mi-2), `src/app/calendar/layout.tsx` with
  `calendar-node-creation.test.tsx`, `calendar-bit-creation.test.tsx` and a
  drag-flag test:
  its drags set and clear the toast anchor store's drag flag on start, end and
  cancel, as `grid-runtime.tsx` does, so the stack is translucent and
  pointer-transparent over the Pool and the unschedule zone; its Node and Bit
  create dialogs show the create-dialog sentence of SPEC §Feedback copy
  (`createDialogNoEmptyCell` in `src/lib/copy/feedback.ts`; the target is
  `Home` for a Node, the chosen parent for a Bit) instead of
  `No empty cells available in the root grid.` and
  `No empty cells available in the parent node.`

**Dependencies:** Task 247.

**Authority:** F12, F16 (create dialog), F21–F25; Phase 49 mi-1, mi-2, mi-3;
SPEC §Breadcrumb reveal and Home button, §Feedback copy; DESIGN_TOKENS
§Feedback Status Surfaces, §Motion Language, Sidebar, Breadcrumbs.

**Observable acceptance:** Home sits at the top on every route and reveals the
breadcrumb only on a Node's Grid; the breadcrumb shows for 3 seconds on entry,
on hover or focus and during a drag, and hides 1 second after the pointer and
focus leave; Tab from Home enters its segments; `Esc` follows the layer order;
a card under the bar stays clickable; a drag drops on an ancestor segment;
under reduced motion nothing moves; each page shows its tab title (a Node's
name, `Inbox`, `Archive`, `Calendar`, `Trash`, and the app name alone on L0),
also after client navigation; in edit mode with the breadcrumb shown, one `Esc`
hides the breadcrumb and a second exits edit mode; Home with an Add draft open
shows the departure sheet; the user
rechecks that the deadline is visible
only while the breadcrumb is shown (F25); after an `Esc`-cancelled drag on a
Grid or the Calendar the cards, the breadcrumb and the toast stack return to
their resting state; during a Calendar drag the toast stack is translucent;
a full-Grid create from the Calendar keeps the dialog with the same sentence
as the Grid pages.

**Verification:** gate; `expert` review (reveal state machine, `Esc` order,
DnD pass-through and drag cancel, focus order); browser checkpoint with mouse
and keyboard, including an `Esc`-cancelled drag on a Grid and on the Calendar.

**Commit message:** `feat(shell): add the Home button and the breadcrumb reveal`.

### Task 249: [x] Remove the blocked breadcrumb zone

**Files and actions:** delete `src/stores/breadcrumb-zone-store.ts` and
`src/lib/utils/breadcrumb-zone.ts` with its test; remove the zone measurement
and every `isCellBlocked` or blocked-cell guard from `grid-runtime.tsx`,
`grid-view.tsx`, `use-grid-actions.ts`, `use-dnd.ts` (with the
`Cell reserved by breadcrumb` toast) and `src/lib/grid-dnd.ts`; remove
`runBreadcrumbZoneMigration` from `datastore.ts`, the Supabase store's no-op
and, if Phase 46 has not removed it, `indexeddb.ts`, with every `settings` use
and no Dexie version bump; delete the reserved top-left block the client
passes as `p_reserved_cells` (`BREADCRUMB_RESERVED_CELLS` in
`src/lib/db/supabase-calls.ts`, sent by `callEnsureAccount`, `callUpdateNode`
and the restore, unarchive and promotion calls) and stop passing it (the server
parameter stays at its default `'[]'`; no SQL change, feedback F34); update the
tests that cover the zone and the reserved block (`grid-view.test.tsx`,
`use-grid-actions.test.ts`, `use-triage-dnd.test.ts`, `grid-dnd.test.ts`,
`grid-runtime.test.tsx`, `indexeddb.migration.test.ts`,
`supabase-calls.test.ts`, `supabase-store.writes.test.ts`,
`src/lib/auth/session.test.ts`); delete the `commands that send nothing` block
of `supabase/tests/supabase-store-commands.db.test.ts`, which calls the removed
method, since `pnpm typecheck` covers that file. This block is the only
`supabase/` edit (user, 2026-10-31); `pnpm test:db` at the phase close checks it.

**Dependencies:** Task 248.

**Authority:** F26, F34; F16 (dropped toast); Phase 45 mi-3; SCHEMA §Not
ported, §Internal functions; SPEC §Breadcrumb reveal and Home button.

**Observable acceptance:** the cells under the breadcrumb accept Add,
placement and drops like any other cell, including a drag dropped on a
top-left cell under the revealed bar; a restore, an unhide or a promotion into
a Grid whose only free cells are top-left lands there; no zone code or `settings` read or
write remains; the 156-Bit Full folder fixture keeps its top-left block free
(`seed.sql` does not change, user, 2026-10-31), so a create lands in each of
those six cells and the seventh shows `has no empty cell` in the Create dialog,
and the `inbox-triage.js` header recipe says this (Phase 45 mi-3); every gate
passes.

**Verification:** gate; `expert` review (Add, placement and DnD paths); a
search for the zone names returns nothing; browser checkpoint of a create and a
drop into the top-left cells.

**Commit message:** `refactor(grid): remove the blocked breadcrumb zone`.

### Task 250: [x] Remember the last selected Scratch on this device

**Files and actions:** `src/stores/triage-preferences-store.ts` and test: a
validated `lastSelectedScratchId`; the Inbox selection owner
(`triage-store.ts` and the Pool or Workspace selection path) and their tests:
on first entry, reload or a new session, restore it when it resolves to an
active Scratch of this account, otherwise use the first active Scratch as
today; the search-hidden and Archive or Trash handoff rules are unchanged.

**Dependencies:** this phase's lifecycle gate.

**Authority:** F27; Phase 35 MI-14; SPEC §Scratch Pool (Selection and
re-entry), §Inbox/Triage State Ownership; SCHEMA device preferences.

**Observable acceptance:** a reload returns to the last selected Scratch; a
deleted or archived one, or one from another account, falls back to the first
active Scratch; no domain data is written.

**Verification:** gate; browser checkpoint (reload; another local test user).

**Commit message:** `feat(inbox): remember the last selected Scratch on this device`.
