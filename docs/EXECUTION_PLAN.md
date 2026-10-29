# GridDO Inbox/Triage Implementation Execution Plan

Execution plan mode: scaled

> **Current authority — 2026-10-03:** the targeted amendment and complete
> document/flow chain are accepted under the six
> `Craft_Docs.inbox-triage-theme-realization-*.json` receipts in
> [docs/receipts](receipts/).
> Their exact committed artifact hashes own approval; original Draft headings
> in other approval-time snapshots do not override those receipts.
> **Phase state:** Phases 23–31 are completed/archive-only under their respective
> Final Close transactions; Phase 34 closed through `/end-phase 34` (2026-10-15). Phase 31 closes accepted Task 163 and bounded
> technical corrections, not eight-theme visual completion. Its actual
> publication/main-sync proof is owned by
> [Final Close Phase 31](issues/Final_Close_Phase_31.json).
> **Task state:** Tasks 101–163 and 105A retain explicit user acceptance.
> Tasks 164–165 are historical, unaccepted `[ ]` transfer records.
> Tasks 166–172 and 171A are accepted `[x]` and Phase 34 is closed; Tasks
> 209–212 are accepted `[x]` and Phase 41 is closed (2026-10-16); Tasks
> 173–179 and repair Tasks 176A and 179A are accepted `[x]` and Phase 35 is
> closed (2026-10-20); Tasks 241–244 are accepted `[x]` and Phase 49 is closed
> (2026-10-24); Tasks 213–218 are accepted `[x]` and Phase 42 is closed
> (2026-10-25); Tasks 219–220 are accepted `[x]` and Phase 43 is closed
> (2026-10-25); Tasks 221–224 are accepted `[x]` and Phase 44 is closed
> (2026-10-26); Tasks 225–229 are accepted `[x]` and Phase 45 is closed
> (2026-10-29); Tasks 180–208 and Phases 36–40 are retired as
> superseded (feedback F28, promotion ②), their text in
> [the retired-phases archive](execution-plan/archive/phases-36-40-retired.md).
> Phases 32–33 remain reserved.
> **SaaS conversion (2026-10-22):** Phases 42–48, Tasks 213–240, from the
> [SaaS DECISION](brainstorming/2026-10-21-saas-conversion/DECISION.md)
> (promotion ①). See [SaaS Conversion — Phases 42–48](#saas-conversion--phases-4248).
> **Feedback lane (2026-10-22):** Phases 49–50, Tasks 241–250, from the
> [feedback DECISION](brainstorming/2026-10-18-staging-item-status-feedback/DECISION.md)
> (promotion ②). Phase 49 runs beside Phases 42–44 and closes before Phase 45;
> Phase 50 follows Phase 45 and runs beside Phases 46–48 (F33). See
> [Feedback Lane — Phases 49–50](#feedback-lane--phases-4950).
> **Phase 41 hotfix (2026-10-15):** Scratch Trash and post-Phase-34 Inbox
> corrections, Tasks 209–212, from
> [DECISION](brainstorming/2026-10-15-scratch-trash-hotfix/DECISION.md). It
> runs before Phase 35.
> **Workflow:** from Task 171, tasks run under the lightweight workflow in
> [WORKFLOW.md](WORKFLOW.md) (`/run-phase`, `/run-task`, `/end-phase`).
> Planning approval and technical gates never grant visual acceptance.
> Phase 30 and original Task 163 acceptance records are unchanged.
## Goal

Implement the approved Inbox/Triage workspace as one production component tree with a validated Dexie v4 model, monotonic revisions, real all-or-nothing transactions, durable candidates, lifetime-correct UI state, dedicated Explorer search, pointer placement, source-aware Undo, guarded Archive recovery, and source-backed theme presentation (four themes since feedback F28) without inventing any unresolved visual or content decision.

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
101–163 are retained. Their accepted task contracts are historical and live in
the phase archives; forward references to 164/165 now resolve through the transfer register rather
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
- New tasks are 166–208, allocated once across proposed Phases 34–40. Tasks 180–208 and Phases 36–40 are retired as superseded (feedback F28, 2026-10-22); their numbers are not reused. The authoritative continuation and graph count are at [Next Numbers](#next-numbers).

## Planning, Completion, And Evidence Rules

- **No phase-wide inference:** a phase number never substitutes for a listed dependency.
- **Code-ready or gated:** a code task is runnable only when all listed dependencies and exact DP receipts exist. Silence never selects a fallback.
- **Verification matches risk:** data, state, persistence, async and drag-and-drop logic get a focused failing test first; observe the intended failure, implement the smallest slice, rerun focused tests, then run the broader checks. Layout, styling and copy are verified in the running app.
- **Authoritative results:** pending or unknown transport outcome is not success. Source truth remains visible until a complete repository postcondition is proven.
- **Narrow commits:** a task's commits contain only its implementation, tests, and plan/ledger updates. Shared-file writers obey the mutex register below.
- **Running-app checks near the change:** every user-visible task is checked in the running app with test data. Screenshots are shown in the conversation and never committed; there is no per-task evidence report or assets directory. The ledger checkpoint records what was compared, retained differences, and the user's first judgment separately from the final disposition ([PLANNING_STANDARD §5.3](PLANNING_STANDARD.md#53-visual-checks-and-independent-dispositions)). Theme conformance Tasks 172 and 179 aggregated rather than substituted for regional checks; Tasks 186–208 are retired (feedback F28).
- **Source/render separation:** recipe declarations are source authority. A task checkpoint records rendered/interaction checks and never changes recipe authority.
- **Preserve unrelated behavior:** ordinary Grid routing/DnD, Calendar, Trash, Quick Capture, global Search, Bit Detail, Direct Archive, Archive View restore, and system-node lifecycle change only where an explicit task names a compatibility assertion.

## Readiness Summary

| Area | Current status | Smallest blocker / next condition |
|---|---|---|
| Document approval | `ACCEPTED` | Six exact-artifact receipts accept the promotion map, design, plan, planning standard, workflow and flow review. |
| Execution lifecycle | Phase 45 closed | The Phase 31 publication/sync result is in Final_Close_Phase_31.json. Phase 34 closed through `/end-phase 34` (2026-10-15); Phase 41 (hotfix) closed through `/end-phase 41` (2026-10-16); Phase 35 closed through `/end-phase 35` (2026-10-20); Phase 49 (feedback lane, part 1) closed through `/end-phase 49` (2026-10-24); Phase 42 (SaaS lane, part 1) closed through `/end-phase 42` (2026-10-25); Phase 43 (SaaS lane, part 2) closed through `/end-phase 43` (2026-10-25); Phase 44 (SaaS lane, part 3) closed through `/end-phase 44` (2026-10-26); Phase 45 (SaaS lane, part 4) closed through `/end-phase 45` (2026-10-29). The SaaS lane continues with Phase 46; the feedback lane continues with Phase 50. Phases 36–40 are retired (feedback F28). MI-13 and ISSUE-20-01 were resolved in Task 241; Phase 49 mi-1, mi-2 and mi-3 are bound to Task 248, MI-14 to Task 250 and MI-21 to Tasks 245–246; MI-19 closed in Task 229 and MI-23 keeps its loading screen for Task 234; Phase 45 MI-24 goes to the theme stage, mi-1 to Task 245, mi-2 to Task 246 and mi-3 to Task 249. |
| SaaS conversion | `IN PROGRESS` | Phases 42 (Tasks 213–218) and 43 (Tasks 219–220) closed and archived (2026-10-25), Phase 44 (Tasks 221–224) on 2026-10-26, Phase 45 (Tasks 225–229) on 2026-10-29; the migrations of Phases 42–44 are on production, and Phase 45 changed none. The app runs on local Supabase. MI-8 is bound to Task 240. Phase 46 waits for nothing more; later phases follow [the phase waits](#lanes-and-phase-waits). |
| Feedback lane | `IN PROGRESS` | Phase 49 (Tasks 241–244) closed and archived (2026-10-24); its mi-1, mi-2 and mi-3 are bound to Task 248. Phase 50 waits for nothing more since the Phase 45 close (2026-10-29); it carries Phase 45 mi-1 (Task 245), mi-2 (Task 246) and mi-3 (Task 249) ([the phase waits](#lanes-and-phase-waits)). |
| Data foundations | `COMPLETED` | Tasks 101–105A and authoritative command Tasks 120–126 are accepted and recorded in their phase archives. |
| Decision prerequisites | `COMPLETED` | Tasks 106–119 and all fourteen DP receipts are accepted, reflected, and recorded in the Phase 24 archive. |
| Headless/base UI | Tasks 127–163 accepted | Task 163 integration and bounded R01/I01 corrections are included in the Phase 31 Final Close transaction. Original task evidence is retained; correction/candidate evidence is separate. |
| Theme realization | `ENDED` | Retro Mac Tasks 166–172 and repair Task 171A accepted; Phase 34 closed and archived. Neumorphism Tasks 173–179, 176A and 179A accepted; Phase 35 closed and archived. Phases 36–40 are retired (feedback F28); the remaining theme work belongs to the theme stage (`2026-10-17-theme-scope-replan`). No old experiment is evidence of canonical conformance. |
| Phase 31 close | `COMPLETED / ARCHIVED` | R01/C01/I01 corrections are recorded in the archive; fresh candidate/output/browser checks and publication guards must pass before the Final Close receipt is created. No eight-theme-completion claim. |
| Campaign full gate | `RETIRED` | Task 208 is retired with Phases 36–40 (user, 2026-10-22). Its data and command checks are superseded by the SaaS database suites, which port the existing scenarios as answer keys (Tasks 216, 219–224); its visual matrices go to the theme stage, which sets its own gate. |

## Unaccepted Task 164–165 Transfer Register

**Accepted disposition under the exact execution-amendment receipt.**
The original definitions are preserved in Git at
`d05140626a6e95d4f5ca4897f02f66594af4d753:docs/EXECUTION_PLAN.md`.
Neither task was accepted; neither receives `[x]` or enters Phase 31's active
task list. Transfer is responsibility relocation, not a test pass or deletion
of a promised gate. Subsequent ledger/WORKFLOW records require their own scope.

| Original ID / marker | Disposition | Retained responsibility / replacement owner |
|---|---|---|
| Task 164 `[ ]` | `Transferred / Superseded`, unaccepted | Nine-surface/eight-theme semantic fidelity, motion, accessibility and theme-state preservation: regional Tasks 166–171, 173–178, 180–185, 187–192, 194–199, 201–206; per-theme/mode completion Tasks 172/179/186/193/200/207; final full 16 theme/mode × 1024/1920 evidence in Task 208. The old CSS-only owner restriction is not inherited by the new explicitly named component owners. Tasks 180–208 are retired (feedback F28, 2026-10-22): the remaining semantic fidelity goes to the theme stage. |
| Task 165 `[ ]` | `Transferred / Superseded`, unaccepted | Complete implementation/preservation all-nodes sink: Task 208, retaining 29 UF, 10 AF, 21 NEG, nine recipes, 14 DP/12 VQ, schema grid correction, migration/rollback/real transactions/three ABA sequences/aggregate retention/Archive recovery and unrelated-surface evidence. Task 208 is retired (2026-10-22): data and command checks pass to the SaaS database suites (Tasks 216, 219–224), visual matrices to the theme stage. |

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
                          →209→210→211→212  Phase 41 Scratch Trash hotfix
                                          └→173→174→175→176→177→178→179  Neumorphism
                                                        └176A┘ (repair; gates 177)
                                                                    └179A (repair; after 179, gates Phase 35 close)
                          ⨯180–208  retired (feedback F28): Terminal, Claymorphism + Origami,
                                    GridDO + Tiny Desk, Graphite, Task 208 gate

SaaS lane:
  213→214→215→216→217→218  Phase 42 (waits only for closed phases)
  →219→220  Phase 43
  →221→222→223→224  Phase 44
  →[Phase 49 Final Close]→225→226→227→228→229  Phase 45 (S43 (4): zone migration no-op)
  →230  Phase 46
  →[Phase 49 Final Close]→231→232→233→234  Phase 47
  →235→236→237→238→239→240  Phase 48

Feedback lane:
  241→242→243→244  Phase 49 (waits for none; beside Phases 42–44)
  [Phase 49 + Phase 45 Final Close]→245→246→247→248→249; 250  Phase 50 (beside Phases 46–48)

Retired Tasks 164/165 and 180–208 are not dependency nodes.
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
| Phase 34 | Completed | [Retro Mac regional realization](execution-plan/archive/phase-34.md) | 166–172 + 171A | Accepted and archived; MI-5/6/9 and close Advisory A2 carried in `Issues_Deferred.md`, MI-9 and A2 bound to Task 178. |
| Phase 41 | Completed | [Scratch Trash and post-Phase-34 Inbox corrections](execution-plan/archive/phase-41.md) (ran before Phase 35) | 209–212 | Accepted and archived; MI-2 closed as Dropped (user, 2026-10-22; the Terminal theme leaves). |
| Phase 35 | Completed | [Neumorphism regional realization](execution-plan/archive/phase-35.md) | 173–179 + 176A + 179A | Accepted and archived; MI-19 bound to Task 229, MI-23 absorbed by Tasks 228 and 234, MI-13 to Task 241, MI-14 to Task 250, MI-21 to Tasks 245–246. |
| Phase 42 | Completed | [Database foundation, end-to-end slice and early production](execution-plan/archive/phase-42.md) | 213–218 | Accepted and archived (2026-10-25); MI-1 deferred to the Phase 43 gate watch and MI-8 bound to Task 240 in `Issues_Deferred.md`. Phase 43 may start. |
| Phase 43 | Completed | [Ordinary write functions](execution-plan/archive/phase-43.md) | 219–220 | Accepted and archived (2026-10-25); migrations on production; MI-1 deferred to the Phase 44 gate watch in `Issues_Deferred.md`. Phase 44 may start. |
| Phase 44 | Completed | [Inbox/Triage command functions](execution-plan/archive/phase-44.md) | 221–224 | Accepted and archived (2026-10-26); migrations on production; MI-1 closed (no recurrence). Phase 45 may start. |
| Phase 45 | Completed | [Client switch](execution-plan/archive/phase-45.md) | 225–229 | Accepted and archived (2026-10-29); no migration; MI-19 closed; MI-24, mi-1, mi-2, mi-3 and Phase 35 MI-23 carried in `Issues_Deferred.md`. Phases 46 and 50 may start. |
| Phase 46 | Planned / unstarted | [Dexie removal](#phase-46--dexie-removal) | 230 | Phase 45 close/main sync. |
| Phase 47 | Planned / unstarted | [Feel and resilience](#phase-47--feel-and-resilience) | 231–234 | Phase 46 and Phase 49 close/main sync. |
| Phase 48 | Planned / unstarted | [Accounts and launch](#phase-48--accounts-and-launch) | 235–240 | Phase 47 close/main sync. |
| Phase 49 | Completed | [Feedback lane, part 1: theme set, status primitives, toasts](execution-plan/archive/phase-49.md) | 241–244 | Accepted and archived (2026-10-24); ISSUE-20-01 and MI-13 resolved in Task 241; mi-1, mi-2 and mi-3 bound to Task 248 in `Issues_Deferred.md`. Phases 45 and 47 no longer wait for it. |
| Phase 50 | Planned / unstarted | [Feedback lane, part 2: Inbox status, breadcrumb reveal, last Scratch](#phase-50--inbox-status-breadcrumb-reveal-and-last-scratch) | 245–250 | Phase 49 and Phase 45 close/main sync; runs beside Phases 46–48; does not block Phase 48; closes before the theme stage. |
| Phases 36–40 | Retired (feedback F28, 2026-10-22) | [Terminal, Claymorphism + Origami, GridDO + Tiny Desk, Graphite, and the Task 208 campaign gate](execution-plan/archive/phases-36-40-retired.md) | 180–208 | Retired as superseded; never runnable. Numbers are not reused. |

## Theme Realization Task Sets

These are finite aliases, not implied phase-wide dependencies. Each task below
bound one landing contract, exact predecessor, theme set and evidence path.
`REGIONS` is the union of POOL/BREAKDOWN/STAGING/EXPLORER/PLACE/ARCHIVE.
`THEMES` is REGIONS plus CONFORM. Since the retirement of Phases 36–40
(feedback F28, 2026-10-22) the aliases expand only to accepted tasks, and the
`208` entries in the inventories below are retired (Task 208's data and command
checks pass to the SaaS database suites, its visual matrices to the theme
stage). The original table, the L1–L7 landing contracts and the retired task
text are in [the retired-phases archive](execution-plan/archive/phases-36-40-retired.md).

| Alias | Exact task IDs | Landing contract (archived) |
|---|---|---|
| `POOL` | 166, 173 | L1 — common frame and Scratch Pool |
| `BREAKDOWN` | 167, 174 | L2 — Selected Scratch Context and Breakdown |
| `STAGING` | 168, 175 | L3 — Staging and its compact drag token |
| `EXPLORER` | 169, 176 | L4 — Explorer/Finder base and replacement search |
| `PLACE` | 170, 177 | L5 — Placement, then Newly/Undo |
| `ARCHIVE` | 171, 178 | L6 — Breakdown-scoped completion and Archive |
| `CONFORM` | 172, 179 | L7 — current theme(s), supported modes and regression |

## User Flow Inventory

| ID | User-visible flow | Owning task(s) |
|---|---|---|
| `UF-01` | Enter Inbox through `/grid/[nodeId]` and see the four named areas. | 129, 163; POOL, CONFORM |
| `UF-02` | Initial/re-entry/reload Scratch selection, invalid prior selection, and true empty state. | 127, 130, 250; POOL, ARCHIVE |
| `UF-03` | Expanded Pool search, sort, total/filtered counts, selection, and hidden-selected state. | 127, 130, 144; POOL |
| `UF-04` | Collapsed switching, first-printable-key collapse, manual reopen, and session restoration. | 127, 130; POOL |
| `UF-05` | External archive/delete transition, destination changes, draft copy, and restore. | 106, 141, 209; POOL |
| `UF-06` | Context, Breakdown sort, rows/actions, and ordinary/completion empty distinctions. | 132; BREAKDOWN |
| `UF-07` | Add by Enter/explicit Add with authoritative pending/reconcile/failure/success/focus. | 120, 136, 143, 148, 245; BREAKDOWN |
| `UF-08` | Leave with an Add draft through continue-writing or discard-and-move. | 108, 139, 140, 211, 212; BREAKDOWN |
| `UF-09` | Edit Scratch title with conditional Save/Cancel/validation/offline/conflict/invalidation. | 109, 120, 137, 138, 245; BREAKDOWN |
| `UF-10` | Edit Breakdown content with lifecycle guards and deterministic focus. | 109, 120, 137, 138, 245; BREAKDOWN |
| `UF-11` | Delete non-optimistically with confirmation, recovery, and focus handoff. | 120, 136, 143, 210, 245; BREAKDOWN |
| `UF-12` | Active, staged, consumed-removal, never-used, all-deleted, and completion row lifecycle. | 132, 136, 142, 145; BREAKDOWN, ARCHIVE |
| `UF-13` | Durable Node/Bit candidates, counts, sort, quiet empty state, and full-card drag. | 121, 131, 133; STAGING |
| `UF-14` | Stage with source validation, pending projection, result, and navigation guard. | 121, 145, 147, 176A, 246; STAGING, BREAKDOWN |
| `UF-15` | Unstage through transient targets, restoring order/focus without success toast. | 121, 145, 148, 176A, 245, 246; STAGING, BREAKDOWN |
| `UF-16` | Remote candidate arrival, orphan proof/cleanup, invalidation, alert, and drag release. | 122, 146, 147, 176A, 246; STAGING |
| `UF-17` | Explorer navigation/re-entry, full labels, anchoring, and valid fallback. | 127, 134, 150, 179A; EXPLORER |
| `UF-18` | Dedicated whole-hierarchy search with pre-search/results/loading/stale/error/duplicates. | 114, 135, 151, 171A; EXPLORER |
| `UF-19` | Search result reveal/navigation/close semantics, DnD interruption, and result Undo. | 151, 158, 247; EXPLORER, PLACE |
| `UF-20` | Staged placement through target-column confirmation and atomic mutation. | 123, 152, 153; PLACE |
| `UF-21` | Direct type plus path selection and atomic placement. | 123, 152, 153; PLACE |
| `UF-22` | Valid/invalid/full feedback, visible full reason, and valid-column edge scroll. | 149, 152; EXPLORER, PLACE |
| `UF-23` | Staged Result Title and direct type-limit surfaces without truncation/fallback. | 116, 154; PLACE |
| `UF-24` | Actual-card Newly marker, type pinning, normal navigation, mounted-page lifetime. | 155, 157, 171A; EXPLORER, PLACE |
| `UF-25` | Ordinary/search Undo, dependency reasons, child-first recovery, reconcile, focus. | 124, 156–158, 209, 247; EXPLORER, PLACE |
| `UF-26` | Exact durable completion plus Add/title blocker suppression, with no blocker copy since Task 178 (user, 2026-10-19). | 125, 159, 160; BREAKDOWN, ARCHIVE |
| `UF-27` | Section-scoped overlay, Cancel, complete Context, explicit reopen, switch/re-entry. | 159, 160; ARCHIVE |
| `UF-28` | Archive pending/recovery/retry and next→previous→filtered-null/true-empty handoff. | 125, 126, 161, 162, 171A; ARCHIVE, POOL |
| `UF-29` | Theme/mode change preserves all work state and causes no mutation/navigation. | THEMES, 241; complete matrix 208 (retired) |
| `UF-30` | Move a Scratch to Trash from its Pool row or the Retro Mac Context `[X]`: confirmation with staged/draft disclosure, pending/failure/unknown/conflict, handoff/focus, Trash restore. | 209, 210; POOL from Phase 35 |
| `UF-31` | A Scratch captured while the Inbox is mounted becomes selected through the ordinary switch path. | 212 |
| `UF-32` | Choose among four color themes; a stored removed theme falls back to the default without a flash. | 241 |
| `UF-33` | Toasts appear at the top-left of the work area in blended status hues and stay out of the way during a drag. | 244, 248 |
| `UF-34` | Creating a Node or Bit in a full Grid keeps the dialog, the typed title and an inline reason, at every level. | 244 |
| `UF-35` | Reveal the breadcrumb from the sidebar Home button (hover, focus, entry, drag), use or drop on its segments, and let it hide again; no Grid cell is reserved. | 248, 249 |

## Architecture Flow Inventory

New theme owners below are presentation/preservation consumers, not new
repository, hook or lifetime owners. Task 208, which was to check every AF, is
retired (feedback F28): the data foundations are checked again by the SaaS
database suites.

| ID | Architecture flow | Owning task(s) |
|---|---|---|
| `AF-01` | DataStore and Zod write boundary remain the only command/storage boundary. | 101–105, 105A, 120–126, 163 |
| `AF-02` | UI reads stay reactive; components do not import Dexie. | 131, 135, 163 |
| `AF-03` | Canonical URL/system-node routing is retained; only Inbox body dispatch changes. | 129, 163; POOL, CONFORM, 208 |
| `AF-04` | Lifecycle filters, retention, and unrelated Archive/Trash behavior remain intact. | 102, 105, 122, 125, 209; ARCHIVE, CONFORM, 208 |
| `AF-05` | Durable, app-session, mounted-page, recovery, and preference state use correct owners. | 101, 127, 131, 137, 139, 155, 159, 161, 163; THEMES, 208 preservation |
| `AF-06` | Node/Bit/Breakdown/Candidate mutations use monotonic CAS/ABA protection. | 103, 120–125, 209 |
| `AF-07` | Commands use complete atomic postconditions and real transaction rollback, without a general log. | 104, 120–126, 209 |
| `AF-08` | Candidates join source truth; uniqueness, aggregate deletion, orphan audit, Archive and Trash integrity stay repository-owned. | 101, 105, 121, 122, 131, 209; STAGING, ARCHIVE, 208 preservation |
| `AF-09` | Dedicated Explorer query, existing triage DnD owner, placement, Newly, and Archive coordinators own distinct slices. | 135, 142, 149, 151, 152, 155, 161, 163; STAGING, EXPLORER, PLACE, ARCHIVE, 208 preservation |
| `AF-10` | One semantic production tree, centralized copy, task-local render evidence, and no theme-ID branching. | 128, 129, 241; THEMES, 208 (retired) |
| `AF-11` | The display delay only postpones presentation; status icons never decide success. | 243, 245–247 |
| `AF-12` | The development state switch forces states in development builds only and never ships enabled. | 243; extended by 231, 233 |

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
| Source-aware Undo | 124; active-Scratch precondition 209 | 156–158 |
| Archive Scratch | 125 | 161, 162 |
| Trash Scratch | 209 | 210 |

## Recipe Surface Inventory

| Recipe surface | Production implementation owner(s) |
|---|---|
| Shell and section chrome | 129; POOL; aggregate CONFORM |
| Scratch Pool | 130, 141, 144, 210; POOL; aggregate CONFORM |
| Selected Scratch Context | 132, 138, 160, 210, 245; BREAKDOWN and complete variant ARCHIVE; aggregate CONFORM |
| Breakdown rows and empty states | 132, 136–140, 143, 148, 159–160, 210, 211, 245; BREAKDOWN/ARCHIVE; aggregate CONFORM |
| Staging | 133, 142, 145–148, 246; STAGING; aggregate CONFORM |
| Grid Explorer | 134–135, 149–151, 158, 247; EXPLORER; aggregate CONFORM |
| Placement affordances | 149, 152–154; PLACE; aggregate CONFORM |
| Newly placed and Undo | 155–158, 247; EXPLORER/PLACE; aggregate CONFORM |
| Archive completion | 159–162; ARCHIVE; aggregate CONFORM |

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

Feedback lane (promotion ②): `VQ-02` is retired in Phase 50 (Task 245). The
realizations of `VQ-04`, `VQ-05`, the Staging part of `VQ-06` and `VQ-10` are
amended by Tasks 245–247 under `DP-FB-01` (Task 242). The receipts and released
edges here stay as history.

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
| `NEG-02` | Flatten the themes into one generic surface. | 129; THEMES, 208 (retired) |
| `NEG-03` | Retain abbreviated Explorer labels. | 134; EXPLORER, 208 |
| `NEG-04` | Use a recipe outside the approved nine-file package as execution authority. | Provenance; THEMES, 208 |
| `NEG-05` | Promote the prototype Pool fold lock. | 127, 130; POOL, 208 |
| `NEG-06` | Copy staged internal handles or native drag snapshots. | 133, 142, 149; STAGING, EXPLORER, 208 |
| `NEG-07` | Add keyboard placement, placement button, picker, or hidden shortcut. | 149, 152, `D-KEYBOARD`; EXPLORER, PLACE, 208 |
| `NEG-08` | Keep large Staging empty cards. | 133; STAGING, 208 |
| `NEG-09` | Submit Add on blur. | 136; BREAKDOWN, 208 |
| `NEG-10` | Extend active-column or global Search for Explorer. | 135, 151, 163; EXPLORER, 208 |
| `NEG-11` | Use repeated blink/pulse/ping/bounce/spin/flicker for status. The F03 loader's rotation, shown only after the display delay and static under reduced motion, is the one exception (feedback F03). | 129, 148, 157, 160, 162, 243; THEMES, 208 (retired) |
| `NEG-12` | Add a permanent candidate Unstage button. | 145; STAGING, 208 |
| `NEG-13` | Toast successful Unstage or prematurely globalize its failure. | 145, 148; STAGING, BREAKDOWN, 208 |
| `NEG-14` | Use generic Dialog/AlertDialog for inline edit/conflict. | 138; BREAKDOWN, 208 |
| `NEG-15` | Auto-unstage/cascade candidate on staged-source edit/delete. | 121, 137; BREAKDOWN, STAGING, 208 preservation |
| `NEG-16` | Use page Set or label equality for candidate uniqueness. | 101, 121, 132; BREAKDOWN, STAGING, 208 preservation |
| `NEG-17` | Persist selection/query/draft/path/overlay/Newly beyond its canonical lifetime; only two Inbox sorts and, from Phase 50, the last selected Scratch persist. | 127, 155, 159, 161, 250; THEMES, 208 preservation (retired) |
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

Responsive/mobile redesign remains excluded; active implementation targets the declared desktop surface with 1024px minimum and stable 1920×1080 evidence. Staging failures never toast (feedback F08).

---

## Phase 23 — Completed / Archived

Data-foundation Tasks 101–105A are accepted. Their task contracts and
completion-time scope are in
[the Phase 23 archive](execution-plan/archive/phase-23.md).

## Phase 24 — Completed / Archived

Decision Tasks 106–119 and their fourteen DP receipts are accepted. Their task
contracts and completion-time scope are in
[the Phase 24 archive](execution-plan/archive/phase-24.md).

## Phase 25 — Completed / Archived

Authoritative command Tasks 120–126 are accepted. Their task contracts and
completion-time scope are in
[the Phase 25 archive](execution-plan/archive/phase-25.md).

## Phase 26 — Completed / Archived

Lifetime, copy and base-surface Tasks 127–135 are accepted. Their task contracts
and completion-time scope are in
[the Phase 26 archive](execution-plan/archive/phase-26.md).

## Phase 27 — Completed / Archived

Breakdown, Pool and Staging interaction Tasks 136–148 are accepted. Their task
contracts and completion-time scope are in
[the Phase 27 archive](execution-plan/archive/phase-27.md). Carried item P27-06
is in [Issues_Deferred.md](issues/Issues_Deferred.md).

## Phase 28 — Completed / Archived

Explorer search and pointer placement Tasks 149–154 are accepted. Their task
contracts and completion-time scope are in
[the Phase 28 archive](execution-plan/archive/phase-28.md).

## Phase 29 — Completed / Archived

Newly Placed and Undo Tasks 155–158 are accepted. Their task contracts and
completion-time scope are in
[the Phase 29 archive](execution-plan/archive/phase-29.md). Carried item P29-01
is in [Issues_Deferred.md](issues/Issues_Deferred.md).

## Phase 30 — Completed / Archived

Completion and Archive recovery Tasks 159–162 are accepted. Their task contracts
and completion-time scope are in
[the Phase 30 archive](execution-plan/archive/phase-30.md).

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

## Phase 34 — Completed / Archived

Retro Mac Tasks 166–172 and repair Task 171A are accepted. Their task
contracts and completion-time scope are in
[the Phase 34 archive](execution-plan/archive/phase-34.md). Carried items
(MI-5, MI-6, MI-9, close Advisory A2) are in
[Issues_Deferred.md](issues/Issues_Deferred.md); MI-9 and A2 are also bound
to Task 178 below.

## Phase 41 — Completed / Archived

Scratch Trash Tasks 209–212 are accepted. Their task contracts and
completion-time scope are in
[the Phase 41 archive](execution-plan/archive/phase-41.md). Carried item
MI-2 (Terminal Pool row hover contrast) was closed as Dropped by the user
(2026-10-22): the Terminal theme leaves (feedback F28).

## Phase 35 — Completed / Archived

Neumorphism Tasks 173–179 and repair Tasks 176A and 179A are accepted. Their
task contracts and completion-time scope are in
[the Phase 35 archive](execution-plan/archive/phase-35.md). Carried items are in
[Issues_Deferred.md](issues/Issues_Deferred.md): MI-19 is bound to Task 229
and MI-23 is absorbed by Tasks 228 and 234 (SaaS S16, S39); MI-13 (with
ISSUE-20-01) is bound to Task 241, MI-14 to Task 250 and MI-21 to Tasks 245 and
246 (feedback lane).

## SaaS Conversion — Phases 42–48

Authority: [SaaS DECISION](brainstorming/2026-10-21-saas-conversion/DECISION.md)
S01–S43 and its [PROMOTION_MAP](brainstorming/2026-10-21-saas-conversion/PROMOTION_MAP.md)
(promotion ①); the feedback topic's F02, F11, F13, F14, F16 copy alignment and
F17–F20 within SaaS S41; SCHEMA §Postgres Target and §Database Functions; SPEC
Architecture Decisions 19–21, §Account Entry And App States, §Feedback And
Network States and §Environments And Hosting; DESIGN_TOKENS §SaaS App-State
Surfaces; CLAUDE.md Architecture 10 and §Workflow.

Flow review: [SaaS conversion flow review](reviews/saas-conversion-flow-review.md)
covers Phases 42–48.

Phases 36–40, numbered before them, are retired (feedback F28). Each phase
leaves `main` working.

### Lanes and phase waits

The SaaS lane is Phases 42–48. The feedback lane is Phases 49–50 (promotion
②, feedback F33, amending S41): Phase 49 runs beside Phases 42–44 and closes
before Phase 45; Phase 50 follows Phase 45 and runs beside Phases 46–48. A phase
waits only for the phases listed here (CLAUDE.md §Workflow, Phase waits). The `/run-phase` change that allows two open lanes is
applied (claude-workflow `b2b7671`, `6044e30`, `b27e9f3`).

| Phase | Waits for (Final Close and `main` sync) |
|---|---|
| 42 | Only phases already closed, with promotion ② on `main` (Tasks 215, 219, 220, 227–229 and 235–237 carry its F34 rule). Phases 36–40, numbered before it, are retired and do not block it |
| 43 | Phase 42 |
| 44 | Phase 43 |
| 45 | Phase 44 and Phase 49. F26 ships in Phase 50, so Phase 45 implements the S43 (4) zone-migration no-op |
| 46 | Phase 45 |
| 47 | Phase 46 and Phase 49 |
| 48 | Phase 47. Phase 50 does not block it |
| 49 | None. Runs beside Phases 42–44 |
| 50 | Phase 49 and Phase 45. Runs beside Phases 46–48; closes before the theme stage |

### Shared rules for every SaaS task

- **Gates:** the full CLAUDE.md gate, `pnpm test:db` included, on every code
  task from Task 213 on; a decision-only task (225, the `DP-SAAS-02` step of
  237) runs `git diff --check`. `pnpm test:db` resets the local database to the branch's
  migrations first. The local Supabase rules in CLAUDE.md §Workflow apply.
- **SQL:** every task that adds or changes a database function or table follows
  the SQL function checklist in PLANNING_STANDARD §6, adds the cross-account,
  concurrency and change-set tests SCHEMA §Database tests names for it, and gets
  an `expert` review before acceptance (S38). A phase that changes SQL closes
  with no new Security Advisor warning (S29).
- **Ported tests:** when a function replaces a Dexie path, the existing
  `src/lib/db/*.test.ts` scenarios for that behavior are ported to
  `supabase/tests/` and serve as the answer key. The Dexie tests stay until
  Phase 46.
- **Checkpoints:** a user-visible task is checked in the running app on local
  Supabase (from Phase 45) in `griddo`, `retro-mac` and `neumorphism` (S40),
  with the plain-Korean "what to look at" list.
- **Production:** by the CLAUDE.md Production rule: before launch, migrations
  may be applied whenever a task needs them, after the user's approval (S36);
  from launch on, only at phase close in the dump, migrations, merge order.

## Phase 42 — Completed / Archived

SaaS-lane Tasks 213–218 are accepted. Their task contracts and
completion-time scope are in
[the Phase 42 archive](execution-plan/archive/phase-42.md). Carried items
MI-1 (Phase 43 gate watch) and MI-8 (bound to Task 240, whose entry below
carries the D8 recheck) are in [Issues_Deferred.md](issues/Issues_Deferred.md).
Advisory notes for Tasks 219, 226, 235 and 238 are in
[the Phase 42 ledger](issues/Issues_Phase_42.md) (Task 217 and Task 218
logs); each task reads its notes at its start.

## Phase 43 — Completed / Archived

SaaS-lane Tasks 219–220 are accepted. Their task contracts and
completion-time scope are in
[the Phase 43 archive](execution-plan/archive/phase-43.md). The six
migrations are on production (2026-10-25). Carried item MI-1 (a Phase 44
gate watch) is in [Issues_Deferred.md](issues/Issues_Deferred.md). Advisory
notes for Tasks 221 and 227 are in
[the Phase 43 ledger](issues/Issues_Phase_43.md) (Task 220 log); each task
reads its notes at its start.

## Phase 44 — Completed / Archived

SaaS-lane Tasks 221–224 are accepted. Their task contracts and
completion-time scope are in
[the Phase 44 archive](execution-plan/archive/phase-44.md). The four
migrations are on production (2026-10-26). MI-1 closed at this close with no
recurrence; nothing is carried over. The function contracts are in SCHEMA
§Database Functions, Inbox/Triage command functions; client-side notes for
Task 227 are in [the Phase 44 ledger](issues/Issues_Phase_44.md) (the Task
227 notes in each task log); Task 227 reads them at its start.

## Phase 45 — Completed / Archived

SaaS-lane Tasks 225–229 are accepted. Their task contracts and
completion-time scope are in
[the Phase 45 archive](execution-plan/archive/phase-45.md). The app runs on
local Supabase; no migration changed, so nothing went to production. Phase 35
MI-19 closed in Task 229. Carried items are in
[Issues_Deferred.md](issues/Issues_Deferred.md): MI-24 (theme stage), mi-1
(Task 245), mi-2 (Task 246), mi-3 (Task 249) and Phase 35 MI-23 (its loading
screen, Task 234). Forward notes for Tasks 231, 232, 233, 234 and 235 are in
[the Phase 45 ledger](issues/Issues_Phase_45.md) (the Task 226–228 logs);
each task reads its notes at its start.

## Phase 46 — Dexie Removal

### Task 230: [ ] Remove Dexie and the client orphan path

**Files and actions:** three stages, each with its own checkpoint and commit
after the user accepts it; the gate is green at the end of every stage.

1. **Tests off Dexie.** Before deleting anything, the ledger records a mapping
   table: each `src/lib/db/*.test.ts` file that imports `indexeddb.ts` or its
   test utilities, each scenario's counterpart in `supabase/tests/`, and the
   verdict (delete, or rewrite onto the Supabase store). A scenario with no
   counterpart stops the task for the user's decision. Then delete the
   Dexie-only tests and rewrite the tests whose subject stays: the
   `withDevInjection` tests in `src/lib/dev/state-switch.test.ts` (over the
   Supabase store or a fake, not `IndexedDBDataStore`); the `liveQuery` from
   `dexie` used in `src/components/layout/grid-runtime.test.tsx`,
   `src/components/triage/triage-workspace.test.tsx` and
   `src/hooks/use-triage-dnd.test.ts`; and in `src/lib/db/supabase-store.test.ts`
   the read-parity block against the Dexie store, which is the only test of the
   snapshot store's reads, is rewritten as explicit expected values over the
   same fixture (ids and order, taken from the Dexie store's current output
   while it still exists), and the read cases of `archive-sweep.test.ts` move
   into it.
2. **Dexie out.** Delete `src/lib/db/indexeddb.ts` with its `settings` store,
   the Dexie side of `runBreadcrumbZoneMigration` (the interface method and the
   Supabase no-op stay for Task 249 if it has not landed) and the Dexie backing
   of `liveRead`, and `indexeddb.test-utils.ts`; remove `dexie` and
   `fake-indexeddb` from `package.json`; delete the development slice page
   `src/app/dev/supabase-slice/` and `NEXT_PUBLIC_GRIDDO_SUPABASE_SLICE` from
   `.env.local.example`. Browser smoke of every route on local Supabase.
3. **Interface trimmed and documents current.** Remove from the `DataStore`
   interface and the Supabase store the confirmed-orphan command, its reconcile
   method, its hook dispatch in `use-staged-candidates.ts`, its Workspace
   caller in `triage-workspace.tsx`, and its orphan state, copy, Zod schemas
   and types (`schema.ts`, `command-schemas.ts`, `src/types/index.ts`); remove
   the five test-only Breakdown writes (`createScratchBreakdown`,
   `updateScratchBreakdown`, `markScratchBreakdownConsumed`,
   `unconsumeScratchBreakdown`, `deleteScratchBreakdown`) and
   `UNSENT_WRITE_METHODS`, and their mocks and tests
   (`supabase-store.test.ts`, `breakdown-panel.test.tsx`,
   `use-scratch-breakdowns.test.tsx`, `use-triage-dnd.test.ts`,
   `use-staged-candidates.test.tsx`, `schema.test.ts`). Rewrite every "until
   Phase 46" passage as done: `CLAUDE.md` Key Paths; SPEC §Tech Stack, §File
   Organization Conventions, §Durable Staging (the orphan path), §Environments
   And Hosting (the slice page) and §Key File Paths; SCHEMA's header note,
   §Current Implementation And Canonical Target, §Object Stores,
   §candidateOrphanAuditEvents (removed), §Not ported (`settings`), §Exposed
   functions (the test-only writes), §Application Hooks (the side-effects
   paragraph) and §Dexie Migration Target, which stays as a historical record
   under a one-line "removed in Phase 46" note; and the code comments that name
   Phase 46.

`src/hooks/use-system-node-seeding.ts` is already gone (Task 226).

**Dependencies:** Phase 45 Final Close and `main` sync; this phase's lifecycle
gate.

**Authority:** S11, S18, S25, S41; SCHEMA §Not ported.

**Observable acceptance:** no `dexie` or `fake-indexeddb` import remains; every
gate passes; the running app behaves as at the end of Phase 45.

**Verification:** full gate at each stage; browser smoke of every route on
local Supabase after Stages 2 and 3; `expert` review before acceptance.

**Commit message:** Stage 1 `test(db): move tests off Dexie`; Stage 2
`refactor(db): remove Dexie`; Stage 3 `refactor(db): remove the client orphan
path`.

## Phase 47 — Feel And Resilience

### Task 231: [ ] Make ordinary writes immediate with rollback

**Files and actions:** `src/lib/db/supabase-store.ts` and
`snapshot-store.ts`: groups 1 and 2 of SPEC §Write feel through the pending
layer; rollback on `rejected` or error; the unknown-outcome rule (refetch,
keep or roll back, never resend); parent-change moves pick the nearest empty
cell from the snapshot (S43 (3)); tests for each group and for the S32 cases
across real calls.

**Dependencies:** Phase 46 and Phase 49 Final Close and `main` sync; this
phase's lifecycle gate.

**Authority:** S09, S15, S16, S32, S43 (3); SPEC §Write feel.

**Observable acceptance:** drag moves, edits, completion toggles and creates
show at once; Trash and Archive hide at once; a refused write rolls back.

**Verification:** full gate; `expert` review; browser checkpoint with the
development state switch (feedback F30), extended here to force a write
rejection.

**Commit message:** `feat(sync): make ordinary writes immediate with rollback`.

### Task 232: [ ] Add the toast rules, server-confirmed pending and the request timeout

**Files and actions:**
- `src/lib/feedback/toast.ts` and test: kinds, counted bursts, at most three
  kinds, 4s success and 6s failure or warning, pause on hover, focus and a
  hidden tab, close button on failures and warnings (F13, F14).
- `src/lib/copy/feedback.ts`: the SPEC §Feedback copy toast rows.
- The 17 kept `toast(` calls move to the helper with their aligned copy (F16);
  rolled-back writes and account limits use their kinds.
- Group 3 controls show the feedback F03 loader (Task 243's `status-icon`)
  after `DISPLAY_DELAY_MS` and a busy state (the request timeout itself is Task
  227's).
- The Toaster's position, colour and stack limit stay as Task 244 set them.
  If Task 245 has landed, its inline-editor offline toast moves to the helper
  too; otherwise Task 245 uses the helper.

**Dependencies:** Task 231.

**Authority:** S28; F02, F11, F13, F14, F16; SPEC §Toasts, §Feedback copy, §Write feel (group 3).

**Observable acceptance:** three quick failures show one counted toast;
different kinds stack to three; durations and pausing as specified; every
kept call shows its new copy; a slow permanent delete shows its loader only
after 300ms.

**Verification:** full gate; browser checkpoint in the three themes.

**Commit message:** `feat(feedback): add the toast rules and server-confirmed pending`.

### Task 233: [ ] Add the connection states and the offline write gate

**Files and actions:** `src/lib/db/connection-monitor.ts` and test (normal,
unstable, offline from request results; 30-second probe while unstable or
offline; recovery refetch); refetch on visibility, focus and reconnect (S17);
a failed background refetch only sets unstable; every write path, the Inbox
commands included, checks the state first and, while offline, changes nothing,
keeps typed input and shows the offline toast (F18); the Inbox editor's offline
source moves from `navigator.onLine` (`use-scratch-breakdowns.ts`) to the
monitor. If Task 245 has not landed, the editor keeps its own offline line
until then, and Task 245 wires its offline toast to the monitor and the helper
(whichever lands second does the wiring and also removes the separate
`navigator.onLine` subscription in `breakdown-panel.tsx`, so one offline source
remains). The development state switch (Task 243) gains the network states.

**Dependencies:** Task 232.

**Authority:** S16, S17, S26, S27; F18; SPEC §Connection states.

**Observable acceptance:** Wi-Fi off makes the state offline and every write
attempt shows only the toast; a server that stops answering makes it unstable
and then offline after three failures; recovery refetches with no visible
notice; a write in flight when the server stops ends in the server's state
after recovery (unknown-outcome rule).

**Verification:** full gate; `expert` review (state machine); browser
checkpoint.

**Commit message:** `feat(sync): add the connection states and the offline gate`.

### Task 234: [ ] Add the account icon, the connection badge, the loading screen and the session-expired screen

**Files and actions:** `src/components/layout/account-button.tsx` and test:
below the Home button if Task 248 has landed, otherwise at the very top
(Task 248 then puts Home above it; feedback F33), guest and account icons,
a focusable status element with the connection tooltip and no action until
Task 235, the badge, and the polite announcements including the screen-reader
`Back online.` (F17); `app-frame.tsx`: the delayed loading screen (busy) and
the session-expired screen with `Continue as guest` only (S43 (2), F20),
shown again after a reload while the session-expired marker is present; all in
the `DP-SAAS-01` look. Check the Inbox status presentation that is on `main` under real
server latency: network throttling in the browser, or production after
launch (SPEC §Write feel).

**Dependencies:** Task 233.

**Authority:** S23, S26, S27, S43 (1)(2); F02, F17, F19, F20; DESIGN_TOKENS
§SaaS App-State Surfaces.

**Observable acceptance:** each connection state shows its badge and tooltip;
the loading screen never appears for a load under 300ms; an expired session
whose refresh the auth server rejects shows the screen with focus on its
first action and creates no guest before the choice, even after a reload; a
refresh that fails only because the network is down shows the offline state
instead; the Inbox status shows no flicker the user
objects to.

**Verification:** full gate; browser checkpoint in the three themes, with the
state switch.

**Commit message:** `feat(account): add the account icon, badge and app screens`.

## Phase 48 — Accounts And Launch

### Task 235: [ ] Add the account modal, sign-out and account deletion

**Files and actions:** `src/components/layout/account-modal.tsx` and test (the
guest and account variants, copy and privacy note from SPEC §Feedback copy, the
deletion confirmation); the account icon becomes its button; sign-out drops the
snapshot and starts a new guest; migration for `delete_my_account()` under its
own role, with its tests (S42 (1), S29), or the SCHEMA fallback if Task 218
recorded it (the deletion request, `account_deleting` in `ensure_account()`,
`get_snapshot()`, the reconcile and write functions, and the
account-being-deleted screen); in either branch `account_missing` in
`get_snapshot()`, the reconcile and write functions, and the account-deleted
screen; sign-out from one tab followed by the other tabs.
- Reserved cells (feedback F34): every `ensure_account()` call site added here
  passes the top-left 3×2 block until Task 249 is on `main`, and none after.

**Dependencies:** Phase 47 Final Close and `main` sync; this phase's lifecycle
gate.

**Authority:** S23, S29, S42 (1); SCHEMA §Account deletion; SPEC §Account icon
and modal, §App-level screens.

**Observable acceptance:** the modal shows the right variant; sign-out lands on
a new guest; deletion removes every row of the account and shows the
account-deleted toast; a second browser profile still signed in to the
deleted account shows the account-deleted screen on its next read or write,
never an empty Grid, while another tab in the same browser follows the new
guest;
signing out in one tab moves every tab to the same new guest; under the
fallback, a sign-in before cleanup shows the account-being-deleted screen and
the data never appears.

**Verification:** full gate; `expert` review with the SQL checklist; browser
checkpoint in the three themes.

**Commit message:** `feat(account): add the account modal and deletion`.

### Task 236: [ ] Add OAuth and Turnstile

**Files and actions:**
- Local: the user creates development GitHub and Google OAuth apps with the
  local Supabase callback URL; their client secrets go only into the
  git-ignored `.env.local`, which `supabase/config.toml` reads, and
  `.env.local.example` lists the names. Local Turnstile uses Cloudflare's
  public test keys (SPEC §Environments And Hosting).
- Production: the user creates the production OAuth apps and Turnstile keys and
  sets the provider secrets, the Turnstile secret, the Site URL and the
  redirect URLs in the dashboard; nothing secret enters Git.
- `session.ts`: OAuth sign-in returning to `/`; a cancel or provider error
  keeps the guest session, cleans the URL and reopens the account modal with
  its inline error; Turnstile on anonymous sign-in with the widget in the
  security-check screen (S42 (3)); the guest-creation failure reasons; the
  session-expired screen gains the two sign-in buttons (F20).
- Reserved cells (feedback F34): every `ensure_account()` call site added here
  passes the top-left 3×2 block until Task 249 is on `main`, and none after.

**Dependencies:** Task 235.

**Authority:** S10, S21, S23, S42 (3); F20; SPEC §Account entry.

**Observable acceptance:** on local Supabase, GitHub and Google sign-in open an
own empty account with its system Nodes; cancelling at the provider returns to
the same guest with the modal and its inline error; a guest's anonymous
sign-in passes the Turnstile test key; the test key that forces an
interactive challenge shows the widget in the security-check screen; the test
key that always fails shows the reason and `Retry`; `git grep` finds no OAuth secret.

**Verification:** full gate; browser checkpoint with both providers on local
Supabase.

**Commit message:** `feat(auth): add OAuth and Turnstile`.

### Task 237: [ ] Record the demo seed `DP-SAAS-02` and copy it into new guests

**Decision prerequisite `DP-SAAS-02`:** owner the user; missing decision the
demo seed content (S10); the task drafts it from the
`scripts/dev-fixtures/inbox-triage.js` scenarios, within the guest limits, as a
reviewable list and a rendered L0, and the user approves it; the code slice
below waits for that approval, recorded in this task.

**Files and actions:** migration: the seed as data in `internal` and
`ensure_account()` step 3 (new ids, remapped references, deadlines and
modification times relative to the copy time, references to Inbox and
Archive mapped to the account's existing system Nodes and no seed item in their
cells, `seeded_at`), with the copy-once
concurrency test (S30, S42 (2)); the seed uses no cell with `x` < 3 and `y` < 2
at any level (feedback F34), checked by a database test.

**Dependencies:** Task 236.

**Authority:** S10, S13, S30, S42 (2).

**Observable acceptance:** a new guest opens on the approved demo with live
urgency and aging; two concurrent first calls copy it once; a real account gets
no seed.

**Verification:** full gate; `expert` review with the SQL checklist; browser
checkpoint.

**Commit message:** `feat(db): copy the demo seed into new guests`.

### Task 238: [ ] Add guest cleanup and the narrow-window notice

**Files and actions:** migration: `internal.cleanup_guests()` scheduled daily
with `pg_cron` (or the recorded fallback from Task 218: a scheduled GitHub
Actions workflow that calls it over a database connection string kept in
GitHub Actions secrets, never in Git),
deleting guests 7 days after `last_visit_at`, and deletion requests under the
account-deletion fallback; `app-frame.tsx`: the narrow-window notice over the
mounted, `inert` app below 1024px, and no guest creation while narrow
(S42 (4)).

**Dependencies:** Task 237.

**Authority:** S10, S22, S42 (4)(5); SCHEMA §Guest cleanup; SPEC §Account
entry step 1.

**Observable acceptance:** a guest idle for more than 7 days is deleted with
all its rows, and one with an open tab is kept; narrowing the window shows the
notice, and widening it returns to the same screen with drafts intact.

**Verification:** full gate; `expert` review with the SQL checklist; browser
checkpoint.

**Commit message:** `feat(account): add guest cleanup and the narrow-window notice`.

### Task 239: [ ] Name the product and add the backup job

**Files and actions:** "grid" in `src/app/layout.tsx` metadata, the `sr-only`
heading of `src/app/(grid)/page.tsx` and the account modal (S24);
`APP_NAME` in `src/lib/constants.ts` becomes "grid", so Node pages keep the
feedback F25 title format (Task 248) whichever task lands first; `scripts/backup/weekly-dump.sh` and its `launchd` file
(weekly `supabase db dump` as three files: roles, schema, and data including
the `auth` schema rows; latest 8 kept outside Git; a Docker check and a
failure notice; the connection secret read from outside Git); the user
installs it and forces one run with `launchctl kickstart`; one restore test
into local Supabase that brings back the account rows with their auth users.

**Dependencies:** Task 238.

**Authority:** S06, S24, S35; user answer Q2 (2026-10-22).

**Observable acceptance:** the tab title and the L0 heading read "grid"; the
forced run writes its three files; the restore test passes; a run with
Docker stopped reports failure.

**Verification:** full gate; the user confirms the scheduled job.

**Commit message:** `chore(ops): name the product grid and add the backup job`.

### Task 240: [ ] Prepare the launch

**Files and actions:** production auth settings final (anonymous sign-in with
Turnstile, both providers, rate limits), confirmed by the user in the
dashboard; the Security Advisor on production shows no warning other than the
accepted lint 0012 and one `authenticated_security_definer_function_executable`
warning for each client write function in the SCHEMA function table (accepted
by design, S14; user, 2026-10-24); such a warning for any other function, or
any other warning, is a finding; the D8 measurement again on production
(MI-8): `scripts/verify/d8-measure.mjs` after an `analyze` of the built
accounts, with the server time and the network time recorded separately and
the cold call judged with the warm ones (limit-sized 3 s or less, one-tenth
1 s or less); if it fails, a migration lowers the limits (SCHEMA §Account
limits) before the Phase 48 close; a written production smoke checklist in the
ledger (guest entry, a write, OAuth sign-in with both providers, sign-out, account deletion,
guest cleanup scheduled). The Phase 48 close then follows the CLAUDE.md
Production order (dump, migrations, merge) and runs that smoke right after the
merge, before the URL is announced; if it fails, the URL stays unannounced and
the fix goes through a new phase.

**Dependencies:** Task 239.

**Authority:** S21, S34, S36, S37; D8; SPEC §Environments And Hosting.

**Observable acceptance:** the production settings and the Advisor result are
recorded and confirmed by the user; the D8 result is recorded and passes, or
the lowered limits are applied; the smoke checklist exists; no secret in
Git; the production schema equals the migrations applied so far.

**Verification:** full gate; the user confirms the settings. The post-merge
smoke result is recorded in the Phase 48 close.

**Commit message:** `docs: prepare the grid launch`.

## Feedback Lane — Phases 49–50

Authority: [feedback DECISION](brainstorming/2026-10-18-staging-item-status-feedback/DECISION.md)
F01, F03–F10, F12, F15, the F16 create-dialog change and dropped breadcrumb
toast, and F21–F33, under its
[PROMOTION_MAP](brainstorming/2026-10-18-staging-item-status-feedback/PROMOTION_MAP.md)
(promotion ②); SPEC §Item status presentation, §Breadcrumb reveal and Home
button, §Toasts, §Feedback copy, §Development state switch; DESIGN_TOKENS
§Feedback Status Surfaces, §Color Theme System and the DP amendments it names;
SCHEMA §Not ported.

Flow review: [Phases 49–50 flow review](reviews/phase-49-50-flow-review.md).

Phase waits are in [Lanes and phase waits](#lanes-and-phase-waits): Phase 49
waits for none and runs beside Phases 42–44; Phases 45 and 47 wait for it.
Phase 50 waits for Phases 49 and 45, runs beside Phases 46–48, does not block
Phase 48 and closes before the theme stage.

### Shared rules for every feedback-lane task

- **Gates:** the CLAUDE.md gate without `pnpm test:db` on every code task; the
  close of each phase runs `pnpm test:db` under the CLAUDE.md Local Supabase
  rule once `main` has it (Task 213); before that the close ledger records it
  as not applicable. Decision-only Task 242 runs `git diff --check`.
- **Database:** no task edits `supabase/`. From Phase 50 the browser checks run
  on local Supabase (Phase 45 is on `main`); a task never resets the database
  or adds a migration, and seeds again after a SaaS-lane reset.
- **Checkpoints:** a user-visible task is checked in the running app in
  `griddo`, `retro-mac` and `neumorphism` for correct rendering and in
  `claymorphism` only for not breaking (F29), light and dark, at 1920×1080 and
  at 1024px with the Pool open where the Inbox is involved, with the
  plain-Korean "what to look at" list. From Task 243 on, status states are
  forced with the development state switch.
- **Looks:** no visual value is chosen before `DP-FB-01` is recorded (Task 242).
- **Review:** a task that changes state logic, timing, DnD or focus order gets
  an `expert` review before acceptance.
- **Cross-lane files:** see the `cross-lane`, `saas-*` and `feedback-*` rows of
  the [writer register](#shared-file-writer-register-and-mutex-policy); the lane
  that merges second resolves conflicts when it merges `main`.

## Phase 49 — Completed / Archived

Feedback-lane Tasks 241–244 are accepted. Their task contracts and
completion-time scope are in
[the Phase 49 archive](execution-plan/archive/phase-49.md). Carried items
mi-1, mi-2 and mi-3 are in [Issues_Deferred.md](issues/Issues_Deferred.md)
and bound to Task 248 (Phase 50), whose entry below carries them.

## Phase 50 — Inbox Status, Breadcrumb Reveal And Last Scratch

Waits for: Phase 49 and Phase 45 Final Close and `main` sync (runs beside
Phases 46–48). Does not block Phase 48; closes before the theme stage. Its
checks run on local Supabase (Shared rules above).

### Task 245: [ ] Show Breakdown, Add and editor statuses on the item

**Files and actions:**
- `src/components/triage/breakdown-panel.tsx` and test: remove the `DP-VQ02`
  wash, check, visible text and 160px slot; add the 22px status slot with the
  status icon, emphasis and tooltip on the row's grip and slot; the Add field
  icon at its right end with emphasis and tooltip, `Check again` and
  `Retry Add` beside Add; Delete's `Check again` in the action cluster; the
  editor states of `DP-VQ04`'s amendment (loader, `!`, tooltip, `Stay here`);
  the hidden polite `Added.` and `Saved.` (F01, F04–F07).
- `src/hooks/use-scratch-breakdowns.ts` and test: an editor save attempted
  while offline keeps the draft and shows the offline write-attempt toast
  (SPEC §Toasts), through the Task 232 helper and the Task 233 monitor if they
  are on `main`, otherwise a direct call and `navigator.onLine`. Whichever of
  Task 233 and this task lands second also removes `breakdown-panel.tsx`'s own
  `navigator.onLine` subscription for the offline Retry.
- `src/components/triage/triage-workspace.tsx` and test: the Unstage success
  projection that drove the `DP-VQ02` row signal now feeds only the hidden
  announcement.
- `src/lib/copy/inbox-triage.ts` and test: tooltip use of the existing
  sentences; no visible success key.
- `src/app/globals.css`: the Breakdown row grid with the status slot; remove
  the success roles.
- `inbox-triage-theme-realization.test.tsx`: the new roles.

**Dependencies:** Phase 49 and Phase 45 Final Close and `main` sync; this
phase's lifecycle gate; `DP-FB-01` recorded.

**Authority:** F01, F02, F04–F07, F09; MI-21 (row part); SPEC §Item status
presentation, §Breakdown and Selected Scratch Context; DESIGN_TOKENS `DP-VQ02`
retirement and the `DP-VQ04`, `DP-VQ05` amendments.

**Observable acceptance:** at 1024px with the Pool open a Breakdown row's title
keeps its width (the row reserves 22px, not 160px); an Add success shows
nothing on screen and a screen reader hears `Added.`; a slow Add shows the
loader only after 300ms; unknown shows `?` with `Check again`, not applied
`!` with `Retry Add`, each with emphasis and its sentence on hover and focus;
Delete and the editors follow the same rule; an offline editor save keeps the
draft and shows the toast; the conflict view is unchanged; a status icon on a
locked row is reachable by keyboard and shows its sentence on focus.

**Verification:** gate; `expert` review (state-to-presentation mapping and
timing); browser checkpoint with the state switch.

**Commit message:** `feat(inbox): show Breakdown and editor statuses on the item`.

### Task 246: [ ] Show Staging statuses on the item and widen the Nodes zone

**Files and actions:**
- `src/components/triage/staging-zone.tsx` and test: the status icon at a Node
  card's top-right corner and a Bit row's end in place of the in-card line;
  the problem tooltip leads with the full title, since the label truncates,
  unless the sentence contains it; the status icon is focusable where its host
  is not in the Tab order (a Stage projection, an integrity slot); an Unstage
  failure shows `!` on its candidate (cleared by a new operation for it, its
  disappearance or a Scratch switch); the alert band only for Stage failures
  and the stale-invalidation notices; the integrity slot's `!`; the Staging
  side of the Unstage hold and clear, while the hidden `Returned to Breakdown.`
  stays with Task 245's workspace projection, so it is announced once (F01, F04,
  F06–F09).
- `src/components/triage/triage-workspace.tsx` and test, where the Stage and
  Unstage alerts are created, and `src/hooks/use-staged-candidates.ts` and
  test: route Unstage failures to the candidate instead of the alert; the
  stale-invalidation notices (changed-elsewhere drop cancellation, placement
  closed) stay in the band.
- `src/app/globals.css`: the `staging-node-grid` (one card's minimum width,
  auto-fill, one or two columns) (F10).
- `src/lib/copy/inbox-triage.ts`; `inbox-triage-theme-realization.test.tsx`.

**Dependencies:** Task 245.

**Authority:** F06–F10; MI-21 (Staging part); SPEC §Durable Staging;
DESIGN_TOKENS `DP-VQ06-STAGING` amendment.

**Observable acceptance:** at 1024px with the Pool open a Node card is never
narrower than one card and the well shows one column, two when they fit;
pending shows the loader after 300ms; unknown and reconciling show `?`; an
Unstage failure shows `!` on the candidate and no band; a Stage failure keeps
the band, and so do the stale-invalidation notices; the status icon of a Stage
projection or integrity slot is reachable by keyboard and shows its sentence on
focus.

**Verification:** gate; `expert` review (failure routing); browser checkpoint
with the state switch.

**Commit message:** `feat(inbox): show Staging statuses on the item and widen the Nodes zone`.

### Task 247: [ ] Carry the Undo status in the Undo slot

**Files and actions:** `src/components/triage/hierarchy-explorer.tsx`,
`src/components/grid/node-card.tsx`, `src/components/grid/bit-card.tsx`,
`src/components/triage/grid-explorer-search-results.tsx` and their tests;
`src/lib/copy/inbox-triage.ts`; `src/app/globals.css`: remove the
`newly-status-rail` and its text recovery actions; the slot states of
DESIGN_TOKENS §Undo slot status amendment for ordinary rows and search results;
an unavailable `↶` and an action-less `!` use `aria-disabled="true"`, never
`disabled`; the slot tooltip adds `Select to check again.` or
`Select to try again.`; the card body keeps its Task 179A title tooltip and the
slot shows only its own, one tooltip at a time.

**Dependencies:** Task 246.

**Authority:** F06, F07, F09; SPEC §Actual-card Newly Placed and Undo;
DESIGN_TOKENS Undo slot status amendment.

**Observable acceptance:** each Undo state shows in the slot and no rail
remains; the row keeps its width; `?` checks again and `!` retries; an
unavailable control takes focus and shows its reason on keyboard focus and on
hover; search results behave the same; focus destinations are unchanged; the
card body's Task 179A title tooltip still shows and never doubles with the slot
tooltip.

**Verification:** gate; `expert` review; browser checkpoint with the state
switch, ordinary columns and search; one check of Add, Stage and Undo under
browser network throttling on local Supabase, so the loader and the 300ms delay
are judged under real latency (SPEC §Write feel).

**Commit message:** `feat(inbox): carry the Undo status in the Undo slot`.

### Task 248: [ ] Add the Home button and the breadcrumb reveal

**Files and actions:**
- `src/components/layout/home-button.tsx` and test: top-most on every route;
  navigates to `/` through the sidebar's departure-guarded `navigate`
  (`requestActiveTriageDeparture`), so an Add draft or a pending Inbox
  operation keeps its guard; `aria-current="page"` on L0; the landing emphasis (F21,
  F23).
- `src/components/layout/sidebar.tsx` and test: the order Home, account icon
  (when present), `+`; the Calendar and system-route-only Home goes.
- `src/hooks/use-breadcrumb-reveal.ts` and test: the triggers (hover or focus
  on Home or the breadcrumb, 3 seconds after entering a Node, any Node or Bit
  drag), the 1-second hide with the fade, the deadline picker hold, the `Esc`
  order of SPEC; after `Esc` the hover and focus triggers stay suppressed until
  pointer and focus leave and return, and `Esc` on a segment moves focus to
  Home (F22, F23). Until Task 249 the zone keeps reserving the cells under the
  bar's shown position, as today.
- `src/components/layout/breadcrumbs.tsx`, `breadcrumb-deadline.tsx` and tests:
  the reveal surface in DOM order right after the Home button (no positive
  `tabindex`); only segments and the chip take the pointer; during a drag each
  ancestor segment is a drop target with its signal, the surface is
  translucent and the chip hidden; the chip in the breadcrumb row (F24, F25).
- Tab titles of SPEC §Feedback copy: `src/components/layout/grid-runtime.tsx`
  sets `{title} – {APP_NAME}` on a Node's Grid, `Inbox – {APP_NAME}` and
  `Archive – {APP_NAME}` on the system Nodes and `APP_NAME` alone on L0; the
  Calendar pages (`src/app/calendar/weekly/page.tsx`, `monthly/page.tsx`) and
  `src/app/trash/page.tsx` set `Calendar – {APP_NAME}` and `Trash – {APP_NAME}`;
  `APP_NAME` in `src/lib/constants.ts` (`GridDO` until Task 239).
- `src/components/grid/edit-mode-overlay.tsx`: its document-level `Esc` yields
  to the layer order, so edit mode exits only after the dialog layer, the
  deadline picker and the breadcrumb (user, 2026-10-22).
- `src/lib/animations/motion-language.ts` and `src/lib/constants.ts`: the
  breadcrumb motion and timing tokens of DESIGN_TOKENS §Motion Language.
- `src/hooks/use-toast-anchor.ts`: the stack follows the revealed breadcrumb
  (F12).
- `src/app/globals.css`: `home-button`, `breadcrumb-reveal`,
  `breadcrumb-drop-target`.
- Drag cancel (Phase 49 mi-3): `src/hooks/use-dnd.ts` and its test gain a
  cancel handler that clears `activeItem` and the drag state `handleDragEnd`
  clears, without a write; the `DndContext` in `grid-runtime.tsx` and in
  `src/app/calendar/layout.tsx` wire it to `onDragCancel`, so an
  `Esc`-cancelled drag no longer leaves the cards dimmed, the scroll wrapper
  clipped or the breadcrumb drag-styled or revealed.
- Calendar (Phase 49 mi-1, mi-2), `src/app/calendar/layout.tsx` with
  `calendar-node-creation.test.tsx`, `calendar-bit-creation.test.tsx` and a
  drag-flag test:
  its drags set and clear the toast anchor store's drag flag on start, end and
  cancel, as `grid-runtime.tsx` does, so the stack is translucent and
  pointer-transparent over the Pool and the unschedule zone; its Node and Bit
  create dialogs show the create-dialog sentence of SPEC §Feedback copy
  (`createDialogNoEmptyCell` in `src/lib/copy/feedback.ts`; the target is
  `Home` for a Node, the chosen parent for a Bit) instead of
  `No empty cells available in the root grid.` and
  `No empty cells available in the parent node.`

**Dependencies:** Task 247.

**Authority:** F12, F16 (create dialog), F21–F25; Phase 49 mi-1, mi-2, mi-3;
SPEC §Breadcrumb reveal and Home button, §Feedback copy; DESIGN_TOKENS
§Feedback Status Surfaces, §Motion Language, Sidebar, Breadcrumbs.

**Observable acceptance:** Home sits at the top on every route and reveals the
breadcrumb only on a Node's Grid; the breadcrumb shows for 3 seconds on entry,
on hover or focus and during a drag, and hides 1 second after the pointer and
focus leave; Tab from Home enters its segments; `Esc` follows the layer order;
a card under the bar stays clickable; a drag drops on an ancestor segment;
under reduced motion nothing moves; each page shows its tab title (a Node's
name, `Inbox`, `Archive`, `Calendar`, `Trash`, and the app name alone on L0),
also after client navigation; in edit mode with the breadcrumb shown, one `Esc`
hides the breadcrumb and a second exits edit mode; Home with an Add draft open
shows the departure sheet; the user
rechecks that the deadline is visible
only while the breadcrumb is shown (F25); after an `Esc`-cancelled drag on a
Grid or the Calendar the cards, the breadcrumb and the toast stack return to
their resting state; during a Calendar drag the toast stack is translucent;
a full-Grid create from the Calendar keeps the dialog with the same sentence
as the Grid pages.

**Verification:** gate; `expert` review (reveal state machine, `Esc` order,
DnD pass-through and drag cancel, focus order); browser checkpoint with mouse
and keyboard, including an `Esc`-cancelled drag on a Grid and on the Calendar.

**Commit message:** `feat(shell): add the Home button and the breadcrumb reveal`.

### Task 249: [ ] Remove the blocked breadcrumb zone

**Files and actions:** delete `src/stores/breadcrumb-zone-store.ts` and
`src/lib/utils/breadcrumb-zone.ts` with its test; remove the zone measurement
and every `isCellBlocked` or blocked-cell guard from `grid-runtime.tsx`,
`grid-view.tsx`, `use-grid-actions.ts`, `use-dnd.ts` (with the
`Cell reserved by breadcrumb` toast) and `src/lib/grid-dnd.ts`; remove
`runBreadcrumbZoneMigration` from `datastore.ts`, the Supabase store's no-op
and, if Phase 46 has not removed it, `indexeddb.ts`, with every `settings` use
and no Dexie version bump; delete the reserved top-left block the client
passes as `p_reserved_cells` and stop passing it from `src/lib/db/supabase-store.ts`
and `src/lib/auth/session.ts` (the server parameter stays at its default; no SQL
change, feedback F34); update the tests that cover the zone
(`grid-view.test.tsx`, `use-grid-actions.test.ts`, `use-triage-dnd.test.ts`,
`grid-dnd.test.ts`, `grid-runtime.test.tsx`, `indexeddb.migration.test.ts`).

**Dependencies:** Task 248.

**Authority:** F26, F34; F16 (dropped toast); SCHEMA §Not ported, §Internal
functions; SPEC §Breadcrumb reveal and Home button.

**Observable acceptance:** the cells under the breadcrumb accept Add,
placement and drops like any other cell, including a drag dropped on a
top-left cell under the revealed bar; a restore, an unhide or a promotion into
a Grid whose only free cells are top-left lands there; no zone code or `settings` read or
write remains; every gate passes.

**Verification:** gate; `expert` review (Add, placement and DnD paths); a
search for the zone names returns nothing; browser checkpoint of a create and a
drop into the top-left cells.

**Commit message:** `refactor(grid): remove the blocked breadcrumb zone`.

### Task 250: [ ] Remember the last selected Scratch on this device

**Files and actions:** `src/stores/triage-preferences-store.ts` and test: a
validated `lastSelectedScratchId`; the Inbox selection owner
(`triage-store.ts` and the Pool or Workspace selection path) and their tests:
on first entry, reload or a new session, restore it when it resolves to an
active Scratch of this account, otherwise use the first active Scratch as
today; the search-hidden and Archive or Trash handoff rules are unchanged.

**Dependencies:** this phase's lifecycle gate.

**Authority:** F27; Phase 35 MI-14; SPEC §Scratch Pool (Selection and
re-entry), §Inbox/Triage State Ownership; SCHEMA device preferences.

**Observable acceptance:** a reload returns to the last selected Scratch; a
deleted or archived one, or one from another account, falls back to the first
active Scratch; no domain data is written.

**Verification:** gate; browser checkpoint (reload; another local test user).

**Commit message:** `feat(inbox): remember the last selected Scratch on this device`.

## Phases 36–40 — Retired

Retired as superseded by feedback F28 (user, 2026-10-20/22): the theme set
shrinks to four, and the remaining theme work belongs to the theme stage
(`2026-10-17-theme-scope-replan`). Tasks 180–208 never ran and their numbers
are not reused. Their task text, the original Theme Realization Task Sets and
the Future Theme Realization — Shared Binding Contracts (L1–L7) are in
[the retired-phases archive](execution-plan/archive/phases-36-40-retired.md).
Their deferred items are rebound in [Issues_Deferred.md](issues/Issues_Deferred.md):
Phase 41 MI-2 closed as Dropped; P29-01 and Phase 34 MI-6 to the theme stage.

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
| `db-implementation` | `src/lib/db/indexeddb.ts` | 101, 102, 103, 104, 105, 120–126, 209 |
| `db-interface` | `src/lib/db/datastore.ts` | 103, 105, 120–126, 209 |
| `db-revision-fixtures` (209 writes `cascade-restore.test.ts` only) | `src/lib/db/auto-completion.test.ts`; `src/lib/db/cascade-delete.test.ts`; `src/lib/db/cascade-restore.test.ts`; `src/lib/db/deadline-hierarchy.test.ts`; `src/lib/db/grid-uniqueness.test.ts`; `src/lib/db/indexeddb.migration.test.ts`; `src/lib/db/indexeddb.test.ts`; `src/lib/db/mtime-cascade.test.ts`; `src/lib/db/promotion.test.ts`; `src/lib/db/system-nodes.test.ts` | 101, 103 |
| `db-archive-regression` | `src/lib/db/archive.test.ts` | 101, 103, 125 |
| `db-hard-delete-regression` | `src/lib/db/auto-cleanup.test.ts`; `src/lib/db/cascade-hard-delete.test.ts` | 101, 103, 105 |
| `db-breakdown-regression` | `src/lib/db/scratch-breakdowns.test.ts` | 101, 103, 105, 120 |
| `db-command-harness` | `src/lib/db/inbox-operations.test.ts` | 120 creates; 121, 123, 124, 209 extend |
| `copy` | `src/lib/copy/inbox-triage.ts`; `src/lib/copy/inbox-triage.test.ts` | 128, 138, 140, 141, 143, 144, 147, 148, 150, 151, 153, 154, 157, 160, 162, 210 |
| `global-theme` | `src/app/globals.css` | 129, 138, 140, 141, 143, 144, 147, 148, 150, 151, 153, 154, 157, 160, 162, 176A, 179A, 210, 211; THEMES; feedback lane 241, 243–248 |
| `triage-state` | `src/stores/triage-store.ts`; `src/stores/triage-store.test.ts` | 127, 130, 134, 141, 150, 161, 163, 209, 212, 250 |
| `triage-preferences` | `src/stores/triage-preferences-store.ts`; `src/stores/triage-preferences-store.test.ts` | 127, 130, 132, 250 |
| `breakdown-component` | `src/components/triage/breakdown-panel.tsx` | 132, 136, 137, 138, 139, 140, 142, 143, 145, 147, 148, 159, 160, 161, 162, 176A, 179A, 210, 211 (conditional); BREAKDOWN, ARCHIVE, 245, 233 (offline source) |
| `breakdown-component-test` | `src/components/triage/breakdown-panel.test.tsx` | 101 plus every `breakdown-component` writer |
| `workspace-component` | `src/components/triage/triage-workspace.tsx` | 129, 136, 137, 139, 140, 141, 145, 149, 152, 155, 159, 160, 161, 163, 171A, 176A, 179A, 209 (handoff extraction), 210, 212; POOL, BREAKDOWN, STAGING, PLACE, ARCHIVE; 230 (orphan path), 245, 246 |
| `workspace-component-test` | `src/components/triage/triage-workspace.test.tsx` | 101 plus every `workspace-component` writer; 230, 245, 246 |
| `pool-component` | `src/components/triage/scratch-pool.tsx` | 130, 136, 141, 144, 161, 210, 212 (conditional); POOL |
| `pool-component-test` | `src/components/triage/scratch-pool.test.tsx` | 101 plus every `pool-component` writer |
| `staging-component` | `src/components/triage/staging-zone.tsx`; `src/components/triage/staging-zone.test.tsx` | 133, 142, 145, 146, 147, 148, 176A; STAGING, 246 |
| `drag-token` | `src/components/triage/triage-drag-token.tsx`; `src/components/triage/triage-drag-token.test.tsx` | 133, 142; STAGING |
| `explorer-component` | `src/components/triage/hierarchy-explorer.tsx` | 134, 149–158, 210; EXPLORER, PLACE, 247 |
| `explorer-component-test` | `src/components/triage/hierarchy-explorer.test.tsx` | 101, 134, 149–158, 210; EXPLORER, PLACE, 247 |
| `explorer-results` | `src/components/triage/grid-explorer-search-results.tsx`; `src/components/triage/grid-explorer-search-results.test.tsx` | 151, 158, 171A (conditional); EXPLORER, PLACE, 247 |
| `actual-node-card` | `src/components/grid/node-card.tsx` | 155, 156, 157, 179A; EXPLORER, PLACE only after their exact Q01 approval; 247 (Undo slot) |
| `actual-node-card-test` | `src/components/grid/node-card.test.tsx` | 101, 155, 156, 157, 179A; EXPLORER, PLACE only after their exact Q01 approval; 247 (Undo slot) |
| `actual-bit-card` | `src/components/grid/bit-card.tsx` | 155, 156, 157, 176, 179A; EXPLORER, PLACE only after their exact Q01 approval; 247 (Undo slot) |
| `actual-bit-card-test` | `src/components/grid/bit-card.test.tsx` | 101, 155, 156, 157, 176, 179A; EXPLORER, PLACE only after their exact Q01 approval; 247 (Undo slot) |
| `theme-realization-test` | `src/components/triage/inbox-triage-theme-realization.test.tsx` | THEMES, 176A, 179A, 210, 211; 166 creates, later writers extend while preserving earlier assertions; 241, 245–247 |
| `theme-transition-test` | `src/app/theme-transition.test.ts` | CONFORM, 241 |
| `breakdown-hook` | `src/hooks/use-scratch-breakdowns.ts` | 132, 136, 137, 245, 232, 233 |
| `breakdown-hook-test` | `src/hooks/use-scratch-breakdowns.test.tsx` | 101, 132, 136, 137, 245, 232, 233 |
| `operation-lock` | `src/hooks/use-triage-operation-lock.ts` | 209 |
| `operation-lock-test` | `src/hooks/use-triage-operation-lock.test.tsx` | 136, 137, 139, 145, 152, 156, 161, 209 |
| `inbox-hook` | `src/hooks/use-inbox.ts` | 209, 212 |
| `inbox-hook-test` | `src/hooks/use-inbox.test.tsx` | 101, 130, 209, 212 |
| `candidate-hook` | `src/hooks/use-staged-candidates.ts`; `src/hooks/use-staged-candidates.test.tsx` | 131, 145, 146, 176A, 246, 230 (orphan path) |
| `triage-dnd` | `src/hooks/use-dnd.ts`; `src/hooks/use-triage-dnd.test.ts` | 142, 145, 146, 149, 152, 163, 248, 249 |
| `explorer-search-hook` | `src/hooks/use-grid-explorer-search.ts`; `src/hooks/use-grid-explorer-search.test.tsx` | 135, 151, 158, 171A |
| `placement-hook` | `src/hooks/use-triage-placement.ts`; `src/hooks/use-triage-placement.test.tsx` | 152, 153, 154, 161 |
| `newly-hook` | `src/hooks/use-triage-newly-placed.ts`; `src/hooks/use-triage-newly-placed.test.tsx` | 155, 156, 157, 158, 161, 209 |
| `completion-hook` | `src/hooks/use-can-archive-scratch.ts` | 159, 160 |
| `completion-hook-test` | `src/hooks/use-can-archive-scratch.test.ts` | 101, 159, 160 |
| `archive-coordinator` | `src/hooks/use-archive-scratch.ts`; `src/hooks/use-archive-scratch.test.ts` | 161, 162, 171A |
| `runtime-fixture-test` | `src/components/layout/grid-runtime.test.tsx` | 101, 163; proposed P31-R01 only after Q03 repair approval; 244, 248, 249 |
| `saas-db-tests` | `supabase/tests/helpers/*`; `supabase/tests/coverage.db.test.ts` | 213, 216, then every task that adds a database function |
| `saas-zod` | `src/lib/db/schema.ts`; `src/lib/db/schema.test.ts`; `src/lib/db/boundary-cases.ts` | 214 |
| `saas-snapshot` | `src/lib/db/snapshot-store.ts` and test | 217, 226, 227, 231, 233 |
| `saas-store` | `src/lib/db/supabase-store.ts` and test | 226, 227, 231, 232, 233, 249 (no-op removal) |
| `saas-datastore` | `src/lib/db/datastore.ts` | 226, 227, 228, 230; 249, 243 (development-only injection wrapper) |
| `saas-dexie` | `src/lib/db/indexeddb.ts` | 226, 227, 230; 249 if Phase 46 has not removed the file |
| `saas-dnd` | `src/hooks/use-dnd.ts` | 227, 232; 248, 249 |
| `saas-bit-detail` | `src/components/bit-detail/bit-detail-popup.tsx` | 227, 232 |
| `saas-env-example` | `.env.local.example` | 213, 217, 236 |
| `saas-session` | `src/lib/auth/session.ts` | 228, 235, 236, 238; 249 (stops passing the reserved block) |
| `saas-frame` | `src/components/layout/app-frame.tsx` and test | 228, 234, 235, 236, 238 |
| `saas-sidebar` | `src/components/layout/sidebar.tsx`; `src/components/layout/account-button.tsx` | 232 (kept toast in `sidebar.tsx`), 234, 235; 248 (Home button and order) |
| `saas-providers` | `src/app/providers.tsx` | 228, 232; 244 (Toaster position, colour, stack limit) |
| `feedback-copy` | `src/lib/copy/feedback.ts` | 228, 232, 235, 236, 238; 244 (creates it if first), 245 |
| `saas-db-types` | `src/lib/db/database.types.ts` (generated) | 214 and every task that adds a migration |
| `saas-supabase-config` | `supabase/config.toml`; `supabase/seed.sql` | 213, 229, 236 |
| `inbox-copy-saas` | `src/lib/copy/inbox-triage.ts` | 227, 230 (orphan copy); 245, 246, 247 |
| `saas-hooks` | the 17 hook files of Task 226 | 226, 227, 230; 245 (`use-scratch-breakdowns.ts`), 246 (`use-staged-candidates.ts`), after Phase 45 |
| `state-switch` | the development state switch (feedback F30) | 243 creates it; 231, 233 extend it; 245–247 consume it |
| `cross-lane` | `package.json`; `pnpm-lock.yaml`; `src/lib/constants.ts` | 213, 217, 230, 239 (`APP_NAME`) and the feedback lane (243 `DISPLAY_DELAY_MS`, 248 `APP_NAME` and breadcrumb timings), which may run at the same time. Mutex rule 1 cannot serialize two worktrees; the lane that merges second resolves the conflict when it merges `main`. |
| `feedback-status` | `src/components/feedback/*`; `src/hooks/use-display-delay.ts` and tests | 243 creates; 232 (group-3 loader), 245–248 consume |
| `color-theme` | `src/lib/color-themes.ts`; `src/stores/color-theme-store.ts` and test; `src/components/layout/color-theme-toggle.tsx`; `src/app/layout.tsx` | 241; 239 (`layout.tsx` metadata) |
| `grid-shell` | `src/components/layout/grid-runtime.tsx`; `src/components/layout/breadcrumbs.tsx`; `src/components/layout/breadcrumb-deadline.tsx`; `src/components/grid/grid-view.tsx`; `src/hooks/use-grid-actions.ts`; `src/lib/grid-dnd.ts` and their tests | 244 (`grid-runtime.tsx`), 248, 249, and any SaaS task that names one of them |
| `toast-anchor` | `src/hooks/use-toast-anchor.ts` and test; `src/stores/toast-anchor-store.ts` | 244 creates; 248 extends |
| `reserved-cells` | `src/lib/utils/breadcrumb-zone.ts` (the static top-left block) | 227, 228 read it; 249 deletes it and stops passing it from `supabase-store.ts` and `session.ts` |

## Next Numbers

- **Next planned implementation phase/task:** the SaaS lane continues with Phase 43 / Task 219; the feedback lane continues with Phase 50 / Task 245 after the Phase 45 close. Phases 36–40 are retired. Phases 32 and 33 remain reserved with no tasks.
- **Next unallocated numbers:** Phase 51 / Task 251. Planned Phases 42–50 and
  Tasks 213–250 are allocated; retired Phases 36–40 and Tasks 180–208 keep
  their numbers; none may be reused for another meaning.
- Graph reconciliation: 95 accepted tasks (101–163 plus 105A, 166–172, 171A,
  173–179 plus 176A and 179A, 209–212, 213–218, and 241–244), fourteen
  completed archives (Phases 23–31, 34, 35, 41, 42 and 49), two historical
  unaccepted transfer records (164/165), 29 retired tasks (180–208) in retired
  Phases 36–40, 22 unaccepted tasks (219–240) in Phases 43–48, 6 unaccepted tasks
  (245–250) in Phase 50, and two reserved phases (32–33).
- This amendment and C05/C06/flow review are accepted under their exact-artifact
  receipts. They approve planning, not task acceptance.
