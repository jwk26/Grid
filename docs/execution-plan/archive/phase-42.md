# Phase 42 — Database Foundation, End-To-End Slice And Early Production

## Completion-time scope

Closed 2026-10-25. Tasks 213–218 are user-accepted. SaaS lane, part 1
(promotion ①): local Supabase and the `pnpm test:db` gate, the account tables
with constraints and RLS, the write role and `ensure_account()`, the account
snapshot with the function coverage suites, the end-to-end slice
(`update_node()`, the snapshot store with its pending-write layer, and the
development-only `/dev/supabase-slice` page), and the early production project
with the hosted checks. Ran on branch `phase-42/database-foundation` under the
lightweight Claude workflow, beside the feedback lane's Phase 49, whose close
it took in by merging `main` at close.

Carried in: none. Carried over: MI-1 (an uncaptured intermittent `pnpm test`
failure, Phase 43 gate watch) and MI-8 (the limit-sized D8 load time on
production, rechecked in Task 240), both in
[`Issues_Deferred.md`](../../issues/Issues_Deferred.md). The two accepted
Security Advisor warnings (one per client `security definer` write function,
S14) are recorded in SCHEMA and bound to Task 240. Advisory notes for Tasks
219, 226, 235 and 238 stay in the ledger's Task 217 and Task 218 logs. Ledger:
[`Issues_Phase_42.md`](../../issues/Issues_Phase_42.md).

## Task contracts at close


Proves the riskiest unknowns first: the write role (S14), the snapshot (S31)
and the envelope with the pending-write layer (S32) on one real write, and the
hosted plan (D1).

### Task 213: [x] Add local Supabase and the `pnpm test:db` gate

**Files and actions:**
- `package.json`: the Supabase CLI as a pinned dev dependency;
  `@supabase/supabase-js` as a dependency; scripts `test:db`
  (`supabase db reset`, then `vitest run --config vitest.db.config.ts`) and
  `db:types` (`supabase gen types typescript --local --schema app --schema public`).
- `supabase/config.toml` via `supabase init`: anonymous sign-ins on; email
  sign-in with password on and confirmations off, locally only (S20);
  `site_url` the local dev URL.
- `vitest.db.config.ts`: includes `supabase/tests/**/*.db.test.ts` only;
  the existing Vitest config excludes `supabase/`.
- `supabase/tests/helpers/`: create and sign in local test users through the
  local admin API, a supabase-js client per user, and a direct database
  connection that can act as a given role and user for table-level checks.
- `.env.local.example` with the public variable names; `.gitignore` covers
  `.env.local` and `supabase/.temp/`, and adds `!.env.local.example`, since
  its existing `.env*` pattern would otherwise ignore the example file.
- `supabase/tests/smoke.db.test.ts`: two test users exist and sign in.

**Dependencies:** Phase 35 Final Close and `main` sync; this phase's lifecycle
gate; Docker Desktop installed by the user (S20).

**Authority:** S20, S21; CLAUDE.md Gates and Local Supabase.

**Observable acceptance:**
- `pnpm test:db` resets the local database and passes the smoke suite; with
  Docker stopped it fails with a clear message, not a hang.
- `pnpm test` runs no database suite and still passes.
- No secret is committed; `.env.local.example` holds names only.

**Verification:** full gate including `pnpm test:db`; `git status` shows no
env file.

**Commit message:** `chore(db): add local Supabase and the test:db gate`.

### Task 214: [x] Add the account tables, constraints and RLS

**Files and actions:**
- `supabase/migrations/<timestamp>_account_schema.sql`: schemas `app`, `public`
  (client functions only) and `internal`; the five tables and `app.accounts`
  exactly as SCHEMA §Postgres Target (columns, CHECK, `unique (user_id, id)`,
  composite foreign keys with `NO ACTION`, `user_id` cascade from
  `auth.users`, the unique source and the partial unique system-role index,
  the listed indexes); RLS and grants; revoke default `EXECUTE` from `public`,
  `anon` and `authenticated`.
- `src/lib/db/database.types.ts`: generated with `pnpm db:types`.
- `src/lib/db/row-mapping.ts` and test: typed snake_case ↔ camelCase
  converters for every table, typed by the generated types.
- `src/lib/db/schema.ts` and `schema.test.ts`: `icon` maximum 64 (D9).
- `src/lib/db/boundary-cases.ts`: one table of boundary values per field rule;
  `schema.test.ts` runs it against Zod and
  `supabase/tests/constraints.db.test.ts` against the constraints (S33).
- `supabase/tests/tables.db.test.ts`: table-level isolation.

**Dependencies:** Task 213.

**Authority:** S11, S12, S14, S29 (3)–(5), S30, S33; SCHEMA §Postgres Target.

**Observable acceptance:**
- As `authenticated`, account A cannot select, insert, update or delete
  account B's rows in any table, and cannot insert, update or delete its own
  rows (no grant); `anon` reaches nothing; no table is reachable through the
  API.
- A composite foreign key refuses a row whose parent belongs to another account.
- Deleting a staged source row is refused (S18); deleting the auth user of an
  account that has a staged candidate removes every row of that account (S29).
- A second Inbox or Archive for one account is refused by the partial index.
- Every boundary case gives the same verdict in Zod and in the database; a
  column rename breaks `pnpm typecheck` through the converter.

**Verification:** full gate; `expert` review with the SQL checklist.

**Commit message:** `feat(db): add the account tables, constraints and RLS`.

### Task 215: [x] Add the write role and `ensure_account()`

**Files and actions:**
- Migration: role `griddo_writer` (`NOLOGIN`, no `BYPASSRLS`, not the table
  owner) with its table grants and RLS policies; `internal` helpers for the
  transaction timestamp, the envelope and cell picking (`internal.pick_free_cell`
  with reserved cells, SCHEMA §Internal functions, feedback F34);
  `public.ensure_account(p_reserved_cells jsonb default '[]')`
  (`security definer`, owner `griddo_writer`, empty `search_path`) per SCHEMA
  §Account preparation steps 1–2; its lock (S30). The seed copy (step 3) comes
  in Task 237.
- `supabase/tests/write-role.db.test.ts`: acting as `griddo_writer` with user
  A's claims, an insert or update of a user B row fails under RLS;
  `auth.uid()` resolves inside the function; no client role can execute an
  `internal` function.
- `supabase/tests/ensure-account.db.test.ts`: ported `system-nodes.test.ts`
  scenarios (missing, trashed, archived, hidden, occupied cell, full L0);
  the cell-picking cases (passed reserved cells skipped, a malformed list
  `rejected` with `invalid_input`, the default unchanged); idempotence; two concurrent calls on a new account create one Inbox and one
  Archive; `last_visit_at` advances.

**Dependencies:** Task 214.

**Authority:** S13, S14, S29 (1)(2), S30, S42 (5); SCHEMA §Schemas and roles,
§Account preparation, §Locks.

**Observable acceptance:**
- The write-role proof passes locally. If it does not hold, the task records
  that in the ledger, tells the user, and switches to the recorded fallback
  (explicit per-function ownership checks, S14) before any further function.
- `ensure_account()` matches today's `ensureSystemNodes()` outcomes, except
  that with L0 full the Node is skipped and the rest applies (the ported test
  changes from "throws" to "skips"); a caller whose auth user is gone gets
  `rejected` with `account_missing`.

**Verification:** full gate; `expert` review with the SQL checklist.

**Commit message:** `feat(db): add the write role and ensure_account`.

### Task 216: [x] Add the account snapshot and the function coverage suites

**Files and actions:**
- Migration: `public.get_snapshot()` (`security invoker`), one SQL statement
  returning one JSON value with all five tables of the caller's account,
  trashed and archived rows included (SCHEMA §Snapshot).
- `supabase/tests/snapshot.db.test.ts`: only the caller's rows; more than
  1,000 rows arrive intact; a staged candidate never arrives without its
  source while a concurrent transaction inserts both.
- `supabase/tests/coverage.db.test.ts`: lists every function in `public` from
  the catalog and fails when one has no registered cross-account case or no
  change-set case (write functions); lists every function in `internal` and
  checks that `anon` and `authenticated` cannot execute it.
- `supabase/tests/helpers/change-set.ts`: snapshot before + envelope
  `changes` = snapshot after (S31).
- `supabase/tests/fixtures/limit-sized-account.ts`: builds an account at the
  account limits and one at a tenth of them, for D8.

**Dependencies:** Task 215.

**Authority:** S17, S31, S14, S29; SCHEMA §Snapshot, §Database tests; D8.

**Observable acceptance:**
- The suites above pass; adding an exposed function without its cases makes
  `coverage.db.test.ts` fail.
- The local snapshot time and size for both fixture accounts are recorded in
  the ledger (the production measurement is Task 218).

**Verification:** full gate; `expert` review with the SQL checklist.

**Commit message:** `feat(db): add the account snapshot and the coverage suites`.

### Task 217: [x] Build the end-to-end slice behind a development switch

**Files and actions:**
- `src/lib/db/supabase-client.ts`: browser client from the public env vars,
  session persisted by supabase-js.
- Migration: `public.update_node()` with the full ordinary-write contract
  (fields, Hook 1, Hook 2, Hook 8 with the Grid and lifecycle locks, Hook 12,
  `rejected` codes, envelope); its cross-account, concurrency and change-set
  cases.
- `src/lib/db/snapshot-store.ts` and test: base plus the ordered pending-write
  list; view = base with pending applied; envelope `changes` applied to the
  base through `row-mapping.ts`; writes to one record sent in order; a pending
  write leaves on settle (applied or rolled back); a refetch sent before a
  write settled is discarded and sent again; subscriptions (SPEC Architecture
  Decision 19).
- `src/lib/constants.ts`: `DISPLAY_DELAY_MS`, `REQUEST_TIMEOUT_MS` and the
  connection probe interval (D7), unless Task 243 has added the first.
- A development-only page, `src/app/dev/supabase-slice/page.tsx`, rendered
  only when `NODE_ENV` is `development` and `NEXT_PUBLIC_GRIDDO_SUPABASE_SLICE=1`
  (otherwise `notFound()`; the variable is added to `.env.local.example`):
  signs in anonymously on local Supabase, calls
  `ensure_account()`, loads the snapshot and lists the L0 Nodes with controls
  that move one Node through the pending layer, showing pending, applied and
  rolled-back states.

**Dependencies:** Task 216.

**Authority:** S07, S31, S32, S36; SCHEMA §Result envelope; SPEC Architecture
Decision 19, §Environments And Hosting (development switch).

**Observable acceptance:**
- Snapshot-store tests: one Node moved twice quickly ends in the second cell
  without jumping back; a focus refetch during a pending write does not hide
  it; a stale refetch that started before a settled write is discarded; a
  `rejected` result rolls the view back to the base.
- With the switch on, the slice page shows the account's L0 Nodes and a move
  reaches the database (a reload shows it); with the switch off, or in a
  production build, the route returns 404.
- The envelope (with `rejection.limit`, SCHEMA §Result envelope) and the
  pending-layer shapes are fixed here; Phases 43–44 reuse them unchanged.

**Verification:** full gate; `expert` review (SQL checklist and the
pending-layer logic); browser check of the slice page.

**Commit message:** `feat(db): add the end-to-end Supabase slice`.

### Task 218: [x] Set up production early and verify the hosted plan

**Files and actions:**
- The user creates the production Supabase project (Seoul, free plan) and the
  Vercel Hobby project linked to `main`, and sets the public env vars in
  Vercel. Production anonymous sign-in stays off except for the measurement
  below; there is no production OAuth or Turnstile yet (S36).
- Apply the migrations to production after the user's approval
  (`supabase db push`, before launch).
- `scripts/verify/hosted-roles.sql`: run against production with the
  connection string kept outside Git; repeats the write-role proof and the
  internal-function checks on hosted Supabase, then removes its rows.
- `hosted-roles.sql` also checks the account-deletion role: whether hosted
  Supabase allows a dedicated role that may delete only the caller's auth
  user (S42 (1)).
- Check `pg_cron`: enable it; schedule a job that deletes one temporary
  anonymous auth user created for the check (the guest-cleanup path), confirm
  the cascade, then remove the job.
- Check the Security Advisor while anonymous sign-in is on; record lint 0012
  (`auth_allow_anonymous_sign_ins`) as an accepted warning if it fires, since
  guests are anonymous by design (S10).
- D8 measurement: with anonymous sign-in on for the measurement only, load
  the snapshot of a limit-sized and a one-tenth account from the owner's
  network, record time and size, delete both accounts, and turn anonymous
  sign-in off again. The project is unannounced and holds no real data.
- Ledger: record every result.

**Dependencies:** Task 217.

**Authority:** S14, S21, S22, S36, S37; D1, D8; SPEC §Environments And Hosting.

**Observable acceptance:**
- Production runs every migration; the hosted write-role proof passes, or the
  S14 fallback is recorded and the user is told before Phase 43.
- `pg_cron` is available and its job can delete an anonymous auth user, or
  the S22 fallback (a scheduled GitHub Actions call) is recorded for Task 238.
- The account-deletion branch is recorded in the ledger before Phase 43: the
  dedicated role, or the SCHEMA fallback. Task 235 implements only that
  branch.
- Vercel deploys `main` (still the IndexedDB app) at an unannounced URL.
- The limit-sized snapshot loads in 3 seconds or less and the one-tenth one in
  1 second or less; otherwise the task proposes lower limits, and a SCHEMA
  amendment follows the user's approval before Phase 43.
- Anonymous sign-in is off again in production; no secret is in Git.

**Verification:** full gate; the verification script's output in the ledger;
the user confirms the dashboard settings.

**Commit message:** `docs(db): record the early production setup`.
