# Phase 26 — Lifetime, Copy, And Base-Surface Owners

## Completion Summary

Tasks 127–135 were explicitly accepted on the isolated
`phase-26/lifetime-copy-base-surfaces` branch. The phase establishes the
canonical lifetime and copy owners and the source-backed Inbox/Triage base
surfaces without starting Task 136 or any later interaction/realization work.

| Task | Accepted deliverable | Implementation / evidence | Acceptance |
| --- | --- | --- | --- |
| 127 | App-session triage state and two validated device preferences | `775045f` → `c5a1f65` | `8d2cde0` |
| 128 | Typed single core-English Inbox/Triage copy owner | `f57d1d5` → `beb63a2` | `0079dc3` |
| 129 | Semantic four-area Inbox shell and stable geometry | `78f6f97` → `2f2b8c5` | `dcced04` |
| 130 | Pool base flow and defensive Scratch promotion visibility guard | `3eed3a9` → `817432d` | `3ba4d72` |
| 131 | Durable candidate reactive boundary | `6ee8d4a` → `c927045` | `05d1e39` |
| 132 | Source-backed Context and Breakdown base lifecycle | `e18a18b` → `5236400` | `7dd0b2e` |
| 133 | Source-backed Staging base and authoritative count headings | `bf872fe` → `6e26326` | `5d8e2d3` |
| 134 | Full-label Explorer session columns and remote anchoring | `bc12c2d` → `29e0b61` | `2a4dabc` |
| 135 | Dedicated headless whole-hierarchy Explorer query lifecycle | `d3f7726` → `5f731d6` | `cb09da0` |

## Accepted Foundation

- Session state, device preferences, durable repository truth, and
  mounted-page query state remain with their declared lifetime owners.
- Components consume reactive hooks rather than sequencing repository writes.
  Durable candidates are joined to authoritative source rows; deprecated
  Zustand candidate compatibility state remains temporary and non-authoritative
  for Task 163 removal.
- The canonical route renders one shared semantic Inbox tree with source-backed
  Pool, Context/Breakdown, Staging, and full-label Explorer base surfaces.
- Dedicated Explorer search traversal/ranking/request state remains separate
  from global Search and has no UI body before Task 151.
- Task 130 resolves deferred `P23-03`; `P23-02` remains exactly owned by Task
  136. No Task 136 or Phase 27 behavior was introduced.

## Verification And Acceptance

Every task has a durable start, implementation/evidence boundary, explicit
user acceptance, and separate acceptance commit in
[`docs/issues/Issues_Phase_26.md`](../../issues/Issues_Phase_26.md). Accepted
route evidence for Tasks 129, 130, 132, 133, and 134 remains applicable.

The fresh end-phase serial full gate ran at pre-close
`cb09da04557bad3b253b87581a70d7ee24e630b6`:

| Command | Exit | Result |
| --- | ---: | --- |
| `pnpm test` | 0 | 92 test files / 743 tests passed |
| `pnpm lint` | 0 | 0 errors; 11 pre-existing warnings |
| `pnpm typecheck` | 0 | TypeScript check passed |
| `pnpm build` | 0 | Next.js 16.2.1 production build passed; seven static and one dynamic route |
| `git diff --check` | 0 | No whitespace errors at pre-close and detached preview |

## Canonical Reconciliation And Handoff

- Task 133 `Tagged` → `Reflected`: canonical Task 133 now includes
  `triage-workspace.tsx` and its test for Task 131 authoritative count headings.
- Task 134 `Tagged` → `Reflected`: canonical Task 134 now includes
  `triage-workspace.tsx` and its test for stale-placement callback wiring.
- Task 135 canonical impact remains `None`.
- Blocking conformance violations: 0. Advisory conformance violations: 0.
- Active Phase 26 issues: 0. Phase Notes: not used by adapter policy.
- Pinned pre-close SHA: `cb09da04557bad3b253b87581a70d7ee24e630b6`.
- Approved base and fetched integration `main`:
  `f91bf0529961541d9b7fa1645ee3aded081eaea3`.
- Phase 26 completion starts neither Task 136 nor Phase 27; both require their
  own explicit lifecycle authority.

**Full issue log:**
[`docs/issues/Issues_Phase_26.md`](../../issues/Issues_Phase_26.md)

## Task Contracts

The accepted task contracts, moved verbatim from `docs/EXECUTION_PLAN.md`
on 2026-10-25; relative links are rebased to this folder.

### Task 127: [x] Establish canonical session and two-preference ownership

**Files and actions:** modify `src/stores/triage-store.ts` and `.test.ts`; create `src/stores/triage-preferences-store.ts` and `.test.ts`. Add app-session selected Scratch, Pool expanded/manual-reopen/query/result/scroll, and Explorer path/open-columns/column-scroll ownership without removing or renaming the candidate fields/actions that current consumers still call. Retain those candidate fields/actions unchanged as explicitly deprecated, non-authoritative compatibility state; no new consumer may adopt them, and they must not become persisted candidate truth. Task 163 alone removes the compatibility API after every consumer has migrated to the Task 131 durable candidate boundary. Prohibit adding Newly, drafts, active/interrupted Explorer search, placement, completion, or recovery state. Persist and validate exactly Pool created-at sort and Breakdown created-at sort in the preference store, default each independently to DESC, and expose no other persistence.

**Dependencies:** Task 101.

**Authority / flows:** SPEC Inbox/Triage State Ownership; `UF-02`–`UF-04`, `UF-17`; `AF-05`; `NEG-05`, `NEG-17`.

**Recipe:** Not applicable — data/nonvisual.

**Observable acceptance:** same-session route re-entry can restore allowed selection/Pool/Explorer context, reload resets it, and only the two sorts survive. The deprecated candidate fields/actions remain callable with their pre-Task-127 names and behavior while staying non-authoritative and unpersisted; aside from that temporary compatibility surface, neither API can store durable/page/recovery/Newly state.

**Verification:** focused store tests for valid/invalid persisted values, route/reload reset, state-shape exclusions, preserved candidate field/action compatibility plus deprecation, no persisted candidate keys, and no Newly keys; `pnpm typecheck`.

**Commit contract:** the two state owners and tests only; `feat(triage): establish inbox state lifetimes`.

### Task 128: [x] Create the single core-English copy owner

**Files and actions:** create `src/lib/copy/inbox-triage.ts` and `.test.ts` with typed keys for source-approved section names, base actions, validation, lifecycle reasons, live regions, and accessible names. Represent each unresolved receipt-dependent key as explicitly unavailable—never inferred text. Components may import only this owner for new Inbox/Triage system wording. Tasks 138, 140, 141, 143, 144, 147, 148, 150, 151, 153, 154, 157, 160, and 162 populate only their accepted receipt keys under the `copy` mutex.

**Dependencies:** plan approval/lifecycle only.

**Authority / flows:** SPEC Copy and Localization; `AF-10`; `D-LOCALE` remains excluded.

**Recipe:** Not applicable — data/nonvisual.

**Observable acceptance:** base copy is typed and complete; unresolved VQ strings cannot be accidentally rendered; no component adds a second core-English owner; no locale provider/toggle is introduced.

**Verification:** `pnpm test -- src/lib/copy/inbox-triage.test.ts`; `rg` the triage component directory for newly distributed receipt strings; `pnpm typecheck`.

**Commit contract:** copy resource and its test only; `feat(triage): centralize inbox copy`.

### Task 129: [x] Build the semantic four-area Inbox shell

**Files and actions:** modify `src/components/triage/triage-workspace.tsx` and `.test.tsx` plus `src/app/globals.css` to implement one semantic tree with visible Scratch Pool, Breakdown, Staging, and Grid Explorer section identities; exact 60/40 main and 60/40 top ratios; theme envelope/data-state roles; desktop 1024px minimum; hidden-scrollbar treatment; and stable focus landmarks. Do not own Explorer item labels, which belong to Task 134, and do not copy prototype state/handlers.

**Dependencies:** Tasks 128 and existing canonical route dispatch.

**Authority / flows:** `UF-01`; `AF-03`, `AF-10`; `NEG-01`, `NEG-02`, `NEG-11`.

**Recipe:** [`Shell and section chrome`](../../recipes/inbox-triage-shell-section-chrome-visual-recipe.md).

**Observable acceptance:** open the canonical Inbox route and identify all four regions by sight and accessibility tree at 1024px and 1920×1080; theme/mode changes preserve the same component tree and focus.

**Verification:** focused Workspace test, `pnpm lint`, `pnpm typecheck`; run the route in default light/dark at both widths and record landmarks, ratios, focus, captures, and overflow in `docs/verification/inbox-triage/task-129.md`.

**Commit contract:** Workspace shell/test, semantic shell CSS, and Task 129 evidence only; `feat(triage): add semantic inbox shell`.

### Task 130: [x] Implement Pool selection, tools, collapse, and re-entry

**Files and actions:** modify `src/components/triage/scratch-pool.tsx` and `.test.tsx`, `src/hooks/use-inbox.ts` and `.test.tsx`, `src/stores/triage-store.ts` and `.test.ts`, and `src/stores/triage-preferences-store.ts` and `.test.ts`. Implement active fallback/null, expanded tools/list, total versus filtered counts, base selected/empty states, persisted sort, session query/scroll, vertical collapsed switchers, hidden-query independence, first-printable Breakdown key collapse once, per-Scratch manual-reopen exception, same-session re-entry, and deterministic focus restoration using Task 128 copy. Also modify `src/components/bit-detail/bit-detail-popup.tsx` and `.test.tsx` so the globally mounted detail surface never offers Promote to Node for an Inbox-parented Scratch, even when defensive Chunk data exists; the Task 105A repository guard remains the safety backstop and ordinary Chunk-backed Bit promotion remains available. Do not implement `VQ-01` or Pool `VQ-06` states.

**Dependencies:** Task 105A and Tasks 127–129.

**Authority / flows:** `P23-03`, SCHEMA Hook 9; `UF-02`–`UF-04`; `NEG-05`, `NEG-17`.

**Recipe:** [`Scratch Pool`](../../recipes/inbox-triage-scratch-pool-visual-recipe.md).

**Observable acceptance:** auto-selection never chooses a hidden mismatch or steals focus; counts differ correctly; collapsed controls ignore hidden query; first-printable collapse/manual reopen/re-entry/reload follow the exact lifetime contract. A defensive Inbox-parented Scratch with Chunks exposes no Promote action, while an ordinary eligible Bit with Chunks still does.

**Verification:** focused Pool/Inbox/store and `bit-detail-popup.test.tsx` tests; run canonical route with populated/filtered/collapsed/re-entry/true-empty seeds and record keyboard/focus/count/capture evidence at 1024px and 1920×1080 in `docs/verification/inbox-triage/task-130.md`; `pnpm typecheck`.

**Commit contract:** Pool/Inbox/state-owner integration, the exact P23-03 popup visibility guard, tests, and Task 130 evidence only; `feat(triage): implement scratch pool base flow`.

### Task 131: [x] Add the durable candidate reactive boundary

**Files and actions:** create `src/hooks/use-staged-candidates.ts` and `.test.tsx` to subscribe to durable candidates, join authoritative Breakdown content, dispatch Task 121 Stage/Unstage and Task 122 confirmed-orphan commands, project pending/unknown separately from durable truth, and expose authoritative count/eligibility inputs. A cache/offline/delayed miss remains unresolved; it is neither a renderable candidate nor orphan proof. Import no candidate state from Zustand and sequence no component writes.

**Dependencies:** Tasks 121 and 122.

**Authority / flows:** `UF-13`, `UF-16`; `AF-02`, `AF-05`, `AF-08`; `NEG-15`, `NEG-16`.

**Recipe:** Not applicable — data/nonvisual.

**Observable acceptance:** route/reload subscription reconstructs candidates and current source text; remote source edits update labels; unresolved source miss causes no cleanup; components need no Dexie/DataStore import.

**Verification:** `pnpm test -- src/hooks/use-staged-candidates.test.tsx`; cover delayed source, confirmed proof, command result families, counts, and subscription cleanup; `pnpm typecheck`.

**Commit contract:** candidate hook/test only; `feat(triage): add reactive staged candidates`.

### Task 132: [x] Implement Context and Breakdown base lifecycle

**Files and actions:** modify `src/components/triage/breakdown-panel.tsx` and `.test.tsx`, `src/hooks/use-scratch-breakdowns.ts` and `.test.tsx`, and `src/stores/triage-preferences-store.ts` and `.test.ts`. Render standalone signature Context, full title/time/sort, active/staged/consumed-removal rows, grip/actions, and distinct never-used/all-deleted/ordinary/completion states from repository data and Task 131 projections. Staged rows remain disabled/non-struck; consumed rows leave active Breakdown; preserve visible Edit/Trash slots without implementing VQ editors/statuses.

**Dependencies:** Tasks 120, 127–131.

**Authority / flows:** `UF-06`, `UF-12`; `AF-02`; `NEG-16`.

**Recipe:** [`Selected Scratch Context`](../../recipes/inbox-triage-selected-scratch-context-visual-recipe.md) and [`Breakdown rows and empty states`](../../recipes/inbox-triage-breakdown-row-empty-visual-recipe.md).

**Observable acceptance:** Context is standalone and roughly 2–2.5 rows high; Breakdown sorting is stable; rows omit numbering/time; active/staged/consumed and all empty histories are visibly/semantically distinct without implying completion incorrectly.

**Verification:** focused Breakdown/hook/preference tests; run never-used, all-deleted, active, staged, consumed-removal, and completed seeds in default light/dark and record captures, sorting, focus, and accessibility in `docs/verification/inbox-triage/task-132.md`; `pnpm typecheck`.

**Commit contract:** Context/Breakdown base, tests, and Task 132 evidence only; `feat(triage): build breakdown base surfaces`.

### Task 133: [x] Implement source-backed Staging base

**Files and actions:** modify `src/components/triage/staging-zone.tsx` and `.test.tsx`, `src/components/triage/triage-drag-token.tsx` and `.test.tsx`, and `src/components/triage/triage-workspace.tsx` and `.test.tsx`. Render Task 131 candidates with visible Staging/Nodes/Bits identity, exact 35/65 split, stable createdAt DESC then ID order, count prefixes at 2+, quiet empty wells, independent hidden-scroll lists, distinct Node-card/Bit-row shapes, whole-root activation semantics, and compact pointer-centered overlay. Project Task 131 authoritative counts into the existing Workspace Nodes/Bits headings without changing their IDs, semantics, focus structure, or layout. No large empty cards, internal handles, primary click, permanent Unstage, other shell behavior, or `VQ-06` state appearance.

**Dependencies:** Tasks 129 and 131.

**Authority / flows:** `UF-13`; `NEG-06`, `NEG-08`, `NEG-12`.

**Recipe:** [`Staging`](../../recipes/inbox-triage-staging-visual-recipe.md).

**Observable acceptance:** Nodes/Bits retain distinct shapes and correct split/order/counts; whole roots expose drag semantics without internal grip; last items remain reachable without panel resize or visible scrollbar chrome.

**Verification:** focused Staging/token tests; run empty, one-item, multi-item, overflow, Node/Bit, and pointer-token states at both widths and record captures/interaction/focus in `docs/verification/inbox-triage/task-133.md`; `pnpm typecheck`.

**Commit contract:** Staging/token base, tests, and Task 133 evidence only; `feat(triage): render durable staging base`.

### Task 134: [x] Implement Explorer columns, full labels, session restoration, and remote anchoring

**Files and actions:** modify `src/components/triage/hierarchy-explorer.tsx` and `.test.tsx`, `src/stores/triage-store.ts` and `.test.ts`, and `src/components/triage/triage-workspace.tsx` and `.test.tsx`. Move hierarchy path/open columns/column scroll to app-session ownership; render Home plus full ancestor/column labels; validate re-entry; anchor remote insertions by first visible stable ID plus offset; fall to nearest valid ancestor without sibling/ghost substitution; restore deterministic heading/ancestor focus; and close stale placement without write by invoking the Workspace-owned existing `handlePlacementCancel` callback when Explorer validation invalidates the target. Remove component-local abbreviated labels and active-column filtering, leaving the dedicated search body absent until Task 151 and adding no other Workspace behavior.

**Dependencies:** Tasks 127–129 and current reactive grid reads.

**Authority / flows:** `UF-17`; `AF-05`, `AF-09`; `NEG-03`, `NEG-10`.

**Recipe:** [`Grid Explorer`](../../recipes/inbox-triage-grid-explorer-visual-recipe.md).

**Observable acceptance:** all column/path labels are full; Scratch switch preserves Explorer context; same-session re-entry validates it while reload starts Home; remote inserts preserve anchor/selection/focus and invalid suffix falls only to the nearest valid ancestor.

**Verification:** focused Explorer/store tests; run Home/deep path/re-entry/reload/remote insert/delete/move at both widths and record full-label, anchor, fallback, focus, and capture evidence in `docs/verification/inbox-triage/task-134.md`; `pnpm typecheck`.

**Commit contract:** Explorer base/state ownership, tests, and Task 134 evidence only; `feat(triage): build explorer session columns`.

### Task 135: [x] Build dedicated whole-hierarchy Explorer query lifecycle

**Files and actions:** create `src/lib/utils/grid-explorer-search.ts` and `.test.ts`; create `src/hooks/use-grid-explorer-search.ts` and `.test.tsx`. The pure utility traverses all active reachable Node/Bit descendants from every visible Home root; excludes Chunks, archived/trashed/system/hidden/unreachable items; uses whitespace AND matching and exact canonical rank/tie order; preserves type/path/ancestor identity for duplicates. The mounted-page hook owns request identity, cancellation, loading/error/stale response, reactive updates, active/interrupted query, result scroll/focus, and result disappearance. It never imports/extends `useSearch()` or `searchAll()` and renders no unsupported body.

**Dependencies:** Task 101 and existing reactive grid reads.

**Authority / flows:** `UF-18`, `UF-19`; `AF-02`, `AF-09`; `NEG-10`.

**Recipe:** [`Grid Explorer`](../../recipes/inbox-triage-grid-explorer-visual-recipe.md).

**Observable acceptance:** query/ranking/exclusions/duplicates are deterministic; stale requests cannot replace current results; the hook distinguishes active and DnD-interrupted search without persisting either across route exit/reload; global Search code remains untouched.

**Verification:** focused utility/hook tests for traversal, rank, duplicates, request races, reactive updates, disappearance, interruption, and reset; `pnpm typecheck`; `rg` proves no global Search dependency.

**Commit contract:** dedicated search utility/hook and tests only; `feat(triage): add explorer search model`.
