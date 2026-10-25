# Phase 28 — Explorer Search And Pointer Placement

## Completion Summary

Tasks 149–154 were explicitly accepted on the isolated
`phase-28/explorer-search-pointer-placement` branch. The phase completes
release-time Explorer targeting, remote/path state, dedicated search,
direct/staged atomic placement, placement reliability, and Result Title/direct
limits without starting Task 155 or Phase 29.

| Task | Accepted deliverable | Implementation / evidence | Acceptance |
| --- | --- | --- | --- |
| 149 | Release-time targets and valid-column edge auto-scroll | `1830cc3` → `80bd704` | `9b26412` |
| 150 | `DP-VQ06-EXPLORER` remote/path statuses | `32237f4` → `14ade3c` | `b13bcf0` |
| 151 | `DP-VQ07` dedicated Explorer search and close semantics | `c2749b6` → `11a84c7` | `0ab994e` |
| 152 | Direct/staged placement selection and confirmation | `7ba9361` → `e25b1eb` | `12fd2a9` |
| 153 | `DP-VQ08` placement reliability states | `b73dc25` → `8110c6e` | `29bab4f` |
| 154 | `DP-VQ09` Result Title and direct-limit surfaces | `28ba551` → `643da81` | `0df3a0f` |

The final accepted `src` tree is
`e0e911a758363df677ed32eeef64910351a58478`.

## Accepted Foundation

- Pointer release uses final rendered DOM geometry, preserves full targets for
  confirmation, and scrolls only the valid active Explorer column.
- Explorer remote/path status distinguishes authoritative arrivals and path
  invalidation without counting initial hydration, local placement results, or
  existing-record moves as remote arrivals.
- Dedicated whole-hierarchy search retains its own query/path/reveal owner,
  exact close matrix, stale-selection behavior, native list semantics, and
  event-ended reveal lifetime.
- Direct and staged placement share one mounted-page coordinator, immutable
  source/target snapshot, foreground operation lock, exact Task 123 dispatch,
  authoritative reconciliation, and no-write invalidation behavior.
- Placement reliability and Result Title/direct-limit surfaces preserve source
  truth, exact disabled reasons, native focus/announcement lifetimes,
  reduced-motion parity, and eight-theme mappings.

## Verification And Acceptance

Every task has durable implementation/evidence and explicit user acceptance in
[`docs/issues/Issues_Phase_28.md`](../../issues/Issues_Phase_28.md). Accepted
task-level browser and mounted-owner evidence remains reusable without
inventing additional Phase 28 comparison results.

The fresh adapter-declared end-phase terminal gate ran serially at pre-close
`0df3a0fbb7170d66f47a199ffb398056e4e16c1e`:

| Command | Exit | Result |
| --- | ---: | --- |
| `pnpm test` | 0 | 98 test files / 1124 tests passed |
| `pnpm lint` | 0 | 0 errors; 11 unchanged warnings |
| `pnpm typecheck` | 0 | TypeScript check passed |
| `pnpm build` | 0 | Next.js 16.2.1 production build passed; seven routes generated |
| `git diff --check` | 0 | No whitespace errors at pre-close |

## Canonical Reconciliation And Handoff

- `P28-01`–`P28-09` are Closed or Promoted to Execution Plan with actual
  `Reflected` or implementation-local `None` canonical impact.
- `P28-10` records the user-approved terminal disposition: Phase 28 preserves
  a measurement baseline and transfers comparative workflow audit to Phase 29.
- Active unresolved Phase 28 issues: 0.
- Blocking conformance violations: 0. Advisory conformance violations: 0.
- Phase Notes are not used by Adapter policy.
- The terminal Phase 28 workflow audit preserves all historical measured rows,
  records no final workflow verdict, and transfers `WF28-01`–`WF28-11` plus
  the seven decision questions to
  `docs/verification/inbox-triage/phase-29-workflow-pilot-audit.md`.
- Phase 29 must use unchanged candidate
  `94e89782f7fe2cdbdd035e842ca6881b4a87ce49` under its own Gate C and fresh
  branch/worktree. Task 155 and Phase 29 remain unstarted.
- Candidate skill or Adapter improvement is prohibited until after Phase 29
  publication and cleanup and requires a separate approval lifecycle pinned to
  the exact merged Phase 29 audit blob and Final Close receipt.
- No speculative workflow learning is added to `docs/execution-plan/LEARNINGS.md`.

**Full issue log:**
[`docs/issues/Issues_Phase_28.md`](../../issues/Issues_Phase_28.md)

## Task Contracts

The accepted task contracts, moved verbatim from `docs/EXECUTION_PLAN.md`
on 2026-10-25; relative links are rebased to this folder.

### Task 149: [x] Implement release-time targets and valid-column edge auto-scroll

**Acceptance:** Accepted on 2026-08-24. Implementation checkpoint
`1830cc37ff913bd1d4ad4b62ddd9f7b2319b4dca`; evidence-alignment checkpoint
`80bd7041e9db2849d9eab1d9f8d5d08c38e84549`; WF28-02 product-evidence
fingerprint `a2da7ab6f49ba50d9fba9d3ea5e3fb568990e05f264891844e2534e2e00dfdd8`.

**Files and actions:** modify existing `src/hooks/use-dnd.ts` and `src/hooks/use-triage-dnd.test.ts`, `src/components/triage/hierarchy-explorer.tsx` and `.test.tsx`, and `src/components/triage/triage-workspace.tsx` and `.test.tsx`. Disable DndContext/library auto-scroll for triage; compute valid/invalid/full target feedback; progressively scroll only the currently valid Explorer column near its top/bottom edge without jumps/path changes; continuously hit-test pointer-under geometry and use the final rendered release target; stop on exit/end; never scroll invalid columns, shell, or page. A full target remains a selected release target for Task 152 rather than being discarded.

**Dependencies:** Tasks 134 and 142.

**Authority / flows:** `UF-22`; `AF-09`; `NEG-06`, `NEG-07`.

**Recipe:** [`Grid Explorer`](../../recipes/inbox-triage-grid-explorer-visual-recipe.md) and [`Placement affordances`](../../recipes/inbox-triage-placement-affordances-visual-recipe.md).

**Observable acceptance:** invalid targets never scroll/confirm; valid-column edge motion is progressive and isolated; full target advances as a full target; release-time DOM geometry—not stale hover—wins; Escape/remote invalidation cancels.

**Verification:** focused DnD/Explorer/Workspace tests with mocked rectangles/scroll; run mouse/touch edge entry/exit, column crossing, full/invalid, DOM move before release, Escape, and remote invalidation, recording `docs/verification/inbox-triage/task-149.md`; `pnpm typecheck`.

**Commit contract:** existing DnD target/auto-scroll mechanics, tests, and Task 149 evidence only; `feat(triage): add explorer drag targeting`.

### Task 150: [x] Render `DP-VQ06-EXPLORER` remote/path statuses

**Acceptance:** Accepted on 2026-08-26. Implementation checkpoint
`14ade3c4eaa6e55a878addcc1367843f032098c2`; accepted `src` tree
`73a1d973263f92d97580927063f27651482d18d3`.

**P28-04 canonical amendment:** on 2026-08-24 the user approved the minimum actual-owner expansion and moved only the selected-Bit disappearance realization to Task 151's existing reveal production owner. The accepted `DP-VQ06-EXPLORER` copy, action, focus, lifetime, fallback, anchoring, and visual semantics do not change; its historical receipt remains unchanged and this active plan plus the Phase 28 ledger durably record the release-edge correction.

**Files and actions:** after `DP-VQ06-EXPLORER`, create `src/hooks/use-explorer-remote-status.ts` and `.test.tsx` as the single mounted-page authoritative reactive read/provenance owner. It must use the existing `getAllActiveNodes()`/`getAllActiveBits()` APIs behind the hook boundary to retain the authoritative whole-active-tree stable-ID-to-parent baseline needed to classify appearances in currently open Explorer columns, and existing `getNode()`/`getBit()` reads for watched path identities to distinguish deleted, archived, moved, and unreachable records. It excludes the initial authoritative snapshot; classifies an existing stable ID changing parents as a move rather than a new arrival; and excludes only exact stable result identities supplied by successful current-session local placement. Modify existing `src/hooks/use-dnd.ts` and `src/hooks/use-triage-dnd.test.ts` so `handlePlacementConfirm` captures the `Node` or `Bit` returned by the existing `createNode`/`createBit` call and exposes only its stable result identity after creation; modify `src/components/triage/triage-workspace.tsx` and `.test.tsx` only to project that identity from the existing placement producer into Explorer. This provenance handoff changes no placement command, ordering, lock, confirmation, mutation, focus, or failure semantics. Modify `src/components/triage/hierarchy-explorer.tsx` and `.test.tsx`, `src/stores/triage-store.ts` and `.test.ts`, `src/app/globals.css`, `src/lib/copy/inbox-triage.ts` and `.test.ts` to populate Explorer-only wording and render remote path change, invalid suffix fallback, count/indicator, alert/dismissal, action/focus, reduced-motion, and theme states while preserving stable-ID/offset anchoring. The evidence-confirmed fourth repair cycle may modify only the manual `useTriageDnd` compatibility mock in `src/components/layout/grid-runtime.test.tsx` to supply `localPlacementResult: null`; this has no canonical product impact and adds no production owner. Task 150 creates no Bit selection/reveal producer and does not realize selected-Bit disappearance. Do not change DataStore APIs, IndexedDB, schema, persistence, timestamps, Search, Pool, Staging, or placement product behavior, and do not add another provenance owner.

**Dependencies:** Tasks 113, 128, and 134.

**Authority / flows:** `DP-VQ06-EXPLORER`, `UF-17`; `AF-05`, `AF-09`; `NEG-03`, `NEG-21`.

**Recipe:** [`Grid Explorer`](../../recipes/inbox-triage-grid-explorer-visual-recipe.md).

**Observable acceptance:** initial hydration, exact local placement results, and existing-item parent moves never increment remote-arrival counts; remote insertion and deleted/archived/moved/unreachable path changes are authoritatively distinct; remote change never substitutes a sibling/ghost; nearest valid ancestor/focus/status/dismissal match receipt and never steal focus; full labels remain intact. Selected-Bit disappearance is not observable in Task 150 and remains unimplemented until Task 151.

**Verification:** focused provenance-hook, DnD, Workspace, Explorer, store, copy, and GridRuntime compatibility tests; prove initial hydration, remote insert, exact local placement exclusion, existing stable-ID parent move exclusion, deleted/archived/moved/unreachable classification, fallback, dismiss/re-entry, focus, reduced motion, all themes, and the manual DnD mock's null local-result contract, recording `docs/verification/inbox-triage/task-150.md`; `pnpm typecheck`.

**Commit contract:** DP-VQ06-EXPLORER provenance projection, local-result identity handoff, non-selected-Bit copy/realization, tests, styles, the evidence-confirmed GridRuntime compatibility mock, and Task 150 evidence only; `feat(triage): render explorer remote states`.

### Task 151: [x] Render `DP-VQ07` dedicated Explorer search body and close semantics

**Acceptance:** Accepted on 2026-08-26. Implementation checkpoint
`11a84c776700d33b5fa3f6323528e3e82e3a5fac`; implementation commit
`c2749b6f3b0a60cba6d6fbb3c7ff921936446925`; accepted `src` tree
`8d80becbfb821d54453939b81e20c249a4fb2a1a`.

**Files and actions:** after `DP-VQ07`, create `src/components/triage/grid-explorer-search-results.tsx` and `.test.tsx`; modify `src/components/triage/hierarchy-explorer.tsx` and `.test.tsx`, `src/hooks/use-grid-explorer-search.ts` and `.test.tsx`, `src/app/globals.css`, `src/lib/copy/inbox-triage.ts` and `.test.ts`. Render the approved complete replacement body over Task 135 with pre-search/results/loading/stale/error/duplicates, scrolling, Arrow/Enter selection, stale revalidation, reveal, and focus. Implement the exact close matrix: **DnD start is the only close that preserves query/results/scroll as interrupted state**; Drop/Cancel never auto-return and explicit reopen restores it. A valid reachable result selection closes the search body and clears active/interrupted search state, reconstructs the real item path, selects/reveals that item, and starts an event-ended—never timer-ended—reveal. If selection-time revalidation finds the result stale, removed, hidden, or unreachable, keep the search body/query/results/scroll, refresh the result set, report the stale status, and perform no path reconstruction, selection, reveal, or navigation. A successful reveal ends on another item selection, path change, DnD start, search restart, or route exit. Under the user-approved `P28-04` release-edge correction, this same reveal owner also realizes only the existing `DP-VQ06-EXPLORER` selected-Bit disappearance state: clear only the vanished Bit selection/reveal, preserve its valid parent path, place the exact selection-cleared status in that parent column, focus the surviving parent row or its full-label heading, and retain the receipt-defined Dismiss and lifetime behavior. It creates no second selection/reveal owner and changes no `DP-VQ06-EXPLORER` copy, action, focus, lifetime, product, or visual semantics. X, Escape, and Inbox route exit clear active/interrupted query/results/scroll and any reveal; Scratch switch preserves current search and reveal without forcing focus. Results are not DnD sources and global Search remains untouched.

**Dependencies:** Tasks 114, 128, 134, 135, and 150.

**Authority / flows:** `DP-VQ07` plus only the `DP-VQ06-EXPLORER` selected-Bit disappearance slice moved by `P28-04`; `UF-17`–`UF-19`; `AF-02`, `AF-05`, `AF-09`; `NEG-03`, `NEG-10`, `NEG-21`.

**Recipe:** [`Grid Explorer`](../../recipes/inbox-triage-grid-explorer-visual-recipe.md).

**Observable acceptance:** whole-hierarchy results/ranking/duplicates render in the dedicated component; valid selection closes search, reconstructs the path, and starts the real item's event-ended reveal; a stale selection retains search, refreshes/reports status, and performs no reveal/navigation; a revealed Bit disappearance clears only that Bit selection/reveal, preserves and focuses its valid parent fallback, and exposes the exact parent-column status/Dismiss lifetime without reopening Search; DnD interruption alone preserves query/results/scroll; X/Escape/route exit clear search and reveal; focused disappearance returns input; every reopen/Scratch-switch path matches the close matrix exactly.

**Verification:** focused utility/hook/results/Explorer/copy tests; assert valid selection closes the body, reconstructs the path, starts reveal, and ends reveal only on each named lifecycle event; assert each stale/removed/hidden/unreachable selection retains body/query/results/scroll, refreshes and reports status, and changes no path/selection/reveal/navigation; assert revealed-Bit disappearance clears only the Bit reveal/selection, preserves the parent path, renders the exact parent-column sentence, and follows parent-row/heading focus plus Dismiss lifetime; run every close path, DnD reopen, Scratch switch, focus, themes, and global Search preservation, recording `docs/verification/inbox-triage/task-151.md`; `pnpm typecheck`.

**Commit contract:** DP-VQ07 copy/search body plus only the `P28-04`-moved `DP-VQ06-EXPLORER` selected-Bit disappearance realization, integration, tests, styles, and Task 151 evidence; `feat(triage): render explorer hierarchy search`.

### Task 152: [x] Connect direct/staged placement selection and confirmation

**Accepted:** user-approved checkpoint `e25b1ebe0275d8a7ff16c612195b11780da98b21`; implementation commit `7ba936147722e1e8ebb4a3fb6b9bceed9a65ca88`; accepted `src` tree `8247077665a212e575faad44f20046de623b7306`.

**Files and actions:** create `src/hooks/use-triage-placement.ts` and `.test.tsx`; modify existing `src/hooks/use-dnd.ts` and `src/hooks/use-triage-dnd.test.ts`, `src/components/triage/hierarchy-explorer.tsx` and `.test.tsx`, and `src/components/triage/triage-workspace.tsx` and `.test.tsx`; extend `src/hooks/use-triage-operation-lock.test.tsx`. Own the complete mounted-page foreground state machine: staged release target; direct **Node/Bit type plus destination/path selection**; target-column confirmation; source/target/version snapshot; focus/locks; explicit Confirm/Cancel; one Task 123 dispatch; reconcile unknown. Before dispatch, synchronously acquire Task 136's shared `placement` lock; retain it through pending/unknown/reconciling, deny the complete matrix including placement Cancel/Escape and duplicate Confirm without queue/replay, and release only on terminal result. Another active owner blocks placement start/Confirm. A full destination must open the same target-column affordance with a **visible full-target reason, disabled Confirm, and working Cancel**. Drop alone writes nothing; no alternate parent/sibling/cell, keyboard placement, picker, or hidden shortcut. Integrate with Task 135 headless search so placement can close/lock it without requiring VQ-07 UI.

**Dependencies:** Tasks 123, 128, 134, 135, 136, 139, 145, and 149.

**Authority / flows:** `UF-20`–`UF-22`; `AF-06`, `AF-07`, `AF-09`; `NEG-07`, `NEG-18`.

**Recipe:** [`Placement affordances`](../../recipes/inbox-triage-placement-affordances-visual-recipe.md).

**Observable acceptance:** direct placement cannot skip type+path; staged/direct each reach a distinct target-column confirmation; full target shows exact source-backed base reason with disabled Confirm and Cancel; valid Confirm acquires once, revalidates, and dispatches once; pending/unknown retains the complete lock, Cancel/Escape/duplicates/competing actions write nothing, and terminal release is exact; pre-dispatch Cancel returns source; every invalid/stale state writes nothing.

**Verification:** focused operation-lock/placement/DnD/Explorer/Workspace/departure tests; run staged/direct Node/Bit type+path, full target, valid/invalid/stale/moved, the complete pending matrix, pre-dispatch versus pending Confirm/Cancel/Escape, duplicate/competing intent, terminal release, focus, and unknown reconciliation, recording `docs/verification/inbox-triage/task-152.md`; `pnpm typecheck`.

**Commit contract:** base placement coordinator/adapters, tests, and Task 152 evidence only; `feat(triage): connect atomic pointer placement`.

### Task 153: [x] Render `DP-VQ08` placement reliability states

**Files and actions:** after `DP-VQ08`, modify `src/hooks/use-triage-placement.ts` and `.test.tsx`, `src/components/triage/hierarchy-explorer.tsx` and `.test.tsx`, `src/app/globals.css`, `src/lib/copy/inbox-triage.ts` and `.test.ts` to populate approved wording and render pending, reconciling, explicit failure, stale source/target, Retry/Cancel, success, timing, focus, reduced-motion, and theme states within Task 152's captured affordance. Source truth/destination remain visible until authoritative resolution; Retry only from not-applied; unknown offers Check again. Share no dependency with Task 154; the writer mutex serializes their common files.

**Dependencies:** Tasks 115, 128, and 152.

**Authority / flows:** `DP-VQ08`, `UF-20`, `UF-21`; `AF-07`; `NEG-18`, `NEG-21`.

**Recipe:** [`Placement affordances`](../../recipes/inbox-triage-placement-affordances-visual-recipe.md).

**Observable acceptance:** every result family and receipt state is distinct; no optimistic result, blind resend, or alternate target occurs; current-action focus is stable.

**Verification:** focused placement/Explorer/copy state-table tests; run every authoritative result, Retry/Check again/Cancel, focus, reduced motion, and all themes, recording `docs/verification/inbox-triage/task-153.md`; `pnpm typecheck`.

**Commit contract:** DP-VQ08 copy/realization, tests, styles, and Task 153 evidence only; `feat(triage): render placement reliability states`.

### Task 154: [x] Render `DP-VQ09` Result Title and direct-limit surfaces

**Files and actions:** after `DP-VQ09`, modify `src/hooks/use-triage-placement.ts` and `.test.tsx`, `src/components/triage/hierarchy-explorer.tsx` and `.test.tsx`, `src/app/globals.css`, `src/lib/copy/inbox-triage.ts` and `.test.ts` to populate approved wording and render staged over-limit Result Title without editing source plus direct Node/Bit availability/reason states, validation, Cancel, focus, reduced motion, and themes. Preserve source/target snapshot; direct `1–100` permits Node/Bit, `101–200` Bit only, `201–1000` neither; never truncate, expose hidden direct editor, or reuse create dialogs. As the explicitly approved `P28-07` minimum owner expansion, also modify `src/components/triage/triage-workspace.tsx` and `.test.tsx` only for authoritative source/candidate projection, no-write invalidation wiring, once-only announcement, and mounted proof of the existing Breakdown grip, staged candidate, or Staging heading safe focus fallback. As the explicitly approved `P28-08` minimum readiness owner expansion, also modify `src/hooks/use-scratch-breakdowns.ts` and `.test.tsx` only to expose and directly test a read-only `isReady` projection derived from the current selected Scratch's existing live-query snapshot: false before the first current snapshot and true after it, including an authoritative empty snapshot. Do not change its query, editor, command, DataStore, persistence, schema, or other Breakdown behavior. No other Workspace behavior or owner is included. Share no dependency with Task 153; the writer mutex serializes common files.

**Dependencies:** Tasks 116, 128, and 152.

**Authority / flows:** `DP-VQ09`, `UF-23`; `NEG-18`, `NEG-21`.

**Recipe:** [`Placement affordances`](../../recipes/inbox-triage-placement-affordances-visual-recipe.md).

**Observable acceptance:** staged title can be valid/untruncated while original text remains; direct unavailable types expose exact reasons and no write/editor; Cancel/source change clears only this draft and restores focus.

**Verification:** focused placement/Explorer/copy tests for boundary lengths, whitespace, staged/direct difference, preservation, invalidation, focus, reduced motion, and themes, recording `docs/verification/inbox-triage/task-154.md`; `pnpm typecheck`.

**Commit contract:** DP-VQ09 copy/realization, tests, styles, and Task 154 evidence only; `feat(triage): render placement title limits`.
