# Inbox/Triage Archive And Completion — Visual Recipe

> Status: **Proposed — recipe-package user gate pending**
> Verification: **source-only; no rendered route/state was checked**
> Production owner: Breakdown completion presentation and archive transaction surface (`LAND-ARCHIVE`, `LAND-BREAKDOWN`)

## Authority And Source Regions

- Product authority: [`DECISION.md`](../brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/DECISION.md) lines 1128–1255.
- Approved boundary: [`PROMOTION_MAP.md`](../brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/PROMOTION_MAP.md) §§10.1, 11.2, and 11.3.
- Design Source root: `/Users/jwk/Documents/griddo2-claude-themes2-3`.
- Archive/completion subregions are inside GridDO `page.tsx:1128-1380`; Tiny Desk `:1402-1550`; Neumorphism `:1040-1280`; Claymorphism `:943-1189`; Origami `:1402-1601`; Terminal `:944-1204`; Retro Mac `:992-1241`; Graphite `:1103-1350` at that root.

## Shared Adopted Contract

- The first current-page completion transition uses a Breakdown-only blur/dim overlay with explicit Archive and Cancel. It does not cover the whole page.
- Before mutation the overlay is section-scoped/non-modal, does not impose a page-wide focus trap, and leaves other allowed sections visible. Source overlay visuals do not decide behavior or focus.
- Cancel closes the overlay, changes the same Context to a theme-specific complete base state, exposes a Breakdown-local reopen control, and immediately permits the existing Add flow.
- Base overlay, Archive/Cancel action hierarchy, complete Context, and reopen presentation are source-supported. Eligibility, blockers, mutation, recovery, selection, and focus are product/canonical contracts.
- Source bounce/pulse/timer declarations are observations only and are not adopted.

## Decision-Prerequisite Boundary

- `VQ-11` — **resolved by `DP-VQ11` on 2026-08-11.** The user selected Choice A: Add/title blockers stay attached to their source status regions, while actual eligibility loss removes completion presentation and places an exact persistent status in its vacated Breakdown completion slot. Task 160 is the only realization edge after Task 118 checkpoint acceptance.
- `VQ-12` — **resolved by `DP-VQ12` on 2026-08-11.** The user selected Choice A: retain one stable Breakdown-scoped Archive card and change its content plus one current-action slot in place through pending, unknown, reconciliation, terminal failure, forced-reload recovery, and authoritative success. Task 162 is the only realization edge after Task 119 checkpoint acceptance.

## `DP-VQ11` Approved Completion Composition

`DP-VQ11` does not alter the completion predicate, Task 159 transition model,
Archive transaction, or `VQ-12` operation/recovery states. It supplies only the
missing presentation contract around those owners:

| Condition | Exact surface ownership |
|---|---|
| Otherwise-eligible Scratch with non-empty Add draft | The Breakdown Add recipe owns exact `Add this idea or clear the draft to complete this Scratch.` directly below the Add row |
| Otherwise-eligible Scratch with Task 137 title snapshot `open|dirty|saving|conflicted|reconciling` | The Context recipe owns the matching exact completion sentence inside the existing editor status region |
| Previously presented completion becomes persistently ineligible from active Breakdown rows and/or staged candidates | Remove scrim/card, complete Context, and Reopen; the Breakdown recipe owns the narrow exact reason in the vacated completion slot |
| Selected Scratch becomes archived/deleted/inactive | Show no blocker or withdrawal card; the canonical active-Scratch/workspace owner exits the stale surface |
| Blocker resolves or persisted eligibility returns | Remove only the `DP-VQ11` status and let Task 159 recompute from current truth; never auto-save, auto-submit, auto-cancel, or auto-Archive |

The Add and title blockers suppress the automatic completion presentation but
do not withdraw stored eligibility. The withdrawal status is reserved for a
real persisted eligibility loss after completion presentation and never appears
for a never-used, all-deleted-without-consumption, all-staged, or initially
ineligible Scratch.

### Completion-Slot Structure And Focus

- `archive-withdrawal-status` occupies the same Breakdown completion slot as
  the removed overlay card/complete prompt/Reopen family, but it is a compact
  non-blocking status rather than a disabled Archive card or empty state.
- The status contains one static non-color `archive-withdrawal-mark` and one
  exact sentence. It has no Close, Dismiss, Retry, Reopen, Archive, or hidden
  action and persists only while the current mounted-page cause remains true.
- Local source actions retain their canonical focus and remote status never
  steals it. Only a focused control removed with completion hands focus to the
  surviving Breakdown heading.
- One polite atomic announcement occurs when the withdrawal cause first
  appears or changes. Recovery is announced by Task 159's resulting current-
  truth completion presentation, not a second transient message.
- Geometry and state changes are immediate/static in ordinary and reduced-
  motion modes. No overlay fade, card exit, blur transition, pulse, bounce,
  spinner, timer, auto-dismissal, or repeated motion is authorized.

### Eight-Theme Completion-Slot Binding

| Theme | Exact withdrawal-slot binding |
|---|---|
| GridDO | Compact ruled technical status replacing the archive card, with canonical static warning mark |
| Tiny Desk | Pinned filing-status note in the same paper completion area |
| Neumorphism | Inset status trough at the former raised-card locus, without a second raised panel |
| Claymorphism | Stable sculpted status ribbon replacing the completion object without bounce |
| Origami | Seam-bound folded notice in the completion area with no animated fold |
| Terminal | Variable-driven `[completion withdrawn]` record and exact sentence with no blink/glow loop |
| Retro Mac | Hard 1-bit in-section system status replacing the completion alert/reopen family |
| Graphite | Restrained editorial status and strengthened rule in the completion locus |

## `DP-VQ12` Approved Archive Reliability And Recovery Composition

`DP-VQ12` does not change the SCHEMA Archive transaction, operation-result
family, current-tab recovery descriptor, Task 161 coordinator, terminal Pool
handoff, or Task 126 reconciliation classification. It supplies the missing
single-card presentation contract consumed only by Task 162.

### One Stable Card And Action Slot

- Keep `archive-card` in the same centered Breakdown completion locus and keep
  its outer geometry stable from Archive activation until a terminal result.
  Change only the card's static mark, heading/status copy, and one
  `archive-current-action` slot. Do not add a second status rail or replace the
  card with a separate recovery panel.
- `archive-status` is visible text with one static non-color
  `archive-status-mark`. The current-action slot occupies the original Archive
  action position. Pending/reconciling variants keep it keyboard-focusable and
  `aria-disabled` so logical focus does not disappear; activation performs no
  mutation.
- The ordinary pre-dispatch Cancel remains the existing secondary action.
  After dispatch, pending, unknown, and reconciling expose no Cancel/Escape
  escape hatch. Terminal `not_applied` exposes Retry and Cancel; terminal
  rejected/conflict or recovery-storage failure exposes Cancel only. Terminal
  Cancel dismisses only the operation result and returns to current completion/
  reopen or working truth; it never aborts, rolls back, compensates, or hides an
  unresolved operation.

### Exact State, Copy, And Action Matrix

| State | Exact visible copy | Current action and result |
|---|---|---|
| Pending after Archive dispatch | `Archiving this Scratch…` | Keep the originating Archive position as a focusable inactive current-action target. No Check again, Retry, Cancel, resend, optimistic Pool removal, or success copy |
| Unknown outcome | `We couldn’t confirm whether this Scratch was archived.` | Expose primary `Check again`; it performs read-only reconciliation with the same descriptor/operation ID and never resends Archive |
| Reconciling after Check again | `Checking whether this Scratch was archived…` | Retain the same current-action position as focusable inactive `Checking…`; no Retry or Cancel |
| Forced-reload initial recovery | `Checking the Archive request from before this reload…` | Before initial Inbox projection, validate the current-tab descriptor and run one reconciliation. Use no normal-completion flash, new operation ID, resend, or restored page-session state |
| Authoritative `not_applied` | `This Scratch was not archived.` | Primary `Retry`, secondary `Cancel`; focus Retry. Retry alone reuses the same logical operation identity and returns the same card to pending |
| Recovery descriptor unavailable before dispatch | `Archive couldn’t start because this tab couldn’t keep its recovery details.` | No command ran and no Retry is exposed in this operation variant; focus `Cancel`, then return to current completion/reopen truth where a later explicit Archive is a new attempt |
| Authoritative rejected result | `Archive stopped because this Scratch is no longer ready.` | Show returned current truth where available, expose Cancel only, and never Retry until a later newly confirmed Archive attempt revalidates eligibility |
| Authoritative conflict | `Archive couldn’t finish because this Scratch changed while the result was being checked.` | Expose Cancel only; never Retry, overwrite, compensate, infer success, or preserve stale completion controls |
| `applied` or `already_applied` | `Scratch archived.` | Announce once, remove the Archive card with the selected Scratch, and perform the canonical next-visible → previous-visible → filtered-null → true-empty handoff; render no lingering success card |

On reload, `applied|already_applied` uses the same terminal handoff;
`not_applied` opens the exact not-applied card over current complete/reopen
truth; `unknown` opens the exact unknown card with `Check again`; and conflict
opens the exact non-retriable conflict card. Invalid/foreign/stale descriptors
are discarded by Task 161/126 and never produce a `DP-VQ12` card or mutation.

### Focus, Accessibility, Lifetime, And Motion

- Archive activation retains focus in the stable current-action slot. Unknown
  focuses `Check again`; reconciling retains that position; `not_applied`
  focuses Retry; storage failure/rejected/conflict focuses Cancel. A forced
  reload focuses the recovery heading before any ordinary Inbox control.
- Authoritative success hands focus from the current-action slot to the SPEC
  visible-order destination in the render that shows it; focus never rests on
  the document body. Only the archiving Scratch's Breakdown shows the card, and
  an Archive started on the mounted page never shows the forced-reload
  recovery projection.
- One polite atomic announcement occurs for each new exact state sentence,
  never per rerender. The static mark plus full text carries meaning without
  color, motion, ellipsis animation, or spinner.
- Pending/unknown/reconciling and valid forced-reload recovery last until the
  same descriptor reaches authoritative terminal classification. They do not
  end on a timer, Scratch switch, route intent, theme/mode change, or attempted
  conflicting action. Terminal Cancel ends only its displayed terminal result;
  a change of the selected Scratch after a non-success terminal result or a
  pre-dispatch storage failure dismisses it the same way.
- Geometry, copy, actions, focus, announcement, and lifetime are identical in
  ordinary and reduced-motion modes. Card content and terminal removal change
  immediately/staticly; no fade, slide, scale, blur transition, skeleton,
  shimmer, spinner, progress loop, pulse, ping, bounce, blink, flicker, or
  layout-transition animation is authorized.

### Eight-Theme Single-Card Binding

| Theme | Exact reliability/recovery binding |
|---|---|
| GridDO | One ruled technical Archive operation card with a static state glyph and canonical current-action slot |
| Tiny Desk | One pinned filing note whose stamp line and single action row change in place |
| Neumorphism | One raised Archive card with an inset static status line and stable action capsule position |
| Claymorphism | One shape-preserving clay Archive object with a static status inset and no bounce |
| Origami | One seam-bound Archive sheet whose printed status/action change without a new fold or panel |
| Terminal | One variable-driven `[archive:*]` system frame and current command line with no blink, spinner, or glow loop |
| Retro Mac | One hard 1-bit in-section Archive alert whose message and default action change in the same window |
| Graphite | One restrained editorial Archive card with a fixed rule, static mark, and stable action row |

## Theme Realizations

### GridDO

- Observed source-only: overlay covers the Breakdown with `bg-background/50 backdrop-blur-[2px]`; the centered card has primary border, `rounded-2xl`, shadow, check, descriptive copy, primary Archive, and bordered Cancel. Completion source uses technical buffer-cleared/complete language and a reopen action.
- Adopted fact: polished centered section card with clear primary/secondary actions and technical complete Context is supported.
- Token implication: section scrim, archive card, complete Context, reopen, primary Archive, and secondary Cancel need roles.

### Tiny Desk

- Observed source-only: `bg-black/35 backdrop-blur-[1px]` covers Breakdown; a pinned cream note with yellow tack, brown actions, and paper shadow is centered. Complete state uses filed/stamped paper and dog-ear treatment.
- Adopted fact: pinned archive note and filed-paper completion are supported.
- Token implication: paper scrim/card/tack/complete stamp/reopen roles need Tiny Desk aliases.

### Neumorphism

- Observed source-only: a translucent light scrim and `28px` raised card use card-hover shadow, rounded action capsules, and a check. Complete state uses inset/raised resolution surfaces.
- Adopted fact: raised soft archive card and inset resolved Context are supported.
- Token implication: archive card/actions consume named neumorphic shadow variants; rendered layering/depth is unverified.

### Claymorphism

- Observed source-only: a white translucent scrim with blur centers a `36px` clay card with white border, compound shadow, green Archive capsule, and neutral Cancel. Completion source uses a distinct soft green object/state.
- Adopted fact: puffy section card with tactile primary/secondary actions and a separate completed clay state is supported.
- Token implication: archive/complete/action roles should alias clay variables; bounce is excluded.

### Origami

- Observed source-only: a dark translucent scrim centers a dashed faceted paper card with compact mono actions. Complete state uses folded/crossed paper geometry and an `Archive Folder` reopen action.
- Adopted fact: folded archive sheet and completed-folder grammar are supported.
- Token implication: archive paper, dashed seam, completed fold, reopen, and action roles need Origami aliases.

### Terminal

- Observed source-only: a black translucent section scrim centers a double foreground frame with `[SYS: ARCHIVE SCRATCHPAD?]`, Y/N-like action hierarchy, and explicit console completion output. Pulse/bounce appears in source.
- Adopted fact: system confirmation frame and textual completed-buffer state are supported.
- Token implication: terminal archive statuses require visible text/non-color cues and foreground-driven borders; repeated motion is excluded.

### Retro Mac

- Observed source-only: a white translucent scrim centers a hard-shadow, double-border system alert with icon block, Archive and Cancel buttons. Complete state uses a classic system/file empty object and reopen control.
- Adopted fact: 1-bit system alert and completed-file presentation are supported.
- Token implication: system scrim/window/icon/action/complete roles need Retro Mac aliases.
- Adopted by user decision (Task 171, 2026-10-15): the confirmation card shows `Every idea segment in "<Scratch title>" has been successfully placed. File it to disk?` below the heading, title in bold. It is one shared `archive-confirmation-detail` element, hidden by default; only Retro Mac CSS shows it, so the component tree and behavior stay theme-independent (architecture rule 8). The string still lives in `breakdown-panel.tsx`; moving it into `INBOX_TRIAGE_COPY` is deferred to Task 178.

### Graphite

- Observed source-only: `bg-black/40 backdrop-blur-[2px]` centers a fine-border white card with restrained large shadow, bold heading, dark Archive, and bordered Cancel. Complete state uses an editorial check/headline and dark reopen button.
- Adopted fact: restrained editorial archive card and completed headline are supported.
- Token implication: graphite scrim/card/headline/reopen/action roles should consume grayscale variables; bounce is excluded.

## Exclusions And Verification

- Excluded: detached/global `VQ-11` fallback, a second `VQ-12` status rail or replacement recovery panel, source eligibility latch, mock list removal, global AlertDialog fallback, timers, automatic Archive/Retry, blind resend, repeated pulse/bounce, route copy as canonical copy, and any claim that blur/layering/contrast was rendered.
- No section-only clipping, scrim opacity, backdrop blur, complete/working distinction, focus behavior, reopen flow, pending/recovery variant, contrast, light/dark parity, motion, or reduced-motion equivalence was rendered or verified.
