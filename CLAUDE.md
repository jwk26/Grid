# GridDO (Task Management SaaS on Supabase)

18×9 Grid | Node(L0) → Bit(L1) → Chunk(L2) hierarchy. User-facing name "grid"; inside the project the name stays GridDO.

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
- `src/lib/db/`: `datastore.ts` (Interface), `supabase-store.ts` + `snapshot-store.ts` (Supabase store and account snapshot, from Phase 45), `indexeddb.ts` (Dexie, until Phase 46), `schema.ts` (Zod/Types)
- `supabase/`: `migrations/` (Postgres schema and functions, in Git), `tests/` (`pnpm test:db`), `config.toml` (local Supabase)
- `src/lib/utils/`: Pure functions (BFS, Aging, Urgency) - Side-effect free
- `src/hooks/`: Reactive data boundary (`useGridData`, `useBitDetail`) - Main API for UI
- `src/stores/`: Zustand (UI state: Sidebar, Search, Edit-mode)
- `src/lib/constants.ts`: Grid dims, thresholds, retention

## Architecture Rules

1. **Client-first:** Interactive/data components = Client Components. No Next.js server code. Supabase Postgres is the per-account source of truth. Browser storage holds only device preferences, the sign-in session, the session-expired marker and the Archive recovery identifier (`sessionStorage`), never domain data.
2. **Two-layer Data:** `DataStore` (every write is one database function call) → `Hooks` (reactive reads over the in-memory account snapshot, a disposable cache). UI only imports hooks. See `SPEC.md` Architecture Decisions 2 and 19.
3. **URL-driven:** `/` (L0), `/grid/[id]` (Nodes), `?bit=[id]` (Popup).
4. **Render-time Compute:** Aging/Urgency/Completion calculated on the fly.
5. **Validation:** Zod at the client write boundary, for immediate feedback; the database (constraints and the checks in the write functions) is the final gate. Reads are trusted.
6. **Command feedback:** Everyday interactions feel as before: ordinary writes are optimistic with rollback, Trash and Archive hide at once, and permanent delete, Empty Trash, restore and promotion are server-confirmed (`SPEC.md` §Write feel). Revision-checked or multi-record Inbox/Triage mutations expose pending/reconciling UI and report success only after an authoritative command result or postcondition read. The display delay (`DISPLAY_DELAY_MS`) only postpones presentation; components never infer success from elapsed time, and an unknown outcome is never resent.
7. **Lifecycle & System Nodes:** Inbox and Archive are system Nodes (`systemRole: 'inbox' | 'archive_view'`) rendered on `/grid/[id]` with role-specific surfaces. Archive is manual (`archivedAt`); completion never auto-archives. System Nodes are never trashed or archived; use `hiddenFromGrid` to remove them from the L0 grid. `ensure_account()` creates and normalizes them for every account at session start. Scratch breakdown rows live in `scratchBreakdowns` and staged Node/Bit candidates in `stagedCandidates`; neither uses Chunks, and Zustand owns only disposable presentation state. See `SCHEMA.md` Hooks 10–15 and `SPEC.md`.
8. **Color Theme axis (Batch 2+):** Color theme is a second visual axis orthogonal to `next-themes` dark/light. Dark/light stays class-based (`.dark`); color theme is stored separately and applied to `<html data-color-theme="...">` across four themes: `griddo` (base, the default until Paper ships), `retro-mac`, `neumorphism` and `claymorphism` (feedback F28; until Task 241 the code still has `tiny-desk`, `origami`, `terminal` and `graphite`). Components consume semantic CSS variables and shared `.theme-*` classes; **never branch on theme id** except the theme picker. Production Inbox/Triage uses one shared component tree and semantic surface/state hooks without theme-specific mutation or state logic. Batch 2+ visual/theme passes patch the current app and preserve existing behavior; contrast/build conflicts are recorded explicitly, not silently normalized. See `SPEC.md` §Architecture Decisions and `DESIGN_TOKENS.md`.
9. **Revisioned writes & atomic Triage:** Every Bit create sets `version = 1`; each logical content, position, completion, or lifecycle mutation increments it exactly once, including cascades. Stage, Unstage, Placement, Undo, and Archive are DataStore-owned atomic commands with stable operation and target IDs, each one database function and one transaction. Newly Placed is page-session projection state, not persisted domain data. See `SCHEMA.md` and `PLANNING_STANDARD.md` §Inbox/Triage Data And Mutation Conformance.
10. **Account isolation:** RLS on every table; write functions run as a role that cannot bypass it; references inside an account are composite foreign keys; internal functions are not executable by client roles. Cross-account tests are blocking for every phase that adds a table or function. Every SQL function follows the checklist in `PLANNING_STANDARD.md` §6, and every task that changes SQL gets an `expert` review before acceptance. See `SCHEMA.md` §Postgres Target and §Database Functions.

## Workflow

`/craft-docs` → `/run-phase` → `/run-task` → `/end-phase` own the procedure. This section overrides their defaults.

- **Gates:** `git diff --check`, `pnpm test`, `pnpm test:db`, `pnpm lint`, `pnpm typecheck`, `pnpm build`. `pnpm test:db` first resets the local Supabase database to the current branch's migrations, then runs the database suites. Every SaaS-lane task (Phases 42–48) runs it; the feedback lane (Phases 49–50) leaves it out of its task gates and runs it only when it closes a phase, once `main` has it (Task 213); before that the close ledger records it as not applicable.
- **Ledger:** `docs/issues/Issues_Phase_N.md`, rules in `docs/WORKFLOW.md` §Phase Execution Record. Issue IDs run per phase, not per task: a new `MI-n` or `mi-n` takes the next number after the highest one of its kind in the phase ledger. Open, In Progress and Awaiting User Decision block phase close. Only the user closes or defers an item.
- **Acceptance:** `[x]` in the plan means user-accepted, never just implemented or gate-green.
- **Git:** `phase-N/<desc>` from `origin/main` → PR to `main`, regular merge commit (no squash).
- **Phase waits:** a phase waits only for the phases its plan entry lists (Phase Index, "Dependency-aware readiness"); a phase that waits for none says so; a phase that states nothing waits for every phase before it in plan order. Two lanes may be open at once: the SaaS lane (Phases 42–48) and the feedback lane (Phases 49–50).
- **Close archive:** phase detail → `docs/execution-plan/archive/phase-N.md` plus its Phase Index row; deferred items → `docs/issues/Issues_Deferred.md`; cross-phase lessons → `docs/execution-plan/LEARNINGS.md`.
- **Brainstorming:** topic folders follow `docs/brainstorming/readme.md`.
- **References:** prototypes and visual references are view-only. Never copy their source or assets.
- **Test data:** browser checks use the Playwright MCP browser, seeded by `scripts/dev-fixtures/inbox-triage.js`; drags go through `scripts/dev-fixtures/drag.js` (usage in each header). The Playwright MCP server runs with `--isolated` (`.mcp.json`): each session gets its own in-memory browser profile, so a session of each lane can check at once, and every session seeds again. From Phase 45 the browser signs in as a local Supabase test user and the fixture seeds through a local-only `dev` function that `supabase/seed.sql` creates (never in a migration, so never in production); until then it seeds IndexedDB. Never touch the user's own data, browser profile or the production database.
- **Local Supabase:** one per machine. Only the SaaS lane (Phases 42–48) manages it: start, reset, migrations. The feedback lane does not edit `supabase/`, and runs `pnpm test:db` only at its close, after merging `main`, at a time when the SaaS lane is not doing database work, because the run resets the database. The SaaS lane's next `pnpm test:db` resets it back to the SaaS branch's migrations. Phase 50, which starts after Phase 45, checks the app on local Supabase; during the phase it never resets the database or adds migrations (the reset of `pnpm test:db` at its close is the only exception), and after a SaaS-lane reset it seeds again. Local OAuth uses development GitHub and Google OAuth apps whose secrets live only in the git-ignored `.env.local` (the repository is public); local Turnstile uses Cloudflare's public test keys.
- **Production:** the secret key never enters Git or client code. Migrations reach production only after the user's approval. Before launch (Phase 48) they may be applied whenever a task needs them, since production holds no real data. From launch on, only at the close of a phase that changes SQL, in this order: manual dump, migrations, then the merge that deploys the new code. The production schema changes only through migrations, never in the dashboard. After the Phase 48 merge a production smoke runs before the URL is announced.
- **Backup:** from launch, a weekly `supabase db dump` on the owner's Mac keeps the latest 8 dumps in a local folder outside Git.
- **Recovery:** restore state from documents, Git and rerun checks, not from chat memory.

## Planning Gate

- **Phase start (`/run-phase`):** a flow review in `docs/reviews/` must cover the phase (`phase-N-flow-review.md`, or the scope review the plan cites). If none does, stop. A new or materially amended plan gets its review through `/craft-docs` per `docs/PLANNING_STANDARD.md` §3. Resolve any ❌ Gap first.
- **Phase close (`/end-phase`):** review conformance against `docs/PLANNING_STANDARD.md` §6 (Blocking / Advisory).
