# Feedback System — Item Status, Toast, App States and Breadcrumb Reveal

## Metadata

- Created: 2026-10-18
- Updated: 2026-10-21
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
| F05 | The inline editor (Breakdown row edit, Scratch title edit) follows F02–F03: `Unsaved changes.` shows no text (the enabled Save is the signal); `Saving…` and `Checking whether your changes were saved…` become the loader, with Save/Cancel unavailable at once; `Saving before continuing…` becomes the loader plus the existing `Stay here`, the sentence in the tooltip; `Not saved.` becomes `!` plus tooltip; `Offline. Your draft is still here.` is replaced by the offline write-attempt toast (F18); the conflict view stays. |

### Inbox item status

| ID | Decision |
|---|---|
| F06 | One rule for every item-attached Inbox status: icon + emphasis + tooltip. It covers Staging Node cards and Bit rows, Breakdown rows, the Breakdown Add field, the inline editor and Explorer Newly rows. Bit rows use the icon alone like Node cards (no short status line). |
| F07 | Placement per surface. Breakdown row: a 22px status slot before the actions, always reserved so the title does not shift; it replaces the 160px success slot (MI-21, row part). Add field: the icon inside the field at its right end, emphasis on the field, `Retry Add` stays beside Add. Staging Node card: top-right corner. Staging Bit row: at the row end. Explorer Newly rows: the Undo slot becomes the Undo operation's status slot (`↶` → loader → `?` button = Check again → `!` button = Retry); a `!` without an action is an unavailable, focusable button with its tooltip (like the existing unavailable Undo); the slot tooltip adds `Select to check again.` / `Select to try again.`; the row keeps its width. Staging has no recovery controls, as today. |
| F08 | Decision surfaces keep their sentences: the Placement plate, the Archive completion card, the Scratch Trash dialog and the inline-editor conflict view. A failure whose item disappears (a rejected, conflicting or not-applied Stage) keeps the Staging alert band. Inbox status never uses a toast. |
| F09 | Tooltip: shown on hover or keyboard focus of the item (Add field, row grip, Staging card, Explorer status slot); it holds no controls; one tooltip at a time. On a card body the problem tooltip replaces the Task 179A truncated-title tooltip and leads with the full title, unless the sentence already contains it; a control shows only its own tooltip. An item outside the Tab order gets a focusable status element (the Explorer status slot is one). Existing actions stay as compact controls; "drag again" guidance is tooltip text. |
| F10 | Staging Nodes zone (MI-21, Staging part): a minimum width of one Node card, and an auto-fill card grid (one column when two cards do not fit, two as today when they do), shared by all themes. |

### Toast

| ID | Decision |
|---|---|
| F11 | Use a toast only for: (1) a write that failed and was rolled back (S28); (2) a blocked action whose reason is not visible where it was dropped; (3) a result out of view (Trash restore, permanent delete, emptying Trash); (4) a write attempt while offline (S27). Never for Inbox item states (F06–F08), visible successes, problems inside a dialog (the dialog shows them and keeps the input), connection state or recovery, cancels or ordinary drags. Absorbs the toast topic's criteria. |
| F12 | Position: the top-left of the work area, at the row where the breadcrumb appears; while the breadcrumb is shown (F22), the stack sits below it. The stack is rendered outside the breadcrumb. Pages without a breadcrumb use the same top-left anchor. Absorbs the toast topic's "near the breadcrumb" direction. |
| F13 | Bursts: one toast per kind. A repeat of the same kind while it is visible updates its text with a count (`Couldn't save 3 changes. They were put back.`) and restarts its time; different kinds stack, at most three. No separate grouping window. |
| F14 | Success 4s, failure 6s; paused on hover, focus and a hidden tab; failures have a close button. All toasts are polite. Sentence form: what did not happen, then what the screen shows now (`Couldn't move “Venue”. It's back where it was.`). Toast, app-state and blocking copy live in one shared copy module. |
| F15 | Colour stays: the current `richColors` hues (error red, success green, warning amber) are blended into each theme through semantic status tokens, and the icon shape also differs (✓, `!`, crossed Wi-Fi). The user rejected neutral, theme-only toasts ("without colour the states are hard to tell apart"). Per-theme values belong to the theme stage. |
| F16 | Audit of the 20 existing `toast(` calls. Change: the Node/Bit create dialogs show "no empty cell" inside the dialog and keep the typed title, at every level (`grid-runtime.tsx:240`, `:314`; today they close and toast, except a Node at L0). Drop: `Cell reserved by breadcrumb` (`use-dnd.ts:1022`; the blocked cell's droppable is disabled, `grid-view.tsx:65`, and F26 removes the zone). Keep the other 17 (Home full on unhiding a system Node, target Grid full on a drop, descendant move, deadline update failures, Trash restore/delete/empty results), with copy aligned to F14. |

### App states (SaaS)

| ID | Decision |
|---|---|
| F17 | Connection indicator (S27): a small badge on the sidebar account icon, on every route; `!` for unstable, a crossed Wi-Fi for offline, in the F15 warning and error hues; hover or focus shows the sentence. Each change to unstable or offline is announced once, politely. Recovery clears the badge with no visible notice (S27) and announces `Back online.` to screen readers only. A failed background refetch only turns the badge to unstable (S26). |
| F18 | A write attempt while offline changes nothing on screen and shows a warning toast with the crossed Wi-Fi icon (`You're offline. Changes can't be saved right now.`), grouped by F13. |
| F19 | The loading screen and the load-failure screen (S26) cover the whole window, sidebar included. Loading appears after F02 and is exposed as busy to screen readers; failure shows a reason line and Retry; a failed guest creation uses the same screen and retries on reconnect (S26). A failure or expiry screen moves focus to its first action. |
| F20 | Session expiry (amends S16): when the refresh fails, the blocking screen in the load-failure frame says the sign-in expired and nothing was lost, and offers GitHub sign-in, Google sign-in and `Continue as guest`. No guest account is created before that choice. |

### Breadcrumb reveal

| ID | Decision |
|---|---|
| F21 | The breadcrumb is hidden by default and revealed from a Home button at the very top of the sidebar, on every route; the account icon sits right below Home, then `+` (amends the S23 wording "at the very top"). Home navigates to `/`; on L0 it shows as the current page and reveals nothing. |
| F22 | Reveal triggers: hover or keyboard focus on Home or on the breadcrumb; 3s after entering a Node; and always while a Node or Bit is dragged. There is no dwell-on-Home gesture (the user: hard to predict). |
| F23 | Hiding: 1s after the pointer and focus leave both Home and the breadcrumb, with a 0.3s fade; it stays while hovered, focused or while its deadline picker is open; Esc hides it at once; the entry reveal (F22) ends after 3s unless hovered. It unfolds out of the Home button (about 0.26s) and folds into it (about 0.35s), and Home is briefly emphasized as it lands, so the user learns where it went. Reduced motion: no movement. |
| F24 | While shown, the items under it cannot be clicked. During a drag each ancestor segment is a drop target with a visible "drop here" signal (today's ancestor-move confirmation and the Home-for-Bits restriction stay); the rest of the breadcrumb lets the pointer through to the cells beneath, its surface turns translucent and the deadline chip hides, so the top-left cells stay droppable. |
| F25 | One row: the `Due …` deadline chip moves into the breadcrumb row. The breadcrumb stays in the accessibility tree and focusing a segment reveals it. The tab title carries the current Node's name. |
| F26 | No Grid cell is reserved for the breadcrumb. The blocked-zone machinery is removed: the zone measurement and store, the `isCellBlocked` guards in Add, placement and drops, `runBreadcrumbZoneMigration` and its `settings` markers. |

### Inbox selection

| ID | Decision |
|---|---|
| F27 | Phase 35 MI-14: the last selected Scratch persists per device in `triage-preferences-store` (S11 keeps device preferences in browser storage). A saved id that no longer resolves (deleted Scratch, another account) falls back to the first Scratch, as today. |

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

`/craft-docs` applies these together with the canonical edits below.

SaaS entry (`2026-10-21-saas-conversion`):

- S11: the `settings` store and `runBreadcrumbZoneMigration` need no database
  port. No new data can land in a blocked cell during the SaaS phases (the
  client still guards the zone until F26 ships, and S04 discards local data),
  and F26 removes the zone afterwards.
- S16: the session-expiry fallback becomes F20.
- S23: the account icon sits below the Home button (F21).
- S26, S27, S28: the placements, toast rules and timings are F11–F19.

Order with the SaaS phases (S39):

- Phase 47 applies F02 (loading screen, S15 group-3 pending, and the Inbox
  loader if pending flickers, as S28 allows), F11, F13, F14, F17–F20, and the
  F16 copy alignment.
- F17 needs the account icon, which S25 builds in Phase 48; `/craft-docs`
  either moves the icon slot into Phase 47 or lands the badge in Phase 48.
- The feedback implementation after Phase 48 carries everything else: the
  Inbox redesign (F03–F10, MI-21), the toast position and colour blend
  (F12, F15, one move as S28 asks), the create-dialog change (F16), the
  breadcrumb reveal with the Home button and the blocked-zone removal
  (F21–F26), and MI-14 (F27).

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
    zone. The current text says breadcrumb drops are edit-mode-only, while
    `use-dnd.ts` handles them in any mode; check this before writing F24.
  - The toast policy and the app states, shared with the SaaS promotion.
- `docs/SCHEMA.md`: remove `runBreadcrumbZoneMigration` from the `DataStore`
  interface and the `settings` store, together with S11.
- Recipes: Breakdown, Staging, Newly/Undo, Selected Scratch Context (editor
  states), Grid Explorer and Shell/Section chrome, wherever they bind the
  removed lines or the breadcrumb.
- `CLAUDE.md` Architecture 6: name the display delay (presentation only).
- `docs/EXECUTION_PLAN.md`: the Phase 47 additions above and the feedback
  implementation after Phase 48. `docs/issues/Issues_Deferred.md`: bind
  MI-14 and MI-21 to it.
- `2026-04-28-toast-feedback-placement`: merged here (its status line says
  so).

## Left to `/craft-docs` (not blocking)

- Exact new copy: the toast sentences beyond the examples, the counted forms,
  the connection tooltips, and the failure and expiry screens.
- Token names and the per-theme status blends (theme stage).
- The implementation of F24: segment-only drop targets during a drag, the
  stacking order, and the DOM order that lets Tab reach the revealed
  breadcrumb.
- Where the shared feedback copy module lives, and how the badge work splits
  between Phases 47 and 48.

## Current state

- Phase 35 Task 176A (user, 2026-10-18, mi-14) removed the in-card line for
  pending and for a hold from pending. Unknown and reconciling keep the
  ellipsized line.
- Phase 35 keeps `DP-VQ02` as built.
- MI-21 (Breakdown rows and the Staging well too narrow at 1024px with the
  Pool open) and MI-14 are deferred to this topic.
- The app still uses `<Toaster richColors position="bottom-right" />` and the
  fixed top-left breadcrumb with its blocked zone.
