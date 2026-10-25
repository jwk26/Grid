# Issues — Phase 43: Ordinary write functions

Branch: phase-43/ordinary-write-functions · Started: 2026-10-25
Carried over: MI-1 (Phase 42, Deferred → Phase 43 gate watch): each gate saves the `pnpm test` output to a file; on a recurrence this ledger records the failing test's name and the user decides the fix or closes the item. Task 219 advisory notes in `Issues_Phase_42.md` (Task 217 and Task 218 logs), read at Task 219 start.

Phase notes (user, 2026-10-25):
- Task gates run `git diff --check origin/main...HEAD` (LEARNINGS, Phase 42 close), not the bare working-tree form.
- If Task 219 or Task 220 grows too large, the task is split into stages, each with its own checkpoint.

Start: drift D1 fixed in the plan (Task 219's `update_node` system-Node show placement is already in Task 217's function and suite). Baseline gate (2026-10-25): `git diff --check origin/main...HEAD`, `pnpm test` 2177/2177 (output saved; MI-1 did not recur), `pnpm test:db` 378/378, `pnpm lint` (0 errors, 11 existing warnings), `pnpm typecheck`, `pnpm build` pass.

## Task 219 — Port the Node, Bit and Chunk write functions

### Current state
- Status: Awaiting User Decision
- Next: go-ahead on the work plan
- Open: none

### Log
- Work plan (2026-10-25): three stages, each its own migration, suite and commit, with a checkpoint at the end of each (the phase note allows the split).
  1. Node and Bit: `create_node`, `create_bit`, `update_bit`; `update_node` extended only for the parent-deadline answer (Hook 2: optional `p_extend_parent`-style parameter, parent Bit/Node extended in the same transaction). Shared pieces go to `internal` (account-limit check returning `account_limit` + `limit`, with real/guest numbers in one function; active-parent `for share` lock; cell check across nodes and bits; deadline-vs-parent check returning `deadline_exceeds_parent`). Create takes the client id and cell (`cell_taken` if occupied), starts `version = 1`, touches the parent (Hook 1); Inbox Scratch Bits keep the (0,0) sentinel exemption; system-managed fields (`level`, `mtime`, `version`, lifecycle, `system_role`) are not accepted.
  2. Chunk: `create_chunk`, `update_chunk` (with the Calendar answer that extends the parent Bit), `delete_chunk`, `reorder_chunks`; Hook 3 auto-completion with the sticky force-complete rule exactly as `updateBitCompletionAndCascade` does it, Hook 1 two-level cascade, Bit version +1 only when its status changes.
  3. Ported scenarios (answer keys): `mtime-cascade`, `deadline-hierarchy`, `auto-completion`, `grid-uniqueness`, `revision` and the create/update parts of `indexeddb.test.ts` into `supabase/tests/*.db.test.ts`; limits per table for real and guest; two concurrent creates into one cell (one `rejected`); trash-race left for Task 220.
  Per function: register in `supabase/tests/helpers/function-cases.ts` (cross-account + `assertChangeSet` case), `pnpm db:types`, SQL checklist (PLANNING_STANDARD §6: empty `search_path`, owner `griddo_writer`, execute revoked from public/anon/service_role, granted to `authenticated`, `internal.uid()`, `account_missing`).
  Verification: failing test first for each rule, `pnpm test:db` after each stage, full gate and an `expert` SQL review at the finish. No UI, so no browser check.
- Open question for the go-ahead: the shape of the `p_changes`/create parameters follows `update_node` (JSON object of snake_case keys, unknown key → `22023`); `create_*` take `p_id uuid, p_values jsonb`. I recommend this for consistency; say if you want typed parameters instead.
