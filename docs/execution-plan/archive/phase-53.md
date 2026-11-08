# Phase 53 — Account restore

## Completion-time scope

Closed 2026-11-09. Tasks 260–264 are user-accepted. DB lane, on branch
`phase-53/account-restore`, with no app lane open beside it: restore staging,
`restore_begin()`, `restore_stage()`, `restore_abort()` and
`restore_account()` in SQL (260); the backup Edge Function's `restore` mode,
the pre-restore file, the streamed steps and the restore list and verdict in
`status` mode (261); `Restore…` in the `Backup` dialog, the restoring screen
and the other-tab follow (262); the monthly restore check
`pnpm check:restore` (263); the recovery drill on a new Supabase project and
the production close (264).

Production (Task 264, each step approved by the user): the close dump
`~/griddo-dumps/2026-11-08-close/` (deleted by 2026-11-15); migration
`20261044000000_account_restore.sql` pushed with `--skip-vault`; the `backup`
function deployed as version 4, its seven secrets unchanged (digests 7 of 7);
Security Advisor 48 → 49 results by `--linked --project-ref`, the one new
`authenticated_security_definer_function_executable` on
`public.restore_account` and the `unused_index` INFO on `app.restore_staging`
accepted by the user; the production measurement at the current account
limits (wall 13.4 / 12.6 / 13.0 s, `restore_stage()` 3.5–4.2 s,
`restore_account()` 2.9–3.3 s, steps unbuffered); the first scheduled run
after the deploy succeeded and the Healthchecks.io check stayed up. Task 263's
first real run against the production bucket passed (2026-11-08). The
retirement record (DECISION §Retiring the manual dump, B17) holds all three
conditions: the first SQL phase after Phase 54 replaces the manual dump with
a confirmed backup of every account.

Carried in: Phase 52 mi-2 (closed for restore by D1 in Task 260), the
undecodable-token 502 (fixed in Task 261), the Task 260 note (read; its
`--db-url` Advisor line corrected by Task 264 Lesson 1). Carried over, in
[`Issues_Deferred.md`](../../issues/Issues_Deferred.md): mi-3 (the restore
list shows a copied file's copy time), mi-4 (restore staging at the old caps)
and mi-5 with mi-1 as one load-dependent `triage-workspace.test.tsx` row.
Ledger: [`Issues_Phase_53.md`](../../issues/Issues_Phase_53.md).

Differences from the contracts below, recorded in the ledger and accepted with
their tasks:
- Task 260: every restored row takes the caller's `internal.uid()` as
  `user_id` and `restore_account()` returns no `changes` (SCHEMA amended
  `37d1205e`, `2c5228ff`); Decisions D1–D3 (`77d63f09`): a `not_started`
  verdict read closes the id with a staging row, `restore_account()` refuses a
  call 140 s or more after `restore_begin()` (`too_late`), and the verdict
  reads the account's staging row for the id first. The hosted body probe
  (`scripts/backup-measure/hosted-body-probe.mjs`) passed on production, so
  staging stays one `restore_stage()` call.
- Task 261: an undecodable bearer token answers 401 `invalid_token`; the
  restore refuses a file whose ETag changed since the list was read
  (`dea2335e`); its mi-2 (an auth-server outage answers 401) was dropped by
  the user.
- Task 262: `use-inert-body.ts` (a holder count) beside the planned files; the
  step markers follow option A of the user's option sheet; MI-1 to MI-3 were
  fixed in the task (server render, Cmd+K under the screen, list refresh).
- Task 264: the restore's production pass case is the current real-account
  limits; the old-caps result (wall 27.9 / 41.7 s) stays a known limit
  (`3ad8de29`, DECISION §Measurement and acceptance, mi-4); the measurement
  clears `restore_started_at` between runs through the owner connection
  (MI-4); the `copy-account` identity file carries `user_id` per row (expert
  L7); scripts `scripts/backup-ops/` and
  `scripts/backup-measure/{prod-restore-measure.mjs, db-time.ts,
  cron-window.ts}`. The drill's first `supabase secrets set` read the
  worktree's `.env.local` (MI-5, closed; production unaffected).
- Learnings flow: every task's work plan carried a `Learnings:` line and every
  checkpoint a `Lesson:` line.

## Task contracts at close

Authority and shared rules: the
[Account Backup — Phases 52–54](../../EXECUTION_PLAN.md#account-backup--phases-5254)
section of the plan (lanes, shared rules, user preparation).

Flow review: [Phases 52–54 flow review](../../reviews/phase-52-54-flow-review.md).

Scope: restore with concurrency protection, `Restore…` and the restoring
screen, the monthly restore check and the recovery drill. Leaves behind the
manual dump's retirement once its three conditions hold. Out of scope: pushing
a restore to other devices.

**Task order:** 260 → 261 → 262 → 263 → 264.

### Task 260: [x] Add restore staging and `restore_account()` in SQL

**Files and actions:**
- First, before the migration is written: the hosted body probe. Task 255
  measured the body limit on local Kong only (a 10,461,416-byte rpc body
  returned 200), so `restore_stage()` takes the whole payload in one call
  unless production refuses that size. `scripts/backup-measure/hosted-body-probe.mjs`
  reads the URL and publishable key with `scripts/verify/lib.mjs` (no secret
  key, no database connection) and POSTs to
  `rest/v1/rpc/<a function name that does not exist>`: a small body first as
  the control, then an about 10.5 MB JSON body, then one about twice that
  size, recorded only (an account above the row limits can be larger). Pass:
  404 `PGRST202` naming the body's parameter, so PostgREST read and parsed
  the whole body; limit: 413; any other answer is inconclusive and is
  reported, with no scope change. It changes nothing on production and
  prints statuses, codes and sizes only, with the URL masked. The user runs
  it in their own terminal after approving it; the ledger records the
  result. On a 413 for the 10.5 MB body, staging takes rows per table: the
  advisory session writes that change into SCHEMA §Backup functions and
  Tasks 260–261 before the migration. Task 264's real restore runs confirm
  the hosted limit again either way.
- A migration: `app.restore_staging` with RLS, `griddo_writer` select and
  update policies and the `service_role` grants (`select`, `insert`,
  `update`); the two restore columns of `app.backup_status`
  (`restore_started_at`, `restore_id`); `restore_begin()` (first step, no
  payload), `restore_stage()`, `restore_abort()`; `restore_account()`;
  `backup_read_status()` with the restore verdict by id; `get_snapshot()`'s
  `backup` key with `restore_started_at` (SCHEMA §Snapshot); the hourly
  `postgres` `pg_cron` job that deletes staging rows older than one hour.
- `src/lib/db/database.types.ts`; `supabase/tests/restore-*.db.test.ts`.

**Dependencies:** Phase 52 closed.

**Authority:** SCHEMA §Account backup (Restore, Format versions), §Locks; B4,
B5; DECISION §Restore, §Concurrent writes and other tabs.

**`expert` review items:** the full lock list over every write function and
the restore's order; whether `restore_account()` locks the `accounts` row
first or never touches it; the result in the staging row against a result in
`backup_status` (B5); the restore verdicts on the server clock; no deadlock
with Chunk writes and Node moves; Phase 52 `mi-2` (a verdict read sent after a
connection reset can overtake the begin call and answer `not_started` for an
operation that then starts): decide whether the restore verdict closes it, for
example by refusing a begin whose id was already judged `not_started`.

**Observable acceptance:** the hosted body probe's result is in the ledger
before the migration, and staging follows it; `restore_account()` cannot read another account's
staging row; a direct browser call applies only what was staged for it; a
payload whose rows name another user id restores into the caller only and
leaves that other account unchanged; a
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

### Task 261: [x] Add restore to the Edge Function

**Files and actions:**
- First, measure locally and record: whether a streamed response passes the
  local gateway unbuffered through `withCorsHandler` (Phase 52 Task 260
  note); and what the database does when the function's
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
- `supabase/functions/backup/auth.ts`: a token whose payload does not decode
  makes `getClaims` throw, and the function answers 502 `unconfirmed`, a
  no-answer status; it answers 401 `invalid_token` instead, with a test
  (Phase 52 Task 259, 2026-11-07).
- Task 260 carries (expert and advisory reviews, 2026-11-07): when the `restore_account()` call errors, call `restore_abort()` with a reason such as `restore_failed` (the staging-row guard keeps a committed or still-running call's result), so the user does not wait 180 s for a known failure; retry `restore_account()` once on SQLSTATE 40P01 (the rollback is certain, the row has no result, the guard makes the retry safe; the lock order of the `lock_bit_and_node` and `lock_tree` retry paths is the residual risk); `restore_stage()` has its own 30 s `statement_timeout`; `restore_account()` refuses a call 140 s or more after `restore_begin()` (`too_late`), so the function's whole restore must reach it earlier; the verdict read of a `not_started` id closes it (Phase 52 mi-2).
- Task 260 advisory note (2026-11-07): `p_expected_fingerprint` is the `fingerprint` key of the very `export_account()` value uploaded as the pre-restore file, never a separate `backup_fingerprint()` read; the stream maps every `restore_account()` answer: `applied`, `already_applied`, `not_applied` (`too_late`, no payload, no row), and `rejected` with `account_changed`, `unsupported_format`, `account_missing`, `account_deleting` or `invalid_input`; a test that reads a verdict before its begin uses a fresh id each time (a verdict read of an unknown id closes it).
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

### Task 262: [x] Add `Restore…`, the restoring screen and the other-tab follow

**Files and actions:**
- Merge `main` first.
- `src/lib/backup/backup-client.ts`, `src/hooks/use-backup.ts` and tests: a
  client-generated restore id; the `text/event-stream` restore read under the
  client's own deadline from the request start; `BroadcastChannel`
  `restore-started` and `restore-ended` with the outcome on every terminal
  outcome; the way-out after `EDGE_REQUEST_TIMEOUT_MS` with the verdict for
  that restore id; drop the snapshot and repeat entry on `applied`.
- Task 261 carries (finish review, 2026-11-07): the restore request sends the
  chosen list entry's `etag` beside its `file` (SCHEMA's wire format); and the
  function calls `restore_account()` with the request's JWT up to about 140 s
  after the request starts, so the client refreshes the session before a
  restore when the access token expires within 3 minutes, or an expiry in that
  window ends the restore as not applied.
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

### Task 263: [x] Add the monthly restore check

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
- Note, not a step: this task has no alert drill. If the 31-day check's
  missing-ping alert is ever drilled, send one success ping right before
  shortening the period, so the check is up with a recent ping when it goes
  down (Task 259 step 7: a down flip made with a stale last ping sent no
  email, one two minutes after a fresh ping did).

**Dependencies:** Task 262; the user's Task 263 preparation.

**Authority:** DECISION §Periodic restore check; SCHEMA §Account backup.

**Observable acceptance:** the user's first run passes and pings the check;
an interrupted run leaves no test user; no row content appears in the output.

**Verification:** gate; a test of the comparison on a crafted mismatch.

**Commit message:** `feat(backup): add the monthly restore check`.

### Task 264: [x] Run the recovery drill and close Phase 53 on production

**Files and actions:**
- `scripts/backup-ops/copy-account` (Mac): finds an account's old key by
  provider user id and copies its objects to the new key in a **target
  bucket given as an argument** (B16): the drill bucket now, the production
  bucket in a real recovery. Across buckets it reads with the read-only
  production token (Task 263) and writes with the target's token (GET and
  PUT); within one bucket it uses CopyObject.
- The drill, recorded in the ledger: a new Supabase project; the migrations
  from Git; unschedule its cron jobs at once; the read-only catalog listing
  (`scripts/verify/catalog.sql`, Task 259) on the drill project compared with
  production, every difference explained (Phase 52 Task 259 MI-2: a hosted project's
  default privileges are unproven); set none of the Healthchecks.io
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
  clock; judged at the current real-account limits, the old caps recorded as
  a known limit: DECISION §Measurement and acceptance, amended by MI-6, user,
  2026-11-08), which also confirm that the hosted API accepts the limit-sized
  `restore_stage()` body (Phase 52 Task 255 carry; Task 260's probe checked
  it first), and a check that the streamed steps arrive unbuffered; the
  script cleans up on SIGINT and SIGTERM.
- If the drill passed and Task 263's first run passed (Task 259 proved the
  alert), the ledger records that the three retirement conditions hold and
  that the first SQL phase after Phase 54 removes the manual dump through its
  `/craft-docs` (B17).

- Task 260 carries (expert review, 2026-11-07): time a limit-sized `restore_account()` on the drill project: it holds L0 and every Node and Bit, so other tabs' writes and `ensure_account()` wait behind it under the 8 s REST limit and fail with 57014 if it runs longer; and record the database-side time of a 10 MB `restore_stage()` on hosted, since the hosted body probe was answered by PostgREST before Postgres ran the call.

**Dependencies:** Task 263; the user's Task 264 preparation.

**Authority:** DECISION §Recovery drill, §Retiring the manual dump, §Object
key; B16; CLAUDE.md §Production, §Backup.

**Observable acceptance:** the drill restores the owner's account in the new
project with matching counts and hashes; the drill project never touched the
production bucket; the production measurement passes at the current
real-account limits; the steps stream on production; the retirement record is
written or its missing condition named.

**Verification:** the ledger record; `git diff --check`.

**Commit message:** `docs(phase-53): record the recovery drill and the production close`.
