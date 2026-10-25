# Phase 27 — Breakdown, Pool, And Staging Interactions

## Completion Summary

Tasks 136–148 were explicitly accepted on the isolated
`phase-27/breakdown-pool-staging-interactions` branch. The phase connects the
authoritative Breakdown, Pool, and Staging interaction adapters and their
approved visual/status realizations without starting Task 149 or Phase 28.

| Task | Accepted deliverable | Implementation / evidence | Acceptance |
| --- | --- | --- | --- |
| 136 | Locked authoritative Breakdown Add/Delete behavior | `cf0b08d` → `318739f` | `02675c3` |
| 137 | Headless conditional editor and blocker state | `bba0da0` → `d0bc011` | `47269fb` |
| 138 | Fixed-geometry `DP-VQ04` inline editors | `68534d0` → `a7ab647` | `17babba` |
| 139 | Add-draft departure coordination | `d987ed2` → `0dcaf26` | `23da87d` |
| 140 | `DP-VQ03` departure confirmation and focus handoff | `0e2abd6` → `fba3e81` | `8015a98` |
| 141 | `DP-VQ01` external Scratch-removal transition | `9a804f6` → `383ae7d` | `310b575` |
| 142 | Canonical triage pointer sources and snapshots | `a851f35` → `52d8fd4` | `e323a4a` |
| 143 | `DP-VQ05` Add/Delete reliability states | `5936569` → `5ce2ddf` | `8022301` |
| 144 | `DP-VQ06-POOL` Pool statuses | `d25ec44` → `86efb2b` | `cdc0243` |
| 145 | Current-snapshot Stage/Unstage adapters | `21d87bd` → `27298c1` | `3fb1155` |
| 146 | Remote candidate and integrity reconciliation | `8809a74` → `7dc8ca6` | `d8ba3e2` |
| 147 | `DP-VQ06-STAGING` Staging statuses | `a9e02b2` + `79a3aad` → `55e7e2e` | `841d6cc` |
| 148 | `DP-VQ02` Add/Unstage one-shot success signals | `47f44d7` → `29c383b` | `f5940fc` |

Post-acceptance conformance and bounded-smoke repairs were accepted separately:
`P27-11` at `9a27ff7` with acceptance commit `2d9ec7d`, and `P27-12` /
`P27-13` at `31bf96c` with acceptance commit `983595c`. The final accepted
`src` tree is `7b831a941d40631c2212d07a010f3c6b4a00e01a`.

## Accepted Foundation

- Breakdown Add/Delete and inline editing preserve authoritative source truth,
  shared-operation locking, deterministic focus, and exact reconciliation.
- Draft departure and external Scratch removal use their approved decision and
  recovery surfaces without mutating the destination before authorization.
- Pool and Staging status families use typed authoritative provenance and
  preserve their mounted-session lifetimes, focus, and reduced-motion rules.
- Pointer Stage/Unstage uses current snapshots, transient targets, durable
  candidates, invalidation-safe release, restored source order/focus, and no
  permanent Unstage control or success toast.
- Add/Unstage success is row-attached, authoritative, one-shot, and does not
  replay after reload.

## Verification And Acceptance

Every task has a durable implementation/evidence boundary and explicit user
acceptance in [`docs/issues/Issues_Phase_27.md`](../../issues/Issues_Phase_27.md).
Accepted task-level browser, cross-tab, theme, and reduced-motion evidence is
reused without repetition. Phase-level manual-smoke evidence remains reserved
for the single Final Close packet.

The fresh end-phase terminal gate ran at pre-close
`983595cd40f491a40bb4c1a474058596b061d01e`:

| Command | Exit | Result |
| --- | ---: | --- |
| `pnpm test` | 0 | 95 test files / 982 tests passed |
| `pnpm lint` | 0 | 0 errors; 11 pre-existing warnings |
| `pnpm typecheck` | 0 | TypeScript check passed |
| `pnpm build` | 0 | Next.js 16.2.1 production build passed; seven pages generated |
| `git diff --check` | 0 | No whitespace errors at pre-close |

## Canonical Reconciliation And Handoff

- `P27-01`–`P27-05`, `P27-07`, and `P27-09`–`P27-13` are Closed and
  their canonical impacts are Reflected or implementation-local None.
- `P27-06` remains explicitly Deferred: the pre-existing persisted-dark
  `ThemeToggle` hydration mismatch requires a future lifecycle.
- `P27-08` remains explicitly Deferred: confirmed-orphan production/browser
  reachability requires future remote-authority work.
- `P23-02` is resolved by accepted Task 136 and synchronized to the central
  deferred index.
- Blocking conformance violations: 0. Advisory conformance violations: 0.
- Phase Notes are not used by adapter policy.
- Pinned pre-close SHA: `983595cd40f491a40bb4c1a474058596b061d01e`.
- Fresh fetched integration `main`: `3829a789e5666778267070cf830c022cbe447e57`.
- Conflict-free merge-tree: `7406700dc37119118c339e2f091ac0424bd0bfa6`.
- Phase 27 completion starts neither Task 149 nor Phase 28; both require their
  own explicit lifecycle authority.

**Full issue log:**
[`docs/issues/Issues_Phase_27.md`](../../issues/Issues_Phase_27.md)

## Task Contracts

The accepted task contracts, moved verbatim from `docs/EXECUTION_PLAN.md`
on 2026-10-25; relative links are rebased to this folder.

### Task 136: [x] Connect headless Add and Delete interaction behavior

**Files and actions:** create mounted-page `src/hooks/use-triage-operation-lock.ts` and `.test.tsx`; modify `src/components/triage/breakdown-panel.tsx` and `.test.tsx`, `src/components/triage/triage-workspace.tsx` and `.test.tsx`, `src/components/triage/scratch-pool.tsx` and `.test.tsx`, and `src/hooks/use-scratch-breakdowns.ts` and `.test.tsx`. Remove the retired test-only `deleteScratchBreakdownsByScratch` mock and its now-vacuous no-call assertion from `src/hooks/use-scratch-breakdowns.test.tsx` (`P23-02`) while replacing that hook's legacy mutation surface. The Workspace-mounted owner exposes synchronous `acquire(kind, operationId)`, `activeOperation`, and terminal `release` for `add|delete|edit|stage|unstage|placement|undo|archive`; acquisition occurs before any asynchronous gap, rejects a duplicate or competing owner, queues nothing, survives pending/unknown/reconciling, and releases only on terminal `applied|not_applied|rejected|conflict`. Its single signal locks Scratch switch, internal route/browser exit, Edit, Placement, Undo, Archive, Cancel/Escape, and duplicate action. Wire Add/Delete acquisition plus base Breakdown Cancel/Escape/duplicate gating and Pool Scratch-switch gating here; Tasks 137, 139, 145, 152, 156, and 161 wire the remaining exact consumers. Dispatch Task 120 Add/Delete commands, retain authoritative rows/drafts through pending or unknown outcomes, submit Add only by Enter or explicit Add, scroll a confirmed row into view with the minimum handoff that keeps the row visible without unnecessarily moving the complete Context, and restore focus after confirmed Delete in the order next row → previous row → Add input → Context. Expose typed operation state slots without choosing `VQ-05` appearance.

**Dependencies:** Tasks 120, 128, 130, and 132.

**Authority / flows:** `P23-02`; `UF-07`, `UF-11`, `UF-12`; `AF-02`, `AF-07`; `NEG-09`.

**Recipe:** [`Breakdown rows and empty states`](../../recipes/inbox-triage-breakdown-row-empty-visual-recipe.md).

**Observable acceptance:** blur never submits; duplicate Enter/click or a competing operation produces one command total; unknown Add keeps draft, operation identity, and the complete shared lock; Delete keeps row until terminal success; terminal results release once; Scratch switch and Cancel/Escape are denied while locked without mutation or queued replay; focus/scroll handoff follows the exact order. At the canonical `1440×900` GridDO light viewport with default `DESC` sort, confirmed Add leaves the complete Selected Scratch Context and the new top Breakdown row simultaneously visible while Add input focus and the one-shot `Added.` identity/lifetime remain unchanged; `ASC` still reveals its new row.

**Verification:** focused operation-lock/Breakdown/Workspace/Pool/hook tests; assert every operation kind against the complete mutual-exclusion matrix and terminal release contract, including authoritative Add/Delete reconciliation and terminal release at hook level. In the canonical route, run Enter/Add, blur, duplicate/competing intent, Scratch switch, Cancel/Escape, unknown row/lock retention and blocked actions, failed Delete, and confirmed focus/scroll paths, recording interactions/focus in `docs/verification/inbox-triage/task-136.md`. Task 143 owns route-level `Check again` → reconciliation → terminal release/focus because it adds that production trigger; `pnpm typecheck`.

**Commit contract:** mounted-page operation lock, headless Add/Delete adapter, the exact `P23-02` stale-test cleanup, owner tests, and Task 136 evidence only; `feat(triage): connect locked breakdown commands`. The user-approved `P27-01` canonical repair is a documentation-only exception limited to this Task 136 verification clause, Task 143's verification clause, the Phase 27 issue ledger, and Task 136 evidence; it changes no product code, tests, or task marker.

### Task 137: [x] Build headless conditional editor and blocker state

**Files and actions:** modify `src/hooks/use-scratch-breakdowns.ts` and `.test.tsx`, `src/components/triage/breakdown-panel.tsx` and `.test.tsx`, and `src/components/triage/triage-workspace.tsx` and `.test.tsx`; extend `src/hooks/use-triage-operation-lock.test.tsx`. Model mounted-page Scratch-title/row base snapshot, draft, pristine/dirty/validation/saving/offline/not-applied/reconciling/conflict/invalidation, acknowledged latest version, copyable invalidated draft, and save-before-action intent over Task 120. Consume Task 136's shared signal: another active operation blocks opening/saving Edit, while an Edit save synchronously acquires `edit` before dispatch and retains the full matrix through unknown/reconciling until terminal release. Expose a synchronous typed Scratch-title blocker snapshot (`open|dirty|saving|conflicted|reconciling`) to external-removal/completion/Archive coordinators. Implement conditional command/focus semantics in tests but render no missing VQ-04 surface and no generic dialog.

**Dependencies:** Tasks 120, 132, and 136.

**Authority / flows:** `UF-09`, `UF-10`; `AF-05`, `AF-06`; `NEG-14`, `NEG-15`, `NEG-19`.

**Recipe:** [`Selected Scratch Context`](../../recipes/inbox-triage-selected-scratch-context-visual-recipe.md) and [`Breakdown rows and empty states`](../../recipes/inbox-triage-breakdown-row-empty-visual-recipe.md).

**Observable acceptance:** the state machine distinguishes every authoritative result, `use mine` targets only acknowledged latest version, `use latest` writes nothing, staged/lifecycle-invalid rows cannot save, and blocker reads are synchronous without requiring Task 138 visuals.

**Verification:** focused operation-lock/hook/Breakdown/Workspace state-machine tests for blocked Edit open/save, Edit acquisition, duplicate/competing action, terminal release, ABA, offline, reconciliation, conflicts, invalidation, save-before-action, blocker snapshots, and deterministic focus intents; `pnpm typecheck`.

**Commit contract:** headless editor/blocker model and tests only; `feat(triage): model conditional inline edits`.

### Task 138: [x] Render `DP-VQ04` inline editors

**Files and actions:** after `DP-VQ04`, modify `src/components/triage/breakdown-panel.tsx` and `.test.tsx` plus `src/app/globals.css` to replace only the Scratch-title and Breakdown-content inline-editor visual realization with the user-approved fixed geometry. Preserve view/edit outer geometry and drag/content/action anchors; reserve a fixed `9.5rem` action region; keep text-style Save/Cancel with dirty Save in destructive/red emphasis; cap the single-line Scratch title at 60 characters and Breakdown content at 120; allow browser-managed caret-following horizontal movement with `Home` returning to the start and `End` exposing the terminal caret; render no textarea, resize, vertical scrolling, or visible scrollbar. Ordinary states have no visible status row, saving/reconciling retain the read-only field with a fixed progress action, and offline/not-applied/conflict/invalidated use the source-bound fixed overlay over blurred underlying content. Conflict exposes Use mine, Use latest, and Copy draft without expanding comparison regions. Preserve all Task 137 state/lock/blocker/focus semantics and never use generic Dialog/AlertDialog.

**Dependencies:** Tasks 109, 128, and 137.

**Authority / flows:** `DP-VQ04`, `UF-09`, `UF-10`; `NEG-14`, `NEG-21`.

**Recipe:** [`Selected Scratch Context`](../../recipes/inbox-triage-selected-scratch-context-visual-recipe.md) and [`Breakdown rows and empty states`](../../recipes/inbox-triage-breakdown-row-empty-visual-recipe.md).

**Observable acceptance:** both editors retain their source geometry and fixed action/content boundary in every state; limits, single-line behavior, and `Home`/`End` caret-following movement match the approved contract; ordinary status rows stay absent; progress and source-bound overlay states do not move anchors or expand comparison regions; Cancel restores current truth; invalidation preserves review/copy; no inline literal or adjacent fallback appears.

**Verification:** focused editor tests for both surfaces' fixed geometry, limits, action boundary, ordinary/progress/overlay states, and `Home`/`End` caret-following behavior; retain the previously accepted Task 138 state/keyboard/IME/focus contract and record canonical repair evidence/captures in `docs/verification/inbox-triage/task-138.md`; run the adapter-declared full gate.

**Commit contract:** DP-VQ04 copy, realization, tests, styles, and Task 138 evidence only; `feat(triage): render conditional inline editors`.

### Task 139: [x] Build headless Add-draft departure coordination

**Files and actions:** create `src/hooks/use-triage-departure.ts` and `.test.tsx`; modify `src/components/triage/triage-workspace.tsx` and `.test.tsx`, `src/components/triage/breakdown-panel.tsx` and `.test.tsx`, `src/components/triage/scratch-pool.tsx` and `.test.tsx`, `src/components/triage/hierarchy-explorer.tsx` and `.test.tsx`, `src/components/layout/sidebar.tsx` and `.test.tsx`, and `src/components/layout/search-overlay.tsx` and `.test.tsx`; extend `src/hooks/use-triage-operation-lock.test.tsx`. The hook is the minimum mounted-page common coordination owner: Workspace registers the active controller, while the actual Pool, Explorer, Sidebar, and global Search owners request departure before calling their selection/path/router mutations. Detect non-empty Add draft synchronously; capture one app-internal Scratch/path/route destination; expose Continue writing and Discard and move transitions; replace a stale destination deterministically; clear only the Add draft on discard; and hand focus to the performed destination's captured canonical focus owner. Scratch and Explorer owners must guard before mutation and must not use post-mutation rollback. Sidebar and global Search cover the actual SPA exits available from Inbox; Inbox does not render Breadcrumbs or GridView, so those inactive owners remain unchanged. Consume Task 136's shared signal before draft handling: any active operation rejects internal Scratch/path/route exit, and the browser/native exit owner installs the standard `beforeunload` prevention while locked; neither path clears, cancels, queues, or replays an intent. Keep browser/native unload presentation separate and render no VQ-03 surface.

**Dependencies:** Tasks 136 and 137.

**Authority / flows:** `UF-08`; `AF-05`; `NEG-17`, `NEG-21`.

**Recipe:** [`Breakdown rows and empty states`](../../recipes/inbox-triage-breakdown-row-empty-visual-recipe.md).

**Observable acceptance:** Scratch selection, Explorer path, and Inbox SPA route are synchronously blocked or captured before their actual state/router mutation; Continue performs no destination, preserves the Add draft, and restores its focus; Discard clears only that draft, performs the latest captured destination exactly once, and hands off destination focus; every shared-lock kind blocks internal and browser exit without state/router mutation, clear, queue, or replay; competing/stale destinations never leak; external-removal/completion logic can query the headless controller without Task 140; no post-mutation rollback or `DP-VQ03` DOM/copy/style exists.

**Accepted dependency repair — `P27-04` (2026-08-18):** Task 140's
canonical-route verification proved that synchronous Discard destination focus
can run while the decision sheet and surrounding `inert` state are still
committed, so the focus attempt is rejected and focus falls to `BODY` when the
Discard action unmounts. The user approved reopening only
`src/hooks/use-triage-departure.ts` and its test inside Task 140's fourth
bounded repair cycle. Preserve the latest destination's focus intent and run
that focus exactly once in the layout phase after `pendingDestination=null`
has committed; keep the destination mutation synchronous and exactly once.
This is a timing-only dependency repair: Task 139 remains accepted and its
meaning, direct no-draft behavior, Continue behavior, blocking, replacement,
and no-queue/no-replay contracts do not change.

**Verification:** focused operation-lock/controller/Workspace/Breakdown tests for every lock kind against internal route and `beforeunload` exit, mouse/keyboard destinations, replacement, cancellation, focus intent, no queued replay, and no VQ DOM; `pnpm typecheck`.

**Commit contract:** headless departure controller and tests only; `feat(triage): coordinate add draft departure`.

### Task 140: [x] Render `DP-VQ03` departure confirmation

**Files and actions:** after `DP-VQ03`, modify `src/components/triage/triage-workspace.tsx` and `.test.tsx`, `src/components/triage/breakdown-panel.tsx` and `.test.tsx`, `src/app/globals.css`, `src/lib/copy/inbox-triage.ts` and `.test.ts` to populate approved wording and render Task 139's Continue writing / Discard and move surface, hierarchy, focus containment/return, theme mapping, and scope-out behavior exactly. The user-approved fourth bounded repair cycle additionally reopens only `src/hooks/use-triage-departure.ts` and `.test.tsx` for the accepted `P27-04` post-commit destination-focus dependency repair; it changes no Task 139 meaning, consumer, destination mutation, navigation, queue, or replay behavior.

**Dependencies:** Tasks 108, 128, and 139.

**Authority / flows:** `DP-VQ03`, `UF-08`; `NEG-17`, `NEG-21`.

**Recipe:** [`Breakdown rows and empty states`](../../recipes/inbox-triage-breakdown-row-empty-visual-recipe.md).

**Observable acceptance:** the approved internal surface is used only for Add-draft departure; actions produce Task 139 transitions exactly; native unload and unrelated confirmations remain separate.

**Verification:** focused component/copy tests; run Scratch/path/route departure with both actions, competing destinations, keyboard/focus, themes, and scope-out case, recording `docs/verification/inbox-triage/task-140.md`; `pnpm typecheck`.

**Commit contract:** DP-VQ03 copy/realization, tests, styles, and Task 140 evidence only; `feat(triage): render add draft departure`.

### Task 141: [x] Render `DP-VQ01` external Scratch-removal transition

**Files and actions:** after `DP-VQ01`, modify `src/components/triage/scratch-pool.tsx` and `.test.tsx`, `src/components/triage/triage-workspace.tsx` and `.test.tsx`, `src/stores/triage-store.ts` and `.test.ts`, `src/app/globals.css`, `src/lib/copy/inbox-triage.ts` and `.test.ts`. Use headless Tasks 137/139—not VQ-03/04 visuals—to realize external archive/delete countdown, pause/resume, destination revalidation/replacement, full draft copy/status, authoritative restore, terminal removal, selection, and focus exactly. Do not borrow Archive/dialog/Pool chrome. The user-approved `P27-11` conformance repair additionally creates `src/hooks/use-external-scratch-removal-data.ts` and `.test.tsx` and modifies only `src/components/triage/triage-workspace.tsx` and `.test.tsx` to move the existing selected-Scratch lifecycle observation, unclassified-lifecycle fallback, and terminal Inbox/source reads behind a typed read-only hook boundary. The hook preserves terminal Inbox-first/source-last ordering, normalization and race guards, exposes only observation plus a terminal snapshot callback, and imports neither Zustand nor durable/session ownership; behavior, copy, DOM, style, timing, focus, DataStore, repository, and schema remain unchanged.

**Dependencies:** Tasks 106, 128, 130, 136, 137, and 139; deliberately not Tasks 138 or 140.

**Authority / flows:** `DP-VQ01`, `UF-05`; `AF-05`; `NEG-21`.

**Recipe:** [`Scratch Pool`](../../recipes/inbox-triage-scratch-pool-visual-recipe.md).

**Observable acceptance:** external removal cannot silently lose Add/editor draft or use a stale destination; pause/resume/changed destination/copy/restore/terminal handoff match receipt; unresolved VQ-03/04 appearance does not block this task.

**Verification:** focused Pool/Workspace/store/copy tests with fake timers; run removal with Add draft, each editor headless state, pause/resume, destination mutation, copy, restore, and terminal removal in all themes, recording `docs/verification/inbox-triage/task-141.md`; `pnpm typecheck`.

**Commit contract:** DP-VQ01 copy/transition, tests, styles, and Task 141 evidence only; `feat(triage): handle external scratch removal`.

### Task 142: [x] Define triage pointer sources and lifecycle snapshots in existing DnD owner

**Files and actions:** modify existing `src/hooks/use-dnd.ts` and `src/hooks/use-triage-dnd.test.ts`, `src/components/triage/breakdown-panel.tsx` and `.test.tsx`, `src/components/triage/staging-zone.tsx` and `.test.tsx`, and `src/components/triage/triage-drag-token.tsx` and `.test.tsx`. Keep general Grid/Calendar DnD behavior separate. `useTriageDnd` uses Mouse 8px and Touch 250ms/5px, captures stable source/candidate/version/type at activation, starts Breakdown only from grip and staged items from whole root, distinguishes Stage/Unstage/Placement intent, keeps a compact pointer-centered token, and cancels mutation on remote invalidation. Add no second triage DnD hook owner.

**Dependencies:** Tasks 131–133.

**Authority / flows:** `UF-12`, `UF-13`; `AF-09`; `NEG-06`, `NEG-12`.

**Recipe:** [`Breakdown rows and empty states`](../../recipes/inbox-triage-breakdown-row-empty-visual-recipe.md), [`Staging`](../../recipes/inbox-triage-staging-visual-recipe.md), and [`Placement affordances`](../../recipes/inbox-triage-placement-affordances-visual-recipe.md).

**Observable acceptance:** rows never drag outside grip; whole staged roots do; exact sensor thresholds hold; remote change cannot retarget a snapshot; general Grid keyboard DnD remains unchanged.

**Verification:** focused existing DnD/Breakdown/Staging/token tests; run mouse/touch activation, invalidation, Escape, and overlay alignment in canonical route, recording interaction/captures in `docs/verification/inbox-triage/task-142.md`; `pnpm typecheck`.

**Commit contract:** existing DnD triage intent slice, source adapters/tests, and Task 142 evidence only; `feat(triage): define triage pointer sources`.

### Task 143: [x] Render `DP-VQ05` Add/Delete reliability states

**Files and actions:** after `DP-VQ05`, modify `src/components/triage/breakdown-panel.tsx` and `.test.tsx`, `src/app/globals.css`, `src/lib/copy/inbox-triage.ts` and `.test.ts` to populate approved wording and render Add pending/failure/reconcile states plus Delete deleting/failure/check-again states over Task 136 authoritative operation identities, with exact timing/actions/focus/theme mappings. Add may expose Retry only from authoritative `not_applied` when the receipt specifies it. Delete failure or unknown keeps the row in place and exposes only Check again/reconciliation; Delete has no dedicated Retry action. Do not include Pool `VQ-06`.

**Dependencies:** Tasks 110, 128, and 136.

**Authority / flows:** `DP-VQ05`, `UF-07`, `UF-11`; `NEG-11`, `NEG-21`.

**Recipe:** [`Breakdown rows and empty states`](../../recipes/inbox-triage-breakdown-row-empty-visual-recipe.md).

**Observable acceptance:** Add/Delete states are section-local and distinct; any Add Retry exists only for authoritative `not_applied`; every Delete failure/unknown leaves the row in place and offers Check again/reconciliation without a dedicated Retry or resend; focus/copy/theme exactly match receipt.

**Verification:** focused Breakdown/copy state-table tests, including row retention and the absence of a Delete Retry action for every Delete failure/unknown result; run every authoritative result, focus, reduced motion, and theme mapping in the canonical route, including `Check again` from a Delete failure/unknown result → reconciliation with the preserved operation identity → terminal release and deterministic focus, recording `docs/verification/inbox-triage/task-143.md`; `pnpm typecheck`.

**Commit contract:** DP-VQ05 copy/realization, tests, styles, and Task 143 evidence only; `feat(triage): render breakdown reliability states`.

### Task 144: [x] Render `DP-VQ06-POOL` Pool statuses

**Files and actions:** after `DP-VQ06-POOL`, modify `src/hooks/use-inbox.ts` and `.test.tsx` so the existing authoritative repository-snapshot owner exposes typed Pool lifecycle/provenance projection that excludes the initial snapshot and current-session local `createScratchBit` results while distinguishing remote arrival, external archive, external delete, and restore. Modify `src/components/triage/scratch-pool.tsx` and `.test.tsx`, `src/app/globals.css`, `src/lib/copy/inbox-triage.ts` and `.test.ts` to populate Pool-only approved wording and render hidden-selection, remote/lifecycle, count/indicator, action, focus, dismissal, and all-theme states without changing selection or borrowing Staging/Explorer presentation. Keep mounted Inbox-page activity aggregation and UI state in `ScratchPool`; do not change DataStore APIs, IndexedDB, schema, persistence, or timestamps, query repository lifecycle from the component, or add another production owner.

**Dependencies:** Tasks 111, 128, and 130.

**Authority / flows:** `DP-VQ06-POOL`, `UF-03`; `NEG-21`.

**Recipe:** [`Scratch Pool`](../../recipes/inbox-triage-scratch-pool-visual-recipe.md).

**Observable acceptance:** a filtered selected Scratch remains explicit without auto-selecting another; every Pool receipt state/action/lifetime is exact and section-local.

**Verification:** focused Pool/copy tests; run hidden-selected, remote/lifecycle, dismiss/re-entry, focus, reduced motion, and all themes, recording `docs/verification/inbox-triage/task-144.md`; `pnpm typecheck`.

**Commit contract:** DP-VQ06-POOL copy/realization, tests, styles, and Task 144 evidence only; `feat(triage): render pool statuses`.

### Task 145: [x] Connect Stage and Unstage interaction adapters

**Files and actions:** modify `src/components/triage/breakdown-panel.tsx`, `src/components/triage/staging-zone.tsx`, `src/components/triage/triage-workspace.tsx`, and their tests; modify `src/hooks/use-staged-candidates.ts` and `.test.tsx` plus existing `src/hooks/use-dnd.ts` and `src/hooks/use-triage-dnd.test.ts`; extend `src/hooks/use-triage-operation-lock.test.tsx`. Dispatch Task 121 commands only from current compatible drops after synchronously acquiring Task 136's shared `stage`/`unstage` lock. Retain that lock and source-backed truth through pending/unknown/reconciling; reject duplicate/competing action, Scratch switch, internal/browser exit, Edit, Placement, Undo, Archive, and Cancel/Escape with no queue or replay; release only on terminal result. Expose transient Staging/Breakdown Unstage targets during matching drags; keep the staged source grip natively disabled with non-draggable pointer feedback and no grab/grabbing cursor while active grips retain their existing feedback; restore original created-at sort position/source focus after confirmed Unstage; reconcile unknown before Retry; add no permanent Unstage button or success toast.

**Dependencies:** Tasks 121, 131–133, 136, 139, and 142.

**Authority / flows:** `UF-12`, `UF-14`, `UF-15`; `AF-02`, `AF-07`, `AF-09`; `NEG-12`, `NEG-13`, `NEG-15`.

**Recipe:** [`Breakdown rows and empty states`](../../recipes/inbox-triage-breakdown-row-empty-visual-recipe.md) and [`Staging`](../../recipes/inbox-triage-staging-visual-recipe.md).

**Observable acceptance:** Stage/Unstage start only from valid current snapshots/targets and a successful synchronous lock acquisition; durable representations and the complete lock matrix remain through unknown/reconciliation; blocked intents produce no command/navigation/replay; terminal release is exact; a staged source grip is actually disabled and shows a non-draggable cursor on pointer hover without grab/grabbing feedback; active grips retain grab/grabbing feedback; confirmed Unstage restores order/focus and has no permanent control/toast.

**Verification:** focused operation-lock/Breakdown/Staging/Workspace/candidate/DnD/departure tests; for Stage and Unstage run the complete matrix, duplicate/competing acquisition, pending/unknown/reconciling/terminal release, success/reject/conflict, navigation, order, and focus flows and record `docs/verification/inbox-triage/task-145.md`; `pnpm typecheck`.

**Commit contract:** headless Stage/Unstage adapters, tests, and Task 145 evidence only; `feat(triage): connect stage and unstage flows`.

### Task 146: [x] Reconcile remote candidates and confirmed-orphan cleanup

**Files and actions:** modify `src/hooks/use-staged-candidates.ts` and `.test.tsx`, `src/components/triage/staging-zone.tsx` and `.test.tsx`, and existing `src/hooks/use-dnd.ts` and `src/hooks/use-triage-dnd.test.ts`. Separate unresolved subscription miss from authoritative orphan proof; invoke Task 122 only with exact proof/identity; update counts/Archive facts reactively; cancel affected drags after visual snapshot release; preserve selection/focus on remote arrival/removal. Expose typed slots for Task 147 but choose no `VQ-06` appearance.

**Dependencies:** Tasks 122, 131, 133, 142, and 145.

**Authority / flows:** `UF-16`; `AF-02`, `AF-08`; `NEG-16`.

**Recipe:** [`Staging`](../../recipes/inbox-triage-staging-visual-recipe.md).

**Observable acceptance:** cache/offline/delay never renders/cleans as orphan; confirmed cleanup converges to exact audit-backed state; remote addition never steals focus; invalid drag writes nothing; counts and completion update from truth.

**Verification:** focused hook/Staging/DnD tests; run delayed source, proof cleanup, remote arrival/removal, focus, count, Archive eligibility, and active drag, recording `docs/verification/inbox-triage/task-146.md`; `pnpm typecheck`.

**Commit contract:** remote/integrity adapters, tests, and Task 146 evidence only; `feat(triage): reconcile candidate integrity`.

### Task 147: [x] Render `DP-VQ06-STAGING` Staging statuses

**Files and actions:** after `DP-VQ06-STAGING`, modify `src/hooks/use-staged-candidates.ts` and `.test.tsx` only to expose whether the selected Scratch has received its matching authoritative live-query snapshot; authoritative empty is ready, while pre-snapshot, changed-Scratch, and null states are not. Modify `src/components/triage/triage-workspace.tsx` and `.test.tsx` only as the mounted projection owner for that readiness, its existing command-bearing `useStagedCandidates` instance, and existing explicit `activeDragItem.integrity === "invalidated"` plus `onPendingPlacementInvalidated(dropId)` signals; modify `src/components/triage/staging-zone.tsx` and `.test.tsx`, `src/components/triage/breakdown-panel.tsx` and `.test.tsx`, `src/app/globals.css`, `src/lib/copy/inbox-triage.ts` and `.test.ts` to populate Staging-only wording and render Stage/Unstage pending/invalid/stale/failure, remote arrival, orphan, alert/count/indicator, dismissal/action/focus, reduced-motion, and all-theme states over Tasks 145–146. Use the first matching snapshot or Scratch-switch snapshot only as the remote-arrival baseline; a later authoritative arrival after a ready empty snapshot remains observable. Keep confirmed-orphan copy/render in the headless state matrix, but defer its production reachability and browser acceptance to a future remote-authority lifecycle because no authoritative proof producer or production caller exists. Do not use timing/render-count/first-nonempty inference, change candidate truth/count/eligibility, infer invalidation from generic close/disappearance, create orphan authority, or change Task 146 integrity/command/DnD/repository semantics.

**Dependencies:** Tasks 112, 128, 145, and 146.

**Authority / flows:** `DP-VQ06-STAGING`, `UF-14`, `UF-16`; `NEG-11`, `NEG-13`, `NEG-21`.

**Recipe:** [`Staging`](../../recipes/inbox-triage-staging-visual-recipe.md).

**Observable acceptance:** every receipt state is section-local/distinct, remote arrival never steals focus, alert lifetime is exact, and only terminal success removes/restores durable representations.

**Verification:** focused Workspace/Staging/Breakdown/copy state-table tests; run each production-reachable state/dismissal/focus/reduced-motion/theme mapping and record `docs/verification/inbox-triage/task-147.md`; verify confirmed-orphan copy/render headlessly and record its production/browser deferral; `pnpm typecheck`.

**Commit contract:** DP-VQ06-STAGING copy/realization, tests, styles, and Task 147 evidence only; `feat(triage): render staging statuses`.

### Task 148: [x] Render `DP-VQ02` Add/Unstage success signal

**Files and actions:** after `DP-VQ02`, modify `src/components/triage/breakdown-panel.tsx` and `.test.tsx`, `src/components/triage/staging-zone.tsx` and `.test.tsx`, `src/components/triage/triage-workspace.tsx` and `.test.tsx` only as the mounted projection owner for the authoritative local Unstage terminal outcome, `src/app/globals.css`, `src/lib/copy/inbox-triage.ts` and `.test.ts`. Trigger the approved shared one-shot signal only from a newly observed authoritative Add/Unstage success identity, with exact duration/easing/copy/placement/interruption/retrigger, polite announcement, and static reduced-motion distinction. Workspace may project only `{kind, operationId, sourceBreakdownId}` from the local Unstage callback's first authoritative `applied` or `already_applied` result; unknown reconciliation may supply that authority once for the same stable operation. Do not infer success from candidate disappearance, Staging projection removal, rerender, reload, or remote events. Preserve Add's existing BreakdownPanel authoritative path. Re-render/reload/reconcile replay never repeats the signal; Unstage still has no toast.

**Dependencies:** Tasks 107, 128, 136, and 145.

**Authority / flows:** `DP-VQ02`, `UF-07`, `UF-15`; `NEG-11`, `NEG-13`.

**Recipe:** [`Breakdown rows and empty states`](../../recipes/inbox-triage-breakdown-row-empty-visual-recipe.md) and [`Staging`](../../recipes/inbox-triage-staging-visual-recipe.md).

**Observable acceptance:** one operation identity triggers once, later identities retrigger once, interruption follows receipt, focus stays put, reduced motion remains perceivable, and routine Unstage produces no toast.

**Verification:** focused fake-timer/motion/copy tests; run Add and Unstage success, replay, interruption, focus, announcement, reduced motion, and themes, recording `docs/verification/inbox-triage/task-148.md`; `pnpm typecheck`.

**Commit contract:** DP-VQ02 copy/signal, tests, styles, and Task 148 evidence only; `feat(triage): render authoritative success signal`.
