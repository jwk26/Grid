# Inbox Item Status Feedback — Notes

## Session brief (2026-10-21)

Written by the planning (orchestrator) session for a fresh Opus session
(effort high) that settles the feedback system. The user starts it with one
line that points here.

### Goal

Settle, with the user, how GridDO reports the state and the result of what
happens, and bring this topic's `DECISION.md` to `Readiness: code-ready` so a
later `/craft-docs` can promote it. This topic absorbs
`2026-04-28-toast-feedback-placement`. Brainstorming only: no production code
and no canonical-document edits.

Deadline: before SaaS Phase 47 starts. Phase 47 builds the SaaS loading,
connection and failure states by these rules
(`2026-10-21-saas-conversion` S39).

### Setup (done by the orchestrator session)

- Worktree `/Users/jwk/Documents/grid-feedback`, branch `docs/feedback-system`,
  created from `docs/saas-conversion` at `28eeb08`, not from `origin/main`: the
  SaaS decisions are inputs here, and that branch already edited the metadata
  of this topic and of the toast topic. Merge order: the SaaS docs branch
  first. If `docs/saas-conversion` reaches `main` before this branch closes,
  merge `origin/main` into this branch before `/craft-docs`.
- The two entries `2026-10-20-app-shell-theme-coverage` and
  `2026-10-20-command-palette-default-behavior` were moved here from the main
  worktree, where they were untracked. They are not part of this discussion
  (theme stage and later); they only ride on this branch into `main`.

### Inputs

- `CLAUDE.md`, `docs/brainstorming/readme.md`.
- This topic's `DECISION.md` and the sections below; the toast topic's
  `DECISION.md`.
- `2026-10-21-saas-conversion/DECISION.md`: S09, S15, S16, S23, S26–S28, S39
  and S40 (on this branch).
- `docs/DESIGN_TOKENS.md` "Approved Add/Unstage success realization"
  (`DP-VQ02`) and "Approved Staging attached-status realization"
  (`DP-VQ06-STAGING`); `docs/SPEC.md` Durable Staging post-terminal
  presentation hold; the Breakdown, Staging and Newly/Undo recipes in
  `docs/recipes/`.
- `docs/issues/Issues_Phase_35.md` (mi-14, MI-14, MI-15, MI-21) and the
  matching rows in `docs/issues/Issues_Deferred.md`.
- The current app: `src/app/providers.tsx` (`<Toaster richColors
  position="bottom-right" />`) and the existing `toast(` call sites (about 18:
  grid full, deadline update failure, Trash restore/delete results, drag
  rejections).
- For look ideas only: the Paper entry on `prototype/default-theme`
  (`2026-10-21-default-theme/DECISION.md`, "Status icons" and "Toast"). Theme
  looks are decided in the theme stage, not here.

### Scope

1. One feedback layer table: item level (Inbox status icon and tooltip),
   app level (loading screen, connection indicator), transient (toast) and
   blocking (load failure, guest creation failure). For each event: its layer,
   copy owner, timing (display delay), and screen-reader behavior.
2. Inbox item status: the open planning questions below, plus Phase 35 MI-21
   (drop the reserved success slot of the Breakdown row; a minimum width for
   the Staging Nodes zone).
3. Toast: when to use it (the toast topic's criteria against SaaS S28), its
   position, grouping of bursts, duration and copy, and an audit of the
   existing call sites (keep, change or drop). The toast topic prefers a
   position near the Grid breadcrumb. The user confirmed on 2026-10-21 that
   "breadcrumb" in this discussion means only that position anchor: no new
   breadcrumb and no breadcrumb theme work here (that is
   `2026-10-20-app-shell-theme-coverage`, theme stage). The breadcrumb's
   measured size sets the blocked Grid cells (`runBreadcrumbZoneMigration`,
   SaaS S11), so anything attached to it must not change that size.
4. Where the SaaS states appear: the connection indicator (S27), the loading
   and load-failure screens (S26), the offline write-attempt toast (S27) and
   the session-expiry fallback (S16). Their look stays semantic-token only
   (S40).
5. Phase 35 MI-14: whether and where the last selected Scratch persists across
   reload. Advisory recommendation: device-local in
   `triage-preferences-store` (S11 keeps device preferences in browser
   storage), falling back to the first Scratch when the saved one is gone.

### Procedure

1. Ask in rounds of at most four AskUserQuestion questions, each with options
   and a recommendation. The user is a frontend developer with weak
   fundamentals: explain with GridDO examples first, in plain Korean.
2. Visual choices go on a served HTML option sheet with real renders and
   Korean explanations, not short text or ASCII previews. Render in the
   current default theme (`griddo`), and spot-check `retro-mac` and
   `neumorphism` (S40).
3. Rewrite this `DECISION.md` from "Direction" into a decisions table (user,
   date) and keep reasoning and rejected options in this file. Fold the toast
   topic's decisions in, and mark that topic
   `Status: merged into 2026-10-18-staging-item-status-feedback`.
4. When every blocking question is answered, set Readiness to `code-ready`,
   commit, and give the next step: `/craft-docs` with this topic in a fresh
   Opus session. That promotion may amend the SaaS Phase 47 tasks.

### Working rules

- Reply in Korean, as a senior-developer mentor; be direct about mistakes.
- At each checkpoint, give a plain-Korean, step-by-step "what to look at" list.
- End each decision request with "권장, 제안드린대로 진행할까요?".

## Session log (2026-10-21, feedback-system session)

Independent view (step 1, before reading the user's direction): an event
needs a notice only when its result is not already visible; a problem tied to
one item belongs on that item; a state of the whole app belongs to one app
indicator; a result that is off-screen or whose item disappeared, with nothing
left to do, is a toast; a state that stops the user is a blocking screen. This
agrees with the user's direction. Gaps it found in the earlier notes: the
breadcrumb exists only on Grid pages, so a breadcrumb-anchored toast needs a
rule for Inbox, Archive, Trash and Calendar; the Node/Bit create dialogs close
and toast "Grid is full" after submit (`grid-runtime.tsx:240`, `:314`), which
drops the typed title; the SaaS session-expiry fallback (S16) switches to a
guest with demo data, which reads as data loss; the inline editor's own
`Offline.` line duplicates the SaaS offline toast (S27).

Round 1 (user, 2026-10-21; all advisory recommendations taken):

- Display delay: one 300ms value app-wide (Inbox loader, S26 loading screen,
  S26 server-confirmed writes). Reconciling uses the same delay; during it the
  item keeps the icon it showed (`?`), and the pressed control (`Check again`)
  turns unavailable at once as the acknowledgement. Rejected: a separate 500ms
  Inbox value (two numbers); an immediate loader on reconcile (`?` → loader →
  nothing flashes when the check is fast).
- Emphasis: only `?` and `!` add item emphasis; the loader is the icon alone.
  The existing dimming of a locked source row or candidate stays (it shows the
  lock, not a status). Rejected: emphasis on the loader (emphasis would stop
  meaning "look here"); icon-only for all (a small `!` on a busy card is easy
  to miss).
- Screen readers: keep a polite, visually hidden `Added.` /
  `Returned to Breakdown.` / `Saved.` announcement on success. Rejected: no
  announcement (a screen-reader user in the Add field gets no confirmation).
- Inline editor (Breakdown row edit, Scratch title edit) follows the same
  rule: `Unsaved changes.` shows no text (the enabled Save is the signal);
  `Saving…` and `Checking whether your changes were saved…` become the loader
  after the delay, with Save/Cancel unavailable at once; `Saving before
  continuing…` becomes the loader plus the existing `Stay here` control, the
  sentence in the tooltip; `Not saved.` becomes `!` plus tooltip; `Offline.`
  is replaced by the app-wide offline write-attempt toast (S27); the conflict
  view stays. Rejected: keeping editor text (MI-20 room at 1024px, two rules).

Round 2 (user, 2026-10-21; option sheet with griddo, retro-mac and
neumorphism renders; all advisory recommendations taken). The first sheet drew
Explorer Node/Bit cards as the base square Grid card; the user pointed out
that the realized Explorer cards are full-width rows (`data-card-presentation=
"inbox-explorer"`, neumorphism `globals.css` ~7569–7690 and 8329–8440,
retro-mac ~1943–2130 and 5744–5830). Redrawn from that CSS, the Q-B
recommendation changed from the text action to the slot icon, because the
recovery state reserves 100–112px at the row end and leaves a 150px column
(MI-17, 1024px with the Pool open) almost no title.

- Defaults shown on the sheet, not objected to: the Breakdown row drops the
  160px success slot and keeps a 22px status slot, always reserved so the
  title does not shift (MI-21, row part); the Add field shows its icon inside
  the field at the right end, emphasis on the field, `Retry Add` stays beside
  Add; a Staging Node card shows the icon in its top-right corner; tooltip
  precedence: on the card body the problem tooltip replaces the Task 179A
  truncated-title tooltip and leads with the full title (not repeated when the
  sentence already holds it); a control shows only its own tooltip.
- Q-A Bit rows: icon alone, the same rule as Node cards, Breakdown rows and
  Explorer rows. Rejected: icon plus a short line (row height changes, new
  short copy, Node/Bit split).
- Q-B Explorer Newly rows: the Undo slot becomes the Undo operation's status
  slot: `↶` → loader → `?` (button: Check again) → `!` (button: Retry; a `!`
  without an action, such as conflict, is an unavailable focusable button
  with its tooltip, like the existing unavailable Undo). The slot tooltip adds
  `Select to check again.` / `Select to try again.`; the row keeps its width.
  Rejected: the current text action in a 100–112px reserve (title lost at
  150px); status icon plus a `↻` button (two icons' width, `↻` does not tell
  read-only check from retry).
- Q-C Staging Nodes zone (MI-21, Staging part): a minimum width of one Node
  card and an auto-fill card grid (one column when two do not fit, two as
  today when they do), shared across themes. Rejected: stacking Nodes above
  Bits when narrow (halves the vertical room, moves the drop target).
- Q-D scope: item-attached Inbox statuses follow the icon rule, including
  Explorer Undo; decision surfaces keep their sentences (Placement plate,
  Archive completion card, Scratch Trash dialog, inline-editor conflict view).
  Rejected: the original scope only (Explorer Undo would differ); icons inside
  decision surfaces too (the reason is needed at the moment of deciding).

Round 3 (user, 2026-10-21; toast option sheet `toast.html` with a Grid mock
at real proportions and layout-only Inbox/Trash mocks):

- Position: A, the top-left of the work area; on Grid pages under the
  breadcrumb, outside the measured breadcrumb cluster. Rejected: top-right
  (detached from the action, covers top-right cards); bottom-right as today
  (detached, the thing the toast topic wanted to change).
- Use criteria as tabled: toast only for (1) a failed write that was rolled
  back (S28), (2) a blocked action whose reason is not visible where it was
  dropped, (3) a result out of view (Trash restore, permanent delete, empty
  Trash), (4) a write attempt while offline (S27). Never for Inbox item
  states, visible successes, problems inside a dialog (the dialog shows them
  and keeps the input), connection state or recovery, cancels and ordinary
  drags. Rejected: success toasts for moves and creates (noise, against the
  round-1 silent-success rule).
- Bursts: A, one toast per kind; a repeat of the same kind while it is
  visible updates its text with a count and restarts its time; different
  kinds stack up to three. Rejected: stacking (same sentence three times,
  against S28); last-only (hides how many failed).
- Defaults accepted with one user change: success 4s, failure 6s, paused on
  hover, focus and hidden tab; a close button on failures; sentence form
  "what did not happen. what the screen shows now."; polite for all; copy in
  one copy module. User change: the toast keeps colour. It keeps the current
  `richColors` hues (error red, success green) and blends them into each
  theme through semantic tokens, instead of the advisory proposal of neutral
  theme colours with the icon shape alone ("색상이 없으니 상태가 구분이 잘
  되지 않아"). The icon shape still carries the type, so colour is not the
  only signal. Exact per-theme blends belong to the theme stage.
- Call-site audit as tabled: change the Node/Bit create dialogs to show "no
  empty cell" inside the dialog and keep the typed title, at every level
  (`grid-runtime.tsx:240`, `:314`); drop `Cell reserved by breadcrumb`
  (`use-dnd.ts:1022`; the blocked cell's droppable is disabled,
  `grid-view.tsx:65`); keep the other 17 calls, with copy aligned to the
  sentence form at `/craft-docs`.

New discussion opened by the user (2026-10-21): breadcrumb reveal. The
floating breadcrumb at the top-left of the Grid looks rough and blocks the
cells under it, and "how many cells to block when its length varies" has no
answer. The user proposed: a Home button at the top of the sidebar above
`+` (Calendar and Inbox/Archive already show one) that navigates Home; hovering
it reveals the breadcrumb at the top-left; Nodes and Bits may be placed in
that area, and only while the breadcrumb is shown are the items under it
unavailable; the breadcrumb hides by itself after a few seconds with a fade.
This widens the brief, which kept breadcrumb work out of this topic; the user
opened it.

Advisory review of the proposal (independent view first: a fixed 40px strip
above the Grid, the simplest way to reach zero overlapped cells). The
proposal keeps the Grid full-bleed and reuses the Home button that Calendar
and Inbox/Archive already show (`sidebar.tsx:346`). Five gaps were raised:
(1) the breadcrumb is a drop target (`useDroppable` per segment: drop on an
ancestor to move there); (2) the `Due …` chip under it edits the Node deadline
(`breadcrumb-deadline.tsx`); (3) content shown on hover should stay while
hovered or focused (WCAG 1.4.13), or a click aimed at a segment lands on the
card beneath once it fades; (4) the current location is no longer always
visible; (5) SaaS S23 put the account icon at the very top above `+`.

Breadcrumb round (user, 2026-10-21, sheet `breadcrumb.html`):

- Direction: hidden breadcrumb revealed from a sidebar Home button, with the
  supplements; the blocked-cell machinery goes (zone measurement, the
  `isCellBlocked` checks, `runBreadcrumbZoneMigration`, the `settings`
  markers). Rejected: the fixed strip (smaller Grid, generic header look);
  the proposal without supplements.
- Gap 1: no dwell-on-Home during a drag ("the user cannot predict it"). The
  user's rule: while a Node or Bit is dragged, the breadcrumb is always shown
  and each segment signals that it accepts the drop. Open follow-up: whether
  the cells under the breadcrumb stay droppable during a drag.
- Gap 2: the deadline chip moves into the breadcrumb row (one row).
- Gap 3: the user first answered "do it even against accessibility", while
  the timing answer kept hover/focus persistence; open follow-up.
- Gap 4: show the breadcrumb for 3s after entering a Node, and the tab title
  carries the Node name. The user added: when the breadcrumb hides, it
  animates into the Home button, so the user learns where it went and that
  Home brings it back (like a window minimizing into the macOS Dock).
- Gap 5 / sidebar order: Home at the very top, the account icon right below
  it, both above `+` (amends the S23 wording "at the very top").
- Timing: hides 1s after the pointer and focus leave the Home button and the
  breadcrumb; 3s after entering a Node; a 0.3s fade; reduced motion has no
  fade.
- Toast position (user change to the default): the toast stack sits where
  the breadcrumb appears; while the breadcrumb is shown, the stack sits below
  it. Advisory had proposed a fixed slot under the breadcrumb line.
- Other defaults as proposed: no reveal on L0 (Home shows as the current
  page); the breadcrumb stays in the accessibility tree and focusing it
  reveals it; a deadline picker that is open keeps it shown.

Breadcrumb follow-ups (user, 2026-10-21, sheet `breadcrumb.html` second
version; all advisory recommendations taken):

- A, hover persistence: the breadcrumb stays while the pointer or focus is on
  the Home button or the breadcrumb, and hides 1s after both leave. The
  earlier "even against accessibility" answer is withdrawn. Shown on the sheet:
  with a fixed 3s clock, a click aimed at a segment as it fades lands on the
  card beneath. Rejected: a fixed clock regardless of hover.
- B, drag coverage: during a drag only the segment chips are drop targets;
  the rest of the breadcrumb lets the pointer through to the cells beneath,
  its surface turns translucent and the deadline chip hides, so the top-left
  cells stay droppable. Cost: the part of a cell under a chip is not a drop
  point. Rejected: the whole breadcrumb blocks the cells during a drag (the
  blocked-cell problem would return for drags).
- C, Home animation: the breadcrumb unfolds out of the Home button when shown
  (about 0.26s) and folds into it when hidden (about 0.35s); Home is briefly
  emphasized as it lands. Reduced motion: no movement. Rejected: the fold-in
  only; a plain fade (nothing tells the user where it went).

Round 4 (user, 2026-10-21, sheet `saas.html`; placement only, the looks stay
on the SaaS option sheet per S27 and S40; all advisory recommendations
taken):

- Connection indicator (S27): a small badge on the sidebar account icon, on
  every route; `!` for unstable, a crossed Wi-Fi for offline, in the toast
  warning and error hue families; hover or focus shows the sentence.
  Rejected: a slot at the bottom of the sidebar (shifts the icons below it,
  less seen); a chip at the top-right of the work area (covers Grid cards for
  as long as the state lasts).
- Loading and load-failure screens (S26): the whole window, sidebar included,
  because the sidebar's system-Node items and badges need the snapshot too.
  Rejected: sidebar kept with only the work area covered (a half-empty,
  inert sidebar).
- Session expiry (amends S16): when the refresh fails, the blocking screen
  (the load-failure frame) says the sign-in expired and nothing was lost, and
  offers GitHub and Google sign-in and "Continue as guest"; no guest account
  is created before that choice. Reason: falling back to a guest silently
  creates a new anonymous account with the demo seed (S10, S13), so the
  screen turns into someone else's Grid and reads as data loss. Rejected:
  guest plus an auto-opened account modal (demo data behind the modal, a new
  guest each time); S16 as written.
- Phase 35 MI-14: the last selected Scratch persists per device in
  `triage-preferences-store` (S11 keeps device preferences in browser
  storage); a missing id (deleted Scratch, other account) falls back to the
  first Scratch as today. Rejected: per account on the server (S03, an extra
  column and write function); no change.
- Defaults accepted: unstable and offline are announced once, politely;
  recovery shows nothing on screen (S27) but announces `Back online.` to
  screen readers only; the offline write-attempt toast uses the warning hue
  and the crossed Wi-Fi icon and groups by kind; the failure and expiry
  screens move focus to their first action; a failed background refetch only
  turns the indicator to unstable (S26).

## Open planning questions (resolved 2026-10-21)

All earlier open questions were answered in this session; `DECISION.md` holds
the results:

- Loader display delay and `reconciling`: round 1 (F02).
- Which states change the item look: round 1 (F03).
- Screen readers on success: round 1 (F04).
- Inline editor transient states: round 1 (F05).
- Tooltip precedence and copy: round 2 defaults (F09).
- Compact action controls on a small card: round 2 Q-B, Explorer rows (F07);
  Staging cards have no actions.
- Bit rows: round 2 Q-A (F06).

Option sheets used in this session (scratch files, not kept in the repo):
`index.html` (round 2), `toast.html` (round 3), `breadcrumb.html` (breadcrumb
reveal, two versions), `saas.html` (round 4).

## Discarded alternatives

- Modal opened from the status icon, holding the explanation and actions
  (2026-10-18 direction). Replaced on 2026-10-19 by the tooltip: the user does
  not want a new surface. Actions stay as the existing compact controls; a
  tooltip cannot hold controls.
- Toast for failures whose item disappears (2026-10-18). Replaced by the
  existing Staging alert band, for the same reason.
- Visible success (`DP-VQ02` wash, `✓`, `Added.`), or a success check without
  text (advisory proposal, 2026-10-19). The user chose success as the default
  state with no visible signal.

## Origin

Raised at the Phase 35 Task 176A checkpoint (2026-10-18). The neumorphism Node
card's Unstage line overflowed the 80px card (mi-14). The user proposed
removing the in-card message in favour of icon + modal. The advisory review
kept the line for Phase 35, because removing it now would leave the Stage
projection and integrity cards as bare icons and drop the unknown signal until
a replacement lands.

Widened at the Phase 35 Task 179 Stage 4a checkpoint (2026-10-19). MI-21: at
1024px with the Pool open the shared Breakdown row grid reserves 160px for the
`DP-VQ02` success text and 152px for the actions, leaving the title 0px. The
user asked whether success needs text at all, extended the icon direction to
Breakdown rows and the Add field, replaced the modal with a hover/focus
tooltip, and then dropped visible success entirely.
