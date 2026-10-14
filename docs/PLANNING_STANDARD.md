# Planning & Verification Standard

> **Purpose:** Prevent the three failure modes that cause document-driven development to break down:
> plan omission, false completion, and implementation deviation.
>
> **Consumed by:** `/craft-docs`, `/run-phase`, `/run-task`, and `/end-phase`
> **Owned by:** The project — skills execute the process, this document defines it.
> **2026-10-03 amendment status:** **User-approved 2026-10-03**, recorded in the
> historical [planning-standard receipt](receipts/Craft_Docs.inbox-triage-theme-realization-planning-standard.json).
> The regional-realization and staged-verification rules below derive
> from the [approved current promotion map](brainstorming/2026-10-03-inbox_triage_theme_realization/PROMOTION_MAP.md),
> [design receipt](receipts/Craft_Docs.inbox-triage-theme-realization-design.json)
> and [execution-plan receipt](receipts/Craft_Docs.inbox-triage-theme-realization-execution.json).
> **Workflow update — 2026-10-15:** §2 Enforcement, §3, §5.2–5.3 and §6 now name
> the 3rd-generation skills and `CLAUDE.md` instead of the Codex adapter and
> receipts. See [WORKFLOW](WORKFLOW.md#workflow-lineage).
> **Prior Inbox/Triage amendment status:** **User-approved 2026-07-28.**
> **Canonical-to-production parity amendment:** **User-approved 2026-07-28.**
> The exact pre-receipt artifact is identified in the maintenance receipt
> below.
> **Historical production derivation evidence:** reviewed Fresh planning-standard SHA-256
> `24c2e879bfd006c04da23d80830108a0f85d4693e3367e3825e9841b5bc05119`
> is read-only evidence, not canonical authority. The foundation authority was the
> approved map `90022e7`, recipe package `7a15451`, SCHEMA `8101658`, SPEC
> `53c3fe9`, DESIGN_TOKENS `39ad25b`, clean EXECUTION_PLAN `dbe5b6b`, and
> clean flow review `c4e8d29` receipts.
> Their completion-time statements remain historical. Current amendment
> acceptance is owned by matching exact-artifact receipts, not by the preserved
> Draft headings in an approved map/design/plan snapshot.

## Table of Contents

1. [Three Failure Modes](#1-three-failure-modes)
2. [Inference Boundary Rules](#2-inference-boundary-rules)
3. [Flow-Trace Review](#3-flow-trace-review)
4. [Gap Resolution Protocol](#4-gap-resolution-protocol)
5. [User-Visible Verification](#5-user-visible-verification)
   - [Regional first-submission quality](#51-regional-first-submission-quality)
   - [Applicable-theme verification and retained full gate](#52-applicable-theme-verification-and-retained-full-gate)
   - [Visual checks and independent dispositions](#53-visual-checks-and-independent-dispositions)
6. [Architecture Conformance Checklist](#6-architecture-conformance-checklist)

---

## Historical Inbox/Triage PLANNING_STANDARD Approval Receipt — 2026-07-28

- **Gate:** the reusable planning, typed-prerequisite, flow-review,
  user-visible verification, and architecture-conformance rules required by
  the approved Phase 23–33 campaign.
- **User disposition:** approved through the user's 2026-07-28 instruction to
  complete every canonical document through the final independent flow review.
- **Approved artifact:** commit `ddaf116`, containing the exact pre-receipt
  `docs/PLANNING_STANDARD.md` whose SHA-256 is
  `0ee0feef14a2f32df7fbc7e3710ae407527f94259f33a47e90e4f22f7fc8c947`.
- **Parent receipts:** promotion map `90022e7`, recipe package `7a15451`,
  SCHEMA `250a1b5`, SPEC `53c3fe9`, DESIGN_TOKENS `39ad25b`, and
  EXECUTION_PLAN `92c6d4a`.
- **Preserved project rules:** the core GridDO architecture checklist, active
  lifecycle filters, system-field guards, Phase 8 verification history, and
  omission-audit origin remain in force.
- **Fresh reusable additions:** typed Decision-prerequisite edges, separate
  flow ownership/readiness status, lifetime-correct hook/store ownership,
  complete atomic postconditions, monotonic CAS/ABA coverage, no general
  operation log, audit retention, dedicated Explorer search, exact Undo
  semantics, VQ no-fallback, and source/rendered evidence separation.
- **Acceptance boundary:** this receipt accepts no implementation, task,
  phase, issue, branch, publication, VQ decision, or `[x]` marker. All twelve
  prerequisites remain open and all five selected deferrals remain deferred.
- **Historical next legal action:** perform the independent production flow review against
  the receipt-bearing canonical chain and complete Phase 23–33 plan; record
  ownership and readiness as separate outcomes.

### Canonical-To-Production Parity Receipt — 2026-07-28

- **Gate:** add one reusable, blocking pre-approval rule for factual parity
  between canonical claims and current production source.
- **User disposition:** approved on 2026-07-28 after independent hash/diff
  review and an explicit clarification of evidence granularity.
- **Approved artifact:** commit
  `e841ab4f49d8daa14f4d1ae3b858b035c3a2b48e`, containing the exact
  pre-receipt `docs/PLANNING_STANDARD.md` whose SHA-256 is
  `e9686fd2dcf34db58ad783c4c71265f306761b01f5ec2621ecdde594c011a746`.
- **Rule:** before an affected canonical gate, `$craft-docs` enumerates current
  production constants, paths, exports/signatures, stores/indexes, routes, and
  owners claimed in code examples, prose tables, or constraint cells; it
  inspects exact source and records the targeted command and result.
- **Evidence granularity:** one evidence block in the same canonical document
  may cover multiple explicitly named literals/sections and their production
  sources. Repetition in every table cell is not required.
- **Applied evidence:** targeted `rg` inspection of `docs/SCHEMA.md`,
  `src/lib/constants.ts`, and `src/lib/db/schema.ts` confirmed
  `GRID_COLS = 18`, `GRID_ROWS = 9`, shared `gridXSchema` / `gridYSchema`
  derivation, and both Node/Bit uses before the SCHEMA maintenance gate.
- **Preserved scope:** this rule changes no product meaning, data shape,
  execution task, flow owner, VQ, deferral, implementation, or acceptance
  marker. Historical receipts above remain historical evidence; the current
  authority chain is named in the document header.
- **Skill follow-up:** the next approved `craft-docs` efficiency/refactor pass
  should add a low-cost mechanical extractor/checker for production symbols
  and the canonical code/table claims that cite them. That tool is not part of
  this project-document gate and is not claimed implemented here.
- **Historical next legal action:** the canonical-document campaign is complete. Do not
  invoke implementation until `run-phase`, `run-task`, and `end-phase` adapter
  fields are refreshed and separately approved.

### Targeted planning-standard amendment provenance — 2026-10-03

Selected DECISION D07–D08, D10–D28 and the approved promotion map's C05
own this amendment; D33 supplies only this campaign's direct-review owner.
The map's exact artifact is
`3b95de179fcc10568f8967a89a5f9eb9adaa5f11`, SHA-256
`261d233c76d1641bccb7f4381035d3b10b79b3c61826237f9e71a04a32ad0d79`.
The approved design artifact is `fef8617c2ecf3b8a9fe0335974cbc892d23a05b4`,
SHA-256 `888a61ff583016d984d8f3209e72af5688254e9cd7b68e07d9e181bdf80fa14b`;
the approved execution artifact is `ce020ab2654fab7b9c200bb4d4a28f69de7c31d4`,
SHA-256 `d344fb149cd6be555aaeb03a45384a30d99561b53bd43f2497406802230e3b12`.
Their linked receipts own later acceptance without changing those artifact bytes.

This is a project-specific realization/verification amendment, not a new
behavior, storage model, numeric design value or global lifecycle procedure.
Existing persistence, transaction, state-lifetime, copy, DP and deferral
contracts remain unchanged. No prototype, browser or product gate was executed
for this document; requirements below are future checks, not current passes.
The preserved Phase 8 note and July receipts are historical scopes, not an
extra correction limit or current matrix requirement for the new theme tasks.

---

## 1. Three Failure Modes

### 1. Plan Omission

A user-visible flow exists in PRD/SPEC but no task owns it clearly enough in EXECUTION_PLAN.md.

- **Phase:** Document phase (`$craft-docs` final independent review)
- **Mechanism:** Flow Ownership Review
- **Goal:** Prevent gaps before implementation starts

### 2. False Completion

A task is marked done but its acceptance criteria were not actually satisfied.

- **Phase:** Implementation phase (per-task/flow-cluster verification)
- **Mechanism:** Observable acceptance criteria + user-visible verification
- **Goal:** Make "done" harder to claim without evidence

### 3. Implementation Deviation

Code contradicts the intended architecture, abstraction, or reactive model.

- **Phase:** Closing/merge phase (`$end-phase` architecture review)
- **Mechanism:** Architecture Conformance Review
- **Goal:** Catch structural violations before merge

---

## 2. Inference Boundary Rules

Three tiers:

- **User-visible decisions** — MUST be explicit in the plan. What the user clicks, what opens, what route/state changes, what happens at boundaries.
- **Architectural invariants** — MUST be explicit in the plan OR checked by conformance review. Abstraction boundaries, reactive model guarantees, data flow patterns, migration-sensitive rules.
- **Developer-visible implementation details** — MAY be left to implementer judgment. React patterns, hook internals, CSS details within a token system, error handling for impossible states.

**Rule of thumb:** if a user would notice the decision, it must be explicit. If only a developer would notice, it can be inferred — unless it's an architectural invariant.

For source-backed visual work, CSS mechanics within approved owners are an
implementation detail; choosing an unsourced font, geometry, icon, status or
behavior is not. Trace appearance to its exact recipe/source/DP and confirm
the rendered result rather than substituting a theme-wide default. A measured
conflict with a retained decision returns only the affected element/state to
its user-owned prerequisite; neither a prototype nor adjacent chrome chooses
the outcome. The current map's Q01/Q02 boundaries remain in force.

### Code-Readiness Invariant

Five rules govern what may appear in an active execution plan:

1. **Code-ready runnable tasks.** Every runnable implementation slice must be
   implementable from its task spec and approved canonical authority without
   another product, design, or policy choice. Developer-visible mechanics may
   be inferred only inside the declared boundary.

2. **Typed Decision prerequisites.** An unresolved user-owned decision appears
   as a named gate with its owner, missing decision, exact resume condition,
   and explicit dependency edge to the affected task or task slice. A runnable
   non-code decision task may collect and record the matching decision in the
   plan or ledger; the dependent implementation remains non-runnable until that
   decision is recorded and committed.
   Silence never selects a fallback, and the gate may not hide unresolved
   architecture, persistence, product scope, or policy.

3. **Readiness is dependency-aware.** A plan may preserve approved future
   implementation behind Decision prerequisites while independent foundations
   remain runnable. Flow ownership can be complete while implementation
   readiness is blocked. Reports name the smallest blocked slice; an open edge
   must not transitively block unrelated foundations through a blanket phase
   dependency.

4. **Deferred work stays deferred.** Unscheduled features and intentionally
   deferred scope stay in the project-declared deferred owner rather than
   entering an active task. A Decision prerequisite is not a holding area for
   speculation; it exists only when approved active scope depends on the user
   decision.

5. **Canonical-to-production facts are checked, not copied from memory.**
   Before a canonical draft or execution plan that names a current production
   constant, path, export/signature, store/index, route, or owner becomes
   approval-ready, enumerate every affected claim in code examples **and** in
   prose tables or constraint cells, inspect the exact production source, and
   record the targeted command and result. Code-like bounds or invariants stay
   symbol-derived rather than duplicating a current literal. A descriptive
   current-value literal may remain only when its production symbol/source and
   parity evidence are explicit. Any mismatch reopens the owning upstream
   document. Parity evidence may be centralized once in the same canonical
   document when it unambiguously names every affected literal or section and
   its production source; it need not be repeated in every table cell. Flow
   ownership PASS does not substitute for factual parity.

**Enforcement:** `/craft-docs` checks canonical-to-production parity before
asking for the affected document's approval. `/run-phase` checks the active
plan, the prerequisite graph, recorded decisions and drift against the code
before creating the branch or worktree. `/run-task` rechecks the selected
task/slice and stops when a required decision is missing.

---

## 3. Flow-Trace Review

### Purpose

Trace every user-visible/system-critical flow from the selected approved
authority through canonical contracts and the execution plan. For a
Brainstorming amendment, use the selected DECISION and complete approved map;
do not treat the historical `docs/prd.md` or nearby notes as current authority.
Verify each segment's task/file/action, data effects and observable acceptance.

### When it runs

After EXECUTION_PLAN.md is generated or materially amended by `/craft-docs`,
with the required canonical approval chain. The `expert` subagent, independent
from the plan author, performs it, and the review repeats until no Gap remains.
A drafting audit is not the final flow-review pass. (The 2026-10-03 amendment
was reviewed directly by its Control Tower under D33. That exception was not
standing.)

### Flow-trace table template

```markdown
# Flow-Trace Review — [Phase/Scope]

**Reviewed:** YYYY-MM-DD
**Inputs:** selected approved source/map, canonical contracts named in `CLAUDE.md`, approved execution plan and actual affected diffs
**Decision prerequisites:** [IDs, owners, recorded decision or scope-out status]

## Flow-Trace Table

| # | Flow / exact source citation | Entry / actor / authority | States and data effects | Task / file / action | Observable acceptance | Decision Prerequisite / Record | Boundary Cases | Ownership Status |
|---|------------------------------|--------------------------|------------------------|----------------------|-----------------------|--------------------------------|----------------|------------------|

Ownership Status: ✅ Owned | ⚠️ Weak | ❌ Gap | ⏸️ Deferred

An open Decision prerequisite does not by itself make ownership weak: the flow
may be fully owned while its implementation remains blocked. Never collapse
flow ownership and implementation readiness into one status.
Expand only the states that apply, including empty/loading/error/interruption/
cancel/retry and transaction/recovery boundaries. Read-only presentation
consumers do not become command owners. Check the complete flow index and
actual changed sections, not only a packet, item count or new-task subset.

## Gaps Found (if any)

| # | Flow | Gap Type | Description | Recommended Resolution |
|---|------|----------|-------------|----------------------|

## Summary

- Flows traced: N
- Fully owned: N
- Weak: N
- Gaps: N
- Deferred: N
- Decision prerequisites: N open / N closed / N explicitly scoped out
- Open prerequisite IDs and exact blocked task or task slices: [list]
- Flow ownership: PASS / GAPS FOUND
- Implementation readiness: READY / BLOCKED_PENDING_USER_DECISIONS / BLOCKED_OTHER
```

### Review artifact location

`docs/reviews/phase-N-flow-review.md` (or `docs/reviews/scope-description-flow-review.md` for non-phase-based reviews)

---

## 4. Gap Resolution Protocol

When the flow-trace review identifies a gap, the resolution must be one of:

1. **Amend the execution plan** — add or strengthen task ownership, acceptance criteria, or boundary case handling
2. **Revise upstream document** — if the gap reveals a SPEC/SCHEMA ambiguity, resolve it in the upstream document first, then amend the plan
3. **Add an explicit defer note** — if the flow is intentionally out of scope, add a defer note with rationale to Cross-Cutting Concerns or the relevant task

**Never proceed to implementation with known ownership gaps.** An open typed
Decision prerequisite is not an ownership gap, but its dependent implementation
slice remains blocked. Re-run the review on affected sections after amendments.
Surface to the user if the review loop exceeds 3 iterations.

---

## 5. User-Visible Verification

### Purpose

Reduce false completion by making "done" concretely verifiable for user-facing tasks.

### How it works

- User-facing tasks (those that change user-visible behavior) are identified by their **acceptance criteria** — written as verification questions describing **user-visible outcomes confirmable in the running app**. This is the load-bearing convention in this project.
- The `Visibility: User-facing` tag is **optional** here: the execution plan has historically relied on these observable acceptance criteria rather than the tag, and `$end-phase` identifies user-facing tasks by them. Add the tag only if the project later adopts tagging as a convention.
- Verification happens close to implementation time — per task or per small flow cluster (2-3 tightly related tasks completing one user-visible flow)
- `$end-phase` confirms verification was completed, but does not duplicate it

### Observable acceptance criteria examples

**Good (observable):**
- "Click + at Level 1-2 → Node/Bit chooser popover appears with two options"
- "In edit mode, click a Node → EditNodeDialog opens with pre-populated title, icon, color"
- "When the schema-owned grid capacity is exhausted, click + → the approved full-grid feedback appears"
- "Calendar button displays a colored dot when any active item has a deadline within 3 days"

**Bad (not observable):**
- "Urgency dot appears on Calendar button" (when? what triggers it? what does it look like?)
- "BitCard shows completion state" (what does completion look like? strikethrough? gray? both?)
- "Creation flow works at all levels" (what specifically happens at each level?)

These examples illustrate observability, not new capacity, wording or product
threshold authority. Actual limits, actions and copy come from their owning
approved contracts.

### 5.1 Regional first-submission quality

These rules apply to approved Inbox/Triage prototype-to-production realization,
not every unrelated task. DESIGN_TOKENS
[realization and token ownership](DESIGN_TOKENS.md#prototype-to-production-realization-and-token-ownership)
owns the visual boundary; EXECUTION_PLAN
[shared binding contracts](EXECUTION_PLAN.md#future-theme-realization--shared-binding-contracts)
own the exact region order, component/test owners and task-local outputs.
The external `/Users/jwk/Documents/docs/prototype-to-production.md` is reusable
methodology context only, not a canonical approval or executable source.

**Before implementation and first submission:** independently match logical
data, selection, query/sort/edit/staged state and browser conditions. For each
visible frame, title, meta line, button, icon, row, input, empty state and
decoration, connect prototype source/DOM → computed style/geometry → the actual
production owner. Resolve element-specific typography, coordinates/dimensions,
spacing, colors/background, border/radius and shadow after fonts/theme/layout
settle. A CSS declaration or common theme-font assumption is not that evidence.

Keep two contracts: the exact adopted appearance, and preserved production
commands/state/lifetime/copy/accessibility/focus. Include production-only
Save/Cancel, attached status, pending/error/locked/recovery and replacement
search states; their absence from the prototype is not removal authority.
Retained DP realization supplies its exact approved surface. An unsupported
new surface or measured contract conflict remains an affected-slice user
decision, never a nearby card/dialog/chrome fallback.

After the first implementation, inspect fresh original-size 1:1 comparisons,
repair observable differences within the approved owners,
and compare again **before the first user submission**. Disclose any retained
difference and reason; resizing, cropping away a difference or presenting only
the most similar state does not prove fidelity. No numeric score or new pixel
threshold substitutes for the user's visual judgment.

Hover, focus, DnD and adopted animation require actual triggers, transitions,
interruption/retrigger and reduced-motion checks as applicable; one settled
image cannot prove them. Commands and authoritative success remain controlled
by canonical behavior, not animation timing. Use actual mounted pointer/
keyboard/focus/state changes, separately from direct component tests.

Each region needs explicit user visual disposition before the next region.
For paired themes, record separate results for both. Keep earlier accepted
regions/themes usable when extending shared semantic components or aliases.
Routine correspondence, measurement, implementation and bounded internal
refinement may stay in the same coherent approved Working scope; no separate
contract-only session or extra generic approval sentence is required. New
design decisions, owner expansion and the `/run-task` stop conditions
remain their own gates. A pending remainder cannot be hidden to advance.

### 5.2 Applicable-theme verification and retained full gate

This amendment supersedes the former blanket **Phase 23–33 eight-theme visual
verification** predicate for the current continuation. It does not revise
completed phase evidence, reopen Phase 30 or relax unchanged architectural
invariants. The approved execution plan's transfer register moves unaccepted
164/165 responsibilities; it does not accept them or claim their checks passed.

| Current scope | Applicable verification | Completion boundary |
|---|---|---|
| Phase 31 technical close (completed) | Accepted Task 163 integration, separately approved corrections, affected route/state/focus and unrelated-surface preservation; adapter logical technical gates and issue dispositions at the actual close candidate. | No eight-theme visual-completion or Task 165 pass is claimed. Transfer does not excuse a known failure. Q03 repair, Q04 correction/disposal guards, Q05 tier/disposition and Q06 dependent-output proof retain their exact approved-plan boundaries. |
| Phases 34–39 regional tasks | Assigned theme(s), light-first matched 1920×1080 / DPR 1 / zoom 100% region states. Direct semantic/behavior tests plus fresh rendered/interaction evidence. Verify prior accepted neighboring regions and other themes/modes affected by shared changes. | Per-region user visual disposition and technical results are separate. Do not substitute a prior experiment, light-only result or self-review for broader conformance. |
| Supported-theme completion, plan L7 | Assigned theme(s) × supported light/dark × 1024px and 1920×1080 desktop viewports; all nine recipes, applicable DP/editor/reliability/recovery states, contrast/focus/non-color cues, reachability, touch targets, motion and theme-state preservation. Earlier themes/unrelated surfaces receive scope-appropriate regression checks. | Each assigned theme needs its own disposition. Light-only work is not a finished theme; a structural/behavior repair returns to its named owner rather than hiding in CSS conformance. |
| Phase 40 / Task 208 | Retained 8 themes × light/dark × both desktop viewports, nine recipes, 29 UF, 10 AF, 21 NEG, 14 DP/12 VQ and migration/rollback/real transactions/three ABA sequences/aggregate retention/Archive recovery/unrelated-surface matrices. | Original complete implementation/preservation promise remains intact. No unknown result, skipped check, unresolved required decision or known failure is represented as completion. |

Use the full gate declared in `CLAUDE.md`, with the approved task's direct test
targets. This section changes the applicable visual matrix, not the gate
commands or the skill procedure. A browser-dependent claim needs a fresh check
in the running app on the current code; a build pass, timestamps or an earlier
capture do not establish it.

### 5.3 Visual checks and independent dispositions

Check visual work in the running app with test data, never the user's own data.
Screenshots and browser output are shown to the user in the conversation and
are not committed. There is no per-task evidence report, assets directory or
capture count. The task's ledger checkpoint states briefly what was compared
(theme, region, state, comparison partner), the differences retained and why,
and the user's first judgment separately from the final disposition, so that
first-submission quality stays visible. Keep prototype native versus derived
fixtures and production-only states explicit. Never commit runtime, cache or
generated output, and never reuse past experiment code or assets.

Keep product/source disposition, implementation state, technical results and
user visual acceptance separate. Automated checks and implementer self-review
never declare visual acceptance or `[x]`; visual acceptance does not turn a
failed technical gate into a pass. A meaningful remaining difference requires
explicit user disposition. Task and phase acceptance follow `/run-task` and
`/end-phase`. This document records no new acceptance itself.

---

## 6. Architecture Conformance Checklist

This checklist is **project-specific**. It is derived from the project's canonical documents and the architecture rules in `CLAUDE.md`. `/end-phase` reads this section and enforces checks at two levels.

### Tier: Blocking

Violations of core architectural invariants. **Must be fixed before close-out / merge**, or the standard itself must be explicitly amended/deferred by the user.

#### Core Project Architecture

- [ ] **DataStore facade:** No component or hook imports `dexie` directly for data access. All data access goes through `DataStore` interface methods. Only `src/lib/db/indexeddb.ts` imports Dexie — exception: `src/hooks/*.ts` may import `liveQuery` from `dexie` for reactive subscriptions (this is the intended reactive-layer pattern).
- [ ] **Reactive reads:** All data reads that feed UI use `liveQuery` for reactivity. No one-time fetches for data that should be live (parent nodes, breadcrumbs, calendar items).
- [ ] **URL-driven navigation:** Routes follow canonical pattern: `/` (L0), `/grid/[id]` (L1+), `?bit=[id]` (popup). No programmatic state-based routing that bypasses URL.
- [ ] **Zod write-boundary:** Zod validation at write boundary only (`createNodeSchema.parse()`, `createBitSchema.parse()`, etc.). No read-path validation.
- [ ] **State ownership by lifetime:** Durable domain truth stays behind DataStore/repository APIs. `triage-store.ts` owns only the app-session selection, Pool query/collapse/scroll, and Explorer path/open-column/column-scroll state enumerated by SPEC. Page-mounted hooks own drafts, search requests/results, Placement, Archive presentation, and Newly Placed/Undo. Pure data-query hooks do not import Zustand; a page/workflow coordinator may read only the declared app-session selectors needed to coordinate these owners. Stores never import DataStore or duplicate durable candidates.
- [ ] **Hook API boundary:** UI components import hooks, not DataStore. Hooks are the reactive data boundary.
- [ ] **Lifecycle active-filter (archive sweep):** Every "active items" query filters `archivedAt = null` alongside `deletedAt = null` (L0 grid rendering also excludes `hiddenFromGrid = true`). Covers grid contents, node completion, calendar items, items pool, badge, global urgency, text search, grid occupancy, aging. Trash queries key off `deletedAt` only. (Added Batch 1 — SCHEMA.md Key Queries.)
- [ ] **System-managed field guard:** `createNodeSchema` / `createBitSchema` never accept `systemRole`, `hiddenFromGrid`, or `archivedAt`. These are set only by system seeding (internal full-schema path) or the archive hooks — never from a user-facing create path. (Added Batch 1.)
- [ ] **System node lifecycle exclusion:** System nodes (`systemRole !== null`) are never soft-deleted/trashed or archived (Hooks 4 and 10). "Remove from grid" uses `hiddenFromGrid = true`; the sidebar still lists them. (Added Batch 1.)

#### Inbox/Triage Persistence And Authoritative Commands

- [ ] **Authoritative operation state:** No optimistic projection becomes
  mutation authority. Source truth remains visible until an authoritative
  result or complete postcondition is known. `pending` and `reconciling` are
  used only for genuine unresolved outcomes, preserve the operation identity
  and required locks, and do not imply a generic visual treatment.
- [ ] **Monotonic CAS / ABA protection:** Node, Bit, ScratchBreakdown, and
  StagedCandidate records use the revisions approved by SCHEMA. Every create
  starts at `version = 1`; every successful logical direct mutation advances
  the affected record exactly once. Breakdown Add/Delete also advances the
  surviving Scratch Bit aggregate version, and Stage/Unstage/Placement/Undo
  advance the surviving row/candidate owner required by SCHEMA. A parent whose
  only change is derived `mtime` does not advance. Public payloads cannot set
  versions, and verification catches both missing and double increments across
  direct, breadcrumb, and Hook 1/3/10/11 cascade paths.
- [ ] **Atomic complete postconditions:** Each canonical Add/Edit/Delete,
  Stage/Unstage, staged/direct Placement, source-aware Undo, confirmed-orphan
  cleanup, and Archive command validates and writes its complete postcondition
  in one repository transaction. Reconciliation classifies complete
  precondition, complete postcondition, or conflict; it never accepts one-sided
  success, compensates one side, selects another target, or retries from a
  heuristic. The authoritative result family is `applied`, `already_applied`,
  `not_applied`, `rejected`, and `conflict`; transport `unknown` is not a sixth
  repository result. Only an authoritative `not_applied` permits an allowed
  manual retry with the same stable ID.
- [ ] **No general operation-log shortcut:** A general operation log, journal,
  outbox, or offline mutation queue is not introduced without a later canonical
  decision. Narrow `candidateOrphanAuditEvents` integrity evidence and
  `PendingOperationRecovery` identity cannot be reused as general mutation
  history; audit events are retained indefinitely in database-schema v4.
- [ ] **Durable Staging authority:** Breakdown rows remain dedicated
  `scratchBreakdowns` records outside Chunks. Durable `stagedCandidates` own
  staged truth and join display content from the authoritative source row;
  UI/session stores hold no candidate truth or candidate label snapshot.
  Breakdown rows and candidates do not participate in Bit auto-completion.
- [ ] **Archive evidence guard:** Inbox/Triage completion and Archive
  eligibility require an active Scratch, at least one persisted consumed row,
  zero unconsumed rows, and zero `stagedCandidates`, then revalidate the same
  facts in the Archive transaction. Empty history, all-staged rows, or rows
  removed without consumption never qualify; never rely on empty-array
  `every()` behavior.

#### Inbox/Triage Search And Mounted-Session Projection

- [ ] **Workflow-hook ownership:** The existing `useTriageDnd` export in
  `src/hooks/use-dnd.ts` owns Mouse/Touch sensors, drag snapshot, release-time
  drop intent, and feedback coordination, but no persistence sequencing;
  `use-triage-placement.ts` owns Placement state and atomic-command dispatch,
  and `use-archive-scratch.ts` owns Archive blockers, recovery, reconciliation,
  and terminal handoff. Components coordinate these hooks but never sequence
  repository writes.
- [ ] **Dedicated Explorer query boundary:** Whole-hierarchy Inbox/Triage
  search uses its dedicated traversal, ranking, cancellation, stale-response,
  ancestor-chain, breadcrumb, and path owners. It never extends or reuses
  global `searchAll()` / `use-search.ts`, never navigates to the general Grid
  route, and never creates a second path model. Valid result selection may
  update the canonical Inbox Explorer path and reveal state exactly as SPEC
  defines.
- [ ] **Page-session Newly Placed boundary:**
  `use-triage-newly-placed.ts` owns mounted-page marker/pinning, operation
  provenance, dependency projection, and Undo availability. Scratch, Grid
  column/path, theme, and locale changes preserve them; route exit or reload
  ends them. No Newly Placed field is persisted on Node, Bit, Breakdown, or
  candidate records.
- [ ] **Source-aware Undo:** Undo validates the actual created result and every
  dependency before mutation. Both variants atomically delete that exact
  created Node/Bit and restore the source row. A staging-source Undo also
  recreates the durable candidate; a direct-source Undo creates no candidate.
  Non-reversible results remain ordinary records and lose only the temporary
  Undo affordance.

#### Theme, Decision-Prerequisite, And Evidence Conformance

- [ ] **Shared production ownership:** Inbox/Triage uses one shared production
  component tree. Do not promote duplicate prototype routes, mock stores,
  variant/test controls, separate candidate handles, or route-local mutation
  architecture.
- [ ] **Semantic role/state and theme mapping:** Components expose canonical
  `data-triage-role` and composable `data-triage-state` bindings for `working`,
  `selected`, `staged`, `invalid`, `unavailable`, `pending-confirmation`,
  `pending`, `reconciling`, `success`, `newly-placed`, `completed`, and
  `local-alert`. Theme differences flow through semantic tokens/classes and
  approved realization components; outside the theme picker, components do not
  branch on `data-color-theme` or split into eight theme implementations.
  Independent states never collapse into one flag, remain distinguishable by
  non-color cues, and do not use repeated blink, pulse, ping, bounce, spin, or
  flicker as ambient status. Extend existing semantic token → region/element/
  state alias → centralized theme/mode values consumed by shared elements;
  not every pixel needs a token, and theme-ID JSX forks, test-ID styling or
  accumulating override patches are not the realization method.
- [ ] **Decision-prerequisite no-fallback:** A user-owned visual/content gate
  does not authorize an exact effect, duration, copy, placement, layout, icon,
  or per-theme value until its matching decision is recorded (a Phase 24 DP
  receipt or a later decision committed to the plan). Adjacent dialogs, cards,
  search bodies, chrome, generic statuses, and existing global tokens are not
  substitutes.
- [ ] **Source-only versus rendered evidence:** Source declarations, rendered
  observations, and user-visible acceptance evidence are labeled separately.
  A rendered-fidelity claim names the route, state, stable viewport, theme/mode,
  and actual capture or interaction evidence. Source-only recipes are never
  rendered proof, and their observed literals are not copied as exact production
  values unless an approved adoption trace grants that authority.
- [ ] **First-submission fidelity:** For an approved source-backed region,
  perform the element-level actual-rendered comparison and internal refinement
  in §5.1 before presenting the first result. Page colors, CSS-string checks or
  a wide screenshot alone are not proof of every child element/state.
- [ ] **Applicable-theme staged verification:** Apply §5.2's regional,
  supported-theme and retained full-campaign matrices to the exact task scope.
  Evidence covers contrast, `focus-visible`, non-color cues, reduced motion,
  touch targets, hidden-scrollbar reachability, section-scoped overlays and
  recipe/state facts without inventing mobile or absent-prototype coverage.
  Phase 40 retains the complete 16-theme/mode matrix; Phase 31 technical close
  is not that campaign completion.
- [ ] **No clipping or shared-style leakage:** Fixed height/overflow must not
  hide editors, actions, status, recovery, caret or focus. Check actual loaded
  fonts/cascade/geometry and regress previously accepted regions/themes when
  shared structure changes. A measured DP/geometry conflict requires the
  affected-slice Q02 disposition, not silent styling discretion.
- [ ] **Centralized copy and deferral boundary:** Shared English labels, status
  text, accessible names, and theme display aliases are centrally owned. The
  deferred shared BitCard redesign, EN/KR resources and toggle, Neumorphism
  water-lens, cross-surface text/IME policy, and keyboard Placement entry remain
  outside implementation until their own approved promotion.

### Tier: Advisory

Important issues that should be surfaced and recorded, but do not automatically block closing. Closing continues with explicit acknowledgement.

- [ ] **File organization:** New files follow `CLAUDE.md` Key Paths, SPEC Key
  File Paths, and the approved EXECUTION_PLAN. Utilities, hooks, stores,
  components, tests, and review artifacts stay with their declared owner.
- [ ] **Local-first presentation:** Routine local reads do not invent loading
  chrome. Genuine pending, transport-unknown, and reconciliation states
  preserve usable authoritative content rather than replacing whole surfaces
  with a generic spinner or skeleton; any waiting indicator corresponds to a
  real unresolved operation.

### Updating this checklist

When canonical architecture or `CLAUDE.md` rules change, update this checklist to match. The checklist should always reflect current approved intent. When adding new items, explicitly assign them to Blocking or Advisory.

---

## Phase 8 Verification Note

Phase 8 is a pilot for surface recipe-based implementation fidelity. At closing:
- Take screenshot(s) of the Bit Detail surface in light and dark mode
- Compare against `docs/DESIGN_TOKENS.md` § Surface Recipes → Bit Detail Surface
- Compare against `references/bitdetail0.png`
- Fix clear, meaningful deviations only — do not iterate beyond one correction pass
- Record the implementation/verification findings in `docs/reviews/phase-8-workflow-pilot-record.md`
- Before considering Phase 8 fully closed, write a workflow update recommendation based on the pilot evidence

---

## Origin

This standard was developed from a comprehensive omission audit of the GridDO project (2026-03-26). The audit identified 20 items across five tiers, including plan omissions, false completions, and implementation deviations. See `docs/OMISSION_AUDIT.md` for the full remediation record.

The key lesson: the biggest risk in document-driven development is not missing implementation — it is that behaviors promised in PRD/SPEC often do not get strong enough ownership in EXECUTION_PLAN.md, especially around interaction details that look inferable but are not safe to leave implicit.
