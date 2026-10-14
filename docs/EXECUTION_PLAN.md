# GridDO Inbox/Triage Implementation Execution Plan

> **Current authority — 2026-10-03:** the targeted amendment and complete
> document/flow chain are accepted under the six
> `Craft_Docs.inbox-triage-theme-realization-*.json` receipts in
> [docs/receipts](receipts/).
> Their exact committed artifact hashes own approval; original Draft headings
> in other approval-time snapshots do not override those receipts.
> **Phase state:** Phases 23–31 are completed/archive-only under their respective
> Final Close transactions. Phase 31 closes accepted Task 163 and bounded
> technical corrections, not eight-theme visual completion. Its actual
> publication/main-sync proof is owned by
> [Final Close Phase 31](issues/Final_Close_Phase_31.json).
> **Task state:** Tasks 101–163 and 105A retain explicit user acceptance.
> Tasks 164–165 are historical, unaccepted `[ ]` transfer records.
> Tasks 166–171 are accepted `[x]`; Tasks 172–208 are `[ ]`, planned and
> unstarted. Phases 32–33 remain reserved.
> **Workflow:** from Task 171, tasks run under the lightweight workflow in
> [WORKFLOW.md](WORKFLOW.md) (`/run-phase`, `/run-task`, `/end-phase`).
> Planning approval and technical gates never grant visual acceptance.
> Phase 30 and original Task 163 acceptance records are unchanged.
## Goal

Implement the approved Inbox/Triage workspace as one production component tree with a validated Dexie v4 model, monotonic revisions, real all-or-nothing transactions, durable candidates, lifetime-correct UI state, dedicated Explorer search, pointer placement, source-aware Undo, guarded Archive recovery, and source-backed eight-theme presentation without inventing any unresolved visual or content decision.

## Historical Execution Plan Approval Receipt — 2026-07-28

- **Gate:** the complete clean-room execution graph in this document.
- **User disposition:** approved on 2026-07-28 after Ultra clean-context
  derivation and consolidated review.
- **Approved artifact:** content commit
  `c9a2112f8554026510ac1135cfb7c3243d337151`, containing the exact
  pre-receipt `docs/EXECUTION_PLAN.md` whose SHA-256 is
  `052ca15b137fbbc3e9f89d926b4afd0a8eef60c08aa135985f005e6c944eb9db`.
- **Approved scope:** active Phases 23–31, open Tasks 101–165, reserved Phases
  32–33, next numbers Phase 34 / Task 166, fourteen Decision-prerequisite
  receipts for twelve VQs, and the declared writer/mutex and evidence rules.
- **Supersession:** the prior open Phase 23–33 / Task 101–154 planning graph is
  wholly superseded; none of its task meanings remains independently active.
- **Preserved boundary:** all task markers remain open. This receipt does not
  onboard `run-phase`, `run-task`, or `end-phase`, authorize code or Git
  lifecycle work, resolve any `VQ-*`, or mark implementation complete.
- **Historical next legal action at that approval:** derive a fresh flow review from this approved plan and
  the approved canonical authority chain, then stop at its user gate.

## Architecture

The DataStore/Dexie repository owns durable truth, Zod write validation, complete atomic postconditions, and reconciliation. Reactive hooks project repository truth into the UI; app-session, mounted-page, forced-reload, and device-preference state remain with their canonical lifetime owners. Components compose semantic roles and interactions but do not sequence repository writes, persist candidates, reuse global Search for Explorer, or branch on theme ID.

Phase grouping is organizational, never a blanket dependency chain. Each task names its exact prerequisites. Decision-prerequisite tasks block only their listed receipt edge; unrelated data, headless behavior, and source-backed UI remain independently schedulable.

## Original Clean-Room Provenance — Historical Foundation

This proposal was derived only from:

- `AGENTS.md` (removed 2026-10-15);
- historical `docs/CODEX_WORKFLOW_ADAPTER.md` at the approved
  `c9a2112f8554026510ac1135cfb7c3243d337151` planning commit (removed with the
  Codex workflow; not a current pointer);
- the approved [`PROMOTION_MAP.md`](brainstorming/2026-06-25-inbox-triage-theme-surface-redesign/PROMOTION_MAP.md);
- [`docs/SCHEMA.md`](SCHEMA.md), including its completed 2026-07-28 grid-dimension correction receipt at `07bef1e`, [`docs/SPEC.md`](SPEC.md), [`docs/DESIGN_TOKENS.md`](DESIGN_TOKENS.md), and [`docs/PLANNING_STANDARD.md`](PLANNING_STANDARD.md);
- the approved [`Inbox/Triage visual recipe index`](recipes/inbox-triage-visual-recipe-index.md) and exactly these nine approved recipes:
  1. [`Shell and section chrome`](recipes/inbox-triage-shell-section-chrome-visual-recipe.md);
  2. [`Scratch Pool`](recipes/inbox-triage-scratch-pool-visual-recipe.md);
  3. [`Selected Scratch Context`](recipes/inbox-triage-selected-scratch-context-visual-recipe.md);
  4. [`Breakdown rows and empty states`](recipes/inbox-triage-breakdown-row-empty-visual-recipe.md);
  5. [`Staging`](recipes/inbox-triage-staging-visual-recipe.md);
  6. [`Grid Explorer`](recipes/inbox-triage-grid-explorer-visual-recipe.md);
  7. [`Placement affordances`](recipes/inbox-triage-placement-affordances-visual-recipe.md);
  8. [`Newly placed and Undo`](recipes/inbox-triage-newly-placed-undo-visual-recipe.md);
  9. [`Archive completion`](recipes/inbox-triage-archive-completion-visual-recipe.md); and
- current production source solely to validate landing owners, public boundaries, tests, and the typed-fixture impact surface.

The old `docs/EXECUTION_PLAN.md` and every file under `docs/reviews/` were excluded as derivation inputs.

### Targeted amendment provenance — 2026-10-03

This is an amendment, not a new clean-room replacement of accepted foundations.
Its selected authority is DECISION D01–D36 and the complete approved current
promotion map at `3b95de179fcc10568f8967a89a5f9eb9adaa5f11`, SHA-256
`261d233c76d1641bccb7f4381035d3b10b79b3c61826237f9e71a04a32ad0d79`,
under [its map receipt](receipts/Craft_Docs.inbox-triage-theme-realization-promotion-map.json).
The approved design amendment is the exact `fef8617c2ecf3b8a9fe0335974cbc892d23a05b4`
artifact, SHA-256 `888a61ff583016d984d8f3209e72af5688254e9cd7b68e07d9e181bdf80fa14b`;
its preapproval Draft heading is a snapshot, not its current disposition.
SCHEMA, SPEC, nine recipes, fourteen accepted DP outcomes and accepted Tasks
101–163 are retained. Their accepted inline task contracts below are historical;
forward references to 164/165 now resolve through the transfer register rather
than making those retired tasks runnable.

The functional landing baseline is accepted pre-Test-2 commit
`54d689275cefb5d24c70f562435bb82734c51631`. Prototype
`4f39709688ceb4cac5e15d4e3502186b1f1c801b`, tree
`7b8eb8766a9b57fe2174a948de09cfb7646cf7de`, is read-only visual reference,
not behavior or implementation-byte authority. The external methodology file
supplies only abstract lessons. Test 1–8 code, CSS, tests, fixtures, runners,
images, reports and evidence may not be copied, adapted, reused, imported or
merged. Real future phases extend their accepted canonical predecessors; they
do not rebuild eight isolated production trees. No new storage is required.

## Historical Supersession And Current Number Reconciliation

- The 2026-07-28 approval replaced the former Phase 23–33 / Task 101–154 graph. Its retired meanings do not resume.
- Phases 32 and 33 remain reserved with no tasks. Accepted Tasks 101–163, Phase 30 close and archives remain unchanged.
- On approval of this amendment, 164/165 become historical unaccepted transfer records, not completion prerequisites or reusable task numbers.
- New tasks are 166–208, allocated once across proposed Phases 34–40. The authoritative continuation and graph count are at [Next Numbers](#next-numbers).

## Planning, Completion, And Evidence Rules

- **No phase-wide inference:** a phase number never substitutes for a listed dependency.
- **Code-ready or gated:** a code task is runnable only when all listed dependencies and exact DP receipts exist. Silence never selects a fallback.
- **Verification matches risk:** data, state, persistence, async and drag-and-drop logic get a focused failing test first; observe the intended failure, implement the smallest slice, rerun focused tests, then run the broader checks. Layout, styling and copy are verified in the running app.
- **Authoritative results:** pending or unknown transport outcome is not success. Source truth remains visible until a complete repository postcondition is proven.
- **Narrow commits:** a task's commits contain only its implementation, tests, and plan/ledger updates. Shared-file writers obey the mutex register below.
- **Running-app checks near the change:** every user-visible task is checked in the running app with test data. Screenshots are shown in the conversation and never committed; there is no per-task evidence report or assets directory. The ledger checkpoint records what was compared, retained differences, and the user's first judgment separately from the final disposition ([PLANNING_STANDARD §5.3](PLANNING_STANDARD.md#53-visual-checks-and-independent-dispositions)). Theme conformance Tasks 172/179/186/193/200/207 and final Task 208 aggregate rather than substitute for regional checks.
- **Source/render separation:** recipe declarations are source authority. A task checkpoint records rendered/interaction checks and never changes recipe authority.
- **Preserve unrelated behavior:** ordinary Grid routing/DnD, Calendar, Trash, Quick Capture, global Search, Bit Detail, Direct Archive, Archive View restore, and system-node lifecycle change only where an explicit task names a compatibility assertion.

## Readiness Summary

| Area | Current status | Smallest blocker / next condition |
|---|---|---|
| Document approval | `ACCEPTED` | Six exact-artifact receipts accept the promotion map, design, plan, planning standard, workflow and flow review. |
| Execution lifecycle | Phase 34 in progress | The Phase 31 publication/sync result is in Final_Close_Phase_31.json. Phase 34 continues on `phase-34/retro-mac-regions`; Phases 35–40 start through `/run-phase`. |
| Data foundations | `COMPLETED` | Tasks 101–105A and authoritative command Tasks 120–126 are accepted and recorded in their phase archives. |
| Decision prerequisites | `COMPLETED` | Tasks 106–119 and all fourteen DP receipts are accepted, reflected, and recorded in the Phase 24 archive. |
| Headless/base UI | Tasks 127–163 accepted | Task 163 integration and bounded R01/I01 corrections are included in the Phase 31 Final Close transaction. Original task evidence is retained; correction/candidate evidence is separate. |
| Theme realization | `IN PROGRESS` | Retro Mac Tasks 166–171 accepted; repair Task 171A precedes Task 172 acceptance. Named regional owners below; Q01/Q02/Q05 gate only their affected slices. No old experiment is evidence of canonical conformance. |
| Phase 31 close | `COMPLETED / ARCHIVED` | R01/C01/I01 corrections are recorded in the archive; fresh candidate/output/browser checks and publication guards must pass before the Final Close receipt is created. No eight-theme-completion claim. |
| Campaign full gate | `PLANNED / UNSTARTED` | Task 208 consumes every accepted foundation and new theme task plus the retained complete matrices. |

## Unaccepted Task 164–165 Transfer Register

**Accepted disposition under the exact execution-amendment receipt.**
The original definitions are preserved in Git at
`d05140626a6e95d4f5ca4897f02f66594af4d753:docs/EXECUTION_PLAN.md`.
Neither task was accepted; neither receives `[x]` or enters Phase 31's active
task list. Transfer is responsibility relocation, not a test pass or deletion
of a promised gate. Subsequent ledger/WORKFLOW records require their own scope.

| Original ID / marker | Disposition | Retained responsibility / replacement owner |
|---|---|---|
| Task 164 `[ ]` | `Transferred / Superseded`, unaccepted | Nine-surface/eight-theme semantic fidelity, motion, accessibility and theme-state preservation: regional Tasks 166–171, 173–178, 180–185, 187–192, 194–199, 201–206; per-theme/mode completion Tasks 172/179/186/193/200/207; final full 16 theme/mode × 1024/1920 evidence in Task 208. The old CSS-only owner restriction is not inherited by the new explicitly named component owners. |
| Task 165 `[ ]` | `Transferred / Superseded`, unaccepted | Complete implementation/preservation all-nodes sink: Task 208, retaining 29 UF, 10 AF, 21 NEG, nine recipes, 14 DP/12 VQ, schema grid correction, migration/rollback/real transactions/three ABA sequences/aggregate retention/Archive recovery and unrelated-surface evidence. |

The former post-163/pre-164 visual-audit checkpoint is not retroactively
accepted. New tasks use their own approved source/element intake and region
dispositions; P29-01, existing deferrals and open findings retain their exact
boundaries. No canonical Task 164 receipt or experiment fingerprint is reused.

## Dependency Graph

```text
101 MODEL
  └─102 MIGRATION
      ├─103 REVISION
      └─104 REAL-TX-HARNESS

102 + 103 + 104 ──105 AGGREGATE-HARD-DELETE
103 + 104 ─────────120 BREAKDOWN-CMDS
103 + 104 ─────────121 STAGING-CMDS
105 + 121 ─────────122 INTEGRITY
120 + 121 ─────────123 PLACEMENT ─124 UNDO
120 + 121 ─────────125 ARCHIVE ─126 ARCHIVE-RECOVERY

106–119 DP Decision tasks: logically parallel, document-write mutex serialized
  └─only the exact realization tasks in the executable DP edge table

127–135 shared owners and base surfaces
  └─136–148 Breakdown/Pool/Staging behavior and realizations
      └─149–154 Explorer/placement behavior and realizations
          └─155–158 Newly/Undo and search-result integration
              └─159–162 completion/Archive behavior and realizations
                  └─163 accepted integration
                      ├─Phase 31 gated correction + technical Final Close
                      └─166→167→168→169→170→171→172  Retro Mac
                                                  └171A┘ (repair; gates 172 acceptance)
                          →173→174→175→176→177→178→179  Neumorphism
                          →180→181→182→183→184→185→186  Terminal
                          →187→188→189→190→191→192→193  Claymorphism + Origami
                          →194→195→196→197→198→199→200  GridDO + Tiny Desk
                          →201→202→203→204→205→206→207  Graphite
                          →208 full implementation/preservation gate

Every accepted foundation, including 105/105A and every DP edge, plus all
Tasks 166–207 feeds Task 208. Retired 164/165 are not dependency nodes.
Cross-phase arrows also require the preceding phase's actual Final Close/main
sync; 166 additionally requires the post-Phase-31 workflow audit disposition.
```

## Phase Index

| Phase | Status | Scope | Tasks | Dependency-aware readiness |
|---|---|---|---|---|
| Phase 23 | Completed | [Model, v4 migration, revisions, real transaction harness, aggregate deletion, and Scratch-promotion guard](execution-plan/archive/phase-23.md) | 101–105 + 105A | Accepted and archived; downstream tasks consume this completed foundation. |
| Phase 24 | Completed | [Fourteen user-owned DP receipts covering twelve VQs](execution-plan/archive/phase-24.md) | 106–119 | Accepted and archived; each later realization consumes only its exact released DP edge. |
| Phase 25 | Completed | [Eleven authoritative commands plus Archive recovery](execution-plan/archive/phase-25.md) | 120–126 | Accepted and archived; downstream tasks consume the completed command foundation by their exact dependencies. |
| Phase 26 | Completed | [Lifetime, copy, and source-backed base-surface owners](execution-plan/archive/phase-26.md) | 127–135 | Accepted and archived; downstream tasks consume only their exact completed dependencies. |
| Phase 27 | Completed | [Breakdown, Pool, and Staging headless adapters and exact realizations](execution-plan/archive/phase-27.md) | 136–148 | Accepted and archived; downstream tasks consume only their exact completed dependencies. |
| Phase 28 | Completed | [Explorer status/search and pointer placement](execution-plan/archive/phase-28.md) | 149–154 | Accepted and archived; the terminal workflow measurement baseline transfers comparative audit to Phase 29. |
| Phase 29 | Completed | [Mounted-page Newly/Undo and comparative workflow audit](execution-plan/archive/phase-29.md) | 155–158 | Accepted and archived; P29-01 remains Explicitly Deferred. Historical Phase 31 audit grants no repair; future narrow Inbox-card authority remains Q01. |
| Phase 30 | Completed | [Completion and Archive coordinator/recovery](execution-plan/archive/phase-30.md) | 159–162 | Accepted and archived; bounded Task evidence remains reusable while its relevant inputs and claimed invariants remain unchanged. |
| Phase 31 | Completed | [Accepted route integration and technical close](execution-plan/archive/phase-31.md) | 163; 164/165 historical unaccepted transfer only | Technical corrections and fresh candidate verification are owned by Final Close; no theme completion or new task acceptance. |
| Phase 32 | Reserved | Retired-number reservation | none | No tasks may be assigned. |
| Phase 33 | Reserved | Retired-number reservation | none | No tasks may be assigned. |
| Phase 34 | In progress | Retro Mac, region-by-region then supported-mode conformance | 166–172 + 171A | Tasks 166–171 accepted; repair Task 171A next, then Task 172 resumes. Subsequent tasks use exact predecessor edges. |
| Phase 35 | Planned / unstarted | Neumorphism, region-by-region then supported-mode conformance | 173–179 | 172 accepted + Phase 34 close/main sync. |
| Phase 36 | Planned / unstarted | Terminal, region-by-region then supported-mode conformance | 180–186 | 179 accepted + Phase 35 close/main sync. |
| Phase 37 | Planned / unstarted | Claymorphism + Origami, one shared writer | 187–193 | 186 accepted + Phase 36 close/main sync; both themes require regional dispositions. |
| Phase 38 | Planned / unstarted | GridDO + Tiny Desk, one shared writer | 194–200 | 193 accepted + Phase 37 close/main sync; both themes require regional dispositions. |
| Phase 39 | Planned / unstarted | Graphite, region-by-region then supported-mode conformance | 201–207 | 200 accepted + Phase 38 close/main sync. |
| Phase 40 | Planned / unstarted | Complete campaign integration and preservation gate | 208 | All accepted Tasks 101–163/105A/166–207, all prior close/main sync and exact retained schema/DP authority. |

## Theme Realization Task Sets

These are finite aliases, not implied phase-wide dependencies. Each task below
binds one landing contract, exact predecessor, theme set and evidence path.
`REGIONS` is the union of POOL/BREAKDOWN/STAGING/EXPLORER/PLACE/ARCHIVE.
`THEMES` is REGIONS plus CONFORM. Task 208 verifies every UF/AF/NEG in addition
to the owners named in the inventories.

| Alias | Exact task IDs | Landing contract |
|---|---|---|
| `POOL` | 166, 173, 180, 187, 194, 201 | L1 — common frame and Scratch Pool |
| `BREAKDOWN` | 167, 174, 181, 188, 195, 202 | L2 — Selected Scratch Context and Breakdown |
| `STAGING` | 168, 175, 182, 189, 196, 203 | L3 — Staging and its compact drag token |
| `EXPLORER` | 169, 176, 183, 190, 197, 204 | L4 — Explorer/Finder base and replacement search |
| `PLACE` | 170, 177, 184, 191, 198, 205 | L5 — Placement, then Newly/Undo |
| `ARCHIVE` | 171, 178, 185, 192, 199, 206 | L6 — Breakdown-scoped completion and Archive |
| `CONFORM` | 172, 179, 186, 193, 200, 207 | L7 — current theme(s), supported modes and regression |

## User Flow Inventory

| ID | User-visible flow | Owning task(s) |
|---|---|---|
| `UF-01` | Enter Inbox through `/grid/[nodeId]` and see the four named areas. | 129, 163; POOL, CONFORM |
| `UF-02` | Initial/re-entry/reload Scratch selection, invalid prior selection, and true empty state. | 127, 130; POOL, ARCHIVE |
| `UF-03` | Expanded Pool search, sort, total/filtered counts, selection, and hidden-selected state. | 127, 130, 144; POOL |
| `UF-04` | Collapsed switching, first-printable-key collapse, manual reopen, and session restoration. | 127, 130; POOL |
| `UF-05` | External archive/delete transition, destination changes, draft copy, and restore. | 106, 141; POOL |
| `UF-06` | Context, Breakdown sort, rows/actions, and ordinary/completion empty distinctions. | 132; BREAKDOWN |
| `UF-07` | Add by Enter/explicit Add with authoritative pending/reconcile/failure/success/focus. | 120, 136, 143, 148; BREAKDOWN |
| `UF-08` | Leave with an Add draft through continue-writing or discard-and-move. | 108, 139, 140; BREAKDOWN |
| `UF-09` | Edit Scratch title with conditional Save/Cancel/validation/offline/conflict/invalidation. | 109, 120, 137, 138; BREAKDOWN |
| `UF-10` | Edit Breakdown content with lifecycle guards and deterministic focus. | 109, 120, 137, 138; BREAKDOWN |
| `UF-11` | Delete non-optimistically with confirmation, recovery, and focus handoff. | 120, 136, 143; BREAKDOWN |
| `UF-12` | Active, staged, consumed-removal, never-used, all-deleted, and completion row lifecycle. | 132, 136, 142, 145; BREAKDOWN, ARCHIVE |
| `UF-13` | Durable Node/Bit candidates, counts, sort, quiet empty state, and full-card drag. | 121, 131, 133; STAGING |
| `UF-14` | Stage with source validation, pending projection, result, and navigation guard. | 121, 145, 147; STAGING, BREAKDOWN |
| `UF-15` | Unstage through transient targets, restoring order/focus without success toast. | 121, 145, 148; STAGING, BREAKDOWN |
| `UF-16` | Remote candidate arrival, orphan proof/cleanup, invalidation, alert, and drag release. | 122, 146, 147; STAGING |
| `UF-17` | Explorer navigation/re-entry, full labels, anchoring, and valid fallback. | 127, 134, 150; EXPLORER |
| `UF-18` | Dedicated whole-hierarchy search with pre-search/results/loading/stale/error/duplicates. | 114, 135, 151, 171A; EXPLORER |
| `UF-19` | Search result reveal/navigation/close semantics, DnD interruption, and result Undo. | 151, 158; EXPLORER, PLACE |
| `UF-20` | Staged placement through target-column confirmation and atomic mutation. | 123, 152, 153; PLACE |
| `UF-21` | Direct type plus path selection and atomic placement. | 123, 152, 153; PLACE |
| `UF-22` | Valid/invalid/full feedback, visible full reason, and valid-column edge scroll. | 149, 152; EXPLORER, PLACE |
| `UF-23` | Staged Result Title and direct type-limit surfaces without truncation/fallback. | 116, 154; PLACE |
| `UF-24` | Actual-card Newly marker, type pinning, normal navigation, mounted-page lifetime. | 155, 157, 171A; EXPLORER, PLACE |
| `UF-25` | Ordinary/search Undo, dependency reasons, child-first recovery, reconcile, focus. | 124, 156–158; EXPLORER, PLACE |
| `UF-26` | Exact durable completion plus Add/title blocker reporting. | 125, 159, 160; BREAKDOWN, ARCHIVE |
| `UF-27` | Section-scoped overlay, Cancel, complete Context, explicit reopen, switch/re-entry. | 159, 160; ARCHIVE |
| `UF-28` | Archive pending/recovery/retry and next→previous→filtered-null/true-empty handoff. | 125, 126, 161, 162, 171A; ARCHIVE, POOL |
| `UF-29` | Theme/mode change preserves all work state and causes no mutation/navigation. | THEMES; complete matrix 208 |

## Architecture Flow Inventory

New theme owners below are presentation/preservation consumers, not new
repository, hook or lifetime owners. Task 208 checks every AF, including the
unchanged data foundations.

| ID | Architecture flow | Owning task(s) |
|---|---|---|
| `AF-01` | DataStore and Zod write boundary remain the only command/storage boundary. | 101–105, 105A, 120–126, 163 |
| `AF-02` | UI reads stay reactive; components do not import Dexie. | 131, 135, 163 |
| `AF-03` | Canonical URL/system-node routing is retained; only Inbox body dispatch changes. | 129, 163; POOL, CONFORM, 208 |
| `AF-04` | Lifecycle filters, retention, and unrelated Archive/Trash behavior remain intact. | 102, 105, 122, 125; ARCHIVE, CONFORM, 208 |
| `AF-05` | Durable, app-session, mounted-page, recovery, and preference state use correct owners. | 101, 127, 131, 137, 139, 155, 159, 161, 163; THEMES, 208 preservation |
| `AF-06` | Node/Bit/Breakdown/Candidate mutations use monotonic CAS/ABA protection. | 103, 120–125 |
| `AF-07` | Commands use complete atomic postconditions and real transaction rollback, without a general log. | 104, 120–126 |
| `AF-08` | Candidates join source truth; uniqueness, aggregate deletion, orphan audit, and Archive integrity stay repository-owned. | 101, 105, 121, 122, 131; STAGING, ARCHIVE, 208 preservation |
| `AF-09` | Dedicated Explorer query, existing triage DnD owner, placement, Newly, and Archive coordinators own distinct slices. | 135, 142, 149, 151, 152, 155, 161, 163; STAGING, EXPLORER, PLACE, ARCHIVE, 208 preservation |
| `AF-10` | One semantic production tree, centralized copy, task-local render evidence, and no theme-ID branching. | 128, 129; THEMES, 208 |

## Atomic Command Inventory

Repository/UI behavior tasks remain the accepted command authority. The
regional bindings consume and preserve them; none creates another command.

| Command | Repository task | UI adapter/realization task(s) |
|---|---|---|
| Add Breakdown | 120 | 136, 143, 148 |
| Save Scratch title | 120 | 137, 138 |
| Save Breakdown content | 120 | 137, 138 |
| Delete Breakdown | 120 | 136, 143 |
| Stage candidate | 121 | 145, 147 |
| Unstage candidate | 121 | 145, 147, 148 |
| Confirmed-orphan cleanup | 122 | 146, 147 |
| Place staged source | 123 | 152–154 |
| Place direct source | 123 | 152–154 |
| Source-aware Undo | 124 | 156–158 |
| Archive Scratch | 125 | 161, 162 |

## Recipe Surface Inventory

| Recipe surface | Production implementation owner(s) |
|---|---|
| Shell and section chrome | 129; POOL; aggregate CONFORM/208 |
| Scratch Pool | 130, 141, 144; POOL; aggregate CONFORM/208 |
| Selected Scratch Context | 132, 138, 160; BREAKDOWN and complete variant ARCHIVE; aggregate CONFORM/208 |
| Breakdown rows and empty states | 132, 136–140, 143, 148, 159–160; BREAKDOWN/ARCHIVE; aggregate CONFORM/208 |
| Staging | 133, 142, 145–148; STAGING; aggregate CONFORM/208 |
| Grid Explorer | 134–135, 149–151, 158; EXPLORER; aggregate CONFORM/208 |
| Placement affordances | 149, 152–154; PLACE; aggregate CONFORM/208 |
| Newly placed and Undo | 155–158; EXPLORER/PLACE; aggregate CONFORM/208 |
| Archive completion | 159–162; ARCHIVE; aggregate CONFORM/208 |

## VQ Gate Register

| VQ | Decision task / receipt | Directly blocked realization only |
|---|---|---|
| `VQ-01` | 106 / `DP-VQ01` | 141 external-removal realization |
| `VQ-02` | 107 / `DP-VQ02` | 148 Add/Unstage success realization |
| `VQ-03` | 108 / `DP-VQ03` | 140 departure confirmation realization; Task 139 remains headless |
| `VQ-04` | 109 / `DP-VQ04` | 138 inline-editor realization; Task 137 remains headless |
| `VQ-05` | 110 / `DP-VQ05` | 143 Add/Delete reliability realization |
| `VQ-06` | 111–113 / three receipts below | 144 Pool and 147 Staging independently; 150 Explorer except selected-Bit disappearance; 151 selected-Bit disappearance slice only in its existing reveal owner |
| `VQ-07` | 114 / `DP-VQ07` | 151 search result body and 158 search-result Undo integration; ordinary Undo 156 remains independent |
| `VQ-08` | 115 / `DP-VQ08` | 153 placement reliability realization |
| `VQ-09` | 116 / `DP-VQ09` | 154 Result Title/direct-limit realization |
| `VQ-10` | 117 / `DP-VQ10` | 157 Newly/Undo realization |
| `VQ-11` | 118 / `DP-VQ11` | 160 completion blocker/withdrawal realization |
| `VQ-12` | 119 / `DP-VQ12` | 162 Archive reliability/recovery realization |

### Executable DP Receipt Edges

This retained table records the original exact release edges into now-accepted
functional tasks. New theme tasks consume those accepted meanings under their
own approved plan/file scope; they do not broaden a DP's behavior or create a
new release from an old receipt. A measured conflict returns only its affected
element/state to Q02.

| Receipt | VQ | Decision task | Exact implementation edge | Resume condition |
|---|---|---|---|---|
| `DP-VQ01` | `VQ-01` | 106 | 141 only | Choice A central blocking panel accepted on 2026-08-09 at `docs/issues/Issues_Phase_24.Task_106.dp-vq01.json`; Task 141 only is released. |
| `DP-VQ02` | `VQ-02` | 107 | 148 only | Choice A row-attached wash/check/text signal accepted on 2026-08-09 at `docs/issues/Issues_Phase_24.Task_107.dp-vq02.json`; Task 148 only is released. |
| `DP-VQ03` | `VQ-03` | 108 | 140 only | Choice A Add-adjacent inline decision sheet, including the checkpoint-approved position/copy supersession, accepted on 2026-08-09 at `docs/issues/Issues_Phase_24.Task_108.dp-vq03.json`; Task 140 only is released. |
| `DP-VQ04` | `VQ-04` | 109 | 138 only | Choice A dual direct in-place editor system accepted on 2026-08-09 at `docs/issues/Issues_Phase_24.Task_109.dp-vq04.json`; Task 138 only is released. |
| `DP-VQ05` | `VQ-05` | 110 | 143 only | Choice A Add-region/source-row attached reliability system accepted on 2026-08-09 at `docs/issues/Issues_Phase_24.Task_110.dp-vq05.json`; Task 143 only is released. |
| `DP-VQ06-POOL` | `VQ-06` | 111 | 144 only | Choice A fixed Pool-local status band accepted on 2026-08-10 at `docs/issues/Issues_Phase_24.Task_111.dp-vq06-pool.json`; Task 144 only is released. |
| `DP-VQ06-STAGING` | `VQ-06` | 112 | 147 only | Choice A candidate-attached/subsection-indicator/Staging-alert status family accepted on 2026-08-10 at `docs/issues/Issues_Phase_24.Task_112.dp-vq06-staging.json`; Task 147 only is released. |
| `DP-VQ06-EXPLORER` | `VQ-06` | 113 | 150 except selected-Bit disappearance; 151 selected-Bit disappearance slice only | Choice A affected-column remote/path status family was accepted on 2026-08-10 at `docs/issues/Issues_Phase_24.Task_113.dp-vq06-explorer.json`, historically releasing Task 150 only. The user-approved `P28-04` later-execution correction on 2026-08-24 supersedes only the current selected-Bit disappearance edge to Task 151's existing reveal owner; all other Explorer realization remains Task 150. |
| `DP-VQ07` | `VQ-07` | 114 | 151 and search-only integration 158 | Choice A dedicated fixed-input/state-line/flat-result replacement body accepted on 2026-08-10 at `docs/issues/Issues_Phase_24.Task_114.dp-vq07.json`; Task 151 and search-only Task 158 are released subject to their own prerequisites. |
| `DP-VQ08` | `VQ-08` | 115 | 153 only | Choice A fixed reliability rail accepted on 2026-08-10 at `docs/issues/Issues_Phase_24.Task_115.dp-vq08.json`; Task 153 only is released. |
| `DP-VQ09` | `VQ-09` | 116 | 154 only | Choice A compact Result Title/direct-limit steps accepted on 2026-08-11 at `docs/issues/Issues_Phase_24.Task_116.dp-vq09.json`; Task 154 only is released. |
| `DP-VQ10` | `VQ-10` | 117 | 157 only | Choice A card-attached always-visible Newly/Undo status rail accepted on 2026-08-11 at `docs/issues/Issues_Phase_24.Task_117.dp-vq10.json`; Task 157 only is released. |
| `DP-VQ11` | `VQ-11` | 118 | 160 only | Choice A source-attached blocker guidance and completion-slot withdrawal status accepted on 2026-08-11 at `docs/issues/Issues_Phase_24.Task_118.dp-vq11.json`; Task 160 only is released. |
| `DP-VQ12` | `VQ-12` | 119 | 162 only | Choice A stable single-card Archive reliability/recovery composition accepted on 2026-08-11 at `docs/issues/Issues_Phase_24.Task_119.dp-vq12.json`; Task 162 only is released. |

## Cross-Cutting Exclusions And Negative Coverage

| ID | Prohibited shortcut | Enforced by |
|---|---|---|
| `NEG-01` | Copy prototype routes, mock state, handlers, or inline architecture. | 129, 163; THEMES, 208 |
| `NEG-02` | Flatten eight themes into one generic surface. | 129; THEMES, 208 |
| `NEG-03` | Retain abbreviated Explorer labels. | 134; EXPLORER, 208 |
| `NEG-04` | Use a recipe outside the approved nine-file package as execution authority. | Provenance; THEMES, 208 |
| `NEG-05` | Promote the prototype Pool fold lock. | 127, 130; POOL, 208 |
| `NEG-06` | Copy staged internal handles or native drag snapshots. | 133, 142, 149; STAGING, EXPLORER, 208 |
| `NEG-07` | Add keyboard placement, placement button, picker, or hidden shortcut. | 149, 152, `D-KEYBOARD`; EXPLORER, PLACE, 208 |
| `NEG-08` | Keep large Staging empty cards. | 133; STAGING, 208 |
| `NEG-09` | Submit Add on blur. | 136; BREAKDOWN, 208 |
| `NEG-10` | Extend active-column or global Search for Explorer. | 135, 151, 163; EXPLORER, 208 |
| `NEG-11` | Use repeated blink/pulse/ping/bounce/spin/flicker for status. | 129, 148, 157, 160, 162; THEMES, 208 |
| `NEG-12` | Add a permanent candidate Unstage button. | 145; STAGING, 208 |
| `NEG-13` | Toast successful Unstage or prematurely globalize its failure. | 145, 148; STAGING, BREAKDOWN, 208 |
| `NEG-14` | Use generic Dialog/AlertDialog for inline edit/conflict. | 138; BREAKDOWN, 208 |
| `NEG-15` | Auto-unstage/cascade candidate on staged-source edit/delete. | 121, 137; BREAKDOWN, STAGING, 208 preservation |
| `NEG-16` | Use page Set or label equality for candidate uniqueness. | 101, 121, 132; BREAKDOWN, STAGING, 208 preservation |
| `NEG-17` | Persist selection/query/draft/path/overlay/Newly beyond its canonical lifetime; only two Inbox sorts persist. | 127, 155, 159, 161; THEMES, 208 preservation |
| `NEG-18` | Auto-pick another placement target or perform partial/best-effort writes. | 123, 152, 153; PLACE, 208 preservation |
| `NEG-19` | Use `mtime` as edit concurrency authority. | 103, 120; BREAKDOWN, 208 preservation |
| `NEG-20` | Treat mock success as persistence/lifecycle evidence. | 104, 120–126; THEMES, 208 |
| `NEG-21` | Use adjacent chrome, cards, dialogs, or Search as visual fallback. | 106–119 and exact realization edges; THEMES, 208 |

## Selected Deferrals — Excluded From Active Tasks

| ID | Deferred scope | Resume owner |
|---|---|---|
| `D-CARD` | Common BitCard eight-theme redesign, later reuse, and final Korean card QA. | Future brainstorming and separately approved plan. |
| `D-LOCALE` | Locale provider/resources, EN/KR toggle, localized copy, and Korean QA. | Future canonical amendment; core English owner remains in scope. |
| `D-LENS` | Neumorphism ASC/DESC water-lens polish. | Future user visual decision. |
| `D-KEYBOARD` | Keyboard or other drag-alternative placement entry. | Future accessibility brainstorming; no placeholder now. |
| `D-TEXT` | Cross-surface wrapping, line count, expansion, and IME visual design. | Named separate topic. |

Responsive/mobile redesign remains excluded; active implementation targets the declared desktop surface with 1024px minimum and stable 1920×1080 evidence. A future Staging-failure toast migration remains a separate follow-up, not an active task.

---

## Phase 23 — Model, Migration, Transactions, And Retention (Completed)

> **Archived:** completion-time truth is recorded in
> [`docs/execution-plan/archive/phase-23.md`](execution-plan/archive/phase-23.md).
> The accepted task detail remains inline in this approved multi-phase plan for
> receipt continuity and is historical, not an active task surface.

### Task 101: [x] Land the authoritative model and typecheck-compatible constructors

**Files and actions**

- Modify `src/lib/db/schema.ts`, `src/types/index.ts`, and `src/lib/db/schema.test.ts`: make `version` a required integer ≥1 on Node, Bit, and ScratchBreakdown; add `pastDeadlineDismissed` to Node/Bit with canonical `false` schema default; add/export `RepositoryOperationId`, exact `StagedCandidate`, exact `CandidateOrphanAuditEvent`, exact `PendingOperationRecovery`, command/result types, and public create/update schemas that omit IDs, creation metadata, lifecycle system fields, and `version`.
- Modify `src/lib/db/indexeddb.ts` and `src/lib/db/indexeddb.test.ts`: make every repository create constructor explicitly write `version: 1`, and every Node/Bit constructor explicitly write `pastDeadlineDismissed: false`, including ordinary create, system-node seed, Scratch Breakdown create, Bit→Node promotion result, and promoted child Bits. Do not rely on a Zod output default to hide a missing repository initializer.
- Update the concrete typed factories found by `rg -l 'function (create|make)(Node|Bit)|function createScratchBreakdown' src --glob '*.test.ts' --glob '*.test.tsx'`, namely: `src/app/calendar/calendar-navigation.test.tsx`; `src/components/bit-detail/bit-detail-popup.test.tsx`; `src/components/calendar/compact-bit-item.test.tsx`; `src/components/calendar/day-column.test.tsx`; `src/components/calendar/parent-node-selector.test.tsx`; `src/components/grid/bit-card.test.tsx`; `src/components/grid/edit-node-dialog.test.tsx`; `src/components/grid/grid-view.test.tsx`; `src/components/grid/node-card.test.tsx`; `src/components/layout/breadcrumb-deadline.test.tsx`; `src/components/layout/breadcrumbs.test.tsx`; `src/components/layout/grid-runtime.test.tsx`; `src/components/layout/sidebar.test.tsx`; `src/components/triage/breakdown-panel.test.tsx`; `src/components/triage/hierarchy-explorer.test.tsx`; `src/components/triage/scratch-pool.test.tsx`; `src/components/triage/triage-workspace.test.tsx`; `src/hooks/use-calendar-data.test.ts`; `src/hooks/use-inbox.test.tsx`; `src/hooks/use-scratch-breakdowns.test.tsx`; `src/lib/db/archive-sweep.test.ts`; `src/lib/db/archive.test.ts`; `src/lib/db/auto-cleanup.test.ts`; `src/lib/db/auto-completion.test.ts`; `src/lib/db/cascade-delete.test.ts`; `src/lib/db/cascade-hard-delete.test.ts`; `src/lib/db/cascade-restore.test.ts`; `src/lib/db/deadline-hierarchy.test.ts`; `src/lib/db/grid-uniqueness.test.ts`; `src/lib/db/indexeddb.migration.test.ts`; `src/lib/db/mtime-cascade.test.ts`; `src/lib/db/promotion.test.ts`; `src/lib/db/scratch-breakdowns.test.ts`; `src/lib/db/system-nodes.test.ts`; and `src/lib/utils/completion.test.ts`. Each factory explicitly defaults `version: 1`; Node/Bit factories also default `pastDeadlineDismissed: false`. Update `src/hooks/use-can-archive-scratch.test.ts` so its asserted ScratchBreakdown fixture is complete rather than hiding missing fields behind a cast. Intentional legacy-migration rows remain `Record<string, unknown>`.

**Dependencies:** plan approval and separately approved execution lifecycle.

**Authority / flows:** SCHEMA object stores, Zod schemas, and operation identities; `AF-01`, `AF-05`–`AF-08`; `NEG-16`.

**Recipe:** Not applicable — data/nonvisual.

**Observable acceptance:** every file changed by the new required fields compiles in this task; public payloads cannot supply/reset versions or system metadata; all repository-created Node/Bit/Breakdown records begin at version 1, Node/Bit records begin with `pastDeadlineDismissed: false`, candidates contain no label/target/pending snapshot, and recovery contains no draft/payload/queue.

**Verification:** first observe fixture/type failures after the schema test change; then run `pnpm test -- src/lib/db/schema.test.ts src/lib/db/indexeddb.test.ts` and `pnpm typecheck`, both with zero failures/errors; rerun the discovery command and inspect every matching concrete factory.

**Commit contract:** only the schema/type exports, repository constructors, schema/constructor tests, and enumerated typed-fixture compatibility edits; `feat(triage): define versioned inbox domain model`.

### Task 102: [x] Install the exact atomic Dexie v4 migration

**Files and actions:** modify `src/lib/db/indexeddb.ts` and `src/lib/db/indexeddb.schema-v3-upgrade.test.ts`; create `src/lib/db/indexeddb.schema-v4-upgrade.test.ts`. Preserve every v3 assertion while converting its intended-success legacy IDs to valid UUIDs (or isolating its v3-only opener) so canonical v4 validation does not turn a v3 fixture artifact into a false migration failure. Declare v4 after v1→v2→v3 with exact stores/indexes: `nodes: "id,parentId,deletedAt,[parentId+deletedAt],level,systemRole,archivedAt,[parentId+deletedAt+archivedAt]"`; `bits: "id,parentId,deletedAt,[parentId+deletedAt],status,deadline,[parentId+status],archivedAt,[parentId+deletedAt+archivedAt]"`; `scratchBreakdowns: "id,scratchBitId,[scratchBitId+order],[scratchBitId+createdAt]"`; `stagedCandidates: "id,&sourceBreakdownId,scratchBitId,lifecycle,[scratchBitId+lifecycle],[scratchBitId+resultType+createdAt]"`; and `candidateOrphanAuditEvents: "id,&candidateId,sourceBreakdownId,scratchBitId,occurredAt,[scratchBitId+occurredAt]"`; retain chunks/settings declarations. In one upgrade transaction, start both new stores empty with no inference; backfill only missing versions to 1 and missing `pastDeadlineDismissed` to false; preserve valid ≥1 revisions, booleans, IDs/content/order/timestamps/lifecycle, and tolerated unknown fields; validate target Zod fields and that each Breakdown owner is a Bit parented by the Inbox system Node. Throw a structured store/id/reason migration error for any invalid required row/reference so the whole upgrade rolls back and reopens at v3 without quarantine, deletion, guessed value, consumption, or candidate manufacture.

**Dependencies:** Task 101.

**Authority / flows:** SCHEMA Dexie Migration Target and invalid-row rollback; `AF-01`, `AF-04`, `AF-08`; `NEG-16`, `NEG-17`.

**Recipe:** Not applicable — data/nonvisual.

**Observable acceptance:** fresh/open-from-v1/v2/v3 databases expose the exact v4 indexes and empty new stores; valid prior revisions/booleans and every unrelated value remain unchanged; each invalid Node, Bit, Breakdown, or non-Inbox owner aborts with structured identity and a byte-for-byte pre-upgrade snapshot after reopening at v3; reopening a successful v4 database is idempotent.

**Verification:** with real `GridDODatabase`, `IDBFactory`, and `IDBKeyRange`, run `pnpm test -- src/lib/db/indexeddb.schema-v3-upgrade.test.ts src/lib/db/indexeddb.schema-v4-upgrade.test.ts`; inspect `db.verno`, store/index schemas, unique-index rejection, empty stores, preservation, and rollback; then `pnpm typecheck`.

**Commit contract:** v4 declaration/upgrade plus the v3 preservation and dedicated v4 tests only; `feat(triage): migrate indexeddb atomically to v4`.

### Task 103: [x] Enforce revisions across every public and repository mutation path

**Files and actions**

- Modify `src/lib/db/datastore.ts` and `src/lib/db/indexeddb.ts`: replace broad `Partial<Node>`/`Partial<Bit>` public patches with repository-owned update inputs excluding IDs, creation metadata, lifecycle-only fields, and `version`; increment a surviving record exactly once for direct title/property/deadline/position/status/lifecycle mutation; never increment on rejection/no-op or parent `mtime`-only touch. Explicitly sweep `createNode`/`createBit`, `updateNode`/`updateBit`, `createChunk`/`updateChunk`/`deleteChunk` under Hooks 1/3, Node/Bit soft delete, restore, hard-delete closure, trash cleanup, archive/unarchive under Hooks 10/11, system-node drift normalization, breadcrumb relocation, Bit→Node promotion, and legacy Breakdown mutations; new records start at v1, hard-deleted records have no surviving revision, and every indirectly touched parent stays revision-neutral unless it is itself directly lifecycle/status mutated.
- Modify `src/hooks/use-grid-actions.ts`, `src/hooks/use-node-actions.ts`, and `src/hooks/use-bit-detail-actions.ts`; create `src/hooks/use-grid-actions.test.ts`, `src/hooks/use-node-actions.test.ts`, and `src/hooks/use-bit-detail-actions.test.ts` with compile-time `@ts-expect-error` and runtime forwarding assertions so public actions cannot set/reset revision/system fields.
- Create `src/lib/db/revision.test.ts` and update these exact regression owners: `src/lib/db/indexeddb.test.ts` (direct Node/Bit create/update and child add/remove); `src/lib/db/mtime-cascade.test.ts` (Hook 1); `src/lib/db/auto-completion.test.ts` (Hook 3); `src/lib/db/cascade-delete.test.ts` and `src/lib/db/cascade-restore.test.ts` (Hooks 4/5); `src/lib/db/cascade-hard-delete.test.ts` and `src/lib/db/auto-cleanup.test.ts` (Hook 6 target absence and revision-neutral parent touch); `src/lib/db/indexeddb.migration.test.ts` (breadcrumb relocation); `src/lib/db/archive.test.ts` (Hooks 10/11 Node cascades and Bit paths); `src/lib/db/system-nodes.test.ts` (drift normalization); `src/lib/db/promotion.test.ts` (source deletion plus new v1 results); `src/lib/db/grid-uniqueness.test.ts` and `src/lib/db/deadline-hierarchy.test.ts` (rejected/accepted moves and deadline writes); and `src/lib/db/scratch-breakdowns.test.ts` (legacy Breakdown direct paths until Task 120 replaces them).
- Assert a restore that changes lifecycle and cell is one logical increment; an archive/soft-delete cascade increments each directly lifecycle-mutated descendant once; Hook 1 parent touches do not increment; Hook 3 increments the Bit only when status actually changes; promotion results begin at v1; no test uses `mtime` as CAS.

**Dependencies:** Task 102.

**Authority / flows:** SCHEMA monotonic version/CAS and Hooks 1, 3, 4–6, 10, 11; `AF-01`, `AF-06`; `NEG-19`.

**Recipe:** Not applicable — data/nonvisual.

**Observable acceptance:** every current direct, breadcrumb, auto-completion, cascade, restore, Archive, system normalization, promotion, and public-action path has an exact version assertion; stale version cannot overwrite a later value even through A→B→A; mtime-only parent refresh remains revision-neutral; Task 103 does not modify `schema.ts`.

**Verification:** run the three new action tests and all exact database tests listed above, then `pnpm typecheck` and `pnpm lint`; expected zero failures/errors and expected compile errors only at annotated forbidden public inputs.

**Commit contract:** revision/public-boundary code and the exact mutation-path tests above only; `feat(db): enforce monotonic record revisions`.

### Task 104: [x] Build a real IndexedDB transaction and fault-injection harness

**Files and actions:** create `src/lib/db/indexeddb.test-utils.ts` and `src/lib/db/indexeddb.transaction.test.ts`; modify `src/lib/db/indexeddb.ts` only for a narrow injectable named-checkpoint test seam. Each test uses a fresh real `GridDODatabase` backed by `fake-indexeddb` `IDBFactory`/`IDBKeyRange`, valid UUID factories, and snapshots of nodes, bits, chunks, settings, scratchBreakdowns, stagedCandidates, and candidateOrphanAuditEvents. Inject a throw after each named store mutation inside the real `rw` Dexie transaction and prove every store matches the prestate. Require every validation and closure read to occur inside the same transaction. Structural FakeTable/FakeDatabase tests may remain unit coverage but cannot satisfy atomic acceptance.

**Dependencies:** Task 102.

**Authority / flows:** SCHEMA Repository Operation Contract and complete-postcondition rule; `AF-01`, `AF-07`; `NEG-18`, `NEG-20`.

**Recipe:** Not applicable — data/nonvisual.

**Observable acceptance:** a real first write followed by an injected failure rolls back all seven domain/integrity stores; the harness can assert complete precondition, complete postcondition, and conflict using stable IDs and versions; transaction scope includes every store required by later commands and introduces no production operation log, outbox, or queue.

**Verification:** `pnpm test -- src/lib/db/indexeddb.transaction.test.ts`; expected zero failures with a control proving the same injected sequence would expose a partial state outside the real transaction; then `pnpm typecheck`.

**Commit contract:** real IndexedDB test utility, transaction test, and smallest named-checkpoint seam only; `test(db): prove real indexeddb rollback`.

### Task 105: [x] Make Scratch aggregate hard-delete atomic and audit-preserving

**Files and actions:** modify `src/lib/db/datastore.ts` and `src/lib/db/indexeddb.ts` to make Node/Bit permanent-delete closures and `cleanupExpiredTrash` use one planned aggregate transaction. When a closure owns a Scratch Bit, delete the Scratch, its Chunks, all owned Breakdown rows, and candidates whose still-present source belongs to the closure; retire/restrict `deleteScratchBreakdownsByScratch` as a public sequencing escape hatch. Never create an orphan event for planned aggregate deletion; retain every pre-existing `candidateOrphanAuditEvents` row indefinitely, including rows naming that Scratch; leave unrelated aggregates untouched. If a candidate already lacks its source before planning, abort the aggregate with a typed integrity-cleanup-required result and leave every store unchanged; Task 122 later consumes that condition through the separately audited confirmed-orphan contract. Create `src/lib/db/scratch-aggregate-hard-delete.test.ts`; update `src/lib/db/cascade-hard-delete.test.ts`, `src/lib/db/auto-cleanup.test.ts`, and `src/lib/db/scratch-breakdowns.test.ts` with real Task 104 checkpoint injection after each store mutation.

**Dependencies:** Tasks 102–104.

**Authority / flows:** SCHEMA Hook 6, Scratch Bit Permanent Deletion, and indefinite orphan-audit retention; `AF-04`, `AF-07`, `AF-08`; `NEG-20`.

**Recipe:** Not applicable — data/nonvisual.

**Observable acceptance:** normal Scratch purge leaves neither Scratch/Chunk/row/candidate nor a new audit event; every prior audit remains byte-for-byte; archive leaves rows/candidates untouched; pre-existing orphans are not disguised as aggregate cleanup; any injected failure restores the entire aggregate and audit store.

**Verification:** `pnpm test -- src/lib/db/scratch-aggregate-hard-delete.test.ts src/lib/db/cascade-hard-delete.test.ts src/lib/db/auto-cleanup.test.ts src/lib/db/scratch-breakdowns.test.ts`; expected zero failures, then `pnpm typecheck`.

**Commit contract:** aggregate hard-delete/cleanup owners and their exact rollback/retention tests only; `feat(db): delete scratch aggregates atomically`.

### Task 105A: [x] Amend the stale Scratch promotion boundary

**Files and actions:** first amend `docs/SCHEMA.md` Hook 9 through a separate
canonical-document gate: a Bit whose parent Node has `systemRole: "inbox"` is
a Scratch and cannot be promoted to a Node, regardless of whether it currently
has Breakdown rows, staged candidates, or Chunks. After that amendment is
explicitly approved, modify `src/lib/db/indexeddb.ts` and
`src/lib/db/promotion.test.ts` so `promoteBitToNode` rejects the Inbox-parented
Bit before allocating IDs or writing any store. Do not infer a Breakdown/
candidate deletion or migration policy, and do not change the visual surface.

**Dependencies:** Task 105 and explicit approval of the Task 105A SCHEMA
amendment. Task 105 must not absorb this work.

**Authority / flows:** SCHEMA dedicated `scratchBreakdowns` ownership and the
stale Hook 9 Bit-to-Node Promotion contract; the explicit 2026-07-28 user
decision recorded in `docs/issues/Issues_Phase_23.md`.

**Recipe:** Not applicable — repository constraint; the intended Scratch UI
already exposes no promotion action under its normal no-Chunk state.

**Observable acceptance:** Inbox-parented Bits reject promotion before any
Node/Bit/Chunk/Breakdown/candidate/audit write, including a defensive fixture
that contains Chunks; ordinary non-Inbox Bits preserve current promotion
behavior. Data presence never toggles the rule.

**Verification:** run `pnpm exec vitest run src/lib/db/promotion.test.ts`,
`pnpm typecheck`, `pnpm lint`, and `git diff --check`; expected zero failures
or errors and no new warning.

**Commit contract:** the approved Hook 9 amendment/receipt is one documentation
commit; the repository guard and exact promotion regression are a later narrow
code commit; `fix(db): reject Scratch bit promotion`.

#### Phase 23 Notes

- Integrate Tasks 101–105A as one phase unit; Task 102 closes Task 101's
  temporary legacy-row migration risk, so intermediate cherry-picks are not a
  supported release state.
- `P23-02` was resolved by accepted Task 136's retired mock/assertion removal;
  `P23-03` was resolved by accepted Task 130's defensive Bit-detail visibility
  guard.
- The real-project lifecycle trace is retained for the post-merge workflow-v2
  pass. Phase 24 must not start until that rollout and GridDO adapter migration
  are verified.

---

## Phase 24 — User-Owned Decision Prerequisites (Completed)

> **Archived:** completion-time truth is recorded in
> [`docs/execution-plan/archive/phase-24.md`](execution-plan/archive/phase-24.md).
> The accepted task detail remains inline for receipt continuity and is
> historical, not an active task surface.

Tasks 106–119 are non-code Decision tasks. They have no dependencies on one another; their shared document edits are serialized by the `decision-docs` mutex without creating a semantic VQ dependency.

### Task 106: [x] Record `DP-VQ01` external-removal decision

**Files and actions:** modify `docs/recipes/inbox-triage-scratch-pool-visual-recipe.md`, `docs/DESIGN_TOKENS.md`, and `docs/EXECUTION_PLAN.md` to record the user-approved complete external archive/delete transition realization or explicit scope-out: exact copy, layout, controls, countdown treatment, pause/resume, destination change, draft-copy status, restore, focus, and eight-theme mapping. Record the durable receipt and change no code.

**Dependencies:** user decision only; no code prerequisite and no other DP task.

**Decision owner:** User. **Receipt:** `DP-VQ01`. **Exact edge:** Task 141 only. **Resume:** receipt completely supplies or scopes out the named surface; silence or a nearby dialog does not resume it.

**Authority / flows:** `VQ-01`, `UF-05`, `NEG-21`.

**Recipe:** [`Scratch Pool`](recipes/inbox-triage-scratch-pool-visual-recipe.md).

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

**Recipe:** [`Breakdown rows and empty states`](recipes/inbox-triage-breakdown-row-empty-visual-recipe.md).

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

**Recipe:** [`Breakdown rows and empty states`](recipes/inbox-triage-breakdown-row-empty-visual-recipe.md).

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

**Recipe:** [`Selected Scratch Context`](recipes/inbox-triage-selected-scratch-context-visual-recipe.md) and [`Breakdown rows and empty states`](recipes/inbox-triage-breakdown-row-empty-visual-recipe.md).

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

**Recipe:** [`Breakdown rows and empty states`](recipes/inbox-triage-breakdown-row-empty-visual-recipe.md).

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

**Recipe:** [`Scratch Pool`](recipes/inbox-triage-scratch-pool-visual-recipe.md).

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

**Recipe:** [`Staging`](recipes/inbox-triage-staging-visual-recipe.md).

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

**Recipe:** [`Grid Explorer`](recipes/inbox-triage-grid-explorer-visual-recipe.md).

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

**Recipe:** [`Grid Explorer`](recipes/inbox-triage-grid-explorer-visual-recipe.md).

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

**Recipe:** [`Placement affordances`](recipes/inbox-triage-placement-affordances-visual-recipe.md).

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

**Recipe:** [`Placement affordances`](recipes/inbox-triage-placement-affordances-visual-recipe.md).

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

**Recipe:** [`Newly placed and Undo`](recipes/inbox-triage-newly-placed-undo-visual-recipe.md).

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

**Recipe:** [`Selected Scratch Context`](recipes/inbox-triage-selected-scratch-context-visual-recipe.md), [`Breakdown rows and empty states`](recipes/inbox-triage-breakdown-row-empty-visual-recipe.md), and [`Archive completion`](recipes/inbox-triage-archive-completion-visual-recipe.md).

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

**Recipe:** [`Archive completion`](recipes/inbox-triage-archive-completion-visual-recipe.md).

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

#### Phase 24 Close Notes

- Tasks 106–119 and all fourteen Decision-prerequisite receipts were explicitly
  accepted. Each Choice A contract is reflected in its declared recipe,
  `docs/DESIGN_TOKENS.md`, and this execution authority; no unresolved
  `Tagged` canonical impact remains.
- Phase 24 changed decision authority and durable receipts only. It changed no
  product `src` path, test, dependency, route, component, hook, store, or
  repository command, and it does not start any released realization task.
- The merged pre-close `src` tree equals both integration `main` and the latest
  Phase 25 full-gate tree at
  `483c7756667335b502105dfa4a712b128a7a117b`. The valid Phase 25 gate (87 test
  files / 679 tests, lint with 0 errors and 11 pre-existing warnings,
  typecheck, and seven-route build) was therefore reused without rerunning
  test/lint/typecheck/build.
- Source declarations are not rendered evidence. The accepted Task 106–119
  checkpoints approve the exact source-only decisions; Tasks 138, 140–141,
  143–144, 147–148, 150–151, 153–154, 157, 160, and 162 retain implementation
  and running-app verification ownership.

**Full issue log:**
[`docs/issues/Issues_Phase_24.md`](issues/Issues_Phase_24.md)

---

## Phase 25 — Authoritative Command DAG (Completed)

### Task 120: [x] Implement Add, Scratch Save, row Save, and row Delete commands

**Files and actions:** modify `src/lib/db/datastore.ts` and `src/lib/db/indexeddb.ts` with typed command/reconcile inputs and results; modify `src/lib/db/scratch-breakdowns.test.ts` and **create** `src/lib/db/inbox-operations.test.ts` using Task 104's real database. Each command validates lifecycle/version inside one transaction, uses preallocated record/operation identity, increments each required surviving owner exactly once, parses writes/results, and classifies complete precondition/postcondition/conflict. Add the explicit **ABA-1 Add→Delete sequence**: an ambiguous Add commits row v1 and Scratch v+1; a later confirmed Delete removes it and advances Scratch again; late Add reconciliation must return `conflict`, leave the row absent, retain the later Scratch revision, and never recreate/resurrect the row. Delete's inverse checks must likewise never report the original Add as not-applied.

**Dependencies:** Tasks 103 and 104.

**Authority / flows:** SCHEMA Add/Save/Delete matrix; `UF-07`, `UF-09`–`UF-12`; `AF-01`, `AF-06`, `AF-07`; `NEG-09`, `NEG-15`, `NEG-19`, `NEG-20`.

**Recipe:** Not applicable — data/nonvisual.

**Observable acceptance:** Add creates one stable row and advances Scratch; saves are conditional with no last-write-wins; Delete retains no partial state; retry is possible only from exact not-applied; ABA-1 produces conflict and no resurrection under every delayed/duplicate reconciliation order.

**Verification:** `pnpm test -- src/lib/db/scratch-breakdowns.test.ts src/lib/db/inbox-operations.test.ts`; include a named ABA-1 assertion for result status, row absence, final Scratch version, and no extra write; then `pnpm typecheck`.

**Commit contract:** four Breakdown commands, real transaction/reconcile tests, and no UI; `feat(triage): add authoritative breakdown commands`.

### Task 121: [x] Implement Stage and Unstage commands

**Files and actions:** modify `src/lib/db/datastore.ts` and `src/lib/db/indexeddb.ts`; create `src/lib/db/staged-candidates.test.ts`; extend `src/lib/db/inbox-operations.test.ts`. Stage requires active Inbox Scratch, exact unconsumed source/version, absent preallocated candidate ID, and unique source; inserts candidate v1 and advances source. Unstage requires exact candidate/source; deletes only candidate and advances source. Add **ABA-2 Stage→Unstage**: ambiguous Stage commits candidate v1/source v+1; confirmed Unstage deletes candidate/source v+2; late Stage reconcile returns `conflict`, leaves candidate absent/source at later version, and never recreates/restages it. Type change remains Unstage then a new candidate ID/operation.

**Dependencies:** Tasks 103 and 104.

**Authority / flows:** SCHEMA Stage/Unstage matrix; `UF-13`–`UF-15`; `AF-06`–`AF-08`; `NEG-15`, `NEG-16`, `NEG-20`.

**Recipe:** Not applicable — data/nonvisual.

**Observable acceptance:** candidate truth survives route/reload and stores no label; source/candidate changes are atomic; same postcondition replay is idempotent; ABA-2 is conflict with no resurrection; Unstage never consumes source or creates an audit event.

**Verification:** `pnpm test -- src/lib/db/staged-candidates.test.ts src/lib/db/inbox-operations.test.ts`; include exact ABA-2 status/absence/source-version/no-write assertions; then `pnpm typecheck`.

**Commit contract:** Stage/Unstage repository contracts and real transaction tests only; `feat(triage): add durable staging commands`.

### Task 122: [x] Implement confirmed-orphan cleanup with exact reconciliation

**Files and actions:** modify `src/lib/db/datastore.ts` and `src/lib/db/indexeddb.ts`; create `src/lib/db/candidate-orphan-cleanup.test.ts` on Task 104's real database. Request contains operation ID, preallocated audit ID, exact candidate ID/version/source/Scratch/type, and authoritative `source_deleted`/`source_tombstoned` proof. In one transaction delete the exact candidate and append the exact unique-candidate audit. Define and test: exact audit plus candidate absence = `applied`/`already_applied`; untouched exact candidate/source precondition and no audit = `not_applied`; changed candidate, different audit, partial state, or mismatched proof = `conflict`; cache/offline/delayed/unproved source = `rejected`/unresolved with no write. Inject failure between delete/append and prove rollback; assert aggregate deletion Task 105 remains audit-free and prior audit rows remain indefinitely.

**Dependencies:** Tasks 104, 105, and 121.

**Authority / flows:** SCHEMA Confirmed candidate orphan cleanup and Staged Candidate Integrity; `UF-16`; `AF-04`, `AF-07`, `AF-08`.

**Recipe:** Not applicable — data/nonvisual.

**Observable acceptance:** a local source miss cannot clean anything; confirmed cleanup produces exactly one matching durable event and no candidate; every complete/untouched/partial/mismatched state has the exact authoritative result above; retry cannot append twice.

**Verification:** `pnpm test -- src/lib/db/candidate-orphan-cleanup.test.ts`; inspect every result/status/postcondition, planned-aggregate rejection, and fault checkpoint; then `pnpm typecheck`.

**Commit contract:** confirmed-orphan query/command and exact postcondition/conflict tests only; `feat(triage): audit confirmed candidate orphans`.

### Task 123: [x] Implement staged and direct Placement commands

**Files and actions:** modify `src/lib/db/datastore.ts` and `src/lib/db/indexeddb.ts`; create `src/lib/db/triage-placement.test.ts`; extend `src/lib/db/inbox-operations.test.ts`. Separate staged/direct typed commands carry preallocated result ID, exact source/candidate versions, intended type/title, target parent, expected ancestor IDs/path, and exact cell. Revalidate active reachability, hierarchy/type, title limits, capacity, candidate/source lifecycle, and cell immediately inside one transaction. Each of the four result constructors—staged Node, staged Bit, direct Node, and direct Bit—explicitly initializes `version: 1` and `pastDeadlineDismissed: false`, then parses the complete record with `nodeSchema` or `bitSchema` before any write. Staged atomically creates result, consumes/advances source, and deletes candidate; direct creates result and consumes/advances source. Reconciliation recognizes only complete all-sides postcondition, exact untouched precondition, or conflict; never alternate target, partial compensation, truncation, title heuristic, or silent resend.

**Dependencies:** Tasks 120 and 121.

**Authority / flows:** SCHEMA staged/direct placement matrix; `UF-20`–`UF-23`; `AF-06`, `AF-07`; `NEG-18`, `NEG-20`.

**Recipe:** Not applicable — data/nonvisual.

**Observable acceptance:** Confirm can yield exactly one actual Node/Bit and complete source/candidate postcondition; all four staged/direct Node/Bit outputs initialize the two required defaults and pass their full schema; stale/full/moved/invalid/over-limit input writes nothing; every injected checkpoint rolls back; unknown result reconciles by IDs/versions only.

**Verification:** `pnpm test -- src/lib/db/triage-placement.test.ts src/lib/db/inbox-operations.test.ts`; for staged Node, staged Bit, direct Node, and direct Bit, assert `version: 1`, `pastDeadlineDismissed: false`, and successful full `nodeSchema`/`bitSchema` parsing; cover every invalidity and checkpoint; then `pnpm typecheck`.

**Commit contract:** two placement commands and real transaction tests only; `feat(triage): add atomic placement commands`.

### Task 124: [x] Implement source-aware Undo with candidate-version ABA protection

**Files and actions:** modify `src/lib/db/datastore.ts` and `src/lib/db/indexeddb.ts`; create `src/lib/db/triage-undo.test.ts`; extend `src/lib/db/inbox-operations.test.ts`. Undo carries exact result/source/candidate identities, placement post-state versions/timestamps, creation snapshot, and staged/direct provenance. Inside one transaction validate unchanged result lifecycle/direct revision/creation fields, exact consumed source, candidate uniqueness, and zero surviving descendants/unknown mutation; delete exact result and restore/advance source. Staged Undo recreates the **same candidate ID/type/createdAt** at **prior candidate version + 1** with `updatedAt = now`; direct Undo creates none. Add **ABA-3 Place→Undo**: Stage candidate v1, place it, then confirmed Undo recreates that ID at v2; late original Placement and Stage reconciliation both return `conflict`, keep source restored and candidate v2, keep result absent, and never reconsume source, delete/downgrade/recreate candidate v1, or resurrect result. Also test ambiguous Undo followed by a new confirmed placement: late Undo reconciliation conflicts and cannot remove the new result or restore old source state.

**Dependencies:** Task 123.

**Authority / flows:** SCHEMA Undo matrix and ABA conformance; `UF-25`; `AF-06`, `AF-07`; `NEG-18`, `NEG-20`.

**Recipe:** Not applicable — data/nonvisual.

**Observable acceptance:** eligible Undo performs the exact inverse atomically; dependency/mutation blocks all writes; child-first recovery can re-enable; staged provenance returns the same candidate identity at v+1; every ABA-3 late reconcile conflicts with the exact no-resurrection/no-downgrade assertions.

**Verification:** `pnpm test -- src/lib/db/triage-undo.test.ts src/lib/db/inbox-operations.test.ts`; assert ABA-3 final records/versions/timestamps/status and every checkpoint; then `pnpm typecheck`.

**Commit contract:** Undo command and exact staged/direct/dependency/ABA tests only; `feat(triage): add source aware undo command`.

### Task 125: [x] Implement exact Archive eligibility and guarded Archive command

**Files and actions:** modify `src/lib/db/datastore.ts` and `src/lib/db/indexeddb.ts`; create `src/lib/db/archive-scratch-command.test.ts`; update `src/lib/db/archive.test.ts`. Add authoritative eligibility query and typed Archive request containing Scratch ID/expectedVersion plus an explicit caller assertion that Add-draft and Scratch-title blockers are clear. Repository transaction independently requires active Inbox-owned Scratch, consumed count ≥1, unconsumed count 0, candidate count 0, and exact version, then changes only Scratch `archivedAt`/`mtime`/version. Make generic `archiveBit` reject an Inbox-parented Scratch so no caller can bypass the guarded command; retain generic Direct Archive for ordinary Bits and existing Archive View restore. Test missing/false blocker assertion, durable races, same-ID replay, and rollback.

**Dependencies:** Tasks 120 and 121.

**Authority / flows:** SCHEMA Archive Scratch matrix/eligibility and SPEC coordinator boundary; `UF-26`, `UF-28`; `AF-04`, `AF-06`–`AF-08`.

**Recipe:** Not applicable — data/nonvisual.

**Observable acceptance:** empty/all-deleted/all-staged never qualify; page blocker assertion is required but never substitutes for durable transaction checks; generic `archiveBit(scratchId)` fails without mutation; ordinary Direct Archive/restore remain unchanged; rows/candidates remain retained for restore.

**Verification:** `pnpm test -- src/lib/db/archive-scratch-command.test.ts src/lib/db/archive.test.ts`; include blocker assertion, generic bypass, durable race, same operation, rollback, ordinary Bit, and restore cases; then `pnpm typecheck`.

**Commit contract:** eligibility/guarded Archive command, generic-bypass guard, and exact repository tests only; `feat(triage): guard scratch archive command`.

### Task 126: [x] Implement Archive recovery classification

**Files and actions:** modify `src/lib/db/datastore.ts` and `src/lib/db/indexeddb.ts`; create `src/lib/db/archive-scratch-recovery.test.ts`. Add read-only classification for a schema-validated `PendingOperationRecovery` using exact current Scratch ID/version/archivedAt plus Breakdown/candidate pre/postconditions: complete Archive postcondition = applied; complete eligible active precondition = not-applied; changed lifecycle/version/eligibility or partial state = conflict; authority unavailable = unknown. Invalid/foreign/stale descriptors fail closed and never invoke mutation. No operation-ID index/log is added; current-tab sessionStorage ownership remains Task 161.

**Dependencies:** Task 125.

**Authority / flows:** SCHEMA forced-Archive recovery and no-journal reconciliation; `UF-28`; `AF-05`, `AF-07`; `NEG-17`, `NEG-20`.

**Recipe:** Not applicable — data/nonvisual.

**Observable acceptance:** classification is read-only, exact, and closed over complete pre/postconditions; invalid identity cannot archive/select/retry; no draft, payload, queue, or general history is persisted.

**Verification:** `pnpm test -- src/lib/db/archive-scratch-recovery.test.ts`; cover applied/not-applied/conflict/unknown/invalid/foreign/stale descriptors and zero writes; then `pnpm typecheck`.

**Commit contract:** recovery read contract/classifier and its dedicated tests only; `feat(triage): classify archive recovery`.

#### Phase 25 Close Notes

- Tasks 120–126 were explicitly accepted and completed on the isolated Phase
  25 branch. They land eleven typed authoritative repository commands plus the
  read-only Archive recovery classifier without UI, hook, store, session
  storage, operation-log, queue, outbox, or Task 127+ scope.
- The phase establishes atomic complete-postcondition transactions for
  Breakdown Add/Save/Delete, Stage/Unstage, confirmed-orphan cleanup,
  staged/direct Placement, source-aware Undo, and guarded Scratch Archive.
  Reconciliation uses exact identities and versions, including ABA-1/2/3
  no-resurrection coverage and one-snapshot authoritative reads.
- Task 126's fresh serial full gate at implementation commit `4eb8df3` passed
  87 test files / 679 tests, lint with 0 errors and the same 11 pre-existing
  warnings, typecheck, and production build with seven routes. The acceptance
  commit changed only this plan and the phase ledger, leaving the `src` tree
  unchanged, so Phase 25 close reused that gate without rerunning it.
- No rendered surface changed. The task checkpoints' real-Dexie and focused
  acceptance evidence is the applicable verification for this data/nonvisual
  phase; later UI realization remains with Tasks 136–162.

| Task | Implementation / repair commit | Acceptance commit |
| --- | --- | --- |
| 120 | `785b9d0` → `6a4523e` | `9d7a636` |
| 121 | `d37d5cf` | `a01c854` |
| 122 | `6c49204` → `5d3fb54` | `dea3d09` |
| 123 | `c1b62ef` | `54405de` |
| 124 | `19dc391` | `06344a7` |
| 125 | `a28ea53` | `4a02fc0` |
| 126 | `4eb8df3` | `adb9cc3` |

**Full issue log:**
[`docs/issues/Issues_Phase_25.md`](issues/Issues_Phase_25.md)

---

## Phase 26 — Lifetime, Copy, And Base-Surface Owners (Completed)

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

**Recipe:** [`Shell and section chrome`](recipes/inbox-triage-shell-section-chrome-visual-recipe.md).

**Observable acceptance:** open the canonical Inbox route and identify all four regions by sight and accessibility tree at 1024px and 1920×1080; theme/mode changes preserve the same component tree and focus.

**Verification:** focused Workspace test, `pnpm lint`, `pnpm typecheck`; run the route in default light/dark at both widths and record landmarks, ratios, focus, captures, and overflow in `docs/verification/inbox-triage/task-129.md`.

**Commit contract:** Workspace shell/test, semantic shell CSS, and Task 129 evidence only; `feat(triage): add semantic inbox shell`.

### Task 130: [x] Implement Pool selection, tools, collapse, and re-entry

**Files and actions:** modify `src/components/triage/scratch-pool.tsx` and `.test.tsx`, `src/hooks/use-inbox.ts` and `.test.tsx`, `src/stores/triage-store.ts` and `.test.ts`, and `src/stores/triage-preferences-store.ts` and `.test.ts`. Implement active fallback/null, expanded tools/list, total versus filtered counts, base selected/empty states, persisted sort, session query/scroll, vertical collapsed switchers, hidden-query independence, first-printable Breakdown key collapse once, per-Scratch manual-reopen exception, same-session re-entry, and deterministic focus restoration using Task 128 copy. Also modify `src/components/bit-detail/bit-detail-popup.tsx` and `.test.tsx` so the globally mounted detail surface never offers Promote to Node for an Inbox-parented Scratch, even when defensive Chunk data exists; the Task 105A repository guard remains the safety backstop and ordinary Chunk-backed Bit promotion remains available. Do not implement `VQ-01` or Pool `VQ-06` states.

**Dependencies:** Task 105A and Tasks 127–129.

**Authority / flows:** `P23-03`, SCHEMA Hook 9; `UF-02`–`UF-04`; `NEG-05`, `NEG-17`.

**Recipe:** [`Scratch Pool`](recipes/inbox-triage-scratch-pool-visual-recipe.md).

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

**Recipe:** [`Selected Scratch Context`](recipes/inbox-triage-selected-scratch-context-visual-recipe.md) and [`Breakdown rows and empty states`](recipes/inbox-triage-breakdown-row-empty-visual-recipe.md).

**Observable acceptance:** Context is standalone and roughly 2–2.5 rows high; Breakdown sorting is stable; rows omit numbering/time; active/staged/consumed and all empty histories are visibly/semantically distinct without implying completion incorrectly.

**Verification:** focused Breakdown/hook/preference tests; run never-used, all-deleted, active, staged, consumed-removal, and completed seeds in default light/dark and record captures, sorting, focus, and accessibility in `docs/verification/inbox-triage/task-132.md`; `pnpm typecheck`.

**Commit contract:** Context/Breakdown base, tests, and Task 132 evidence only; `feat(triage): build breakdown base surfaces`.

### Task 133: [x] Implement source-backed Staging base

**Files and actions:** modify `src/components/triage/staging-zone.tsx` and `.test.tsx`, `src/components/triage/triage-drag-token.tsx` and `.test.tsx`, and `src/components/triage/triage-workspace.tsx` and `.test.tsx`. Render Task 131 candidates with visible Staging/Nodes/Bits identity, exact 35/65 split, stable createdAt DESC then ID order, count prefixes at 2+, quiet empty wells, independent hidden-scroll lists, distinct Node-card/Bit-row shapes, whole-root activation semantics, and compact pointer-centered overlay. Project Task 131 authoritative counts into the existing Workspace Nodes/Bits headings without changing their IDs, semantics, focus structure, or layout. No large empty cards, internal handles, primary click, permanent Unstage, other shell behavior, or `VQ-06` state appearance.

**Dependencies:** Tasks 129 and 131.

**Authority / flows:** `UF-13`; `NEG-06`, `NEG-08`, `NEG-12`.

**Recipe:** [`Staging`](recipes/inbox-triage-staging-visual-recipe.md).

**Observable acceptance:** Nodes/Bits retain distinct shapes and correct split/order/counts; whole roots expose drag semantics without internal grip; last items remain reachable without panel resize or visible scrollbar chrome.

**Verification:** focused Staging/token tests; run empty, one-item, multi-item, overflow, Node/Bit, and pointer-token states at both widths and record captures/interaction/focus in `docs/verification/inbox-triage/task-133.md`; `pnpm typecheck`.

**Commit contract:** Staging/token base, tests, and Task 133 evidence only; `feat(triage): render durable staging base`.

### Task 134: [x] Implement Explorer columns, full labels, session restoration, and remote anchoring

**Files and actions:** modify `src/components/triage/hierarchy-explorer.tsx` and `.test.tsx`, `src/stores/triage-store.ts` and `.test.ts`, and `src/components/triage/triage-workspace.tsx` and `.test.tsx`. Move hierarchy path/open columns/column scroll to app-session ownership; render Home plus full ancestor/column labels; validate re-entry; anchor remote insertions by first visible stable ID plus offset; fall to nearest valid ancestor without sibling/ghost substitution; restore deterministic heading/ancestor focus; and close stale placement without write by invoking the Workspace-owned existing `handlePlacementCancel` callback when Explorer validation invalidates the target. Remove component-local abbreviated labels and active-column filtering, leaving the dedicated search body absent until Task 151 and adding no other Workspace behavior.

**Dependencies:** Tasks 127–129 and current reactive grid reads.

**Authority / flows:** `UF-17`; `AF-05`, `AF-09`; `NEG-03`, `NEG-10`.

**Recipe:** [`Grid Explorer`](recipes/inbox-triage-grid-explorer-visual-recipe.md).

**Observable acceptance:** all column/path labels are full; Scratch switch preserves Explorer context; same-session re-entry validates it while reload starts Home; remote inserts preserve anchor/selection/focus and invalid suffix falls only to the nearest valid ancestor.

**Verification:** focused Explorer/store tests; run Home/deep path/re-entry/reload/remote insert/delete/move at both widths and record full-label, anchor, fallback, focus, and capture evidence in `docs/verification/inbox-triage/task-134.md`; `pnpm typecheck`.

**Commit contract:** Explorer base/state ownership, tests, and Task 134 evidence only; `feat(triage): build explorer session columns`.

### Task 135: [x] Build dedicated whole-hierarchy Explorer query lifecycle

**Files and actions:** create `src/lib/utils/grid-explorer-search.ts` and `.test.ts`; create `src/hooks/use-grid-explorer-search.ts` and `.test.tsx`. The pure utility traverses all active reachable Node/Bit descendants from every visible Home root; excludes Chunks, archived/trashed/system/hidden/unreachable items; uses whitespace AND matching and exact canonical rank/tie order; preserves type/path/ancestor identity for duplicates. The mounted-page hook owns request identity, cancellation, loading/error/stale response, reactive updates, active/interrupted query, result scroll/focus, and result disappearance. It never imports/extends `useSearch()` or `searchAll()` and renders no unsupported body.

**Dependencies:** Task 101 and existing reactive grid reads.

**Authority / flows:** `UF-18`, `UF-19`; `AF-02`, `AF-09`; `NEG-10`.

**Recipe:** [`Grid Explorer`](recipes/inbox-triage-grid-explorer-visual-recipe.md).

**Observable acceptance:** query/ranking/exclusions/duplicates are deterministic; stale requests cannot replace current results; the hook distinguishes active and DnD-interrupted search without persisting either across route exit/reload; global Search code remains untouched.

**Verification:** focused utility/hook tests for traversal, rank, duplicates, request races, reactive updates, disappearance, interruption, and reset; `pnpm typecheck`; `rg` proves no global Search dependency.

**Commit contract:** dedicated search utility/hook and tests only; `feat(triage): add explorer search model`.

#### Phase 26 Close Notes

- Tasks 127–135 were explicitly accepted on the isolated Phase 26 branch. They
  establish app-session and device-preference owners, centralized core-English
  copy, the semantic Inbox shell, source-backed Pool/Breakdown/Staging/Explorer
  base surfaces, durable-candidate projection, and the dedicated headless
  whole-hierarchy Explorer query lifecycle.
- Task 133's approved Workspace count-heading projection and Task 134's
  approved Workspace stale-placement callback wiring are now part of their
  canonical file/action boundaries. Both retained `Tagged` impacts are
  `Reflected`; Task 135 remains `None`.
- The fresh end-phase serial full gate at pre-close `cb09da0` passed 92 test
  files / 743 tests, lint with 0 errors and the same 11 pre-existing warnings,
  typecheck, and production build with seven static routes and one dynamic
  route. Accepted Task 129/130/132/133/134 route and capture records remain the
  applicable user-visible checkpoint evidence.
- `P23-03` is resolved by accepted Task 130's popup visibility guard, and
  `P23-02` is resolved by accepted Task 136's retired mock/assertion removal;
  both are synchronized to the deferred index.

| Task | Implementation / evidence | Acceptance |
| --- | --- | --- |
| 127 | `775045f` → `c5a1f65` | `8d2cde0` |
| 128 | `f57d1d5` → `beb63a2` | `0079dc3` |
| 129 | `78f6f97` → `2f2b8c5` | `dcced04` |
| 130 | `3eed3a9` → `817432d` | `3ba4d72` |
| 131 | `6ee8d4a` → `c927045` | `05d1e39` |
| 132 | `e18a18b` → `5236400` | `7dd0b2e` |
| 133 | `bf872fe` → `6e26326` | `5d8e2d3` |
| 134 | `bc12c2d` → `29e0b61` | `2a4dabc` |
| 135 | `d3f7726` → `5f731d6` | `cb09da0` |

**Full issue log:**
[`docs/issues/Issues_Phase_26.md`](issues/Issues_Phase_26.md)

---

## Phase 27 — Breakdown, Pool, And Staging Interactions

### Task 136: [x] Connect headless Add and Delete interaction behavior

**Files and actions:** create mounted-page `src/hooks/use-triage-operation-lock.ts` and `.test.tsx`; modify `src/components/triage/breakdown-panel.tsx` and `.test.tsx`, `src/components/triage/triage-workspace.tsx` and `.test.tsx`, `src/components/triage/scratch-pool.tsx` and `.test.tsx`, and `src/hooks/use-scratch-breakdowns.ts` and `.test.tsx`. Remove the retired test-only `deleteScratchBreakdownsByScratch` mock and its now-vacuous no-call assertion from `src/hooks/use-scratch-breakdowns.test.tsx` (`P23-02`) while replacing that hook's legacy mutation surface. The Workspace-mounted owner exposes synchronous `acquire(kind, operationId)`, `activeOperation`, and terminal `release` for `add|delete|edit|stage|unstage|placement|undo|archive`; acquisition occurs before any asynchronous gap, rejects a duplicate or competing owner, queues nothing, survives pending/unknown/reconciling, and releases only on terminal `applied|not_applied|rejected|conflict`. Its single signal locks Scratch switch, internal route/browser exit, Edit, Placement, Undo, Archive, Cancel/Escape, and duplicate action. Wire Add/Delete acquisition plus base Breakdown Cancel/Escape/duplicate gating and Pool Scratch-switch gating here; Tasks 137, 139, 145, 152, 156, and 161 wire the remaining exact consumers. Dispatch Task 120 Add/Delete commands, retain authoritative rows/drafts through pending or unknown outcomes, submit Add only by Enter or explicit Add, scroll a confirmed row into view with the minimum handoff that keeps the row visible without unnecessarily moving the complete Context, and restore focus after confirmed Delete in the order next row → previous row → Add input → Context. Expose typed operation state slots without choosing `VQ-05` appearance.

**Dependencies:** Tasks 120, 128, 130, and 132.

**Authority / flows:** `P23-02`; `UF-07`, `UF-11`, `UF-12`; `AF-02`, `AF-07`; `NEG-09`.

**Recipe:** [`Breakdown rows and empty states`](recipes/inbox-triage-breakdown-row-empty-visual-recipe.md).

**Observable acceptance:** blur never submits; duplicate Enter/click or a competing operation produces one command total; unknown Add keeps draft, operation identity, and the complete shared lock; Delete keeps row until terminal success; terminal results release once; Scratch switch and Cancel/Escape are denied while locked without mutation or queued replay; focus/scroll handoff follows the exact order. At the canonical `1440×900` GridDO light viewport with default `DESC` sort, confirmed Add leaves the complete Selected Scratch Context and the new top Breakdown row simultaneously visible while Add input focus and the one-shot `Added.` identity/lifetime remain unchanged; `ASC` still reveals its new row.

**Verification:** focused operation-lock/Breakdown/Workspace/Pool/hook tests; assert every operation kind against the complete mutual-exclusion matrix and terminal release contract, including authoritative Add/Delete reconciliation and terminal release at hook level. In the canonical route, run Enter/Add, blur, duplicate/competing intent, Scratch switch, Cancel/Escape, unknown row/lock retention and blocked actions, failed Delete, and confirmed focus/scroll paths, recording interactions/focus in `docs/verification/inbox-triage/task-136.md`. Task 143 owns route-level `Check again` → reconciliation → terminal release/focus because it adds that production trigger; `pnpm typecheck`.

**Commit contract:** mounted-page operation lock, headless Add/Delete adapter, the exact `P23-02` stale-test cleanup, owner tests, and Task 136 evidence only; `feat(triage): connect locked breakdown commands`. The user-approved `P27-01` canonical repair is a documentation-only exception limited to this Task 136 verification clause, Task 143's verification clause, the Phase 27 issue ledger, and Task 136 evidence; it changes no product code, tests, or task marker.

### Task 137: [x] Build headless conditional editor and blocker state

**Files and actions:** modify `src/hooks/use-scratch-breakdowns.ts` and `.test.tsx`, `src/components/triage/breakdown-panel.tsx` and `.test.tsx`, and `src/components/triage/triage-workspace.tsx` and `.test.tsx`; extend `src/hooks/use-triage-operation-lock.test.tsx`. Model mounted-page Scratch-title/row base snapshot, draft, pristine/dirty/validation/saving/offline/not-applied/reconciling/conflict/invalidation, acknowledged latest version, copyable invalidated draft, and save-before-action intent over Task 120. Consume Task 136's shared signal: another active operation blocks opening/saving Edit, while an Edit save synchronously acquires `edit` before dispatch and retains the full matrix through unknown/reconciling until terminal release. Expose a synchronous typed Scratch-title blocker snapshot (`open|dirty|saving|conflicted|reconciling`) to external-removal/completion/Archive coordinators. Implement conditional command/focus semantics in tests but render no missing VQ-04 surface and no generic dialog.

**Dependencies:** Tasks 120, 132, and 136.

**Authority / flows:** `UF-09`, `UF-10`; `AF-05`, `AF-06`; `NEG-14`, `NEG-15`, `NEG-19`.

**Recipe:** [`Selected Scratch Context`](recipes/inbox-triage-selected-scratch-context-visual-recipe.md) and [`Breakdown rows and empty states`](recipes/inbox-triage-breakdown-row-empty-visual-recipe.md).

**Observable acceptance:** the state machine distinguishes every authoritative result, `use mine` targets only acknowledged latest version, `use latest` writes nothing, staged/lifecycle-invalid rows cannot save, and blocker reads are synchronous without requiring Task 138 visuals.

**Verification:** focused operation-lock/hook/Breakdown/Workspace state-machine tests for blocked Edit open/save, Edit acquisition, duplicate/competing action, terminal release, ABA, offline, reconciliation, conflicts, invalidation, save-before-action, blocker snapshots, and deterministic focus intents; `pnpm typecheck`.

**Commit contract:** headless editor/blocker model and tests only; `feat(triage): model conditional inline edits`.

### Task 138: [x] Render `DP-VQ04` inline editors

**Files and actions:** after `DP-VQ04`, modify `src/components/triage/breakdown-panel.tsx` and `.test.tsx` plus `src/app/globals.css` to replace only the Scratch-title and Breakdown-content inline-editor visual realization with the user-approved fixed geometry. Preserve view/edit outer geometry and drag/content/action anchors; reserve a fixed `9.5rem` action region; keep text-style Save/Cancel with dirty Save in destructive/red emphasis; cap the single-line Scratch title at 60 characters and Breakdown content at 120; allow browser-managed caret-following horizontal movement with `Home` returning to the start and `End` exposing the terminal caret; render no textarea, resize, vertical scrolling, or visible scrollbar. Ordinary states have no visible status row, saving/reconciling retain the read-only field with a fixed progress action, and offline/not-applied/conflict/invalidated use the source-bound fixed overlay over blurred underlying content. Conflict exposes Use mine, Use latest, and Copy draft without expanding comparison regions. Preserve all Task 137 state/lock/blocker/focus semantics and never use generic Dialog/AlertDialog.

**Dependencies:** Tasks 109, 128, and 137.

**Authority / flows:** `DP-VQ04`, `UF-09`, `UF-10`; `NEG-14`, `NEG-21`.

**Recipe:** [`Selected Scratch Context`](recipes/inbox-triage-selected-scratch-context-visual-recipe.md) and [`Breakdown rows and empty states`](recipes/inbox-triage-breakdown-row-empty-visual-recipe.md).

**Observable acceptance:** both editors retain their source geometry and fixed action/content boundary in every state; limits, single-line behavior, and `Home`/`End` caret-following movement match the approved contract; ordinary status rows stay absent; progress and source-bound overlay states do not move anchors or expand comparison regions; Cancel restores current truth; invalidation preserves review/copy; no inline literal or adjacent fallback appears.

**Verification:** focused editor tests for both surfaces' fixed geometry, limits, action boundary, ordinary/progress/overlay states, and `Home`/`End` caret-following behavior; retain the previously accepted Task 138 state/keyboard/IME/focus contract and record canonical repair evidence/captures in `docs/verification/inbox-triage/task-138.md`; run the adapter-declared full gate.

**Commit contract:** DP-VQ04 copy, realization, tests, styles, and Task 138 evidence only; `feat(triage): render conditional inline editors`.

### Task 139: [x] Build headless Add-draft departure coordination

**Files and actions:** create `src/hooks/use-triage-departure.ts` and `.test.tsx`; modify `src/components/triage/triage-workspace.tsx` and `.test.tsx`, `src/components/triage/breakdown-panel.tsx` and `.test.tsx`, `src/components/triage/scratch-pool.tsx` and `.test.tsx`, `src/components/triage/hierarchy-explorer.tsx` and `.test.tsx`, `src/components/layout/sidebar.tsx` and `.test.tsx`, and `src/components/layout/search-overlay.tsx` and `.test.tsx`; extend `src/hooks/use-triage-operation-lock.test.tsx`. The hook is the minimum mounted-page common coordination owner: Workspace registers the active controller, while the actual Pool, Explorer, Sidebar, and global Search owners request departure before calling their selection/path/router mutations. Detect non-empty Add draft synchronously; capture one app-internal Scratch/path/route destination; expose Continue writing and Discard and move transitions; replace a stale destination deterministically; clear only the Add draft on discard; and hand focus to the performed destination's captured canonical focus owner. Scratch and Explorer owners must guard before mutation and must not use post-mutation rollback. Sidebar and global Search cover the actual SPA exits available from Inbox; Inbox does not render Breadcrumbs or GridView, so those inactive owners remain unchanged. Consume Task 136's shared signal before draft handling: any active operation rejects internal Scratch/path/route exit, and the browser/native exit owner installs the standard `beforeunload` prevention while locked; neither path clears, cancels, queues, or replays an intent. Keep browser/native unload presentation separate and render no VQ-03 surface.

**Dependencies:** Tasks 136 and 137.

**Authority / flows:** `UF-08`; `AF-05`; `NEG-17`, `NEG-21`.

**Recipe:** [`Breakdown rows and empty states`](recipes/inbox-triage-breakdown-row-empty-visual-recipe.md).

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

**Recipe:** [`Breakdown rows and empty states`](recipes/inbox-triage-breakdown-row-empty-visual-recipe.md).

**Observable acceptance:** the approved internal surface is used only for Add-draft departure; actions produce Task 139 transitions exactly; native unload and unrelated confirmations remain separate.

**Verification:** focused component/copy tests; run Scratch/path/route departure with both actions, competing destinations, keyboard/focus, themes, and scope-out case, recording `docs/verification/inbox-triage/task-140.md`; `pnpm typecheck`.

**Commit contract:** DP-VQ03 copy/realization, tests, styles, and Task 140 evidence only; `feat(triage): render add draft departure`.

### Task 141: [x] Render `DP-VQ01` external Scratch-removal transition

**Files and actions:** after `DP-VQ01`, modify `src/components/triage/scratch-pool.tsx` and `.test.tsx`, `src/components/triage/triage-workspace.tsx` and `.test.tsx`, `src/stores/triage-store.ts` and `.test.ts`, `src/app/globals.css`, `src/lib/copy/inbox-triage.ts` and `.test.ts`. Use headless Tasks 137/139—not VQ-03/04 visuals—to realize external archive/delete countdown, pause/resume, destination revalidation/replacement, full draft copy/status, authoritative restore, terminal removal, selection, and focus exactly. Do not borrow Archive/dialog/Pool chrome. The user-approved `P27-11` conformance repair additionally creates `src/hooks/use-external-scratch-removal-data.ts` and `.test.tsx` and modifies only `src/components/triage/triage-workspace.tsx` and `.test.tsx` to move the existing selected-Scratch lifecycle observation, unclassified-lifecycle fallback, and terminal Inbox/source reads behind a typed read-only hook boundary. The hook preserves terminal Inbox-first/source-last ordering, normalization and race guards, exposes only observation plus a terminal snapshot callback, and imports neither Zustand nor durable/session ownership; behavior, copy, DOM, style, timing, focus, DataStore, repository, and schema remain unchanged.

**Dependencies:** Tasks 106, 128, 130, 136, 137, and 139; deliberately not Tasks 138 or 140.

**Authority / flows:** `DP-VQ01`, `UF-05`; `AF-05`; `NEG-21`.

**Recipe:** [`Scratch Pool`](recipes/inbox-triage-scratch-pool-visual-recipe.md).

**Observable acceptance:** external removal cannot silently lose Add/editor draft or use a stale destination; pause/resume/changed destination/copy/restore/terminal handoff match receipt; unresolved VQ-03/04 appearance does not block this task.

**Verification:** focused Pool/Workspace/store/copy tests with fake timers; run removal with Add draft, each editor headless state, pause/resume, destination mutation, copy, restore, and terminal removal in all themes, recording `docs/verification/inbox-triage/task-141.md`; `pnpm typecheck`.

**Commit contract:** DP-VQ01 copy/transition, tests, styles, and Task 141 evidence only; `feat(triage): handle external scratch removal`.

### Task 142: [x] Define triage pointer sources and lifecycle snapshots in existing DnD owner

**Files and actions:** modify existing `src/hooks/use-dnd.ts` and `src/hooks/use-triage-dnd.test.ts`, `src/components/triage/breakdown-panel.tsx` and `.test.tsx`, `src/components/triage/staging-zone.tsx` and `.test.tsx`, and `src/components/triage/triage-drag-token.tsx` and `.test.tsx`. Keep general Grid/Calendar DnD behavior separate. `useTriageDnd` uses Mouse 8px and Touch 250ms/5px, captures stable source/candidate/version/type at activation, starts Breakdown only from grip and staged items from whole root, distinguishes Stage/Unstage/Placement intent, keeps a compact pointer-centered token, and cancels mutation on remote invalidation. Add no second triage DnD hook owner.

**Dependencies:** Tasks 131–133.

**Authority / flows:** `UF-12`, `UF-13`; `AF-09`; `NEG-06`, `NEG-12`.

**Recipe:** [`Breakdown rows and empty states`](recipes/inbox-triage-breakdown-row-empty-visual-recipe.md), [`Staging`](recipes/inbox-triage-staging-visual-recipe.md), and [`Placement affordances`](recipes/inbox-triage-placement-affordances-visual-recipe.md).

**Observable acceptance:** rows never drag outside grip; whole staged roots do; exact sensor thresholds hold; remote change cannot retarget a snapshot; general Grid keyboard DnD remains unchanged.

**Verification:** focused existing DnD/Breakdown/Staging/token tests; run mouse/touch activation, invalidation, Escape, and overlay alignment in canonical route, recording interaction/captures in `docs/verification/inbox-triage/task-142.md`; `pnpm typecheck`.

**Commit contract:** existing DnD triage intent slice, source adapters/tests, and Task 142 evidence only; `feat(triage): define triage pointer sources`.

### Task 143: [x] Render `DP-VQ05` Add/Delete reliability states

**Files and actions:** after `DP-VQ05`, modify `src/components/triage/breakdown-panel.tsx` and `.test.tsx`, `src/app/globals.css`, `src/lib/copy/inbox-triage.ts` and `.test.ts` to populate approved wording and render Add pending/failure/reconcile states plus Delete deleting/failure/check-again states over Task 136 authoritative operation identities, with exact timing/actions/focus/theme mappings. Add may expose Retry only from authoritative `not_applied` when the receipt specifies it. Delete failure or unknown keeps the row in place and exposes only Check again/reconciliation; Delete has no dedicated Retry action. Do not include Pool `VQ-06`.

**Dependencies:** Tasks 110, 128, and 136.

**Authority / flows:** `DP-VQ05`, `UF-07`, `UF-11`; `NEG-11`, `NEG-21`.

**Recipe:** [`Breakdown rows and empty states`](recipes/inbox-triage-breakdown-row-empty-visual-recipe.md).

**Observable acceptance:** Add/Delete states are section-local and distinct; any Add Retry exists only for authoritative `not_applied`; every Delete failure/unknown leaves the row in place and offers Check again/reconciliation without a dedicated Retry or resend; focus/copy/theme exactly match receipt.

**Verification:** focused Breakdown/copy state-table tests, including row retention and the absence of a Delete Retry action for every Delete failure/unknown result; run every authoritative result, focus, reduced motion, and theme mapping in the canonical route, including `Check again` from a Delete failure/unknown result → reconciliation with the preserved operation identity → terminal release and deterministic focus, recording `docs/verification/inbox-triage/task-143.md`; `pnpm typecheck`.

**Commit contract:** DP-VQ05 copy/realization, tests, styles, and Task 143 evidence only; `feat(triage): render breakdown reliability states`.

### Task 144: [x] Render `DP-VQ06-POOL` Pool statuses

**Files and actions:** after `DP-VQ06-POOL`, modify `src/hooks/use-inbox.ts` and `.test.tsx` so the existing authoritative repository-snapshot owner exposes typed Pool lifecycle/provenance projection that excludes the initial snapshot and current-session local `createScratchBit` results while distinguishing remote arrival, external archive, external delete, and restore. Modify `src/components/triage/scratch-pool.tsx` and `.test.tsx`, `src/app/globals.css`, `src/lib/copy/inbox-triage.ts` and `.test.ts` to populate Pool-only approved wording and render hidden-selection, remote/lifecycle, count/indicator, action, focus, dismissal, and all-theme states without changing selection or borrowing Staging/Explorer presentation. Keep mounted Inbox-page activity aggregation and UI state in `ScratchPool`; do not change DataStore APIs, IndexedDB, schema, persistence, or timestamps, query repository lifecycle from the component, or add another production owner.

**Dependencies:** Tasks 111, 128, and 130.

**Authority / flows:** `DP-VQ06-POOL`, `UF-03`; `NEG-21`.

**Recipe:** [`Scratch Pool`](recipes/inbox-triage-scratch-pool-visual-recipe.md).

**Observable acceptance:** a filtered selected Scratch remains explicit without auto-selecting another; every Pool receipt state/action/lifetime is exact and section-local.

**Verification:** focused Pool/copy tests; run hidden-selected, remote/lifecycle, dismiss/re-entry, focus, reduced motion, and all themes, recording `docs/verification/inbox-triage/task-144.md`; `pnpm typecheck`.

**Commit contract:** DP-VQ06-POOL copy/realization, tests, styles, and Task 144 evidence only; `feat(triage): render pool statuses`.

### Task 145: [x] Connect Stage and Unstage interaction adapters

**Files and actions:** modify `src/components/triage/breakdown-panel.tsx`, `src/components/triage/staging-zone.tsx`, `src/components/triage/triage-workspace.tsx`, and their tests; modify `src/hooks/use-staged-candidates.ts` and `.test.tsx` plus existing `src/hooks/use-dnd.ts` and `src/hooks/use-triage-dnd.test.ts`; extend `src/hooks/use-triage-operation-lock.test.tsx`. Dispatch Task 121 commands only from current compatible drops after synchronously acquiring Task 136's shared `stage`/`unstage` lock. Retain that lock and source-backed truth through pending/unknown/reconciling; reject duplicate/competing action, Scratch switch, internal/browser exit, Edit, Placement, Undo, Archive, and Cancel/Escape with no queue or replay; release only on terminal result. Expose transient Staging/Breakdown Unstage targets during matching drags; keep the staged source grip natively disabled with non-draggable pointer feedback and no grab/grabbing cursor while active grips retain their existing feedback; restore original created-at sort position/source focus after confirmed Unstage; reconcile unknown before Retry; add no permanent Unstage button or success toast.

**Dependencies:** Tasks 121, 131–133, 136, 139, and 142.

**Authority / flows:** `UF-12`, `UF-14`, `UF-15`; `AF-02`, `AF-07`, `AF-09`; `NEG-12`, `NEG-13`, `NEG-15`.

**Recipe:** [`Breakdown rows and empty states`](recipes/inbox-triage-breakdown-row-empty-visual-recipe.md) and [`Staging`](recipes/inbox-triage-staging-visual-recipe.md).

**Observable acceptance:** Stage/Unstage start only from valid current snapshots/targets and a successful synchronous lock acquisition; durable representations and the complete lock matrix remain through unknown/reconciliation; blocked intents produce no command/navigation/replay; terminal release is exact; a staged source grip is actually disabled and shows a non-draggable cursor on pointer hover without grab/grabbing feedback; active grips retain grab/grabbing feedback; confirmed Unstage restores order/focus and has no permanent control/toast.

**Verification:** focused operation-lock/Breakdown/Staging/Workspace/candidate/DnD/departure tests; for Stage and Unstage run the complete matrix, duplicate/competing acquisition, pending/unknown/reconciling/terminal release, success/reject/conflict, navigation, order, and focus flows and record `docs/verification/inbox-triage/task-145.md`; `pnpm typecheck`.

**Commit contract:** headless Stage/Unstage adapters, tests, and Task 145 evidence only; `feat(triage): connect stage and unstage flows`.

### Task 146: [x] Reconcile remote candidates and confirmed-orphan cleanup

**Files and actions:** modify `src/hooks/use-staged-candidates.ts` and `.test.tsx`, `src/components/triage/staging-zone.tsx` and `.test.tsx`, and existing `src/hooks/use-dnd.ts` and `src/hooks/use-triage-dnd.test.ts`. Separate unresolved subscription miss from authoritative orphan proof; invoke Task 122 only with exact proof/identity; update counts/Archive facts reactively; cancel affected drags after visual snapshot release; preserve selection/focus on remote arrival/removal. Expose typed slots for Task 147 but choose no `VQ-06` appearance.

**Dependencies:** Tasks 122, 131, 133, 142, and 145.

**Authority / flows:** `UF-16`; `AF-02`, `AF-08`; `NEG-16`.

**Recipe:** [`Staging`](recipes/inbox-triage-staging-visual-recipe.md).

**Observable acceptance:** cache/offline/delay never renders/cleans as orphan; confirmed cleanup converges to exact audit-backed state; remote addition never steals focus; invalid drag writes nothing; counts and completion update from truth.

**Verification:** focused hook/Staging/DnD tests; run delayed source, proof cleanup, remote arrival/removal, focus, count, Archive eligibility, and active drag, recording `docs/verification/inbox-triage/task-146.md`; `pnpm typecheck`.

**Commit contract:** remote/integrity adapters, tests, and Task 146 evidence only; `feat(triage): reconcile candidate integrity`.

### Task 147: [x] Render `DP-VQ06-STAGING` Staging statuses

**Files and actions:** after `DP-VQ06-STAGING`, modify `src/hooks/use-staged-candidates.ts` and `.test.tsx` only to expose whether the selected Scratch has received its matching authoritative live-query snapshot; authoritative empty is ready, while pre-snapshot, changed-Scratch, and null states are not. Modify `src/components/triage/triage-workspace.tsx` and `.test.tsx` only as the mounted projection owner for that readiness, its existing command-bearing `useStagedCandidates` instance, and existing explicit `activeDragItem.integrity === "invalidated"` plus `onPendingPlacementInvalidated(dropId)` signals; modify `src/components/triage/staging-zone.tsx` and `.test.tsx`, `src/components/triage/breakdown-panel.tsx` and `.test.tsx`, `src/app/globals.css`, `src/lib/copy/inbox-triage.ts` and `.test.ts` to populate Staging-only wording and render Stage/Unstage pending/invalid/stale/failure, remote arrival, orphan, alert/count/indicator, dismissal/action/focus, reduced-motion, and all-theme states over Tasks 145–146. Use the first matching snapshot or Scratch-switch snapshot only as the remote-arrival baseline; a later authoritative arrival after a ready empty snapshot remains observable. Keep confirmed-orphan copy/render in the headless state matrix, but defer its production reachability and browser acceptance to a future remote-authority lifecycle because no authoritative proof producer or production caller exists. Do not use timing/render-count/first-nonempty inference, change candidate truth/count/eligibility, infer invalidation from generic close/disappearance, create orphan authority, or change Task 146 integrity/command/DnD/repository semantics.

**Dependencies:** Tasks 112, 128, 145, and 146.

**Authority / flows:** `DP-VQ06-STAGING`, `UF-14`, `UF-16`; `NEG-11`, `NEG-13`, `NEG-21`.

**Recipe:** [`Staging`](recipes/inbox-triage-staging-visual-recipe.md).

**Observable acceptance:** every receipt state is section-local/distinct, remote arrival never steals focus, alert lifetime is exact, and only terminal success removes/restores durable representations.

**Verification:** focused Workspace/Staging/Breakdown/copy state-table tests; run each production-reachable state/dismissal/focus/reduced-motion/theme mapping and record `docs/verification/inbox-triage/task-147.md`; verify confirmed-orphan copy/render headlessly and record its production/browser deferral; `pnpm typecheck`.

**Commit contract:** DP-VQ06-STAGING copy/realization, tests, styles, and Task 147 evidence only; `feat(triage): render staging statuses`.

### Task 148: [x] Render `DP-VQ02` Add/Unstage success signal

**Files and actions:** after `DP-VQ02`, modify `src/components/triage/breakdown-panel.tsx` and `.test.tsx`, `src/components/triage/staging-zone.tsx` and `.test.tsx`, `src/components/triage/triage-workspace.tsx` and `.test.tsx` only as the mounted projection owner for the authoritative local Unstage terminal outcome, `src/app/globals.css`, `src/lib/copy/inbox-triage.ts` and `.test.ts`. Trigger the approved shared one-shot signal only from a newly observed authoritative Add/Unstage success identity, with exact duration/easing/copy/placement/interruption/retrigger, polite announcement, and static reduced-motion distinction. Workspace may project only `{kind, operationId, sourceBreakdownId}` from the local Unstage callback's first authoritative `applied` or `already_applied` result; unknown reconciliation may supply that authority once for the same stable operation. Do not infer success from candidate disappearance, Staging projection removal, rerender, reload, or remote events. Preserve Add's existing BreakdownPanel authoritative path. Re-render/reload/reconcile replay never repeats the signal; Unstage still has no toast.

**Dependencies:** Tasks 107, 128, 136, and 145.

**Authority / flows:** `DP-VQ02`, `UF-07`, `UF-15`; `NEG-11`, `NEG-13`.

**Recipe:** [`Breakdown rows and empty states`](recipes/inbox-triage-breakdown-row-empty-visual-recipe.md) and [`Staging`](recipes/inbox-triage-staging-visual-recipe.md).

**Observable acceptance:** one operation identity triggers once, later identities retrigger once, interruption follows receipt, focus stays put, reduced motion remains perceivable, and routine Unstage produces no toast.

**Verification:** focused fake-timer/motion/copy tests; run Add and Unstage success, replay, interruption, focus, announcement, reduced motion, and themes, recording `docs/verification/inbox-triage/task-148.md`; `pnpm typecheck`.

**Commit contract:** DP-VQ02 copy/signal, tests, styles, and Task 148 evidence only; `feat(triage): render authoritative success signal`.

---

#### Phase 27 Close Notes

- Tasks 136–148 were explicitly accepted on the isolated Phase 27 branch and
  establish the authoritative Breakdown, Pool, and Staging interaction and
  realization layer.
- P27-11 moved selected-Scratch removal reads behind a dedicated reactive hook;
  P27-12/P27-13 repaired only the Add viewport handoff and staged-grip pointer
  feedback. Their accepted final `src` tree is
  `7b831a941d40631c2212d07a010f3c6b4a00e01a`.
- The fresh end-phase gate at pre-close `983595c` passed 95 test files / 982
  tests, lint with 0 errors and the same 11 pre-existing warnings, typecheck,
  production build with seven generated pages, and diff-check.
- Accepted task evidence covers the edge, cross-tab, eight-theme, and
  reduced-motion matrices and remains reusable without repetition.
- P27-06 and P27-08 remain explicitly Deferred. All other P27 issues are
  Closed, and P23-02 is resolved by accepted Task 136.

| Task | Implementation / evidence | Acceptance |
| --- | --- | --- |
| 136 | `cf0b08d` → `318739f` | `02675c3` |
| 137 | `bba0da0` → `d0bc011` | `47269fb` |
| 138 | `68534d0` → `a7ab647` | `17babba` |
| 139 | `d987ed2` → `0dcaf26` | `23da87d` |
| 140 | `0e2abd6` → `fba3e81` | `8015a98` |
| 141 | `9a804f6` → `383ae7d` | `310b575` |
| 142 | `a851f35` → `52d8fd4` | `e323a4a` |
| 143 | `5936569` → `5ce2ddf` | `8022301` |
| 144 | `d25ec44` → `86efb2b` | `cdc0243` |
| 145 | `21d87bd` → `27298c1` | `3fb1155` |
| 146 | `8809a74` → `7dc8ca6` | `d8ba3e2` |
| 147 | `a9e02b2` + `79a3aad` → `55e7e2e` | `841d6cc` |
| 148 | `47f44d7` → `29c383b` | `f5940fc` |

**Full issue log:**
[`docs/issues/Issues_Phase_27.md`](issues/Issues_Phase_27.md)

---

## Phase 28 — Explorer Search And Pointer Placement

### Task 149: [x] Implement release-time targets and valid-column edge auto-scroll

**Acceptance:** Accepted on 2026-08-24. Implementation checkpoint
`1830cc37ff913bd1d4ad4b62ddd9f7b2319b4dca`; evidence-alignment checkpoint
`80bd7041e9db2849d9eab1d9f8d5d08c38e84549`; WF28-02 product-evidence
fingerprint `a2da7ab6f49ba50d9fba9d3ea5e3fb568990e05f264891844e2534e2e00dfdd8`.

**Files and actions:** modify existing `src/hooks/use-dnd.ts` and `src/hooks/use-triage-dnd.test.ts`, `src/components/triage/hierarchy-explorer.tsx` and `.test.tsx`, and `src/components/triage/triage-workspace.tsx` and `.test.tsx`. Disable DndContext/library auto-scroll for triage; compute valid/invalid/full target feedback; progressively scroll only the currently valid Explorer column near its top/bottom edge without jumps/path changes; continuously hit-test pointer-under geometry and use the final rendered release target; stop on exit/end; never scroll invalid columns, shell, or page. A full target remains a selected release target for Task 152 rather than being discarded.

**Dependencies:** Tasks 134 and 142.

**Authority / flows:** `UF-22`; `AF-09`; `NEG-06`, `NEG-07`.

**Recipe:** [`Grid Explorer`](recipes/inbox-triage-grid-explorer-visual-recipe.md) and [`Placement affordances`](recipes/inbox-triage-placement-affordances-visual-recipe.md).

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

**Recipe:** [`Grid Explorer`](recipes/inbox-triage-grid-explorer-visual-recipe.md).

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

**Recipe:** [`Grid Explorer`](recipes/inbox-triage-grid-explorer-visual-recipe.md).

**Observable acceptance:** whole-hierarchy results/ranking/duplicates render in the dedicated component; valid selection closes search, reconstructs the path, and starts the real item's event-ended reveal; a stale selection retains search, refreshes/reports status, and performs no reveal/navigation; a revealed Bit disappearance clears only that Bit selection/reveal, preserves and focuses its valid parent fallback, and exposes the exact parent-column status/Dismiss lifetime without reopening Search; DnD interruption alone preserves query/results/scroll; X/Escape/route exit clear search and reveal; focused disappearance returns input; every reopen/Scratch-switch path matches the close matrix exactly.

**Verification:** focused utility/hook/results/Explorer/copy tests; assert valid selection closes the body, reconstructs the path, starts reveal, and ends reveal only on each named lifecycle event; assert each stale/removed/hidden/unreachable selection retains body/query/results/scroll, refreshes and reports status, and changes no path/selection/reveal/navigation; assert revealed-Bit disappearance clears only the Bit reveal/selection, preserves the parent path, renders the exact parent-column sentence, and follows parent-row/heading focus plus Dismiss lifetime; run every close path, DnD reopen, Scratch switch, focus, themes, and global Search preservation, recording `docs/verification/inbox-triage/task-151.md`; `pnpm typecheck`.

**Commit contract:** DP-VQ07 copy/search body plus only the `P28-04`-moved `DP-VQ06-EXPLORER` selected-Bit disappearance realization, integration, tests, styles, and Task 151 evidence; `feat(triage): render explorer hierarchy search`.

### Task 152: [x] Connect direct/staged placement selection and confirmation

**Accepted:** user-approved checkpoint `e25b1ebe0275d8a7ff16c612195b11780da98b21`; implementation commit `7ba936147722e1e8ebb4a3fb6b9bceed9a65ca88`; accepted `src` tree `8247077665a212e575faad44f20046de623b7306`.

**Files and actions:** create `src/hooks/use-triage-placement.ts` and `.test.tsx`; modify existing `src/hooks/use-dnd.ts` and `src/hooks/use-triage-dnd.test.ts`, `src/components/triage/hierarchy-explorer.tsx` and `.test.tsx`, and `src/components/triage/triage-workspace.tsx` and `.test.tsx`; extend `src/hooks/use-triage-operation-lock.test.tsx`. Own the complete mounted-page foreground state machine: staged release target; direct **Node/Bit type plus destination/path selection**; target-column confirmation; source/target/version snapshot; focus/locks; explicit Confirm/Cancel; one Task 123 dispatch; reconcile unknown. Before dispatch, synchronously acquire Task 136's shared `placement` lock; retain it through pending/unknown/reconciling, deny the complete matrix including placement Cancel/Escape and duplicate Confirm without queue/replay, and release only on terminal result. Another active owner blocks placement start/Confirm. A full destination must open the same target-column affordance with a **visible full-target reason, disabled Confirm, and working Cancel**. Drop alone writes nothing; no alternate parent/sibling/cell, keyboard placement, picker, or hidden shortcut. Integrate with Task 135 headless search so placement can close/lock it without requiring VQ-07 UI.

**Dependencies:** Tasks 123, 128, 134, 135, 136, 139, 145, and 149.

**Authority / flows:** `UF-20`–`UF-22`; `AF-06`, `AF-07`, `AF-09`; `NEG-07`, `NEG-18`.

**Recipe:** [`Placement affordances`](recipes/inbox-triage-placement-affordances-visual-recipe.md).

**Observable acceptance:** direct placement cannot skip type+path; staged/direct each reach a distinct target-column confirmation; full target shows exact source-backed base reason with disabled Confirm and Cancel; valid Confirm acquires once, revalidates, and dispatches once; pending/unknown retains the complete lock, Cancel/Escape/duplicates/competing actions write nothing, and terminal release is exact; pre-dispatch Cancel returns source; every invalid/stale state writes nothing.

**Verification:** focused operation-lock/placement/DnD/Explorer/Workspace/departure tests; run staged/direct Node/Bit type+path, full target, valid/invalid/stale/moved, the complete pending matrix, pre-dispatch versus pending Confirm/Cancel/Escape, duplicate/competing intent, terminal release, focus, and unknown reconciliation, recording `docs/verification/inbox-triage/task-152.md`; `pnpm typecheck`.

**Commit contract:** base placement coordinator/adapters, tests, and Task 152 evidence only; `feat(triage): connect atomic pointer placement`.

### Task 153: [x] Render `DP-VQ08` placement reliability states

**Files and actions:** after `DP-VQ08`, modify `src/hooks/use-triage-placement.ts` and `.test.tsx`, `src/components/triage/hierarchy-explorer.tsx` and `.test.tsx`, `src/app/globals.css`, `src/lib/copy/inbox-triage.ts` and `.test.ts` to populate approved wording and render pending, reconciling, explicit failure, stale source/target, Retry/Cancel, success, timing, focus, reduced-motion, and theme states within Task 152's captured affordance. Source truth/destination remain visible until authoritative resolution; Retry only from not-applied; unknown offers Check again. Share no dependency with Task 154; the writer mutex serializes their common files.

**Dependencies:** Tasks 115, 128, and 152.

**Authority / flows:** `DP-VQ08`, `UF-20`, `UF-21`; `AF-07`; `NEG-18`, `NEG-21`.

**Recipe:** [`Placement affordances`](recipes/inbox-triage-placement-affordances-visual-recipe.md).

**Observable acceptance:** every result family and receipt state is distinct; no optimistic result, blind resend, or alternate target occurs; current-action focus is stable.

**Verification:** focused placement/Explorer/copy state-table tests; run every authoritative result, Retry/Check again/Cancel, focus, reduced motion, and all themes, recording `docs/verification/inbox-triage/task-153.md`; `pnpm typecheck`.

**Commit contract:** DP-VQ08 copy/realization, tests, styles, and Task 153 evidence only; `feat(triage): render placement reliability states`.

### Task 154: [x] Render `DP-VQ09` Result Title and direct-limit surfaces

**Files and actions:** after `DP-VQ09`, modify `src/hooks/use-triage-placement.ts` and `.test.tsx`, `src/components/triage/hierarchy-explorer.tsx` and `.test.tsx`, `src/app/globals.css`, `src/lib/copy/inbox-triage.ts` and `.test.ts` to populate approved wording and render staged over-limit Result Title without editing source plus direct Node/Bit availability/reason states, validation, Cancel, focus, reduced motion, and themes. Preserve source/target snapshot; direct `1–100` permits Node/Bit, `101–200` Bit only, `201–1000` neither; never truncate, expose hidden direct editor, or reuse create dialogs. As the explicitly approved `P28-07` minimum owner expansion, also modify `src/components/triage/triage-workspace.tsx` and `.test.tsx` only for authoritative source/candidate projection, no-write invalidation wiring, once-only announcement, and mounted proof of the existing Breakdown grip, staged candidate, or Staging heading safe focus fallback. As the explicitly approved `P28-08` minimum readiness owner expansion, also modify `src/hooks/use-scratch-breakdowns.ts` and `.test.tsx` only to expose and directly test a read-only `isReady` projection derived from the current selected Scratch's existing live-query snapshot: false before the first current snapshot and true after it, including an authoritative empty snapshot. Do not change its query, editor, command, DataStore, persistence, schema, or other Breakdown behavior. No other Workspace behavior or owner is included. Share no dependency with Task 153; the writer mutex serializes common files.

**Dependencies:** Tasks 116, 128, and 152.

**Authority / flows:** `DP-VQ09`, `UF-23`; `NEG-18`, `NEG-21`.

**Recipe:** [`Placement affordances`](recipes/inbox-triage-placement-affordances-visual-recipe.md).

**Observable acceptance:** staged title can be valid/untruncated while original text remains; direct unavailable types expose exact reasons and no write/editor; Cancel/source change clears only this draft and restores focus.

**Verification:** focused placement/Explorer/copy tests for boundary lengths, whitespace, staged/direct difference, preservation, invalidation, focus, reduced motion, and themes, recording `docs/verification/inbox-triage/task-154.md`; `pnpm typecheck`.

**Commit contract:** DP-VQ09 copy/realization, tests, styles, and Task 154 evidence only; `feat(triage): render placement title limits`.

#### Phase 28 Close Notes

- Tasks 149–154 were explicitly accepted on the isolated Phase 28 branch and
  establish Explorer remote/search, release-time DnD targeting, atomic pointer
  placement, reliability, and Result Title/direct-limit behavior.
- The accepted final `src` tree is
  `e0e911a758363df677ed32eeef64910351a58478`.
- The fresh end-phase gate at pre-close `0df3a0f` passed 98 test files / 1124
  tests, lint with 0 errors and 11 unchanged warnings, typecheck, production
  build with seven generated routes, and diff-check.
- The Phase 28 workflow audit closes as a terminal measurement baseline. It
  makes no comparative skill verdict; `WF28-01`–`WF28-11` and all seven
  decision questions transfer to Phase 29's equal-weight audit track.
- Phase 29 uses the unchanged candidate commit `94e89782f7fe2cdbdd035e842ca6881b4a87ce49`,
  starts neither Task 155 nor product work here, and requires a separate Gate C
  plus fresh branch/worktree.

| Task | Implementation / evidence | Acceptance |
| --- | --- | --- |
| 149 | `1830cc3` → `80bd704` | `9b26412` |
| 150 | `32237f4` → `14ade3c` | `b13bcf0` |
| 151 | `c2749b6` → `11a84c7` | `0ab994e` |
| 152 | `7ba9361` → `e25b1eb` | `12fd2a9` |
| 153 | `b73dc25` → `8110c6e` | `29bab4f` |
| 154 | `28ba551` → `643da81` | `0df3a0f` |

**Full issue log:**
[`docs/issues/Issues_Phase_28.md`](issues/Issues_Phase_28.md)

---

## Phase 29 — Mounted-Page Newly Placed And Undo

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

**Recipe:** [`Newly placed and Undo`](recipes/inbox-triage-newly-placed-undo-visual-recipe.md).

**Observable acceptance:** marker is on the real card, independent from selection, and appears only for local mounted-page results; x/y remains unchanged; multiple markers/type pinning survive Scratch/path/theme change; route exit/reload clears; no Zustand/Newly persistence or duplicate card model exists.

**Verification:** focused hook/Workspace/Explorer/NodeCard/BitCard tests; run local/remote Node/Bit, multiple results, selection overlap semantics, pinning, Scratch/path/theme, route exit, and reload, recording `docs/verification/inbox-triage/task-155.md`; `pnpm typecheck`.

**Commit contract:** canonical mounted-page Newly owner, actual-card semantic slots, tests, and Task 155 evidence only; `feat(triage): project newly placed cards`.

### Task 156: [x] Connect ordinary-card source-aware Undo independently of search

**Files and actions:** modify `src/hooks/use-triage-newly-placed.ts` and `.test.tsx`, `src/components/triage/hierarchy-explorer.tsx` and `.test.tsx`, `src/components/grid/node-card.tsx` and `.test.tsx`, and `src/components/grid/bit-card.tsx` and `.test.tsx`; extend `src/hooks/use-triage-operation-lock.test.tsx`. Derive ordinary-card Undo availability/reason from exact current result/source/candidate/dependency truth; keep marker and eligibility separate; stop Undo activation from bubbling into card navigation. Before dispatch, synchronously acquire Task 136's shared `undo` lock; retain actual card/source and the complete matrix through pending/unknown/reconciling, reject duplicate/competing action without queue/replay, and release only on terminal result. Another active owner, result mutation, descendants, open placement, or dirty Edit intent disables Undo; re-enable after terminal release or child-first Undo. Restore staged/direct source/candidate/path and focus. Do not import or depend on Explorer search or `DP-VQ07`.

**Dependencies:** Tasks 124, 136, 137, 139, 152, and 155; deliberately not Tasks 114 or 151.

**Authority / flows:** ordinary-column portion of `UF-25`; `AF-02`, `AF-07`, `AF-09`; `NEG-18`, `NEG-20`.

**Recipe:** [`Newly placed and Undo`](recipes/inbox-triage-newly-placed-undo-visual-recipe.md).

**Observable acceptance:** ordinary cards expose base Undo placement/semantics without Search; selection/navigation never revokes eligibility; Undo acquires once, keeps the full matrix through unknown/reconciliation, and releases only at terminal; blocked intents write/navigate/replay nothing; child-first recovery re-enables; staged restores same candidate provenance, direct does not invent one; success focuses next card → previous → column heading.

**Verification:** focused operation-lock/hook/Explorer/card/departure tests for staged/direct, the complete pending matrix, duplicate/competing acquisition, mutation, descendants, child-first, dirty Edit, pending/unknown/reconcile/terminal release, event propagation, and focus; run ordinary-card flows and record `docs/verification/inbox-triage/task-156.md`; `pnpm typecheck`.

**Commit contract:** ordinary-card Undo model/adapter, tests, and Task 156 evidence only; `feat(triage): connect ordinary card undo`.

### Task 157: [x] Render `DP-VQ10` Newly and Undo states

**Files and actions:** after `DP-VQ10`, modify `src/hooks/use-triage-newly-placed.ts` and `.test.tsx`, `src/components/triage/hierarchy-explorer.tsx` and `.test.tsx`, `src/components/grid/node-card.tsx` and `.test.tsx`, `src/components/grid/bit-card.tsx` and `.test.tsx`, `src/app/globals.css`, `src/lib/copy/inbox-triage.ts` and `.test.ts`. Populate approved wording and render selected+newly overlap, available/ineligible/re-enabled reasons, undoing/failure/reconcile/retry/conflict, marker/control placement, timing, focus, reduced motion, and themes without repeated motion or common-card redesign.

**Dependencies:** Tasks 117, 128, 155, and 156.

**Authority / flows:** `DP-VQ10`, `UF-24`, `UF-25`; `NEG-11`, `NEG-21`; `D-CARD`.

**Recipe:** [`Newly placed and Undo`](recipes/inbox-triage-newly-placed-undo-visual-recipe.md).

**Observable acceptance:** marker, selection, and eligibility are independently perceivable; reasons work by keyboard/touch without hover; all result states are exact; no pulse/flicker or card redesign occurs.

**Verification:** focused hook/Explorer/card/copy state tests; run overlap, every reason/result, child-first re-enable, keyboard/touch, focus, reduced motion, and themes, recording `docs/verification/inbox-triage/task-157.md`; `pnpm typecheck`.

**Commit contract:** DP-VQ10 copy/realization, tests, styles, and Task 157 evidence only; `feat(triage): render newly placed undo states`.

### Task 158: [x] Integrate Undo into Explorer search results only

**Files and actions:** modify `src/components/triage/grid-explorer-search-results.tsx` and `.test.tsx`, `src/components/triage/hierarchy-explorer.tsx` and `.test.tsx`, `src/hooks/use-grid-explorer-search.ts` and `.test.tsx`, and `src/hooks/use-triage-newly-placed.ts` and `.test.tsx`. Reuse Tasks 156–157 Undo model/realization in the `DP-VQ07` body without making search rows DnD sources. Locally placed records enter matching results immediately. Undo from a result retains active query/scroll, removes only the undone result after terminal success, announces source restoration, and focuses the next surviving result at the removed row's position when one exists; otherwise it focuses the search input, with no previous-result fallback. Unknown/failure keeps the result. Do not change ordinary-column Undo dependencies or behavior.

**Dependencies:** Tasks 114, 151, 156, and 157.

**Authority / flows:** search-only portions of `UF-19`, `UF-25`; `AF-02`, `AF-09`; `NEG-10`, `NEG-18`.

**Recipe:** [`Grid Explorer`](recipes/inbox-triage-grid-explorer-visual-recipe.md) and [`Newly placed and Undo`](recipes/inbox-triage-newly-placed-undo-visual-recipe.md).

**Observable acceptance:** result Undo preserves query, removes only the terminally undone result, focuses the next result or otherwise the search input with no previous-result fallback, and never becomes a drag source; ordinary Undo remains usable even if `DP-VQ07`/Task 151 was delayed before this search-only task.

**Verification:** focused results/search/Newly/Explorer tests; run matching/nonmatching local result, pending/failure/unknown/success, list-edge focus, query retention, route exit, and ordinary-column regression, recording `docs/verification/inbox-triage/task-158.md`; `pnpm typecheck`.

**Commit contract:** search-result Undo integration, tests, and Task 158 evidence only; `feat(triage): integrate undo in explorer search`.

---

## Phase 30 — Completion And Archive Recovery

### Bounded browser-evidence handoff

Phase 30 preserves every existing functional and recipe contract while avoiding
a premature campaign-wide fidelity matrix. Task 159 still supplies bounded
running-app evidence for eligibility transition, Cancel/Reopen, withdrawal,
and focus; it does not redesign the existing canonical presentation. Task 160
adds one representative running check for its fixed Context geometry and
blocker placement. Tasks 161–162 may share one final-input browser session for
real `sessionStorage`, reload/reconciliation ordering, and browser
focus/lifecycle invariants that owner tests cannot establish. Any newly
observed mismatch is recorded rather than silently repaired outside the
current task contract. The full eight-theme, light/dark, viewport, motion,
accessibility, and prototype/recipe comparison remains Task 164 work.

### Task 159: [x] Implement durable completion, Cancel, and explicit reopen

**Files and actions:** modify `src/hooks/use-can-archive-scratch.ts` and `.test.ts`, `src/components/triage/breakdown-panel.tsx` and `.test.tsx`, and `src/components/triage/triage-workspace.tsx` and `.test.tsx`. Subscribe to Task 125 eligibility: active Scratch, consumed≥1, unconsumed=0, staged=0; combine but do not persist Task 136 non-empty Add-draft and Task 137 Scratch-title blocker snapshots. Only a mounted-page false→true transition auto-opens the source-backed Breakdown-scoped completion overlay. Cancel closes it, restores Add entry, changes Context to complete, and exposes an explicit Reopen control. Scratch return, same-session re-entry, route entry, or reload onto already eligible truth shows complete Context/Reopen and **never auto-reopens**. Reopen is explicit and restores heading/safe-Cancel focus; new active row/candidate withdraws overlay/complete/reopen. Do not depend on VQ-03/04 realization.

**Dependencies:** Tasks 125, 127, 131, 136, 137, and 145; deliberately not Tasks 138 or 140.

**Authority / flows:** `UF-26`, `UF-27`; `AF-02`, `AF-05`, `AF-08`; `NEG-17`.

**Recipe:** [`Selected Scratch Context`](recipes/inbox-triage-selected-scratch-context-visual-recipe.md), [`Breakdown rows and empty states`](recipes/inbox-triage-breakdown-row-empty-visual-recipe.md), and [`Archive completion`](recipes/inbox-triage-archive-completion-visual-recipe.md).

**Observable acceptance:** never-used/all-deleted/all-staged are ineligible; first false→true opens once; Cancel yields complete/Reopen; every return/re-entry/reload requires explicit Reopen; Context remains visible, other sections/eligible Undo remain reachable, and no draft/editor auto-saves or submits.

**Verification:** focused eligibility/Breakdown/Workspace tests; run every count combination, blocker state, first transition, Cancel/Reopen focus, Scratch switch/return, route re-entry/reload, and eligibility withdrawal/recovery, recording `docs/verification/inbox-triage/task-159.md`; `pnpm typecheck`.

**Commit contract:** completion projection/base overlay, tests, and Task 159 evidence only; `feat(triage): build durable completion flow`.

### Task 160: [x] Render `DP-VQ11` completion blockers and withdrawal

**Files and actions:** after `DP-VQ11`, modify `src/hooks/use-can-archive-scratch.ts` and `.test.ts`, `src/components/triage/breakdown-panel.tsx` and `.test.tsx`, `src/components/triage/triage-workspace.tsx` and `.test.tsx`, `src/app/globals.css`, `src/lib/copy/inbox-triage.ts` and `.test.ts`. Populate approved wording and render non-empty Add-draft and each Scratch-title blocker plus remote eligibility-withdrawal realization, exact actions/focus/effects/reduced-motion/themes, without altering text or falling back to toast/empty state. **Approved C1 compatibility (2026-09-01):** for `open|dirty|saving|reconciling`, replace only the existing Context eyebrow/meta value `Selected Scratch` with static `context-completion-blocker-mark` plus the exact current blocker sentence; preserve the fixed `104px` Context geometry, title field, timestamp, fixed `9.5rem` action region, Save/Cancel, saving/reconciling progress action, and logical focus. For visual `offline|not_applied|conflict`, append the matching exact blocker sentence after the current editor-state sentence inside the existing source-bound issue-overlay status column. Restore `Selected Scratch` without moving focus when the blocker clears. Do not add an ordinary status row, overlay, panel, action, toast, dialog, detached surface, or adjacent fallback. This narrowly supersedes only `DP-VQ11`'s incompatible persistent Scratch-title editor-status placement after accepted Task 138 geometry; every other `DP-VQ11` contract remains unchanged.

**Dependencies:** Tasks 118, 128, 137, and 159.

**Authority / flows:** `DP-VQ11`, `UF-26`, `UF-27`; `NEG-11`, `NEG-17`, `NEG-21`.

**Recipe:** [`Selected Scratch Context`](recipes/inbox-triage-selected-scratch-context-visual-recipe.md), [`Breakdown rows and empty states`](recipes/inbox-triage-breakdown-row-empty-visual-recipe.md), and [`Archive completion`](recipes/inbox-triage-archive-completion-visual-recipe.md).

**Observable acceptance:** blocker actions preserve draft/editor, logical focus, and fixed Task 138 geometry without introducing an ordinary status row or displacing progress/issue actions; loss of eligibility withdraws overlay/complete/reopen with exact reason; recovery follows truth; no blocker auto-saves/submits/persists.

**Verification:** focused hook/Breakdown/Workspace/copy state tests; run both blocker families, every editor state, remote candidate/row change, withdrawal/recovery, focus, reduced motion, and themes, recording `docs/verification/inbox-triage/task-160.md`; `pnpm typecheck`.

**Commit contract:** DP-VQ11 copy/realization, tests, styles, and Task 160 evidence only; `feat(triage): render completion blockers`.

### Task 161: [x] Coordinate guarded Archive, current-tab recovery, and exact handoff

**Files and actions:** modify `src/hooks/use-archive-scratch.ts` and create `src/hooks/use-archive-scratch.test.ts`; modify `src/components/triage/breakdown-panel.tsx` and `.test.tsx`, `src/components/triage/triage-workspace.tsx` and `.test.tsx`, `src/components/triage/scratch-pool.tsx` and `.test.tsx`, `src/stores/triage-store.ts` and `.test.ts`, `src/hooks/use-triage-placement.ts` and `.test.tsx`, and `src/hooks/use-triage-newly-placed.ts` and `.test.tsx`; extend `src/hooks/use-triage-operation-lock.test.tsx`. Immediately before Archive dispatch, synchronously recheck Task 136 Add-draft plus Task 137 title-editor blockers; if clear, acquire the Task 136 shared `archive` lock before any asynchronous gap, create one Task 125 request, and create the schema-validated Task 126 recovery descriptor. The already-wired shared signal reaches Task 137 Edit, Task 139 internal/browser exit, Task 145 Stage/Unstage, Task 152 Placement, Task 156 Undo, Breakdown Cancel/Escape/duplicate Archive, and Pool Scratch switch; retain it through pending/unknown/reconciling until terminal `applied`, `not_applied`, `rejected`, or `conflict`, rejecting every competing intent without queue/replay. Successfully write the descriptor to **current-tab `sessionStorage` before dispatch**; unavailable, denied, quota, serialization, or readback failure must fail closed with no command and release the unstarted lock. Retain descriptor through pending/unknown and until terminal reconciliation; clear only terminal applied/not-applied/rejected/conflict. On reload, read/validate/discard-invalid and reconcile before initial Inbox projection or any new dispatch. On confirmed success preserve Pool query/sort and select next-visible, then previous-visible; whenever either visible Scratch is selected, focus its newly selected Scratch Context. If a filter leaves no visible Scratch, select `null` and focus search input/clear; if no active Scratch and no filter, show true empty and focus primary action. Never choose hidden Scratch or navigate to Archive View.

**Dependencies:** Tasks 126, 127, 130, 136, 137, 139, 145, 152, 156, and 159.

**Authority / flows:** `UF-28`; `AF-04`, `AF-05`, `AF-07`; `NEG-17`, `NEG-20`.

**Recipe:** [`Archive completion`](recipes/inbox-triage-archive-completion-visual-recipe.md).

**Observable acceptance:** blocker race after clicking Archive prevents dispatch; descriptor storage always precedes command and every storage failure invokes zero commands; reload reconciliation precedes normal projection; pending/unknown/reconciling keeps selected Scratch, descriptor, and the complete shared lock matrix; each blocked intent is rejected without mutation or queued replay; terminal applied/not-applied/rejected/conflict clears the lock and descriptor; success selects exact next-visible then previous-visible and focuses the newly selected Scratch Context, otherwise performs the filtered-null/true-empty focus handoff.

**Verification:** focused operation-lock/Archive hook/Breakdown/Workspace/Pool/store/departure/placement/Newly tests for synchronous blocker race, every storage exception/readback failure, write-before-dispatch order, valid/invalid reload, applied/not-applied/**rejected**/conflict/unknown/reconciling, descriptor retention/clear, and every Scratch-switch/internal-route/browser-exit/Edit/Placement/Undo/Archive/Cancel/Escape/duplicate-action edge with no mutation or replay; run all four handoffs, assert Context focus after next/previous-visible selection, Direct Archive/restore regression, and the full forced-reload flow in the canonical route, recording `docs/verification/inbox-triage/task-161.md`; `pnpm typecheck`.

**Commit contract:** Archive coordinator/storage/handoff, tests, and Task 161 evidence only; `feat(triage): coordinate recoverable scratch archive`.

### Task 162: [x] Render `DP-VQ12` Archive reliability and recovery states

**Files and actions:** after `DP-VQ12`, modify `src/hooks/use-archive-scratch.ts` and `.test.ts`, `src/components/triage/breakdown-panel.tsx` and `.test.tsx`, `src/components/triage/triage-workspace.tsx` and `.test.tsx`, `src/app/globals.css`, `src/lib/copy/inbox-triage.ts` and `.test.ts` to populate approved wording and render pending, reconciling, explicit failure, forced-reload recovery, Check again, Retry/Cancel, terminal handoff, current-action focus, timing, reduced-motion, and theme variants inside the Breakdown-scoped flow. The workspace pair may only project the existing mounted Task 161 Archive coordinator state/actions into that card and expose the same card during forced reload while normal Inbox projection remains blocked. Retry is unavailable until authoritative not-applied; unknown retains same descriptor/operation; no global spinner/toast/dialog.

**Dependencies:** Tasks 119, 128, and 161.

**Authority / flows:** `DP-VQ12`, `UF-28`; `AF-05`, `AF-07`; `NEG-11`, `NEG-20`, `NEG-21`.

**Recipe:** [`Archive completion`](recipes/inbox-triage-archive-completion-visual-recipe.md).

**Observable acceptance:** known not-applied, still unknown, rejected/conflict, and success are distinct; current-action focus survives; reload recovery uses exact receipt state; no blind resend or fallback surface occurs.

**Verification:** focused Archive/copy state-table/storage tests; run every result/reload/check-again/Retry/Cancel/focus/reduced-motion/theme variant and record `docs/verification/inbox-triage/task-162.md`; `pnpm typecheck`.

**Commit contract:** DP-VQ12 copy/realization, tests, styles, and Task 162 evidence only; `feat(triage): render archive recovery states`.

---

## Phase 31 — Completed / Archived

Accepted Task 163, technical corrections, and truthful transfer/disposal
dispositions are recorded in [the Phase 31 archive](execution-plan/archive/phase-31.md).
The original task contract remains there as historical accepted authority.
Actual Final Close/publication/main-sync proof is in
[Final_Close_Phase_31.json](issues/Final_Close_Phase_31.json).

Tasks 164–165 remain unaccepted transfer records above. Phase 30 is unchanged.
Phase 31 does not assert eight-theme fidelity or Task 165's aggregate gate.
Post-close workflow audit and the user's held Step 6 boundary remain in force.

---

## Future Theme Realization — Shared Binding Contracts

The following finite landing contracts are part of each numbered task that
explicitly binds them. They are not wildcard component-owner expansion.
Task parameters are the exact theme set, predecessor and task number named in
its definition. One writer owns overlapping CSS/components/tests, including
two-theme phases. Shared JSX is theme-independent; theme/mode values are
centralized role aliases, not eight implementation branches.

### Entry and applicable evidence

Task 166 requires the accepted Task 163, actual Phase 31 Final Close/main sync,
approved C04/C05/C06 and passing flow review, the post-close workflow-audit
disposition, and a fresh phase/task gate. Later theme entry tasks require their
named preceding conformance task accepted and that phase's actual close/main
sync. No experiment branch or stacked historical test output is the real
implementation base; run-phase refreshes the current integration base.

Every region follows the approved design-method contract: independently
match logical data/state and browser inputs; inventory visible source/DOM →
computed style/geometry → production owner; implement and internally refine
fresh original-size 1:1 comparisons before first submission. Check actual
element typography, icon/decoration, spacing, depth, border and cascade, not
only page colors. Preserve a separate behavior contract, approved English
copy and DP-owned production-only states. Live hover/focus/DnD/motion checks
exercise actual transitions and interruption/reduced-motion behavior.
No arbitrary visual score or pixel threshold is imposed by this plan.

Regional first comparison targets light, 1920×1080, DPR 1, zoom 100%.
Note prototype correspondence limits in the ledger checkpoint. Each region
needs explicit user visual disposition before the next region. A coherent
approved Working may perform measurement, implementation and bounded internal
refinement together; no routine contract-only session is inserted. Preserve
the installed lifecycle's acceptance/continuity/repair boundaries. For a
two-theme task, both themes receive distinct visual dispositions.

Once a common frame or region is accepted, later theme tasks extend its shared
semantic owner rather than replace it. Keep earlier accepted themes usable;
change assigned theme aliases, and verify every shared-structure effect. A new
geometry/behavior conflict remains Q02, not permission to rebuild a previously
accepted region. Per-theme variance is centralized styling, not alternate JSX.

Check each region in the running app with test data, never the user's own
data. Show screenshots in the conversation and do not commit them; there is no
per-task evidence report or assets directory. The task's ledger checkpoint
records what was compared, retained differences and why, and the user's first
judgment separately from any later repair or final disposition
([PLANNING_STANDARD §5.3](PLANNING_STANDARD.md#53-visual-checks-and-independent-dispositions)).
No past experiment bytes are reused. Tasks 166–170 ran under the previous
workflow; the receipts and verification records their supplements below cite
are kept in local tag `archive/phase-34-codex`, not on main.

Every binding below also creates or extends
`src/components/triage/inbox-triage-theme-realization.test.tsx` with relevant
semantic/state-preservation assertions (create in 166, extend thereafter).
It is not a CSS-string-only proxy for browser fidelity. Existing hook/store/
repository/copy/schema owners are read-only preservation inputs; execute their
relevant tests but do not alter behavior, packages or data boundaries here.
A necessary additional owner or new product/design choice stops only that
affected write at its owning gate. Q02 blocks a conflicting element/state,
not unrelated measurement or supported work; advancing the region still needs
a disposition that truthfully covers any owned remainder.

Use the `CLAUDE.md` gates with the direct test targets below: focused
checks (direct tests, typecheck) while working and the full gate before the
checkpoint. Keep direct DOM/state checks separate from fresh mounted-route
pixel/geometry/pointer/keyboard/focus checks. Per-region checks include
regression of its previously accepted neighboring regions and any other themes/modes affected by shared JSX.
L7 closes supported current-theme dark/desktop/accessibility/motion work;
Task 208 owns the retained full 16-combination campaign matrix. Neither user
visual acceptance nor a technical pass substitutes for the other.

### L1 — Common frame and Scratch Pool

**Files and actions:** modify `src/app/globals.css` for shared role bindings
and the assigned theme(s)' frame/Pool aliases; modify
`src/components/triage/scratch-pool.tsx` and `scratch-pool.test.tsx` for
sourced semantic structure and preserved Pool actions; modify
`src/components/triage/triage-workspace.tsx` and `triage-workspace.test.tsx`
only for the common mounting/frame and existing external-removal presentation.
Include the shared conformance test above.

**Authority / flows:** D11–D22/D25; UF-01–05, UF-28 handoff, UF-29;
AF-03/05/10; all applicable NEG. Preserve DP-VQ01 and DP-VQ06-POOL.

**Recipe:** [Shell/chrome](recipes/inbox-triage-shell-section-chrome-visual-recipe.md)
and [Scratch Pool](recipes/inbox-triage-scratch-pool-visual-recipe.md).

**Shared creation-date contract:** Every current and subsequent L1 theme/phase binding must follow [SPEC — Scratch Pool and Context creation-date metadata](SPEC.md#scratch-pool-and-context-creation-date-metadata), shared with L2. Scratch Pool's recipe references that single product contract; theme realization must preserve its common formatter and date body. This requirement is not limited to Task167/P34-09 and does not grant a later task/phase execution gate or reopen accepted Task166.

**Observable acceptance:** fixed approved common geometry; sourced header,
tools, counts, search/clear, sort, expanded selected/unselected rows, collapsed
switchers, empty/no-match/status and focus/hover appearance. Selection, hidden
selection, sorting, first-printable/manual reopen, scrolling, remote/removal
status and selected Scratch→Breakdown/recovery linkage retain canonical truth.
Do not visually revise Breakdown/Staging/Explorer internals in this slice.

**Verification:** direct Pool/Workspace/shared-conformance tests; fresh mounted
expanded/collapsed/query/sort/selection/empty/status/focus/hover checks,
external-removal focus/recovery and handoff preservation; applicable gates.

**Task 166-only approved supplement (2026-10-04):** extend this L1 common
frame with R-SHELL's decorative desktop menu and DESIGN_TOKENS desktop-menu
roles for retro-mac only. Scope receipt:
`docs/issues/Issues_Phase_34.Task_166.task-scope-desktop-menu.json`.
Use the same Workspace DOM and central aliases: one 32px bar, 16px lower gap,
fixed labels/12:00 PM, no interactions or clock behavior. The menu spans Pool,
Breakdown and Staging; remaining body retains all selected ratios and Pool
state/focus/scroll/navigation/DP recovery. Verify original-size matched light
1920x1080, bounded 1024x768/dark layout/clipping, seven other themes and ordinary
Grid/Archive leakage, real Pool/recovery behavior and the logical gates above.
Write owners are only existing common Workspace/CSS/direct/shared test owners,
Task166 evidence/ledger/new receipt and the three approved canonical clauses.
The separately approved one extra cycle is not a budget reset. Preserve prior
checkpoint visual approval; submit menu/layout impact for separate disposition.
Task166 remains [ ] and Q02 remains Tagged. No later task/theme inherits this
supplement; no completed receipt or neighboring body is revised.

### L2 — Selected Scratch Context and Breakdown

**Files and actions:** modify `src/app/globals.css` for assigned Context/
Breakdown roles; modify `src/components/triage/breakdown-panel.tsx` and
`breakdown-panel.test.tsx` for shared presentation; modify
`src/components/triage/triage-workspace.tsx` and `triage-workspace.test.tsx`
only for Breakdown mounting and source-attached overlays/status. Include
the shared conformance test.

**Authority / flows:** D11–D22/D25/D26; UF-06–12, UF-14–15 source linkage,
UF-26 blockers, UF-29; AF-05/09/10. Retain DP-VQ02/03/04/05/11 exactly.

**Recipe:** [Context](recipes/inbox-triage-selected-scratch-context-visual-recipe.md)
and [Breakdown](recipes/inbox-triage-breakdown-row-empty-visual-recipe.md).

**Shared creation-date contract:** Every current and subsequent L2 theme/phase binding must follow [SPEC — Scratch Pool and Context creation-date metadata](SPEC.md#scratch-pool-and-context-creation-date-metadata), shared with L1, in Context view and Scratch-title editor. Theme-only prefix presentation follows the Context recipe's central copy/role contract and never replaces the shared date body. This requirement is not limited to Task167/P34-09 and does not grant a later task/phase execution gate or task acceptance.

**Observable acceptance:** sourced plate/title/time/action hierarchy,
sort, active/staged rows/grips/Edit/Trash, Add and ordinary empty/completion
distinction. Preserve Edit→Save/Cancel, draft/caret/focus, departure decision,
Add/Delete/Unstage status, reliability, canonical state and downstream DnD.
Context height/action reserve or copy conflicts require Q02; no clipped action,
status or focus. Accepted Pool/common frame remains intact.

**Verification:** direct Breakdown/Workspace/conformance tests; real
view/edit/save/cancel/validation/dirty/pending/error/locked/recovery,
Add/Delete/staged/empty and focus/hover/drag-source checks; applicable gates.

**Task 167-only P34-04 Context-geometry supplement:** the matching
task-scope-context-geometry receipt (`Issues_Phase_34.Task_167.task-scope-context-geometry.json`)
authorizes the retro-mac Selected Scratch Context alone to use fixed 120.25px
outer border-box height in every mounted view/editor/overlay/blocker state and
both modes. Other themes retain 104px; all 9.5rem action reserves, 48px Breakdown
row slots, shared semantic tree, retained DP behavior/copy/focus and Task160 C1
placement remain unchanged. Extend only L2's already-owned implementation/tests
and current Task167 evidence. Reverify state-stable height, caret/actions/status/
overlays and theme switching, accepted Task166 frame/Pool and neighboring layout/
scroll/drag linkage. This exception neither grants an adjacent-surface redesign
nor accepts Task167 or releases Task168.

**Task 167-only P34-07 Context-copy supplement:** the matching
task-scope-context-copy receipt (`Issues_Phase_34.Task_167.task-scope-context-copy.json`)
authorizes exactly one additional cycle for retro-mac's non-semantic
`[ FOLDER DIALOG: INFO ]` / `[X]` strip and next-order sort labels
(DESC→OLD FIRST, ASC→NEW FIRST), as defined by the amended Context recipe.
Add only central copy/direct copy test owners `src/lib/copy/inbox-triage.ts`
and `.test.ts`, the exact Context recipe/DESIGN_TOKENS/this plan supplements,
and the new receipt to the existing Task167 write set. Centralized text/shared
DOM/CSS selection preserves other7 themes' ASC/DESC and accessible names,
all sort commands/locks/lifetimes, DP/C1 and approved120.25/104/152/48 geometry.
No further cycle, unrelated owner, remaining visual-finding repair or acceptance.

**Task 167 / P34-09 bounded execution supplement:** the matching
task-scope-created-at receipt (`Issues_Phase_34.Task_167.task-scope-created-at.json`)
binds exactly one additional repair cycle to implement the shared SPEC date
contract and Context recipe presentation now. Add only existing formatter/direct
test owners `src/lib/utils/relative-time.ts` and `src/lib/utils/relative-time.test.ts`,
and Pool regression owner `src/components/triage/scratch-pool.test.tsx`. Pool
already consumes this formatter and needs no production-source write. Reuse
existing Context/CSS, central copy/direct copy test and shared conformance
owners solely for this date delta; Workspace and producer/hook/store/schema
owners receive no new write. Reflect only the exact SPEC, Scratch Pool recipe,
Selected Scratch Context recipe and this plan amendments before affected product
writes. Run the declared direct/focused/full gates and fresh mounted date/fit/
theme-switch, accepted166 Pool/frame and adjacent regressions within the exact
receipt evidence packet. Preserve prior cycles/receipts/evidence and DP/C1,
120.25px/104px Context, 9.5rem reserve and 48px rows. Stop after this single cycle
at Implemented / awaiting review, Task167 [ ]. No extra cycle, visual/task
acceptance, Task168+, publication or topology/history change. This task-scoped
execution grant does not limit the shared SPEC/L1/L2 product contract to Task167.

**Retained common L2 scroll direction:** user disposition preserves Context
and rows in their existing common scroll viewport. Future L2 theme bindings
retain this co-scroll structure when separately activated; no sticky/standalone
Context viewport is required. This clause does not activate later tasks.

### L3 — Staging

**Files and actions:** modify `src/app/globals.css` for assigned Staging
roles; modify `src/components/triage/staging-zone.tsx` and
`staging-zone.test.tsx`, `src/components/triage/triage-drag-token.tsx`
and `triage-drag-token.test.tsx` for semantic presentation; modify
`src/components/triage/triage-workspace.tsx` and `triage-workspace.test.tsx`
only for Staging mounting/status connections. Include the shared conformance test.

**Authority / flows:** D11–D22/D25; UF-13–16/29; AF-05/08/09/10.
Retain DP-VQ02 and DP-VQ06-STAGING; Q05 diagnosis/disposition precedes a
conformance claim about mounted target-reason delivery.

**Recipe:** [Staging](recipes/inbox-triage-staging-visual-recipe.md).

**Observable acceptance:** sourced Node/Bit headers, independent wells,
cards/rows, tools/counts and quiet empties under approved 35/65 geometry.
Preserve full source drag and compact pointer-centered preview, durable
candidate truth, transient Unstage, order/focus and arrival/integrity/reliability
states. Neutral/invalid/unavailable/pending and compatible active-hover Remove
remain distinct. No permanent Unstage, label snapshot or invented success.

**Verification:** direct Staging/drag-token/Workspace/conformance tests;
fresh actual mounted stage/unstage, both types, eligible/invalid/unavailable/
pending/remote/integrity states and actual pointer/focus delivery, not only
mocked props; preserved Pool/Breakdown and applicable gates.

**Task 168 P34-15 drag-visual-feedback supplement:** only the matching `docs/issues/Issues_Phase_34.Task_168.task-scope-drag-visual-feedback.json` receipt approves the exact DESIGN_TOKENS and Staging-recipe presentation deltas, bounded existing Staging/Workspace/Breakdown Return/CSS/test owners and exactly one additional cycle. Reflect exactly three canonical documents/five deltas before affected product writes. Retro Mac Remove uses a static opaque framed Trash overlay and monochrome compatible-hover inversion; actual Node/Bit hover alone receives the adopted pattern; compatible Breakdown Return retains alpha0.90 with destructive tint12%, border and text; desktop gaps retain the existing pattern. Preserve all geometry, semantic states, count A, copy, focus, operations, DP contracts and other-theme presentation. No hook/store/repository/root/provider/common-card or later-region write is granted. Initial3/3 plus three approved extra cycles remain consumed; session rollover never resets the budget. Require direct semantic-owner tests and fresh mounted pointer/computed-style/generated/delivery evidence, then stop at separate user visual/issue/task disposition with Task168 `[ ]`.

**Task 168 count-contract supplement:** the matching `docs/issues/Issues_Phase_34.Task_168.task-scope.json` receipt separately approves the visible-Stage-projection count disposition and its exact SPEC, Staging recipe, DESIGN_TOKENS and this L3 amendments before affected product writes. The shared Workspace consumes existing `useStagedCandidates.counts.visibleNodes/visibleBits` for subsection headings under SPEC's pending/unknown/reconciling, candidate-ID deduplication, Unstage, integrity-exclusion and terminal-to-live-query rules; no hook/store/repository/copy/schema/package write is granted. Count semantics apply to the shared tree across themes; retro-mac remains the only visual-realization assignment. Preserve operation copy, locks, reconciliation, remote-arrival indicators, focus, DP-VQ02, P27-08 deferral and Q05 Closed disposition. Require direct and fresh mounted Node/Bit count-transition evidence and affected-theme regressions. Existing DP receipts and accepted task records remain immutable; this supplement neither reopens their historical release actions nor grants task acceptance or later-task authority.

### L4 — Explorer/Finder and replacement search

**Files and actions:** modify `src/app/globals.css` for assigned Explorer
roles; modify `src/components/triage/hierarchy-explorer.tsx` and
`hierarchy-explorer.test.tsx`,
`src/components/triage/grid-explorer-search-results.tsx` and
`grid-explorer-search-results.test.tsx` for shared base/search presentation.
Include the shared conformance test. Conditional candidate owners
are `src/components/grid/node-card.tsx`, `node-card.test.tsx`,
`bit-card.tsx`, `bit-card.test.tsx`: before any internal-card write, Q01
must approve the exact Inbox-only element/path/consumer boundary. Their listing
is not blanket common-card redesign authority. Any new asset owner needs its
own gate before writing.

**Authority / flows:** D11–D28; UF-17–19/22/24–25/29; AF-05/09/10.
Retain DP-VQ06-EXPLORER/07/10; no prototype active-column filter substitution.

**Recipe:** [Explorer](recipes/inbox-triage-grid-explorer-visual-recipe.md);
[Newly/Undo](recipes/inbox-triage-newly-placed-undo-visual-recipe.md) for
search-result composition only.

**Observable acceptance:** sourced base chrome, full Home/Level 1/2/3 labels,
populated hierarchy/card grammar and target/status states. Separately realize
the approved whole-hierarchy replacement search, including loading/empty/
stale/error/duplicates/reveal/close and search-result Undo. Record native versus
derived comparison fixture limits. P29-01/D-CARD is not silently resolved by
CSS, a wrapper or a new owner; exact approved remainder stays deferred.

**Verification:** direct Explorer/search-results/conformance tests and
conditional card tests; actual mounted navigation/scroll anchoring/search/
reveal/focus/drag interruption/status and eligible/full/invalid targets;
ordinary Grid/card consumers and previously accepted regions; applicable gates.

**Task 169 user-selected review amendment, 2026-10-07:** every current/future
L4 theme task consumes SPEC's shared Explorer consumer contract, the
DESIGN_TOKENS review amendment and the updated Explorer/chrome recipes:
one header with right-hand whole-hierarchy search control; no persistent path
breadcrumb; actual stored Node/Bit icons; no Finder options/Direct Archive or
Done?/Mark as done/Dismiss controls; color-only hover and non-draggable cursors;
readable distinct overdue-incomplete/completed Bit states. Keep internal path,
full labels, status, navigation, scrolling, reveal, placement targets and
independent NEW/Undo/reason/focus. Ordinary Grid behavior and broader D-CARD
deferral remain intact. Theme-specific values stay centralized; no other
theme/phase task starts from this common-contract reflection.

The header's conditional consumer owners are
`src/components/triage/triage-workspace.tsx` and
`triage-workspace.test.tsx`; necessary centralized status/accessibility copy
uses `src/lib/copy/inbox-triage.ts` and `inbox-triage.test.ts`.
List exact per-file actions in the matching supplemental whole-file scope
before writes; this owner listing alone grants no implementation authority.
Actual-card internals retain the exact Q01 consumer/test gate. Reflect the
canonical delta before affected product changes and verify changed header
input/close/Undo focus and drop-target behavior through direct owner tests and
fresh mounted evidence proportionate to the change. Preserve historical
Retry failures/BODY observations and unverified Undo recovery as such.
Task 169's five consumed cycles do not reset; any Cycle6 requires its own
exact one-extra-cycle approval. Acceptance and Task170 remain separate gates.

**Task 169 Node/Bit distinction amendment, 2026-10-08:** current/future L4
tasks consume SPEC's common removal of the ordinary-list inter-type divider,
visible `Bits` heading and reserved Bit-only/Level 3 subsection-header space.
Retain Node-before-Bit and within-type order, actual shared cards and existing
DP/state/focus contracts. Retro-mac alone realizes the user-selected folder-tab
Node/light surface/double outline/larger plain row and stored glyph, versus
rectangular Bit/gray surface/thin single outline/smaller plain row; metadata
and independent NEW/Undo/reason retain natural expansion. Bind the selected
generated-image identity and exact Q01 element/consumer boundary through the
matching scope receipt. The candidate product/test owners are only
`src/app/globals.css`, `src/components/triage/hierarchy-explorer.tsx`,
`src/components/triage/hierarchy-explorer.test.tsx` and
`src/components/triage/inbox-triage-theme-realization.test.tsx`.
Actual NodeCard/BitCard TSX/tests remain preservation inputs unless a separate
exact expansion is approved. Reflect the exact approved Tower-authored
canonical delta through the same Working's approved adoption commit before
affected product writes. Require direct semantic tests and fresh mounted
appearance/interaction evidence proportionate to changed geometry; do not
reuse Cycle6 results as proof or add a numerical fidelity/campaign gate.
Six cycles remain consumed; only an exact approved single Cycle7 may execute,
without reset or Cycle8 authority. Task169 remains `[ ]`, the same Working
stays active awaiting disposition at checkpoint, and Task170 remains held.

### L5 — Placement, then Newly/Undo

**Files and actions:** modify `src/app/globals.css` for assigned Placement/
Newly roles; modify `src/components/triage/triage-workspace.tsx` and
`triage-workspace.test.tsx`,
`src/components/triage/hierarchy-explorer.tsx` and
`hierarchy-explorer.test.tsx`,
`src/components/triage/grid-explorer-search-results.tsx` and
`grid-explorer-search-results.test.tsx` only for their shared forms/attached
marker/status/action presentation. Include the shared conformance test.
Actual Node/Bit internal changes use the same conditional Q01 owners and
direct tests as L4; no implicit owner enlargement.

**Authority / flows:** D11–D28; UF-19–25/29; AF-05/09/10.
Retain DP-VQ08/09/10, atomic placement and source-aware Undo.

**Recipe:** [Placement](recipes/inbox-triage-placement-affordances-visual-recipe.md)
and [Newly/Undo](recipes/inbox-triage-newly-placed-undo-visual-recipe.md).

**Observable acceptance:** source-backed target-column Direct/Staged forms,
path/title/type-limit/Confirm/Cancel and attached reliability; then actual
Node/Bit card provenance marker and independent Undo/state presentation.
Ordinary Finder follows the bounded amendment below; search retains the
approved always-visible reason rail. Get Placement visual disposition before
Newly/Undo, and both before Archive. Occlusion/geometry differences from the
prototype require Q02, not cosmetic discretion. Preserve real transactions,
result/source truth, dependency reasons, recovery and logical focus.

**Verification:** direct Workspace/Explorer/search/conformance/conditional
card tests plus existing placement/Newly hook tests as read-only consumers;
real valid/invalid/full placement, confirm/cancel/title/limits, Newly, eligible/
ineligible/dependency-clear/pending/reconcile/failed Undo, focus and search
composition; previously accepted regions and applicable gates.

**Ordinary Finder amendment, 2026-10-08:** current/future L5 ordinary
NodeCard/BitCard consumers use the amended Newly/Undo recipe and central
DESIGN_TOKENS contract: centered NEW/content, visually internal independent
Undo2 action, and above-action hover/keyboard-focus tooltip only for ordinary
available and nonterminal result-mutated eligibility. All other reasons and
operation/recovery states retain visible presentation; a terminal
rejected/conflict cannot be hidden through matching-copy classification.
Preserve accessibility, disabled mutation suppression, exact copy, shared
semantic tree, producer/operation/ref/focus/lifetime ownership and static
normal/reduced-motion presentation. Ordinary Grid and replacement-search
presentation stay outside this exception. Retro-mac geometry remains theme
specific; common D-CARD/P29-01/Korean QA deferrals remain unchanged.
Task170's exact receipt binds the narrow Q01 card/test owners and frozen Tower
canonical adoption before writes. Placement implementation/visual checkpoint
comes first; the same approved scope may continue to Newly/Undo only after
explicit user Placement visual disposition is durably recorded. This does not
accept Task170, activate Task171 or reopen accepted Task169.

**Placement review amendment, 2026-10-08:** interpret L5's visible path/direct
heading requirements through the bounded Placement recipe/DESIGN_TOKENS
exception. Direct/Staged steps omit visible breadcrumbs while retaining
destination/path authority and invalidation. Direct choice removes visible
`Choose a result type`, transfers entry focus to existing `DIRECT PLACEMENT`,
and places Node/Bit/Cancel in one equal-width horizontal row with exact visible
unavailable reasons retained below it. Staged confirmation keeps source/result
title and Node/Bit type; compress retro-mac padding/gaps and theme-role rail
spacing without deleting pre-Confirm reliability/action reservation or clipping
copy/controls. Verify changed native focus/Tab/action visibility and internal
scroll, including 1024px. Common semantics carry to later L5 consumers; no
other-theme geometry or activation is implied. Preserve original DP-VQ08/09
receipts, prior Placement evidence and the remaining shared budget.

**Placement action-layout amendment, Cycle4, 2026-10-08:** the later user
direction supersedes the preceding horizontal Direct action arrangement.
Stack full-width Node, Bit and visually distinct secondary Cancel vertically.
For Staged confirmation, group the existing heading/item title/Node-or-Bit
information on the left and vertically center horizontal Confirm/Cancel
controls on its right. Keep the reserved reliability area below that pair,
with the same right-hand state-action slot, full recovery copy, refs, locks,
logical focus, operations and lifetimes. This is a limited staged spatial
exception to DP-VQ08, not a deletion of its reservation or state authority.
Keep path omission, direct heading focus, source/title/limits, shared semantic
order, column geometry/scroll and static behavior. Staged Result Title and
direct confirmation arrangements remain outside this refinement. Fresh
Light/Dark, 1024px native Tab/scroll and reached-state evidence must demonstrate
the changed composition without silently substituting a lower action footer.
Common composition is distinct from retro-mac visual values; later theme
tasks and Newly/Undo remain held. Bind exact owners and Tower draft adoption
through the matching supplemental scope; earlier evidence remains historical.

**Placement chrome/focus amendment, Cycle5, 2026-10-08:** consume the later
user-selected screenshot edits for Direct selection and Staged confirmation.
Direct entry focuses the available Node, otherwise available Bit, otherwise
Cancel, without implicit selection/advance; retro-mac focused/hovered types
invert, and Direct Cancel becomes borderless text with hover underline. Both
selected surfaces use a native heading/close header, realized as a black strip
in retro-mac. The accessible Cancel placement × shares the existing Cancel
guard, including pending/unknown/reconciling locks. Emphasize actual titles and
outline Staged Node/Bit tags. Only Staged confirmation/pending uses Cancel then
OK; the actual Confirm ref/command and all recovery action/focus contracts
remain. Retain the right-hand action group, lower full-width reservation,
natural height/scroll and readable 1024px content without footer fallback or
neighbor geometry changes. Add only the two central placementPresentation
labels described by DESIGN_TOKENS; keep all other copy/steps/consumers intact.
Fresh semantic and native focus/hover/close/state/scroll evidence is required;
generated images and prototype source observations are design inputs rather
than mounted verification. No numerical gate or later-theme activation follows.

**Selected Placement frame/layout direction, 2026-10-09:** the later approved
Direct/final-Staged previews remove automatic Direct button focus; restore
entry focus to the existing DIRECT PLACEMENT heading while preserving native
keyboard/hover feedback, disabled reasons and explicit selection. Flush the
retro-mac black header to its top/left/right inner frame edges, with separate
visible bracket pairs around the unchanged heading and decorative close glyph.
Preserve central accessible names and existing Cancel guards/return focus.
Match Direct's frame to Staged and centralize title/body spacing, with a slightly
larger Direct title and more title vertical padding. Staged uses title-left /
right horizontal actions in one aligned row, then a separate lower Node/Bit
tag row; confirmation/pending remains Cancel then OK with the original refs.
Add real internal button padding and reduce surplus height without deleting
the lower pre-Confirm reliability reservation, complete recovery, natural
growth or target-column scroll. Other steps, copy, card/search/Newly/Undo,
neighbor geometry and producer authority remain unchanged. Pin the selected
images and exact Tower bytes in the new scope. Design and exactly one additional
Cycle6 are approved; preserve five consumed cycles and bind the new single
cycle to the exact supplemental execution scope without reset.

### L6 — Completion and Archive

**Files and actions:** modify `src/app/globals.css` for assigned completion/
Archive roles; modify `src/components/triage/breakdown-panel.tsx` and
`breakdown-panel.test.tsx`,
`src/components/triage/triage-workspace.tsx` and
`triage-workspace.test.tsx` only for the existing completion/recovery
presentation. Include the shared conformance test.

**Authority / flows:** D11–D28; UF-02/12/26–29; AF-04/05/09/10.
Retain DP-VQ11/12 and the accepted completion/Archive coordinator.

**Recipe:** [Archive/completion](recipes/inbox-triage-archive-completion-visual-recipe.md)
with [Context](recipes/inbox-triage-selected-scratch-context-visual-recipe.md)
and [Breakdown](recipes/inbox-triage-breakdown-row-empty-visual-recipe.md)
for their complete/blocker variants.

**Observable acceptance:** Breakdown-scoped overlay/card, complete Context,
Cancel/Reopen and source-attached blockers/withdrawal; one stable Archive
reliability/current-action slot and forced-reload recovery. No whole-page
modal, ornamental success, optimistic removal, retry under uncertainty or
different handoff algorithm. Already accepted ordinary editors/regions remain
usable; unsupported prototype states are disclosed.

**Verification:** direct Breakdown/Workspace/conformance tests and existing
Archive/completion/recovery tests; fresh blocked/eligible/withdrawn/Cancel/
Reopen/pending/unknown/reconciling/not-applied/conflict/storage-failure/reload
and next/previous/filtered-null/true-empty handoff with real focus; applicable
gates and unrelated Archive View/Trash preservation.

### L7 — Supported-theme completion and regression

**Files and actions:** modify `src/app/globals.css` only for the assigned
theme(s)' missing supported-dark aliases and in-scope CSS accessibility/motion
conformance; extend the shared realization test and
`src/app/theme-transition.test.ts`.
No component/hook/data repair is hidden here; a structural/behavior regression
returns to its named regional owner under an exact approved repair scope.

**Authority / flows:** D07/D19/D21–D27; UF-01–29 preservation, especially
UF-29; AF-03/10; all NEG. All nine recipe targets and exact existing DP roles
are checked, not automatically promoted.

**Recipe:** all nine entries in the Recipe Surface Inventory.

**Observable acceptance:** each assigned theme is usable and materially
source/DP-correct in light/dark at supported 1024px and 1920×1080 desktop
viewports; landmarks, visible/accessible labels, focus-visible, non-color
state, contrast, hidden scrolling, touch targets, motion/reduced motion,
status/overlay and retained state pass. No theme/mode action saves/cancels/
navigates/refetches or loses workflow state. Distinguish direct prototype
coverage from approved production-only realization. User visual disposition
is separate from these gates; a light-only pass is not full theme completion.

**Verification:** shared conformance/theme-transition tests and all affected
regional direct tests; current assigned theme(s) × light/dark × both viewports,
every recipe and representative reliability/editor/recovery state; previously
completed themes and unrelated surfaces receive scope-appropriate regression
checks. Preserve earlier theme assertions. Execute full logical gates. Task
208 still owns all eight themes' complete combined matrix.

## Phase 34 — Retro Mac Regional Realization

Theme set: `retro-mac`. In progress on branch `phase-34/retro-mac-regions`.
Tasks 166–170 were accepted under the previous workflow; their receipts,
verification records and assets are kept in local tag `archive/phase-34-codex`,
not on main.

Visual reference: prototype route `/prototype/inbox-triage-retro-mac` in the read-only worktree `/Users/jwk/Documents/griddo2-claude-themes2-3` (commit `4f39709`). View it only; never copy its source or assets.

Flow review: [Inbox/Triage theme realization](reviews/2026-10-03-inbox-triage-theme-realization-flow-review.md) covers Phases 34–40.

### Task 166: [x] Fix the common frame and realize Scratch Pool

**Files and actions:** bind L1's exact per-file actions to `retro-mac` only; its verification record and assets are kept in tag `archive/phase-34-codex`. Conditional owner/decision gates remain in force.

**Dependencies:** Task 163 and every explicit Phase 34 entry condition above. The matching L1 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L1; UF-01–05/28–29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L1; no adjacent or experimental fallback.

**Observable acceptance:** Every L1 element/state and behavior-preservation criterion, fresh matched first-submission/internal-refinement evidence and separate user visual disposition for each assigned theme. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L1, plus its focused/full logical gates and regression boundaries.

**Commit contract:** only L1's owned implementation/tests and this task's fresh evidence, approved receipt/ledger state; no acceptance marker before user acceptance. Message: `feat(triage): realize retro-mac frame-pool`. No experimental bytes, broad staging or rewrite.

### Task 167: [x] Realize Selected Scratch Context and Breakdown

**Files and actions:** bind L2's exact per-file actions to `retro-mac` only; its verification record and assets are kept in tag `archive/phase-34-codex`. Conditional owner/decision gates remain in force. The approved P34-04 Context-geometry supplement (`Issues_Phase_34.Task_167.task-scope-context-geometry.json`) is the sole exception to L2's retained fixed Context height. The P34-09 bounded execution supplement (`Issues_Phase_34.Task_167.task-scope-created-at.json`) connects this task to the exact added implementation/test owners and one additional cycle for the shared SPEC/L1/L2 date contract; it does not limit that product contract to this task or activate later tasks.

**Dependencies:** Task 166 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L2 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L2; UF-06–12/14–15/26/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L2; no adjacent or experimental fallback.

**Observable acceptance:** Every L2 element/state and behavior-preservation criterion, fresh matched first-submission/internal-refinement evidence and separate user visual disposition for each assigned theme. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L2, plus its focused/full logical gates and regression boundaries.

**Commit contract:** only L2's owned implementation/tests and this task's fresh evidence, approved receipt/ledger state; no acceptance marker before user acceptance. Message: `feat(triage): realize retro-mac context-breakdown`. No experimental bytes, broad staging or rewrite.

### Task 168: [x] Realize Staging and drag presentation

**Files and actions:** bind L3's exact per-file actions to `retro-mac` only; its verification record and assets are kept in tag `archive/phase-34-codex`. Conditional owner/decision gates remain in force.

**Dependencies:** Task 167 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L3 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L3; UF-13–16/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L3; no adjacent or experimental fallback.

**Observable acceptance:** Every L3 element/state and behavior-preservation criterion, fresh matched first-submission/internal-refinement evidence and separate user visual disposition for each assigned theme. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L3, plus its focused/full logical gates and regression boundaries.

**Commit contract:** only L3's owned implementation/tests and this task's fresh evidence, approved receipt/ledger state; no acceptance marker before user acceptance. Message: `feat(triage): realize retro-mac staging`. No experimental bytes, broad staging or rewrite.

### Task 169: [x] Realize Explorer base and replacement search

**Files and actions:** bind L4's exact per-file actions to `retro-mac` only; its verification record and assets are kept in tag `archive/phase-34-codex`. Conditional owner/decision gates remain in force.

**User review direction, 2026-10-07:** consume L4's shared Explorer amendment
in this task's exact supplemental scope. The user's explicit canonical-write
instruction makes Tower03 the writer of this bounded canonical reflection;
the same Working01 retains product/test, receipt/ledger and commit ownership.
Record and adopt the exact Tower-owned canonical diff without a second
canonical writer. The reflection does not execute Cycle6, accept Task169,
close issues or advance Task170.

**Node/Bit review direction, 2026-10-08:** the selected generated-image
design supersedes only retro-mac ordinary-card exterior targets and the shared
inter-type group chrome described by L4's new amendment. Tower03 remains the
bounded canonical-draft writer; Working01 retains receipt/ledger, product/test
and commit ownership. One exact supplemental scope must pin the actual
canonical diff and its adoption, four product/test owner actions, narrow Q01
styling boundary and one Cycle7 before execution. Do not substitute a second
canonical writer, infer task acceptance/issue closure or start Task170.

**Dependencies:** Task 168 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L4 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L4; UF-17–19/22/24–25/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L4; no adjacent or experimental fallback.

**Observable acceptance:** Every L4 element/state and behavior-preservation criterion, fresh matched first-submission/internal-refinement evidence and separate user visual disposition for each assigned theme. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L4, plus its focused/full logical gates and regression boundaries.

**Commit contract:** only L4's owned implementation/tests and this task's fresh evidence, approved receipt/ledger state; no acceptance marker before user acceptance. Message: `feat(triage): realize retro-mac explorer-search`. No experimental bytes, broad staging or rewrite.

### Task 170: [x] Realize Placement followed by Newly/Undo

**Files and actions:** bind L5's exact per-file actions to `retro-mac` only; its verification record and assets are kept in tag `archive/phase-34-codex`. Conditional owner/decision gates remain in force.

**User-selected Newly/Undo direction, 2026-10-08:** Task169 stays Accepted
and its Working stays closed/archive-only. Tower03 writes only the bounded
DESIGN_TOKENS/EXECUTION_PLAN/Newly-Undo recipe draft; Working170/01 remains
receipt/ledger, implementation/test, evidence and commit owner. The matching
whole-file Task170 approval must pin the actual three-file canonical bytes
and their adoption before product writes, without a second canonical writer.
The minimal candidate product/test owners are `src/app/globals.css`,
`src/components/triage/hierarchy-explorer.tsx` and its direct test,
`src/components/grid/node-card.tsx` and its direct test,
`src/components/grid/bit-card.tsx` and its direct test,
`src/components/triage/triage-workspace.test.tsx`, and
`src/components/triage/inbox-triage-theme-realization.test.tsx` (nine paths).
Actual card source/tests are the conditional Q01 extension for only ordinary
Finder composition/actions. Workspace implementation, replacement-search
implementation/direct test and shared tooltip primitive are preservation
inputs; a demonstrated additional write needs an exact owner expansion first.
Execute Placement to its user visual checkpoint before any Newly/Undo change.
Both stages share the separately approved Task170 cycle budget without reset;
Task169's seven consumed cycles and every failure/unverified/deferred record
remain historical. Task170 stays `[ ]` pending separate user acceptance.

**Dependencies:** Task 169 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L5 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Placement checkpoint revision, 2026-10-08:** the user's requested heading/
breadcrumb removal, equal-width direct actions and compact staged confirmation
are targeted Placement feedback, not Placement visual approval. Tower03 authors
only the bounded DESIGN_TOKENS/EXECUTION_PLAN/Placement recipe draft; the same
Working170/01 adopts exact separately pinned bytes and owns receipt/ledger,
product/test/evidence writes and commits. Existing Placement owners remain the
candidate write set; discovery grants no expansion. Two of three shared cycles
are already consumed. Use only the remaining approved cycle for the targeted
repair, re-present Placement and hold Newly/Undo. If the budget is exhausted,
an exact one-cycle request/disposition is required before further repair or
Newly/Undo; no reset, automatic extension or acceptance follows from feedback.

**Cycle4 action-layout direction and budget, 2026-10-08:** the user confirmed
the ASCII interpretation of Direct Node/Bit/Cancel stacking and Staged
left-information/right-actions, then explicitly approved one additional cycle
("추가 cycle은 내가 승인할게"). Preserve the initial three consumed cycles;
Cycle4 is exactly one additional Placement revision cycle, with no reset.
Tower03 authors only the bounded DESIGN_TOKENS/EXECUTION_PLAN/Placement recipe
draft; Working170/01 remains the sole receipt/ledger/product/test/evidence and
commit writer. The five existing Placement product/test owners remain the
candidate write set; pin each current input and the actual three-file draft
and ordered diff in one supplemental whole-file scope before adoption and
affected implementation. Record the already received direction and cycle
approval without requesting them again. This does not approve unpinned
canonical bytes, Placement visual acceptance, Newly/Undo execution, Cycle5,
Task170 acceptance or closure. Re-present the revised Placement checkpoint
and stop with Task170 [ ] and the same Working active awaiting disposition.

**Cycle5 chrome/focus direction and budget, 2026-10-08:** the user selected
both revised images and said "이렇게 진행하자. 추가 cycle 승인할게."
The four consumed cycles remain historical; Cycle5 is exactly one additional
Placement cycle, without reset, Cycle6 or Newly/Undo execution. Tower03 authors
only the three-file DESIGN_TOKENS/EXECUTION_PLAN/Placement recipe draft.
Working170/01 prepares the exact supplemental receipt and remains the sole
implementation/test/evidence/commit writer. The bounded candidate owner set
is the existing five Placement paths plus src/lib/copy/inbox-triage.ts and
src/lib/copy/inbox-triage.test.ts for the two new central labels and their
preservation test. Pin current blobs, both generated-image identities and
exact Tower draft/diff bytes in the new whole-file scope; the extra-cycle
approval does not itself authorize those two owner additions or draft adoption.
Record design/Cycle5 approval as already received. Re-present Placement and
stop at Task170 [ ] / same Working active awaiting user disposition, preserving
all previous failures, limits, acceptance and protected WIP. Task169 remains
Accepted/archive-only; Task171, task acceptance and closure are not activated.

**Cycle6 frame/layout direction and budget, 2026-10-09:** after Cycle5 checkpoint
the user selected the revised Direct preview and final Staged preview with
"괜찮네. 이렇게 작업하자." The user then answered "승인합니다" to the exact
request for one additional Cycle6. Record both approvals as received; neither
is visual acceptance of the current implementation. Five cycles are consumed;
Cycle6 adds exactly one unconsumed cycle without reset, ending aggregate6 /
remaining0 on completion. Tower03 authors only DESIGN_TOKENS/EXECUTION_PLAN/
Placement recipe draft. Working170/01 stays the sole receipt/ledger/product/
test/evidence/commit owner. The candidate implementation write set returns to
the five Placement paths; central copy source/test and all other excluded
owners remain unchanged. Pin the actual current blobs, both selected preview
hashes and exact Tower whole-file/ordered-diff bytes in one supplemental scope.
Do not reselect or request approval of the fixed design or Cycle6 again. No
product/test or runtime execution occurs before the matching exact scope
receipt and audited adoption. The extra cycle does not grant unpinned bytes,
additional owners, Cycle7 or Newly/Undo execution.
Re-present only Placement after the bounded revision; Task170 [ ], same
Working active awaiting disposition, Newly/Undo held. Preserve Cycle5's
failures, long-Direct initial Cancel visibility and narrow recovery wrapping,
all prior limitations and protected WIP; no automatic issue closure follows.

**Cycle7 visual-audit correction draft, 2026-10-10:** Cycle6 checkpoint is not
visually accepted; aggregate6 remains consumed. The user's latest direction
replaces color-regression diagnosis/restoration with directly setting Finder
Node/Bit default surfaces to the same white Light surface as Staging items
(corresponding Staging surface in Dark), and adds removal of the enclosing
Finder wrapper border/outline/ring around Placement plus cards. Keep each
modal/card/tag's own frame and native focus indicators. The added width
amendment makes both Direct and Staged Placement match the owning
Finder Node/Bit card width and left/right edges by removing modal-only inline
gutters, without resizing columns/cards or changing their scroll owner. Keep
responsive width, natural content growth and no horizontal overflow. The other
corrections remain: common selected Direct Node/Bit confirmation frame and
Cancel-OK/tag hierarchy, same-size header glyphs, drag feedback above card
paint with unchanged hit testing, and unavailable Staged destinations in
Return to Breakdown red. Exactly one Cycle7 is already approved by "Cycle은
1회도 승인할게"; record approved1/unconsumed, without reset or asking again.
Tower03 authors only DESIGN_TOKENS/EXECUTION_PLAN/Placement recipe drafts.
Working170/01 remains sole receipt/ledger/product/test/evidence/commit writer
after the matching supplemental scope receipt and audited adoption. The five
candidate files remain unchanged; declare internal scope for Direct
confirmation, scoped Finder surfaces and necessary ExplorerColumn/NodeDropCell
drag/wrapper paint. Actual card sources/tests, copy, producers/helpers,
Workspace source and pane geometry remain read-only. Pin current owner blobs
and exact Tower bytes/diff; needed additional owners stop the affected slice.
Prepare a concise complete supplemental receipt, referencing immutable prior
preservation/evidence records by path/commit/hash rather than copying full
history. This presentation improvement does not alter installed workflow
policy or exact approval semantics. Require fresh Direct Node/Bit confirmation,
modal/card inline-width alignment, Finder/Staging default-surface equality,
absent wrapper outline and native
drag/drop/exit cleanup evidence, invalidated gates and output-owner guards.
Revalidate the independent dev consumer before runtime use. Stop at the bounded
Placement/Finder-feedback checkpoint, Task170 [ ], same Working active awaiting
disposition, Newly/Undo held; completed aggregate7/remaining0, no Cycle8,
acceptance or closure.

**Additional Cycle7 Staged layout direction:** reduce the Staged confirmation
modal's minimum-height floor to 70% of its current baseline, remove hover-only
visual changes from its body Cancel/OK controls, and modestly enlarge their
font size and actual internal block/inline padding. Record the current minimum
contributors and idle baseline, then the actual changed values and rendered
height; natural full-content growth is not an exact 70% height claim. Preserve
the card-aligned width, title-left/right-centered horizontal Cancel-OK row,
independent lower type tag, nonzero full-width reliability reservation,
disabled/lock states and native keyboard focus indicator. Check containment,
title readability, gaps and native action access at 1920/1024 Light/Dark as
part of the same approved Cycle7. No clipping, fixed maximum height, footer
fallback, Direct-selection hover redesign, recovery-action hover amendment,
additional owner or extra cycle follows from this layout direction.

**Deferred workflow review after Cycle7:** the user wants to inspect the
actual Working supplemental receipt before discussing further receipt
compaction. Tower should compare its size, required approval fields, inherited
contracts and duplicate evidence, then propose a concrete policy improvement.
After the Cycle7 execution/checkpoint, evaluate whether a preapproved UI
revision batch budget can replace repeated one-cycle requests using actual
scope, failures, trend and review boundaries. This is a later workflow review,
not additional current cycles, a budget reset or a live skill-policy edit.

**Final visual-refinement batch direction, 2026-10-12:** after the Newly/Undo
checkpoint at f3e04607d6e0aa042344d141cd153e8d8bc77904, the user confirmed
findings 1-8, selected the taller-Node image and said "승인할테니 진행" to
continuing in this same Working with at most three additional cycles. Design
and that maximum budget are already approved; do not request them again.
Preserve aggregate10 consumed. The bounded batch may use cycles11-13 only as
needed, recording aggregate10+actual-used and remaining3-actual-used; no reset,
automatic Cycle14 or repeated per-cycle scope/start approval inside the approved
owners/design/budget. The exact supplemental owner/adoption/receipt/commit
contract must still be prepared and approved before Working writes.

The eight selected changes are: (1) enlarge ordinary Finder Node bodies around
the unchanged Undo control while preserving width/tab/contour and default
consumers; (2) center Node NEW in that enlarged body; (3) remove the Staged-Node
unavailable paint on Level-2 Node cards while retaining Level-3 unavailable
feedback and original invalid-drop semantics; (4) use ordinary diagonal DND
pattern/border with red-family background for the named unavailable states;
(5) cover actual Bit card paint with allowed/unavailable row feedback and
restore it on native drag cleanup; (6) extend diagonal Return-to-Breakdown
feedback over the complete body below the section header, retaining red on
entry; (7) give Remove from Staging in-flow space, reducing Nodes/Bits viewports
without scaling internal cards; (8) slightly enlarge the Direct/Staged header
close glyph while preserving native cancellation/focus/lock contracts.

Tower03 authors only the bounded DESIGN_TOKENS/EXECUTION_PLAN/Newly-Undo recipe/
Placement recipe draft; Working170/01 remains the sole receipt/ledger/product/
test/evidence/commit writer. Candidate owners are the previous nine Newly/Undo
paths plus breakdown-panel.tsx, breakdown-panel.test.tsx and the narrowly
scoped triage-workspace.tsx display layout. The latter previously read-only
source is eligible only for TriageRemoveDropTarget and its enclosing Staging
layout; no Workspace observer/producer/command/helper redesign is activated.
Breakdown source scope is only return-overlay extent/style/necessary body roles,
with existing return/drop/ref/operation/editor behavior preserved. Finder source
scope adds NodeDropCell/ExplorerColumn paint roles and PlacementAffordance close
presentation. Card writes stay within ordinary inbox-explorer presentation;
stage only actual changed files. Discovery of another necessary owner stops
before that write and is reported with its concrete reason. StagingZone source,
hooks/repository/schema/copy/config and ordinary Grid/search stay read-only.

Pin current inputs, the selected image, exact four draft bytes and ordered diff
in one compact supplemental receipt with immutable prior-contract/evidence
references. Adopt in one exact receipt+ledger+four-canonical start commit;
record Reflected only after its matching immediate audit and committed new
gate/action resolver. Existing receipts and the Placement disposition c4f30214
remain immutable; this later scoped refinement does not revoke historical
acceptance or mark the new implementation visually approved.

Record pre-RED producer/render/command/ref/drop/scroll seams and the bounded
hypothesis. Each product reproduce/repair loop consumes one of the three
approved cycles. Record observer-only corrections separately when the product
source and guarded build output are unchanged; preserve raw failure evidence,
rerun every invalidated observer/fingerprint and impose an explicit bounded
correction allowance in the receipt. A product correction is not an observer
correction. No-progress (same signature across two consecutive cycles with a
nonshrinking failure set), material variance, scope/design/owner expansion or
budget exhaustion stops affected execution.

Fresh direct-owner/regression and native 1920/1024 Light/Dark normal/reduced
checks must exercise Node/Undo containment and painted-body NEW center,
Level-2 suppression/Level-3 retention, allowed/unavailable Bit occlusion and
cleanup, header-excluded Breakdown extent, in-flow Remove target/card-size
preservation and close-glyph visibility/Cancel locks. Preserve logical targets,
drop predicates, collision algorithm, focus and actual commands; measure the
intended changed card/viewport rectangles rather than promising unchanged
geometry. Observe native drag entry/exit/drop/cancel and fresh build delivery;
semantic role tests do not establish pixels or native reachability. Keep all
708 existing captures/26 raw runs and previous failures/limits/unverified/
deferrals. Re-present the changed surfaces after audited implementation and
stop at Task170 [ ] / same Working active awaiting user disposition. No task
acceptance, Task171, Working/Tower closure, topology change or publication.

**Bit/Return follow-up after Cycle12, 2026-10-12:** the user reported the
enlarged Node satisfactory at checkpoint34dc7addebd95c052a49ec87b08d179bbde81a93
and requested a common Finder Bit base using the NEW/Undo version, plus green
Return-to-Breakdown feedback. Record targeted feedback, not Task170 acceptance.
Current aggregate12, product remaining1/Cycle13 unused; observer used1/remaining1.
Use only that existing unused allowance, without another cycle-budget request
or reset. A new exact display-scope/canonical-adoption supplement is required
because the earlier receipt preserved Bit dimensions and required Return red.
Do not reselect the two explicit user directions or rewrite the old receipt.

Unify ordinary inbox-explorer Bit frame/minimum height/body spacing/alignment
across NEW/Undo-present and absent states using the current NEW/Undo baseline.
Keep marker/action conditional on actual provenance/eligibility; no fabricated
NEW, Undo or result. Preserve metadata, natural growth, unavailable/terminal/
tooltip/action/ref/operation/focus semantics, current Node geometry and default
Grid/search/other-region presentation. Give Return a green background/ink role
with its current diagonal/header-excluded extent and native commands. Retain
Finder unavailable red by separating its current alias to the Return token;
do not recolor prohibited destinations or change drop predicates/targets.

Tower03 writes only the bounded same four DESIGN_TOKENS/EXECUTION_PLAN/Newly-Undo/
Placement recipe drafts. Working170/01 owns the supplemental receipt/ledger,
matching start/adoption and all product/test/evidence commits. Necessary write
candidates are a subset of the existing12 owners: scoped globals.css, ordinary
BitContextRow/BitCard presentation and direct tests, theme realization and
direct return/Workspace regression assertions as needed. Existing other-owner
limits remain; no Workspace observer, producer, hook/db/schema/copy/helper or
StagingZone change follows. Freeze current pins/draft4/ordered diff and inherit
the prior exact budgets, observer cap, history/isolation/commit rules; one exact
receipt+ledger+four-canonical start, Reflected only after matching audit and
committed gate/action resolver. Preserve all933 captures/30 runs and failures.

Fresh native comparisons must cover Bits with/without NEW/Undo and
metadata/status/long-title variants at1920/1024 Light/Dark normal/reduced,
green Return versus red unavailable in the same guarded build, true return/
invalid-drop/cancel cleanup, and unchanged Node/Placement/Remove contracts.
Do not infer a complete recovery matrix or invent native operation IDs. A
concrete required repair beyond Cycle13 or outside the existing owner/design
scope stops; observer allowance remains one correction/one fresh invalidated
rerun under the existing unchanged-product constraints. Re-present Task170
[ ] / same Working active awaiting user disposition. No acceptance, Cycle14,
Task171, Working/Tower closure, topology or publication.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L5; UF-19–25/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L5; no adjacent or experimental fallback.

**Observable acceptance:** Every L5 element/state and behavior-preservation criterion, fresh matched first-submission/internal-refinement evidence and separate user visual disposition for each assigned theme. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L5, plus its focused/full logical gates and regression boundaries.

**Commit contract:** only L5's owned implementation/tests and this task's fresh evidence, approved receipt/ledger state; no acceptance marker before user acceptance. Message: `feat(triage): realize retro-mac placement-newly-undo`. No experimental bytes, broad staging or rewrite.

### Task 171: [x] Realize completion and Archive

**Files and actions:** bind L6's exact per-file actions to `retro-mac` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 170 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L6 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L6; UF-02/12/26–29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L6; no adjacent or experimental fallback.

**Observable acceptance:** Every L6 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L6, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize retro-mac archive`.

### Task 171A: [ ] Repair Archive handoff retention and Explorer Retry focus

A bounded repair scope under L7's return rule: Task 172 found behavior defects
that L7 may not fix. They are shared component/hook behavior, predate Phase 34
(MI-8 reproduced at 8e5b1d4) and apply to every theme. Ledger items: MI-8,
MI-11, MI-12 and the Retry part of MI-4 in `docs/issues/Issues_Phase_34.md`.
Scope review: [Task 171A repair scope](reviews/phase-34-task-171A-scope-review.md).

**Stage A — Archive handoff (L6 regional owner).** Files:
`src/hooks/use-archive-scratch.ts` and `use-archive-scratch.test.ts`;
`src/components/triage/triage-workspace.tsx` and `triage-workspace.test.tsx`.
- Recovery gate: show the section-recovery projection only while the
  projection is not ready, or for an operation restored after reload that has
  not yet been shown in the workspace. Once an operation is shown in
  `ReadyTriageWorkspace`, none of its later states (Retry, pending, success)
  shows the recovery projection. The kept exception is a post-dispatch
  recovery-storage failure, which keeps `blocksProjection`.
- Card projection: pass the Archive operation only to the Breakdown of the
  operation's own Scratch (`recovery.scratchBitId`), so no other Scratch shows
  a pending or terminal card. A pre-dispatch storage failure has
  `recovery: null`; its card shows in the Breakdown of the Scratch where
  Archive was activated (the coordinator may keep the attempted Scratch id).
- Focus: replace the one-shot `requestAnimationFrame` destination focus with a
  parent-owned pending focus kind consumed in a layout effect in the commit
  that renders the destination, following `pendingTerminalFocusRef`. Focus
  never rests on BODY in any commit between dispatch and success.
- Keep the coordinator order (handoff before terminal commit) and the
  operation lock through handoff.
- Non-success terminal (not applied, rejected, conflict) and pre-dispatch
  storage failure: any change of the selected Scratch away from its Scratch
  (Pool, external-removal handoff, Pool reconciliation) dismisses it like
  Cancel, with no write (user decision 2026-10-15). Implement it in
  `triage-workspace.tsx` by watching `selectedScratchId`, not in the Pool.
  Retry never targets a Scratch other than the selected one.
- Second Archive (MI-12): terminal success is still committed and announces
  `Scratch archived.` once (keep the announce-once test). A later Archive on
  the same mounted page is then accepted and dispatches once, either because
  `archiveScratch` treats terminal success as idle or because the coordinator
  returns to `idle` only after the success state has rendered.
- No CSS, copy or visual change.

**Stage B — Explorer Retry focus (L4 regional owner).** Files:
`src/hooks/use-grid-explorer-search.ts` and `use-grid-explorer-search.test.tsx`;
`src/components/triage/grid-explorer-search-results.tsx` and its test only if
the focus target needs a presentation hook. `Try again` starts the next
request and focuses the search input (user decision 2026-10-15, as in the
P34-16 Undo repair). `INPUT_FOCUS` is a shared default object, so setting it
again does not re-run the input focus effect; the focus request must be a new
value. The error-only button lifetime stays as the recipe states.

**Dependencies:** Task 171 accepted. Task 172 stays in progress and cannot be
accepted before this task is accepted.

**Authority / flows:** SPEC Inbox Archive success and recovery bullets, the
Mounted Inbox page-session lifetime row and the `VQ-07` row; Archive recipe
Focus and lifetime, Grid Explorer recipe Focus; DESIGN_TOKENS Archive Cancel
and Explorer Navigation/focus rows; UF-17–19, UF-24–25 and UF-26–28;
DP-VQ07/VQ10/VQ12 unchanged.

**Observable acceptance:**
- A normal Archive, including live unknown → Check again → applied, never
  renders `archive-recovery-boundary`; the `Inbox triage workspace` region
  keeps its element identity.
- In no commit between dispatch and success does a Breakdown other than the
  archiving Scratch's show the Archive card, or focus rest on BODY.
- A Newly Placed marker with its Undo and an open Explorer search survive a
  successful Archive. The Staging alert still clears on the Scratch switch, as
  SPEC requires.
- Focus reaches the next-visible, previous-visible, filtered-null (search
  input/clear) and true-empty (primary Add) destinations.
- Two Archives in a row on the same mounted page each dispatch once and hand
  off correctly.
- After a live not applied, rejected or conflict result, or a pre-dispatch
  storage failure, a change of the selected Scratch by any path dismisses the
  card with no write; Archive on the new Scratch works. The pre-dispatch
  storage-failure card still shows, with Cancel, on the activated Scratch.
  A restored terminal result held in the recovery projection is not dismissed
  by an unrelated selection change (only a change away from its own Scratch).
- Forced-reload recovery is unchanged: recovery projection, heading focus,
  same card states and geometry. A restored not applied shown on the selected
  Scratch → Retry → applied keeps the workspace region's identity.
- After `Try again`, focus is on the search input, never BODY.

**Verification:** direct tests above plus the existing Archive, recovery,
Newly/Undo and Explorer search tests. At least one workspace test runs the
real `useArchiveScratch` (or a mock that reproduces pending → selection change
→ terminal), because the current mocks let identity and marker tests pass
without the fix. For the per-commit bullet, hold the dispatch and
`readTerminalSnapshot` promises open and flush each step with `act`; after each
step assert focus is not BODY and only the archiving Scratch's Breakdown
reports an Archive phase, and watch the container with a `MutationObserver`
for `archive-recovery-boundary`. Full `CLAUDE.md` gates. Browser: retro-mac light/dark at
1920×1080 and griddo light at 1920×1080 for the four handoff destinations,
consecutive Archives and search Retry; regression of the Archive states
checked in Task 171, Newly/Undo after Archive (Task 170) and search
error/`Try again` presentation (Task 169). Any visual change returns to the
user for a disposition of that region. Expert review is required (logic
change). Stage A and Stage B are accepted separately.

**Commit messages:** `fix(triage): keep workspace mounted through Archive handoff`
and `fix(explorer): focus search input after Try again`.

### Task 172: [ ] Complete supported modes, accessibility and regression

**Files and actions:** bind L7's exact per-file actions to `retro-mac` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 171 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. Acceptance also requires Task 171A accepted; its remaining rechecks and final regression run on the repaired code. The matching L7 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L7; UF-01–29 preservation, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L7; no adjacent or experimental fallback.

**Observable acceptance:** Every L7 current-theme supported-mode criterion and separate user visual disposition, with the user's first judgment recorded separately from the final disposition; no silent component repair or full-campaign pass claim. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L7, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize retro-mac theme-conformance`.

---

## Phase 35 — Neumorphism Regional Realization

Theme set: `neumorphism`. This phase is proposed and unstarted.

Visual reference: prototype route `/prototype/inbox-triage-neumorphism` in the read-only worktree `/Users/jwk/Documents/griddo2-claude-themes2-3` (commit `4f39709`). View it only; never copy its source or assets.

Flow review: [Inbox/Triage theme realization](reviews/2026-10-03-inbox-triage-theme-realization-flow-review.md) covers Phases 34–40.

### Task 173: [ ] Fix the common frame and realize Scratch Pool

**Files and actions:** bind L1's exact per-file actions to `neumorphism` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 172 accepted and actual Phase 34 Final Close/main sync; approved document/flow chain and this phase's fresh lifecycle gate. The matching L1 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L1; UF-01–05/28–29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L1; no adjacent or experimental fallback.

**Observable acceptance:** Every L1 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L1, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize neumorphism frame-pool`.

### Task 174: [ ] Realize Selected Scratch Context and Breakdown

**Files and actions:** bind L2's exact per-file actions to `neumorphism` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 173 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L2 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L2; UF-06–12/14–15/26/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L2; no adjacent or experimental fallback.

**Observable acceptance:** Every L2 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L2, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize neumorphism context-breakdown`.

### Task 175: [ ] Realize Staging and drag presentation

**Files and actions:** bind L3's exact per-file actions to `neumorphism` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 174 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L3 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L3; UF-13–16/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L3; no adjacent or experimental fallback.

**Observable acceptance:** Every L3 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L3, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize neumorphism staging`.

### Task 176: [ ] Realize Explorer base and replacement search

**Files and actions:** bind L4's exact per-file actions to `neumorphism` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 175 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L4 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L4; UF-17–19/22/24–25/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L4; no adjacent or experimental fallback.

**Observable acceptance:** Every L4 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L4, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize neumorphism explorer-search`.

### Task 177: [ ] Realize Placement followed by Newly/Undo

**Files and actions:** bind L5's exact per-file actions to `neumorphism` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 176 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L5 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L5; UF-19–25/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L5; no adjacent or experimental fallback.

**Observable acceptance:** Every L5 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L5, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize neumorphism placement-newly-undo`.

### Task 178: [ ] Realize completion and Archive

**Files and actions:** bind L6's exact per-file actions to `neumorphism` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 177 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L6 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L6; UF-02/12/26–29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L6; no adjacent or experimental fallback.

**Observable acceptance:** Every L6 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L6, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize neumorphism archive`.

### Task 179: [ ] Complete supported modes, accessibility and regression

**Files and actions:** bind L7's exact per-file actions to `neumorphism` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 178 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L7 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L7; UF-01–29 preservation, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L7; no adjacent or experimental fallback.

**Observable acceptance:** Every L7 current-theme supported-mode criterion and separate user visual disposition, with the user's first judgment recorded separately from the final disposition; no silent component repair or full-campaign pass claim. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L7, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize neumorphism theme-conformance`.

---

## Phase 36 — Terminal Regional Realization

Theme set: `terminal`. This phase is proposed and unstarted.

Flow review: [Inbox/Triage theme realization](reviews/2026-10-03-inbox-triage-theme-realization-flow-review.md) covers Phases 34–40.

### Task 180: [ ] Fix the common frame and realize Scratch Pool

**Files and actions:** bind L1's exact per-file actions to `terminal` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 179 accepted and actual Phase 35 Final Close/main sync; approved document/flow chain and this phase's fresh lifecycle gate. The matching L1 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L1; UF-01–05/28–29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L1; no adjacent or experimental fallback.

**Observable acceptance:** Every L1 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L1, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize terminal frame-pool`.

### Task 181: [ ] Realize Selected Scratch Context and Breakdown

**Files and actions:** bind L2's exact per-file actions to `terminal` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 180 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L2 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L2; UF-06–12/14–15/26/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L2; no adjacent or experimental fallback.

**Observable acceptance:** Every L2 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L2, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize terminal context-breakdown`.

### Task 182: [ ] Realize Staging and drag presentation

**Files and actions:** bind L3's exact per-file actions to `terminal` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 181 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L3 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L3; UF-13–16/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L3; no adjacent or experimental fallback.

**Observable acceptance:** Every L3 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L3, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize terminal staging`.

### Task 183: [ ] Realize Explorer base and replacement search

**Files and actions:** bind L4's exact per-file actions to `terminal` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 182 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L4 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L4; UF-17–19/22/24–25/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L4; no adjacent or experimental fallback.

**Observable acceptance:** Every L4 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L4, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize terminal explorer-search`.

### Task 184: [ ] Realize Placement followed by Newly/Undo

**Files and actions:** bind L5's exact per-file actions to `terminal` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 183 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L5 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L5; UF-19–25/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L5; no adjacent or experimental fallback.

**Observable acceptance:** Every L5 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L5, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize terminal placement-newly-undo`.

### Task 185: [ ] Realize completion and Archive

**Files and actions:** bind L6's exact per-file actions to `terminal` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 184 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L6 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L6; UF-02/12/26–29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L6; no adjacent or experimental fallback.

**Observable acceptance:** Every L6 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L6, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize terminal archive`.

### Task 186: [ ] Complete supported modes, accessibility and regression

**Files and actions:** bind L7's exact per-file actions to `terminal` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 185 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L7 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L7; UF-01–29 preservation, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L7; no adjacent or experimental fallback.

**Observable acceptance:** Every L7 current-theme supported-mode criterion and separate user visual disposition, with the user's first judgment recorded separately from the final disposition; no silent component repair or full-campaign pass claim. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L7, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize terminal theme-conformance`.

---

## Phase 37 — Claymorphism And Origami Regional Realization

Theme set: `claymorphism`, `origami`. This phase is proposed and unstarted.

Flow review: [Inbox/Triage theme realization](reviews/2026-10-03-inbox-triage-theme-realization-flow-review.md) covers Phases 34–40.

### Task 187: [ ] Fix the common frame and realize Scratch Pool

**Files and actions:** bind L1's exact per-file actions to `claymorphism`, `origami` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 186 accepted and actual Phase 36 Final Close/main sync; approved document/flow chain and this phase's fresh lifecycle gate. The matching L1 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L1; UF-01–05/28–29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L1; no adjacent or experimental fallback.

**Observable acceptance:** Every L1 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L1, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize claymorphism-origami frame-pool`.

### Task 188: [ ] Realize Selected Scratch Context and Breakdown

**Files and actions:** bind L2's exact per-file actions to `claymorphism`, `origami` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 187 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L2 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L2; UF-06–12/14–15/26/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L2; no adjacent or experimental fallback.

**Observable acceptance:** Every L2 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L2, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize claymorphism-origami context-breakdown`.

### Task 189: [ ] Realize Staging and drag presentation

**Files and actions:** bind L3's exact per-file actions to `claymorphism`, `origami` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 188 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L3 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L3; UF-13–16/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L3; no adjacent or experimental fallback.

**Observable acceptance:** Every L3 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L3, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize claymorphism-origami staging`.

### Task 190: [ ] Realize Explorer base and replacement search

**Files and actions:** bind L4's exact per-file actions to `claymorphism`, `origami` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 189 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L4 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L4; UF-17–19/22/24–25/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L4; no adjacent or experimental fallback.

**Observable acceptance:** Every L4 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L4, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize claymorphism-origami explorer-search`.

### Task 191: [ ] Realize Placement followed by Newly/Undo

**Files and actions:** bind L5's exact per-file actions to `claymorphism`, `origami` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 190 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L5 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L5; UF-19–25/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L5; no adjacent or experimental fallback.

**Observable acceptance:** Every L5 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L5, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize claymorphism-origami placement-newly-undo`.

### Task 192: [ ] Realize completion and Archive

**Files and actions:** bind L6's exact per-file actions to `claymorphism`, `origami` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 191 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L6 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L6; UF-02/12/26–29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L6; no adjacent or experimental fallback.

**Observable acceptance:** Every L6 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L6, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize claymorphism-origami archive`.

### Task 193: [ ] Complete supported modes, accessibility and regression

**Files and actions:** bind L7's exact per-file actions to `claymorphism`, `origami` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 192 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L7 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L7; UF-01–29 preservation, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L7; no adjacent or experimental fallback.

**Observable acceptance:** Every L7 current-theme supported-mode criterion and separate user visual disposition, with the user's first judgment recorded separately from the final disposition; no silent component repair or full-campaign pass claim. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L7, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize claymorphism-origami theme-conformance`.

---

## Phase 38 — GridDO And Tiny Desk Regional Realization

Theme set: `griddo`, `tiny-desk`. This phase is proposed and unstarted.

Flow review: [Inbox/Triage theme realization](reviews/2026-10-03-inbox-triage-theme-realization-flow-review.md) covers Phases 34–40.

### Task 194: [ ] Fix the common frame and realize Scratch Pool

**Files and actions:** bind L1's exact per-file actions to `griddo`, `tiny-desk` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 193 accepted and actual Phase 37 Final Close/main sync; approved document/flow chain and this phase's fresh lifecycle gate. The matching L1 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L1; UF-01–05/28–29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L1; no adjacent or experimental fallback.

**Observable acceptance:** Every L1 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L1, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize griddo-tiny-desk frame-pool`.

### Task 195: [ ] Realize Selected Scratch Context and Breakdown

**Files and actions:** bind L2's exact per-file actions to `griddo`, `tiny-desk` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 194 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L2 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L2; UF-06–12/14–15/26/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L2; no adjacent or experimental fallback.

**Observable acceptance:** Every L2 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L2, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize griddo-tiny-desk context-breakdown`.

### Task 196: [ ] Realize Staging and drag presentation

**Files and actions:** bind L3's exact per-file actions to `griddo`, `tiny-desk` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 195 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L3 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L3; UF-13–16/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L3; no adjacent or experimental fallback.

**Observable acceptance:** Every L3 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L3, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize griddo-tiny-desk staging`.

### Task 197: [ ] Realize Explorer base and replacement search

**Files and actions:** bind L4's exact per-file actions to `griddo`, `tiny-desk` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 196 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L4 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L4; UF-17–19/22/24–25/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L4; no adjacent or experimental fallback.

**Observable acceptance:** Every L4 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L4, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize griddo-tiny-desk explorer-search`.

### Task 198: [ ] Realize Placement followed by Newly/Undo

**Files and actions:** bind L5's exact per-file actions to `griddo`, `tiny-desk` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 197 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L5 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L5; UF-19–25/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L5; no adjacent or experimental fallback.

**Observable acceptance:** Every L5 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L5, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize griddo-tiny-desk placement-newly-undo`.

### Task 199: [ ] Realize completion and Archive

**Files and actions:** bind L6's exact per-file actions to `griddo`, `tiny-desk` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 198 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L6 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L6; UF-02/12/26–29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L6; no adjacent or experimental fallback.

**Observable acceptance:** Every L6 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L6, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize griddo-tiny-desk archive`.

### Task 200: [ ] Complete supported modes, accessibility and regression

**Files and actions:** bind L7's exact per-file actions to `griddo`, `tiny-desk` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 199 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L7 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L7; UF-01–29 preservation, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L7; no adjacent or experimental fallback.

**Observable acceptance:** Every L7 current-theme supported-mode criterion and separate user visual disposition, with the user's first judgment recorded separately from the final disposition; no silent component repair or full-campaign pass claim. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L7, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize griddo-tiny-desk theme-conformance`.

---

## Phase 39 — Graphite Regional Realization

Theme set: `graphite`. This phase is proposed and unstarted.

Flow review: [Inbox/Triage theme realization](reviews/2026-10-03-inbox-triage-theme-realization-flow-review.md) covers Phases 34–40.

### Task 201: [ ] Fix the common frame and realize Scratch Pool

**Files and actions:** bind L1's exact per-file actions to `graphite` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 200 accepted and actual Phase 38 Final Close/main sync; approved document/flow chain and this phase's fresh lifecycle gate. The matching L1 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L1; UF-01–05/28–29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L1; no adjacent or experimental fallback.

**Observable acceptance:** Every L1 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L1, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize graphite frame-pool`.

### Task 202: [ ] Realize Selected Scratch Context and Breakdown

**Files and actions:** bind L2's exact per-file actions to `graphite` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 201 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L2 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L2; UF-06–12/14–15/26/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L2; no adjacent or experimental fallback.

**Observable acceptance:** Every L2 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L2, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize graphite context-breakdown`.

### Task 203: [ ] Realize Staging and drag presentation

**Files and actions:** bind L3's exact per-file actions to `graphite` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 202 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L3 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L3; UF-13–16/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L3; no adjacent or experimental fallback.

**Observable acceptance:** Every L3 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L3, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize graphite staging`.

### Task 204: [ ] Realize Explorer base and replacement search

**Files and actions:** bind L4's exact per-file actions to `graphite` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 203 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L4 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L4; UF-17–19/22/24–25/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L4; no adjacent or experimental fallback.

**Observable acceptance:** Every L4 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L4, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize graphite explorer-search`.

### Task 205: [ ] Realize Placement followed by Newly/Undo

**Files and actions:** bind L5's exact per-file actions to `graphite` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 204 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L5 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L5; UF-19–25/29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L5; no adjacent or experimental fallback.

**Observable acceptance:** Every L5 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L5, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize graphite placement-newly-undo`.

### Task 206: [ ] Realize completion and Archive

**Files and actions:** bind L6's exact per-file actions to `graphite` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 205 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L6 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L6; UF-02/12/26–29, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L6; no adjacent or experimental fallback.

**Observable acceptance:** Every L6 element/state and behavior-preservation criterion, checked against the reference in the running app and refined before first submission, and a separate user visual disposition for each assigned theme; the checkpoint records the user's first judgment separately from the final disposition. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L6, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize graphite archive`.

### Task 207: [ ] Complete supported modes, accessibility and regression

**Files and actions:** bind L7's exact per-file actions to `graphite` only. Conditional owner/decision gates remain in force.

**Dependencies:** Task 206 accepted, including its required user visual dispositions; this phase's approved lifecycle scope. The matching L7 DP contracts and Q01/Q02/Q05 conditions apply only where that binding names them.

**Authority / flows:** selected DECISION and approved DESIGN_TOKENS as cited by L7; UF-01–29 preservation, its AF/NEG constraints and no-storage boundary.

**Recipe:** exactly the source/DP surfaces named by L7; no adjacent or experimental fallback.

**Observable acceptance:** Every L7 current-theme supported-mode criterion and separate user visual disposition, with the user's first judgment recorded separately from the final disposition; no silent component repair or full-campaign pass claim. No later region is advanced from self-review or test success alone.

**Verification:** all exact direct targets and fresh mounted-browser checks in L7, plus its focused/full logical gates and regression boundaries.

**Commit message:** `feat(triage): realize graphite theme-conformance`.

---

## Phase 40 — Complete Implementation And Preservation Gate

Flow review: [Inbox/Triage theme realization](reviews/2026-10-03-inbox-triage-theme-realization-flow-review.md) covers Phases 34–40.

### Task 208: [ ] Run the retained all-nodes campaign gate

**Files and actions:** make no production/test/config change. Run the full
matrix below on the current code with test data and record the outcome in the
Phase 40 ledger checkpoint: the accepted dispositions of Tasks 129–163 and
166–207, the approved SCHEMA grid correction, all 29 UF/10 AF/21 NEG outcomes,
nine recipes, fourteen accepted DP receipts covering twelve VQs and
migration/rollback/ABA/aggregate-retention/recovery/unrelated-surface results.
Failures return to their exact owner.

**Dependencies:** all accepted Tasks 101–163 including 105A; all accepted Tasks
166–207; actual Phase 39 Final Close/main sync and all prior phase publication/
integration proofs; the approved SCHEMA grid correction and fourteen retained
DP receipts; complete approved C04/C05/C06/flow-review chain and this phase's
exact lifecycle gate. Transferred 164/165 are explicitly excluded from the
dependency set, never treated as accepted.

**Authority / flows:** every UF-01–29, AF-01–10, NEG-01–21 and VQ-01–12,
all independent command/data foundations and DECISION D07/D19/D24.
No new data or product decision is derived.

**Recipe:** all nine exact source packages in the Recipe Surface Inventory.

**Observable acceptance:** one clean migrated production build passes every
flow and preserved unrelated surface; real fault injection leaves no partial
writes; all three ABA sequences conflict without resurrection; aggregate
deletion retains audits; Archive storage/reload/handoff and state lifetimes
pass. Eight themes × light/dark at both supported desktop viewports cover all
nine recipes, representative reliability/editor/recovery states, accessibility,
pointer/keyboard/focus and adopted motion. All five deferrals remain absent;
every newly scoped card change has its exact Q01 authority and preserved
consumer evidence. No unknown result, skipped check, unresolved decision,
known failure or source-only claim is represented as completion.

**Verification:** run the `CLAUDE.md` full gate; run the complete v3→v4
migration/rollback, real transaction, ABA-1/2/3, aggregate retention, 29-flow/10-AF/21-NEG, fourteen-DP/nine-recipe,
16-theme/mode × 1024px/1920×1080, route/reload/remote/concurrent/focus,
accessibility/motion and unrelated-surface matrices. Browser-dependent
results need a fresh check on the current code. Finish with a clean working
tree and independent technical and user visual dispositions. This task does
not itself authorize Phase 40 Final Close.

**Commit message:** `docs(triage): record full inbox implementation and
preservation gate`, after every claimed check passes. No repair is bundled.

---

## Shared-File Writer Register And Mutex Policy

This register covers every implementation/test path declared by two or more tasks. Every task-local evidence root is single-writer. A component/hook row that names its co-located test means both files have the same writers unless the row explicitly adds Task 101 for typed-fixture compatibility. POOL/BREAKDOWN/STAGING/EXPLORER/PLACE/ARCHIVE/CONFORM/THEMES expand only to the finite task IDs above. Conditional Q01 card writers are prospective: a register row is serialization, not card-redesign approval. The separately gated Phase 31 route correction also serializes with the historical runtime-test owner; it is not a new numbered theme task.

**Mutex policy**

1. Two tasks that share any registered file may not edit or commit concurrently. The next writer reads the latest committed owned files and verifies affected prior-writer assertions as well as its own. This register does not authorize run-task to switch or rebase a branch/worktree; Git-base changes belong to the owning lifecycle gate.
2. Numeric order below is the default serialization order, but it is not a product dependency. Historical independent VQ tasks were serialized without a VQ completion inference. The new regional tasks have explicit predecessor/user-disposition edges that a free mutex does not waive.
3. Tasks 106–119 may collect user decisions logically in parallel, but the single `decision-docs` mutex serializes `DESIGN_TOKENS.md`, `EXECUTION_PLAN.md`, and overlapping recipe writes one receipt commit at a time. No Decision task depends on another.
4. The `copy` and `global-theme` mutexes likewise serialize receipt-dependent UI tasks. In particular, sibling Tasks 153/154 and every other same-file sibling cannot be concurrently committed even though their DP receipts are independent.
5. Task 101 is the first writer for each enumerated typed-fixture test. Where a test row below says “plus 101,” Task 101 changes only factory compatibility; later tasks own behavior.

| Mutex | Exact shared file(s) | Writer tasks |
|---|---|---|
| `decision-docs` | `docs/DESIGN_TOKENS.md`; `docs/EXECUTION_PLAN.md` | 106–119 |
| `decision-pool-recipe` | `docs/recipes/inbox-triage-scratch-pool-visual-recipe.md` | 106, 111 |
| `decision-context-recipe` | `docs/recipes/inbox-triage-selected-scratch-context-visual-recipe.md` | 109, 118 |
| `decision-breakdown-recipe` | `docs/recipes/inbox-triage-breakdown-row-empty-visual-recipe.md` | 107, 108, 109, 110, 118 |
| `decision-explorer-recipe` | `docs/recipes/inbox-triage-grid-explorer-visual-recipe.md` | 113, 114 |
| `decision-placement-recipe` | `docs/recipes/inbox-triage-placement-affordances-visual-recipe.md` | 115, 116 |
| `decision-archive-recipe` | `docs/recipes/inbox-triage-archive-completion-visual-recipe.md` | 118, 119 |
| `db-implementation` | `src/lib/db/indexeddb.ts` | 101, 102, 103, 104, 105, 120–126 |
| `db-interface` | `src/lib/db/datastore.ts` | 103, 105, 120–126 |
| `db-revision-fixtures` | `src/lib/db/auto-completion.test.ts`; `src/lib/db/cascade-delete.test.ts`; `src/lib/db/cascade-restore.test.ts`; `src/lib/db/deadline-hierarchy.test.ts`; `src/lib/db/grid-uniqueness.test.ts`; `src/lib/db/indexeddb.migration.test.ts`; `src/lib/db/indexeddb.test.ts`; `src/lib/db/mtime-cascade.test.ts`; `src/lib/db/promotion.test.ts`; `src/lib/db/system-nodes.test.ts` | 101, 103 |
| `db-archive-regression` | `src/lib/db/archive.test.ts` | 101, 103, 125 |
| `db-hard-delete-regression` | `src/lib/db/auto-cleanup.test.ts`; `src/lib/db/cascade-hard-delete.test.ts` | 101, 103, 105 |
| `db-breakdown-regression` | `src/lib/db/scratch-breakdowns.test.ts` | 101, 103, 105, 120 |
| `db-command-harness` | `src/lib/db/inbox-operations.test.ts` | 120 creates; 121, 123, 124 extend |
| `copy` | `src/lib/copy/inbox-triage.ts`; `src/lib/copy/inbox-triage.test.ts` | 128, 138, 140, 141, 143, 144, 147, 148, 150, 151, 153, 154, 157, 160, 162 |
| `global-theme` | `src/app/globals.css` | 129, 138, 140, 141, 143, 144, 147, 148, 150, 151, 153, 154, 157, 160, 162; THEMES |
| `triage-state` | `src/stores/triage-store.ts`; `src/stores/triage-store.test.ts` | 127, 130, 134, 141, 150, 161, 163 |
| `triage-preferences` | `src/stores/triage-preferences-store.ts`; `src/stores/triage-preferences-store.test.ts` | 127, 130, 132 |
| `breakdown-component` | `src/components/triage/breakdown-panel.tsx` | 132, 136, 137, 138, 139, 140, 142, 143, 145, 147, 148, 159, 160, 161, 162; BREAKDOWN, ARCHIVE |
| `breakdown-component-test` | `src/components/triage/breakdown-panel.test.tsx` | 101 plus every `breakdown-component` writer |
| `workspace-component` | `src/components/triage/triage-workspace.tsx` | 129, 136, 137, 139, 140, 141, 145, 149, 152, 155, 159, 160, 161, 163, 171A; POOL, BREAKDOWN, STAGING, PLACE, ARCHIVE |
| `workspace-component-test` | `src/components/triage/triage-workspace.test.tsx` | 101 plus every `workspace-component` writer |
| `pool-component` | `src/components/triage/scratch-pool.tsx` | 130, 136, 141, 144, 161; POOL |
| `pool-component-test` | `src/components/triage/scratch-pool.test.tsx` | 101 plus every `pool-component` writer |
| `staging-component` | `src/components/triage/staging-zone.tsx`; `src/components/triage/staging-zone.test.tsx` | 133, 142, 145, 146, 147, 148; STAGING |
| `drag-token` | `src/components/triage/triage-drag-token.tsx`; `src/components/triage/triage-drag-token.test.tsx` | 133, 142; STAGING |
| `explorer-component` | `src/components/triage/hierarchy-explorer.tsx` | 134, 149–158; EXPLORER, PLACE |
| `explorer-component-test` | `src/components/triage/hierarchy-explorer.test.tsx` | 101, 134, 149–158; EXPLORER, PLACE |
| `explorer-results` | `src/components/triage/grid-explorer-search-results.tsx`; `src/components/triage/grid-explorer-search-results.test.tsx` | 151, 158, 171A (conditional); EXPLORER, PLACE |
| `actual-node-card` | `src/components/grid/node-card.tsx` | 155, 156, 157; EXPLORER, PLACE only after their exact Q01 approval |
| `actual-node-card-test` | `src/components/grid/node-card.test.tsx` | 101, 155, 156, 157; EXPLORER, PLACE only after their exact Q01 approval |
| `actual-bit-card` | `src/components/grid/bit-card.tsx` | 155, 156, 157; EXPLORER, PLACE only after their exact Q01 approval |
| `actual-bit-card-test` | `src/components/grid/bit-card.test.tsx` | 101, 155, 156, 157; EXPLORER, PLACE only after their exact Q01 approval |
| `theme-realization-test` | `src/components/triage/inbox-triage-theme-realization.test.tsx` | THEMES; 166 creates, later writers extend while preserving earlier assertions |
| `theme-transition-test` | `src/app/theme-transition.test.ts` | CONFORM |
| `breakdown-hook` | `src/hooks/use-scratch-breakdowns.ts` | 132, 136, 137 |
| `breakdown-hook-test` | `src/hooks/use-scratch-breakdowns.test.tsx` | 101, 132, 136, 137 |
| `operation-lock-test` | `src/hooks/use-triage-operation-lock.test.tsx` | 136, 137, 139, 145, 152, 156, 161 |
| `inbox-hook-test` | `src/hooks/use-inbox.test.tsx` | 101, 130 |
| `candidate-hook` | `src/hooks/use-staged-candidates.ts`; `src/hooks/use-staged-candidates.test.tsx` | 131, 145, 146 |
| `triage-dnd` | `src/hooks/use-dnd.ts`; `src/hooks/use-triage-dnd.test.ts` | 142, 145, 146, 149, 152, 163 |
| `explorer-search-hook` | `src/hooks/use-grid-explorer-search.ts`; `src/hooks/use-grid-explorer-search.test.tsx` | 135, 151, 158, 171A |
| `placement-hook` | `src/hooks/use-triage-placement.ts`; `src/hooks/use-triage-placement.test.tsx` | 152, 153, 154, 161 |
| `newly-hook` | `src/hooks/use-triage-newly-placed.ts`; `src/hooks/use-triage-newly-placed.test.tsx` | 155, 156, 157, 158, 161 |
| `completion-hook` | `src/hooks/use-can-archive-scratch.ts` | 159, 160 |
| `completion-hook-test` | `src/hooks/use-can-archive-scratch.test.ts` | 101, 159, 160 |
| `archive-coordinator` | `src/hooks/use-archive-scratch.ts`; `src/hooks/use-archive-scratch.test.ts` | 161, 162, 171A |
| `runtime-fixture-test` | `src/components/layout/grid-runtime.test.tsx` | 101, 163; proposed P31-R01 only after Q03 repair approval |

## Next Numbers

- **Next planned implementation phase/task:** Phase 34 / Task 171A. Phases 32
  and 33 remain reserved with no tasks.
- **Next unallocated numbers after this amendment:** Phase 41 / Task 209.
  Planned Phases 34–40 and Tasks 166–208 are already allocated; none may be
  reused for another meaning.
- Graph reconciliation: 70 accepted tasks (101–163 plus 105A, 166–171), nine
  completed archives (Phases 23–31), two historical unaccepted transfer records
  (164/165), 38 unaccepted tasks (171A, 172–208) in Phases 34–40, and two reserved
  phases (32–33).
- This amendment and C05/C06/flow review are accepted under their exact-artifact
  receipts. They approve planning, not task acceptance.
