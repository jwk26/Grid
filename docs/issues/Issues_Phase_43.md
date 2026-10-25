# Issues — Phase 43: Ordinary write functions

Branch: phase-43/ordinary-write-functions · Started: 2026-10-25
Carried over: MI-1 (Phase 42, Deferred → Phase 43 gate watch): each gate saves the `pnpm test` output to a file; on a recurrence this ledger records the failing test's name and the user decides the fix or closes the item. Task 219 advisory notes in `Issues_Phase_42.md` (Task 217 and Task 218 logs), read at Task 219 start.

Phase notes (user, 2026-10-25):
- Task gates run `git diff --check origin/main...HEAD` (LEARNINGS, Phase 42 close), not the bare working-tree form.
- If Task 219 or Task 220 grows too large, the task is split into stages, each with its own checkpoint.

Start: drift D1 fixed in the plan (Task 219's `update_node` system-Node show placement is already in Task 217's function and suite). Baseline gate (2026-10-25): `git diff --check origin/main...HEAD`, `pnpm test` 2177/2177 (output saved; MI-1 did not recur), `pnpm test:db` 378/378, `pnpm lint` (0 errors, 11 existing warnings), `pnpm typecheck`, `pnpm build` pass.
