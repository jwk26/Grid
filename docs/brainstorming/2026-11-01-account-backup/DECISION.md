# Account Backup and Restore

## Metadata

- Created: 2026-11-01
- Updated: 2026-11-04 (decision session: runner, export, restore, concurrency,
  format, retention, modal)
- Readiness: draft
- Category: feature idea
- Source project: GridDO
- Source topic: `2026-10-21-saas-conversion` (S22, S35); Task 239 advisory
  session
- Source prototype: n/a
- Tags: backup, restore, account, r2, saas, operations
- Dependencies: Phase 48 close; `2026-10-31-account-deletion-grace-period`

## Table of Contents

1. [Summary](#summary)
2. [Decisions (user, 2026-11-01)](#decisions-user-2026-11-01)
3. [Decisions (user, 2026-11-04)](#decisions-user-2026-11-04)
4. [Facts checked on 2026-11-04](#facts-checked-on-2026-11-04)
5. [Design](#design)
6. [Why R2](#why-r2)
7. [Retiring the manual dump](#retiring-the-manual-dump)
8. [First manual dump and restore test](#first-manual-dump-and-restore-test)
9. [Open questions](#open-questions)

## Summary

Signed-in users get an iCloud-like backup: it runs by itself on the server,
needs no local file and no open tab, and can be restored from anywhere. This
is the first candidate after the launch (`D-ACCOUNT-BACKUP`). Phase 48 ships no
backup: production holds nothing to keep until the launch.

Between the launch and the first production dump, production data has no
backup. The user accepted this risk (S35, 2026-11-01).

The 2026-11-04 session settled the runner, the export and restore paths, the
backup format, retention and the Account modal. Failure alerts, the dump
retirement steps, deleting R2 objects with the account and the phase split
are still open ([Open questions](#open-questions)). Discarded alternatives are
in `NOTES.md`.

## Decisions (user, 2026-11-01)

- Signed-in OAuth accounts only; guests are left out.
- Storage outside Supabase: Cloudflare R2, chosen over a second database.
- The modal has a short description, the latest backup date, a backup button
  and a status light. Status also reads as text, not by colour alone.
- Restore is in scope from the first version.
- Retention draft: one backup a day for the latest 7 days, then one a week for
  the 4 weeks before them. Replaced on 2026-11-04 by file-based slots
  ([Retention](#retention)).
- A manual dump stays only until this work retires it
  ([Retiring the manual dump](#retiring-the-manual-dump)).

## Decisions (user, 2026-11-04)

1. **Runner:** one Supabase Edge Function, called once per account
   ([Runner](#runner)).
2. **Export:** the function reads through `public.export_account()`, which
   only `service_role` can execute, with a 30 s statement timeout
   ([Export path](#export-path)).
3. **Restore:** the server stages the backup, and the user's own JWT applies
   it through an ordinary write function ([Restore](#restore)).
4. **Limits on restore:** a restore checks no row limit; an account above a
   limit keeps its rows, as SCHEMA §Account limits already states.
5. **Concurrency:** a content fingerprint, compared after locking; restored
   versions move forward; tabs of the same browser follow at once
   ([Concurrent writes and other tabs](#concurrent-writes-and-other-tabs)).
6. **Format versions:** expand needs no new version; contract adds one step
   from the previous version ([Format versions](#format-versions)).
7. **Retention:** file-based slots instead of calendar days, so an unchanged
   account never loses its backups ([Retention](#retention)).
8. **Modal:** a `Backup` section in the Account modal, server-side rate limits,
   and no storage cap ([Backup status](#backup-status),
   [Modal and copy](#modal-and-copy), [Limits](#limits)).
9. **Acceptance:** the largest account the app still opens is the pass case,
   measured locally for CPU and memory and on production at phase close for
   time ([Measurement and acceptance](#measurement-and-acceptance)).
10. **Deploy order:** Edge Functions deploy between the migrations and the
    merge; the rule text goes into `CLAUDE.md` §Production through this
    topic's `/craft-docs` ([Deploy order](#deploy-order)).

## Facts checked on 2026-11-04

- **Edge Functions** (Supabase docs, Limits and Pricing): 256 MB memory; wall
  clock 150 s on the free plan (400 s paid); 2 s CPU per request, which does
  not count async I/O; request idle timeout 150 s; 500,000 invocations a month
  on the free plan. The function's environment holds
  `SUPABASE_SERVICE_ROLE_KEY` by default.
- **GitHub Actions schedule:** at most every 5 minutes; runs can be delayed or
  dropped under load; in a public repository, schedules are disabled after 60
  days without repository activity.
- **Vercel Cron, Hobby:** once a day, anywhere within the hour; it runs a
  Vercel Function, which is Next.js server code (Architecture Rule 1).
- **Statement timeouts** (Supabase docs, Timeouts): `anon` 3 s,
  `authenticated` 8 s, `service_role` none set (falls back to the
  `authenticator` role's 8 s), `postgres` none (global cap 2 min); queries
  through the API are capped at 60 s. A function-level `statement_timeout`
  works through the REST API.
- **PostgREST** (references, Hoisted Function Settings; configuration
  `db-hoisted-tx-settings`, default `statement_timeout,
  plan_filter.statement_cost_limit, default_transaction_isolation`): the
  function's settings are applied as transaction settings before the call. A
  function's own `SET` does not extend the timer of a statement already
  running, so only a call through REST proves the setting.
- **Local gzip** (Mac, Node `zlib`, control tower script rerun): random Hangul
  syllables, 35.9 MB raw: level 1 takes 540 ms CPU (25.1 MB out), level 6 987
  ms (25.2 MB). Repetitive text compresses far better and is not the CPU worst
  case.
- **Production read time** (Phase 48 ledger, Task 240 Stage 2, 2026-11-01): the
  old 100% fixture (9.44 MB raw) took 1.9–7.3 s of server time in
  `get_snapshot()`; local 115–222 ms. Its slowest call missed the 3 s load
  target but stayed under the 8 s timeout, so it is the largest account the
  app still opens.
- **Code** (`main` `6c74625`): `app.chunks` has no `version`, `mtime` or
  `updated_at`. `create_chunk`, `update_chunk` and `delete_chunk` lock the
  Bit's parent Node and then the Bit `for update` and do not update the Bit
  (except Bit auto-completion); `reorder_chunks` locks the Bit. `version`
  exists on Nodes, Bits, Scratch Breakdowns and Staged Candidates.
- **R2 prices:** as checked on 2026-11-01 ([Why R2](#why-r2)); not checked
  again.

## Design

```text
pg_cron (daily) --pg_net, one call per account, shared secret--+
Account modal (user JWT): Back Up Now, Restore, status -------+
                                                               v
                                          Edge Function (one)
   export_account() as service_role  <---|  |---> gzip (level 1) --> R2
   restore_staging insert (service_role) <--|
   restore_account() with the user's JWT <--|
   status fields in app.accounts         <--|
```

### Runner

- One Edge Function serves the scheduled backup, `Back Up Now`, restore, and
  the modal's status and backup list.
- `pg_cron` calls it through `pg_net` once a day for each signed-in OAuth
  account, one account per call. A call is then bounded by the largest
  account, and an account that hits a limit fails alone.
- Scheduled calls authenticate with a backup-only shared secret kept in Vault
  and in the function's secrets; cron never holds the `service_role` key. A
  leaked secret can only start backups, and an unchanged account writes no
  file.
- `Back Up Now`, restore and status take the user id only from the verified
  JWT's `sub`, never from the request body.
- The function streams the export response into gzip without parsing it, at
  level 1 set explicitly (`node:zlib` `createGzip({ level: 1 })`); the web
  `CompressionStream` takes no level. Memory then stays flat whatever the
  account size.
- Fallback when a measurement fails: move only the scheduled run to GitHub
  Actions, with a keep-alive for the 60-day rule, or split one account's
  export into calls per table.

### Export path

- `public.export_account(p_user_id uuid)`: `security invoker`,
  `set statement_timeout = '30s'`, empty `search_path`. One statement builds
  one JSON value with every row of the five tables (as `get_snapshot()`,
  active, trashed and archived) and the account fingerprint, so both describe
  one point in time and no API row limit cuts it.
- EXECUTE goes to `service_role` alone; `service_role` gets `usage` on `app`
  and `select` on its tables. This is the one documented exception to
  revoking `service_role`'s default grants. `service_role` is not a client
  role, because its key exists only on the server.
- 30 s is about four times the 7.3 s worst read of the largest account the app
  opens, inside the API's 60 s cap, and leaves the function's wall-clock budget
  (37.5 s, a quarter of 150 s) room for gzip and upload.
- An object holds Nodes, Bits, Chunks, Scratch Breakdowns and Staged
  Candidates, including trashed and archived rows, plus `format_version`, the
  creation time and the provider's stable user id. It holds no OAuth token or
  session, no device preference and no guest data.

### Restore

The browser cannot reach R2, so a restore always runs on the server.

1. The function verifies the JWT and takes the user id from `sub`.
2. It exports the current account and uploads it to
   `accounts/<key>/pre-restore/<UTC time>.json.gz`; if the upload fails, the
   restore stops.
3. It fetches and unzips the chosen backup and inserts it as `service_role`
   into `app.restore_staging (user_id, id, payload, created_at)`.
   `service_role` has `insert` on this table only.
4. It calls `public.restore_account(p_restore_id, p_expected_fingerprint)` with
   the user's JWT: `security definer`, owned by `griddo_writer`, EXECUTE for
   `authenticated`, `set statement_timeout = '30s'` (applied by REST). Under
   RLS it reads only the caller's staging row, replaces the whole account in
   one transaction and deletes the staging row. A browser that calls it
   directly can only apply what the server staged for it.
5. A cleanup removes staging rows older than one hour.

- Account isolation stays the S14 kind: RLS and `griddo_writer`; the user of
  the JWT is the owner, so no separate ownership check exists.
- Limits: a restore checks no row limit. An account above a limit keeps its
  rows and its creates are refused (SCHEMA §Account limits). Only backups the
  server wrote reach staging, which serves the limit check's purpose; the
  export timeout already bounds their size. A partial restore is never made.
- A restore refuses an unsupported `format_version`
  ([Format versions](#format-versions)).

### Concurrent writes and other tabs

- **Fingerprint:** `internal.account_fingerprint(p_user_id)` is the md5 of
  each of the five tables' rows (`md5(string_agg(t::text, ',' order by
  t.id))`), combined by md5. `app.accounts` is left out, because the backup
  writes its status there. Every write changes it without an audit of what
  each write touches, Chunk edits included.
- **Lock first:** `restore_account` takes the L0 advisory lock, then every
  Node of the account by id, then every Bit (SCHEMA §Locks order), and only
  then computes the fingerprint again. Chunk writes lock the Bit's parent Node
  and then the Bit, and `reorder_chunks` the Bit: the same direction, so no
  deadlock. A mismatch returns `rejected` with `account_changed` and changes
  nothing; the client does not retry by itself.
- **For the plan's `expert` review:** the full lock list over every write
  function, and whether `restore_account` locks the `accounts` row first or
  never touches it (`ensure_account()` locks that row before the L0 advisory
  lock).
- **Versions:** every restored row gets `greatest(backup version, current
  version) + 1`, one increment for one logical change (Hook 12). Every row that
  exists now ends above any version a tab holds, so a stale tab's first write
  to it conflicts and the CAS resolver shows the restored value. Accepted
  residual: a row changed once after the backup and then permanently deleted,
  held at exactly that version by a stale tab. Chunks have no version and keep
  last-write-wins, as today.
- **Tabs:** the restoring tab drops its snapshot and repeats entry behind the
  loading frame; it tells the other tabs of the browser through
  `BroadcastChannel`, and they do the same. Other devices get no push: their
  first write conflicts, and a reload shows the restored account.

### Format versions

- Each object holds `format_version`, starting at `1`. The first version of
  `restore_account` accepts `1` only, so nothing more is built now.
- An expand migration (a column added with a default) keeps the version: a
  restore reads each row against the current table's columns and fills a
  missing key with the column default. A new required column without a
  default is not expand.
- A contract migration (a column dropped, renamed or given a new meaning)
  raises the version, and the same task writes one conversion from the
  previous version (N−1 → N). A restore refuses N−2 and older, saying the
  backup comes from an older version.
- A contract phase's close backs up every account after its migrations, changed
  or not, so even an untouched account keeps a restorable latest file.

### Retention

Replaces the 2026-11-01 calendar draft (user, 2026-11-04).

- An object name is a date slot: `accounts/<key>/YYYY-MM-DD.json.gz`, UTC.
  Another run on the same day overwrites only that day's file.
- A run whose fingerprint matches the last backup writes no file, scheduled or
  `Back Up Now` alike; it records only the check.
- Pruning runs only right after a new file is written, and counts existing
  files, not calendar days: it keeps the 7 latest files (on different days)
  and, before them, the latest file of each of 4 ISO weeks. An unchanged
  account never prunes; an account that changes after two months keeps its
  two-month-old file, the state until yesterday. At least one file always
  stays. Pushing a backup out takes real changes on 7 or more days, never
  repeated runs.
- No R2 lifecycle rule for account backups: an age rule would delete every
  file of an account left untouched for 5 weeks.
- Pre-restore backups keep the 5 latest per account, outside the date slots.
  Only the owner can restore, so repeated restores affect only their own
  account.
- Expected behavior, not a bug: an expand migration that adds a column changes
  every fingerprint (`t::text`), so the next scheduled run backs up every
  account once, which also moves every latest file to the new format. A
  restore in flight during that migration is rejected with `account_changed`.
- Size: a 10 MB random-Hangul account is about 7 MB gzipped, so up to about 16
  files hold about 110 MB; 10 GB holds about 90 such accounts, or hundreds of
  realistic ones (1–3 MB).

### Backup status

- The `accounts` row holds: start time of the current run, last successful
  check, last file time, last result, failure reason, `failing_since`, the
  last backup's fingerprint, the last file's size, and the times of the last
  `Back Up Now` and restore (for [Limits](#limits)).
- A run records its start first. A run with a start and no result after 5
  minutes (twice the 150 s wall clock) is recorded as failed with reason
  `interrupted` by the next run or by a status call, since a function killed
  at a limit cannot record its own failure.
- Status is judged from the last successful check, a skipped unchanged account
  included; the date shown is the last file time.
- The scheduled run picks accounts by fingerprint, not by modification time,
  which would miss Chunk edits.
- An account that keeps failing, such as one above the app-openable size, is
  tried every day, and the owner is alerted only when its state or failure
  reason changes, not every day. Its modal keeps the red status and the
  reason. The alert path is open ([Open questions](#open-questions)).

### Modal and copy

Draft copy in English; SPEC owns the final text, kept in
`src/lib/copy/feedback.ts`.

- A `Backup` section in the Account modal, between the account name and
  `Sign out`. The guest modal gets nothing. No sidebar button: it would add a
  control to review in every theme, risk the app lane's sidebar work, and mix
  a second badge into the connection badge.
- Opening the modal calls the function's status endpoint once, for the status
  fields and the backup list; `Checking…` until it answers. No new client SQL
  function.
- Times show the real timestamp in the user's time zone and locale
  (`Intl.DateTimeFormat`), never the object name's UTC date.
- Status, by colour from the semantic status tokens and always with text:

| Status | When | Copy |
|---|---|---|
| Green | A successful check within 7 days | `Backed up. Latest backup: <time>` |
| Yellow | Running | `Backing up…` |
| Yellow | Last successful check older than 7 days | `No backup check in over 7 days. Latest backup: <time>` |
| Gray | No backup yet | `Not backed up yet. The first backup runs within a day.` |
| Red | The last run failed | `The last backup failed.` and the reason, for example `This account is too large to back up.` |

- `Back Up Now` is server-confirmed: pending while it runs, the result inline
  in the section, no toast (F11). When nothing changed:
  `No changes since the latest backup (<time>).` An unknown outcome is never
  resent; a status read sent after the request ended decides it.
- `Restore…` opens the backup list in the modal, each entry in the user's time
  zone, pre-restore entries as `Before restore, <time>`. Confirmation in the
  modal: `This replaces everything in this account with the backup from
  <time>. The current state is saved first, so you can undo this.` On
  `account_changed`: `This account changed while restoring. Try again.` An
  unknown outcome is never resent; a status read decides it.
- Privacy note in the section: `Backups are stored with Cloudflare, outside the
  main database. We keep your 7 latest backups and one a week for 4 weeks
  before them. Deleting your account deletes them.` Whether the guest modal's
  privacy note must name Cloudflare too is left to `/craft-docs`.
- The modal file may also change in the app lane, so the UI task comes late in
  the phase and merges `main` when it starts.

### Limits

- Enforced by the function, with the times in the `accounts` row: `Back Up Now`
  once per 5 minutes per account; restore once per 10 minutes per account.
  Beyond that: `rejected` with `rate_limited`, inline `Try again in a few
  minutes.`
- No storage cap: beyond the free 10 GB, R2 costs $0.015 per GB-month, while a
  cap would fail backups. The function records each file's size, and the owner
  is alerted when the total passes 8 GB.
- Invocations: one scheduled call per account a day leaves room for about
  16,000 accounts within 500,000 a month.

### Measurement and acceptance

- **Pass case:** the largest account the app still opens, about 10 MB raw.
  Larger accounts fail alone ([Backup status](#backup-status)).
- **First task, local edge runtime, go/no-go:** an account of about 10 MB raw
  with SCHEMA's fields and random Hangul syllables; go when CPU stays under 500
  ms and memory under 64 MB (a quarter of each limit). The same task measures
  the fingerprint cost and checks the API's request body limit for the
  roughly 10 MB staging insert; if refused, the payload goes in as rows per
  table. No production deploy happens during the phase.
- **Phase close, production, after the migrations and the function deploy:**
  the Phase 42 limit-sized fixture (old 100% caps: nodes 1,000, bits 5,000,
  chunks 10,000, breakdowns 5,000, candidates 1,250; 9.44 MB raw), built in
  SQL; three runs each of export with upload and of restore; the worst run
  under 37.5 s wall clock, with `export_account()` and `restore_account()`
  inside 30 s, which also confirms that hosted REST applies the 30 s setting.
  The script deletes the account, its staging rows and its R2 objects on
  SIGINT and SIGTERM too (PLANNING_STANDARD §6, Task 240).
- **Tests prove refusals** (vitest database suites, through supabase-js
  `.rpc()` where REST behavior matters, as `snapshot-load.db.test.ts`):
  `anon` and `authenticated` calling `export_account` get `permission denied`;
  `Back Up Now` naming another account in its body backs up only the caller
  or is refused; `restore_account` cannot read another account's staging row;
  a REST call to `export_account` that runs past 8 s passes with the 30 s
  setting and is cut at 8 s without it.

### Deploy order

Rule text for `CLAUDE.md` §Production, added by this topic's `/craft-docs`:

> Edge Functions deploy between the migrations and the merge: manual dump,
> migrations, functions, then the merge. Migrations expand for functions too:
> a function already deployed keeps working on the new schema, since it runs
> there until its own deploy and again after a rollback of it. A function that
> a new schedule or a new UI calls for the first time may deploy before the
> migrations, because nothing calls it until they land.

- First introduction: dump, function, migrations (`pg_net`, cron
  registration), merge (UI).
- The close runs outside the cron window and confirms one successful
  scheduled run after it.
- `pg_net` creates the `net` schema: the close confirms no new Security
  Advisor warning in the dashboard list.

## Why R2

- A backup is stored and read whole, so object storage fits better than a
  second database, which would also need its own schema and can pause on the
  free plan.
- Supabase runs on AWS, so R2 keeps the copy with another company. S3 in
  another region would also work, and R2 speaks the S3 API, so a later move is
  small.
- Cloudflare is already in use for Turnstile.

Prices checked on 2026-11-01; check again at planning. R2: 10 GB-month, 1
million Class A and 10 million Class B requests free each month, then $0.015
per GB-month, with no egress fee. Size from Task 216: a limit-sized account is
2.78 MB gzipped, a one-tenth account 0.28 MB. R2 may ask for a payment method
at setup.

## Retiring the manual dump

The dump runs before each production migration until all of these hold:

1. A recovery drill passes: a new Supabase project, the migrations from Git,
   the auth settings entered again, a sign-in with the same provider account,
   and a restore from R2. Tests alone do not count. The provider's stable user
   id is what connects the new sign-in to the old backups, because the
   internal user id changes. Guest data is not recovered.
2. A failed or missing backup alerts the owner.
3. A periodic restore check exists.

After that, a phase that changes SQL runs a backup of every account and
confirms success before its migrations, and CLAUDE.md drops the manual dump. If
the drill fails, the fallback is a server-side full dump sent to R2.

## First manual dump and restore test

Runs before the first production migration after the launch, which is this
work's own migration unless another phase changes SQL first. Findings from the
Task 239 work-plan review, checked on local Supabase on 2026-11-01 (CLI
2.121.0):

- Commands: `--role-only`, the default schema dump, and `--data-only
  --use-copy`. Name no `--schema`: the default data dump already holds `auth`
  and `app`.
- The dump holds `pg_cron` and `internal.cleanup_guests()` but no `cron.job`
  row, so the restore registers `cleanup-guests` again and confirms one row
  owned by `postgres`.
- A second database on the local Postgres cannot prove a restore. `schema.sql`
  leaves out `auth` while 6 foreign keys need `auth.users`, `roles.sql` stops at
  an existing `griddo_writer`, and `pg_cron` works only in `postgres`.
- Planned target, not yet run: reset the local stack from a temporary workdir
  with the same project id and no migrations, confirm `griddo_writer` is gone,
  restore, and finish with `pnpm test:db`, which brings the branch back.
- Compare before and after: function owners and ACLs, RLS, policies and default
  privileges, not only row counts. On 2026-11-01 the dump held 83 owner
  statements for `griddo_writer` and 29 policies.
- `data.sql` holds `auth.users`, sessions and refresh tokens: folder `700`,
  files `600`, no contents in logs or the ledger, counts only. The Mac has no
  `psql`, so the steps go through `docker exec`.
- Delete the dump within 7 days once the migration proves sound.

## Open questions

- Failure alerts: how the owner is reached, for failed, interrupted and
  missing runs and the 8 GB storage mark; GitHub Actions as a watchdog is a
  candidate.
- Dump retirement: the recovery drill (free-plan project limit, cleanup after
  it) and the periodic restore check.
- Deleting an account must delete its R2 objects with a retry, since a foreign
  key cannot reach them. Align with the deletion grace period.
- Phase split and lanes.
