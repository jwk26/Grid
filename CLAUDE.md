# GridDO (Local-first Task Management)

18×9 Grid | Node(L0) → Bit(L1) → Chunk(L2) hierarchy.

**Always check docs/EXECUTION_PLAN.md first to see the current task before starting work.** When `Execution plan mode: scaled` is present, read `## Phase Index` to identify the active phase, then load the active phase detail before consulting archive files. Archive files are for historical detail, not the default starting context.

## Documentation (Priority: SCHEMA > SPEC > DESIGN > PLAN > STANDARD)

- `docs/SCHEMA.md`: Data model, Object stores, Zod (Authoritative)
- `docs/SPEC.md`: Architecture, Routing, Layouts
- `docs/DESIGN_TOKENS.md`: CSS vars, Tailwind v4, Components
- `docs/EXECUTION_PLAN.md`: Phased task specs
- `docs/PLANNING_STANDARD.md`: Flow ownership, verification, conformance gates
- `docs/WORKFLOW.md`: Full 8-stage process (ideation → integration)
- `docs/prd.md`: Historical context (Non-authoritative)

## Key Paths & Roles

- `src/app/`: `globals.css` (Design tokens), `layout.tsx` (Shell), `providers.tsx` (Contexts)
- `src/lib/db/`: `datastore.ts` (Interface), `indexeddb.ts` (Dexie), `schema.ts` (Zod/Types)
- `src/lib/utils/`: Pure functions (BFS, Aging, Urgency) - Side-effect free
- `src/hooks/`: Reactive data boundary (`useGridData`, `useBitDetail`) - Main API for UI
- `src/stores/`: Zustand (UI state: Sidebar, Search, Edit-mode)
- `src/lib/constants.ts`: Grid dims, thresholds, retention

## Architecture Rules

1. **Client-first:** Interactive/data components = Client Components.
2. **Two-layer Data:** `DataStore` (CRUD) → `Hooks` (Reactive). UI only imports hooks.
3. **URL-driven:** `/` (L0), `/grid/[id]` (Nodes), `?bit=[id]` (Popup).
4. **Render-time Compute:** Aging/Urgency/Completion calculated on the fly.
5. **Validation:** Zod at write boundary only. Reads are trusted.
6. **Local-first command feedback:** Reactive reads and ordinary local writes remain immediate. Revision-checked or multi-record Inbox/Triage mutations expose pending/reconciling UI and report success only after an authoritative command result or postcondition read; components never infer success from elapsed time.
7. **Lifecycle & System Nodes:** Inbox and Archive are system Nodes (`systemRole: 'inbox' | 'archive_view'`) rendered on `/grid/[id]` with role-specific surfaces. Archive is manual (`archivedAt`); completion never auto-archives. System Nodes are never trashed or archived; use `hiddenFromGrid` to remove them from the L0 grid. Scratch breakdown rows live in `scratchBreakdowns` and staged Node/Bit candidates in `triageStagedCandidates`; neither uses Chunks, and Zustand owns only disposable presentation state. See `SCHEMA.md` Hooks 10–16 and `SPEC.md`.
8. **Color Theme axis (Batch 2+):** Color theme is a second visual axis orthogonal to `next-themes` dark/light. Dark/light stays class-based (`.dark`); color theme is stored separately and applied to `<html data-color-theme="...">` across all 8 themes (`griddo` base + `tiny-desk`, `neumorphism`, `claymorphism`, `origami`, `terminal`, `retro-mac`, `graphite`). Components consume semantic CSS variables and shared `.theme-*` classes; **never branch on theme id** except the theme picker. Production Inbox/Triage uses one shared component tree and semantic surface/state hooks without theme-specific mutation or state logic. Batch 2+ visual/theme passes patch the current app and preserve existing behavior; contrast/build conflicts are recorded explicitly, not silently normalized. See `SPEC.md` §Architecture Decisions and `DESIGN_TOKENS.md`.
9. **Revisioned writes & atomic Triage:** Every Bit create sets `version = 1`; each logical content, position, completion, or lifecycle mutation increments it exactly once, including cascades. Stage, Unstage, Placement, Undo, and Archive are DataStore-owned atomic commands with stable operation and target IDs. Newly Placed is page-session projection state, not persisted domain data. See `SCHEMA.md` and `PLANNING_STANDARD.md` §Inbox/Triage Data And Mutation Conformance.

## Workflow

`/craft-docs` → `/run-phase` → `/run-task` → `/end-phase` own the procedure. This section overrides their defaults.

- **Gates:** `git diff --check`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.
- **Ledger:** `docs/issues/Issues_Phase_N.md`, rules in `docs/WORKFLOW.md` §Phase Execution Record. Issue IDs run per phase, not per task: a new `MI-n` or `mi-n` takes the next number after the highest one of its kind in the phase ledger. Open, In Progress and Awaiting User Decision block phase close. Only the user closes or defers an item.
- **Acceptance:** `[x]` in the plan means user-accepted, never just implemented or gate-green.
- **Git:** `phase-N/<desc>` from `origin/main` → PR to `main`, regular merge commit (no squash).
- **Close archive:** phase detail → `docs/execution-plan/archive/phase-N.md` plus its Phase Index row; deferred items → `docs/issues/Issues_Deferred.md`; cross-phase lessons → `docs/execution-plan/LEARNINGS.md`.
- **Brainstorming:** topic folders follow `docs/brainstorming/readme.md`.
- **References:** prototypes and visual references are view-only. Never copy their source or assets.
- **Test data:** browser checks use the Playwright MCP browser, seeded by `scripts/dev-fixtures/inbox-triage.js`; drags go through `scripts/dev-fixtures/drag.js` (usage in each header). Never touch the user's own data or browser profile.
- **Recovery:** restore state from documents, Git and rerun checks, not from chat memory.

## Planning Gate

- **Phase start (`/run-phase`):** a flow review in `docs/reviews/` must cover the phase (`phase-N-flow-review.md`, or the scope review the plan cites). If none does, stop. A new or materially amended plan gets its review through `/craft-docs` per `docs/PLANNING_STANDARD.md` §3. Resolve any ❌ Gap first.
- **Phase close (`/end-phase`):** review conformance against `docs/PLANNING_STANDARD.md` §6 (Blocking / Advisory).
