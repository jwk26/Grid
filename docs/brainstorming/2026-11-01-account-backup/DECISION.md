# Account Backup and Restore

## Metadata

- Created: 2026-11-01
- Readiness: draft
- Category: feature idea
- Source project: GridDO
- Source topic: `2026-10-21-saas-conversion` (S22, S35); Task 239 advisory
  session
- Source prototype: n/a
- Tags: backup, restore, account, r2, saas, operations
- Dependencies: Phase 48 close; `2026-10-31-account-deletion-grace-period`

## Summary

Signed-in users get an iCloud-like backup: it runs by itself on the server,
needs no local file and no open tab, and can be restored from anywhere. This
is the first candidate after the launch (`D-ACCOUNT-BACKUP`). Phase 48 ships no
backup: production holds nothing to keep until the launch.

Between the launch and the first production dump, production data has no
backup. The user accepted this risk (S35, 2026-11-01).

## Decisions (user, 2026-11-01)

- Signed-in OAuth accounts only; guests are left out.
- Storage outside Supabase: Cloudflare R2, chosen over a second database.
- The modal has a short description, the latest backup date, a backup button
  and a status light. Status also reads as text, not by colour alone.
- Restore is in scope from the first version.
- Retention draft: one backup a day for the latest 7 days, then one a week for
  the 4 weeks before them, so about 11 files reach back about a month.
- A manual dump stays only until this work retires it (see below).

## Direction (advisory, draft)

```text
Supabase Postgres (source of truth)
   |  daily, signed-in accounts changed since their last backup
   v
Server job (Edge Function candidate)
   |-- gzip JSON --> Cloudflare R2
   `-- latest backup time and result --> account row, read by the modal
```

- One object per backup, for example
  `accounts/<account key>/2026-11-01.json.gz`.
- The object holds Nodes, Bits, Chunks, Scratch Breakdowns and Staged
  Candidates, including trashed and archived rows, plus a format version, the
  creation time and the provider's stable user id.
- It holds no OAuth token or session, no device preference and no guest data.
- Button label: `Back Up Now`; the copy is one way, so "sync" is the wrong
  word.
- Status draft: green, a success within 7 days; yellow, running or older than
  7 days; red, the last run failed. Colours come from semantic tokens.
- Restore replaces the whole account with the chosen backup, so ids cannot
  collide. It is one transaction, takes an automatic backup first, and moves
  other open tabs to the restored snapshot.
- The browser never reaches R2. The R2 key stays on the server, and the server
  checks that the caller owns the account before a restore.

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
2.78 MB gzipped, a one-tenth account 0.28 MB. At 11 files, 10 GB holds about
320 limit-sized accounts. R2 may ask for a payment method at setup.

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

- Runner: Edge Function limits on the free plan are 2 s CPU and 150 s wall
  clock per request, and compressing a limit-sized account may not fit. Measure
  first; split the work per account, or move the runner.
- Restore time for a limit-sized account against the 8 s statement timeout of
  `authenticated`.
- Backup format versions: each later SQL change must convert old backups or
  refuse them, and this is a lasting cost.
- Deleting an account must delete its R2 objects with a retry, since a foreign
  key cannot reach them. Align with the deletion grace period.
- Button placement: a sidebar button, as the user first proposed, or a section
  in the Account modal.
- Privacy note: name Cloudflare storage and the retention.
- Retention by age with R2 lifecycle rules versus by count, given that an
  unchanged account writes no new file.
- Limits for `Back Up Now` and for open sign-ups.
