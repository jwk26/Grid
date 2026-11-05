# griddo Inbox/Triage Implementation Execution Plan

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
> (2026-10-29); Task 230 is accepted `[x]` and Phase 46 is closed
> (2026-10-30); Tasks 231–234 are accepted `[x]` and Phase 47 is closed
> (2026-10-30); Tasks 245–250 and repair Task 245A are accepted `[x]` and
> Phase 50 is closed (2026-10-31); Tasks 251–254 are accepted `[x]` and Phase
> 51 is closed (2026-11-05); Tasks 180–208 and Phases 36–40 are retired as
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
> **Stabilization (2026-11-04):** Phase 51, Tasks 251–254, app lane, from the
> [stabilization DECISION](brainstorming/2026-11-04-stabilization-pass/DECISION.md)
> ST01–ST38. It ran beside the account-backup DB lane and closed on
> 2026-11-05. See [Phase 51 — Completed / Archived](#phase-51--completed--archived).
> **Account backup (2026-11-05):** Phases 52–54, Tasks 255–266, `db` lane,
> from the [account-backup DECISION](brainstorming/2026-11-01-account-backup/DECISION.md)
> and the [deletion-grace DECISION](brainstorming/2026-10-31-account-deletion-grace-period/DECISION.md)
> under the backup [PROMOTION_MAP](brainstorming/2026-11-01-account-backup/PROMOTION_MAP.md).
> Phase 52 waits for none and may run beside Phase 51; 53 waits for 52 and 54
> for 53. See [Account Backup — Phases 52–54](#account-backup--phases-5254).
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
| Execution lifecycle | Phases 48, 50 and 51 closed | The Phase 31 publication/sync result is in Final_Close_Phase_31.json. Phase 34 closed through `/end-phase 34` (2026-10-15); Phase 41 (hotfix) closed through `/end-phase 41` (2026-10-16); Phase 35 closed through `/end-phase 35` (2026-10-20); Phase 49 (feedback lane, part 1) closed through `/end-phase 49` (2026-10-24); Phase 42 (SaaS lane, part 1) closed through `/end-phase 42` (2026-10-25); Phase 43 (SaaS lane, part 2) closed through `/end-phase 43` (2026-10-25); Phase 44 (SaaS lane, part 3) closed through `/end-phase 44` (2026-10-26); Phase 45 (SaaS lane, part 4) closed through `/end-phase 45` (2026-10-29); Phase 46 (SaaS lane, part 5) closed through `/end-phase 46` (2026-10-30); Phase 47 (SaaS lane, part 6) closed through `/end-phase 47` (2026-10-30); Phase 50 (feedback lane, part 2) closed through `/end-phase 50` (2026-10-31); Phase 48 (SaaS lane, part 7) closed through `/end-phase 48` (2026-11-02); Phase 51 (stabilization) closed through `/end-phase 51` (2026-11-05). The SaaS and feedback lanes are finished. Phases 36–40 are retired (feedback F28). MI-13 and ISSUE-20-01 were resolved in Task 241; Phase 49 mi-1, mi-2 and mi-3 closed in Task 248, MI-14 in Task 250 and MI-21 in Tasks 245–246; MI-19 closed in Task 229 and MI-23 in Task 234; Phase 45 MI-24 goes to the theme stage; its mi-1 closed in Task 245, mi-2 in Task 246 and mi-3 in Task 249. |
| SaaS conversion | `COMPLETED` | Phases 42 (Tasks 213–218) and 43 (Tasks 219–220) closed and archived (2026-10-25), Phase 44 (Tasks 221–224) on 2026-10-26, Phase 45 (Tasks 225–229) on 2026-10-29, Phase 46 (Task 230) and Phase 47 (Tasks 231–234) on 2026-10-30, Phase 48 (Tasks 235–240 and 238A) on 2026-11-02; every migration is on production; Dexie is removed; MI-8 is closed. The URL is announced after the production smoke (Phase 48 ledger). |
| Stabilization | `COMPLETED` | Phase 51 (Tasks 251–254, app lane) closed and archived (2026-11-05); no migration. What it left is in `Issues_Deferred.md`. |
| Feedback lane | `COMPLETED` | Phase 49 (Tasks 241–244) closed and archived (2026-10-24); Phase 50 (Tasks 245–250 and 245A) closed and archived (2026-10-31). What it left is in `Issues_Deferred.md`. The theme stage follows. |
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
  →235→236→237→238→238A→239→240  Phase 48

Feedback lane:
  241→242→243→244  Phase 49 (waits for none; beside Phases 42–44)
  [Phase 49 + Phase 45 Final Close]→245→245A→246→247→248→249; 250  Phase 50 (beside Phases 46–48)

Stabilization (app lane):
  251→252→253→254  Phase 51 (completed 2026-11-05)

Account backup (db lane):
  255→256→257→258→259  Phase 52 (waits for none; beside Phase 51)
  →260→261→262→263→264  Phase 53
  →265→266  Phase 54

Retired Tasks 164/165 and 180–208 are not dependency nodes.
Cross-phase arrows also require the preceding phase's actual Final Close/main
sync; 166 additionally requires the post-Phase-31 workflow audit disposition.
```

## Phase Index

`Lane` names the lane by role (CLAUDE.md §Workflow, Phase waits): `db` owns
`supabase/`, `app` does not. Phases closed before the role-based lanes
(2026-11-04) show `—`.

| Phase | Lane | Status | Scope | Tasks | Dependency-aware readiness |
|---|---|---|---|---|---|
| Phase 23 | — | Completed | [Model, v4 migration, revisions, real transaction harness, aggregate deletion, and Scratch-promotion guard](execution-plan/archive/phase-23.md) | 101–105 + 105A | Accepted and archived; downstream tasks consume this completed foundation. |
| Phase 24 | — | Completed | [Fourteen user-owned DP receipts covering twelve VQs](execution-plan/archive/phase-24.md) | 106–119 | Accepted and archived; each later realization consumes only its exact released DP edge. |
| Phase 25 | — | Completed | [Eleven authoritative commands plus Archive recovery](execution-plan/archive/phase-25.md) | 120–126 | Accepted and archived; downstream tasks consume the completed command foundation by their exact dependencies. |
| Phase 26 | — | Completed | [Lifetime, copy, and source-backed base-surface owners](execution-plan/archive/phase-26.md) | 127–135 | Accepted and archived; downstream tasks consume only their exact completed dependencies. |
| Phase 27 | — | Completed | [Breakdown, Pool, and Staging headless adapters and exact realizations](execution-plan/archive/phase-27.md) | 136–148 | Accepted and archived; downstream tasks consume only their exact completed dependencies. |
| Phase 28 | — | Completed | [Explorer status/search and pointer placement](execution-plan/archive/phase-28.md) | 149–154 | Accepted and archived; the terminal workflow measurement baseline transfers comparative audit to Phase 29. |
| Phase 29 | — | Completed | [Mounted-page Newly/Undo and comparative workflow audit](execution-plan/archive/phase-29.md) | 155–158 | Accepted and archived; P29-01 remains Explicitly Deferred. Historical Phase 31 audit grants no repair; future narrow Inbox-card authority remains Q01. |
| Phase 30 | — | Completed | [Completion and Archive coordinator/recovery](execution-plan/archive/phase-30.md) | 159–162 | Accepted and archived; bounded Task evidence remains reusable while its relevant inputs and claimed invariants remain unchanged. |
| Phase 31 | — | Completed | [Accepted route integration and technical close](execution-plan/archive/phase-31.md) | 163; 164/165 historical unaccepted transfer only | Technical corrections and fresh candidate verification are owned by Final Close; no theme completion or new task acceptance. |
| Phase 32 | — | Reserved | Retired-number reservation | none | No tasks may be assigned. |
| Phase 33 | — | Reserved | Retired-number reservation | none | No tasks may be assigned. |
| Phase 34 | — | Completed | [Retro Mac regional realization](execution-plan/archive/phase-34.md) | 166–172 + 171A | Accepted and archived; MI-5/6/9 and close Advisory A2 carried in `Issues_Deferred.md`, MI-9 and A2 bound to Task 178. |
| Phase 41 | — | Completed | [Scratch Trash and post-Phase-34 Inbox corrections](execution-plan/archive/phase-41.md) (ran before Phase 35) | 209–212 | Accepted and archived; MI-2 closed as Dropped (user, 2026-10-22; the Terminal theme leaves). |
| Phase 35 | — | Completed | [Neumorphism regional realization](execution-plan/archive/phase-35.md) | 173–179 + 176A + 179A | Accepted and archived; MI-19 bound to Task 229, MI-23 absorbed by Tasks 228 and 234, MI-13 to Task 241, MI-14 to Task 250, MI-21 to Tasks 245–246. |
| Phase 42 | — | Completed | [Database foundation, end-to-end slice and early production](execution-plan/archive/phase-42.md) | 213–218 | Accepted and archived (2026-10-25); MI-1 deferred to the Phase 43 gate watch and MI-8 bound to Task 240 in `Issues_Deferred.md`. Phase 43 may start. |
| Phase 43 | — | Completed | [Ordinary write functions](execution-plan/archive/phase-43.md) | 219–220 | Accepted and archived (2026-10-25); migrations on production; MI-1 deferred to the Phase 44 gate watch in `Issues_Deferred.md`. Phase 44 may start. |
| Phase 44 | — | Completed | [Inbox/Triage command functions](execution-plan/archive/phase-44.md) | 221–224 | Accepted and archived (2026-10-26); migrations on production; MI-1 closed (no recurrence). Phase 45 may start. |
| Phase 45 | — | Completed | [Client switch](execution-plan/archive/phase-45.md) | 225–229 | Accepted and archived (2026-10-29); no migration; MI-19 closed; MI-24, mi-1, mi-2, mi-3 and Phase 35 MI-23 carried in `Issues_Deferred.md`. Phases 46 and 50 may start. |
| Phase 46 | — | Completed | [Dexie removal](execution-plan/archive/phase-46.md) | 230 | Accepted and archived (2026-10-30); no migration; nothing carried over. Phase 47 may start. |
| Phase 47 | — | Completed | [Feel and resilience](execution-plan/archive/phase-47.md) | 231–234 | Accepted and archived (2026-10-30); no migration; Phase 35 MI-23 closed; nothing carried over. Phase 48 may start. |
| Phase 48 | — | Completed | [Accounts and launch](execution-plan/archive/phase-48.md) | 235–240 + 238A | Accepted and archived (2026-11-02); four migrations on production, the close applied none; MI-8 and Phase 50 mi-1 closed; mi-1 to mi-6 carried in `Issues_Deferred.md`. The URL is announced after the production smoke. |
| Phase 49 | — | Completed | [Feedback lane, part 1: theme set, status primitives, toasts](execution-plan/archive/phase-49.md) | 241–244 | Accepted and archived (2026-10-24); ISSUE-20-01 and MI-13 resolved in Task 241; mi-1, mi-2 and mi-3 bound to Task 248 in `Issues_Deferred.md`. Phases 45 and 47 no longer wait for it. |
| Phase 50 | — | Completed | [Feedback lane, part 2: Inbox status, breadcrumb reveal, last Scratch](execution-plan/archive/phase-50.md) | 245–250 + 245A | Accepted and archived (2026-10-31); no migration; Phase 35 MI-14 and MI-21, Phase 45 mi-1–mi-3 and Phase 49 mi-1–mi-3 closed; follow-ups in `Issues_Deferred.md`. The theme stage no longer waits for it. |
| Phases 36–40 | — | Retired (feedback F28, 2026-10-22) | [Terminal, Claymorphism + Origami, GridDO + Tiny Desk, Graphite, and the Task 208 campaign gate](execution-plan/archive/phases-36-40-retired.md) | 180–208 | Retired as superseded; never runnable. Numbers are not reused. |
| Phase 51 | app | Completed | [Stabilization: small fixes, unavailable Grid, Inbox `Esc` and focus, Inbox lock recovery](execution-plan/archive/phase-51.md) | 251–254 | Accepted and archived (2026-11-05); no migration; ISSUE-16-03, ISSUE-20-03, ISSUE-20-04, Phase 48 mi-7, Phase 50 mi-6, mi-8 and the Tasks 245A/246 residual closed; mi-1, mi-3, mi-4 and mi-6 carried in `Issues_Deferred.md`. |
| Phase 52 | db | Planned | [Account backup: toolchain, SQL, Edge Function, sidebar button, production close](#phase-52--account-backup) | 255–259 | Waits for none; may run beside Phase 51. Flow review: [Phases 52–54](reviews/phase-52-54-flow-review.md). |
| Phase 53 | db | Planned | [Account restore: SQL, Edge restore, restoring screen, monthly check, recovery drill](#phase-53--account-restore) | 260–264 | Waits for Phase 52. Flow review: [Phases 52–54](reviews/phase-52-54-flow-review.md). |
| Phase 54 | db | Planned | [Account deletion grace period and cancel](#phase-54--account-deletion-grace-period) | 265–266 | Waits for Phase 53 (reuses its other-tab follow and dialog frame). Flow review: [Phases 52–54](reviews/phase-52-54-flow-review.md). |

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
| `D-ACCOUNT-BACKUP` | Automatic account backup and restore for signed-in accounts, and the first production dump with its restore test. | `2026-11-01-account-backup`; first candidate after the launch. |

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
  `supabase/tests/` and serve as the answer key. The Dexie tests stayed until
  Phase 46 removed them.
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

## Phase 46 — Completed / Archived

SaaS-lane Task 230 is accepted. Its task contract and completion-time scope
are in [the Phase 46 archive](execution-plan/archive/phase-46.md). Dexie,
`fake-indexeddb`, the development slice page and the client orphan path are
gone; the Supabase store is the only `DataStore`. No migration changed, so
nothing went to production. Nothing is carried over.

## Phase 47 — Completed / Archived

SaaS-lane Tasks 231–234 are accepted. Their task contracts and
completion-time scope are in
[the Phase 47 archive](execution-plan/archive/phase-47.md). Ordinary writes
show at once and roll back on a refusal, toasts go through one helper, group 3
controls show the delayed loader, the connection monitor gates writes while
offline, and the sidebar account icon carries the connection badge. No
migration changed, so nothing went to production. Phase 35 MI-23 closed in
Task 234. Nothing is carried over.

## Phase 48 — Completed / Archived

SaaS-lane Tasks 235–240 and 238A are accepted. Their task contracts and
completion-time scope are in
[the Phase 48 archive](execution-plan/archive/phase-48.md). The app has guests
on a demo seed, GitHub and Google sign-in behind the account modal, account
deletion, the daily guest cleanup and the narrow-window notice, and it is named
Grid. Migrations `20261037000000` to `20261040000000` are on production, the
real-account limits are halved (MI-8 closed) and Phase 50 mi-1 closed in Task
235. Phase 48 mi-1 to mi-6 are in
[Issues_Deferred.md](issues/Issues_Deferred.md). The URL is announced after the
production smoke, whose result is in
[the Phase 48 ledger](issues/Issues_Phase_48.md).

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
- **Database:** no task edits `supabase/`, except the one test block Task 249
  deletes (user, 2026-10-31). From Phase 50 the browser checks run
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

## Phase 50 — Completed / Archived

Feedback-lane Tasks 245–250 and repair Task 245A are accepted. Their task
contracts and completion-time scope are in
[the Phase 50 archive](execution-plan/archive/phase-50.md). Inbox statuses sit
on the item, the Undo slot carries the Undo status, the sidebar Home button
reveals the breadcrumb, no Grid cell is reserved for it, and the last selected
Scratch persists per device. Phase 35 MI-14 and MI-21, Phase 45 mi-1, mi-2 and
mi-3 and Phase 49 mi-1, mi-2 and mi-3 closed in these tasks. No migration
changed, so nothing went to production. Carried items are in
[Issues_Deferred.md](issues/Issues_Deferred.md).

## Phase 51 — Completed / Archived

Stabilization Tasks 251–254 are accepted. Their task contracts and
completion-time scope are in
[the Phase 51 archive](execution-plan/archive/phase-51.md). System Nodes no
longer age, a Grid the account cannot use shows an unavailable screen, one
`Esc` closes one Inbox layer, and a held Inbox command whose surface is gone
is checked by the lock owner. ISSUE-16-03, ISSUE-20-03, ISSUE-20-04, Phase 48
mi-7, Phase 50 mi-6 and mi-8 and the Tasks 245A/246 residual closed in these
tasks. No migration changed, so nothing went to production. Carried items are
in [Issues_Deferred.md](issues/Issues_Deferred.md).

## Account Backup — Phases 52–54

Authority: the account-backup [DECISION](brainstorming/2026-11-01-account-backup/DECISION.md)
and the deletion-grace [DECISION](brainstorming/2026-10-31-account-deletion-grace-period/DECISION.md)
under the backup [PROMOTION_MAP](brainstorming/2026-11-01-account-backup/PROMOTION_MAP.md)
(B1–B18); SCHEMA [Account backup amendment](SCHEMA.md), §Schemas and roles,
§Tables, §RLS and grants, §Backup functions, §Snapshot, §Locks, §Account
deletion, §Guest cleanup and §Account backup; SPEC
[Account Backup Amendment](SPEC.md#account-backup-amendment--2026-11-05),
Architecture Decisions 1 and 2, §Account backup, §App-level screens,
§Feedback copy and §Environments And Hosting; DESIGN_TOKENS `DP-BACKUP-01`;
PLANNING_STANDARD §5.2 Phases 52–54 row and §6; CLAUDE.md Architecture 1, 2
and 10, §Gates and §Production.

Flow review: [Phases 52–54 flow review](reviews/phase-52-54-flow-review.md)
covers all three phases.

### Lanes and phase waits

All three are `db` lane phases (CLAUDE.md §Workflow, Phase waits), so only one
is open at a time; the app lane (Phase 51, later the FE/Visual pass) may run
beside any of them.

| Phase | Waits for (Final Close and `main` sync) |
|---|---|
| 52 | None. May run beside Phase 51 |
| 53 | Phase 52 |
| 54 | Phase 53: it reuses 53's other-tab follow (`BroadcastChannel`) and its blurred-frame dialog (B15). The deletion-grace SQL needs only Phase 52 |

Each phase leaves `main` working and protects more: 52 backs up real data, 53
makes it restorable and retires the manual dump, 54 protects from a mistaken
deletion.

### Shared rules for every Phase 52–54 task

- **Gates:** the full CLAUDE.md gate, `pnpm test:db` included, on every task;
  `pnpm check:edge` on every task after Task 255 adds it. A user or production
  step runs `git diff --check` and whatever its task names.
- **SQL:** every task that adds or changes a database function or table
  follows the SQL function checklist in PLANNING_STANDARD §6, adds the
  cross-account and concurrency tests SCHEMA names for it, and gets an
  `expert` review before acceptance. A backup function returns no envelope, so
  the change-set test does not apply to it; `restore_account()` and
  `cancel_account_deletion()` keep it.
- **Edge Function:** every task that changes `supabase/functions/` gets an
  `expert` review before acceptance; its refusal tests send the refused
  request (a body naming another account, a missing or wrong shared secret, an
  `anon` key) and prove the refusal.
- **Local Supabase and storage:** the CLAUDE.md Local Supabase rules apply;
  object tests write only under random user ids and delete their keys (SCHEMA
  §Account backup, Tests).
- **Secrets:** never in chat, Git, logs or the ledger; the ledger records only
  that and when one was set (CLAUDE.md §Production). Local values live in
  `.env.local`, and `.env.local.example` lists their names.
- **Checks:** the agent runs every functional check. Only Tasks 258, 262 and
  266 have a user visual checkpoint (PLANNING_STANDARD §5.2), each prepared
  with the development state switch (CLAUDE.md Forced states).
- **Production:** no production deploy, migration or secret during a phase
  except in its close task (259, 264) and the close itself, after the user's
  approval, in the CLAUDE.md §Production order.
- **App lane coordination:** a UI task (258, 262, 266) merges `main` when it
  starts, since the app lane may have changed the sidebar or the account
  modal. A step that resets the local database (every `pnpm test:db`, the dump
  restore test of Task 259) runs while the app lane is not in a browser check;
  the app lane seeds again after it.
- **Learnings flow:** as Phase 51 (ST29), each close records per task whether
  the work plan carried a `Learnings:` line from
  `docs/execution-plan/LEARNINGS.md` and whether the checkpoint carried a
  `Lesson:` line. A close-time observation, not an acceptance criterion.

### User preparation

Each item is done by the user before the task named, outside chat and Git
(B13).

| Before | Item |
|---|---|
| Task 255 | Check the R2 prices again (DECISION §Why R2); enable Cloudflare R2 (it may ask for a payment method); a development bucket and a token scoped to it, into `.env.local`. `.env.local` never holds a production token or ping URL, since the local cron also runs daily |
| Task 259 | A production bucket and a read-write token scoped to it; a Healthchecks.io account with a daily check (one-day period, three-hour grace; confirm email alerts); the backup-only shared secret; approval of the dump, the function deploy, the secrets and the migrations |
| Task 263 | A read-only token for the production bucket and a second Healthchecks.io check (31-day period), in `chmod 600` files on the Mac and the password app |
| Task 264 | A Google identity on the owner's production account (the drill signs in with Google only); a free active-project slot (no other free project active); the drill project and a drill-only bucket with its own token; the drill project's callback on the development Google client and its redirect allow-list (removed after); approval of the Phase 53 close steps |
| Monthly, from Task 263 | Run the restore check; on a Healthchecks.io email, read the details in the database |

The interim dump of 2026-11-04 (`~/griddo-dumps/2026-11-04/`) is deleted
within 7 days after Task 259's dump passes its restore test (Task 259 step
8).

## Phase 52 — Account backup

Scope: automatic daily backups of signed-in accounts to R2, `Back Up Now`,
status, failure alerts and deleting R2 objects with the account; the sidebar
`Backup` button and dialog without `Restore…`. Leaves behind automatic
backups of real data. Out of scope: restore (Phase 53) and the deletion grace
period (Phase 54).

**Task order:** 255 → 256 → 257 → 258 → 259.

### Task 255: [x] Set up the Edge toolchain and measure the function locally (go/no-go)

**Files and actions:**
- `package.json`, `pnpm-lock.yaml`: Deno pinned as a devDependency if a
  `deno` npm package publishes the binary at the Supabase edge runtime's major
  version, otherwise a documented global install at that version; the script
  `check:edge` (`deno check` and `deno lint` over `supabase/functions/`).
- `tsconfig.json`: `allowImportingTsExtensions`, the `@edge-shared/*` path to
  `supabase/functions/_shared/*`, and `supabase/functions/backup` in
  `exclude`. `vitest.config.ts`: the same alias, and
  `supabase/functions/_shared/**/*.test.ts` in `include`. The ESLint config
  ignores `supabase/functions/backup`.
- `supabase/functions/backup/index.ts`, `deno.json`, `deno.lock`: a minimal
  handler; `supabase/functions/_shared/`: one pure module with its test, to
  prove both checkers and vitest.
- `supabase/config.toml`: `[db.vault]` and `[edge_runtime.secrets]` read their
  values from `.env.local` through `env(...)`; `[functions.backup]` with
  `verify_jwt = false`; the S3 endpoint if needed. (Amended 2026-11-05, Task
  255 MI-2: `[db.vault]` served the local measurement only; Task 256 removes
  it, since `supabase db push` writes it into the target database's Vault.)
  `.env.local.example`: the names.
- `scripts/backup-measure/` (local only, never against production): builds an
  account of about 10 MB raw with SCHEMA's fields and random Hangul syllables
  in SQL under a random test user, a temporary export of the same shape, and
  deletes both at the end and on SIGINT and SIGTERM.
- The Phase 52 ledger: every measurement below, as numbers.

**Measurements and checks** (each recorded with its result):
1. Stream the export into gzip level 1 and upload it, with each candidate S3
   client (a light signer such as `aws4fetch`, and `@aws-sdk/client-s3`):
   go when CPU stays under 500 ms and memory under 64 MB (a quarter of each
   limit).
2. The fingerprint's cost on the 10 MB account.
3. The API request body limit for a roughly 10 MB `restore_stage()` payload;
   if refused, Task 260 stages rows per table.
4. Local object storage: local Supabase Storage's S3 endpoint for
   PutObject, GetObject, ListObjectsV2, DeleteObjects and CopyObject, and the
   bucket's recreation after `supabase db reset`; any failure moves the gates
   to a separate S3-compatible container. The endpoint is an environment
   variable.
5. Real R2, once, with the development bucket: the same five calls.
6. `pg_net` from the database container reaches the local function at the URL
   stored in local Vault (for example through `kong` or
   `host.docker.internal`), and the Vault values come back after a reset. The
   scheduled path (flow review W1): a call longer than `pg_net`'s request
   timeout, whether the run continues once the caller has gone, and so the
   `timeout_milliseconds` and batch size the dispatch uses; the function runs
   with `verify_jwt = false` in `[functions.backup]` and verifies the JWT
   itself for the JWT modes, since the scheduled call carries the shared
   secret, not a JWT.
7. The HTTP status a function killed at its wall clock or memory limit
   returns, for the client's no-answer set (SPEC §Account backup).
8. `.ts`-extension imports and `@edge-shared/*` pass `tsc`, `pnpm build`,
   vitest (both `vitest.config.ts` and `vitest.db.config.ts` get the alias)
   and `deno check`.
9. The unchanged-account check without parsing the stream: the fingerprint
   read first through `backup_fingerprint()`, its cost added to item 2.

**Dependencies:** this phase's lifecycle gate; the user's development bucket
and token.

**Authority:** DECISION §Measurement and acceptance, §Runner; B10, B11, B12;
SPEC §Environments And Hosting.

**Observable acceptance:** the ledger holds each measurement with its numbers
and a go or no-go; the chosen S3 client, object storage and Deno pin are
named; `pnpm check:edge` runs and passes; the gate passes. On a no-go the task
stops and the user chooses between the DECISION fallbacks (the scheduled run
on GitHub Actions, or one account's export split into calls per table) through
a plan amendment.

**Verification:** gate; the measurement script's output (counts and times
only); a deliberately broken `_shared` import fails `tsc` and `deno check`.

**Commit message:** `chore(backup): set up the Edge toolchain and record the local go/no-go`.

### Task 256: [x] Add backup status, export, fingerprint and the daily dispatch in SQL

**Files and actions:**
- A migration: `pg_net`; `app.backup_status` with RLS, its `authenticated`
  select policy and grants; `internal.r2_deletions` with RLS and no policy;
  `internal.account_fingerprint`; `internal.backup_summary_state` with its
  single row;
  `public.export_account` (30 s); the backup functions of SCHEMA §Backup
  functions except the Phase 53 `restore_begin`, `restore_stage` and
  `restore_abort`, with `backup_read_status` in its final signature
  (`p_restore_id` ignored until Task 260); `get_snapshot()`
  with the `backup` key; `internal.dispatch_backups()` and
  `internal.dispatch_backup_summary()` reading Vault (the backup dispatch skips
  accounts with a deletion request; the summary dispatch counts `missing`
  from `auth.users` and sends the count); two `pg_cron` jobs, the
  backup at 17:00 UTC and the summary at 19:00 UTC; the revoke of
  `service_role`'s default grants followed by exactly the SCHEMA list.
- The same migration changes `internal.cleanup_guests()`: lock each target's
  `accounts` row `for update`, check again on the locked row, then delete;
  insert an `internal.r2_deletions` row for each deleted real account in the
  same transaction.
- `src/lib/db/database.types.ts` (generated).
- `supabase/config.toml`: `[db.vault]` removed (Task 255 MI-2; SPEC
  §Environments And Hosting, Backup secrets). A local-only script under
  `scripts/` writes the Vault entries `backup_function_url` and
  `backup_shared_secret` from `.env.local` after a reset, refusing any
  database host but `127.0.0.1` and `localhost`; `package.json` `test:db` runs
  it between `supabase db reset` and the suites.
- `supabase/tests/backup-*.db.test.ts`, `coverage.db.test.ts`: the tests
  below; `src/lib/db/snapshot-store.test.ts`: the current parser accepts a
  value with a `backup` key and ignores it.

**Dependencies:** Task 255 (go).

**Authority:** SCHEMA §Backup functions, §RLS and grants, §Snapshot, §Guest
cleanup, §Account backup; B8, B9, B12; DECISION §Export path, §Backup status,
§Deleting R2 objects.

**`expert` review items:** the SQL checklist for every function; how each
backup function applies RLS as `service_role` and filters by `p_user_id`;
`already_running` and `rate_limited` under the one row lock of
`backup_begin()`; the operation verdicts on the server clock; the cleanup's
lock order against `delete_my_account()` and client writes; that
`statement_timeout` is hoisted by REST; that no backup function needs a right
in `auth`.

**Observable acceptance:** `anon` and `authenticated` get `permission denied`
on every backup function; the `service_role` catalog test passes and fails
when one extra grant is added; a status write for account A leaves B's row
unchanged; a REST call to `export_account()` running past 8 s passes with the
setting and is cut at 8 s without it; the fingerprint changes on a Chunk edit
and not on a `backup_status` write; `backup_begin()` refuses a second manual
run within 5 minutes with `rate_limited`, refuses a run while another is in
progress with `already_running`, gives one refusal for two concurrent calls,
and records a 5-minute-old start as `interrupted`; a verdict read returns
`running`, the result, `interrupted` or `not_started` for the given run id
and never another run's result; `get_snapshot()` carries the caller's `backup` row and never
another account's; with no Vault entry the dispatch functions send nothing;
the cleanup skips an account whose request was cancelled between its query
and its lock, and records an `r2_deletions` row for a deleted real account and
none for a guest; the dispatch sends no call for an account with a deletion
request and the summary's `missing` count leaves it out.

**Verification:** gate; the database suites above through supabase-js
`.rpc()`; a concurrency test of the cleanup against a cancel-like update of
`deletion_requested_at`.

**Commit message:** `feat(db): add backup status, export and daily dispatch`.

### Task 257: [ ] Build the backup Edge Function

**Files and actions:**
- `supabase/functions/backup/`: modes `scheduled` and `summary` (shared
  secret), `manual` and `status` (user JWT verified in the function, user id
  only from `sub`, a JWT with `is_anonymous` refused before any read or
  write);
  stream the export through gzip level 1 to R2; skip an unchanged
  fingerprint; check right before an upload that the account exists and has
  no deletion request; prune after a write; write `identity.json` from the
  auth admin API; record start and result through the backup functions; the
  summary records `interrupted`, counts `missing` and new failures, sums
  `stored_bytes` against 8 GB, processes `r2_deletions`, and pings
  Healthchecks.io (success or `/fail`, counts and reason codes only).
- `supabase/functions/_shared/`: retention and pruning, status judgement,
  object keys, response classification, each with vitest tests.
- `supabase/tests/backup-function.db.test.ts`: integration tests against the
  locally served function with local object storage and a Healthchecks.io
  stub.

**Dependencies:** Task 256.

**Authority:** SCHEMA §Account backup; SPEC §Account backup; B3, B6, B7,
B11, B12; DECISION §Runner, §Retention, §Object key, §Failure alerts,
§Deleting R2 objects, §Limits.

**Observable acceptance:** a `manual` call whose body names another account
backs up only the caller; a guest JWT is refused and leaves no row and no
object; `scheduled` and `summary` without the shared secret are refused; an unchanged account writes no file and records the check; after
writes on 9 different days and across 5 ISO weeks the bucket holds the 7
latest files and the latest of each of 4 earlier weeks, and an unchanged
account keeps its old file; a run that dies after recording its start is
`interrupted` after 5 minutes; an account deleted during a run, or given a deletion request, leaves no
object and records nothing; the summary pings success with no new problem
and `/fail` with one, pings success again when the same account fails on the
next day for the same reason, sends `/fail` once when an account newly
becomes `missing` (no run result of any kind for 36 hours) and once when the
stored total first passes 8 GB, then success again while nothing new appears,
so a new failure on another account still alerts; a permanently failing
account never counts as `missing`; its body holds no id or email; an `r2_deletions` row's objects and row are
deleted, and a row older than three days sends `/fail`; files left from an
earlier run never change a result; files under a key that has no `accounts`
row and no `r2_deletions` row are never deleted (the recovery case).

**Verification:** gate with `pnpm check:edge`; `_shared` vitest suites;
integration suites; `expert` review.

**Commit message:** `feat(backup): add the backup Edge Function`.

### Task 258: [ ] Add the sidebar Backup button and dialog

**Files and actions:**
- Merge `main` first (Phase 51 Task 252 also edits `sidebar.tsx`).
- `src/lib/backup/backup-client.ts` and test: `functions.invoke` on the shared
  client; `EDGE_REQUEST_TIMEOUT_MS` for `Back Up Now`, `REQUEST_TIMEOUT_MS`
  for status; the no-answer statuses with Task 255's measured one.
- `src/hooks/use-backup.ts` and test: status from the snapshot's `backup`
  value, replaced by a newer `Back Up Now` result or status read (later
  `server_now` wins); ages from `server_now`, never the device clock; the
  dialog's single status read; `Back Up Now` with a client-generated run id,
  `already_running`, and its unknown outcome path (one verdict read for that
  run id after the request ended: `Still finishing…`, the result, the red line
  or the did-not-start line, `Check again`), never a resend.
- `src/lib/db/snapshot-store.ts` and test: keep the `backup` value beside the
  account view, refreshed with every snapshot fetch.
- `src/components/layout/backup-button.tsx`, `backup-dialog.tsx` and tests;
  `src/components/layout/sidebar.tsx` and test: the button between the account
  icon and `+`.
- `src/app/globals.css`: the R3 loop and the BK-4 lamp, with reduced-motion
  variants.
- `src/lib/constants.ts`: `EDGE_REQUEST_TIMEOUT_MS = 160000`.
- `src/lib/copy/feedback.ts`: the Backup copy and the guest privacy note.
- `src/lib/dev/state-switch.ts`: backup status overrides (SPEC §Development
  state switch).
- `public/privacy.html`: a backup paragraph (signed-in accounts only, daily,
  Cloudflare R2 outside the main database, the retention, deleted with the
  account).

**Dependencies:** Task 257.

**Authority:** SPEC §Account backup, §Feedback copy, §Development state
switch; DESIGN_TOKENS `DP-BACKUP-01` BK-1–BK-5; B2, B3, B7.

**Observable acceptance:** on every route the sidebar order is Home, account
icon, `Backup`, `+`; a guest's dialog shows `Keep your Grid safe` and the two
sign-in buttons; an account shows each status line with its text, and the
dot only for stale and failed; the running motion shows while a run is in
progress and the still dot under reduced motion; `Back Up Now` shows its
result inline with no toast, the nothing-changed line, and `Try again in a few
minutes.` on a second press, and `Backing up…` with `Check again` while a
scheduled run is in progress; a forced unknown outcome is never resent (one
request in the network log), ends in one verdict read, and shows `Still
finishing…` while the run is open and the did-not-start line when it never
started; after `already_running`, `Check again` reads the status without a
run id and shows the scheduled run's status line, never the did-not-start
line; `Checking…` shows until the status read answers, and a failed read
shows `Couldn't check the backup status.` with `Check again`; after a
successful `Back Up Now` the red dot clears at once; a device clock moved by
an hour changes neither the dot nor the motion; in a non-UTC time zone (for
example `Asia/Seoul`) a backup taken across the UTC date boundary shows the
user's local date and time, not the object name's UTC date; closing the dialog keeps the motion until
the tab sees the result; a scheduled result changes the dot after a tab focus
with no request of its own; the guest privacy note and `public/privacy.html`
carry the backup text.

**Verification:** gate; component and hook tests; the agent's browser checks
on local Supabase with every state forced, the guest dialog, reduced motion,
and `retro-mac`, `neumorphism` and `claymorphism`, light and dark; **Please
check** by the user: two scenes in `griddo`, light and dark, each the sidebar
with the red dot and the account dialog open on the red status, in the
prepared window (CLAUDE.md Test data). The user also confirms the dialog's
action row (DESIGN_TOKENS BK-5).

**Commit message:** `feat(backup): add the sidebar Backup button and dialog`.

### Task 259: [ ] Close Phase 52 on production

**Files and actions** (user and production steps; the ledger records counts,
times and the fact that each secret was set):
1. The first manual dump with the interim dump's commands, and its restore
   test on local Supabase (DECISION §First manual dump and restore test):
   reset the stack from a temporary workdir with no migrations, confirm
   `griddo_writer` is gone, restore with `session_replication_role = replica`
   in one transaction, count orphan rows for every composite foreign key and
   for `user_id` (each 0), compare function owners, ACLs, RLS, policies and
   default privileges, confirm one `cleanup-guests` cron row owned by
   `postgres`, then `pnpm test:db` to bring the branch back. Done while the
   app lane runs no browser check; it seeds again afterwards. The role that
   ran the setting is recorded.
2. Deploy the function with `verify_jwt = false`, then set its secrets and
   the two Vault entries. Before the deploy, confirm from the Supabase CLI
   `2.121.0` documentation or source which `config.toml` sections
   `functions deploy` and `db push` send to the target project
   (`[edge_runtime.secrets]`, `[storage.buckets]` and any other), and that
   none carries a local value into production.
3. Apply the migrations, outside the cron window. Before the push, confirm
   that `config.toml` has no `[db.vault]` (Task 255 MI-2) and that `postgres`
   holds `UPDATE` on `auth.users` (`select has_table_privilege('postgres',
   'auth.users', 'UPDATE')`; Task 218 proved only `DELETE`, and the new
   `cleanup_guests()` locks the auth user `for update`: Task 256 `expert`
   review); after it, confirm that both Vault entries kept the update time
   step 2 gave them.
4. Measure on production with the limit-sized fixture (old 100% caps, about
   9.44 MB raw, built in SQL under a test account, with random text generated
   per row and its compressed-to-raw ratio recorded as the proof, since an
   uncorrelated subquery runs once and repeats one string in every row, Task
   255): three runs of export with upload; the worst under 37.5 s wall
   clock, `export_account()` inside 30 s. The script deletes the account
   and its objects at the end and on SIGINT and SIGTERM.
5. Confirm no new Security Advisor warning, or show each to the user (SCHEMA
   §Database tests).
6. Confirm one successful scheduled run and the summary's success ping.
7. Force an alert: point the summary's ping secret at an invalid URL for one
   cycle, receive the missing-ping email, restore the secret, and see the next
   success. This step takes more than a day: the email comes only after the
   check's one-day period plus its three-hour grace without a ping (about 27
   hours after the last success), and the next success ping comes at the
   following summary.
8. The user deletes the interim dump (`~/griddo-dumps/2026-11-04/`); the
   ledger records the date, which is within 7 days of step 1's passing restore
   test.

**Dependencies:** Task 258; the user's Task 259 preparation and approvals.

**Authority:** CLAUDE.md §Production, §Backup; DECISION §Deploy order,
§Measurement and acceptance, §Failure alerts, §First manual dump and restore
test; B12.

**Observable acceptance:** the restore test passes with every orphan count 0
and the compared catalog unchanged; the function, secrets and migrations are
on production in that order; the measurement's worst run passes; one
scheduled run and its summary succeed; the forced alert email arrived; the
interim dump's deletion is recorded. Then `/end-phase` merges.

**Verification:** the ledger record of each step; `git diff --check`.

**Commit message:** `docs(phase-52): record the production close`.

## Phase 53 — Account restore

Scope: restore with concurrency protection, `Restore…` and the restoring
screen, the monthly restore check and the recovery drill. Leaves behind the
manual dump's retirement once its three conditions hold. Out of scope: pushing
a restore to other devices.

**Task order:** 260 → 261 → 262 → 263 → 264.

### Task 260: [ ] Add restore staging and `restore_account()` in SQL

**Files and actions:**
- A migration: `app.restore_staging` with RLS, `griddo_writer` select and
  update policies and the `service_role` grants (`select`, `insert`,
  `update`); `restore_begin()` (first step, no payload), `restore_stage()`,
  `restore_abort()`; `restore_account()`; `backup_read_status()` with the
  restore verdict by id; the hourly `postgres` `pg_cron` job that deletes
  staging rows older than one hour.
- If Task 255 found the body limit too small, staging takes rows per table.
- `src/lib/db/database.types.ts`; `supabase/tests/restore-*.db.test.ts`.

**Dependencies:** Phase 52 closed.

**Authority:** SCHEMA §Account backup (Restore, Format versions), §Locks; B4,
B5; DECISION §Restore, §Concurrent writes and other tabs.

**`expert` review items:** the full lock list over every write function and
the restore's order; whether `restore_account()` locks the `accounts` row
first or never touches it; the result in the staging row against a result in
`backup_status` (B5); the restore verdicts on the server clock; no deadlock
with Chunk writes and Node moves.

**Observable acceptance:** `restore_account()` cannot read another account's
staging row; a direct browser call applies only what was staged for it; a
fingerprint mismatch writes `account_changed` and changes nothing; an
unsupported `format_version` is refused; after `applied` every restored row's
version is `greatest(backup, current) + 1` and a re-export equals the backup
except `version`; a restore above the row limits keeps every row; the staging
row holds the result and no payload; a restore beside concurrent Chunk writes
and Node moves ends without a deadlock error; `restore_begin()` refuses a
second restore within 10 minutes before anything is staged; a payload missing
a column key restores with the column default (the expand rule); a verdict
read returns `finishing`, the result, `not_applied`, `expired` (row gone,
id still recorded) or `not_started` for the given restore id and never an
earlier restore's result.

**Verification:** gate; database suites including concurrency.

**Commit message:** `feat(db): add restore staging and restore_account`.

### Task 261: [ ] Add restore to the Edge Function

**Files and actions:**
- First, measure locally and record: whether a streamed response passes the
  local gateway unbuffered; and what the database does when the function's
  connection drops while `restore_account()` runs (it commits or rolls back;
  either way the staging row decides).
- `supabase/functions/backup/`: the `restore` mode (JWT verified in the
  function, guests refused), in SCHEMA's order: `restore_begin()` with the
  client's restore id (rate check, staging row); the pre-restore export and
  upload (on failure `restore_abort()`; keep the 5 latest); fetch and unzip
  the chosen file, then `restore_stage()`; call `restore_account()` with the
  user's JWT; stream each step and the result as `text/event-stream`; the
  `status` mode's backup list and verdict by id.
- `supabase/functions/_shared/`: list ordering, pre-restore pruning.
- `supabase/tests/restore-function.db.test.ts`.

**Dependencies:** Task 260.

**Authority:** SCHEMA §Account backup; SPEC §Account backup (Restore); B3–B5.

**Observable acceptance:** a restore body naming another account restores
only the caller; a guest JWT is refused; a rate-limited restore uploads and
prunes nothing; a failed pre-restore upload stops the restore with nothing
changed and a recorded not-applied result; the stream carries the three steps in order and the result; a
dropped connection leaves a staging row whose result, or its absence after
180 s, matches the account's real state; pre-restore files keep the 5 latest;
the list shows date slots and pre-restore entries.

**Verification:** gate with `pnpm check:edge`; integration suites; `expert`
review.

**Commit message:** `feat(backup): restore from the Edge Function`.

### Task 262: [ ] Add `Restore…`, the restoring screen and the other-tab follow

**Files and actions:**
- Merge `main` first.
- `src/lib/backup/backup-client.ts`, `src/hooks/use-backup.ts` and tests: a
  client-generated restore id; the `text/event-stream` restore read under the
  client's own deadline from the request start; `BroadcastChannel`
  `restore-started` and `restore-ended` with the outcome on every terminal
  outcome; the way-out after `EDGE_REQUEST_TIMEOUT_MS` with the verdict for
  that restore id; drop the snapshot and repeat entry on `applied`.
- `backup-dialog.tsx`: `Restore…`, the list, the confirmation.
- `src/components/layout/restoring-screen.tsx` and test, mounted by the app
  frame over the `inert` app.
- `src/lib/copy/feedback.ts`, `src/lib/dev/state-switch.ts`.

**Dependencies:** Task 261.

**Authority:** SPEC §Account backup (Restore), §Feedback copy; DESIGN_TOKENS
BK-5, BK-6; B4, B5.

**Observable acceptance:** a restore shows the three steps as the stream
reaches them and opens the restored account behind the loading frame; a
second tab of the browser blocks on `restore-started`, re-enters on
`restore-ended` after `applied` and unblocks with nothing changed after any
other outcome; `account_changed`, `rate_limited` and `unsupported_format`
return to the dialog with their line and nothing changed; a stalled stream
ends at the client's deadline and goes to the way-out; in `Asia/Seoul` a
backup taken across the UTC date boundary is listed with the local date, not
its object name's UTC date; a forced unknown
outcome reads the verdict once and shows `Still finishing…`, then not applied
or the restored account, and never resends; a verdict for an earlier restore
never shows as this one's; a way-out read two hours later (a sleeping laptop)
gets `expired` and re-enters, never the not-applied line; the second tab's way-out reads
once after `EDGE_REQUEST_TIMEOUT_MS`.

**Verification:** gate; tests; the agent's browser checks with two tabs and
every forced state, reduced motion, and the three other themes, light and
dark; **Please check** by the user: the restoring screen mid-step in `griddo`,
light and dark, in the prepared window.

**Commit message:** `feat(backup): add restore and the restoring screen`.

### Task 263: [ ] Add the monthly restore check

**Files and actions:**
- `scripts/backup-restore-check/` (run on the owner's Mac): with the
  read-only token, download the latest backup of the owner's account; create
  a dedicated local test user (not the fixture user); stage and call
  `restore_account()` through the same SQL path; export again and compare
  every row (equal except `version`, one higher); delete the test user and its
  rows at the end and on SIGINT and SIGTERM; print counts and hashes only;
  ping the 31-day Healthchecks.io check on success. No database reset.
- Its header documents usage; the token file path comes from an environment
  variable.

**Dependencies:** Task 262; the user's Task 263 preparation.

**Authority:** DECISION §Periodic restore check; SCHEMA §Account backup.

**Observable acceptance:** the user's first run passes and pings the check;
an interrupted run leaves no test user; no row content appears in the output.

**Verification:** gate; a test of the comparison on a crafted mismatch.

**Commit message:** `feat(backup): add the monthly restore check`.

### Task 264: [ ] Run the recovery drill and close Phase 53 on production

**Files and actions:**
- `scripts/backup-ops/copy-account` (Mac): finds an account's old key by
  provider user id and copies its objects to the new key in a **target
  bucket given as an argument** (B16): the drill bucket now, the production
  bucket in a real recovery. Across buckets it reads with the read-only
  production token (Task 263) and writes with the target's token (GET and
  PUT); within one bucket it uses CopyObject.
- The drill, recorded in the ledger: a new Supabase project; the migrations
  from Git; unschedule its cron jobs at once; set none of the Healthchecks.io
  URLs, the shared secret or the production token; deploy the function with
  the drill bucket's token; enter the auth settings and the redirect
  allow-list; run the phase branch locally against the drill project's URL and
  publishable key and sign in with Google (development client with the drill
  callback); copy the owner's objects into
  the drill bucket under the new key; restore through the dialog; compare
  counts and hashes with the source; delete the project, the drill bucket and
  the callback.
- The Phase 53 close steps in the CLAUDE.md §Production order (flow review
  G3): dump, migrations (expand, so the deployed Phase 52 function keeps
  working on them), function, then the merge; on
  production, three restore runs of the limit-sized fixture under a test
  account (`restore_account()` inside 30 s, the worst run under 37.5 s wall
  clock) and a check that the streamed steps arrive unbuffered; the script
  cleans up on SIGINT and SIGTERM.
- If the drill passed and Task 263's first run passed (Task 259 proved the
  alert), the ledger records that the three retirement conditions hold and
  that the first SQL phase after Phase 54 removes the manual dump through its
  `/craft-docs` (B17).

**Dependencies:** Task 263; the user's Task 264 preparation.

**Authority:** DECISION §Recovery drill, §Retiring the manual dump, §Object
key; B16; CLAUDE.md §Production, §Backup.

**Observable acceptance:** the drill restores the owner's account in the new
project with matching counts and hashes; the drill project never touched the
production bucket; the production measurement passes; the steps stream on
production; the retirement record is written or its missing condition named.

**Verification:** the ledger record; `git diff --check`.

**Commit message:** `docs(phase-53): record the recovery drill and the production close`.

## Phase 54 — Account deletion grace period

Scope: a 24-hour grace period with `Cancel deletion`, the countdown dialog
and the new copy. Leaves behind protection from a mistaken deletion.

**Task order:** 265 → 266.

### Task 265: [ ] Add the grace period and `cancel_account_deletion()` in SQL

**Files and actions:**
- A migration: `internal.cleanup_guests()` deletes only requests older than
  24 hours, keeping Task 256's lock-then-recheck; `public.cancel_account_deletion()`;
  `ensure_account()`'s `account_deleting` rejection adds
  `deletion_requested_at` and `server_now`.
- `src/lib/db/database.types.ts`; `supabase/tests/account-deletion-*.db.test.ts`.

**Dependencies:** Phase 53 closed.

**Authority:** SCHEMA §Account deletion (Grace period and cancel), §Guest
cleanup; deletion-grace Decisions 1–4, 7, 9.

**Observable acceptance:** a request younger than 24 hours survives the
cleanup and an older one does not; a cancel clears only the caller's request
and succeeds with no request; a cancel that locks first leaves nothing to
delete, and one that waits behind the cleanup gets `account_missing`; a
deleted account's backups are listed in `r2_deletions`, a cancelled one's are
not; the rejection carries both added fields and the current client ignores
them.

**Verification:** gate; database suites with both concurrency orders;
`expert` review.

**Commit message:** `feat(db): add the account deletion grace period and cancel`.

### Task 266: [ ] Add the deletion-grace dialog and copy

**Files and actions:**
- Merge `main` first.
- `src/lib/auth/session.ts` and test: `cancel_account_deletion()`; read the
  rejection's added fields, through one `ensure_account()` call when the
  `account_deleting` came from `get_snapshot()` or a write (flow review G4);
  after a cancel, repeat entry and post the other-tab message on Task 262's
  channel.
- `src/components/layout/deletion-grace-dialog.tsx` and test, in place of the
  account-being-deleted screen in `app-frame.tsx`.
- `src/lib/copy/feedback.ts`: the confirmation, toast and dialog copy.
- `src/lib/dev/state-switch.ts`: the dialog with the countdown near and at
  zero.

**Dependencies:** Task 265.

**Authority:** SPEC Deletion-grace dialog, §Feedback copy; DESIGN_TOKENS
BK-7; deletion-grace Decisions 6, 8, 10.

**Observable acceptance:** after `Delete account` and a new sign-in to the
same account, the blurred empty frame shows the dialog with the deadline in
the user's time zone and a countdown that follows the server's time even with
a wrong device clock; at zero the line changes and `Cancel deletion` stays;
screen readers read the deadline line, not the countdown; `Cancel deletion`
enters the account and the browser's other tabs follow; another browser's
cancel on an already cancelled account enters it; `Continue as guest` starts
a new guest; a forced unknown outcome is decided by one `ensure_account()`
read and never resent; a browser that was already signed in when another
browser deleted the account shows the same dialog with the deadline after its
next refetch; a cancel that meets a deleted account shows the account-deleted
screen; a refused cancel shows `Couldn't cancel the deletion. Try again.`

**Verification:** gate; tests; the agent's browser checks with a shifted
device clock, two tabs and the three other themes, light and dark; **Please
check** by the user: the dialog in `griddo`, light and dark, in the prepared
window.

**Commit message:** `feat(account): add the deletion grace dialog`.

The Phase 54 close: dump, migrations, then the merge (no function change).
The manual dump stays for Phase 54 (user, 2026-11-05, flow review W11); the
first SQL phase after Phase 54 whose `/craft-docs` finds the three retirement
conditions met replaces it.

Before its migrations, the Phase 54 close also rehearses that replacement
once, beside the dump and without blocking the close (control tower, user
2026-11-05): with the user's approval it calls `internal.dispatch_backups()`
once on production, waits for the calls to finish, and reads with one
read-only query how many dispatched accounts have a successful check after the
rehearsal's start and how many failed. The ledger records the counts only. A
failure is recorded as input to the retirement decision, not as a close
blocker.


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
| `global-theme` | `src/app/globals.css` | 129, 138, 140, 141, 143, 144, 147, 148, 150, 151, 153, 154, 157, 160, 162, 176A, 179A, 210, 211; THEMES; feedback lane 241, 243–248; 258 (R3 loop, BK-4 lamp) |
| `triage-state` | `src/stores/triage-store.ts`; `src/stores/triage-store.test.ts` | 127, 130, 134, 141, 150, 161, 163, 209, 212, 250 |
| `triage-preferences` | `src/stores/triage-preferences-store.ts`; `src/stores/triage-preferences-store.test.ts` | 127, 130, 132, 250 |
| `breakdown-component` | `src/components/triage/breakdown-panel.tsx` | 132, 136, 137, 138, 139, 140, 142, 143, 145, 147, 148, 159, 160, 161, 162, 176A, 179A, 210, 211 (conditional); BREAKDOWN, ARCHIVE, 245, 233 (offline source); Phase 51: 253, 254 |
| `breakdown-component-test` | `src/components/triage/breakdown-panel.test.tsx` | 101 plus every `breakdown-component` writer; Phase 51: 253, 254 |
| `workspace-component` | `src/components/triage/triage-workspace.tsx` | 129, 136, 137, 139, 140, 141, 145, 149, 152, 155, 159, 160, 161, 163, 171A, 176A, 179A, 209 (handoff extraction), 210, 212; POOL, BREAKDOWN, STAGING, PLACE, ARCHIVE; 230 (orphan path), 245, 246; Phase 51: 253 (conditional), 254 |
| `workspace-component-test` | `src/components/triage/triage-workspace.test.tsx` | 101 plus every `workspace-component` writer; 230, 245, 246; Phase 51: 253 (conditional), 254 |
| `pool-component` | `src/components/triage/scratch-pool.tsx` | 130, 136, 141, 144, 161, 210, 212 (conditional); POOL |
| `pool-component-test` | `src/components/triage/scratch-pool.test.tsx` | 101 plus every `pool-component` writer |
| `staging-component` | `src/components/triage/staging-zone.tsx`; `src/components/triage/staging-zone.test.tsx` | 133, 142, 145, 146, 147, 148, 176A; STAGING, 246 |
| `drag-token` | `src/components/triage/triage-drag-token.tsx`; `src/components/triage/triage-drag-token.test.tsx` | 133, 142; STAGING |
| `explorer-component` | `src/components/triage/hierarchy-explorer.tsx` | 134, 149–158, 210; EXPLORER, PLACE, 247; Phase 51: 253 |
| `explorer-component-test` | `src/components/triage/hierarchy-explorer.test.tsx` | 101, 134, 149–158, 210; EXPLORER, PLACE, 247; Phase 51: 253 |
| `explorer-results` | `src/components/triage/grid-explorer-search-results.tsx`; `src/components/triage/grid-explorer-search-results.test.tsx` | 151, 158, 171A (conditional); EXPLORER, PLACE, 247 |
| `actual-node-card` | `src/components/grid/node-card.tsx` | 155, 156, 157, 179A; EXPLORER, PLACE only after their exact Q01 approval; 247 (Undo slot); Phase 51: 251 |
| `actual-node-card-test` | `src/components/grid/node-card.test.tsx` | 101, 155, 156, 157, 179A; EXPLORER, PLACE only after their exact Q01 approval; 247 (Undo slot); Phase 51: 251 |
| `actual-bit-card` | `src/components/grid/bit-card.tsx` | 155, 156, 157, 176, 179A; EXPLORER, PLACE only after their exact Q01 approval; 247 (Undo slot) |
| `actual-bit-card-test` | `src/components/grid/bit-card.test.tsx` | 101, 155, 156, 157, 176, 179A; EXPLORER, PLACE only after their exact Q01 approval; 247 (Undo slot) |
| `theme-realization-test` | `src/components/triage/inbox-triage-theme-realization.test.tsx` | THEMES, 176A, 179A, 210, 211; 166 creates, later writers extend while preserving earlier assertions; 241, 245–247 |
| `theme-transition-test` | `src/app/theme-transition.test.ts` | CONFORM, 241 |
| `breakdown-hook` | `src/hooks/use-scratch-breakdowns.ts` | 132, 136, 137, 245, 232, 233; Phase 51: 254 |
| `breakdown-hook-test` | `src/hooks/use-scratch-breakdowns.test.tsx` | 101, 132, 136, 137, 245, 232, 233; Phase 51: 254 |
| `operation-lock` | `src/hooks/use-triage-operation-lock.ts` | 209; Phase 51: 254 |
| `operation-lock-test` | `src/hooks/use-triage-operation-lock.test.tsx` | 136, 137, 139, 145, 152, 156, 161, 209; Phase 51: 254 |
| `inbox-hook` | `src/hooks/use-inbox.ts` | 209, 212 |
| `inbox-hook-test` | `src/hooks/use-inbox.test.tsx` | 101, 130, 209, 212 |
| `candidate-hook` | `src/hooks/use-staged-candidates.ts`; `src/hooks/use-staged-candidates.test.tsx` | 131, 145, 146, 176A, 246, 230 (orphan path) |
| `triage-dnd` | `src/hooks/use-dnd.ts`; `src/hooks/use-triage-dnd.test.ts` | 142, 145, 146, 149, 152, 163, 248, 249; Phase 51: 253, 254 |
| `explorer-search-hook` | `src/hooks/use-grid-explorer-search.ts`; `src/hooks/use-grid-explorer-search.test.tsx` | 135, 151, 158, 171A |
| `placement-hook` | `src/hooks/use-triage-placement.ts`; `src/hooks/use-triage-placement.test.tsx` | 152, 153, 154, 161 |
| `newly-hook` | `src/hooks/use-triage-newly-placed.ts`; `src/hooks/use-triage-newly-placed.test.tsx` | 155, 156, 157, 158, 161, 209 |
| `completion-hook` | `src/hooks/use-can-archive-scratch.ts` | 159, 160 |
| `completion-hook-test` | `src/hooks/use-can-archive-scratch.test.ts` | 101, 159, 160 |
| `archive-coordinator` | `src/hooks/use-archive-scratch.ts`; `src/hooks/use-archive-scratch.test.ts` | 161, 162, 171A |
| `runtime-fixture-test` | `src/components/layout/grid-runtime.test.tsx` | 101, 163; proposed P31-R01 only after Q03 repair approval; 244, 248, 249; Phase 51: 252, 253 (conditional) |
| `saas-db-tests` | `supabase/tests/helpers/*`; `supabase/tests/coverage.db.test.ts` | 213, 216, then every task that adds a database function; Phases 52–54: 256, 257, 260, 261, 265 |
| `saas-zod` | `src/lib/db/schema.ts`; `src/lib/db/schema.test.ts`; `src/lib/db/boundary-cases.ts` | 214 |
| `saas-snapshot` | `src/lib/db/snapshot-store.ts` and test | 217, 226, 227, 231, 233; 256 (parser test), 258 (`backup` value) |
| `saas-store` | `src/lib/db/supabase-store.ts` and test | 226, 227, 231, 232, 233, 249 (no-op removal) |
| `saas-datastore` | `src/lib/db/datastore.ts` | 226, 227, 228, 230; 249, 243 (development-only injection wrapper) |
| `saas-dexie` | `src/lib/db/indexeddb.ts` | 226, 227, 230; 249 if Phase 46 has not removed the file |
| `saas-dnd` | `src/hooks/use-dnd.ts` | 227, 232; 248, 249 |
| `saas-bit-detail` | `src/components/bit-detail/bit-detail-popup.tsx` | 227, 232; Phase 51: 252 (unavailable Bit) |
| `saas-env-example` | `.env.local.example` | 213, 217, 236; 255 |
| `saas-session` | `src/lib/auth/session.ts` | 228, 235, 236, 238; 249 (stops passing the reserved block); 266 (cancel) |
| `saas-frame` | `src/components/layout/app-frame.tsx` and test | 228, 234, 235, 236, 238; Phase 51: 252 (shared screen block); 262 (restoring screen mount), 266 (deletion-grace dialog) |
| `saas-sidebar` | `src/components/layout/sidebar.tsx`; `src/components/layout/account-button.tsx` | 232 (kept toast in `sidebar.tsx`), 234, 235; 248 (Home button and order); Phase 51: 252 (disabled `+`); Phase 52: 258 (`Backup` button; app lane in parallel, so 258 merges `main` when it starts and the lane that merges second resolves the conflict) |
| `saas-providers` | `src/app/providers.tsx` | 228, 232; 244 (Toaster position, colour, stack limit) |
| `feedback-copy` | `src/lib/copy/feedback.ts` | 228, 232, 235, 236, 238; 244 (creates it if first), 245; Phase 51: 252; 258, 262, 266 |
| `saas-db-types` | `src/lib/db/database.types.ts` (generated) | 214 and every task that adds a migration; 256, 260, 265 |
| `saas-supabase-config` | `supabase/config.toml`; `supabase/seed.sql` | 213, 229, 236; 255 (Vault and edge secrets from `.env.local`); 256 (`[db.vault]` removed, Vault entries by a local script) |
| `inbox-copy-saas` | `src/lib/copy/inbox-triage.ts` | 227, 230 (orphan copy); 245, 246, 247 |
| `saas-hooks` | the 17 hook files of Task 226 | 226, 227, 230; 245 (`use-scratch-breakdowns.ts`), 246 (`use-staged-candidates.ts`), after Phase 45 |
| `state-switch` | the development state switch (feedback F30) | 243 creates it; 231, 233 extend it; 245–247 consume it; 258, 262, 266 extend it |
| `cross-lane` | `package.json`; `pnpm-lock.yaml`; `src/lib/constants.ts` | 213, 217, 230, 239 (`APP_NAME`) and the feedback lane (243 `DISPLAY_DELAY_MS`, 248 `APP_NAME` and breadcrumb timings), which may run at the same time. Mutex rule 1 cannot serialize two worktrees; the lane that merges second resolves the conflict when it merges `main`. |
| `feedback-status` | `src/components/feedback/*`; `src/hooks/use-display-delay.ts` and tests | 243 creates; 232 (group-3 loader), 245–248 consume |
| `color-theme` | `src/lib/color-themes.ts`; `src/stores/color-theme-store.ts` and test; `src/components/layout/color-theme-toggle.tsx`; `src/app/layout.tsx` | 241; 239 (`layout.tsx` metadata) |
| `grid-shell` | `src/components/layout/grid-runtime.tsx`; `src/components/layout/breadcrumbs.tsx`; `src/components/layout/breadcrumb-deadline.tsx`; `src/components/grid/grid-view.tsx`; `src/hooks/use-grid-actions.ts`; `src/lib/grid-dnd.ts` and their tests | 244 (`grid-runtime.tsx`), 248, 249, and any SaaS task that names one of them; Phase 51: 251 (`grid-view.tsx`), 252 (`grid-runtime.tsx`, `breadcrumbs.tsx` conditional), 253 (`grid-runtime.tsx`) |
| `toast-anchor` | `src/hooks/use-toast-anchor.ts` and test; `src/stores/toast-anchor-store.ts` | 244 creates; 248 extends |
| `cross-lane-tooling` | `tsconfig.json`; `vitest.config.ts`; the ESLint config; `package.json` scripts and the Deno pin | 255. The app lane may also touch these; the lane that merges second resolves the conflict when it merges `main` |
| `backup-edge` | `supabase/functions/backup/*`; `supabase/functions/_shared/*` and tests | 255 creates; 257, 261 |
| `backup-client` | `src/lib/backup/backup-client.ts`; `src/hooks/use-backup.ts`; `src/components/layout/backup-button.tsx`; `src/components/layout/backup-dialog.tsx` and tests | 258 creates; 262 extends |
| `backup-constants` | `EDGE_REQUEST_TIMEOUT_MS` in `src/lib/constants.ts` (the `cross-lane` row) | 258 |
| `privacy-page` | `public/privacy.html` | 240; 258 (backup paragraph) |
| `reserved-cells` | `BREADCRUMB_RESERVED_CELLS` in `src/lib/db/supabase-calls.ts` (the static top-left block) | 227, 228 read it; 249 deleted it and stopped passing it |

## Next Numbers

- **Next planned implementation phase/task:** Phase 52 / Task 255 onward (account backup, db lane, open); Phase 51 is closed (2026-11-05). The theme stage (`2026-10-17-theme-scope-replan`) comes through `/craft-docs`. Phases 36–40 are retired. Phases 32 and 33 remain reserved with no tasks.
- **Next unallocated numbers:** Phase 55 / Task 267. Planned Phases 42–54 and
  Tasks 213–266 are allocated; retired Phases 36–40 and Tasks 180–208 keep
  their numbers; none may be reused for another meaning.
- Graph reconciliation: 129 accepted tasks (101–163 plus 105A, 166–172, 171A,
  173–179 plus 176A and 179A, 209–212, 213–240 plus 238A, 241–244, 245–250
  plus 245A, and 251–254), twenty-two completed archives (Phases 23–31, 34, 35
  and 41–51), two historical unaccepted transfer records (164/165), 29 retired
  tasks (180–208) in retired Phases 36–40, two reserved phases (32–33), and
  twelve planned tasks (255–266) in Phases 52–54.
- This amendment and C05/C06/flow review are accepted under their exact-artifact
  receipts. They approve planning, not task acceptance.
