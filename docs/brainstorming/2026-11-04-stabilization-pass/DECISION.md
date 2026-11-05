# Post-launch stabilization pass (lane A)

## Metadata

- Created: 2026-11-04
- Readiness: code-ready
- Category: deferred task
- Source project: GridDO
- Source topic: n/a (deferred items in `docs/issues/Issues_Deferred.md` and the Phase 34, 48 and 50 ledgers)
- Source prototype: n/a
- Tags: stabilization, routing, not-found, inbox, escape, focus, operation-lock, aging, scratch-modal, cleanup
- Dependencies: Phase 48 and Phase 50 closed; `main` `6c74625` (PR #71)

Settled with the user in an Opus session on 2026-11-04, from the control
tower's starting brief (`/Users/jwk/Documents/docs/plans/2026-11-04-phase-51-stabilization-craft-docs.md`,
outside the repository). Each item was checked against its source ledger and
the code at `6c74625` before it was decided. This document is the authority for
the promotion into SCHEMA, SPEC, DESIGN_TOKENS, PLANNING_STANDARD and the execution
plan. CLAUDE.md does not change.
It reopens no accepted task and no closed phase.

## 1. Delivery

| ID | Decision |
|---|---|
| ST01 | The work runs as Phase 51, Tasks 251–254, the next unallocated numbers. |
| ST02 | Phase 51 is an **app lane** phase: no task edits `supabase/`, adds a migration or resets the local database. `pnpm test:db` runs once, at the phase close (CLAUDE.md §Workflow). If a task finds it needs SQL, it stops and reports to the user; that is outside this phase. |
| ST03 | Phase 51 waits for no phase and may run beside the account-backup DB lane (`2026-11-01-account-backup`). This promotion merges first; the backup promotion starts from `origin/main` after it, since both edit `EXECUTION_PLAN.md`. |
| ST04 | No migration, so the merge is the deploy and no manual dump is taken. |
| ST05 | The user keeps visual judgment to a minimum: only Task 252 has one visual checkpoint, of two scenes (ST19). Every other check is run by the agent (tests and the isolated browser). |
| ST06 | No separate trial period. Anything the user finds in daily real use during the phase goes into the Phase 51 ledger, and the user decides by its size whether it joins Phase 51 or is deferred. |
| ST07 | Out of scope: ISSUE-18-16 (drop a staged candidate back on Breakdown) and ISSUE-19-01 (the Archive menu trigger) go to the FE/Visual pass; Phase 50 mi-10 (one misplaced first drag) stays held until it is seen again. |

## 2. Task bundling

| ID | Decision |
|---|---|
| ST08 | Four tasks, smallest first and the riskiest last, so the riskiest can fall back to acceptance (ST27) without holding the others: 251 small fixes; 252 the unavailable-Grid screen; 253 Inbox `Esc` and focus; 254 Inbox lock recovery. |

## 3. Task 251 — small fixes and two checks

| ID | Decision |
|---|---|
| ST09 | ISSUE-20-04: system Nodes (`systemRole !== null`, the Inbox and the Archive) get no aging treatment on their Node card. Ordinary Nodes are unchanged. |
| ST10 | ISSUE-16-03: when the Scratch modal enters its success state while the pointer is already over the panel, the auto-close timer does not start; it starts when the pointer leaves, as it does today after a hover. |
| ST11 | ISSUE-20-03: the dead `borderOpacity` prop and `levelOpacityMap` are removed, with the tests that pass the prop. No visual change. |
| ST12 | P27-06 (ThemeToggle hydration mismatch on a persisted-dark reload) and Phase 34 MI-5 (Bit options losing pointer events on the ordinary Grid) are closed without a reproduction run (user, 2026-11-04), in this promotion. P27-06: `theme-toggle.tsx` renders both icons and switches them with CSS, with a fixed `aria-label`, so server and client output match. MI-5: its only record matches a test-tool click message on a Bit card that has changed a lot since (Phases 47–50). A new sighting opens a new item. |

## 4. Task 252 — unavailable Grid (Phase 48 mi-7)

| ID | Decision |
|---|---|
| ST13 | `/grid/[nodeId]` shows one **unavailable** screen when, in the current account's data, the Node does not exist, or it has `deletedAt` or `archivedAt` set. This covers a permanently deleted Node, another account's link, Back or reopening the address after sign-out, a deleted guest, and a Node in Trash or Archive (Back or Forward after moving it there). |
| ST14 | The test is the Node's own `deletedAt` and `archivedAt`: Trash and Archive mark the whole subtree (`soft_delete_node`, `archive_node`). `hiddenFromGrid` does not make a Node unavailable. System Nodes are never trashed or archived, so they are unavailable only when missing. |
| ST15 | The screen is judged only after the account data has been read **and** the hook's value belongs to the routed id. `useNode` today returns `null` both before the read and for a missing Node, and keeps the previous Node until the new one arrives, so it gains a distinct not-yet-read state (LEARNINGS, React: "Do not draw an empty state from a not-yet-read array"). A valid Grid never flashes the screen during navigation. |
| ST16 | Why a screen and not today's Grid: the write functions already refuse a parent in Trash or Archive (`parent_inactive`), so no data changes, but today the Grid looks writable and an add or move shows optimistically, then rolls back with an error toast. The screen replaces the Grid, so no write starts there. |
| ST17 | Placement: inside the Grid shell; the sidebar stays. The look reuses the app-level screen pattern (title, one reason line, one button) of the load-failure screen; no new visual value. No breadcrumb is shown. The tab title is the app name. |
| ST18 | Copy (SPEC §Feedback copy, owned by `src/lib/copy/feedback.ts`): title `Couldn't open this Grid.`; reason `It may have been deleted, moved to Trash or archived, or it may belong to another account.`; button `Go to Home`, which navigates to `/`. |
| ST19 | Browser checks that use Back or Forward run on the production build (`next dev` has the Phase 48 mi-3 Back blank page). The user's visual checkpoint is two scenes: the screen in `griddo`, light and dark. The agent checks `retro-mac`, `neumorphism` and `claymorphism`, light and dark: the screen draws with the same title, reason and button parts and theme classes as the load-failure screen (the same parts, not the same page layout, since this screen sits beside the sidebar). Text on the `retro-mac` dither is the known Phase 48 mi-2 / Phase 45 MI-24 debt of the theme stage, not a new finding. |

## 5. Task 253 — Inbox `Esc` and focus (Phase 50 mi-8, mi-6)

| ID | Decision |
|---|---|
| ST20 | mi-8: the explorer search, the Breakdown editor and the Triage drag register as layers the `Esc` owner (`useEscapeOrder`) sees, so one `Esc` closes only the topmost: a drag, then the editor or search, then edit mode. Their own bubble-phase `preventDefault` is not the mechanism, since the owner listens in the capture phase. Grid and Calendar `Esc` behavior stays as it is. |
| ST21 | mi-6: a not-applied Undo whose block clears (blocked → terminal) does not move focus back to its `!`. Focus moves to a status only when that item's own command answered, not when another operation's block ends. Focus destinations otherwise stay as they are. |
| ST22 | Both change focus or keyboard order, so the task gets an `expert` review before acceptance. |

## 6. Task 254 — Inbox lock recovery (Tasks 245A and 246 residual)

| ID | Decision |
|---|---|
| ST23 | The residual: a command whose outcome is unknown holds the Inbox operation lock; its one automatic read-only check failed; and the surface that could check again is gone (the Breakdown panel remounted after a Scratch handoff, or the Scratch or candidate left). Nothing can release the lock until reload. Data is safe, since nothing is resent. |
| ST24 | Fix (option A): the lock owner keeps, with the held command, the read-only check for it (operation and target identity and which `reconcile_*` to call), so the check no longer depends on the surface that started it. Each time the connection state returns to `normal` (`connection-monitor.ts`), every held command whose surface is gone gets one read-only check. A terminal answer releases the lock as today. Never a resend; no new control or visible surface. |
| ST25 | Server-answered failure: `connection-monitor.ts` also turns `unstable` on a `degraded` read (the server answered but a background read failed) and calls its listeners on the return to `normal`. The task verifies, in the isolated browser with window-only routes, both failure kinds of the check: no answer, and an answered error. If an answered error of the check itself leaves the state at `normal`, that case stays a residual: the task does not make a failed check report `degraded` to force a transition, because that would re-check at the probe interval (30 s) for as long as the server keeps failing. |
| ST26 | PLANNING_STANDARD §6 "Authoritative operation state" is amended to match: a read-only check at most once per path the surface can disappear by, and once more each time the connection returns to `normal`; never a resend and never a timed retry loop. |
| ST27 | Scope limit: the change stays in the lock hook, the two lock holders (the Breakdown editor, `use-scratch-breakdowns.ts`, and Staging, `use-dnd.ts`) and the workspace. If it needs more, the task stops and asks the user to compare it with accepting the residual as it is. The task gets an `expert` review before acceptance. |

## 7. Workflow items

| ID | Decision |
|---|---|
| ST28 | The Phase Index gains a `Lane` column (CLAUDE.md §Workflow: "The Phase Index names each phase's lane"). Phase 51 is `app`. Closed phases before the role-based lanes get `—`. |
| ST29 | Phase 51 is the first phase after the learnings flow change (2026-11-04). The phase close records whether each task's work plan had a `Learnings:` line read from `docs/execution-plan/LEARNINGS.md` (the CLAUDE.md Close archive path, not the skill default `docs/LEARNINGS.md`) and whether each checkpoint had a `Lesson:` line. It is a close-time observation, not a task acceptance criterion. |

## 8. Flow-review round 1 decisions (2026-11-04)

From [the Phase 51 flow review](../../reviews/phase-51-flow-review.md), round 1.

| ID | Decision |
|---|---|
| ST30 | G1 ①: while the unavailable screen shows, the sidebar `+` is disabled the way the Calendar's edit-mode pencil is: a real `disabled` button, dimmed, with the reason `Adding restricted on this page` as the wrapper's `title`. The sidebar's no-handler branch (`pointer-events-none` only, still reachable by keyboard) is not used. An open `+` menu (Ideas/Create, the Node/Bit chooser) and a Node or Bit create dialog opened from it close when the screen appears; the Scratch capture modal stays, since it writes to the Inbox. |
| ST31 | G1 ②: the Bit detail popup judges its own Bit. After the read, when the Bit is missing or has `deletedAt` or `archivedAt`, it removes `?bit=` with `router.replace` and closes. `useBitDetail` tells not yet read, missing and found apart, so a valid popup never closes before its read. This holds on every route the popup opens on. A Bit that the popup itself moved to Trash and that comes back on a failed write does not reopen it. |
| ST32 | G1 ③: edit mode and drops on the unavailable screen need no change: there is nothing on it to act on. |
| ST33 | G2 (a): ST23 and ST24 cover every Inbox command whose outcome is unknown and that holds the operation lock: the Breakdown editor save, Staging Stage and Unstage, and Breakdown Add and Delete. Any such command hands its read-only check to the lock owner, which runs it once when that command's surface goes (the per-path check Add and Delete lack today, for example after the external-removal handoff remounts the panel) and once on each return to normal connection. The existing `reconcile_add_breakdown` and `reconcile_delete_breakdown` functions serve Add and Delete, so no SQL changes. ST27's stop rule applies to the wider scope: the files are the lock hook, the two holders (`use-scratch-breakdowns.ts`, `use-dnd.ts`), `breakdown-panel.tsx` (now a required file) and the workspace; a change beyond them stops the task for the user. |
| ST34 | G3: a return to normal earns a held command a check only when outage evidence arrived since that command's last check started. Outage evidence is a failed probe or the browser's `offline` event, counted by `connection-monitor.ts` and exposed read-only through `connection.ts`; an ordinary request's failure, the check's own included, is not evidence. So a check that only its own path fails (the probe keeps succeeding) never earns the next one, while a real drop during a check does. No time-based guess. ST27's file list gains `connection-monitor.ts` and `connection.ts`. Residual, recorded beside ST25: a check that fails in a drop that ends before any probe fails and without an `offline` event leaves the lock until the next outage or a reload. |
| ST35 | G4 (a): ST20's layers also include the Inbox Placement affordance, the Archive completion area and the Breakdown Add field, in Task 253. An open Inbox layer that refuses `Esc` because it is locked (a pending placement, an editor or Add field holding an unknown command, a recovery view whose Close is unavailable) still counts as the top layer: that `Esc` does nothing and edit mode stays. |
| ST36 | Review M2: the unavailable screen moves focus to `Go to Home` when it appears, following the `app-frame-action` fixed fact it reuses (DESIGN_TOKENS: "Focus moves to the first action"). Its title is the page's `h1`, and it is not a second `<main>`. |
| ST37 | Review N1 (a): a return to normal also earns a held command a check when its last check started while the connection was not `normal`. The earned check starts at `normal`, so its own failure earns nothing further. Every part of the reconnect rule (the state when a check starts, the transition to `normal`, the outage evidence) reads the monitor's real state, exposed read-only through `connection.ts`; a development-switch forced state affects none of it, so a forced state behaves as no outage. |
| ST38 | Review rounds 2–3 refinements, following ST16 and modal semantics (no new product choice): ST30's closing covers every create and confirm surface of the Grid shell (the `+` menu, the cell-opened chooser, both create dialogs however opened, the delete confirmation and both move confirmations), never the Scratch capture modal; ST36's focus move happens after those close (and after an ST31 popup close on the same read) and only when no dialog layer is open. ST33's per-path check is skipped only when a check of that command started after its surface began to go (the editor's invalidation check, Staging's background check); a `Check again` or automatic check made while the surface was still mounted does not count. |
