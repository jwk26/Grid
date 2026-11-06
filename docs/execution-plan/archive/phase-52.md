# Phase 52 — Account backup

## Completion-time scope

Closed 2026-11-07. Tasks 255–259 are user-accepted. DB lane, on branch
`phase-52/account-backup`, beside the stabilization app lane (Phase 51, closed
2026-11-05): the Edge toolchain (Deno 2.1.4 as a devDependency, `pnpm
check:edge`, the `@edge-shared/*` alias) and the local go/no-go measurement
(255); backup status, export, fingerprint, the daily dispatch and the summary
in SQL (256); the backup Edge Function with its `scheduled`, `manual`,
`status` and `summary` modes, retention, `identity.json`, R2 deletions and the
Healthchecks.io ping (257); the sidebar `Backup` button and dialog without
`Restore…` (258); the production close (259).

Production (Task 259, each step approved by the user): the close dump and its
restore test on local Supabase (2026-11-06); the function deployed with
`verify_jwt = false`; seven function secrets and two Vault entries set; three
migrations pushed (`20261041000000_account_backup.sql`,
`20261042000000_backup_account_check.sql`,
`20261043000000_backup_begin_fingerprint.sql`), Vault untouched; Security
Advisor 44 → 48 results, the four new accepted by the user; the limit-sized
measurement (worst run 18.9 s under 37.5 s); the owner's first backup, the
first scheduled run and summary with the success ping; the forced alert email
(second try). The interim dump of 2026-11-04 was deleted (step 8). After the
merge: the owner's `Back Up Now` and one dialog reopen, and the next summary
ping, recorded in a follow-up record PR; the close dump
`~/griddo-dumps/2026-11-06-close/` is deleted by the user by 2026-11-13.

Carried in: none. Carried over, in
[`Issues_Deferred.md`](../../issues/Issues_Deferred.md): mi-2 (bound to the
Task 260 `expert` review), the 502-for-an-undecodable-token finding (bound to
Task 261), the Task 260 note for Phase 53, and the post-merge smoke with the
close dump deletion.
Ledger: [`Issues_Phase_52.md`](../../issues/Issues_Phase_52.md).

Differences from the contracts below, recorded in the ledger and accepted with
their tasks:
- Task 255: the go/no-go CPU basis is the edge runtime container's cgroup CPU,
  since `process.cpuUsage()` is not implemented there (MI-1, user decision);
  the committed `config.toml` keeps no `[db.vault]`, and
  `scripts/backup-vault.mjs` writes the local Vault entries after a reset
  (MI-2, option c).
- Task 257: two migrations beyond Task 256's: `backup_account_check()` for the
  pre-upload account check (advisory review, SCHEMA amendment) and a
  redefinition of `backup_begin()` that also returns `last_fingerprint` (a
  plan gap found in stage 2). `_shared/` gained `export-head`,
  `export-failure`, `s3-xml`, `safe-error`, `claims`, `request` and
  `identity`; `global-setup.ts` serves the function during `pnpm test:db`.
- Task 258: `backup-slot.ts`, `backup-controller.ts` and `forced-backup.ts`
  beside the planned client and hook (advisory review, approved); a
  successful `Back Up Now` answer with no `backup` value asks for one
  snapshot refetch (expert finding 2).
- Task 259: the function answers CORS itself (`_shared/cors.ts`, MI-1: the
  hosted gateway adds no CORS headers and local Kong hid it); step 7's drill
  shortens the Healthchecks.io period instead of breaking the ping secret
  (plan amended `f71acce`); scripts `scripts/verify/catalog.sql` and
  `scripts/backup-measure/{close-measure.mjs, prod-console-check.js}`. The
  ledger reused the IDs MI-1 and MI-2 in Task 259 after Task 255 had used
  them; a Phase 52 MI reference outside the ledger names its task.
- Learnings flow (ST29): every task's work plan carried a `Learnings:` line;
  every task's checkpoint carried a `Lesson:` line (Task 256 as a lesson
  candidate).

## Task contracts at close

Authority and shared rules: the
[Account Backup — Phases 52–54](../../EXECUTION_PLAN.md#account-backup--phases-5254)
section of the plan (lanes, shared rules, user preparation).

Flow review: [Phases 52–54 flow review](../../reviews/phase-52-54-flow-review.md).

Scope: automatic daily backups of signed-in accounts to R2, `Back Up Now`,
status, failure alerts and deleting R2 objects with the account; the sidebar
`Backup` button and dialog without `Restore…`. Leaves behind automatic
backups of real data. Out of scope: restore (Phase 53) and the deletion grace
period (Phase 54).

**Task order:** 255 → 256 → 257 → 258 → 259.

### Task 255: [x] Set up the Edge toolchain and measure the function locally (go/no-go)

**Files and actions:**
- `package.json`, `pnpm-lock.yaml`: Deno pinned as a devDependency if a
  `deno` npm package publishes the binary at the Supabase edge runtime's major
  version, otherwise a documented global install at that version; the script
  `check:edge` (`deno check` and `deno lint` over `supabase/functions/`).
- `tsconfig.json`: `allowImportingTsExtensions`, the `@edge-shared/*` path to
  `supabase/functions/_shared/*`, and `supabase/functions/backup` in
  `exclude`. `vitest.config.ts`: the same alias, and
  `supabase/functions/_shared/**/*.test.ts` in `include`. The ESLint config
  ignores `supabase/functions/backup`.
- `supabase/functions/backup/index.ts`, `deno.json`, `deno.lock`: a minimal
  handler; `supabase/functions/_shared/`: one pure module with its test, to
  prove both checkers and vitest.
- `supabase/config.toml`: `[db.vault]` and `[edge_runtime.secrets]` read their
  values from `.env.local` through `env(...)`; `[functions.backup]` with
  `verify_jwt = false`; the S3 endpoint if needed. (Amended 2026-11-05, Task
  255 MI-2: `[db.vault]` served the local measurement only; Task 256 removes
  it, since `supabase db push` writes it into the target database's Vault.)
  `.env.local.example`: the names.
- `scripts/backup-measure/` (local only, never against production): builds an
  account of about 10 MB raw with SCHEMA's fields and random Hangul syllables
  in SQL under a random test user, a temporary export of the same shape, and
  deletes both at the end and on SIGINT and SIGTERM.
- The Phase 52 ledger: every measurement below, as numbers.

**Measurements and checks** (each recorded with its result):
1. Stream the export into gzip level 1 and upload it, with each candidate S3
   client (a light signer such as `aws4fetch`, and `@aws-sdk/client-s3`):
   go when CPU stays under 500 ms and memory under 64 MB (a quarter of each
   limit).
2. The fingerprint's cost on the 10 MB account.
3. The API request body limit for a roughly 10 MB `restore_stage()` payload;
   if refused, Task 260 stages rows per table.
4. Local object storage: local Supabase Storage's S3 endpoint for
   PutObject, GetObject, ListObjectsV2, DeleteObjects and CopyObject, and the
   bucket's recreation after `supabase db reset`; any failure moves the gates
   to a separate S3-compatible container. The endpoint is an environment
   variable.
5. Real R2, once, with the development bucket: the same five calls.
6. `pg_net` from the database container reaches the local function at the URL
   stored in local Vault (for example through `kong` or
   `host.docker.internal`), and the Vault values come back after a reset. The
   scheduled path (flow review W1): a call longer than `pg_net`'s request
   timeout, whether the run continues once the caller has gone, and so the
   `timeout_milliseconds` and batch size the dispatch uses; the function runs
   with `verify_jwt = false` in `[functions.backup]` and verifies the JWT
   itself for the JWT modes, since the scheduled call carries the shared
   secret, not a JWT.
7. The HTTP status a function killed at its wall clock or memory limit
   returns, for the client's no-answer set (SPEC §Account backup).
8. `.ts`-extension imports and `@edge-shared/*` pass `tsc`, `pnpm build`,
   vitest (both `vitest.config.ts` and `vitest.db.config.ts` get the alias)
   and `deno check`.
9. The unchanged-account check without parsing the stream: the fingerprint
   read first through `backup_fingerprint()`, its cost added to item 2.

**Dependencies:** this phase's lifecycle gate; the user's development bucket
and token.

**Authority:** DECISION §Measurement and acceptance, §Runner; B10, B11, B12;
SPEC §Environments And Hosting.

**Observable acceptance:** the ledger holds each measurement with its numbers
and a go or no-go; the chosen S3 client, object storage and Deno pin are
named; `pnpm check:edge` runs and passes; the gate passes. On a no-go the task
stops and the user chooses between the DECISION fallbacks (the scheduled run
on GitHub Actions, or one account's export split into calls per table) through
a plan amendment.

**Verification:** gate; the measurement script's output (counts and times
only); a deliberately broken `_shared` import fails `tsc` and `deno check`.

**Commit message:** `chore(backup): set up the Edge toolchain and record the local go/no-go`.

### Task 256: [x] Add backup status, export, fingerprint and the daily dispatch in SQL

**Files and actions:**
- A migration: `pg_net`; `app.backup_status` with RLS, its `authenticated`
  select policy and grants; `internal.r2_deletions` with RLS and no policy;
  `internal.account_fingerprint`; `internal.backup_summary_state` with its
  single row;
  `public.export_account` (30 s); the backup functions of SCHEMA §Backup
  functions except the Phase 53 `restore_begin`, `restore_stage` and
  `restore_abort`, with `backup_read_status` in its final signature
  (`p_restore_id` ignored until Task 260); `get_snapshot()`
  with the `backup` key; `internal.dispatch_backups()` and
  `internal.dispatch_backup_summary()` reading Vault (the backup dispatch skips
  accounts with a deletion request; the summary dispatch counts `missing`
  from `auth.users` and sends the count); two `pg_cron` jobs, the
  backup at 17:00 UTC and the summary at 19:00 UTC; the revoke of
  `service_role`'s default grants followed by exactly the SCHEMA list.
- The same migration changes `internal.cleanup_guests()`: lock each target's
  `accounts` row `for update`, check again on the locked row, then delete;
  insert an `internal.r2_deletions` row for each deleted real account in the
  same transaction.
- `src/lib/db/database.types.ts` (generated).
- `supabase/config.toml`: `[db.vault]` removed (Task 255 MI-2; SPEC
  §Environments And Hosting, Backup secrets). A local-only script under
  `scripts/` writes the Vault entries `backup_function_url` and
  `backup_shared_secret` from `.env.local` after a reset, refusing any
  database host but `127.0.0.1` and `localhost`; `package.json` `test:db` runs
  it between `supabase db reset` and the suites.
- `supabase/tests/backup-*.db.test.ts`, `coverage.db.test.ts`: the tests
  below; `src/lib/db/snapshot-store.test.ts`: the current parser accepts a
  value with a `backup` key and ignores it.

**Dependencies:** Task 255 (go).

**Authority:** SCHEMA §Backup functions, §RLS and grants, §Snapshot, §Guest
cleanup, §Account backup; B8, B9, B12; DECISION §Export path, §Backup status,
§Deleting R2 objects.

**`expert` review items:** the SQL checklist for every function; how each
backup function applies RLS as `service_role` and filters by `p_user_id`;
`already_running` and `rate_limited` under the one row lock of
`backup_begin()`; the operation verdicts on the server clock; the cleanup's
lock order against `delete_my_account()` and client writes; that
`statement_timeout` is hoisted by REST; that no backup function needs a right
in `auth`.

**Observable acceptance:** `anon` and `authenticated` get `permission denied`
on every backup function; the `service_role` catalog test passes and fails
when one extra grant is added; a status write for account A leaves B's row
unchanged; a REST call to `export_account()` running past 8 s passes with the
setting and is cut at 8 s without it; the fingerprint changes on a Chunk edit
and not on a `backup_status` write; `backup_begin()` refuses a second manual
run within 5 minutes with `rate_limited`, refuses a run while another is in
progress with `already_running`, gives one refusal for two concurrent calls,
and records a 5-minute-old start as `interrupted`; a verdict read returns
`running`, the result, `interrupted` or `not_started` for the given run id
and never another run's result; `get_snapshot()` carries the caller's `backup` row and never
another account's; with no Vault entry the dispatch functions send nothing;
the cleanup skips an account whose request was cancelled between its query
and its lock, and records an `r2_deletions` row for a deleted real account and
none for a guest; the dispatch sends no call for an account with a deletion
request and the summary's `missing` count leaves it out.

**Verification:** gate; the database suites above through supabase-js
`.rpc()`; a concurrency test of the cleanup against a cancel-like update of
`deletion_requested_at`.

**Commit message:** `feat(db): add backup status, export and daily dispatch`.

### Task 257: [x] Build the backup Edge Function

**Files and actions:**
- `supabase/functions/backup/`: modes `scheduled` and `summary` (shared
  secret), `manual` and `status` (user JWT verified in the function, user id
  only from `sub`, a JWT with `is_anonymous` refused before any read or
  write);
  stream the export through gzip level 1 to R2; skip an unchanged
  fingerprint; check right before an upload that the account exists and has
  no deletion request; prune after a write; write `identity.json` from the
  auth admin API; record start and result through the backup functions; the
  summary records `interrupted`, counts `missing` and new failures, sums
  `stored_bytes` against 8 GB, processes `r2_deletions`, and pings
  Healthchecks.io (success or `/fail`, counts and reason codes only).
- `supabase/functions/_shared/`: retention and pruning, status judgement,
  object keys, response classification, each with vitest tests.
- A migration (amended 2026-11-06, Task 257 work-plan review): the
  pre-upload account check as a backup function (SCHEMA §Backup functions),
  since `app` is not exposed to the API; its grants, the `service_role`
  catalog test and the SQL function checklist follow Task 256.
- `supabase/tests/backup-function.db.test.ts`: integration tests against the
  locally served function with local object storage and a Healthchecks.io
  stub.

**Dependencies:** Task 256.

**Authority:** SCHEMA §Account backup; SPEC §Account backup; B3, B6, B7,
B11, B12; DECISION §Runner, §Retention, §Object key, §Failure alerts,
§Deleting R2 objects, §Limits.

**Observable acceptance:** a `manual` call whose body names another account
backs up only the caller; a guest JWT is refused and leaves no row and no
object; `scheduled` and `summary` without the shared secret are refused; an unchanged account writes no dated file and records the check, and rewrites `identity.json` only when its providers changed; after
files on 14 different days across 8 ISO weeks the bucket holds the 7
latest files and the latest file of each of the 4 ISO weeks before them, and
every other dated file is deleted (amended 2026-11-06: 9 days could not reach
4 earlier weeks), and an unchanged
account keeps its old file; a run that dies after recording its start is
`interrupted` after 5 minutes; an account deleted during a run, or given a deletion request, leaves no
object and records nothing; the summary pings success with no new problem
and `/fail` with one, pings success again when the same account fails on the
next day for the same reason, sends `/fail` once when an account newly
becomes `missing` (no run result of any kind for 36 hours) and once when the
stored total first passes 8 GB, then success again while nothing new appears,
so a new failure on another account still alerts; a permanently failing
account never counts as `missing`; its body holds no id or email; an `r2_deletions` row's objects and row are
deleted, and a row older than three days sends `/fail`; files left from an
earlier run never change a result; files under a key that has no `accounts`
row and no `r2_deletions` row are never deleted (the recovery case).

**Verification:** gate with `pnpm check:edge`; `_shared` vitest suites;
integration suites; `expert` review.

**Commit message:** `feat(backup): add the backup Edge Function`.

### Task 258: [x] Add the sidebar Backup button and dialog

**Files and actions:**
- Merge `main` first (Phase 51 Task 252 also edits `sidebar.tsx`).
- `src/lib/backup/backup-client.ts` and test: `functions.invoke` on the shared
  client; `EDGE_REQUEST_TIMEOUT_MS` for `Back Up Now`, `REQUEST_TIMEOUT_MS`
  for status; the no-answer statuses with Task 255's measured one.
- `src/hooks/use-backup.ts` and test: status from the snapshot's `backup`
  value, replaced by a newer `Back Up Now` result or status read (later
  `server_now` wins); ages from `server_now`, never the device clock; the
  dialog's single status read; `Back Up Now` with a client-generated run id,
  `already_running`, and its unknown outcome path (one verdict read for that
  run id after the request ended: `Still finishing…`, the result, the red line
  or the did-not-start line, `Check again`), never a resend.
- `src/lib/db/snapshot-store.ts` and test: keep the `backup` value beside the
  account view, refreshed with every snapshot fetch.
- `src/components/layout/backup-button.tsx`, `backup-dialog.tsx` and tests;
  `src/components/layout/sidebar.tsx` and test: the button between the account
  icon and `+`.
- `src/app/globals.css`: the R3 loop and the BK-4 lamp, with reduced-motion
  variants.
- `src/lib/constants.ts`: `EDGE_REQUEST_TIMEOUT_MS = 160000`.
- `src/lib/copy/feedback.ts`: the Backup copy and the guest privacy note.
- `src/lib/dev/state-switch.ts`: backup status overrides (SPEC §Development
  state switch).
- `public/privacy.html`: a backup paragraph (signed-in accounts only, daily,
  Cloudflare R2 outside the main database, the retention, deleted with the
  account).

**Dependencies:** Task 257.

**Authority:** SPEC §Account backup, §Feedback copy, §Development state
switch; DESIGN_TOKENS `DP-BACKUP-01` BK-1–BK-5; B2, B3, B7.

**Observable acceptance:** on every route the sidebar order is Home, account
icon, `Backup`, `+`; a guest's dialog shows `Keep your Grid safe` and the two
sign-in buttons; an account shows each status line with its text, and the
dot only for stale and failed; the running motion shows while a run is in
progress and the still dot under reduced motion; `Back Up Now` shows its
result inline with no toast, the nothing-changed line, and `Try again in a few
minutes.` on a second press, and `Backing up…` with `Check again` while a
scheduled run is in progress; a forced unknown outcome is never resent (one
request in the network log), ends in one verdict read, and shows `Still
finishing…` while the run is open and the did-not-start line when it never
started; after `already_running`, `Check again` reads the status without a
run id and shows the scheduled run's status line, never the did-not-start
line; `Checking…` shows until the status read answers, and a failed read
shows `Couldn't check the backup status.` with `Check again`; after a
successful `Back Up Now` the red dot clears at once; a device clock moved by
an hour changes neither the dot nor the motion; in a non-UTC time zone (for
example `Asia/Seoul`) a backup taken across the UTC date boundary shows the
user's local date and time, not the object name's UTC date; closing the dialog keeps the motion until
the tab sees the result; a scheduled result changes the dot after a tab focus
with no request of its own; the guest privacy note and `public/privacy.html`
carry the backup text.

**Verification:** gate; component and hook tests; the agent's browser checks
on local Supabase with every state forced, the guest dialog, reduced motion,
and `retro-mac`, `neumorphism` and `claymorphism`, light and dark; **Please
check** by the user: two scenes in `griddo`, light and dark, each the sidebar
with the red dot and the account dialog open on the red status, in the
prepared window (CLAUDE.md Test data). The user also confirms the dialog's
action row (DESIGN_TOKENS BK-5).

**Commit message:** `feat(backup): add the sidebar Backup button and dialog`.

### Task 259: [x] Close Phase 52 on production

**Files and actions** (user and production steps; the ledger records counts,
times and the fact that each secret was set):
1. The first manual dump with the interim dump's commands, and its restore
   test on local Supabase (DECISION §First manual dump and restore test):
   reset the stack from a temporary workdir with no migrations, confirm
   `griddo_writer` is gone, restore with `session_replication_role = replica`
   in one transaction, count orphan rows for every composite foreign key and
   for `user_id` (each 0), compare function owners, ACLs, RLS, policies and
   default privileges, confirm one `cleanup-guests` cron row owned by
   `postgres`, then `pnpm test:db` to bring the branch back. Done while the
   app lane runs no browser check; it seeds again afterwards. The role that
   ran the setting is recorded.
2. Deploy the function with `verify_jwt = false`, then set its secrets and
   the two Vault entries. Before the deploy, the function answers CORS itself
   (SPEC §Account backup, Browser calls), with tests, the full gate and an
   `expert` review (Task 259 advisory review, 2026-11-06). Before the deploy,
   also confirm from the Supabase CLI
   `2.121.0` documentation or source which `config.toml` sections
   `functions deploy` and `db push` send to the target project
   (`[edge_runtime.secrets]`, `[storage.buckets]` and any other), and that
   none carries a local value into production.
3. Apply the migrations, outside the cron window. Before the push, confirm
   that `config.toml` has no `[db.vault]` (Task 255 MI-2) and that `postgres`
   holds `UPDATE` on `auth.users` (`select has_table_privilege('postgres',
   'auth.users', 'UPDATE')`; Task 218 proved only `DELETE`, and the new
   `cleanup_guests()` locks the auth user `for update`: Task 256 `expert`
   review); after it, confirm that both Vault entries kept the update time
   step 2 gave them.
4. Measure on production with the limit-sized fixture (old 100% caps, about
   9.44 MB raw, built in SQL under a test account, with random text generated
   per row and its compressed-to-raw ratio recorded as the proof, since an
   uncorrelated subquery runs once and repeats one string in every row, Task
   255): three runs of export with upload; the worst under 37.5 s wall
   clock, `export_account()` inside 30 s. The script deletes the account
   and its objects at the end and on SIGINT and SIGTERM.
5. Confirm no new Security Advisor warning, or show each to the user (SCHEMA
   §Database tests).
6. Confirm one successful scheduled run and the summary's success ping. Then,
   before the merge, the owner, signed in on the production site, calls the
   function's `manual` mode once and its `status` mode once from that page's
   browser console, with a short script the working session shows first; the
   access token never leaves the browser. The JWT modes run only there,
   through the browser's CORS preflight, `getClaims`' JWKS path and the
   function's `SUPABASE_ANON_KEY` (Task 257 finish review; Task 259 advisory
   review, 2026-11-06). After the merge, the owner presses `Back Up Now` once
   and reopens the dialog once (one status read) as the post-merge smoke,
   recorded in a follow-up record PR as the Phase 48 smoke was.
7. Force an alert, after step 6's success ping has shown that the function
   reaches the check: in Healthchecks.io set the daily check's period and
   grace to one minute each, receive the missing-ping email, set them back to
   one day and three hours, then send one success ping to the real ping URL
   from the user's own terminal (the URL read from the secrets file, never
   printed) so the check is up again at once; the ledger records that ping as
   manual. The function's secrets stay as they are, so the alert has no blind
   window beyond those minutes (Task 259 advisory review, 2026-11-07; it
   replaces pointing the ping secret at an invalid URL for about two days).
   The next scheduled summary's success ping is read with the post-merge
   smoke.
8. The user deletes the interim dump (`~/griddo-dumps/2026-11-04/`); the
   ledger records the date, which is within 7 days of step 1's passing restore
   test.

**Dependencies:** Task 258; the user's Task 259 preparation and approvals.

**Authority:** CLAUDE.md §Production, §Backup; DECISION §Deploy order,
§Measurement and acceptance, §Failure alerts, §First manual dump and restore
test; B12.

**Observable acceptance:** the restore test passes with every orphan count 0
and the compared catalog unchanged; the function, secrets and migrations are
on production in that order; the function answers the CORS preflight; the
measurement's worst run passes; one scheduled run and its summary succeed;
the console calls of `manual` and `status` succeed from the production
origin; the forced alert email arrived; the interim dump's deletion is
recorded. Then `/end-phase` merges, and the post-merge smoke follows.

**Verification:** the ledger record of each step; `git diff --check`; for the
CORS change, the full gate and an `expert` review.

**Commit message:** `docs(phase-52): record the production close`.
