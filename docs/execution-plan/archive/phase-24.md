# Phase 24 — User-Owned Decision Prerequisites

## Completion Summary

Tasks 106–119 and all fourteen Decision-prerequisite receipts were explicitly
accepted on the isolated
`phase-24/user-owned-decision-prerequisites` branch. The phase records complete
source authority for twelve visual/content questions without changing product
code or starting any later realization task.

| Task | Accepted receipt | Exact released realization |
| ---: | --- | --- |
| 106 | `DP-VQ01` external removal | Task 141 |
| 107 | `DP-VQ02` Add/Unstage success | Task 148 |
| 108 | `DP-VQ03` Add-draft departure | Task 140 |
| 109 | `DP-VQ04` inline editors | Task 138 |
| 110 | `DP-VQ05` Add/Delete reliability | Task 143 |
| 111 | `DP-VQ06-POOL` Pool status | Task 144 |
| 112 | `DP-VQ06-STAGING` Staging status | Task 147 |
| 113 | `DP-VQ06-EXPLORER` Explorer status | Task 150 |
| 114 | `DP-VQ07` Explorer replacement search | Tasks 151 and search-only 158 |
| 115 | `DP-VQ08` placement reliability | Task 153 |
| 116 | `DP-VQ09` Result Title/direct limits | Task 154 |
| 117 | `DP-VQ10` Newly/Undo | Task 157 |
| 118 | `DP-VQ11` completion blockers | Task 160 |
| 119 | `DP-VQ12` Archive recovery | Task 162 |

## Accepted Decision Foundation

- Every DP receipt records exact structure, copy, state transitions, actions,
  focus, accessibility, lifetime, motion/reduced-motion behavior, and the
  eight-theme semantic role-family mapping needed by its realization owner.
- The receipts preserve independent release edges. Acceptance of one decision
  does not start its realization, release an adjacent task, or create a blanket
  phase dependency.
- Source-only recipes remain distinct from rendered evidence. Production and
  running-app verification remain with the later tasks named above.
- No prototype, generic dialog/status, adjacent-surface behavior, existing-token
  guess, or theme-ID product branch substitutes for an accepted receipt.
- Task 162 is released but not started. Phase 24 adds no product source,
  persistence, repository command, component, hook, store, route, or test.

## Verification And Acceptance

Every task has a durable start, decision/evidence commit, explicit user
acceptance, and accepted whole-file JSON receipt in
[`docs/issues/Issues_Phase_24.md`](../../issues/Issues_Phase_24.md). Each receipt
records `task_state: accepted`, `canonical_impact: Reflected`, and
`issue_or_deviation: None`; the candidate-pinned adapter resolver validates all
fourteen receipts as `ready`.

The merged pre-close, integration `main`, and Phase 25 Task 126 full-gate
states have the identical `src` tree
`483c7756667335b502105dfa4a712b128a7a117b`. The latest relevant full gate was
therefore reused without rerunning test/lint/typecheck/build:

| Command | Exit | Result |
| --- | ---: | --- |
| `pnpm test` | 0 | 87 test files / 679 tests passed |
| `pnpm lint` | 0 | 0 errors; 11 pre-existing warnings |
| `pnpm typecheck` | 0 | TypeScript check passed |
| `pnpm build` | 0 | Next.js 16.2.1 production build passed; seven routes generated |

The Task 106–119 checkpoints are the applicable source-decision acceptance
evidence. This phase makes no rendered-fidelity or product-completion claim.

## Close Handoff

- Pinned pre-close SHA:
  `a7bb848e30be579c9ae49ef06cb27bb9d4061e3d`.
- Merged integration authority:
  `f76c68b79846ed1c1f19cc9972d488b60add3d19` on `main`.
- Original approved base:
  `7b79a97b56a7023c5f3e803ab646fc3bb7f6be28`.
- Blocking conformance violations: 0.
- Advisory conformance violations: 0.
- Active issues: 0.
- Deferred Phase 24 issues: 0.
- Phase Notes: not used by adapter policy.
- Reusable learnings: no new entry; canonical decision owners already contain
  the reusable authority without duplication.
- Downstream work consumes each completed DP receipt only through its exact
  dependency edge. Phase 24 completion does not start Phase 26, Task 127, Task
  162, or any other lifecycle.

**Full issue log:**
[`docs/issues/Issues_Phase_24.md`](../../issues/Issues_Phase_24.md)

## Task Contracts

The accepted task contracts, moved verbatim from `docs/EXECUTION_PLAN.md`
on 2026-10-25; relative links are rebased to this folder.

Tasks 106–119 are non-code Decision tasks. They have no dependencies on one another; their shared document edits are serialized by the `decision-docs` mutex without creating a semantic VQ dependency.

### Task 106: [x] Record `DP-VQ01` external-removal decision

**Files and actions:** modify `docs/recipes/inbox-triage-scratch-pool-visual-recipe.md`, `docs/DESIGN_TOKENS.md`, and `docs/EXECUTION_PLAN.md` to record the user-approved complete external archive/delete transition realization or explicit scope-out: exact copy, layout, controls, countdown treatment, pause/resume, destination change, draft-copy status, restore, focus, and eight-theme mapping. Record the durable receipt and change no code.

**Dependencies:** user decision only; no code prerequisite and no other DP task.

**Decision owner:** User. **Receipt:** `DP-VQ01`. **Exact edge:** Task 141 only. **Resume:** receipt completely supplies or scopes out the named surface; silence or a nearby dialog does not resume it.

**Authority / flows:** `VQ-01`, `UF-05`, `NEG-21`.

**Recipe:** [`Scratch Pool`](../../recipes/inbox-triage-scratch-pool-visual-recipe.md).

**Recorded decision — `DP-VQ01`, Choice A (2026-08-09):** use one dedicated
central blocking `alertdialog` over an inert Inbox workspace, never a generic
Dialog/AlertDialog, Archive surface, or Pool-chrome fallback. The panel is
`min(35rem, calc(100% - 2rem))` wide with only its draft list scrollable. It
uses the exact lifecycle titles `This Scratch was archived elsewhere` and
`This Scratch was deleted elsewhere`, destination-aware running/paused copy,
a 4px `5000ms` linear countdown, and text-only `Move now`, `Pause`, and
`Resume` controls with no Cancel/Escape dismissal. Dirty Add/Scratch-title/row
drafts start paused in source-labeled full-text cards; `Copy full draft`
becomes `Copied` without focus movement or countdown resume. A running
destination change restarts five seconds, a paused change stays paused,
authoritative archive restore alone cancels the transition, and terminal
focus moves to the destination Context or the named no-selection/empty status.
All eight themes keep this semantic tree/copy/timing/focus and consume the
exact recipe/token role-family mapping. The durable receipt is
`docs/issues/Issues_Phase_24.Task_106.dp-vq01.json`; it releases no task other
than Task 141. The separate 2026-08-09 checkpoint acceptance records this
Task's `[x]` without authorizing any other realization edge.

**Observable acceptance:** the receipt lets Task 141 implement every external-removal state without choosing wording, geometry, controls, timing treatment, or theme values.

**Verification:** `git diff --check`; inspect exact receipt ID, full state list, no fallback, and only Task 141 release.

**Commit contract:** the three named documents and `DP-VQ01` receipt only; `docs(triage): record DP-VQ01`.

### Task 107: [x] Record `DP-VQ02` success-signal decision

**Files and actions:** modify `docs/recipes/inbox-triage-breakdown-row-empty-visual-recipe.md`, `docs/DESIGN_TOKENS.md`, and `docs/EXECUTION_PLAN.md` to record exact shared Add/Unstage one-shot effect, trigger, duration/easing, copy, placement, interruption/retrigger, announcement, static reduced-motion treatment, and eight-theme mapping; change no code.

**Dependencies:** user decision only; no code prerequisite and no other DP task.

**Decision owner:** User. **Receipt:** `DP-VQ02`. **Exact edge:** Task 148 only. **Resume:** complete success realization accepted.

**Authority / flows:** `VQ-02`, `UF-07`, `UF-15`, `NEG-11`, `NEG-13`.

**Recipe:** [`Breakdown rows and empty states`](../../recipes/inbox-triage-breakdown-row-empty-visual-recipe.md).

**Recorded decision — `DP-VQ02`, Choice A (2026-08-09):** on the first newly
observed authoritative success of a local Add or Unstage identity, keep the
target Breakdown row's geometry/actions fixed, apply its theme-owned
background/border success emphasis, and return to the active-row values over
`600ms` with CSS `ease-out`. A reserved non-interactive trailing status slot
shows an `aria-hidden` `✓` plus exact `Added.` or
`Returned to Breakdown.` copy for `1600ms`, announces that text once through a
polite atomic status, then clears without exit motion. A different new success
replaces the prior signal and restarts once; the same identity, rerender,
hydration, reload, remote arrival, or reconciliation replay never repeats it.
Scratch/route exit clears it, while theme/mode change preserves the remaining
timeline. Add focus stays in its input and Unstage focus stays on the restored
source row. Reduced motion skips the 600ms transition and holds the exact
static success surface/border plus check/copy for the same `1600ms`. The eight
theme role-family mappings are exact in the recipe/tokens; there is no toast,
transform, sparkle, pulse, blink, bounce, spin, flicker, or layout movement.
The durable receipt is
`docs/issues/Issues_Phase_24.Task_107.dp-vq02.json`; it releases only Task 148,
does not change Task 106's Task 141 edge, and was accepted at the Task 107 user
checkpoint on 2026-08-09.

**Observable acceptance:** Add and Unstage share one fully specified, non-repeating realization and an equally meaningful reduced-motion state.

**Verification:** `git diff --check`; trace every value/copy/effect to the receipt and only Task 148 release.

**Commit contract:** the three named documents and `DP-VQ02` receipt only; `docs(triage): record DP-VQ02`.

### Task 108: [x] Record `DP-VQ03` Add-draft departure decision

**Files and actions:** modify `docs/recipes/inbox-triage-breakdown-row-empty-visual-recipe.md`, `docs/DESIGN_TOKENS.md`, and `docs/EXECUTION_PLAN.md` to specify or scope out the app-internal Continue writing / Discard and move surface, exact copy, placement, action hierarchy, focus entry/return, and eight-theme treatment; change no code or Task 139 headless behavior.

**Dependencies:** user decision only; no code prerequisite and no other DP task.

**Decision owner:** User. **Receipt:** `DP-VQ03`. **Exact edge:** Task 140 only. **Resume:** complete internal departure surface accepted or explicitly scoped out.

**Authority / flows:** `VQ-03`, `UF-08`, `NEG-21`.

**Recipe:** [`Breakdown rows and empty states`](../../recipes/inbox-triage-breakdown-row-empty-visual-recipe.md).

**Recorded decision — `DP-VQ03`, Choice A (2026-08-09):** after any required
dirty inline Save resolves, an app-internal Scratch switch, Inbox path change,
or route departure with a non-empty Add draft opens one static decision sheet
in flow immediately below and edge-aligned with the complete Add input/control
row. The draft remains visible. Exact copy is eyebrow `Unsaved Add draft`,
heading `Keep writing?`, body `Continue writing here, or discard this draft and
move.`, primary/default `Continue writing`, and destructive secondary `Discard
and move`; there is no destination interpolation or third action. The sheet is
a labelled/described alert-dialog decision surface: focus enters Continue and
is contained to the two actions. Continue or Escape preserves the draft and
restores the Add caret; Enter activates only the focused action. Discard clears
only the Add draft, performs the latest captured internal destination once,
and hands focus to that destination. A replaced destination preserves the one
sheet and static copy; theme/mode changes swap aliases only. The sheet has no
animation, and reduced motion is identical. It never renders for native unload
and never borrows generic Dialog/AlertDialog, delete/archive, toast, adjacent
card, prototype, or centered-overlay chrome. The eight exact theme-family
mappings are recorded in the recipe and token authority. The durable receipt
is `docs/issues/Issues_Phase_24.Task_108.dp-vq03.json`; it releases Task 140
only, leaves Task 139 headless behavior unchanged, and was accepted at the Task
108 user checkpoint on 2026-08-09.

**Checkpoint acceptance and supersession (2026-08-09):** the user explicitly
replaced the initial review-packet shorthand of placing the sheet immediately
above Add and using the single prompt `Keep writing or discard this draft?`.
Final authority is the recorded in-flow position immediately below the complete
Add input/control row; split exact copy `Unsaved Add draft`, `Keep writing?`,
and `Continue writing here, or discard this draft and move.`; actions `Continue
writing` and `Discard and move`; and Discard's use of Task 139's latest captured
destination exactly once.

**Observable acceptance:** Task 140 needs no inference from delete/archive dialogs or native unload UI, while Task 139 remains independently runnable.

**Verification:** `git diff --check`; confirm native unload remains browser-exit-only and only Task 140 releases.

**Commit contract:** the three named documents and `DP-VQ03` receipt only; `docs(triage): record DP-VQ03`.

### Task 109: [x] Record `DP-VQ04` inline-editor decision

**Files and actions:** modify `docs/recipes/inbox-triage-selected-scratch-context-visual-recipe.md`, `docs/recipes/inbox-triage-breakdown-row-empty-visual-recipe.md`, `docs/DESIGN_TOKENS.md`, and `docs/EXECUTION_PLAN.md` to specify Scratch-title and row-content editor realization across pristine, dirty, validation, saving, offline/not-applied, reconcile, conflict/use-mine/use-latest, lifecycle invalidation, draft review/copy, focus, and themes; change no code or Task 137 headless state.

**Dependencies:** user decision only; no code prerequisite and no other DP task.

**Decision owner:** User. **Receipt:** `DP-VQ04`. **Exact edge:** Task 138 only. **Resume:** one accepted receipt completely defines both editor surfaces.

**Authority / flows:** `VQ-04`, `UF-09`, `UF-10`, `NEG-14`, `NEG-21`.

**Recipe:** [`Selected Scratch Context`](../../recipes/inbox-triage-selected-scratch-context-visual-recipe.md) and [`Breakdown rows and empty states`](../../recipes/inbox-triage-breakdown-row-empty-visual-recipe.md).

**Recorded decision — `DP-VQ04`, Choice A (2026-08-09):** Scratch title and
active Breakdown content replace their source text directly with a labelled
in-place field inside the existing Context title slot or exact row content
slot. Both use the same `pristine`, `dirty`, `validation`, `saving`, `offline`,
`not-applied`, `reconciling`, `conflict`, and `invalidated` state vocabulary,
exact copy/action matrix, mounted-page lifetime, static motion contract, and
eight theme-family mappings recorded in the two recipes and design authority.
Save/Cancel and valid-blur behavior follow SPEC; IME and theme/locale activation
never blur-save. Unknown outcomes reconcile before Retry. Conflict stays inline
with full `Latest version` and `Your draft` regions plus `Use mine`, `Use
latest`, and `Copy draft`; Use mine is a new CAS Save against only the
acknowledged latest version and Use latest writes nothing. Lifecycle
invalidation keeps a full draft review/copy recovery block in the source/former
source position without allowing resurrection. Save-before-action shows one
`Saving before continuing…` intent and `Stay here` cancels only that intent.
Focus, copy status, terminal Save, and invalid-source fallbacks are exact in the
receipt. No generic Dialog/AlertDialog, popover, detached conflict card, toast,
prototype, adjacent UI, repeated motion, or theme-ID behavior branch is
allowed. The durable receipt is
`docs/issues/Issues_Phase_24.Task_109.dp-vq04.json`; it releases Task 138 only,
leaves Task 137 headless state unchanged, and its canonical decision commit did
not itself accept Task 109's then-open `[ ]` marker.

**Checkpoint acceptance and copy supersession (2026-08-09):** the user
accepted the recorded Choice A structure/state model and replaced the initial
review packet's abbreviated shared wording with these exact final strings:
`Offline. Your draft is still here.`, `Not saved. Your draft is still here.`,
`Retry save`, `This changed elsewhere.`, `Latest version`, `Your draft`,
`Draft not saved`, `This Scratch is no longer editable.`,
`This breakdown is no longer editable.`, `Saving before continuing…`, and
`Stay here`. This acceptance releases Task 138 only and leaves Task 137's
headless ownership unchanged.

**Observable acceptance:** Task 138 can implement both complete editors without generic dialogs or invented conflict/offline/copy presentation; Task 137 remains independently runnable.

**Verification:** `git diff --check`; trace every state/focus destination and only Task 138 release.

**Commit contract:** the four named documents and `DP-VQ04` receipt only; `docs(triage): record DP-VQ04`.

### Task 110: [x] Record `DP-VQ05` Add/Delete reliability decision

**Files and actions:** modify `docs/recipes/inbox-triage-breakdown-row-empty-visual-recipe.md`, `docs/DESIGN_TOKENS.md`, and `docs/EXECUTION_PLAN.md` to specify Add pending/failure/reconcile and **Add-only Retry** treatment plus Delete deleting/failure/check-again treatment with no dedicated Delete Retry, exact wording, action placement, timing, focus-visible behavior, and eight-theme mappings; change no code.

**Dependencies:** user decision only; no code prerequisite and no other DP task.

**Decision owner:** User. **Receipt:** `DP-VQ05`. **Exact edge:** Task 143 only. **Resume:** complete Add/Delete reliability realization accepted.

**Authority / flows:** `VQ-05`, `UF-07`, `UF-11`, `NEG-21`.

**Recipe:** [`Breakdown rows and empty states`](../../recipes/inbox-triage-breakdown-row-empty-visual-recipe.md).

**Recorded decision — `DP-VQ05`, Choice A (2026-08-09):** attach one reserved
reliability line to each operation source: a full-width second line inside the
Add input/control grid and a full-width second line inside the exact Delete
source row. Add uses exact `Adding…`, unknown, reconciling, `not_applied`,
rejected, and conflict copy; retains its draft; exposes `Check again` only for
unknown/reconciling; and exposes primary `Retry Add` only for authoritative
`not_applied` with the same operation/row identity and snapshot. Editing then
withdraws Retry; rejected/conflict return to a new ordinary Add attempt.
Delete keeps the authoritative row and its geometry/actions in place across
`Deleting…`, unknown, reconciling, and terminal failure; its only reliability
action is read-only `Check again`, never `Retry`, `Retry Delete`, or `Delete
again`. A later ordinary Trash activation is a new attempt. Add confirmed
success delegates to `DP-VQ02`'s `Added.` row signal; Delete confirmed success
removes the row and uses the SPEC focus/empty/completion handoff with no toast
or placeholder. All state changes are immediate and persistent until replaced,
use one polite atomic announcement, preserve the exact focus rules, use no
repeated/status motion, and share the receipt's eight theme-family mappings
without a prototype, adjacent-surface, or theme-ID branch. The durable receipt
is `docs/issues/Issues_Phase_24.Task_110.dp-vq05.json`; it releases Task 143
only after this Task's user checkpoint, leaves Task 136 headless behavior
unchanged, and its canonical decision commit did not itself accept the
then-open `[ ]` marker.

**Checkpoint acceptance and contract supersession (2026-08-09):** the user
accepted the receipt's complete Add/Delete exact-copy state matrices,
authoritative `not_applied`-only `Retry Add` boundary, read-only `Check again`
and no-Delete-Retry boundary, focus/accessibility rules, and eight-theme
mappings as the final contract replacing the initial review packet's concise
wording. This acceptance releases Task 143 only, completes the approved
`106 → 107 → 108 → 109 → 110` first batch, and grants no authority to start
Task 111 or another batch.

**Observable acceptance:** Add pending, unknown, known failure, Check again, Add-only Retry, and confirmed result remain distinct; Delete failure/unknown keeps the row and exposes Check again/reconciliation with no dedicated Retry, toast, or placeholder fallback.

**Verification:** `git diff --check`; verify the complete state matrix, Add-only Retry wording, explicit absence of Delete Retry, and only Task 143 release.

**Commit contract:** the three named documents and `DP-VQ05` receipt only; `docs(triage): record DP-VQ05`.

### Task 111: [x] Record `DP-VQ06-POOL` Pool-status decision

**Files and actions:** modify `docs/recipes/inbox-triage-scratch-pool-visual-recipe.md`, `docs/DESIGN_TOKENS.md`, and `docs/EXECUTION_PLAN.md` to specify only Pool hidden-selection, count/indicator, remote/lifecycle status, copy, action, focus, dismissal, and eight-theme treatments; change no Staging/Explorer authority and no code.

**Dependencies:** user decision only; no code prerequisite and no other DP task.

**Decision owner:** User. **Receipt:** `DP-VQ06-POOL`. **Exact edge:** Task 144 only. **Resume:** accepted Pool-specific receipt.

**Authority / flows:** Pool slice of `VQ-06`, `UF-03`, `NEG-21`.

**Recipe:** [`Scratch Pool`](../../recipes/inbox-triage-scratch-pool-visual-recipe.md).

**Recorded decision — `DP-VQ06-POOL`, Choice A (2026-08-10):** render one
fixed Pool-local status band directly below the expanded search/sort row and
outside the scrolling Scratch list. The total count always means all active
Scratches; a non-empty query separately renders exact `{visible} of {total}
Scratches`. A hidden selected row keeps its selection/Context and renders
`Selected Scratch is hidden by this search.` plus `Clear search`, which clears
only the query and retains search-field focus. Remote arrivals render exact
singular/plural counts plus `Review new`; that action revalidates and focuses
the first surviving unseen row without selecting it. Non-selected external
archive/delete/restore changes render the exact recipe lifecycle copy plus
`Dismiss`; mixed changes use one ordered aggregate sentence, never a panel or
event history. Selected external removal remains exclusively owned by
`DP-VQ01`. Expanded status has at most one search line and one activity line;
collapsed mode keeps the all-active count and shows non-control `+{count}` and
lifecycle markers. Arrival/lifecycle presentation is mounted-page state with
no timer: selection/sort/collapse/theme changes preserve it, its two actions
clear their categories independently, and route exit/reload clears both.
Arrival never steals focus or selection; changed activity copy is announced
once politely. All transitions and reduced-motion behavior are identical and
immediate with no status animation. The receipt owns the exact eight-theme
Pool mapping and releases Task 144 only after this Task's user checkpoint;
Tasks 112/113 and all Staging/Explorer authority remain untouched.

**Checkpoint acceptance (2026-08-10):** the user independently reviewed and
accepted the fixed status band, Pool-only scope, Task 144-only release, clean
documentation-only write set, and the added mixed-event/collapsed rules as
bounded completion of Choice A rather than a panel or event history. This
acceptance releases Task 144 only. Task 112 may proceed only to its separate
`DP-VQ06-STAGING` user decision; it accepts no Staging choice, Task 147 work,
Task 113 work, product code, publication, or phase close.

**Observable acceptance:** Pool status can be implemented independently without borrowing Staging/Explorer or changing selection.

**Verification:** `git diff --check`; verify Pool-only scope and only Task 144 release.

**Commit contract:** the three named documents and `DP-VQ06-POOL` receipt only; `docs(triage): record DP-VQ06 Pool`.

### Task 112: [x] Record `DP-VQ06-STAGING` Staging-status decision

**Files and actions:** modify `docs/recipes/inbox-triage-staging-visual-recipe.md`, `docs/DESIGN_TOKENS.md`, and `docs/EXECUTION_PLAN.md` to specify only Staging pending/invalid/remote-arrival/orphan/stale/failure/alert/count/action/focus/dismissal and eight-theme treatments; change no Pool/Explorer authority and no code.

**Dependencies:** user decision only; no code prerequisite and no other DP task.

**Decision owner:** User. **Receipt:** `DP-VQ06-STAGING`. **Exact edge:** Task 147 only. **Resume:** accepted Staging-specific receipt.

**Authority / flows:** Staging slice of `VQ-06`, `UF-14`, `UF-16`, `NEG-21`.

**Recipe:** [`Staging`](../../recipes/inbox-triage-staging-visual-recipe.md).

**Recorded decision — `DP-VQ06-STAGING`, Choice A (2026-08-10):** attach
Stage/Unstage pending, unknown, and reconciling copy to one fixed line inside
the affected final-type Node card or Bit row; keep Unstage candidates durable
and non-draggable until authority. Preserve base subsection totals while
placing separate exact `1 new` / `{count} new` actions beside `Nodes` or
`Bits`; arrival preserves focus/scroll, and `Show new {Nodes|Bits}` alone
revalidates, scrolls to top, clears the count, and focuses the first surviving
new candidate without mutation. Place one terminal/integrity alert directly
below the Staging title with the receipt's exact Stage/Unstage failure,
unresolved-source, confirmed-orphan, invalidated-drag, and closed-placement
copy. Its sole action is `X` (`Dismiss Staging alert`); no Retry or permanent
Unstage control exists, a new drag owns permitted retry, and a later failure
replaces the prior alert. Neutral/invalid reasons remain target-attached and
transient. Alerts never auto-dismiss, preserve focus on arrival, and clear only
through the exact receipt lifetime/fallback rules. All transitions and reduced
motion are identically immediate with no status animation. The receipt owns
the eight Staging theme mappings and releases Task 147 only after this Task's
user checkpoint; Tasks 145–146 remain headless owners and Pool/Explorer
authority, Task 113, `DP-VQ02`, and `D-CARD` remain unchanged.

**Checkpoint acceptance (2026-08-10):** the user accepted the complete Choice
A candidate-attached operation status, subsection remote-arrival indicator,
single Staging-local alert, exact state/copy/action/focus/lifetime matrix,
static reduced-motion parity, eight-theme mapping, and Staging-only/Task
147-only boundary. This acceptance releases Task 147 only. Task 113 may
proceed only to its separate `DP-VQ06-EXPLORER` user decision; it accepts no
Explorer choice, Task 150 work, product code, publication, or phase close.

**Observable acceptance:** Staging statuses have direct section-local authority, including alert lifetime and non-focus-stealing remote arrival.

**Verification:** `git diff --check`; verify Staging-only scope and only Task 147 release.

**Commit contract:** the three named documents and `DP-VQ06-STAGING` receipt only; `docs(triage): record DP-VQ06 Staging`.

### Task 113: [x] Record `DP-VQ06-EXPLORER` Explorer-status decision

**Files and actions:** modify `docs/recipes/inbox-triage-grid-explorer-visual-recipe.md`, `docs/DESIGN_TOKENS.md`, and `docs/EXECUTION_PLAN.md` to specify only Explorer remote-path/invalid-suffix/selection-disappearance/status/count/alert/action/focus/dismissal and eight-theme treatments; change no Pool/Staging authority and no code.

**Dependencies:** user decision only; no code prerequisite and no other DP task.

**Decision owner:** User. **Receipt:** `DP-VQ06-EXPLORER`. **Historical exact edge accepted on 2026-08-10:** Task 150 only. **Current execution edge after the user-approved `P28-04` correction on 2026-08-24:** Task 150 except selected-Bit disappearance; Task 151 owns only selected-Bit disappearance in its existing reveal owner. **Resume:** accepted Explorer-specific receipt plus the reflected `P28-04` correction.

**Authority / flows:** Explorer slice of `VQ-06`, `UF-17`, `NEG-21`.

**Recipe:** [`Grid Explorer`](../../recipes/inbox-triage-grid-explorer-visual-recipe.md).

**Recorded decision — `DP-VQ06-EXPLORER`, Choice A (2026-08-10):** place
independent exact `1 new` / `{count} new` remote-insertion actions beside each
affected full Explorer column label and place the one current remote/path
status directly below the surviving destination column label, outside its
scrolling rows. Ordinary insertion preserves path, selection, focus, and the
first-visible stable-ID/viewport-offset anchor. `Show new in {full level}`
alone revalidates, scrolls that column to top, clears its count, and focuses
the first surviving new row without selection/path change. On deleted,
archived, moved, or otherwise unreachable path authority, remove only the
invalid suffix, never substitute a sibling/ghost, close stale placement
without a write, render the receipt's exact fallback copy, and focus the
nearest valid ancestor row or destination full-label heading. Selected Bit
disappearance clears only that selection/reveal and retains the parent path.
The strip's only action is `Dismiss`; it and each per-column count use the
receipt's exact non-timed lifetime. All transitions and reduced motion are
identically immediate with no status animation. The receipt owns the eight
Explorer theme mappings and, as accepted on 2026-08-10, originally released
Task 150 only after this Task's user checkpoint; Pool/Staging, path/anchoring
mechanics, placement, product code, and the separate `VQ-07` search body
remained unchanged.

**Checkpoint acceptance (2026-08-10):** the user accepted the complete Choice
A affected-column remote-arrival count and path-status family, exact
copy/action/fallback/focus/lifetime matrix, stable-ID/viewport-offset
preservation, static reduced-motion parity, eight-theme mapping, and
Explorer-only/Task 150-only boundary. At that 2026-08-10 acceptance, it
released Task 150 only. It did not start Task 114, prepare another Gate C
packet, implement product code, publish, or close the phase.

**Later execution-edge correction — `P28-04` (2026-08-24):** the historical
acceptance and JSON receipt above remain unchanged. The user's targeted
correction supersedes only the current selected-Bit disappearance realization
edge to Task 151's existing reveal production owner. Task 150 retains every
other `DP-VQ06-EXPLORER` realization; Task 151 receives no other VQ-06 state,
and this correction starts neither Task 150 nor Task 151.

**Observable acceptance:** remote-path statuses can be implemented independently without Search/Pool/Staging fallback or focus theft.

**Verification:** `git diff --check`; at the 2026-08-10 checkpoint, verify
Explorer-only scope and the historical Task-150-only release. Current execution
verification follows the `P28-04` split edge recorded above: Task 150 except
selected-Bit disappearance, with only that slice realized by Task 151.

**Commit contract:** the three named documents and `DP-VQ06-EXPLORER` receipt only; `docs(triage): record DP-VQ06 Explorer`.

### Task 114: [x] Record `DP-VQ07` Explorer replacement-search decision

**Files and actions:** modify `docs/recipes/inbox-triage-grid-explorer-visual-recipe.md`, `docs/DESIGN_TOKENS.md`, and `docs/EXECUTION_PLAN.md` to record Choice A: retain Explorer chrome, replace only the four-column body with a fixed full-width search input, fixed state line, and internally scrolling flat typed results; specify exact pre-search/loading/stale/no-results/error/duplicate/reveal/source-restoration copy, focus, DnD interruption/reopen, close semantics, event-owned lifetime, static reduced-motion parity, eight-theme mapping, and a search-result Undo slot bounded by later `DP-VQ10`; change no query behavior/code.

**Dependencies:** user decision only; no code prerequisite and no other DP task.

**Decision owner:** User. **Receipt:** `DP-VQ07`. **Selected decision:** `DP-VQ07=A` on 2026-08-10. **Exact edge:** Task 151 and search-only integration Task 158 after Task 114 checkpoint acceptance; Task 158 still requires `DP-VQ10` and Tasks 156–157, while ordinary-card Undo Task 156 is not blocked. **Resume:** explicit Task 114 user acceptance of the recorded complete search body.

**Authority / flows:** `VQ-07`, `UF-18`, `UF-19`, `NEG-10`, `NEG-21`.

**Recipe:** [`Grid Explorer`](../../recipes/inbox-triage-grid-explorer-visual-recipe.md).

**Checkpoint acceptance (2026-08-10):** the user explicitly accepted the
complete Choice A fixed-input/state-line/flat-result replacement body, exact
state/duplicate/reveal/source-restoration copy, focus/close/DnD interruption
matrix, event-owned lifetime, static reduced-motion parity, eight-theme
mapping, and Task 151/search-only Task 158 boundary. This acceptance releases
Task 151 and only the search-result integration slice of Task 158, subject to
their own prerequisites; Task 158 still requires `DP-VQ10` and Tasks 156–157,
and ordinary-card Undo Task 156 remains independent. It does not start Task
115, change product code, publish, or close the phase.

**Observable acceptance:** the approved direct body covers its fixed placement, complete state copy, duplicate text, result/retry/close actions, Arrow/Enter/Escape and deterministic focus, valid/stale reveal split, DnD-only interruption preservation, result Undo placement/focus, event-owned lifetime, static reduced-motion parity, and all eight themes without active-column/global Search, ordinary-column, prototype, adjacent-surface, or theme-ID fallback; unrelated ordinary Undo remains runnable.

**Verification:** `git diff --check`; verify complete close/interruption matrix and only search tasks release.

**Commit contract:** the three named documents and `DP-VQ07` receipt only; `docs(triage): record DP-VQ07`.

### Task 115: [x] Record `DP-VQ08` placement-reliability decision

**Files and actions:** modify `docs/recipes/inbox-triage-placement-affordances-visual-recipe.md`, `docs/DESIGN_TOKENS.md`, and `docs/EXECUTION_PLAN.md` to record Choice A: one fixed two-line reliability rail inside the captured target-column Placement Affordance, below its retained source/type/destination summary and above one fixed action row; specify exact pending, unknown/reconciling, authoritative not-applied, stale source/target, `Check again`, Retry/Cancel, success announcement/handoff, current-action focus, lifetime, static reduced-motion parity, and eight-theme treatments; change no code.

**Dependencies:** user decision only; no code prerequisite and no other DP task.

**Decision owner:** User. **Receipt:** `DP-VQ08`. **Selected decision:** `DP-VQ08=A` on 2026-08-10. **Exact edge:** Task 153 only after Task 115 checkpoint acceptance. **Resume:** explicit Task 115 user acceptance of the recorded complete fixed-rail realization.

**Authority / flows:** `VQ-08`, `UF-20`, `UF-21`, `NEG-18`, `NEG-21`.

**Recipe:** [`Placement affordances`](../../recipes/inbox-triage-placement-affordances-visual-recipe.md).

**Selected realization:** retain the captured affordance and its source/type/
destination summary for every nonterminal outcome. Pending retains focus on
rendered unavailable Confirm; unknown exposes and focuses read-only `Check
again`; reconcile retains that action position; authoritative `not_applied`
focuses `Retry` before `Cancel`; stale source/target focuses sole `Cancel`;
returned authoritative facts classify rejected/conflict into that exact stale
source/target split without a generic fallback or guessed side;
authoritative success announces once, removes the affordance without a timer or
decorative result, and focuses the actual card. Exact copy, event-owned
lifetime, static motion/reduced-motion parity, and all eight theme-role
bindings are owned by the accepted receipt. No toast/dialog/adjacent fallback,
optimistic source/result change, automatic target correction, or theme-ID
product branch is permitted.

**Checkpoint acceptance (2026-08-10):** the user explicitly accepted the
complete Choice A fixed reliability rail, seven exact state families/copy,
authoritative-result mapping, current-action focus, operation-owned lifetime,
static reduced-motion parity, eight-theme mapping, and Task 153-only boundary.
This acceptance releases Task 153 only. It does not start Task 116, change
product code, publish, or close the phase.

**Observable acceptance:** every nonterminal outcome stays in the captured placement affordance with an exact focus target and no toast/dialog fallback.

**Verification:** `git diff --check`; confirm no optimistic result/alternate-target implication and only Task 153 release.

**Commit contract:** the three named documents and `DP-VQ08` receipt only; `docs(triage): record DP-VQ08`.

### Task 116: [x] Record `DP-VQ09` Result Title/direct-limit decision

**Files and actions:** modify `docs/recipes/inbox-triage-placement-affordances-visual-recipe.md`, `docs/DESIGN_TOKENS.md`, and `docs/EXECUTION_PLAN.md` to record Choice A: one compact staged over-limit Result Title step and one compact direct Node/Bit availability step inside the captured target-column Placement Affordance; specify exact copy/reasons, non-truncating validation, Continue/Cancel, source preservation, focus/invalidation, static reduced-motion parity, and eight-theme treatment; change no code.

**Dependencies:** user decision only; no code prerequisite and no other DP task.

**Decision owner:** User. **Receipt:** `DP-VQ09`. **Selected decision:** `DP-VQ09=A` on 2026-08-11. **Exact edge:** Task 154 only after Task 116 checkpoint acceptance. **Resume:** explicit Task 116 user acceptance of the recorded complete compact-step realization.

**Authority / flows:** `VQ-09`, `UF-23`, `NEG-21`.

**Recipe:** [`Placement affordances`](../../recipes/inbox-triage-placement-affordances-visual-recipe.md).

**Selected realization:** staged placement opens a compact `RESULT TITLE` /
`Name this {Node|Bit}` step only when the source exceeds the chosen type limit.
It starts with an empty `Result title` draft, shows source count/type limit,
validates without clipping or truncation, keeps the source unchanged, and uses
exact `Continue` / `Cancel` with input-first focus. Direct placement keeps its
compact `DIRECT PLACEMENT` / `Choose a result type` step and never exposes an
editor: `1–100` enables Node/Bit, `101–200` disables Node with its exact
accessible reason, and `201–1000` disables both with exact per-type reasons and
the instruction to Cancel and stage first. Cancel/Escape or authoritative
source/target/path invalidation writes nothing, discards only the draft, and
returns to the surviving source or owning heading. All eight themes share one
semantic order with static reduced-motion-identical transitions; no create or
generic dialog, hidden editor, automatic fallback, or theme-ID branch is
permitted.

**Checkpoint acceptance (2026-08-11):** the user explicitly accepted the
complete Choice A compact staged Result Title step, direct Node/Bit limit
matrix and reasons, non-truncating validation/source preservation,
focus/invalidation behavior, static reduced-motion parity, eight-theme
mapping, and Task 154-only boundary. This acceptance releases Task 154 only.
It does not start Task 117, change product code, publish, or close the phase.

**Observable acceptance:** Task 154 can handle over-limit staged/direct text without source edits, truncation, create dialogs, or a hidden editor.

**Verification:** `git diff --check`; verify both surfaces and only Task 154 release.

**Commit contract:** the three named documents and `DP-VQ09` receipt only; `docs(triage): record DP-VQ09`.

### Task 117: [x] Record `DP-VQ10` Newly/Undo decision

**Files and actions:** modify `docs/recipes/inbox-triage-newly-placed-undo-visual-recipe.md`, `docs/DESIGN_TOKENS.md`, and `docs/EXECUTION_PLAN.md` to record Choice A: retain the actual common Node/Bit card and add a static Newly marker, separate stable Undo action, and card-attached always-visible status rail; specify selected+newly overlap, available/ineligible/re-enabled Undo, accessible exact reasons, undoing/failure/reconcile/retry/conflict, placement, copy, timing, focus, static reduced-motion parity, and eight-theme mappings; change no common-card design or code.

**Dependencies:** user decision only; no code prerequisite and no other DP task.

**Decision owner:** User. **Receipt:** `DP-VQ10`. **Selected decision:** `DP-VQ10=A` on 2026-08-11. **Exact edge:** Task 157 only after Task 117 checkpoint acceptance. **Resume:** explicit Task 117 user acceptance of the recorded complete card-attached rail realization.

**Authority / flows:** `VQ-10`, `UF-24`, `UF-25`, `NEG-11`, `NEG-21`, `D-CARD`.

**Recipe:** [`Newly placed and Undo`](../../recipes/inbox-triage-newly-placed-undo-visual-recipe.md).

**Selected realization:** keep existing selection and common-card internals
unchanged; add a static theme-native Newly marker at the actual card, one
separate trailing Undo slot, and one compact always-visible status rail directly
below that card in the same Explorer item wrapper. The rail shows exact
available, dependency/result/placement/operation/Edit-blocked, re-enabled,
pending, unknown/reconciling, not-applied, and conflict copy without hover or a
late-error action. `Check again` reconciles without resend; `Retry` exists only
after authoritative `not_applied`; success announces source restoration and
removes the result only after commit. Focus remains in the card context, marker
provenance survives ineligibility, and every theme uses static source-backed
marker/control grammar with no pulse, common-card redesign, adjacent fallback,
or theme-ID branch.

**Checkpoint acceptance (2026-08-11):** the user explicitly accepted the
complete Choice A card-attached always-visible status rail, independent
selection/Newly/eligibility semantics, exact unavailable/re-enabled and
operation/recovery copy, focus/lifetime behavior, static reduced-motion parity,
eight-theme mapping, and Task 157-only boundary. This acceptance releases Task
157 only. It does not start Task 118, Task 157, Tasks 155–156, or Task 158,
change product code/common-card design, publish, or close the phase.

**Observable acceptance:** marker, selection, and eligibility remain distinct; reasons are non-hover-only; no repeated motion or card redesign is required.

**Verification:** `git diff --check`; confirm `D-CARD` remains excluded and only Task 157 release.

**Commit contract:** the three named documents and `DP-VQ10` receipt only; `docs(triage): record DP-VQ10`.

### Task 118: [x] Record `DP-VQ11` completion-blocker decision

**Files and actions:** modify `docs/recipes/inbox-triage-selected-scratch-context-visual-recipe.md`, `docs/recipes/inbox-triage-breakdown-row-empty-visual-recipe.md`, `docs/recipes/inbox-triage-archive-completion-visual-recipe.md`, `docs/DESIGN_TOKENS.md`, and `docs/EXECUTION_PLAN.md` to record Choice A: keep the Add-draft blocker immediately below the Add row, keep every Task 137 Scratch-title blocker in the existing Context editor status region, and replace withdrawn overlay/complete/reopen with one exact persistent status in the vacated Breakdown completion slot. Specify exact state copy, existing-action-only behavior, aggregate active-row/Staging causes, effect, focus, lifetime, static reduced-motion parity, and eight-theme mappings; change no completion predicate/headless behavior.

**Dependencies:** user decision only; no code prerequisite and no other DP task.

**Decision owner:** User. **Receipt:** `DP-VQ11`. **Exact edge:** Task 160 only. **Resume:** accepted complete blocker/withdrawal realization.

**Authority / flows:** `VQ-11`, `UF-26`, `UF-27`, `NEG-21`.

**Recipe:** [`Selected Scratch Context`](../../recipes/inbox-triage-selected-scratch-context-visual-recipe.md), [`Breakdown rows and empty states`](../../recipes/inbox-triage-breakdown-row-empty-visual-recipe.md), and [`Archive completion`](../../recipes/inbox-triage-archive-completion-visual-recipe.md).

**Selected decision (2026-08-11):** `DP-VQ11=A` uses exact Add copy `Add this idea or clear the draft to complete this Scratch.` and exact title-snapshot copy for `open|dirty`, `saving`, `conflicted`, and `reconciling` inside their source regions. Persisted eligibility loss after completion was presented removes the scrim/card, complete Context, and Reopen first, then reports the exact active-Breakdown, Staging, or combined cause in the vacated completion slot. Blockers do not change persisted eligibility; withdrawal never leaves a disabled stale Archive action.

The approved presentation adds no completion action. Existing Add/text editing and `DP-VQ04` editor actions remain the only resolution paths. Blockers retain source focus; local eligibility-changing actions retain canonical focus; remote changes do not steal it; removal of a focused Archive/Cancel/Reopen target falls back to the Breakdown heading. Status persists only with the mounted-page cause, recovery returns presentation ownership to Task 159, and every theme uses source/completion-slot roles with immediate static reduced-motion-identical changes. No toast, dialog, ordinary-empty replacement, global/detached panel, auto-Add/Save/Cancel/Archive, timer, repeated motion, persistence, or theme-ID product branch is allowed.

**Implementation boundary:** Task 160 only may realize this receipt after Task 118 checkpoint acceptance and its other prerequisites. Task 118 changes no product source, completion predicate, Task 137/159 headless behavior, Archive transaction, `VQ-12`, Task 119, or Task 160 implementation.

**Checkpoint acceptance (2026-08-11):** the user explicitly accepted the
complete Choice A source-attached Add/title blockers, exact completion-slot
eligibility-withdrawal causes, existing-action-only behavior, focus/lifetime/
recovery contract, static reduced-motion parity, eight-theme mapping, and Task
160-only boundary. This acceptance releases Task 160 only. It does not start
Task 119 or Task 160, change product code, completion predicates/headless
behavior, or Archive transaction behavior, publish, or close the phase.

**Observable acceptance:** blockers preserve drafts/editors and logical focus with exact source-attached copy; actual eligibility loss removes all stale completion controls and has exact persistent section-local reporting; recovery follows current truth without auto-save/submit/archive or a transient timer.

**Verification:** `git diff --check`; trace Add plus all five Task 137 blocker snapshots, all three withdrawal causes, focus/lifetime/reduced-motion/eight-theme mappings, unchanged completion predicate/headless behavior, and only Task 160 release.

**Commit contract:** the five named documents and `DP-VQ11` receipt only; `docs(triage): record DP-VQ11`.

### Task 119: [x] Record `DP-VQ12` Archive-recovery decision

**Files and actions:** modify `docs/recipes/inbox-triage-archive-completion-visual-recipe.md`, `docs/DESIGN_TOKENS.md`, and `docs/EXECUTION_PLAN.md` to record Choice A: keep one stable Breakdown-scoped Archive card and original-position current-action slot while its static mark, exact sentence, and allowed action change in place through pending, unknown, reconciling, explicit failure, forced-reload recovery, and authoritative success. Specify check-again, authoritative `not_applied`-only Retry, terminal Cancel, terminal handoff, focus, timing, reduced-motion parity, and eight-theme variants; change no code.

**Dependencies:** user decision only; no code prerequisite and no other DP task.

**Decision owner:** User. **Receipt:** `DP-VQ12`. **Exact edge:** Task 162 only. **Resume:** accepted complete Archive reliability/recovery realization.

**Authority / flows:** `VQ-12`, `UF-28`, `NEG-17`, `NEG-20`, `NEG-21`.

**Recipe:** [`Archive completion`](../../recipes/inbox-triage-archive-completion-visual-recipe.md).

**Selected decision (2026-08-11):** `DP-VQ12=A` preserves one card/one current-
action locus. Pending retains inactive current-action focus; unknown exposes
read-only `Check again`; reconciliation retains the same descriptor and never
resends; only authoritative `not_applied` exposes Retry plus Cancel; storage
failure/rejected/conflict expose Cancel only; forced reload reconciles before
initial Inbox projection; and authoritative success performs the canonical
visible-order/null/empty handoff without a lingering success card. Every state
uses exact static copy/non-color marking, polite atomic announcement, identical
reduced-motion behavior, and the approved eight-theme single-card mapping.

**Implementation boundary:** Task 162 only may realize this receipt after Task
119 checkpoint acceptance and its other prerequisites. Task 119 changes no
product source, SCHEMA Archive transaction/result/reconciliation rule, Task
126/161 behavior, persistence, Release edge other than Task 162, or Phase 24
close state.

**Checkpoint acceptance (2026-08-11):** the user explicitly accepted the
complete Choice A stable single-card Archive pending/unknown/reconciliation/
failure/reload-recovery contract, exact copy/actions/focus/lifetime/static-
motion behavior, eight-theme mapping, and Task 162-only boundary. This
acceptance releases Task 162 only. It does not start Task 162, choose the next
Phase 24 lifecycle action, change product or Archive transaction behavior,
publish, or close the phase.

**Observable acceptance:** known failure, unknown outcome, recovery, Retry, Cancel, and success are fully specified inside the Breakdown-scoped flow.

**Verification:** `git diff --check`; verify reload/unknown/terminal distinctions and only Task 162 release.

**Commit contract:** the three named documents and `DP-VQ12` receipt only; `docs(triage): record DP-VQ12`.
