# Feedback System — Item Status, Toast, App States and Breadcrumb Reveal

## Metadata

- Created: 2026-10-18
- Updated: 2026-10-22
- Readiness: code-ready
- Category: interaction reference
- Source project: griddo2-claude
- Source topic: Phase 35 Task 176A checkpoint (`docs/issues/Issues_Phase_35.md`, mi-14); widened at Task 179 Stage 4a (MI-21); settled in the feedback-system session (2026-10-21), which absorbed `2026-04-28-toast-feedback-placement`
- Source prototype: n/a (the session's option sheets were scratch files; renders are described in `NOTES.md`)
- Tags: feedback, staging, breakdown, add, inline-editor, explorer, operation-status, status-icon, tooltip, toast, sonner, connection-state, loading, session-expiry, breadcrumb, sidebar, scratch-selection
- Dependencies: `2026-10-21-saas-conversion` (inputs S09, S15, S16, S23, S26–S28, S39, S40; merge that docs branch first)
- Related: `2026-04-28-toast-feedback-placement` (merged into this topic); `2026-10-20-app-shell-theme-coverage` (breadcrumb, Home button and sidebar skins stay in the theme stage); `2026-10-21-default-theme` (Paper looks for status icons and toast); `2026-07-14-cross-surface-text-capacity-and-overflow`

## Table of Contents

- [Summary](#summary)
- [Decisions](#decisions)
- [Feedback layer table](#feedback-layer-table)
- [Amendments for promotion](#amendments-for-promotion)
- [Left to `/craft-docs` (not blocking)](#left-to-craft-docs-not-blocking)
- [Current state](#current-state)

## Summary

GridDO reports what happens in five layers: nothing when the result is
already visible; the item when a problem belongs to one card, row or field;
one app indicator for the state of the whole app; a toast when the result is
out of view or the item is gone and there is nothing left to do; a blocking
screen when the user cannot continue.

Success shows nothing on screen. Inbox problems show a small icon and
emphasis on their item, with the sentence in a hover/focus tooltip; the
sentences that took the room (`Retur…` on an 80px card, mi-14; the 160px
success slot, MI-21) go. Toasts follow one use rule, appear at the top-left of
the work area and keep their colours blended into each theme. The SaaS states
get fixed places: a badge on the account icon, a whole-window loading and
failure screen, and a blocking screen when the sign-in expires.

The user also opened the breadcrumb: it hides by default and is revealed
from a Home button at the top of the sidebar, so no Grid cell is reserved for
it any more, and the blocked-zone machinery is removed. MI-14 (remember the
last Scratch) is settled here as well.

On 2026-10-22 this topic became a lane of its own: it runs beside SaaS Phases
42–44, closes before Phase 45, and opens with the theme-set reduction (F28).
Its promotion follows the SaaS promotion (SaaS S41). The same review added
F29–F30 and tightened F05, F08, F12, F18, F20, F21 and F23–F26. F31–F32
record two workflow items that running two lanes at once needs. F33 splits
the lane in two at the promotion: Phase 49 before Phase 45, Phase 50 after it.

`NOTES.md` holds the session log, the reasoning and every rejected option.

## Decisions

All decisions: user, 2026-10-21, unless noted. F01 restates the 2026-10-18/19
direction.

### Principles

| ID | Decision |
|---|---|
| F01 | Layers and the rule that picks one: a visible result needs no notice; a problem tied to one item is shown on that item; a state of the whole app is one app indicator; an out-of-view result, or a failure whose item disappeared, with nothing left to do, is a toast; a state that stops the user is a blocking screen. Success shows nothing on screen: no `Added.`, `Returned to Breakdown.` or `Saved.` text, no success check, no success wash (user, 2026-10-19). No new modal or other new surface is added for item status (user, 2026-10-19). |
| F02 | One 300ms display delay app-wide: the Inbox loader, the S26 loading screen and the S15 group-3 pending state. The delay only postpones presentation and never decides success (CLAUDE.md Architecture 6). `reconciling` uses the same delay; during it the item keeps the icon it showed (`?`), and the pressed control (`Check again`) turns unavailable at once as the acknowledgement. |
| F03 | Status icons: loader for `pending` and `reconciling` (after F02), `?` for `unknown`, `!` for not applied, rejected, conflict and integrity states. Only `?` and `!` add item emphasis; the loader is the icon alone; the existing dimming of a locked source row or candidate stays. The icon shape carries the state (not colour alone, WCAG 1.4.1); red stays reserved for destructive actions. Reduced motion: a static loader. |
| F04 | Screen readers: on success a polite, visually hidden `Added.` / `Returned to Breakdown.` / `Saved.` (and the existing success sentences) is announced once. The existing one-time problem announcements stay. The tooltip is the item's description (`aria-describedby`). |
| F05 | The inline editor (Breakdown row edit, Scratch title edit) follows F02–F03: `Unsaved changes.` shows no text (the enabled Save is the signal); `Saving…` and `Checking whether your changes were saved…` become the loader, with Save/Cancel unavailable at once; `Saving before continuing…` becomes the loader plus the existing `Stay here`, the sentence in the tooltip; `Not saved.` becomes `!` plus tooltip; `Offline. Your draft is still here.` is replaced by the offline write-attempt toast (F18), and the draft stays in the editor; the conflict view stays. |

### Inbox item status

| ID | Decision |
|---|---|
| F06 | One rule for every item-attached Inbox status: icon + emphasis + tooltip. It covers Staging Node cards and Bit rows, Breakdown rows, the Breakdown Add field, the inline editor and Explorer Newly rows. Bit rows use the icon alone like Node cards (no short status line). |
| F07 | Placement per surface. Breakdown row: a 22px status slot before the actions, always reserved so the title does not shift; it replaces the 160px success slot (MI-21, row part). Add field: the icon inside the field at its right end, emphasis on the field, `Retry Add` stays beside Add. Staging Node card: top-right corner. Staging Bit row: at the row end. Explorer Newly rows: the Undo slot becomes the Undo operation's status slot (`↶` → loader → `?` button = Check again → `!` button = Retry); a `!` without an action is an unavailable, focusable button with its tooltip (like the existing unavailable Undo); the slot tooltip adds `Select to check again.` / `Select to try again.`; the row keeps its width. Staging has no recovery controls, as today. |
| F08 | Decision surfaces keep their sentences: the Placement plate, the Archive completion card, the Scratch Trash dialog and the inline-editor conflict view. A failure whose item disappears (a rejected, conflicting or not-applied Stage) keeps the Staging alert band. Inbox status never uses a toast. A write attempt while offline is an app state, not an item status, so F18 applies in the Inbox too (2026-10-22). |
| F09 | Tooltip: shown on hover or keyboard focus of the item (Add field, row grip, Staging card, Explorer status slot); it holds no controls; one tooltip at a time. On a card body the problem tooltip replaces the Task 179A truncated-title tooltip and leads with the full title, unless the sentence already contains it; a control shows only its own tooltip. An item outside the Tab order gets a focusable status element (the Explorer status slot is one). Existing actions stay as compact controls; "drag again" guidance is tooltip text. |
| F10 | Staging Nodes zone (MI-21, Staging part): a minimum width of one Node card, and an auto-fill card grid (one column when two cards do not fit, two as today when they do), shared by all themes. |

### Toast

| ID | Decision |
|---|---|
| F11 | Use a toast only for: (1) a write that failed and was rolled back (S28); (2) a blocked action whose reason is not visible where it was dropped; (3) a result out of view (Trash restore, permanent delete, emptying Trash); (4) a write attempt while offline (S27). Never for Inbox item states (F06–F08), visible successes, problems inside a dialog (the dialog shows them and keeps the input), connection state or recovery, cancels or ordinary drags. Absorbs the toast topic's criteria. |
| F12 | Position: the top-left of the work area, at the row where the breadcrumb appears; while the breadcrumb is shown (F22), the stack sits below it. The stack is rendered outside the breadcrumb. Pages without a breadcrumb use the same top-left anchor. During a Node or Bit drag the stack turns translucent and lets the pointer through, as the breadcrumb does (F24), so the top-left cells stay droppable (2026-10-22). Absorbs the toast topic's "near the breadcrumb" direction. |
| F13 | Bursts: one toast per kind. A repeat of the same kind while it is visible updates its text with a count (`Couldn't save 3 changes. They were put back.`) and restarts its time; different kinds stack, at most three. No separate grouping window. |
| F14 | Success 4s, failure 6s; paused on hover, focus and a hidden tab; failures have a close button. All toasts are polite. Sentence form: what did not happen, then what the screen shows now (`Couldn't move “Venue”. It's back where it was.`). Toast, app-state and blocking copy live in one shared copy module. |
| F15 | Colour stays: the current `richColors` hues (error red, success green, warning amber) are blended into each theme through semantic status tokens, and the icon shape also differs (✓, `!`, crossed Wi-Fi). The user rejected neutral, theme-only toasts ("without colour the states are hard to tell apart"). Per-theme values belong to the theme stage. |
| F16 | Audit of the 20 existing `toast(` calls. Change: the Node/Bit create dialogs show "no empty cell" inside the dialog and keep the typed title, at every level (`grid-runtime.tsx:240`, `:314`; today they close and toast, except a Node at L0). Drop: `Cell reserved by breadcrumb` (`use-dnd.ts:1022`; the blocked cell's droppable is disabled, `grid-view.tsx:65`, and F26 removes the zone). Keep the other 17 (Home full on unhiding a system Node, target Grid full on a drop, descendant move, deadline update failures, Trash restore/delete/empty results), with copy aligned to F14. |

### App states (SaaS)

| ID | Decision |
|---|---|
| F17 | Connection indicator (S27): a small badge on the sidebar account icon, on every route; `!` for unstable, a crossed Wi-Fi for offline, in the F15 warning and error hues; hover or focus shows the sentence. Each change to unstable or offline is announced once, politely. Recovery clears the badge with no visible notice (S27) and announces `Back online.` to screen readers only. A failed background refetch only turns the badge to unstable (S26). |
| F18 | A write attempt while offline, on any surface including the Inbox (F08), changes nothing on screen, keeps what the user typed (the Add field text, an editor draft) and shows a warning toast with the crossed Wi-Fi icon (`You're offline. Changes can't be saved right now.`), grouped by F13. |
| F19 | The loading screen and the load-failure screen (S26) cover the whole window, sidebar included. Loading appears after F02 and is exposed as busy to screen readers; failure shows a reason line and Retry; a failed guest creation uses the same screen and retries on reconnect (S26). A failure or expiry screen moves focus to its first action. |
| F20 | Session expiry (amends S16): when the refresh fails, the blocking screen in the load-failure frame says the sign-in expired and nothing was lost, and offers GitHub sign-in, Google sign-in and `Continue as guest`. No guest account is created before that choice. The copy for a real account and the guest variant, and the screen before OAuth exists, follow SaaS S43 (2) (2026-10-22). |

### Breadcrumb reveal

| ID | Decision |
|---|---|
| F21 | The breadcrumb is hidden by default and revealed from a Home button at the very top of the sidebar, on every route; the account icon sits right below Home, then `+` (amends the S23 wording "at the very top"). Home navigates to `/`; on L0 it shows as the current page and reveals nothing, and on pages without a breadcrumb (Inbox, Archive, Calendar, Trash) hovering it reveals nothing (2026-10-22). |
| F22 | Reveal triggers: hover or keyboard focus on Home or on the breadcrumb; 3s after entering a Node; and always while a Node or Bit is dragged. There is no dwell-on-Home gesture (the user: hard to predict). |
| F23 | Hiding: 1s after the pointer and focus leave both Home and the breadcrumb, with a 0.3s fade; it stays while hovered, focused or while its deadline picker is open; Esc hides it at once when nothing above it is open (Esc closes the top-most layer first: a dialog, the Bit popup or the palette, then the deadline picker, then the breadcrumb; during a drag Esc only cancels the drag; 2026-10-22); the entry reveal (F22) ends after 3s unless hovered. It unfolds out of the Home button (about 0.26s) and folds into it (about 0.35s), and Home is briefly emphasized as it lands, so the user learns where it went. Reduced motion: no movement. |
| F24 | While shown, only its segments and the deadline chip take the pointer; the rest of the bar lets the pointer through, so a card under it stays clickable, and "hovered" in F23 means a segment or the chip (amended 2026-10-22: a pointer moving from Home to a top-left card, and the 3s entry reveal, would otherwise block those cards). During a drag each ancestor segment is a drop target with a visible "drop here" signal (today's ancestor-move confirmation and the Home-for-Bits restriction stay); the rest of the breadcrumb lets the pointer through to the cells beneath, its surface turns translucent and the deadline chip hides, so the top-left cells stay droppable. |
| F25 | One row: the `Due …` deadline chip moves into the breadcrumb row. The breadcrumb stays in the accessibility tree and focusing a segment reveals it. The tab title carries the current Node's name. The current Node's deadline is therefore visible only while the breadcrumb is shown (3s on entry, on hover or focus); accepted, and rechecked at the feedback lane's checkpoint (2026-10-22). |
| F26 | No Grid cell is reserved for the breadcrumb. The blocked-zone machinery is removed: the zone measurement and store, the `isCellBlocked` guards in Add, placement and drops, `runBreadcrumbZoneMigration` and its `settings` markers. The lane stops using `settings` without bumping the Dexie schema version; Dexie itself goes in SaaS Phase 46 (2026-10-22). |

### Inbox selection

| ID | Decision |
|---|---|
| F27 | Phase 35 MI-14: the last selected Scratch persists per device in `triage-preferences-store` (S11 keeps device preferences in browser storage). A saved id that no longer resolves (deleted Scratch, another account) falls back to the first Scratch, as today. |

### Lane scope (2026-10-22)

| ID | Decision |
|---|---|
| F28 | Theme-set reduction (Phase 35 MI-13; final set in SaaS S40). The lane's first task removes `tiny-desk`, `origami`, `terminal` and `graphite`: from the picker and `COLOR_THEMES`, from the no-flash script (fixing its duplicated list, ISSUE-20-01), and their CSS, the fonts only they use, the tests that enumerate them and the documents that list eight themes (CLAUDE.md Architecture 8, `docs/DESIGN_TOKENS.md`). A persisted removed id falls back to the default through the existing validation. `griddo` stays the default until Paper ships in the theme stage. Phases 36–40 (Tasks 180–208) are retired as superseded. Their deferred items are rebound: Phase 41 MI-2 (Terminal) is proposed Dropped for the user to close; P29-01 and Phase 34 MI-6 go to the theme stage (`2026-10-17-theme-scope-replan`). From this task on, no test or check covers the removed themes. (user, 2026-10-20/22) |
| F29 | Theme scope of the lane. The new surfaces (status icon, emphasis and tooltip, toast status blend, Home button, breadcrumb reveal) are built on semantic tokens. Checkpoints check `griddo`, `retro-mac` and `neumorphism` for correct rendering and `claymorphism` only for not breaking. The per-theme finishing of these surfaces for `retro-mac` and `neumorphism`, and all of Paper and Claymorphism, belong to the theme stage (`2026-10-17-theme-scope-replan`). (user, 2026-10-22) |
| F30 | A development-only state switch forces each status state (delayed pending, reconciling, unknown, not applied, rejected, conflict, integrity, offline), so every state can be judged in the running app without inserted markup; locally an Inbox command ends in about 50ms, so these states do not appear on their own. SaaS Phase 47 reuses the switch for its network states. It never ships enabled. (user, 2026-10-22) |
| F31 | Browser isolation for two lanes. `.mcp.json` starts the Playwright MCP server with `--isolated`, so a session of each lane can open its own browser at the same time. The profile lives in memory and is gone when the session ends; checks seed again through `scripts/dev-fixtures/inbox-triage.js`. A worktree branched before promotion ② (Phase 42) keeps the shared profile, which is safe while only one session uses it. Promotion ② makes the change. (user, 2026-10-22; parallel-lanes note §8 item 4) |
| F32 | Phase waits. `docs/WORKFLOW.md` and `CLAUDE.md` state that a phase waits only for the phases its plan entry lists; a phase that waits for none says so; a phase that states nothing waits for every phase before it in plan order. This matches the applied `/run-phase` and `/end-phase` change (claude-workflow `b2b7671`, `6044e30`). Promotion ② makes the change. (user, 2026-10-22; parallel-lanes note §8 item 5) |
| F33 | Lane split (amends S41's "closes before Phase 45" and the order below). Phase 49 (Tasks 241–244) holds what the SaaS phases need first: the theme-set reduction (F28), the visual decision `DP-FB-01` together with SaaS `DP-SAAS-01`, the shared status primitives (F02 delay, F03 loader and icons, F09 tooltip, F15 status hues, F30 switch), and the toast position, colour and create-dialog change (F12, F15, F16). It waits for no phase and runs beside Phases 42–44. Phase 50 (Tasks 245–250) holds the Inbox status redesign (F01, F04–F10, MI-21), the Home button and breadcrumb reveal (F21–F25), the blocked-zone removal (F26, together with the reveal so the fixed breadcrumb never covers top-left cards) and MI-14 (F27). It waits for Phases 49 and 45, runs beside Phases 46–48, does not block launch and closes before the theme stage; after Phase 45 it uses local Supabase without reset or migrations. Phases 45 and 47 wait for Phase 49 only, and Phase 45 uses the S43 (4) fallback. Task 234 puts the account icon below Home if F21 has landed, otherwise at the top, and Phase 50 puts Home above it. Task 225 shrinks to confirming the recorded `DP-SAAS-01`. (user, 2026-10-22) |

## Feedback layer table

Copy owners: "Inbox" is `src/lib/copy/inbox-triage.ts` with the Inbox
recipes; "Feedback" is the shared copy module of F14 (its name is set at
`/craft-docs`). Timing starts when the event happens.

| Event | Layer | What shows | Copy owner | Timing | Screen reader |
|---|---|---|---|---|---|
| Inbox command pending (Add, Delete, Save, Stage, Unstage, Undo) | Item | Loader on the item; locks and dimming as today | Inbox | After 300ms | Existing one-time polite pending announcement where it exists |
| Inbox command succeeded | None | The visible result | Inbox | — | Polite hidden `Added.` / `Returned to Breakdown.` / `Saved.` (F04) |
| Inbox outcome unknown | Item | `?`, emphasis, tooltip; `Check again` where it exists | Inbox | At once | Existing one-time announcement; tooltip as description |
| Inbox reconciling | Item | Keeps `?`, loader after the delay; pressed control unavailable at once | Inbox | 300ms | Existing |
| Inbox not applied, rejected, conflict or integrity (item remains) | Item | `!`, emphasis, tooltip; `Retry Add` / `Retry` where it exists | Inbox | At once | Existing |
| Inbox failure whose item disappears (Stage) | Item area | Existing Staging alert band | Inbox | At once | Existing |
| Placement, Archive, Scratch Trash, editor conflict | Decision surface | Sentences as today (F08) | Inbox | As today | As today |
| Ordinary write succeeded (S15 groups 1–2) | None | The change itself | — | — | — |
| Ordinary write failed and rolled back (S15, S16) | Toast (error) | One toast per kind, counted | Feedback | At once, 6s | Polite |
| Ordinary write with no answer in 15s (S16, S26) | None, then toast | Refetch; nothing if kept, the failure toast if rolled back | Feedback | After the refetch | Polite |
| Server-confirmed write pending (S15 group 3: permanent delete, empty Trash, restore, promotion) | Item | Loader on the control or row that started it | Feedback | After 300ms | Busy state on that control |
| Trash restore, permanent delete, empty Trash succeeded | Toast (success) | Kept toasts (F16) | Feedback | 4s | Polite |
| Drop blocked: target Grid full, descendant move | Toast (error) | Kept toasts (F16) | Feedback | 6s | Polite |
| Home full when unhiding a system Node | Toast (error) | Kept toast (F16) | Feedback | 6s | Polite |
| Create dialog with no empty cell | Dialog | Inline error, typed title kept (F16) | Feedback | At once | The dialog's error association |
| Initial load slower than 300ms | Blocking | Whole-window loading screen (F19) | Feedback | After 300ms | Busy status |
| Initial load failed, guest creation failed | Blocking | Reason line and Retry (F19) | Feedback | At once | Focus to Retry |
| Session refresh failed | Blocking | Sign-in expired screen (F20) | Feedback | At once | Focus to the first action |
| Connection unstable or offline | App | Badge on the account icon, tooltip (F17) | Feedback | At the state change | Polite, once per change |
| Connection recovered | None | Badge clears | Feedback | At once | Screen-reader-only `Back online.` |
| Write attempt while offline | Toast (warning) | Nothing changes on screen (F18) | Feedback | At once, 6s, grouped | Polite |
| Background refetch failed (S17, S26) | App | Badge turns unstable | Feedback | At once | Polite, once |

## Amendments for promotion

The promotion is split (SaaS S41). Promotion ① (the SaaS entry) applies the
SaaS-entry amendments below and the Phase 47 rows (F02, F11, F13, F14, the
F16 copy alignment, F17–F20). Promotion ② (this topic, after ① has merged)
applies everything else, with the canonical edits below.

SaaS entry (`2026-10-21-saas-conversion`; ① applies these through S41–S43):

- S11: the `settings` store and `runBreadcrumbZoneMigration` need no database
  port. No new data can land in a blocked cell during the SaaS phases (the
  client still guards the zone until F26 ships, and S04 discards local data),
  and F26 removes the zone afterwards.
- S16: the session-expiry fallback becomes F20.
- S23: the account icon sits below the Home button (F21).
- S26, S27, S28: the placements, toast rules and timings are F11–F19.

Order with the SaaS phases (S39, amended by S41):

- Phase 47 applies F02 (loading screen, S15 group-3 pending, and the Inbox
  loader if pending flickers, as S28 allows), F11, F13, F14, F17–F20, and the
  F16 copy alignment.
- F17's account icon slot is built in Phase 47; Phase 48 adds the modal
  (SaaS S43 (1)).
- The feedback lane runs beside Phases 42–44 and closes before Phase 45
  (S41; split into Phases 49 and 50 by F33). It carries the theme-set reduction (F28) first, then everything
  else: the Inbox redesign (F03–F10, MI-21), the toast position and colour
  blend (F12, F15, one move as S28 asks), the create-dialog change (F16), the
  breadcrumb reveal with the Home button and the blocked-zone removal
  (F21–F26), MI-14 (F27) and the state switch (F30).

Canonical documents to amend:

- `docs/DESIGN_TOKENS.md`:
  - Retire `DP-VQ02` and the `breakdown-success-*` roles.
  - Amend `DP-VQ06-STAGING`: the in-card line becomes icon and tooltip, the
    loader is allowed after the delay, the alert band stays.
  - Amend `DP-VQ10` and the Ordinary Finder Newly/Undo amendment: the Undo
    slot becomes the status slot, replacing the status rail and text recovery
    actions.
  - Add status icon, emphasis and tooltip roles; semantic toast status tokens;
    the Home button and breadcrumb reveal roles. Their per-theme finishing
    belongs to the theme stage.
  - Add the connection badge and the loading, failure and expiry screens,
    with their looks chosen on the SaaS option sheet (S27, S40).
- `docs/SPEC.md`:
  - The Durable Staging hold wording about the in-card line; the Breakdown
    and Add reliability lines; the inline editor states; Scratch Pool
    "Selection and re-entry" (F27).
  - Grid layouts and DnD: the breadcrumb reveal, the Home button, no blocked
    zone. The current text (`docs/SPEC.md:225`, `:1237`) says breadcrumb
    drops are edit-mode-only. Checked 2026-10-22: Phase 9 (`16ee48f`,
    2026-04-10, ancestor policy) removed that gate on purpose and kept only
    "no Bit on Home" (`breadcrumbs.tsx:31`); the code and F24 allow drops in
    any mode, so the SPEC text is corrected, not the code.
  - The toast policy and the app states, shared with the SaaS promotion.
- `docs/SCHEMA.md`: remove `runBreadcrumbZoneMigration` from the `DataStore`
  interface and the `settings` store, together with S11.
- Recipes: Breakdown, Staging, Newly/Undo, Selected Scratch Context (editor
  states), Grid Explorer and Shell/Section chrome, wherever they bind the
  removed lines or the breadcrumb.
- `CLAUDE.md` Architecture 6: name the display delay (presentation only).
- `docs/EXECUTION_PLAN.md`: the feedback lane phase, numbered after Phase 48
  and run before Phase 45 (F28 first, then the rest), stating that it waits
  for no phase (beside Phases 42–44); under F33, Phases 49 and 50 with their
  waits; the retirement of Phases 36–40 (F28).
- `.mcp.json` (F31); `docs/WORKFLOW.md` and `CLAUDE.md` §Workflow (F32). `docs/issues/Issues_Deferred.md`: bind MI-14 and MI-21
  to the lane, rebind MI-13, P29-01, Phase 34 MI-6 and Phase 41 MI-2 per F28.
- `CLAUDE.md` Architecture 8 and `docs/DESIGN_TOKENS.md` §Color Theme System:
  four themes in the picker (F28).
- `2026-04-28-toast-feedback-placement`: merged here (its status line says
  so).

## Left to `/craft-docs` (not blocking)

- Exact new copy: the toast sentences beyond the examples, the counted forms,
  the connection tooltips, and the failure and expiry screens.
- Token names and the per-theme status blends (theme stage).
- The implementation of F24: segment-only drop targets during a drag, the
  stacking order, and the DOM order that lets Tab reach the revealed
  breadcrumb.
- Where the shared feedback copy module lives.

## Current state

- Phase 35 Task 176A (user, 2026-10-18, mi-14) removed the in-card line for
  pending and for a hold from pending. Unknown and reconciling keep the
  ellipsized line.
- Phase 35 keeps `DP-VQ02` as built.
- MI-21 (Breakdown rows and the Staging well too narrow at 1024px with the
  Pool open) and MI-14 are deferred to this topic.
- The app still uses `<Toaster richColors position="bottom-right" />` and the
  fixed top-left breadcrumb with its blocked zone.
