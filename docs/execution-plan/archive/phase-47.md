# Phase 47 — Feel And Resilience

## Completion-time scope

Closed 2026-10-30. Tasks 231–234 are user-accepted. SaaS lane, part 6: the
app now feels immediate and says what the connection is doing. Task 231 moved
groups 1 and 2 of SPEC §Write feel onto the pending layer (one write may show
several effects, so a Chunk reorder is one entry), with rollback on a refusal
and the unknown-outcome rule; the development state switch can refuse an
ordinary write. Task 232 added the shared toast helper (`toast.ts`: kinds,
counted bursts, three live, timing and pauses) and the `toastCopy` rows; a
rolled-back write is reported once by the store (`write-failure.ts`), dialogs
show their inline refusal line instead (`create-refusal.ts`), the 17 kept
toast calls use the helper, and group 3 controls show the F03 loader after the
display delay (`use-pending-action.ts`, `pending-loader.tsx`). An unknown
outcome after the request timeout settles only from a read that ran after the
request ended (Task 232 MI-1), and a refused promotion, step delete or Archive
restore shows its failure toast (MI-2). Task 233 added the connection monitor
(normal, unstable, offline from request results; the `/auth/v1/health` probe
every 30 s; one recovery refetch) and the offline write gate in
`supabase-store.ts` `send()` and at every Inbox command entry (the triage
operation lock); recovery counts only once the recovery refetch succeeds
(Task 233 MI-3). Task 234 added the sidebar account icon (`Account`) with the
connection badge, tooltip and polite announcements, and the delayed Loading
screen; the session-expired screen from Task 228 was checked, and the Inbox
status was checked at 800 ms server latency. No SQL function or migration
changed, so nothing went to production. Ran on branch
`phase-47/feel-and-resilience`.

Kept by plan: `toast("Cell reserved by breadcrumb")` in `use-dnd.ts` stays
for Task 249 to delete.

Carried in: Phase 35 MI-23 (the loading screen), closed in Task 234 (user,
2026-10-30). Carried over: none. The record is in the ledger:
[`Issues_Phase_47.md`](../../issues/Issues_Phase_47.md).

## Task contracts at close

### Task 231: [x] Make ordinary writes immediate with rollback

**Files and actions:** `src/lib/db/supabase-store.ts` and
`snapshot-store.ts`: groups 1 and 2 of SPEC §Write feel through the pending
layer; rollback on `rejected` or error; the unknown-outcome rule (refetch,
keep or roll back, never resend); parent-change moves pick the nearest empty
cell from the snapshot (S43 (3)); tests for each group and for the S32 cases
across real calls. `src/lib/dev/state-switch.ts` and test: the ordinary write
methods join the injectable list (today it holds only the Inbox command
methods), so the switch can answer one with `rejected`.

**Dependencies:** Phase 46 and Phase 49 Final Close and `main` sync; this
phase's lifecycle gate.

**Authority:** S09, S15, S16, S32, S43 (3); SPEC §Write feel.

**Observable acceptance:** drag moves, edits, completion toggles and creates
show at once; Trash and Archive hide at once; a refused write rolls back.

**Verification:** full gate; `expert` review; browser checkpoint with the
development state switch (feedback F30), extended here to force a write
rejection.

**Commit message:** `feat(sync): make ordinary writes immediate with rollback`.

### Task 232: [x] Add the toast rules, server-confirmed pending and the request timeout

**Files and actions:**
- `src/lib/feedback/toast.ts` and test: kinds, counted bursts, at most three
  kinds, 4s success and 6s failure or warning, pause on hover, focus and a
  hidden tab, close button on failures and warnings (F13, F14).
- `src/lib/copy/feedback.ts`: the SPEC §Feedback copy toast rows.
- The 17 kept `toast(` calls move to the helper with their aligned copy (F16);
  rolled-back writes and account limits use their kinds. The eighteenth call,
  `toast("Cell reserved by breadcrumb")` in `use-dnd.ts`, does not move: Task
  249 deletes it (F16 dropped toast).
- Group 3 controls show the feedback F03 loader (Task 243's `status-icon`)
  after `DISPLAY_DELAY_MS` and a busy state (the request timeout itself is Task
  227's).
- A create the server refuses inside a dialog (the Node and Bit create
  dialogs, the Scratch capture modal), or a save it refuses in the Node edit
  dialog, shows its SPEC §Feedback copy dialog line inline, keeps what was
  typed and raises no toast.
- A refused promotion, step delete or Archive restore shows its SPEC
  §Feedback copy failure toast.
- The Toaster's position, colour and stack limit stay as Task 244 set them.
  If Task 245 has landed, its inline-editor offline toast moves to the helper
  too; otherwise Task 245 uses the helper.

**Dependencies:** Task 231.

**Authority:** S28; F02, F11, F13, F14, F16; SPEC §Toasts, §Feedback copy, §Write feel (group 3).

**Observable acceptance:** three quick failures show one counted toast;
different kinds stack to three; durations and pausing as specified; every
kept call shows its new copy; a slow permanent delete shows its loader only
after 300ms.

**Verification:** full gate; browser checkpoint in the three themes.

**Commit message:** `feat(feedback): add the toast rules and server-confirmed pending`.

### Task 233: [x] Add the connection states and the offline write gate

**Files and actions:** `src/lib/db/connection-monitor.ts` and test (normal,
unstable, offline from request results; 30-second probe while unstable or
offline; recovery refetch); refetch on visibility, focus and reconnect (S17);
a failed background refetch only sets unstable; every write path, the Inbox
commands included, checks the state first and, while offline, changes nothing,
keeps typed input and shows the offline toast (F18); the Inbox editor's offline
source moves from `navigator.onLine` (`use-scratch-breakdowns.ts`) to the
monitor. If Task 245 has not landed, the editor keeps its own offline line
until then, and Task 245 wires its offline toast to the monitor and the helper
(whichever lands second does the wiring and also removes the separate
`navigator.onLine` subscription in `breakdown-panel.tsx`, so one offline source
remains). The development state switch (Task 243) gains the network states.

**Dependencies:** Task 232.

**Authority:** S16, S17, S26, S27; F18; SPEC §Connection states.

**Observable acceptance:** Wi-Fi off makes the state offline and every write
attempt shows only the toast; a server that stops answering makes it unstable
and then offline after three failures; recovery refetches with no visible
notice; a write in flight when the server stops ends in the server's state
after recovery (unknown-outcome rule).

**Verification:** full gate; `expert` review (state machine); browser
checkpoint.

**Commit message:** `feat(sync): add the connection states and the offline gate`.

### Task 234: [x] Add the account icon, the connection badge, the loading screen and the session-expired screen

**Files and actions:** `src/components/layout/account-button.tsx` and test:
below the Home button if Task 248 has landed, otherwise at the very top
(Task 248 then puts Home above it; feedback F33), guest and account icons,
a focusable status element with the connection tooltip and no action until
Task 235, the badge, and the polite announcements including the screen-reader
`Back online.` (F17); `app-frame.tsx`: the delayed loading screen (busy) and
the session-expired screen with `Continue as guest` only (S43 (2), F20),
shown again after a reload while the session-expired marker is present; all in
the `DP-SAAS-01` look. Check the Inbox status presentation that is on `main` under real
server latency: network throttling in the browser, or production after
launch (SPEC §Write feel).

**Dependencies:** Task 233.

**Authority:** S23, S26, S27, S43 (1)(2); F02, F17, F19, F20; DESIGN_TOKENS
§SaaS App-State Surfaces.

**Observable acceptance:** each connection state shows its badge and tooltip;
the loading screen never appears for a load under 300ms; an expired session
whose refresh the auth server rejects shows the screen with focus on its
first action and creates no guest before the choice, even after a reload; a
refresh that fails only because the network is down shows the offline state
instead; the Inbox status shows no flicker the user
objects to.

**Verification:** full gate; browser checkpoint in the three themes, with the
state switch.

**Commit message:** `feat(account): add the account icon, badge and app screens`.
