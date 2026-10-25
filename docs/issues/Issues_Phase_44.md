# Issues — Phase 44: Inbox/Triage command functions

Branch: phase-44/inbox-triage-commands · Started: 2026-10-25
Carried over: MI-1 (Phase 42, Deferred → Phase 44 gate watch): each gate saves the `pnpm test` output to a file; on a recurrence this ledger records the failing test's name and the user decides the fix; with no recurrence the item closes at the Phase 44 close. Task 221 advisory note in `Issues_Phase_43.md` (Task 220 log), read at Task 221 start.

Phase notes (user, 2026-10-25):
- Task gates run `git diff --check origin/main...HEAD`, not the bare working-tree form.

Start: drift D1 fixed in the plan (Task 224: the Archive descriptor conformance case is split; the database suite covers reload reconciliation from Scratch and postcondition state, and the `sessionStorage` fail-closed dispatch stays in `src/hooks/use-archive-scratch.test.ts`). Baseline gate (2026-10-25): `git diff --check origin/main...HEAD`, `pnpm test` 2177/2177 (output saved; MI-1 did not recur), `pnpm test:db` 610/610, `pnpm lint` (0 errors, 11 existing warnings), `pnpm typecheck`, `pnpm build` pass.
