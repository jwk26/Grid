# Phase 29 — Mounted-Page Newly Placed And Undo

## Completion Summary

Tasks 155–158 were explicitly accepted on the isolated
`phase-29/mounted-page-newly-placed-undo` branch. The phase delivers
mounted-page local placement provenance, actual-card Newly markers and
source-aware Undo, the complete `DP-VQ10` state realization, and Search-result
Undo composition. Its equal-weight workflow pilot closes with a revised
comparative audit and an unapplied post-publication improvement handoff.
Phases 30–31 remain unstarted.

| Task | Accepted deliverable | Implementation / evidence | Acceptance |
| --- | --- | --- | --- |
| 155 | Mounted-page Newly provenance over actual Node/Bit cards | `0bdd1a8` → `638789c` | `2dfab80` |
| 156 | Ordinary-card source-aware Undo independent of Search | `5b37084` + `b81bd44` → `bd93576` | `d0bb079` |
| 157 | `DP-VQ10` Newly/Undo state realization | `86f2ea5` + `61c6b03` + `489f6a0` → `fef2c01` | `57afa67` |
| 158 | Explorer Search-result Undo composition | `f041af0` + `81c2f1e` → `0ccbae0` | `197e2dc` |

The final accepted product `src` tree is
`36a32647ec8fd7587e0942960f948881d819f624`. Task evidence blobs are
`826065b13667680a62919790961f17eaa95ca4c2`,
`5c9369e6c407631d72f7f2d6c5583bd6d25dda2a`,
`a713032fc6c92cb2eb0421c96b834a814242b735`, and
`60808058ce5f5f631cd333c0117778791abfc727`.

## Accepted Foundation

- Only results created by the mounted Inbox page receive in-memory Newly and
  Undo provenance; Scratch/path/theme changes preserve it and route exit or
  reload ends it.
- NodeCard and BitCard remain the actual card owners. Selection, Newly,
  eligibility, operation state, and focus are independent semantic states.
- Ordinary Undo validates exact result, source, candidate, descendants,
  placement lock, shared operation lock, and edit intent before the single
  authoritative command. Pending/unknown/reconciling retain provenance and
  terminal success restores the correct source/candidate semantics.
- `DP-VQ10` checking, available, re-enabled, unavailable, pending, unknown,
  reconciling, not-applied, conflict, Retry, and success mappings are reflected
  in the approved recipe and design-token owners.
- Search-result Undo reuses the ordinary model without becoming a DnD source,
  retains query/scroll for non-success, removes only the successful result,
  and focuses the current next result at the removed index or the input.

These accepted behavioral and DOM/state contracts do not establish prototype
or theme visual fidelity.

## Verification And Acceptance

Every task has committed product evidence, workflow measurement, and explicit
user acceptance in
[`docs/issues/Issues_Phase_29.md`](../../issues/Issues_Phase_29.md). The fresh
candidate-pinned end-phase terminal gate ran at clean pre-close
`197e2dc92c39b85d6b62319ae7f18edbd73c15ce`; no superseded Candidate A result
was reused:

| Command | Exit | Result | Elapsed |
| --- | ---: | --- | ---: |
| `git diff --check` | 0 | no whitespace errors | `0.00s` |
| focused `pnpm typecheck` | 0 | TypeScript passed | `3.95s` |
| `pnpm test` | 0 | 99 files / 1,196 tests | `23.26s` |
| `pnpm lint` | 0 | 0 errors / 11 unchanged warnings | `8.57s` |
| `pnpm typecheck` | 0 | TypeScript passed | `1.28s` |
| `pnpm build` | 0 | Next.js 16.2.1; seven routes | `11.40s` |

The full four-command total was `44.51s`. Runtime token/accounting and prompt
bytes were `not measured`. Task owner tests remain evidence only for their
declared DOM/state/interaction invariants; no Phase 29 browser visual-fidelity
comparison was run.

## Visual Finding And Explicit Deferral

After stale `.next` output was cleared and fresh development output was
generated, the user manually observed that ordinary Explorer Node/Bit cards no
longer resemble the theme-specific compact card/list treatment in the eight
Inbox prototypes. The broader latest Inbox surface also remains materially
distant in theme-specific typography, borders, section treatment, Breakdown
Edit/Delete controls, Node/Bit card shapes, and related visual details.

This is one `Advisory`, user-approved `Explicitly Deferred` issue (`P29-01`),
not visual acceptance. Exact route, viewport, capture ID, theme/mode,
interaction/focus metadata are `not captured`; elapsed time and token usage are
`not measured`. Read-only source inspection confirms only that ordinary
Explorer rows compose shared `NodeCard`/`BitCard` owners. The Phase 29
Explorer-card gap remains distinct from broader campaign-wide eight-theme
fidelity debt.

No Phase 29 product repair occurs before close. The resume owner is Phase 31,
after Task 163 integration and before Task 164 repair work: a read-only audit
against the eight prototype routes and canonical recipes must name exact
owners, paths, affected tasks, and follow-up scope. The audit grants no repair,
task reopening, owner expansion, product/design decision, or new-task
authority. Task 164 owns only its canonical conformance/fidelity contract and
any separately approved follow-up plan.

## Phase 30 Browser-Evidence Handoff

- Do not run an eight-theme × light/dark × multi-viewport Phase 30 fidelity
  matrix; Task 164 owns the aggregate comparison.
- Task 159 keeps its current canonical visual authority and receives bounded
  running-app evidence for eligibility transition, Cancel/Reopen, withdrawal,
  and focus. It does not start a visual redesign or overall-fidelity repair.
- Task 160 receives one bounded representative check for fixed Context
  geometry and blocker placement, not a full theme matrix.
- Tasks 161–162 may share one final-input browser session for real
  `sessionStorage`, reload/reconciliation ordering, and browser
  focus/lifecycle invariants not established by owner tests.
- Newly observed mismatches are recorded and not silently repaired outside the
  active task contract.
- Task 164 retains the full eight-theme, light/dark, viewport, motion,
  accessibility, and prototype/recipe comparison required by its canonical
  contract.

## Canonical, Issue, And Conformance Reconciliation

- Tasks 155, 156, and 158 have canonical impact `None`. Task 157 is
  `Reflected` only in its approved Newly/Undo recipe and
  `docs/DESIGN_TOKENS.md`. No unresolved `Tagged` item remains.
- Active Phase 29 issues: `0`. Blocking conformance violations: `0`.
  Advisory conformance findings: `1`, `P29-01`, terminally Deferred.
- `docs/issues/Issues_Deferred.md` contains the synchronized navigation pointer
  and explicitly grants no implementation authority.
- The Task 158 acceptance message omitted the requested word `checkpoint`.
  Parent/tree/scope/acceptance are exact, so the audit records it as a
  non-material workflow variance and does not rewrite history.
- The revised workflow audit retains all actual measurements, supplies all 11
  hypothesis verdicts and seven decision answers, and records safeguards,
  limitations, owner classification, and the exact unapplied change/test plan.
- No new entry is added to `docs/execution-plan/LEARNINGS.md`: the experiment
  remains owned by its audit and post-publication handoff. Phase Notes are
  `not used` by Adapter policy.

## Integration And Workflow Handoff

The primary integration worktree is clean on `main` at
`f3c2be6b2afa2da51cde39d22c13eabf2286f296`, equal to fresh `origin/main`.
The earlier user-owned integration changes remain preserved, untouched, in
stash `fbc33307802ca8a1baa334eb3f20507f39c86c9d` and preservation branch
`wip/storage-reliability-cloud-sync-2026-08-26` at
`f92189d3a698cce2fab98b1d8fb981647f387771`; unrelated stash
`de07832a8b4150203b663349a1eaf220bfd4b1a6` also remains untouched. The stale
primary-integration blocker is resolved by that verified preservation state.

The final workflow recommendation is not the one-off support commit
`fbd1a1995b50c26c3e669bdb5243cec3ca324bb8`. That commit stays historical and
read-only. After Phase 29 publication, integration sync, and cleanup, a
separate workflow-improvement lifecycle may start only when pinned to the
merged Phase 29 audit blob, exact Final Close receipt blob/SHA-256, and
candidate `94e89782f7fe2cdbdd035e842ca6881b4a87ce49`.

The Final Close receipt remains absent. No push, PR, merge, integration sync,
cleanup, or Phase 30–31 implementation occurred during candidate preparation.

**Full issue log:**
[`docs/issues/Issues_Phase_29.md`](../../issues/Issues_Phase_29.md)

**Comparative workflow audit:**
[`docs/verification/inbox-triage/phase-29-workflow-pilot-audit.md`](../../verification/inbox-triage/phase-29-workflow-pilot-audit.md)

## Task Contracts

The accepted task contracts, moved verbatim from `docs/EXECUTION_PLAN.md`
on 2026-10-25; relative links are rebased to this folder.

### Canonical two-track gate

Phase 29 runs two equal-weight tracks under its own approved Gate C and a fresh
branch/worktree:

- **Track A — product:** implement and accept Tasks 155–158 under their exact
  existing contracts.
- **Track B — workflow audit:** replicate the unchanged candidate commit
  `94e89782f7fe2cdbdd035e842ca6881b4a87ce49`, record actual measurements,
  compare Phases 28 and 29, and produce exact unapplied skill/reference/test
  improvement handoff. Its continuity owner is
  `docs/verification/inbox-triage/phase-29-workflow-pilot-audit.md`.

Every Task 155–158 implementation checkpoint is incomplete until both product
evidence and the matching audit row are committed. An acceptance-only commit
does not change the audit. The product contract is not duplicated into the
audit, and audit measurements are not repeated in the task sections.

Phase 29 may close only when Tasks 155–158 are `[x]`, Accepted and the audit
contains four task measurement rows, finding/limitation disposition, a Phase
28/29 comparison, a `retain` / `change` / `reject` / `insufficient evidence`
verdict for every `WF28-01`–`WF28-11` item, answers to all seven decision
questions, and the exact skill/reference/test change plan that was not applied
during the phase. Candidate skill and Adapter files remain read-only throughout
Phase 29. The pilot does not automatically extend to a third phase.

### Task 155: [x] Project Newly Placed provenance over actual cards

**Files and actions:** create canonical `src/hooks/use-triage-newly-placed.ts` and `.test.tsx`; modify `src/components/triage/triage-workspace.tsx` and `.test.tsx`, `src/components/triage/hierarchy-explorer.tsx` and `.test.tsx`, `src/components/grid/node-card.tsx` and `.test.tsx`, and `src/components/grid/bit-card.tsx` and `.test.tsx`. Instantiate the hook at the mounted Inbox page/workspace, never in `triage-store`; register only Task 152 placements started/confirmed by that mounted page using stable result/type/source/candidate/operation provenance; layer a semantic marker slot on actual NodeCard/BitCard; pin locally new Nodes/Bits newest-first within their type projection without changing stored x/y; preserve marker across Scratch/path/theme changes; clear marker/pinning/Undo provenance on Inbox route exit/reload/unmount, not Scratch switch. Remote/other-tab records remain ordinary. Add no second Newly owner and do not redesign cards.

**Dependencies:** Tasks 123 and 152.

**Authority / flows:** `UF-24`; `AF-05`, `AF-09`; `NEG-11`, `NEG-17`; `D-CARD`.

**Recipe:** [`Newly placed and Undo`](../../recipes/inbox-triage-newly-placed-undo-visual-recipe.md).

**Observable acceptance:** marker is on the real card, independent from selection, and appears only for local mounted-page results; x/y remains unchanged; multiple markers/type pinning survive Scratch/path/theme change; route exit/reload clears; no Zustand/Newly persistence or duplicate card model exists.

**Verification:** focused hook/Workspace/Explorer/NodeCard/BitCard tests; run local/remote Node/Bit, multiple results, selection overlap semantics, pinning, Scratch/path/theme, route exit, and reload, recording `docs/verification/inbox-triage/task-155.md`; `pnpm typecheck`.

**Commit contract:** canonical mounted-page Newly owner, actual-card semantic slots, tests, and Task 155 evidence only; `feat(triage): project newly placed cards`.

### Task 156: [x] Connect ordinary-card source-aware Undo independently of search

**Files and actions:** modify `src/hooks/use-triage-newly-placed.ts` and `.test.tsx`, `src/components/triage/hierarchy-explorer.tsx` and `.test.tsx`, `src/components/grid/node-card.tsx` and `.test.tsx`, and `src/components/grid/bit-card.tsx` and `.test.tsx`; extend `src/hooks/use-triage-operation-lock.test.tsx`. Derive ordinary-card Undo availability/reason from exact current result/source/candidate/dependency truth; keep marker and eligibility separate; stop Undo activation from bubbling into card navigation. Before dispatch, synchronously acquire Task 136's shared `undo` lock; retain actual card/source and the complete matrix through pending/unknown/reconciling, reject duplicate/competing action without queue/replay, and release only on terminal result. Another active owner, result mutation, descendants, open placement, or dirty Edit intent disables Undo; re-enable after terminal release or child-first Undo. Restore staged/direct source/candidate/path and focus. Do not import or depend on Explorer search or `DP-VQ07`.

**Dependencies:** Tasks 124, 136, 137, 139, 152, and 155; deliberately not Tasks 114 or 151.

**Authority / flows:** ordinary-column portion of `UF-25`; `AF-02`, `AF-07`, `AF-09`; `NEG-18`, `NEG-20`.

**Recipe:** [`Newly placed and Undo`](../../recipes/inbox-triage-newly-placed-undo-visual-recipe.md).

**Observable acceptance:** ordinary cards expose base Undo placement/semantics without Search; selection/navigation never revokes eligibility; Undo acquires once, keeps the full matrix through unknown/reconciliation, and releases only at terminal; blocked intents write/navigate/replay nothing; child-first recovery re-enables; staged restores same candidate provenance, direct does not invent one; success focuses next card → previous → column heading.

**Verification:** focused operation-lock/hook/Explorer/card/departure tests for staged/direct, the complete pending matrix, duplicate/competing acquisition, mutation, descendants, child-first, dirty Edit, pending/unknown/reconcile/terminal release, event propagation, and focus; run ordinary-card flows and record `docs/verification/inbox-triage/task-156.md`; `pnpm typecheck`.

**Commit contract:** ordinary-card Undo model/adapter, tests, and Task 156 evidence only; `feat(triage): connect ordinary card undo`.

### Task 157: [x] Render `DP-VQ10` Newly and Undo states

**Files and actions:** after `DP-VQ10`, modify `src/hooks/use-triage-newly-placed.ts` and `.test.tsx`, `src/components/triage/hierarchy-explorer.tsx` and `.test.tsx`, `src/components/grid/node-card.tsx` and `.test.tsx`, `src/components/grid/bit-card.tsx` and `.test.tsx`, `src/app/globals.css`, `src/lib/copy/inbox-triage.ts` and `.test.ts`. Populate approved wording and render selected+newly overlap, available/ineligible/re-enabled reasons, undoing/failure/reconcile/retry/conflict, marker/control placement, timing, focus, reduced motion, and themes without repeated motion or common-card redesign.

**Dependencies:** Tasks 117, 128, 155, and 156.

**Authority / flows:** `DP-VQ10`, `UF-24`, `UF-25`; `NEG-11`, `NEG-21`; `D-CARD`.

**Recipe:** [`Newly placed and Undo`](../../recipes/inbox-triage-newly-placed-undo-visual-recipe.md).

**Observable acceptance:** marker, selection, and eligibility are independently perceivable; reasons work by keyboard/touch without hover; all result states are exact; no pulse/flicker or card redesign occurs.

**Verification:** focused hook/Explorer/card/copy state tests; run overlap, every reason/result, child-first re-enable, keyboard/touch, focus, reduced motion, and themes, recording `docs/verification/inbox-triage/task-157.md`; `pnpm typecheck`.

**Commit contract:** DP-VQ10 copy/realization, tests, styles, and Task 157 evidence only; `feat(triage): render newly placed undo states`.

### Task 158: [x] Integrate Undo into Explorer search results only

**Files and actions:** modify `src/components/triage/grid-explorer-search-results.tsx` and `.test.tsx`, `src/components/triage/hierarchy-explorer.tsx` and `.test.tsx`, `src/hooks/use-grid-explorer-search.ts` and `.test.tsx`, and `src/hooks/use-triage-newly-placed.ts` and `.test.tsx`. Reuse Tasks 156–157 Undo model/realization in the `DP-VQ07` body without making search rows DnD sources. Locally placed records enter matching results immediately. Undo from a result retains active query/scroll, removes only the undone result after terminal success, announces source restoration, and focuses the next surviving result at the removed row's position when one exists; otherwise it focuses the search input, with no previous-result fallback. Unknown/failure keeps the result. Do not change ordinary-column Undo dependencies or behavior.

**Dependencies:** Tasks 114, 151, 156, and 157.

**Authority / flows:** search-only portions of `UF-19`, `UF-25`; `AF-02`, `AF-09`; `NEG-10`, `NEG-18`.

**Recipe:** [`Grid Explorer`](../../recipes/inbox-triage-grid-explorer-visual-recipe.md) and [`Newly placed and Undo`](../../recipes/inbox-triage-newly-placed-undo-visual-recipe.md).

**Observable acceptance:** result Undo preserves query, removes only the terminally undone result, focuses the next result or otherwise the search input with no previous-result fallback, and never becomes a drag source; ordinary Undo remains usable even if `DP-VQ07`/Task 151 was delayed before this search-only task.

**Verification:** focused results/search/Newly/Explorer tests; run matching/nonmatching local result, pending/failure/unknown/success, list-edge focus, query retention, route exit, and ordinary-column regression, recording `docs/verification/inbox-triage/task-158.md`; `pnpm typecheck`.

**Commit contract:** search-result Undo integration, tests, and Task 158 evidence only; `feat(triage): integrate undo in explorer search`.
