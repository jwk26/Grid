# Phase 51 — Stabilization

## Completion-time scope

Closed 2026-11-05. Tasks 251–254 are user-accepted. App lane, beside the
account-backup DB lane (Phase 52), on branch `phase-51/stabilization`: system
Nodes no longer age, the capture success waits for a pointer already over the
panel, dead opacity props are gone (251); a Grid the account cannot use shows
an unavailable screen instead of an unnamed Grid (252); one `Esc` closes one
Inbox layer, the Triage drag first, and a blocked Undo no longer takes focus
when it unblocks (253); a held Inbox command whose surface is gone gets its
read-only check from the lock owner, once when the surface goes and once per
return to normal after outage evidence (254).

Carried in: ISSUE-16-03, ISSUE-20-03, ISSUE-20-04, Phase 48 mi-7, Phase 50
mi-6 and mi-8, and the Tasks 245A/246 held-lock residual, all resolved here
(ST25 and ST34 stay the residuals SPEC records). Carried over: mi-1, mi-3,
mi-4 and mi-6, in [`Issues_Deferred.md`](../../issues/Issues_Deferred.md).
No migration, so the merge is the deploy and nothing went to production.
Ledger: [`Issues_Phase_51.md`](../../issues/Issues_Phase_51.md).

Differences from the contracts below, recorded in the ledger and accepted with
their tasks:
- Task 252: the routed Node read moved into `GridRuntime` (`useRoutedNode` in
  `use-node.ts`), so `page.tsx` and `node-grid-body.tsx` are unchanged; the
  `?bit=` removal stays `router.replace` (mi-2 option B), so a cold load of a
  static route with `?bit=` keeps it (mi-3, deferred).
- Task 253: `grid-explorer-search-results.tsx` (`SearchResultItem`), outside
  the file list, got the same ST21 focus fix after a test showed it reachable;
  `grid-runtime.tsx` and `triage-workspace.tsx` needed no edit.
- Task 254: the reconnect subscription and the owner's checks live in
  `use-triage-operation-lock.ts`, which `triage-workspace.tsx` owns (same
  lifetime); the editor, Add and Delete hand-off sits in
  `use-scratch-breakdowns.ts`, so `breakdown-panel.tsx` and
  `triage-workspace.tsx` are unchanged (inside ST27).
- Learnings flow (ST29): every task's work plan carried a `Learnings:` line;
  Tasks 252–254 carried a `Lesson:` line, Task 251 `Lesson: none`.

## Task contracts at close

Authority: [stabilization DECISION](../../brainstorming/2026-11-04-stabilization-pass/DECISION.md)
ST01–ST38 (ST30–ST38 from the flow review, rounds 1–3); SCHEMA §Hooks aging row (ST09); SPEC
[Stabilization Amendment](../../SPEC.md#stabilization-amendment--2026-11-04), its
`/grid/[nodeId]` Unavailable Grid, Bit Detail Popup Unavailable Bit, `Esc` order, Quick Capture, Newly/Undo
focus, unknown-recovery and Connection states statements, and §Feedback copy;
DESIGN_TOKENS `grid-unavailable`; PLANNING_STANDARD §5.2 Phase 51 row and §6
Authoritative operation state.

Flow review: [Phase 51 flow review](../../reviews/phase-51-flow-review.md).

**Lane and waits:** `app` lane; waits for no phase and may run beside the
account-backup DB lane (ST02, ST03).

**Task order:** 251 → 252 → 253 → 254 (ST08), each waiting for the one
before: 252 and 253 share `grid-runtime.tsx`, and 253 and 254 share
`use-dnd.ts`, `breakdown-panel.tsx` and `triage-workspace.tsx`.

**Out of scope (ST07):** ISSUE-18-16 and ISSUE-19-01 go to the FE/Visual pass;
Phase 50 mi-10 stays held until it is seen again.

### Shared rules for every Phase 51 task

- **Gates:** the CLAUDE.md gate without `pnpm test:db` on every task; the
  phase close runs `pnpm test:db` once under the CLAUDE.md Local Supabase
  rule (ST02).
- **Database:** no task edits `supabase/`, adds a migration or resets the
  local database; a task seeds again after a DB-lane reset. A task that finds
  it needs SQL stops and reports to the user (ST02).
- **Checks:** the agent runs every functional check (tests and the isolated
  Playwright browser on local Supabase, seeded by
  `scripts/dev-fixtures/inbox-triage.js`). Only Task 252 has a user visual
  checkpoint (ST05, ST19, PLANNING_STANDARD §5.2).
- **Review:** Tasks 253 and 254 get an `expert` review before acceptance
  (ST22, ST27).
- **Production:** no migration, so the merge is the deploy; no dump (ST04).
- **Daily-use findings:** a bug the user finds in real use during the phase
  goes into the Phase 51 ledger; the user decides by its size whether it joins
  this phase or is deferred (ST06).
- **Learnings flow (ST29):** the phase close records, per task, whether the
  work plan carried a `Learnings:` line read from
  `docs/execution-plan/LEARNINGS.md` and whether the checkpoint carried a
  `Lesson:` line. It is a close-time observation, not a task acceptance
  criterion.

### Task 251: [x] Small Grid and capture fixes

**Files and actions:**
- `src/components/grid/node-card.tsx` and test: no aging filter for a Node
  with `systemRole !== null`; ordinary Nodes unchanged (ST09).
- `src/components/quick-capture/scratch-modal.tsx` and test: when the success
  state begins while the pointer is already over the panel, the auto-close
  timer does not start; it starts when the pointer leaves (ST10). "Over the
  panel" is read from the pointer itself (tracked from the modal's open, or
  `:hover` at the success entry), so a keyboard capture with the pointer
  outside the panel closes as before.
- `src/components/grid/grid-view.tsx`, `src/components/grid/grid-cell.tsx`
  and `grid-cell.test.tsx`: remove `levelOpacityMap` and the `borderOpacity`
  prop (ST11); no visual change.

**Dependencies:** this phase's lifecycle gate.

**Authority:** ST09–ST11; SCHEMA §Hooks aging row; SPEC Quick Capture
(Scratch); ISSUE-16-03, ISSUE-20-03, ISSUE-20-04.

**Observable acceptance:** the Inbox and Archive Node cards carry no aging
filter at any `mtime`, in the Grid and in the Inbox Explorer, while an
ordinary Node of the same age does; a Scratch capture that succeeds with the
pointer over the modal stays open until the pointer leaves, then closes after
the usual delay; a keyboard capture with the pointer outside the panel closes
after the usual delay; no reference to
`borderOpacity` or `levelOpacityMap` remains and the Grid renders as before.

**Verification:** gate; tests for the aging exclusion and for the timer with
the pointer over and outside the panel at success (fake timers); a browser
check by the agent of both behaviors.

**Commit message:** `fix(grid): drop aging on system Nodes, wait for hover on capture success and remove dead opacity props`.

### Task 252: [x] Show an unavailable screen for a Grid the account cannot use

**Files and actions:**
- `src/hooks/use-node.ts` and test (or a routed-Node hook beside it): tell
  apart not yet read, missing and found, and report whether the value belongs
  to the routed id (ST15). The first emission of `liveRead` for the current
  id is the read signal (it emits only once the snapshot is ready); a read
  error keeps today's behavior. Existing callers keep their behavior.
- `src/components/layout/grid-runtime.tsx`, `src/components/layout/node-grid-body.tsx`,
  `src/app/(grid)/grid/[nodeId]/page.tsx` and tests: when the routed Node is
  missing, or has `deletedAt` or `archivedAt` (ST13, ST14), render the
  unavailable screen in place of the Grid and the system-Node surfaces, with
  no breadcrumb and the tab title `APP_NAME` (ST17); judge only after the
  read and for the routed id (ST15); `hiddenFromGrid` is not a condition.
- `src/components/layout/app-frame.tsx` and test: extract the title, reason
  and actions block of the private `Screen` (the parts DESIGN_TOKENS names
  `app-frame-title`, `app-frame-reason` and `app-frame-action`, which carry no
  DOM marker today) into a shared component that marks them with those names
  as `data-app-role`; app-frame look and focus unchanged, the markers being
  the only output change.
- A new `src/components/layout/grid-unavailable.tsx` and test: the
  `grid-unavailable` role, in a non-`main` container filling the content area
  with the `triage-shell triage-shell--frame` classes, built from that shared
  block; the title is the page's `h1`; focus moves to `Go to Home` when it
  appears (ST36); `Go to Home` navigates to `/`.
- `src/components/layout/sidebar.tsx` and `grid-runtime.tsx` (add flow): while
  the screen shows, the `+` is a real `disabled` button, dimmed, with the
  wrapper `title` `Adding restricted on this page`, as the Calendar pencil is
  (never the `pointer-events-none`-only branch); when the screen appears every
  create and confirm surface `GridRuntime` hosts closes: the `+` entry
  surface, `CreateItemChooser`, both create dialogs however opened,
  `DeleteConfirmDialog` and both move confirmations, but not through
  `closeAll`, which would also close the Scratch capture modal; that modal
  stays (ST30). Focus moves to `Go to Home` after those close and only when no
  dialog layer is open (the `isDialogLayerOpen` set); an open layer keeps its
  focus (ST36).
- `src/hooks/use-bit-detail.ts` and `src/components/bit-detail/bit-detail-popup.tsx`
  and tests: tell apart not yet read, missing and found; after the read, a
  missing Bit or one with `deletedAt` or `archivedAt` removes `?bit=` with
  `router.replace` and closes, on every route (ST31).
- `src/lib/copy/feedback.ts`: the ST18 title, reason and button and the ST30
  reason.
- `src/components/layout/breadcrumbs.tsx` only if the breadcrumb needs a guard
  to stay hidden on this screen.

**Dependencies:** Task 251; this phase's lifecycle gate.

**Authority:** ST13–ST19, ST30–ST32, ST36, ST38; SPEC `/grid/[nodeId]` Unavailable
Grid, Bit Detail Popup Unavailable Bit, §Feedback copy (Dialogs and shell, Tab
title); DESIGN_TOKENS `grid-unavailable`;
Phase 48 mi-7; LEARNINGS React "Do not draw an empty state from a
not-yet-read array".

**Observable acceptance:** on the production build (ST19), each of a random
id, another local test user's Node id, a Node moved to Trash and then reached
by Forward, an archived Node, and Back after sign-out shows the screen with the
ST18 copy, focus on `Go to Home`, no Grid or breadcrumb, and the sidebar `+`
disabled with its reason (not reachable by Tab and Enter); an open `+` menu,
cell-opened chooser, create dialog, delete confirmation or move confirmation
closes when the screen appears; with the Scratch capture modal open in tab A,
the screen appears behind it and focus stays in the modal input;
client navigation between valid Grids, a cold load of a valid Grid and a slow
snapshot read never show the screen, even for one frame; a Grid open in tab A
whose Node is trashed or archived in tab B shows the screen when tab A is
focused, and the Grid again after the Node is restored; a Node hidden from
Home (`hiddenFromGrid`) still opens; the Inbox and Archive still open. A
`?bit=` for a missing Bit or a Bit in Trash or Archive, on this screen or on a
valid Grid or the Calendar, leaves the URL without `?bit=` and no popup
remains, while a valid `?bit=` opens as before.

**Verification:** gate; hook tests for the three read states, a stale
previous Node and a read error (`use-node.ts`, `use-bit-detail.ts`); route
tests for each ST13 case and the no-flash case; sidebar tests for the
disabled `+`, the closing surfaces (the Scratch modal kept) and the focus
rule with and without an open dialog layer and with a Bit popup closing on
the same read; browser
checks by the agent on the production build (`pnpm build && pnpm start`)
against local Supabase; the agent checks `retro-mac`, `neumorphism` and
`claymorphism`, light and dark, for the same app-frame parts and theme classes;
**Please check** by the user: two scenes, `griddo` light and dark, in the
prepared window (CLAUDE.md Test data). Text on the `retro-mac` dither is
Phase 48 mi-2, not a finding.

**Commit message:** `feat(grid): show an unavailable screen for a Grid the account cannot use`.

### Task 253: [x] Close one Inbox layer per `Esc` and keep focus on unblock

**Files and actions:**
- `src/hooks/use-breadcrumb-reveal.ts` (`useEscapeOrder`) and
  `src/components/layout/grid-runtime.tsx` (its caller and the owner of
  `isDialogLayerOpen`) and tests: accept Inbox layers, so the Triage drag
  counts as a drag and the explorer search, an open Breakdown editor, the Add
  field, the Placement affordance and the Archive completion area as layers
  below the dialog layer and above edit mode (ST20, ST35). An open layer that
  refuses `Esc` while locked still counts: the press does nothing and edit mode
  stays. Grid and Calendar order unchanged.
- `src/components/triage/hierarchy-explorer.tsx`,
  `src/components/triage/breakdown-panel.tsx`, `src/hooks/use-dnd.ts`
  (Triage drag) and tests: register those layers; their own `Escape`
  handlers keep closing their element and no longer rely on a bubble-phase
  `preventDefault` reaching the capture-phase owner.
- `src/components/triage/hierarchy-explorer.tsx` (`useNewlyUndoActionFocus`
  and the search focus effect) and tests: focus moves to an Undo slot status
  only as the answer to that item's own Undo; a not-applied Undo whose block
  by another operation clears does not take focus (ST21).
- `src/components/triage/triage-workspace.tsx` and test only where the layer
  registration or the focus owner needs it.

**Dependencies:** Task 252; this phase's lifecycle gate.

**Authority:** ST20–ST22, ST35; SPEC Breadcrumb reveal `Esc` order, Inbox Newly/Undo
focus; Phase 50 mi-8, mi-6.

**Observable acceptance:** in edit mode on the Inbox, one `Esc` closes only
the open explorer search, Breakdown editor, Add field, Placement affordance or
Archive completion area, and one `Esc` during a pointer Triage drag cancels
only the drag; a second `Esc` then exits edit mode. With such a layer locked
(a pending placement, an editor holding an unknown command, a recovery view
whose Close is unavailable), `Esc` does nothing and edit mode stays. A
not-applied Undo whose blocking operation finishes leaves focus where that
operation put it. On the Grid and the Calendar, `Esc` behaves as before.

**Verification:** gate; tests for each Inbox layer, each locked layer, and the
unchanged Grid order (Grid keyboard drag with `Esc` included) and Calendar;
a focus test for blocked → terminal with another operation's focus target;
browser checks by the agent of the Inbox layers and the Grid order; `expert`
review. The Triage drag has no keyboard sensor (SPEC Decision 12), so it has
no keyboard case.

**Commit message:** `fix(inbox): close one layer per Esc and keep focus when an Undo unblocks`.

### Task 254: [x] Recover an Inbox lock whose surface is gone

**Files and actions:**
- `src/hooks/use-triage-operation-lock.ts` and test: the lock owner keeps,
  with a held command whose outcome is unknown, that command's read-only check
  (operation and target identity and its `reconcile_*` call), so the check
  outlives the surface that started it (ST24, ST33). The lock admits one
  operation at a time, so at most one command is held.
- `src/hooks/use-scratch-breakdowns.ts` (the Breakdown editor),
  `src/components/triage/breakdown-panel.tsx` (Breakdown Add and Delete,
  through `reconcile_add_breakdown` and `reconcile_delete_breakdown`) and
  `src/hooks/use-dnd.ts` (Stage and Unstage) and their tests: hand the check
  to the lock owner when they hold a command, and report "surface gone": the
  editor and the panel on unmount (cleanup), Staging when the candidate
  leaves the list or its Scratch changes (already tracked). Their own `?`,
  `Check again` and background-check paths stay, but every check of a held
  command runs through the owner or reports its start to it, so the owner
  never sends a check the holder already sent; Add and Delete gain the one
  per-path check through the owner (ST33).
- `src/lib/db/connection-monitor.ts` and `src/lib/db/connection.ts` and
  tests: count outage evidence (a failed probe, the browser's `offline`
  event) and expose the count and the real state (ignoring a development
  forced state) read-only (ST34, ST37); state behavior unchanged.
- `src/hooks/use-dnd.ts` and test (Task 253 mi-5, user 2026-11-05): register the
  Triage drag as an `Esc` layer from dnd-kit's own drag start, so a drag that
  `handleDragStart` refuses (a lock held or Placement open) still counts and
  `Esc` cancels only it.
- `src/components/triage/triage-workspace.tsx` and test: run the owner's
  checks: once when a held command's surface goes, unless a check of it
  already started after the surface began to go (a `Check again` or check
  made while the surface was mounted does not count; ST38);
  then, on a transition of the real state to `normal`, once more only if the
  outage-evidence count grew since that command's last check started or that
  check started while the real state was not `normal` (ST37). A development
  forced state counts as no outage. A
  terminal answer releases the lock as the command's own check would.
  Unmounting the workspace (leaving the Inbox while locked) drops the lock
  and its check, as a reload does; nothing outlives the workspace.

**Dependencies:** Task 253; this phase's lifecycle gate.

**Authority:** ST23–ST27, ST33, ST34, ST37, ST38; SPEC Connection states (Held Inbox
command whose surface is gone), the editor and Staging unknown-recovery
statements; PLANNING_STANDARD §6 Authoritative operation state; Tasks 245A
and 246 residual.

**Observable acceptance:** in the isolated browser, with window-only routes:
1. An editor save, a Stage and a Breakdown Add whose outcome is unknown, each
   in its own run, whose surface then disappears (the Scratch removed in
   another context and the external-removal handoff finished, so the panel
   remounts; for the Stage, the candidate leaves the list): with the
   connection normal, exactly one `reconcile_*` is sent when the surface goes
   and its terminal answer unlocks the Inbox; Add and Delete no longer stay
   locked until reload.
2. The same with that check failing offline, produced by real offline
   emulation (Playwright `context.setOffline`, which fires `offline`), not
   the state switch, and with the connection back before the first probe
   (under 30 s) as well as after it: the Inbox stays locked while offline; on
   the return to normal exactly one more `reconcile_*` is sent, no write is
   resent, and Add, Stage, Placement, Archive and Scratch
   switching work again without reload. A further offline–online cycle while
   it still fails sends one more check, never a timed loop.
3. A check that starts at `normal` and only its own path fails (window-only
   route on that `reconcile_*` while the probe succeeds) is sent once and not
   again on the following return to normal.
4. A check answered with a server error while the state stays `normal` is run
   and recorded: it stays the ST25 residual and nothing forces another check.
5. With the editor's own invalidation check sent first and the panel then
   remounting, the owner sends no second check: exactly one `reconcile_*`.

Unstage and Delete are covered by unit tests.

**Verification:** gate; tests for the hand-off of each command kind, the
per-path check, a holder's own check followed by "surface gone" (one request
for each holder), an Add whose `Check again` failed and whose panel then
remounts (exactly one per-path `reconcile_add_breakdown`), the reconnect rule (a failed probe and an `offline` event
count, the check's own failure does not; a check started while the real state
was not `normal` earns the next return; a development forced state and its
end earn nothing), no resend, the released lock and the workspace unmount; the browser runs above; `expert`
review. Scope limit (ST27, ST33, ST34): a change beyond the lock hook, the two
holders, `breakdown-panel.tsx`, the workspace, `connection-monitor.ts` and
`connection.ts` stops the task for the user's decision against accepting the
residual.

**Commit message:** `fix(inbox): check a held command when its surface goes and after an outage`.
