# Issues — Phase 46: Dexie Removal

Branch: phase-46/dexie-removal · Started: 2026-10-29
Carried over: none.
Baseline gate (2026-10-29): `git diff --check`, `pnpm test` (2338), `pnpm test:db` (942), `pnpm lint` (0 errors, 11 warnings), `pnpm typecheck`, `pnpm build` all pass.
Plan fixes at start (user, 2026-10-29): Task 230 runs in three stages with a checkpoint each (tests off Dexie with a scenario mapping table first, Dexie out, interface trimmed and documents current); it names the tests that must be rewritten rather than deleted, the orphan Zod schemas and types, and the canonical "until Phase 46" passages; SCHEMA §Dexie Migration Target stays as a historical record; `use-system-node-seeding.ts` dropped from the list (already removed in Task 226). LEARNINGS: the Phase 45 MCP lesson's cause corrected.
