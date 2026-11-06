-- Task 257: backup_begin() also returns `last_fingerprint` (the fingerprint of the latest file), so
-- the Edge Function can skip an unchanged account after reading backup_fingerprint(): no backup
-- function returned the stored value, so the comparison had nowhere to happen. The body is the
-- Task 256 definition (checks, locks, order) with this one added key in the `applied` result;
-- `create or replace` keeps the owner and the grants (service_role only). Expand only: a key
-- added to a JSON result that nothing deployed reads.

create or replace function public.backup_begin(p_user_id uuid, p_kind text, p_run_id uuid)
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
                            jsonb_build_object('run_token', v_now, 'server_now', v_now,
                                      'last_fingerprint', v_row.last_fingerprint));
end
$$;
