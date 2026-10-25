# Issues — Phase 44: Inbox/Triage command functions

Branch: phase-44/inbox-triage-commands · Started: 2026-10-25
Carried over: MI-1 (Phase 42, Deferred → Phase 44 gate watch): each gate saves the `pnpm test` output to a file; on a recurrence this ledger records the failing test's name and the user decides the fix; with no recurrence the item closes at the Phase 44 close. Task 221 advisory note in `Issues_Phase_43.md` (Task 220 log), read at Task 221 start.

Phase notes (user, 2026-10-25):
- Task gates run `git diff --check origin/main...HEAD`, not the bare working-tree form.

Start: drift D1 fixed in the plan (Task 224: the Archive descriptor conformance case is split; the database suite covers reload reconciliation from Scratch and postcondition state, and the `sessionStorage` fail-closed dispatch stays in `src/hooks/use-archive-scratch.test.ts`). Baseline gate (2026-10-25): `git diff --check origin/main...HEAD`, `pnpm test` 2177/2177 (output saved; MI-1 did not recur), `pnpm test:db` 610/610, `pnpm lint` (0 errors, 11 existing warnings), `pnpm typecheck`, `pnpm build` pass.

## Task 221 — Port the Breakdown and Scratch title commands

### Current state
- Status: Awaiting User Decision
- Next: go-ahead on the work plan
- Open: none

### Log
- Work plan:
  - Files: one migration `supabase/migrations/20261033000000_breakdown_commands.sql` (eight public functions + internal helpers); `supabase/tests/breakdown-commands.db.test.ts` (new); entries in `supabase/tests/helpers/function-cases.ts`; regenerated `database.types.ts`. No `src` change (DataStore port is Phase 45).
  - Functions (all `security definer`, owner `griddo_writer`, empty `search_path`, execute to `authenticated` only): `add_breakdown(p_breakdown_id, p_scratch_id, p_scratch_expected_version, p_content)`, `save_scratch_title(p_scratch_id, p_expected_version, p_base_title, p_title)`, `save_breakdown(p_id, p_expected_version, p_base_content, p_base_order, p_content, p_order)`, `delete_breakdown(p_id, p_expected_version, p_scratch_id, p_scratch_expected_version)`, plus a read-only `reconcile_*` for each (`security invoker`, `stable`, same arguments, no write). `operationId` is not a parameter: no operation table exists, the client keeps it for correlation (SCHEMA §Operation reconciliation).
  - Rules, taken from the Dexie answer key: active Scratch = Bit of the Inbox Node, not trashed/archived, Inbox active. Lock order: Inbox Node → Scratch (`internal.lock_bit_and_node`), then the row. Add checks the postcondition first (`already_applied`), then rejects an inactive Scratch (`rejected`), then a taken id or a wrong Scratch version is `conflict`; then `limit_reached(user,'scratch_breakdowns',1)` → `rejected account_limit` with `limit`; next `order` = max+1 inside the lock; Scratch version +1 and `mtime`. Save Scratch title: `rejected` for inactive/unchanged title, `conflict` for a different version/base title; title +`mtime`, version +1, Inbox Node keeps its version. Save Breakdown / Delete: `rejected` for a staged (candidate exists), consumed, missing or inactive-Scratch row; `conflict` for a wrong version; Delete also bumps the Scratch version once. Every `rejected`/`conflict`/`already_applied` returns current rows in `changes`; no write on them.
  - Reconcile classifies `already_applied` / `not_applied` / `conflict` exactly as the Dexie `matches*` predicates (including the ABA cases).
  - Stages (each ends at your acceptance): (1) `add_breakdown` + reconcile + Scratch title command + tests; (2) `save_breakdown`, `delete_breakdown` + reconcile + tests; (3) cross-account, concurrency (two Adds on one Scratch version → one applied, one conflict; Add vs Trash/Delete of the Scratch; Save vs Stage), change-set, guest-limit and conformance cases ("ambiguous Add, then confirmed Delete, reconciles as conflict"), registry entries, types, full gate, `expert` review with the SQL checklist.
  - Verify: `pnpm test:db` per stage, then the full gate at finish with `pnpm test` output saved (MI-1 watch).
