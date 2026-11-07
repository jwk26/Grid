-- Task 260: account restore in SQL (SCHEMA §Account backup Restore, §Backup functions, §Locks,
-- §RLS and grants; backup B4, B5).
--
-- Adds app.restore_staging, the two restore columns of app.backup_status, restore_begin(),
-- restore_stage(), restore_abort() (service_role, security invoker, as the Phase 52 backup
-- functions), restore_account() (a client function: security definer, owned by griddo_writer,
-- executable by authenticated), the restore verdicts of backup_read_status(), the
-- `restore_started_at` key of get_snapshot()'s `backup`, and the hourly staging cleanup.
-- Expand only: the deployed function's backup_read_status() call keeps its signature, and the
-- deployed parser ignores the new snapshot key.
--
-- SQL function checklist (PLANNING_STANDARD §6, S38):
--   (1) schema: restore_begin/stage/abort and restore_account are `public`; restore_begin/stage/abort
--       are not client functions (SCHEMA §Backup functions), restore_account is called by the backup
--       Edge Function with the user's JWT and is executable by authenticated;
--   (2) owner: restore_begin/stage/abort are `security invoker` (they run as service_role with an
--       explicit p_user_id that filters every statement); restore_account is `security definer`,
--       owned by griddo_writer, so RLS applies inside it (internal.uid());
--   (3) empty search_path, schema-qualified names;
--   (4) EXECUTE revoked from public, anon and authenticated, then granted to service_role
--       (restore_begin, restore_stage, restore_abort) or to authenticated alone (restore_account);
--   (5) locks, in this order: the L0 Grid advisory lock, the staging row `for update`, every Node of
--       the account ordered by id, then every Bit ordered by id (SCHEMA §Locks, Restore);
--       restore_begin() locks the account's backup_status row (the one lock under which
--       already_running and rate_limited are decided); restore_stage() and restore_abort() lock the
--       staging row; restore_account() never locks the accounts row and reads it after the L0 lock
--       (expert review, Task 260);
--   (6) result: restore_account() returns the write envelope without `changes` (the whole account
--       is replaced, so the client reads it again, SCHEMA §Restore); the others return `status`,
--       `result` and `rejection` as the backup functions do;
--   (7) no account limits: a restore keeps every row of the backup (SCHEMA §Restore);
--   (8) tests: supabase/tests/restore-*.db.test.ts.
--
-- Time is the server clock as epoch milliseconds from the transaction time.

-- ---------------------------------------------------------------------------------------------
-- Tables and columns
-- ---------------------------------------------------------------------------------------------

alter table app.backup_status
  add column restore_started_at bigint,
  add column restore_id uuid;

-- One row per restore. The payload is the fetched backup, set by restore_stage() and cleared in
-- the transaction that writes the result. `reason` is the code restore_abort() was given.
create table app.restore_staging (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  payload jsonb,
  created_at bigint not null,
  result text check (result in ('applied', 'account_changed', 'unsupported_format', 'not_applied')),
  reason text,
  finished_at bigint
);

create index idx_restore_staging_user on app.restore_staging (user_id);

alter table app.restore_staging enable row level security;

-- griddo_writer (restore_account) reads and finishes the caller's own row; authenticated has no
-- grant at all, so a browser cannot read or write a payload.
create policy restore_staging_writer_select on app.restore_staging
  for select to griddo_writer using (user_id = (select internal.uid()));
create policy restore_staging_writer_update on app.restore_staging
  for update to griddo_writer
  using (user_id = (select internal.uid())) with check (user_id = (select internal.uid()));

revoke all on table app.restore_staging from public, anon, authenticated, service_role, griddo_writer;
grant select, update on table app.restore_staging to griddo_writer;
grant select, insert, update on table app.restore_staging to service_role;

-- restore_account() needs the fingerprint in the caller's transaction. The function is `security
-- invoker` and reads under RLS, so griddo_writer sees only the caller's rows.
grant execute on function internal.account_fingerprint(uuid) to griddo_writer;

-- ---------------------------------------------------------------------------------------------
-- restore_begin / restore_stage / restore_abort (service_role)
-- ---------------------------------------------------------------------------------------------

-- The restore's first step. Checks in this order: the account (as backup_begin), a reused id
-- (`invalid_input`), a restore in flight (no result and younger than 180 s: `already_running`),
-- then a restore within 10 minutes of the last (`rate_limited`). All of it under the one row lock
-- of backup_status, before anything is staged, so a refused restore uploads and prunes nothing.
create function public.restore_begin(p_user_id uuid, p_restore_id uuid)
  returns jsonb
  language plpgsql security invoker set search_path = ''
  as $$
declare
  v_now bigint := (extract(epoch from transaction_timestamp()) * 1000)::bigint;
  v_row app.backup_status;
  v_deleting boolean;
begin
  if p_user_id is null or p_restore_id is null then
    raise exception 'restore_begin needs a user and a restore id' using errcode = '22023';
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

  -- An id is never reused, by this account or any other (the staging id is a primary key).
  if v_row.restore_id = p_restore_id
     or exists (select 1 from app.restore_staging s where s.id = p_restore_id) then
    return jsonb_build_object('status', 'rejected', 'result', null,
                              'rejection', jsonb_build_object('code', 'invalid_input'));
  end if;

  if exists (select 1 from app.restore_staging s
              where s.user_id = p_user_id and s.result is null and s.created_at > v_now - 180000) then
    return jsonb_build_object('status', 'rejected', 'result', null,
                              'rejection', jsonb_build_object('code', 'already_running'));
  end if;

  if v_row.restore_started_at is not null and v_now - v_row.restore_started_at < 600000 then
    return jsonb_build_object('status', 'rejected', 'result', null,
                              'rejection', jsonb_build_object('code', 'rate_limited'));
  end if;

  -- The row is inserted only after every check and before backup_status changes. The primary key
  -- arbitrates against a verdict read that closed this id meanwhile (backup_read_status(), Phase 52
  -- mi-2): nothing inserted means the id is held, so nothing changes and no open row is left.
  insert into app.restore_staging (id, user_id, created_at) values (p_restore_id, p_user_id, v_now)
    on conflict (id) do nothing;
  if not found then
    return jsonb_build_object('status', 'rejected', 'result', null,
                              'rejection', jsonb_build_object('code', 'invalid_input'));
  end if;
  update app.backup_status
     set restore_started_at = v_now, restore_id = p_restore_id
   where user_id = p_user_id;

  return jsonb_build_object('status', 'applied', 'result', jsonb_build_object('server_now', v_now));
end
$$;

revoke all on function public.restore_begin(uuid, uuid) from public, anon, authenticated;
grant execute on function public.restore_begin(uuid, uuid) to service_role;

-- Sets the fetched backup as the row's payload. Only while the row has no payload and no result:
-- a payload is never set after a result, and never replaced.
create function public.restore_stage(p_user_id uuid, p_restore_id uuid, p_payload jsonb)
  returns jsonb
  language plpgsql security invoker set search_path = '' set statement_timeout = '30s'
  as $$
declare
  v_row app.restore_staging;
begin
  if p_user_id is null or p_restore_id is null or p_payload is null
     or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'restore_stage needs a user, a restore id and a payload object' using errcode = '22023';
  end if;

  select * into v_row from app.restore_staging s
   where s.id = p_restore_id and s.user_id = p_user_id for update;
  if not found or v_row.result is not null or v_row.payload is not null then
    return jsonb_build_object('status', 'not_applied', 'result', null);
  end if;

  update app.restore_staging set payload = p_payload where id = p_restore_id;
  return jsonb_build_object('status', 'applied', 'result', null);
end
$$;

revoke all on function public.restore_stage(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.restore_stage(uuid, uuid, jsonb) to service_role;

-- Writes a not-applied result when the function stops before restore_account(). Only while the row
-- has no result, so it never overwrites an outcome.
create function public.restore_abort(p_user_id uuid, p_restore_id uuid, p_reason text)
  returns jsonb
  language plpgsql security invoker set search_path = ''
  as $$
declare
  v_now bigint := (extract(epoch from transaction_timestamp()) * 1000)::bigint;
  v_row app.restore_staging;
begin
  if p_user_id is null or p_restore_id is null or p_reason is null or p_reason !~ '^[a-z][a-z0-9_]{0,63}$' then
    raise exception 'restore_abort needs a user, a restore id and a reason code' using errcode = '22023';
  end if;

  select * into v_row from app.restore_staging s
   where s.id = p_restore_id and s.user_id = p_user_id for update;
  if not found or v_row.result is not null then
    return jsonb_build_object('status', 'not_applied', 'result', null);
  end if;

  update app.restore_staging
     set result = 'not_applied', reason = p_reason, payload = null, finished_at = v_now
   where id = p_restore_id;
  return jsonb_build_object('status', 'applied', 'result', null);
end
$$;

revoke all on function public.restore_abort(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.restore_abort(uuid, uuid, text) to service_role;

-- ---------------------------------------------------------------------------------------------
-- restore_account()
-- ---------------------------------------------------------------------------------------------

-- Replaces the whole account with the staged backup in one transaction. Reads only the caller's
-- staging row (RLS); every restored row takes the caller's id as user_id, and the payload's
-- user_id is neither used nor checked (user, 2026-11-07). Lock order: the L0 Grid lock, the
-- staging row, every Node by id, every Bit by id; only then the fingerprint is computed again.
-- A result already recorded is never overwritten (`already_applied` for `applied`, otherwise
-- `not_applied`), so two concurrent calls for one id give one `applied`.
--
-- The expand rule is explicit: a key missing from a row of the payload takes the column default,
-- listed below for every NOT NULL column that has one (jsonb_populate_recordset over a null base
-- would give NULL). A test compares this list with the catalog, so a new default cannot be missed.
create function public.restore_account(p_restore_id uuid, p_expected_fingerprint text)
  returns jsonb
  language plpgsql volatile security definer set search_path = '' set statement_timeout = '30s'
  as $$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_deleting boolean;
  v_stage app.restore_staging;
  v_payload jsonb;
  v_old_nodes jsonb;
  v_old_bits jsonb;
  v_old_scratch jsonb;
  v_old_staged jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_restore_id is null then
    return jsonb_build_object('status', 'rejected', 'result', null,
                              'rejection', jsonb_build_object('code', 'invalid_input'));
  end if;

  perform internal.lock_grid(v_user, null);

  -- Read after the L0 lock, never locked: delete_my_account() takes L0 first, so a request that
  -- committed before this point is seen and none can commit while this holds L0 (expert review).
  select a.deletion_requested_at is not null into v_deleting
    from app.accounts a where a.user_id = v_user;
  if not found then
    return jsonb_build_object('status', 'rejected', 'result', null,
                              'rejection', jsonb_build_object('code', 'account_missing'));
  end if;
  if v_deleting then
    return jsonb_build_object('status', 'rejected', 'result', null,
                              'rejection', jsonb_build_object('code', 'account_deleting'));
  end if;

  select * into v_stage from app.restore_staging s where s.id = p_restore_id and s.user_id = v_user for update;
  if not found then
    return jsonb_build_object('status', 'not_applied', 'result', null);
  end if;
  if v_stage.result is not null then
    return jsonb_build_object('status', case when v_stage.result = 'applied' then 'already_applied' else 'not_applied' end,
                              'result', null);
  end if;
  -- Too late: the verdict reads `not_applied` 180 s after the start, so a call at 140 s or more
  -- (transaction time) writes `not_applied` and changes nothing; any `applied` then commits before
  -- 180 s (140 s, the REST setup and commit, and at most the 30 s statement; user, 2026-11-07).
  if v_now - v_stage.created_at >= 140000 then
    update app.restore_staging set result = 'not_applied', reason = 'too_late', payload = null, finished_at = v_now
     where id = p_restore_id;
    return jsonb_build_object('status', 'not_applied', 'result', null);
  end if;
  v_payload := v_stage.payload;
  if v_payload is null then
    return jsonb_build_object('status', 'not_applied', 'result', null);
  end if;

  -- Format 1 only, and the five tables must be arrays; anything else is refused before any lock on
  -- the account's rows and before anything changes.
  if jsonb_typeof(v_payload -> 'format_version') is distinct from 'number'
     or (v_payload ->> 'format_version') is distinct from '1'
     or jsonb_typeof(v_payload -> 'nodes') is distinct from 'array'
     or jsonb_typeof(v_payload -> 'bits') is distinct from 'array'
     or jsonb_typeof(v_payload -> 'chunks') is distinct from 'array'
     or jsonb_typeof(v_payload -> 'scratch_breakdowns') is distinct from 'array'
     or jsonb_typeof(v_payload -> 'staged_candidates') is distinct from 'array' then
    update app.restore_staging set result = 'unsupported_format', payload = null, finished_at = v_now
     where id = p_restore_id;
    return jsonb_build_object('status', 'rejected', 'result', null,
                              'rejection', jsonb_build_object('code', 'unsupported_format'));
  end if;

  perform n.id from app.nodes n where n.user_id = v_user order by n.id for update;
  perform b.id from app.bits b where b.user_id = v_user order by b.id for update;

  if p_expected_fingerprint is distinct from internal.account_fingerprint(v_user) then
    update app.restore_staging set result = 'account_changed', payload = null, finished_at = v_now
     where id = p_restore_id;
    return jsonb_build_object('status', 'rejected', 'result', null,
                              'rejection', jsonb_build_object('code', 'account_changed'));
  end if;

  -- The versions of the rows being replaced: a restored row gets greatest(backup, current) + 1.
  select coalesce(jsonb_object_agg(n.id::text, n.version), '{}') into v_old_nodes
    from app.nodes n where n.user_id = v_user;
  select coalesce(jsonb_object_agg(b.id::text, b.version), '{}') into v_old_bits
    from app.bits b where b.user_id = v_user;
  select coalesce(jsonb_object_agg(s.id::text, s.version), '{}') into v_old_scratch
    from app.scratch_breakdowns s where s.user_id = v_user;
  select coalesce(jsonb_object_agg(k.id::text, k.version), '{}') into v_old_staged
    from app.staged_candidates k where k.user_id = v_user;

  delete from app.staged_candidates where user_id = v_user;
  delete from app.scratch_breakdowns where user_id = v_user;
  delete from app.chunks where user_id = v_user;
  delete from app.bits where user_id = v_user;
  delete from app.nodes where user_id = v_user;

  insert into app.nodes (id, user_id, title, color, icon, deadline, deadline_all_day, mtime, created_at,
                         version, parent_id, level, x, y, deleted_at, archived_at, system_role,
                         hidden_from_grid, past_deadline_dismissed)
  select r.id, v_user, r.title, r.color, r.icon, r.deadline, coalesce(r.deadline_all_day, false), r.mtime,
         r.created_at,
         greatest(coalesce(r.version, 1), coalesce((v_old_nodes ->> r.id::text)::integer, 0)) + 1,
         r.parent_id, r.level, r.x, r.y, r.deleted_at, r.archived_at, r.system_role,
         coalesce(r.hidden_from_grid, false), coalesce(r.past_deadline_dismissed, false)
    from jsonb_populate_recordset(null::app.nodes, v_payload -> 'nodes') r;

  insert into app.bits (id, user_id, title, description, icon, deadline, deadline_all_day, priority, status,
                        mtime, created_at, version, parent_id, x, y, deleted_at, archived_at,
                        past_deadline_dismissed)
  select r.id, v_user, r.title, coalesce(r.description, ''), r.icon, r.deadline,
         coalesce(r.deadline_all_day, false), r.priority, coalesce(r.status, 'active'), r.mtime, r.created_at,
         greatest(coalesce(r.version, 1), coalesce((v_old_bits ->> r.id::text)::integer, 0)) + 1,
         r.parent_id, r.x, r.y, r.deleted_at, r.archived_at, coalesce(r.past_deadline_dismissed, false)
    from jsonb_populate_recordset(null::app.bits, v_payload -> 'bits') r;

  insert into app.chunks (id, user_id, title, description, time, time_all_day, status, "order", parent_id)
  select r.id, v_user, r.title, coalesce(r.description, ''), r.time, coalesce(r.time_all_day, false),
         coalesce(r.status, 'incomplete'), r."order", r.parent_id
    from jsonb_populate_recordset(null::app.chunks, v_payload -> 'chunks') r;

  insert into app.scratch_breakdowns (id, user_id, scratch_bit_id, content, "order", created_at, consumed_at, version)
  select r.id, v_user, r.scratch_bit_id, r.content, r."order", r.created_at, r.consumed_at,
         greatest(coalesce(r.version, 1), coalesce((v_old_scratch ->> r.id::text)::integer, 0)) + 1
    from jsonb_populate_recordset(null::app.scratch_breakdowns, v_payload -> 'scratch_breakdowns') r;

  insert into app.staged_candidates (id, user_id, scratch_bit_id, source_breakdown_id, result_type, lifecycle,
                                     created_at, updated_at, version)
  select r.id, v_user, r.scratch_bit_id, r.source_breakdown_id, r.result_type, coalesce(r.lifecycle, 'staged'),
         r.created_at, r.updated_at,
         greatest(coalesce(r.version, 1), coalesce((v_old_staged ->> r.id::text)::integer, 0)) + 1
    from jsonb_populate_recordset(null::app.staged_candidates, v_payload -> 'staged_candidates') r;

  update app.restore_staging set result = 'applied', payload = null, finished_at = v_now
   where id = p_restore_id;

  return jsonb_build_object('status', 'applied', 'result', jsonb_build_object('server_now', v_now));
end
$$;

grant create on schema public to griddo_writer;
alter function public.restore_account(uuid, text) owner to griddo_writer;
revoke create on schema public from griddo_writer;
revoke all on function public.restore_account(uuid, text) from public, anon, service_role;
grant execute on function public.restore_account(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- backup_read_status(): the restore verdict
-- ---------------------------------------------------------------------------------------------

-- Same signature as Phase 52, so `create or replace` keeps the owner and the grants. The Phase 52
-- behaviour is unchanged; with a restore id it also returns `restore_verdict` on the server clock:
--   not_started  no staging row of this account for the id and it is not the recorded id: the id is
--                closed (see below), or its row was closed with reason `not_started`
--   finishing    no result and the start is younger than 180 s
--   <result>     applied, account_changed, unsupported_format or not_applied (written by
--                restore_account() or restore_abort())
--   not_applied  no result 180 s after the start
--   expired      the staging row is gone, but backup_status.restore_id is still this id
-- A verdict never reports an earlier restore's result: it reads the row of the asked id, and only
-- while that id is the one recorded.
create or replace function public.backup_read_status(
  p_user_id uuid,
  p_run_id uuid default null,
  p_restore_id uuid default null
) returns jsonb
  language plpgsql security invoker set search_path = ''
  as $$
declare
  v_now bigint := (extract(epoch from transaction_timestamp()) * 1000)::bigint;
  v_row app.backup_status;
  v_stage app.restore_staging;
  v_verdict text;
  v_restore_verdict text;
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

  if p_restore_id is not null then
    -- This account's staging row for the id decides first, so a later restore never hides an
    -- earlier one's result (D3). Without a row, `backup_status.restore_id` decides `expired`; an id
    -- that is neither is `not_started` and is closed with a staging row, so a begin that arrives
    -- later cannot use it (D1, Phase 52 mi-2). The close is `on conflict do nothing`; when the id
    -- was taken meanwhile (a begin committed, or another account holds it) the row is read once
    -- more and judged, never in a loop. Another account's row is never read or changed.
    select * into v_stage from app.restore_staging s where s.id = p_restore_id and s.user_id = p_user_id;
    if not found and not (v_row.user_id is not null and v_row.restore_id = p_restore_id) then
      if exists (select 1 from app.accounts a where a.user_id = p_user_id) then
        insert into app.restore_staging (id, user_id, created_at, result, reason, finished_at)
          values (p_restore_id, p_user_id, v_now, 'not_applied', 'not_started', v_now)
          on conflict (id) do nothing;
        select * into v_stage from app.restore_staging s where s.id = p_restore_id and s.user_id = p_user_id;
      end if;
    end if;
    if v_stage.id is not null then
      if v_stage.result is not null then
        v_restore_verdict := case when v_stage.result = 'not_applied' and v_stage.reason = 'not_started'
                                  then 'not_started' else v_stage.result end;
      elsif v_stage.created_at > v_now - 180000 then
        v_restore_verdict := 'finishing';
      else
        v_restore_verdict := 'not_applied';
      end if;
    elsif v_row.user_id is not null and v_row.restore_id = p_restore_id then
      v_restore_verdict := 'expired';
    else
      v_restore_verdict := 'not_started';
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
        'restore_started_at', v_row.restore_started_at,
        'server_now', v_now) end,
      'verdict', v_verdict,
      'restore_verdict', v_restore_verdict));
end
$$;

-- ---------------------------------------------------------------------------------------------
-- get_snapshot(): `backup.restore_started_at`
-- ---------------------------------------------------------------------------------------------

-- Redefined from the Task 256 definition; the only change is `restore_started_at` in `backup`.
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
                     'restore_started_at', bs.restore_started_at,
                     'server_now', (extract(epoch from transaction_timestamp()) * 1000)::bigint)
                    from app.backup_status bs where bs.user_id = (select auth.uid()))
      )
    end
  $$;

-- ---------------------------------------------------------------------------------------------
-- Hourly staging cleanup (pg_cron, as postgres)
-- ---------------------------------------------------------------------------------------------

-- Rows older than one hour go, payload and result alike: after that a verdict read answers
-- `expired` (backup_status.restore_id is still recorded). Scheduling an existing name replaces it.
select cron.schedule(
  'restore-staging-cleanup',
  '23 * * * *',
  $$delete from app.restore_staging
     where created_at < (extract(epoch from now()) * 1000)::bigint - 3600000$$
);
