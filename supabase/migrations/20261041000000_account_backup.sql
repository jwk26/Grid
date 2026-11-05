-- Task 256: account backup in SQL (SCHEMA §Backup functions, §Account backup, §RLS and grants,
-- §Guest cleanup; backup B8, B9, B12).
--
-- Adds app.backup_status, internal.r2_deletions, internal.backup_summary_state, the account
-- fingerprint, export_account(), the backup functions (all but the Phase 53 restore_begin,
-- restore_stage and restore_abort), the `backup` key of get_snapshot(), the two pg_net dispatch
-- functions with their pg_cron jobs, and the cleanup_guests() lock-then-recheck. Expand only: the
-- deployed code reads the five snapshot keys and ignores `backup`.
--
-- SQL function checklist (PLANNING_STANDARD §6, S38):
--   (1) schema: the backup functions are `public` but are not client functions (executable by
--       service_role alone, SCHEMA §Backup functions); every helper is `internal`;
--   (2) owner: the caller (`security invoker`) for the backup functions, which run as service_role
--       with an explicit p_user_id that filters every statement; `postgres` for the dispatch
--       functions, which pg_cron runs and which read Vault and auth.users, and for
--       cleanup_guests(). Nothing here is `security definer`;
--   (3) empty search_path, schema-qualified names;
--   (4) EXECUTE revoked from public, anon and authenticated, then granted to service_role for a
--       backup function and internal.account_fingerprint only; the dispatch and cleanup
--       functions are granted to nobody (pg_cron runs them as their owner);
--   (5) locks: backup_begin() takes the account's backup_status row `for update` (SCHEMA §Locks,
--       Backup status), the one row lock under which already_running and rate_limited are
--       decided; cleanup_guests() locks the account's accounts row, then its auth.users row;
--   (6) no result envelope with `changes`: no client calls these. They return one JSON value
--       with `status` and `rejection` as the write functions do, where a caller decides on it;
--   (7) no account limits: nothing here creates a Node, Bit or Chunk;
--   (8) tests: supabase/tests/backup-*.db.test.ts and guest-cleanup.db.test.ts.
--
-- Time is the server clock, as epoch milliseconds from the transaction time (internal.now_ms()
-- is executable by griddo_writer only). The `interrupted` threshold is 5 minutes (SCHEMA §Account
-- backup, Status): the function's 150 s wall clock plus the 30 s export timeout plus a margin.
--
-- Stale starts are recorded as `interrupted` by the same UPDATE in backup_begin(),
-- backup_read_status() and backup_summary(). It is repeated, not shared, because a shared helper
-- would need an EXECUTE right for service_role beyond the fixed list.
--
-- Not here: restore_begin, restore_stage, restore_abort and app.restore_staging (Phase 53, Task
-- 260). The two restore columns of backup_status come with them.

create extension if not exists pg_net;

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------

create table app.backup_status (
  user_id uuid primary key references auth.users (id) on delete cascade,
  run_started_at bigint,
  last_checked_at bigint,
  last_file_at bigint,
  last_finished_at bigint,
  last_result text check (last_result in ('written', 'unchanged', 'failed')),
  failure_reason text,
  failing_since bigint,
  last_fingerprint text,
  last_file_bytes bigint,
  stored_bytes bigint not null default 0,
  last_backup_now_at bigint,
  manual_run_id uuid,
  manual_result text check (manual_result in ('written', 'unchanged', 'failed', 'interrupted', 'abandoned')),
  manual_finished_at bigint,
  -- When the current failing state or reason began (SCHEMA §Backup status: a column the daily
  -- summary needs to tell a new failure from a known one). The same failure on the next day
  -- leaves it unchanged, so it is not counted again.
  failure_changed_at bigint
);

alter table app.backup_status enable row level security;

create policy backup_status_select on app.backup_status
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on table app.backup_status from public, anon, authenticated, service_role, griddo_writer;
grant select on table app.backup_status to authenticated;
grant select, insert, update on table app.backup_status to service_role;

-- No foreign key: the auth user is already gone when the row is written.
create table internal.r2_deletions (
  user_id uuid primary key,
  requested_at bigint not null,
  attempts integer not null default 0
);

alter table internal.r2_deletions enable row level security;

revoke all on table internal.r2_deletions from public, anon, authenticated, service_role, griddo_writer;
grant select, update, delete on table internal.r2_deletions to service_role;

-- One row. `id` is constant, so a second row cannot exist; service_role has no insert on it.
create table internal.backup_summary_state (
  id boolean primary key default true check (id),
  last_summary_at bigint not null,
  over_limit boolean not null default false,
  -- When backups began (the migration's time, never updated). An account with no recorded run
  -- result is `missing` 36 hours after the later of its creation and this time, so an account that
  -- existed before the migration and never gets a result is counted once, not at once.
  backups_since bigint not null
);

alter table internal.backup_summary_state enable row level security;

revoke all on table internal.backup_summary_state from public, anon, authenticated, service_role, griddo_writer;
-- Column update only: `backups_since` is fixed by this migration and never changes.
grant select on table internal.backup_summary_state to service_role;
grant update (last_summary_at, over_limit) on table internal.backup_summary_state to service_role;

insert into internal.backup_summary_state (id, last_summary_at, over_limit, backups_since)
values (true, (extract(epoch from transaction_timestamp()) * 1000)::bigint, false,
        (extract(epoch from transaction_timestamp()) * 1000)::bigint);

-- ---------------------------------------------------------------------------------------------
-- The fingerprint
-- ---------------------------------------------------------------------------------------------

-- The md5 of each of the five tables' rows (`md5(string_agg(t::text, ',' order by t.id))`),
-- combined by md5. `accounts` and `backup_status` are left out. Declared `stable` on purpose: under
-- READ COMMITTED a stable function called from a statement reads that statement's snapshot (a
-- volatile function takes a new snapshot for each of its own queries), so export_account() can
-- put the fingerprint and the rows in one value that describe one point in time.
create function internal.account_fingerprint(p_user_id uuid) returns text
  language sql stable security invoker set search_path = ''
  as $$
    select md5(
      coalesce((select md5(coalesce(string_agg(t::text, ',' order by t.id), ''))
                  from app.nodes t where t.user_id = p_user_id), '') ||
      coalesce((select md5(coalesce(string_agg(t::text, ',' order by t.id), ''))
                  from app.bits t where t.user_id = p_user_id), '') ||
      coalesce((select md5(coalesce(string_agg(t::text, ',' order by t.id), ''))
                  from app.chunks t where t.user_id = p_user_id), '') ||
      coalesce((select md5(coalesce(string_agg(t::text, ',' order by t.id), ''))
                  from app.scratch_breakdowns t where t.user_id = p_user_id), '') ||
      coalesce((select md5(coalesce(string_agg(t::text, ',' order by t.id), ''))
                  from app.staged_candidates t where t.user_id = p_user_id), '')
    )
  $$;

revoke all on function internal.account_fingerprint(uuid) from public, anon, authenticated;
grant execute on function internal.account_fingerprint(uuid) to service_role;

-- ---------------------------------------------------------------------------------------------
-- Export and status reads
-- ---------------------------------------------------------------------------------------------

-- One statement builds one value: every row of the five tables (active, trashed and archived), as
-- get_snapshot() returns them, with the fingerprint, format_version, the export time and the
-- internal user id. The provider's stable user ids live in identity.json (Task 257), since no
-- backup function has a right in `auth`. `set statement_timeout` is a function setting, which
-- PostgREST hoists to the request (SCHEMA §Backup functions), so a REST call may run up to 30 s.
create function public.export_account(p_user_id uuid) returns jsonb
  language sql stable security invoker set search_path = '' set statement_timeout = '30s'
  as $$
    select case
      when not exists (select 1 from app.accounts a where a.user_id = p_user_id)
        then jsonb_build_object('rejection', jsonb_build_object('code', 'account_missing'))
      when exists (select 1 from app.accounts a
                    where a.user_id = p_user_id and a.deletion_requested_at is not null)
        then jsonb_build_object('rejection', jsonb_build_object('code', 'account_deleting'))
      else jsonb_build_object(
        'format_version', 1,
        'exported_at', (extract(epoch from transaction_timestamp()) * 1000)::bigint,
        'user_id', p_user_id,
        'fingerprint', internal.account_fingerprint(p_user_id),
        'nodes', coalesce((select jsonb_agg(to_jsonb(n)) from app.nodes n
                            where n.user_id = p_user_id), '[]'::jsonb),
        'bits', coalesce((select jsonb_agg(to_jsonb(b)) from app.bits b
                           where b.user_id = p_user_id), '[]'::jsonb),
        'chunks', coalesce((select jsonb_agg(to_jsonb(c)) from app.chunks c
                             where c.user_id = p_user_id), '[]'::jsonb),
        'scratch_breakdowns', coalesce((select jsonb_agg(to_jsonb(s)) from app.scratch_breakdowns s
                                         where s.user_id = p_user_id), '[]'::jsonb),
        'staged_candidates', coalesce((select jsonb_agg(to_jsonb(k)) from app.staged_candidates k
                                        where k.user_id = p_user_id), '[]'::jsonb)
      )
    end
  $$;

revoke all on function public.export_account(uuid) from public, anon, authenticated;
grant execute on function public.export_account(uuid) to service_role;

-- Read before the export, so the function can skip an unchanged account without parsing the
-- stream.
create function public.backup_fingerprint(p_user_id uuid) returns text
  language sql stable security invoker set search_path = ''
  as $$ select internal.account_fingerprint(p_user_id) $$;

revoke all on function public.backup_fingerprint(uuid) from public, anon, authenticated;
grant execute on function public.backup_fingerprint(uuid) to service_role;

-- ---------------------------------------------------------------------------------------------
-- Run bookkeeping
-- ---------------------------------------------------------------------------------------------

-- Checks in this order: the stale start is recorded as `interrupted`, a run in progress gives
-- `already_running` (a scheduled run records nothing), then `Back Up Now` within 5 minutes of the
-- last accepted one gives `rate_limited`. All of it runs under the one row lock of backup_status.
create function public.backup_begin(p_user_id uuid, p_kind text, p_run_id uuid)
  returns jsonb
  language plpgsql security invoker set search_path = ''
  as $$
declare
  v_now bigint := (extract(epoch from transaction_timestamp()) * 1000)::bigint;
  v_row app.backup_status;
  v_deleting boolean;
begin
  if p_user_id is null or p_kind is null or p_kind not in ('scheduled', 'manual') then
    raise exception 'backup_begin needs a user and a kind of scheduled or manual' using errcode = '22023';
  end if;
  if p_kind = 'manual' and p_run_id is null then
    raise exception 'a manual run needs a run id' using errcode = '22023';
  end if;

  select a.deletion_requested_at is not null into v_deleting
    from app.accounts a where a.user_id = p_user_id;
  if not found then
    return jsonb_build_object('status', 'rejected', 'result', null,
                              'rejection', jsonb_build_object('code', 'account_missing'));
  end if;
  if v_deleting then
    return jsonb_build_object('status', 'rejected', 'result', null,
                              'rejection', jsonb_build_object('code', 'account_deleting'));
  end if;

  insert into app.backup_status (user_id) values (p_user_id) on conflict (user_id) do nothing;
  select * into v_row from app.backup_status where user_id = p_user_id for update;

  -- A start with no result after 5 minutes: a function killed at a limit cannot record its own
  -- failure. When the stale run was the manual one (it is the run `last_backup_now_at` recorded,
  -- with no manual result yet), its own verdict becomes `interrupted` too.
  if v_row.run_started_at is not null and v_row.run_started_at < v_now - 300000 then
    update app.backup_status s set
      manual_result = case when s.run_started_at = s.last_backup_now_at and s.manual_result is null
                           then 'interrupted' else s.manual_result end,
      manual_finished_at = case when s.run_started_at = s.last_backup_now_at and s.manual_result is null
                                then v_now else s.manual_finished_at end,
      failure_changed_at = case when s.last_result is distinct from 'failed'
                                  or s.failure_reason is distinct from 'interrupted'
                                then v_now else s.failure_changed_at end,
      failing_since = coalesce(s.failing_since, v_now),
      last_result = 'failed',
      failure_reason = 'interrupted',
      last_finished_at = v_now,
      run_started_at = null
    where s.user_id = p_user_id
    returning * into v_row;
  end if;

  if v_row.run_started_at is not null then
    return jsonb_build_object('status', 'rejected', 'result', null,
                              'rejection', jsonb_build_object('code', 'already_running'));
  end if;

  if p_kind = 'manual' and v_row.last_backup_now_at is not null
     and v_now - v_row.last_backup_now_at < 300000 then
    return jsonb_build_object('status', 'rejected', 'result', null,
                              'rejection', jsonb_build_object('code', 'rate_limited'));
  end if;

  if p_kind = 'manual' then
    update app.backup_status
       set run_started_at = v_now, last_backup_now_at = v_now, manual_run_id = p_run_id,
           manual_result = null, manual_finished_at = null
     where user_id = p_user_id;
  else
    update app.backup_status set run_started_at = v_now where user_id = p_user_id;
  end if;

  -- `run_token` is the start time; backup_finish() must name it, so a late finish of a run that
  -- was recorded as interrupted never clears another run.
  return jsonb_build_object('status', 'applied', 'result',
                            jsonb_build_object('run_token', v_now, 'server_now', v_now));
end
$$;

revoke all on function public.backup_begin(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.backup_begin(uuid, text, uuid) to service_role;

-- Records the run's result and clears run_started_at. `p_run_token` is the value backup_begin()
-- returned; with any other value (the run was recorded as interrupted, or another run started)
-- nothing changes and the answer is `not_applied`.
create function public.backup_finish(
  p_user_id uuid,
  p_run_token bigint,
  p_result text,
  p_fingerprint text default null,
  p_file_at bigint default null,
  p_file_bytes bigint default null,
  p_stored_bytes bigint default null,
  p_reason text default null
) returns jsonb
  language plpgsql security invoker set search_path = ''
  as $$
declare
  v_now bigint := (extract(epoch from transaction_timestamp()) * 1000)::bigint;
  v_row app.backup_status;
  v_manual boolean;
begin
  if p_user_id is null or p_run_token is null or p_result is null
     or p_result not in ('written', 'unchanged', 'failed', 'abandoned') then
    raise exception 'backup_finish needs a user, a run token and a result of written, unchanged, failed or abandoned'
      using errcode = '22023';
  end if;
  if p_result = 'written'
     and (p_fingerprint is null or p_file_at is null or p_file_bytes is null or p_stored_bytes is null) then
    raise exception 'a written result needs fingerprint, file time, size and stored bytes' using errcode = '22023';
  end if;
  if p_result = 'failed' and (p_reason is null or p_reason !~ '^[a-z][a-z0-9_]{0,63}$') then
    raise exception 'a failed result needs a reason code' using errcode = '22023';
  end if;

  select * into v_row from app.backup_status where user_id = p_user_id for update;
  if not found or v_row.run_started_at is distinct from p_run_token then
    return jsonb_build_object('status', 'not_applied', 'result', null);
  end if;

  v_manual := v_row.last_backup_now_at = v_row.run_started_at and v_row.manual_result is null;

  -- `abandoned`: the run met a deletion request (or a rejected export) before it wrote anything and
  -- records no result (SCHEMA §Deleting R2 objects). Only its start is cleared, so it is never
  -- recorded as `interrupted` later; the last result, check time and failure state stay as they
  -- were, and a manual run's own verdict reads `abandoned`.
  if p_result = 'abandoned' then
    update app.backup_status set
      run_started_at = null,
      manual_result = case when v_manual then 'abandoned' else manual_result end,
      manual_finished_at = case when v_manual then v_now else manual_finished_at end
    where user_id = p_user_id;
    return jsonb_build_object('status', 'applied', 'result', jsonb_build_object('server_now', v_now));
  end if;

  update app.backup_status set
    run_started_at = null,
    last_finished_at = v_now,
    last_result = p_result,
    last_checked_at = case when p_result = 'failed' then last_checked_at else v_now end,
    last_file_at = case when p_result = 'written' then p_file_at else last_file_at end,
    last_fingerprint = case when p_result = 'written' then p_fingerprint else last_fingerprint end,
    last_file_bytes = case when p_result = 'written' then p_file_bytes else last_file_bytes end,
    stored_bytes = coalesce(p_stored_bytes, stored_bytes),
    failure_reason = case when p_result = 'failed' then p_reason else null end,
    failing_since = case when p_result = 'failed' then coalesce(failing_since, v_now) else null end,
    failure_changed_at = case
      when p_result = 'failed'
           and (last_result is distinct from 'failed' or failure_reason is distinct from p_reason)
        then v_now
      else failure_changed_at end,
    manual_result = case when v_manual then p_result else manual_result end,
    manual_finished_at = case when v_manual then v_now else manual_finished_at end
  where user_id = p_user_id;

  return jsonb_build_object('status', 'applied', 'result', jsonb_build_object('server_now', v_now));
end
$$;

revoke all on function public.backup_finish(uuid, bigint, text, text, bigint, bigint, bigint, text)
  from public, anon, authenticated;
grant execute on function public.backup_finish(uuid, bigint, text, text, bigint, bigint, bigint, text)
  to service_role;

-- The status row and `server_now`, after recording a stale start as `interrupted`. With a run id
-- it also returns that manual run's verdict on the server clock: `running`, its result
-- (`written`, `unchanged`, `failed`, `interrupted` or `abandoned`), or `not_started` (another id is recorded).
-- The verdict reads the manual run's own recorded start and result, never run_started_at, which a
-- later scheduled run reuses. `p_restore_id` is ignored until Task 260 replaces the body; the
-- signature stays, so the deployed function's call keeps working across the Phase 53 migrations.
create function public.backup_read_status(
  p_user_id uuid,
  p_run_id uuid default null,
  p_restore_id uuid default null
) returns jsonb
  language plpgsql security invoker set search_path = ''
  as $$
declare
  v_now bigint := (extract(epoch from transaction_timestamp()) * 1000)::bigint;
  v_row app.backup_status;
  v_verdict text;
begin
  if p_user_id is null then
    raise exception 'backup_read_status needs a user' using errcode = '22023';
  end if;

  update app.backup_status s set
    manual_result = case when s.run_started_at = s.last_backup_now_at and s.manual_result is null
                         then 'interrupted' else s.manual_result end,
    manual_finished_at = case when s.run_started_at = s.last_backup_now_at and s.manual_result is null
                              then v_now else s.manual_finished_at end,
    failure_changed_at = case when s.last_result is distinct from 'failed'
                                or s.failure_reason is distinct from 'interrupted'
                              then v_now else s.failure_changed_at end,
    failing_since = coalesce(s.failing_since, v_now),
    last_result = 'failed',
    failure_reason = 'interrupted',
    last_finished_at = v_now,
    run_started_at = null
  where s.user_id = p_user_id and s.run_started_at is not null and s.run_started_at < v_now - 300000;

  select * into v_row from app.backup_status where user_id = p_user_id;

  if p_run_id is not null then
    if not found or v_row.manual_run_id is distinct from p_run_id then
      v_verdict := 'not_started';
    elsif v_row.manual_result is not null then
      v_verdict := v_row.manual_result;
    elsif v_row.run_started_at is not null and v_row.run_started_at = v_row.last_backup_now_at then
      v_verdict := 'running';
    else
      v_verdict := 'interrupted';
    end if;
  end if;

  return jsonb_build_object(
    'status', 'applied',
    'result', jsonb_build_object(
      'backup', case when v_row.user_id is null then null else jsonb_build_object(
        'run_started_at', v_row.run_started_at,
        'last_checked_at', v_row.last_checked_at,
        'last_file_at', v_row.last_file_at,
        'last_result', v_row.last_result,
        'failure_reason', v_row.failure_reason,
        'server_now', v_now) end,
      'verdict', v_verdict));
end
$$;

revoke all on function public.backup_read_status(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.backup_read_status(uuid, uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------------------------
-- The daily summary and the R2 deletions
-- ---------------------------------------------------------------------------------------------

-- Called by the function's `summary` mode with the dispatch's `missing` count and `as_of` time.
-- The window is contiguous: a failure whose state or reason changed in (last_summary_at, as_of]
-- counts as new, and last_summary_at moves to as_of, so a failure is counted once and none falls
-- between two summaries. Stale starts are recorded with `as_of` as their change time, so they fall
-- in this window. A new problem is reported once; the 8 GB total only on the first summary above
-- it (8 GB is 8,000,000,000 bytes, R2's decimal unit).
create function public.backup_summary(p_missing integer, p_as_of bigint) returns jsonb
  language plpgsql security invoker set search_path = ''
  as $$
declare
  v_now bigint := (extract(epoch from transaction_timestamp()) * 1000)::bigint;
  v_state internal.backup_summary_state;
  v_new_failures integer;
  v_failing integer;
  v_total bigint;
  v_over boolean;
  v_over_new boolean;
begin
  if p_missing is null or p_missing < 0 or p_as_of is null or p_as_of > v_now + 60000 then
    raise exception 'backup_summary needs a missing count and an as_of time that is not in the future'
      using errcode = '22023';
  end if;

  select * into v_state from internal.backup_summary_state where id for update;

  update app.backup_status s set
    manual_result = case when s.run_started_at = s.last_backup_now_at and s.manual_result is null
                         then 'interrupted' else s.manual_result end,
    manual_finished_at = case when s.run_started_at = s.last_backup_now_at and s.manual_result is null
                              then v_now else s.manual_finished_at end,
    failure_changed_at = case when s.last_result is distinct from 'failed'
                                or s.failure_reason is distinct from 'interrupted'
                              then least(p_as_of, v_now) else s.failure_changed_at end,
    failing_since = coalesce(s.failing_since, v_now),
    last_result = 'failed',
    failure_reason = 'interrupted',
    last_finished_at = v_now,
    run_started_at = null
  where s.run_started_at is not null and s.run_started_at < v_now - 300000;

  select count(*) into v_new_failures from app.backup_status s
   where s.last_result = 'failed'
     and s.failure_changed_at > v_state.last_summary_at and s.failure_changed_at <= p_as_of;
  select count(*) into v_failing from app.backup_status s where s.last_result = 'failed';
  select coalesce(sum(s.stored_bytes), 0) into v_total from app.backup_status s;

  v_over := v_total > 8000000000;
  v_over_new := v_over and not v_state.over_limit;

  update internal.backup_summary_state
     set last_summary_at = greatest(last_summary_at, p_as_of), over_limit = v_over
   where id;

  return jsonb_build_object('status', 'applied', 'result', jsonb_build_object(
    'new_failures', v_new_failures,
    'failing', v_failing,
    'missing', p_missing,
    'over_limit', v_over_new,
    'stored_bytes', v_total));
end
$$;

revoke all on function public.backup_summary(integer, bigint) from public, anon, authenticated;
grant execute on function public.backup_summary(integer, bigint) to service_role;

create function public.backup_due_deletions() returns jsonb
  language sql stable security invoker set search_path = ''
  as $$
    select coalesce(jsonb_agg(jsonb_build_object('user_id', d.user_id, 'attempts', d.attempts,
                                                'requested_at', d.requested_at)
                              order by d.requested_at), '[]'::jsonb)
      from internal.r2_deletions d
     where d.requested_at < (extract(epoch from transaction_timestamp()) * 1000)::bigint - 3600000
  $$;

create function public.backup_deletion_done(p_user_id uuid) returns void
  language sql volatile security invoker set search_path = ''
  as $$ delete from internal.r2_deletions where user_id = p_user_id $$;

create function public.backup_deletion_failed(p_user_id uuid) returns void
  language sql volatile security invoker set search_path = ''
  as $$ update internal.r2_deletions set attempts = attempts + 1 where user_id = p_user_id $$;

revoke all on function public.backup_due_deletions() from public, anon, authenticated;
revoke all on function public.backup_deletion_done(uuid) from public, anon, authenticated;
revoke all on function public.backup_deletion_failed(uuid) from public, anon, authenticated;
grant execute on function public.backup_due_deletions() to service_role;
grant execute on function public.backup_deletion_done(uuid) to service_role;
grant execute on function public.backup_deletion_failed(uuid) to service_role;

-- ---------------------------------------------------------------------------------------------
-- Rights of service_role
-- ---------------------------------------------------------------------------------------------

-- service_role gets default grants on new public functions, tables and sequences; the earlier
-- migration revoked the function default. Revoke all three, then grant exactly the SCHEMA §RLS and
-- grants list (the per-object grants above, and these).
alter default privileges for role postgres in schema public revoke execute on functions from service_role;
alter default privileges for role postgres in schema public revoke all on tables from service_role;
alter default privileges for role postgres in schema public revoke all on sequences from service_role;

grant usage on schema app to service_role;
grant usage on schema internal to service_role;
grant select on table app.nodes, app.bits, app.chunks, app.scratch_breakdowns,
  app.staged_candidates, app.accounts to service_role;

-- ---------------------------------------------------------------------------------------------
-- get_snapshot() with the `backup` key
-- ---------------------------------------------------------------------------------------------

-- Redefined from the live definition (pg_get_functiondef after a reset); the only change is the
-- `backup` key: the caller's backup_status row with `server_now`, or null when there is none. The
-- deployed parser reads the five table keys and ignores it. Owner, mode and grants are kept.
create or replace function public.get_snapshot()
  returns jsonb
  language sql stable set search_path = ''
  as $$
    select case
      when not exists (select 1 from app.accounts a where a.user_id = (select auth.uid()))
        then jsonb_build_object('rejection', jsonb_build_object('code', 'account_missing'))
      when exists (select 1 from app.accounts a
                    where a.user_id = (select auth.uid()) and a.deletion_requested_at is not null)
        then jsonb_build_object('rejection', jsonb_build_object('code', 'account_deleting'))
      else jsonb_build_object(
        'nodes', coalesce((select jsonb_agg(to_jsonb(n)) from app.nodes n
                            where n.user_id = (select auth.uid())), '[]'::jsonb),
        'bits', coalesce((select jsonb_agg(to_jsonb(b)) from app.bits b
                           where b.user_id = (select auth.uid())), '[]'::jsonb),
        'chunks', coalesce((select jsonb_agg(to_jsonb(c)) from app.chunks c
                             where c.user_id = (select auth.uid())), '[]'::jsonb),
        'scratch_breakdowns', coalesce((select jsonb_agg(to_jsonb(s)) from app.scratch_breakdowns s
                                         where s.user_id = (select auth.uid())), '[]'::jsonb),
        'staged_candidates', coalesce((select jsonb_agg(to_jsonb(k)) from app.staged_candidates k
                                        where k.user_id = (select auth.uid())), '[]'::jsonb),
        'backup', (select jsonb_build_object(
                     'run_started_at', bs.run_started_at,
                     'last_checked_at', bs.last_checked_at,
                     'last_file_at', bs.last_file_at,
                     'last_result', bs.last_result,
                     'failure_reason', bs.failure_reason,
                     'server_now', (extract(epoch from transaction_timestamp()) * 1000)::bigint)
                    from app.backup_status bs where bs.user_id = (select auth.uid()))
      )
    end
  $$;

-- ---------------------------------------------------------------------------------------------
-- The daily dispatch (pg_cron, as postgres)
-- ---------------------------------------------------------------------------------------------

-- The accounts a scheduled backup covers: OAuth users (not anonymous, with an identity other than
-- email) that have an accounts row and no deletion request. The dispatch and the `missing` count
-- both read it, so they never disagree on who counts.
create function internal.backup_targets()
  returns table (user_id uuid, user_created_at timestamptz)
  language sql stable security invoker set search_path = ''
  as $$
    select u.id, u.created_at
      from auth.users u
      join app.accounts a on a.user_id = u.id
     where not u.is_anonymous
       and a.deletion_requested_at is null
       and exists (select 1 from auth.identities i
                    where i.user_id = u.id and i.provider <> 'email')
  $$;

revoke all on function internal.backup_targets() from public, anon, authenticated, service_role, griddo_writer;

-- One pg_net call per target. A missing Vault entry, or one that still reads `env(NAME)` because
-- the CLI found no .env.local, counts as missing and sends nothing. The request timeout is above
-- the function's 150 s wall clock (SPEC EDGE_REQUEST_TIMEOUT_MS), so a run never depends on the
-- run continuing after the caller has gone, which Task 255 measured locally only. pg_net's default
-- batch of 200 requests per loop stays: the real accounts number far fewer, and the setting is not
-- ours to change on the hosted project.
create function internal.dispatch_backups() returns void
  language plpgsql security invoker set search_path = ''
  as $$
declare
  v_url text;
  v_secret text;
  v_user uuid;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'backup_function_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'backup_shared_secret';
  if coalesce(v_url, '') = '' or v_url like 'env(%' or coalesce(v_secret, '') = '' or v_secret like 'env(%' then
    return;
  end if;

  for v_user in select t.user_id from internal.backup_targets() t loop
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object('mode', 'scheduled', 'user_id', v_user),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-backup-secret', v_secret),
      timeout_milliseconds := 160000);
  end loop;
end
$$;

-- The summary call carries `missing`: the targets whose 36-hour mark (36 hours after the last
-- recorded run result, or after the later of the account's creation and `backups_since` when it
-- has none) falls in
-- (last_summary_at, as_of]; with no result the mark counts from the later of the creation and
-- `backups_since`. The function passes both values back to backup_summary(), so the
-- window stays contiguous and an account is counted once. `auth.users` is read here, as
-- postgres, so service_role needs no right in `auth`.
create function internal.dispatch_backup_summary() returns void
  language plpgsql security invoker set search_path = ''
  as $$
declare
  v_url text;
  v_secret text;
  v_as_of bigint := (extract(epoch from transaction_timestamp()) * 1000)::bigint;
  v_last bigint;
  v_since bigint;
  v_missing integer;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'backup_function_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'backup_shared_secret';
  if coalesce(v_url, '') = '' or v_url like 'env(%' or coalesce(v_secret, '') = '' or v_secret like 'env(%' then
    return;
  end if;

  select last_summary_at, backups_since into v_last, v_since from internal.backup_summary_state where id;
  select count(*) into v_missing
    from (
      select coalesce(s.last_finished_at,
                      greatest((extract(epoch from t.user_created_at) * 1000)::bigint, v_since))
             + 36 * 3600000 as mark
        from internal.backup_targets() t
        left join app.backup_status s on s.user_id = t.user_id
    ) m
   where m.mark > v_last and m.mark <= v_as_of;

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('mode', 'summary', 'missing', v_missing, 'as_of', v_as_of),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-backup-secret', v_secret),
    timeout_milliseconds := 160000);
end
$$;

revoke all on function internal.dispatch_backups() from public, anon, authenticated, service_role, griddo_writer;
revoke all on function internal.dispatch_backup_summary() from public, anon, authenticated, service_role, griddo_writer;

-- Daily, 17:00 UTC (backup) and 19:00 UTC (summary). Scheduling an existing name replaces it.
select cron.schedule('backup-dispatch', '0 17 * * *', 'select internal.dispatch_backups()');
select cron.schedule('backup-summary-dispatch', '0 19 * * *', 'select internal.dispatch_backup_summary()');

-- ---------------------------------------------------------------------------------------------
-- cleanup_guests(): lock, check again, delete, and record the R2 deletion
-- ---------------------------------------------------------------------------------------------

-- Same targets as before. Each target is now locked and checked again on the locked rows: its
-- accounts row `for update` (a cancel of the deletion request that landed after the unlocked
-- query now keeps the account), then its auth.users row `for update`, which waits for a client
-- write that holds a key-share lock on it through a foreign key, so a guest whose accounts row
-- was created in the meantime is seen. The lock, the check, the r2_deletions insert for a real
-- account and the delete sit in one begin … exception block, so a skipped account (deadlock or
-- lock timeout) leaves no r2_deletions row.
create or replace function internal.cleanup_guests() returns void
  language plpgsql security invoker set search_path = ''
  as $$
declare
  v_id uuid;
  v_now bigint := (extract(epoch from transaction_timestamp()) * 1000)::bigint;
  v_has_account boolean;
  v_requested bigint;
  v_visit bigint;
  v_anonymous boolean;
  v_created timestamptz;
begin
  for v_id in
    select u.id from auth.users u
     where exists (
             select 1 from app.accounts a
              where a.user_id = u.id and a.deletion_requested_at is not null
           )
        or (
             u.is_anonymous
             and (
                   exists (
                     select 1 from app.accounts a
                      where a.user_id = u.id
                        and a.last_visit_at
                            < (extract(epoch from transaction_timestamp()) * 1000)::bigint - 7 * 86400000
                   )
                   or (
                     not exists (select 1 from app.accounts a where a.user_id = u.id)
                     and u.created_at < transaction_timestamp() - interval '7 days'
                   )
                 )
           )
  loop
    -- One delete per account. A client write on the same account can hold a lock the cascade
    -- needs while the cascade holds the auth user the write's foreign key check needs; Postgres
    -- then aborts one side. Here only that account is skipped, and the next daily run takes it,
    -- so one busy account never stops the deletion of the others.
    begin
      select true, a.deletion_requested_at, a.last_visit_at
        into v_has_account, v_requested, v_visit
        from app.accounts a where a.user_id = v_id for update;
      if not found then
        v_has_account := false; v_requested := null; v_visit := null;
      end if;

      select u.is_anonymous, u.created_at into v_anonymous, v_created
        from auth.users u where u.id = v_id for update;
      if not found then
        raise exception 'target is gone' using errcode = 'GDSKP';
      end if;

      if not v_has_account then
        -- An accounts row may have appeared while this waited for the auth user.
        select true, a.deletion_requested_at, a.last_visit_at
          into v_has_account, v_requested, v_visit
          from app.accounts a where a.user_id = v_id;
        if not found then
          v_has_account := false; v_requested := null; v_visit := null;
        end if;
      end if;

      if not (
           (v_has_account and v_requested is not null)
           or (v_anonymous and (
                 (v_has_account and v_visit < v_now - 7 * 86400000)
                 or (not v_has_account and v_created < transaction_timestamp() - interval '7 days')
               ))
         ) then
        -- Not `continue`: that would commit the block and keep both row locks until the whole run
        -- ends. The private SQLSTATE rolls the block back, which releases them at once.
        raise exception 'target no longer qualifies' using errcode = 'GDSKP';
      end if;

      if not v_anonymous then
        insert into internal.r2_deletions (user_id, requested_at) values (v_id, v_now)
          on conflict (user_id) do nothing;
      end if;
      delete from auth.users where id = v_id;
    exception when deadlock_detected or lock_not_available or sqlstate 'GDSKP' then
      null;
    end;
  end loop;
end
$$;
