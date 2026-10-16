# Inbox/Triage Breakdown Rows And Empty States — Visual Recipe

> Status: **Proposed — recipe-package user gate pending**
> Verification: **source-only except the exact-source `DP-VQ04` fixed-editor evidence recorded in `docs/verification/inbox-triage/task-138.md`**
> Production owner: `BreakdownPanel` row list and Add surface (`LAND-BREAKDOWN`, `LAND-THEME`)

## Authority And Source Regions

- Product authority: [`DECISION.md`](../brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/DECISION.md) lines 298–361 and 467–519.
- Approved boundary: [`PROMOTION_MAP.md`](../brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/PROMOTION_MAP.md) §§10.1, 11.2, and 11.3.
- Design Source root: `/Users/jwk/Documents/griddo2-claude-themes2-3`.
- Row/input/empty subregions are inside GridDO `page.tsx:1128-1380`; Tiny Desk `:1402-1550`; Neumorphism `:1040-1280`; Claymorphism `:943-1189`; Origami `:1402-1601`; Terminal `:944-1204`; Retro Mac `:992-1241`; Graphite `:1103-1350` at that root.

## Shared Adopted Contract

- Active rows show content, grip-only drag, and always-visible Edit/Trash. Row numbering and date/time text are absent.
- Staged rows remain in place, de-emphasized and disabled without a strike-through. Placed/consumed rows leave the active list; durable consumed truth remains outside this visual recipe.
- Add has an explicit control plus Enter path and a stable input surface. Blur behavior, persistence, focus, and mutation reliability remain product/SPEC concerns.
- Distinguish never-had-a-row, all-deleted-without-consumption, and consumed completion. An ordinary empty list is not a blank canvas and is not archive completion.
- Scrollbar chrome is hidden while ordinary input scrolling remains.

## Decision-Prerequisite Boundary

- `VQ-02` — **resolved by `DP-VQ02` on 2026-08-09.** The user selected Choice A, the row-attached confirmation wash/check/text signal specified below. Task 148 is its only realization edge; successful Unstage still has no toast.
- `VQ-03` — **resolved by `DP-VQ03` on 2026-08-09.** The user selected Choice A, the Add-adjacent inline decision sheet specified below. Task 140 is its only realization edge; Task 139 remains headless and native unload remains browser-owned.
- `VQ-05` — **resolved by `DP-VQ05` on 2026-08-09.** The user selected Choice A, the Add-region and source-row-attached reliability system specified below. Task 143 is its only realization edge; Task 136 remains the headless owner.
- `VQ-11` — **resolved by `DP-VQ11` on 2026-08-11.** The user selected Choice A: attach the Add-draft blocker to the Add region and place actual eligibility-withdrawal status in the vacated Breakdown completion slot. Task 160 is the only realization edge after Task 118 checkpoint acceptance.
- `VQ-04` — **resolved by `DP-VQ04` on 2026-08-09.** The user selected Choice A, the direct in-place Scratch-title and Breakdown-content editor system. This recipe owns the Breakdown-row half specified below; Task 138 is the only realization edge and Task 137 remains headless.

## `DP-VQ11` Approved Add Blocker And Withdrawal Slot

Choice A keeps each reason beside the surface that can resolve it. A page-local
Add draft uses the Add region; a persisted eligibility loss after completion
was presented uses the same Breakdown completion slot from which the overlay,
complete prompt, or Reopen control was withdrawn. Neither state replaces an
ordinary empty state or creates a toast, dialog, page-global banner, detached
status panel, or automatic action.

### Non-Empty Add Draft Blocker

- Render one static status line immediately below the stable Add field/control
  row and inside the same Add region. Use exact copy:
  `Add this idea or clear the draft to complete this Scratch.`
- Show it only when the selected active Scratch satisfies persisted Archive
  eligibility and the page-local Add draft is non-empty. Keep the draft, input,
  Add control, and any `DP-VQ05` reliability state unchanged. When both status
  families are present, the operation/reliability sentence stays first and the
  completion-blocker sentence follows in the same source-attached status area.
- Add no new completion button. The existing Add path and ordinary text-editing
  path are the only resolution controls; clearing text is not a synthetic
  `Clear` command. Never submit, clear, blur-submit, discard, persist, or move
  focus on behalf of completion.
- Associate the blocker with the Add input and announce it politely/atomically
  only when the blocker first becomes current. Do not announce each keystroke.
  Focus remains in the Add input or at the current user-owned destination.
- Keep the blocker without a timer until the draft becomes empty, the Scratch
  changes, persisted eligibility changes, or the Inbox page exits/reloads/
  unmounts. If the draft becomes empty and eligibility is still true, remove
  the line and let Task 159 perform its current-truth completion transition.

### Actual Eligibility Withdrawal

This status is not an Add/title blocker. It appears only after the mounted page
had displayed the completion overlay, complete Context, or Reopen control and
current persisted truth then becomes ineligible because an active Breakdown
row or staged candidate exists. Remove the overlay/scrim, complete Context, and
Reopen control first, reveal current work, and place one persistent status at
the vacated Breakdown completion slot using the narrow matching copy:

| Current persisted cause | Exact visible copy |
|---|---|
| One or more active Breakdown rows, no staged candidate | `Completion is no longer available because a Breakdown item is active.` |
| No active Breakdown row, one or more staged candidates | `Completion is no longer available because an item is in Staging.` |
| Both causes | `Completion is no longer available because Breakdown and Staging have active items.` |

Use the actual aggregate cause, never a stale operation guess. If the selected
Scratch becomes archived/deleted/inactive, do not show this status: the
canonical workspace-exit owner removes the stale Scratch surface. Never keep a
disabled stale Archive control, wait for eligibility to return, or archive from
the old completion snapshot.

### Withdrawal Focus, Recovery, Accessibility, And Motion

- A local Add/restore/Stage action keeps its canonical focus. A remote cause
  never steals focus. If eligibility loss removes the currently focused
  Archive, Cancel, or Reopen control, move focus to the surviving Breakdown
  heading; otherwise preserve current focus.
- Use a visible static non-color status mark plus the exact sentence in one
  polite atomic status. Announce only a new cause or changed cause, not every
  subscription update or rerender.
- Persist the status while that same selected active Scratch remains
  ineligible in the mounted page. Scratch switch, route exit, reload, or
  unmount clears it; return/re-entry does not reconstruct an old withdrawal.
- When persisted truth becomes eligible again, remove the withdrawal status
  immediately and let Task 159's current mounted-page transition own overlay/
  complete/reopen and its readiness announcement. Add no separate timer,
  dismissal, Retry, or `Completion restored` state.
- All blocker, withdrawal, removal, and focus changes are immediate/static.
  Reduced motion is identical; no fade, slide, scale, blur transition,
  skeleton, shimmer, spinner, pulse, blink, bounce, or layout animation.

### Eight-Theme Mapping

The Add blocker stays in the Add region and withdrawal stays in the completion
slot in every theme. Product logic and copy never branch on theme ID:

| Theme | Add blocker / withdrawal realization |
|---|---|
| GridDO | Ruled technical Add status / compact ruled completion-slot status with a static warning mark |
| Tiny Desk | Same-paper Add annotation / pinned filing-status note in the completion slot |
| Neumorphism | Inset Add reason trough / inset completion-status trough without a new floating card |
| Claymorphism | Sculpted Add ribbon / stable completion-status ribbon with tactile non-color mark |
| Origami | Seam-bound Add note / folded completion-slot notice with no animated fold |
| Terminal | `[completion blocked]` Add record / `[completion withdrawn]` status plus exact copy, no blink |
| Retro Mac | 1-bit Add system line / hard in-section completion status preserving current focus inversion |
| Graphite | Editorial Add caption / strengthened-rule completion notice with precise focus outline |

## `DP-VQ02` Approved Add/Unstage Success Signal

`DP-VQ02` gives authoritative Add and Unstage success one shared, non-repeating
row signal. It never substitutes a toast, Newly marker, repeated animation, or
generic global status.

### Trigger And Identity

- Trigger only when the mounted Inbox page first observes terminal success for
  a locally initiated Add or Unstage operation. Direct `applied` and the first
  `already_applied` confirmation of that still-current operation qualify.
- The signal identity is `{operation kind, operationId, target Breakdown row
  ID}`. Add targets the newly committed row; Unstage targets the restored
  source row. Remember signaled identities only for the current Inbox page
  mount.
- Do not trigger from hydration, reload, a remote/other-tab row, rerender, a
  previously observed terminal result, or `already_applied` without the
  current local operation identity. Reconciliation may trigger once when it
  first supplies authority; replay of that result never repeats it.

### Placement, Copy, And Timeline

- Keep the target row's height, content, grip, and Edit/Trash positions stable.
  Apply `success` to the complete row surface and use one non-interactive
  trailing status slot immediately before the action cluster. The slot is
  reserved in the row grid so its appearance creates no layout shift.
- At `0ms`, show an `aria-hidden="true"` `✓` followed by exact visible copy:
  `Added.` for Add or `Returned to Breakdown.` for Unstage. The same text is
  the sole polite, atomic status announcement.
- At `0ms`, place the row background and border at the theme's approved success
  emphasis, then transition both back to the ordinary active-row values over
  `600ms` with CSS `ease-out`. Do not transform, scale, sparkle, pulse, blink,
  bounce, spin, flicker, or move any content.
- Keep `✓ Added.` or `✓ Returned to Breakdown.` statically visible through
  `1600ms`, then remove the status and `success` state without an exit
  animation. The wash and status do not replay after rerender.

### Interruption, Retrigger, Focus, And Reduced Motion

- If a different qualifying success arrives before `1600ms`, clear the prior
  row immediately and start one fresh `0ms` timeline on the new target. The
  same identity is ignored.
- Scratch switch, Inbox route exit, or page unmount clears the active signal
  and its remembered identities; reload never reconstructs or replays it.
  Theme/light-dark changes preserve the current target and remaining time and
  never retrigger the signal.
- Add keeps focus in the Add input. Unstage keeps the canonical restored-source
  focus. The status is not focusable, never steals focus, and uses
  `role="status"`, `aria-live="polite"`, and `aria-atomic="true"` once per new
  identity.
- Under `prefers-reduced-motion: reduce`, skip the 600ms transition entirely.
  Apply the theme's static success border/surface distinction immediately and
  keep it with the same `✓` and copy for `1600ms`; then remove all success
  treatment in one step. This is the equivalent success state, not a shorter
  or color-only fallback.

### Eight-Theme Mapping

All themes keep the same row geometry, `✓`, exact copy, `600ms`/`1600ms`
timeline, focus, and announcement contract:

| Theme | Exact realization mapping |
|---|---|
| GridDO | Primary-tinted semantic row surface and border wash with canonical text/focus roles. |
| Tiny Desk | Paper-row highlight and stationery check-stamp treatment, returning to the ordinary paper row. |
| Neumorphism | Named raised success surface/shadow emphasis returning to the ordinary row shadow; reduced motion uses a static raised border/surface distinction. |
| Claymorphism | Shape-preserving glossy success wash and raised check treatment with no scale or bounce. |
| Origami | Paper highlight plus emphasized seam/fold edge returning to the ordinary row paper. |
| Terminal | Variable-driven record/background and border emphasis with the same literal `✓` and copy; no fixed terminal color in JSX. |
| Retro Mac | 1-bit selected-style surface/border emphasis and hard check treatment, without blink or inversion cycling. |
| Graphite | Restrained grayscale row wash and strengthened editorial rule returning to the ordinary row. |

Theme IDs never branch trigger logic or copy, and successful Unstage remains
row-local with no toast.

## `DP-VQ03` Approved Add-Draft Departure Sheet

`DP-VQ03` gives an app-internal Scratch/path/route departure with a non-empty
Add draft one dedicated decision sheet beside the source draft. It is not a
generic confirmation, delete/archive dialog, page-centered modal, toast, or
browser-unload replacement.

### Trigger, Ordering, And Placement

- Open only for an app-internal Scratch switch, Inbox path change, or route
  departure that would leave a non-empty Add draft. Same-Scratch work does not
  trigger the sheet. Any dirty inline Save resolves first; an unresolved Save
  never opens or bypasses this decision.
- Browser reload, tab close, and other native unload use only the browser's
  native guard. They never render, reconstruct, or reuse this sheet.
- Render `breakdown-departure-sheet` in normal document flow immediately below
  the complete Add input/control row, aligned to that row's left and right
  edges inside the Breakdown Add region. It pushes following Breakdown content
  down; it never uses a portal, scrim, page center, toast lane, row action slot,
  or borrowed dialog/card chrome.
- Keep the non-empty draft visible in the Add input above the sheet. While the
  decision is open, only its two actions are operable; no backdrop, close icon,
  or outside click dismisses it.

### Exact Copy And Action Hierarchy

- Eyebrow: `Unsaved Add draft`
- Heading: `Keep writing?`
- Supporting copy: `Continue writing here, or discard this draft and move.`
- Primary/default action: `Continue writing`
- Destructive secondary action: `Discard and move`
- Do not interpolate a destination name, Scratch title, route, countdown, or
  draft excerpt. The latest destination remains headless state, so a replaced
  destination cannot leave stale visible copy.

### Focus, Keyboard, And Lifecycle

- Use a dedicated labelled and described decision surface with alert-dialog
  semantics. On open, focus `Continue writing`; contain sequential focus within
  the two actions while the rest of the current workspace is inert.
- `Continue writing` and `Escape` both close the sheet without changing the
  draft and restore focus to the Add input at its prior caret/selection.
  `Enter` activates only the focused action; it never defaults to discard.
- `Discard and move` clears only the Add draft, performs the latest captured
  internal destination once, and lets that destination's canonical focus rule
  own the result. It has no extra confirmation or undo promise.
- If the headless owner replaces the pending destination before a decision,
  keep one sheet and the same copy/focus; discard consumes only the latest
  destination once. Theme or light/dark changes swap visual aliases without
  closing, retriggering, or moving focus.
- The sheet appears and clears without animation. Reduced motion uses the same
  static surface, copy, hierarchy, focus, and lifecycle; it is not a diminished
  or color-only fallback.

### Eight-Theme Mapping

Every theme keeps the same in-flow position, exact copy, two-action order,
alert-dialog semantics, and no-motion contract. Mappings use canonical theme
families only and do not copy prototype literals or adjacent UI:

| Theme | Exact realization mapping |
|---|---|
| GridDO | Restrained semantic panel surface and border, compact technical eyebrow, primary Continue control, and destructive text-secondary discard. |
| Tiny Desk | Attached paper decision slip with ruled separation and stationery actions; it remains an Add-region sheet, not a loose modal note. |
| Neumorphism | Inset decision well with raised primary control and clearly separate destructive secondary treatment, without floating overlay depth. |
| Claymorphism | Shape-preserving inset sheet with one raised primary action and restrained destructive secondary, without scale or bounce. |
| Origami | Inline folded-paper strip with seam hierarchy and asymmetric primary/secondary folds, never a detached dialog card. |
| Terminal | Variable-driven inline command block with exact copy and bracketed action treatment; no fixed color or blinking cursor/status effect. |
| Retro Mac | In-flow 1-bit decision pane with hard border and default-button distinction; no window title bar, draggable dialog, or inversion cycling. Exact realization in the Phase 41 supplement below. |
| Graphite | Inline editorial note bounded by a strengthened rule, with solid primary and text-led destructive secondary actions. |

Theme IDs never branch trigger logic, copy, action order, or focus behavior.

### Phase 41 Retro Mac realization (2026-10-15, DECISION H13–H14)

The sheet takes the visual family of the Retro Mac Archive alert while keeping
every rule above: in-flow position under the Add row, exact copy, action
order, alert-dialog semantics, focus and no motion.

- Surface: background fill, `4px` double foreground border, radius `0`,
  `6px 6px 0` foreground hard shadow (kept inside the Breakdown region
  without clipping), the Context font, and a two-column layout: a `40px`
  square `2px`-bordered `!` mark, then eyebrow, heading, description and
  actions.
- Eyebrow small bold uppercase-tracked like the Archive alert status line;
  heading bold; description regular.
- Actions are square, hard-bordered buttons. `Continue writing` carries the
  default-button outline; `Discard and move` is a plain hard-bordered button,
  not a red fill. Hover and focus use the Retro Mac inversion already used by
  Breakdown row actions.
- No scrim, portal, window title bar, drag, or close icon.

### Phase 41 Retro Mac Breakdown Delete dialog (2026-10-15)

The existing Breakdown row Delete confirmation (`AlertDialog`, title
`Delete breakdown?`) renders in a portal outside `.triage-shell`, so Retro Mac
CSS never reached it. Give it the class `breakdown-delete-dialog` and the same
Retro Mac realization as the Scratch Trash dialog in the Scratch Pool recipe's
Phase 41 supplement: Archive-alert scrim, `4px` double border, radius `0`,
`6px 6px 0` hard shadow, Context font, `!` mark column, square hard-bordered
buttons with the default-button outline on Cancel. Copy, behavior, locking and
focus stay unchanged. Every other theme realizes this dialog in its own L2
binding (EXECUTION_PLAN L2 "Phase 41 surfaces"); until then it keeps the
current look.

## `DP-VQ04` Approved Breakdown-Content Inline Editor

The Breakdown editor replaces only the active source row's content slot with a
labelled field. View and edit retain the same row, drag/content/action anchors,
sorted position, and outer geometry. It never uses a Dialog/AlertDialog,
popover, detached conflict card, toast, or another row's chrome.

### Fixed Structure And Entry

- Keep the row at its existing fixed geometry in every editor state. The drag
  slot stays fixed and disabled while editing; reserve the existing fixed
  `9.5rem` action region.
- Use one labelled, single-line `Breakdown content` text input capped at 120
  characters. Do not render a textarea, resize affordance, vertical scrolling,
  or visible scrollbar.
- Long values use browser-managed caret-following horizontal movement. `Home`
  returns to `scrollLeft=0`; `End` exposes the terminal caret without
  entering or overlapping the action region.
- Keep text-style `Save` and `Cancel` in the fixed action region. Dirty
  `Save` uses destructive/red emphasis. Entry focuses the field at the end
  without selecting all text.
- Save, valid blur, unchanged exit, Cancel/Escape, focus return,
  theme/locale activation, and IME boundaries preserve Task 137 semantics.

### Fixed State Matrix

| State | Fixed visible treatment | Fixed action region |
|---|---|---|
| Pristine | Editable field with base content; no visible status line | Disabled text-style `Save`; `Cancel` |
| Dirty | Editable protected draft; no visible status line | Destructive/red text-style `Save`; `Cancel` |
| Validation | Empty field with in-field/attached `Enter breakdown content.`; no status row | Disabled `Save`; `Cancel` |
| Saving | Same field retained read-only | Fixed `Saving…` progress action; optional pending-intent `Stay here` preserves existing semantics |
| Reconciling | Same field retained read-only | Fixed `Checking whether your changes were saved…` progress action; optional `Stay here` |
| Offline | Source-bound fixed issue overlay over blurred underlying content | `Retry save` remains disabled until reconnect; `Cancel` |
| Not applied | Source-bound fixed issue overlay over blurred underlying content | `Retry save`; `Cancel` |
| Conflict | Source-bound fixed issue overlay; no full `Latest version` / `Your draft` comparison regions | `Use mine`; `Use latest`; `Copy draft` |
| Lifecycle invalidated | Fixed overlay remains at the former source-row position over blurred/protected draft content; no expanding recovery strip | `Copy draft`; `Close` |

The issue overlay carries the existing authoritative status/recovery copy and
copy acknowledgement without changing row geometry. Conflict preserves the
acknowledged-latest CAS rule but exposes only `Use mine`, `Use latest`, and
`Copy draft`, not expanding comparison regions.

### Focus, Lifetime, Motion, And Themes

- Validation, offline, not-applied, and conflict preserve Task 137 logical
  focus. Saving/reconciling retain the focused read-only field. Applied Save
  announces `Saved.` once and returns to surviving Edit unless a pending
  intent owns the destination.
- A staged, consumed, deleted, remotely invalid, or owner-Scratch-invalid row
  cannot Save or Use mine. Invalidation keeps review/copy at the former source
  position; closing follows the canonical next-visible row, then Add fallback.
- Draft/conflict/recovery state is mounted-page memory only. Every transition
  is static and reduced-motion-identical, with no spinner rotation, pulse,
  bounce, blink, scale, or layout transition.
- Every theme keeps the same fixed row geometry and semantic tree. Theme
  variables may style the field, text actions, progress action, blur, and
  source-bound overlay, but may not add a status row, comparison region,
  recovery expansion, or theme-specific behavior/copy branch.

## `DP-VQ05` Approved Add/Delete Attached Reliability States

`DP-VQ05` keeps every operation state beside the source that initiated it:
Add status remains inside the Add region, and Delete status remains inside the
exact source row. It never substitutes a toast, placeholder row, generic card,
dialog, global status rail, prototype literal, or adjacent-surface chrome.

### Placement And State Binding

- Bind `data-triage-reliability-surface="add"` to the complete Add region and
  `data-triage-reliability-surface="delete"` to the exact source row. Bind only
  headless-authoritative `pending`, `unknown`, `reconciling`, `not-applied`,
  `rejected`, `conflict`, and terminal confirmed states; theme IDs never
  branch copy or behavior.
- Reserve `breakdown-add-reliability` as a full-width second line inside the
  Add input/control grid, directly below its field and Add control. Status copy
  is first and the one recovery action is trailing. It does not move the input
  or control; the `DP-VQ03` departure sheet remains the next sibling below the
  complete Add region.
- Reserve `breakdown-delete-reliability` as a full-width second line inside
  the exact Breakdown row, spanning the content-to-action columns below the
  ordinary row line. The row may grow vertically but keeps its identity,
  width, sorted position, content, grip, Edit, and Trash locations. No pending
  or failed operation inserts a replacement or skeleton row.
- Both lines use visible copy as the required non-color state cue. Pending and
  reconciling use no spinner; failure/recovery controls use the canonical
  focus-visible ring.

### Add Exact State, Copy, And Actions

| Authority state | Exact visible treatment and copy | Reliability action |
|---|---|---|
| Pending dispatch | Draft stays visible/read-only; status `Adding…`; ordinary Add is locked | None |
| Unknown outcome | Draft stays visible/read-only; status `We couldn’t confirm whether it was added.` | `Check again` |
| Reconciling | Draft stays visible/read-only; status `Checking whether it was added…` | Mounted `Check again`, focusable but `aria-disabled="true"` until the query settles |
| `not_applied` | Draft becomes editable; status `Not added. Your draft is still here.` | Primary `Retry Add`, reusing the exact operation ID, row ID, and snapshotted content |
| `rejected` | Draft becomes editable; status `Add unavailable. Your draft is still here.` | No reliability action; ordinary Add starts a new attempt only after review |
| `conflict` | Draft becomes editable; status `This Scratch changed. Your draft is still here.` | No reliability action; ordinary Add starts a new attempt only from refreshed authority |
| `applied` / current-operation `already_applied` | Clear the draft once, remove the Add reliability line, scroll only as specified by SPEC, and show `DP-VQ02`'s row `Added.` signal | None |

`Retry Add` exists only for authoritative `not_applied`. Editing the retained
draft after that result withdraws `Retry Add` and returns to the ordinary Add
path; a later Add is a new user-confirmed attempt. Transport/offline ambiguity
uses Unknown and `Check again` until authority is known, never blind Retry.

### Delete Exact State, Copy, And Actions

| Authority state | Exact visible treatment and copy | Reliability action |
|---|---|---|
| Pending dispatch | Source row remains in place; status `Deleting…`; grip, Edit, Trash, and conflicting actions are locked | None |
| Unknown outcome | Source row remains in place; status `We couldn’t confirm whether it was deleted.` | `Check again` |
| Reconciling | Source row remains in place; status `Checking whether it was deleted…` | Mounted `Check again`, focusable but `aria-disabled="true"` until the query settles |
| `not_applied` | Row returns to authoritative Active treatment; status `Not deleted. This breakdown is still here.` | `Check again` only; no Delete Retry |
| `rejected` | Surviving authoritative row remains; status `Delete unavailable. This breakdown is still here.` | `Check again` only; no Delete Retry |
| `conflict` | Surviving authoritative row remains; status `This breakdown changed. Delete was not completed.` | `Check again` only; no Delete Retry |
| `applied` / current-operation `already_applied` | Remove the row once, show no in-place success placeholder or toast, then use the SPEC focus/empty/completion handoff | None |

On a terminal known failure, ordinary row actions reflect current authority;
a later Trash activation is a new Delete attempt, not a dedicated Retry. The
reliability line never labels any control `Retry`, `Retry Delete`, or `Delete
again`. `Check again` is a read-only reconciliation of the retained operation
identity and never resends Delete.

### Timing, Focus, Announcement, And Motion

- Show the pending line in the same synchronous turn as successful operation
  acquisition and before the first asynchronous gap. Every state change is
  immediate and persists until another authoritative state replaces it.
  Unknown and terminal failure do not auto-dismiss; draft edit/new Add,
  refreshed row action, Scratch/route exit, or terminal confirmed authority
  clears the applicable line.
- Add submission keeps logical focus in the mounted Add input. If the user
  invokes `Check again`, keep that control mounted and focused through
  reconciling; an unresolved result re-enables it in place, `not_applied`
  replaces it with focused `Retry Add`, and any other terminal result restores
  the Add input. `Retry Add` returns focus to the read-only Add input before
  dispatch.
- Delete begins from Trash and keeps that control mounted with its visible
  focus ring while activation is locked. Unknown moves focus to `Check again`;
  reconciliation keeps it mounted and focused. A terminal failure returns
  focus to Trash after refreshing the row; confirmed success follows next row
  → previous row → Add input → Context, with the completion-overlay exception
  already owned by SPEC.
- Announce each newly entered state copy once through one polite atomic status.
  Do not announce renders, elapsed time, or repeated reconciliation results.
- Use static immediate changes only: no spinner rotation, pulse, ping, bounce,
  blink, flicker, scale, transform, or layout-transition animation. Reduced
  motion uses the identical copy, geometry, controls, timing, and focus rules.

### Eight-Theme Mapping

Every theme preserves the same two attached lines, exact copy, action rules,
focus, and state lifecycle. These mappings use the canonical role families,
not prototype or adjacent-surface literals:

| Theme | Exact reliability mapping |
|---|---|
| GridDO | Compact technical status rule inside Add or row, semantic pending/failure text, canonical action and focus roles. |
| Tiny Desk | Ruled paper annotation attached to the Add sheet or source-row slip, with stationery `Check again`/`Retry Add` controls. |
| Neumorphism | Shallow inset status channel inside the existing Add or raised-row depth, with named raised recovery control and stable focus ring. |
| Claymorphism | Shape-preserving inset status seam inside the source silhouette, with a restrained raised recovery control and no movement. |
| Origami | Attached seam/fold status strip within the Add paper or exact row, with a fixed recovery fold and no detached card. |
| Terminal | Variable-driven static status line and bracketed recovery action inside the existing record/command region, with no blink or spinner. |
| Retro Mac | In-place 1-bit status pane and hard recovery control inside the Add region or list row, with no new window or inversion cycle. |
| Graphite | Inline editorial status caption bounded by a strengthened rule, with monochrome recovery action and persistent focus cue. |

## Theme Realizations

### GridDO

- Observed source-only: rows are clean product cards with grip, content, circular Edit/Trash controls, muted staged treatment, and a `p-4` list. Add declares a bordered rounded input with left Plus and a primary uppercase `Add` button. Empty source states use mono technical messages.
- Adopted fact: restrained card rows, visible technical actions, and compact system-style empty prompts are supported.
- Token implication: active/staged row, row action, Add field/control, ordinary empty, and consumed-completion prompt need distinct semantic roles.

### Tiny Desk

- Observed source-only: rows and Add use white/cream paper, brown ink, `#d2c2a4` borders, and stationery controls; Add is a bordered paper field plus brown button. Empty is an `EMPTY STICKY`/memo object, while completion uses a filed/stamped paper message.
- Adopted fact: paper slips and stationery actions are supported; source wording is not canonical copy.
- Token implication: paper row, staged paper, stationery action, sticky empty, and filed completion need Tiny Desk aliases.

### Neumorphism

- Observed source-only: rows declare `18px` radius with card/inset shadows and circular raised actions; Add is a round inset field with a raised circular add control. Ordinary empty uses a large inset well; completion uses a separate checked/status surface.
- Adopted fact: raised rows/actions and inset input/empty wells are supported.
- Token implication: reuse `--theme-shadow-card`, `--theme-shadow-inset*`, and semantic row/empty roles; rendered depth is unverified.
- User-adopted (2026-10-17, replaces the 2026-10-16 entry): a staged row follows the source look — the whole row at `opacity: 0.35` in the `--theme-shadow-inset-sm` well, its disabled grip, Edit and Trash at `opacity: 0.1` inside it. The source's `scale-95` stays excluded (fixed 48px slot, no width change). User-accepted contrast exception: the staged row's text falls to about 1.6:1; it is an inactive duplicate whose controls are all disabled and whose candidate stays readable in Staging, and the inset well is its non-colour cue. Realized in Task 175.

### Claymorphism

- Observed source-only: rows are rounded clay objects with visible Wand/Trash actions; staged state is visually de-emphasized; Add uses a `20px` inset field and clay button. Empty declares balloon/jelly imagery; completion declares a separate green completion prompt.
- Adopted fact: tactile rows, distinct shape-led actions, and playful but semantically separate empty/completion objects are supported.
- Token implication: active/staged/deleting envelope must not collapse to color alone; `DP-VQ05` supplies the exact attached reliability contract.

### Origami

- Observed source-only: rows use paper/fold geometry; Add uses a dashed paper field and dark folded button. Ordinary empty is a cleared-sheet/fold composition; completion is a crossed/folded folder composition.
- Adopted fact: paper seams, folds, and faceted prompts are supported.
- Token implication: row paper, staged paper, dashed input, ordinary empty, and completed fold roles should be aliases. Keyboard-grab and pulse declarations are excluded.

### Terminal

- Observed source-only: rows are console records with grip, content, Edit/Trash commands, and a textual `# [staged]` non-color cue. Add is a `C:\>` command input plus `Execute`. Empty is a debugger/buffer-empty readout; completion is an `[INFO]` result.
- Adopted fact: text status, command actions, and explicit non-color staged labeling are supported.
- Token implication: terminal row state must keep visible text/icon semantics; pulsing completion commands are not adopted.

### Retro Mac

- Observed source-only: rows are compact 1-bit file/list items with grip and square Edit/Trash buttons; Add is an inverted-on-focus field plus `Add` button. Ordinary empty uses a Sad Mac/error object; completion uses an empty-system/file state.
- Adopted fact: black/white row inversion, hard controls, and distinct system objects for empty versus completion are supported.
- Token implication: row/action/input/empty/completion aliases should consume Retro Mac border and hard-shadow tokens.

### Graphite

- Observed source-only: rows use fine editorial rules, bold text, grip, and square monochrome Edit/Trash controls; Add uses a `0.5px` field and dark button. Ordinary empty uses calligraphy guides; completion uses a restrained check/headline.
- Adopted fact: drafting-line rows and editorial empty/completion hierarchy are supported.
- Token implication: thin row rule, staged opacity plus non-color cue, editorial Add field, guideline empty, and completion headline need roles.

## Exclusions And Verification

- Excluded: detached or non-source-attached `VQ-11` blockers, source mutation behavior, Add-on-blur, mock delete/placement, row dates/numbers, consumed strike-through, repeated pulse/bounce, and route copy as authority.
- Task 138 exact-source browser evidence verifies the fixed row/editor geometry, drag/content/action anchors, 120-character caret-following boundary, representative themes, issue overlay, and view/edit stability at source tree `9375974b616ae6d6b891937ad04dc6a99d5fbb88`. Other row, staging, empty/completion, reliability, success, deletion, and reduced-motion recipe concerns remain source-only until their owning tasks verify them.
