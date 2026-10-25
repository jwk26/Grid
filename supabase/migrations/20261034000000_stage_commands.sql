-- Task 222: the Stage and Unstage commands (SCHEMA §Atomic command matrix: Stage, Unstage;
-- §Operation reconciliation; Hook 13), ported from stageCandidate / unstageCandidate and their
-- matchesStage* / matchesUnstage* predicates in indexeddb.ts, which are the answer key.
--
-- Same shape as the Task 221 commands: `security definer`, owner griddo_writer, no `operationId`
-- parameter, a one-statement `security invoker` `reconcile_*` for each. Locks: the Inbox Node and
-- the Scratch Bit `for update` (internal.lock_bit_and_node), then the source row. The candidate is
-- written before the source version, as Dexie does. An applied Stage leaves the Scratch out of
-- `changes` (it does not change); the client keeps its own snapshot of it.

grant create on schema internal to griddo_writer;
grant create on schema public to griddo_writer;

-- Task 221's internal.inbox_changes with a fifth argument: ids deleted from staged_candidates.
-- The new argument has a default, so the four-argument calls of the Breakdown commands still work.
drop function internal.inbox_changes(jsonb, jsonb, jsonb, uuid[]);
create function internal.inbox_changes(
  p_bits jsonb default '[]', p_breakdowns jsonb default '[]', p_candidates jsonb default '[]',
  p_deleted_breakdowns uuid[] default '{}', p_deleted_candidates uuid[] default '{}'
) returns jsonb
  language sql immutable security invoker set search_path = ''
  as $$
    select coalesce(jsonb_object_agg(t.name, jsonb_build_object('upserted', t.rows, 'deleted', t.gone)), '{}'::jsonb)
      from (values
        ('bits', coalesce(p_bits, '[]'::jsonb), '[]'::jsonb),
        ('scratch_breakdowns', coalesce(p_breakdowns, '[]'::jsonb), to_jsonb(coalesce(p_deleted_breakdowns, '{}'::uuid[]))),
        ('staged_candidates', coalesce(p_candidates, '[]'::jsonb), to_jsonb(coalesce(p_deleted_candidates, '{}'::uuid[])))
      ) as t(name, rows, gone)
     where jsonb_array_length(t.rows) > 0 or jsonb_array_length(t.gone) > 0
  $$;
alter function internal.inbox_changes(jsonb, jsonb, jsonb, uuid[], uuid[]) owner to griddo_writer;
revoke all on function internal.inbox_changes(jsonb, jsonb, jsonb, uuid[], uuid[]) from public;
grant execute on function internal.inbox_changes(jsonb, jsonb, jsonb, uuid[], uuid[]) to griddo_writer;

-- ---------------------------------------------------------------------------------------------
-- stage_candidate(p_candidate_id, p_scratch_id, p_source_id, p_source_expected_version, p_result_type)
-- Inserts the candidate at version 1 (created_at = updated_at) and increments the unconsumed source
-- row's version once. Result: {id} (the candidate id). Rejections: `not_found` (no Scratch or source),
-- `invalid_target` (inactive Scratch, a source of another Scratch, a consumed source, or a source
-- already staged under another candidate id). A candidate id already present (including one recreated
-- by Undo at a later version) or a different source version is a conflict.
create function public.stage_candidate(
  p_candidate_id uuid, p_scratch_id uuid, p_source_id uuid, p_source_expected_version integer, p_result_type text
) returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_scratch app.bits;
  v_src app.scratch_breakdowns;
  v_cur app.staged_candidates;
  v_by_src app.staged_candidates;
  v_cands jsonb;
  v_active boolean;
  v_cand jsonb;
  v_new jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_candidate_id is null or p_scratch_id is null or p_source_id is null or p_source_expected_version is null
     or p_result_type is null or p_result_type not in ('node', 'bit') then
    raise exception 'stage_candidate needs every argument and a node or bit result type' using errcode = '22023';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;

  v_scratch := internal.lock_bit_and_node(v_user, p_scratch_id);
  if v_scratch.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  select * into v_src from app.scratch_breakdowns where id = p_source_id and user_id = v_user for update;
  if v_src.id is null then
    return internal.envelope('rejected', null, internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch))),
                             jsonb_build_object('code', 'not_found'));
  end if;
  select * into v_cur from app.staged_candidates where id = p_candidate_id and user_id = v_user;
  select * into v_by_src from app.staged_candidates where source_breakdown_id = p_source_id and user_id = v_user;
  v_active := internal.active_inbox_scratch(v_user, v_scratch);
  select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) into v_cands
    from app.staged_candidates c
   where c.user_id = v_user and (c.id = p_candidate_id or c.source_breakdown_id = p_source_id);

  if v_active and v_cur.id is not null and v_by_src.id = v_cur.id
     and v_cur.scratch_bit_id = p_scratch_id and v_cur.source_breakdown_id = p_source_id
     and v_cur.result_type = p_result_type and v_cur.lifecycle = 'staged' and v_cur.version = 1
     and v_cur.created_at = v_cur.updated_at
     and v_src.scratch_bit_id = p_scratch_id and v_src.consumed_at is null
     and v_src.version = p_source_expected_version + 1 then
    return internal.envelope('already_applied', jsonb_build_object('id', p_candidate_id),
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)), jsonb_build_array(to_jsonb(v_src)), v_cands));
  end if;
  if not v_active or v_src.scratch_bit_id <> p_scratch_id or v_src.consumed_at is not null then
    return internal.envelope('rejected', null,
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)), jsonb_build_array(to_jsonb(v_src)), v_cands),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  if v_cur.id is not null then
    return internal.envelope('conflict', null,
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)), jsonb_build_array(to_jsonb(v_src)), v_cands));
  end if;
  if v_by_src.id is not null then
    return internal.envelope('rejected', null,
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)), jsonb_build_array(to_jsonb(v_src)), v_cands),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  if v_src.version <> p_source_expected_version then
    return internal.envelope('conflict', null,
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)), jsonb_build_array(to_jsonb(v_src))));
  end if;

  insert into app.staged_candidates (id, user_id, scratch_bit_id, source_breakdown_id, result_type, lifecycle, created_at, updated_at, version)
  values (p_candidate_id, v_user, p_scratch_id, p_source_id, p_result_type, 'staged', v_now, v_now, 1)
  returning to_jsonb(app.staged_candidates.*) into v_cand;
  update app.scratch_breakdowns set version = version + 1 where id = p_source_id and user_id = v_user
  returning to_jsonb(app.scratch_breakdowns.*) into v_new;

  return internal.envelope('applied', jsonb_build_object('id', p_candidate_id),
                           internal.inbox_changes('[]', jsonb_build_array(v_new), jsonb_build_array(v_cand)));
end
$$;

-- Read-only classification of stage_candidate: already_applied (the exact version-1 candidate and
-- the source unconsumed at expected + 1), not_applied (no candidate by id or by source, the source
-- unconsumed at the expected version), else conflict. A later Unstage advanced the source again and
-- a candidate recreated by Undo has version > 1, so neither satisfies the Stage postcondition.
create function public.reconcile_stage_candidate(
  p_candidate_id uuid, p_scratch_id uuid, p_source_id uuid, p_source_expected_version integer, p_result_type text
) returns jsonb
  language sql stable security invoker set search_path = ''
  as $$
    with u as (select (select auth.uid()) as id),
    acct as (select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok),
    sc as (select b.* from app.bits b, u where b.user_id = u.id and b.id = p_scratch_id),
    src as (select r.* from app.scratch_breakdowns r, u where r.user_id = u.id and r.id = p_source_id),
    cand as (select c.* from app.staged_candidates c, u where c.user_id = u.id and c.id = p_candidate_id),
    bysrc as (select c.* from app.staged_candidates c, u where c.user_id = u.id and c.source_breakdown_id = p_source_id),
    act as (
      select exists (
        select 1 from sc join app.nodes n on n.user_id = sc.user_id and n.id = sc.parent_id
         where sc.deleted_at is null and sc.archived_at is null
           and n.system_role = 'inbox' and n.deleted_at is null and n.archived_at is null
      ) as ok
    ),
    verdict as (
      select case
        when not acct.ok then 'account_missing'
        when p_candidate_id is null or p_scratch_id is null or p_source_id is null
             or p_source_expected_version is null or p_result_type is null
             or p_result_type not in ('node', 'bit') then 'conflict'
        when act.ok
             and exists (select 1 from cand, bysrc where bysrc.id = cand.id and cand.scratch_bit_id = p_scratch_id
                           and cand.source_breakdown_id = p_source_id and cand.result_type = p_result_type
                           and cand.lifecycle = 'staged' and cand.version = 1 and cand.created_at = cand.updated_at)
             and exists (select 1 from src where src.scratch_bit_id = p_scratch_id and src.consumed_at is null
                           and src.version = p_source_expected_version + 1) then 'already_applied'
        when act.ok and not exists (select 1 from cand) and not exists (select 1 from bysrc)
             and exists (select 1 from src where src.scratch_bit_id = p_scratch_id and src.consumed_at is null
                           and src.version = p_source_expected_version) then 'not_applied'
        else 'conflict'
      end as s
      from acct, act
    )
    select case when verdict.s = 'account_missing'
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', 'account_missing'))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('bits', case when exists (select 1 from sc) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(sc)) from sc), 'deleted', '[]'::jsonb) end),
        ('scratch_breakdowns', case when exists (select 1 from src) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(src)) from src), 'deleted', '[]'::jsonb) end),
        ('staged_candidates', case when exists (select 1 from cand union all select 1 from bysrc)
           then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(x)) from (select * from cand union select * from bysrc) x), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
    end
    from verdict
  $$;

-- ---------------------------------------------------------------------------------------------
-- unstage_candidate(p_candidate_id, p_candidate_expected_version, p_source_id, p_source_expected_version)
-- Deletes the candidate and increments the source row's version once; content, `order`, `created_at`
-- and `consumed_at` do not change. Like the Dexie command it does not require an active Scratch (a
-- trashed or archived Scratch holds no candidate). A candidate of another source is rejected
-- (invalid_target); a missing source, a consumed source or any other version mismatch is a conflict.
create function public.unstage_candidate(
  p_candidate_id uuid, p_candidate_expected_version integer, p_source_id uuid, p_source_expected_version integer
) returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
declare
  v_user uuid := internal.uid();
  v_scratch_id uuid;
  v_scratch app.bits;
  v_src app.scratch_breakdowns;
  v_cur app.staged_candidates;
  v_by_src app.staged_candidates;
  v_cands jsonb;
  v_new jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_candidate_id is null or p_candidate_expected_version is null or p_source_id is null
     or p_source_expected_version is null then
    raise exception 'unstage_candidate needs every argument' using errcode = '22023';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;

  select scratch_bit_id into v_scratch_id from app.scratch_breakdowns where id = p_source_id and user_id = v_user;
  if v_scratch_id is null then
    -- No source. A candidate of that id can still exist on another source (invalid_target, as Dexie
    -- checks it first); otherwise the Stage was undone or never ran. Unlocked read, no write.
    select * into v_cur from app.staged_candidates where id = p_candidate_id and user_id = v_user;
    if v_cur.id is not null then
      return internal.envelope('rejected', null, internal.inbox_changes('[]', '[]', jsonb_build_array(to_jsonb(v_cur))),
                               jsonb_build_object('code', 'invalid_target'));
    end if;
    return internal.envelope('conflict', null, '{}');
  end if;
  v_scratch := internal.lock_bit_and_node(v_user, v_scratch_id);
  if v_scratch.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  select * into v_src from app.scratch_breakdowns where id = p_source_id and user_id = v_user for update;
  if v_src.id is not null and v_src.scratch_bit_id <> v_scratch_id then
    -- The id was deleted and added again under another Scratch between the unlocked read and the lock.
    raise exception 'could not settle the lock set of Breakdown %', p_source_id using errcode = '40001';
  end if;
  select * into v_cur from app.staged_candidates where id = p_candidate_id and user_id = v_user;
  if v_src.id is null then
    -- Deleted while this call waited for the lock: same verdict as the unlocked branch above.
    if v_cur.id is not null then
      return internal.envelope('rejected', null, internal.inbox_changes('[]', '[]', jsonb_build_array(to_jsonb(v_cur))),
                               jsonb_build_object('code', 'invalid_target'));
    end if;
    return internal.envelope('conflict', null, internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch))));
  end if;
  select * into v_by_src from app.staged_candidates where source_breakdown_id = p_source_id and user_id = v_user;
  select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) into v_cands
    from app.staged_candidates c
   where c.user_id = v_user and (c.id = p_candidate_id or c.source_breakdown_id = p_source_id);

  if v_cur.id is null and v_by_src.id is null and v_src.consumed_at is null
     and v_src.version = p_source_expected_version + 1 then
    return internal.envelope('already_applied', jsonb_build_object('id', p_candidate_id),
                             internal.inbox_changes('[]', jsonb_build_array(to_jsonb(v_src))));
  end if;
  if v_cur.id is not null and v_cur.source_breakdown_id <> p_source_id then
    return internal.envelope('rejected', null,
                             internal.inbox_changes('[]', jsonb_build_array(to_jsonb(v_src)), v_cands),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  if v_cur.id is null or v_by_src.id is distinct from v_cur.id or v_cur.lifecycle <> 'staged'
     or v_cur.version <> p_candidate_expected_version
     or v_src.consumed_at is not null or v_src.version <> p_source_expected_version then
    return internal.envelope('conflict', null,
                             internal.inbox_changes('[]', jsonb_build_array(to_jsonb(v_src)), v_cands));
  end if;

  delete from app.staged_candidates where id = p_candidate_id and user_id = v_user;
  update app.scratch_breakdowns set version = version + 1 where id = p_source_id and user_id = v_user
  returning to_jsonb(app.scratch_breakdowns.*) into v_new;

  return internal.envelope('applied', jsonb_build_object('id', p_candidate_id),
                           internal.inbox_changes('[]', jsonb_build_array(v_new), '[]', '{}', array[p_candidate_id]));
end
$$;

-- Read-only classification of unstage_candidate: already_applied (candidate absent by id and by
-- source, the source unconsumed at expected + 1), not_applied (the exact candidate and source
-- versions), else conflict. A later Stage or placement advanced the source again, so it is a conflict.
create function public.reconcile_unstage_candidate(
  p_candidate_id uuid, p_candidate_expected_version integer, p_source_id uuid, p_source_expected_version integer
) returns jsonb
  language sql stable security invoker set search_path = ''
  as $$
    with u as (select (select auth.uid()) as id),
    acct as (select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok),
    src as (select r.* from app.scratch_breakdowns r, u where r.user_id = u.id and r.id = p_source_id),
    cand as (select c.* from app.staged_candidates c, u where c.user_id = u.id and c.id = p_candidate_id),
    bysrc as (select c.* from app.staged_candidates c, u where c.user_id = u.id and c.source_breakdown_id = p_source_id),
    verdict as (
      select case
        when not acct.ok then 'account_missing'
        when p_candidate_id is null or p_candidate_expected_version is null or p_source_id is null
             or p_source_expected_version is null then 'conflict'
        when not exists (select 1 from cand) and not exists (select 1 from bysrc)
             and exists (select 1 from src where src.consumed_at is null and src.version = p_source_expected_version + 1) then 'already_applied'
        when exists (select 1 from cand, bysrc, src where bysrc.id = cand.id and cand.source_breakdown_id = p_source_id
                       and cand.lifecycle = 'staged' and cand.version = p_candidate_expected_version
                       and src.scratch_bit_id = cand.scratch_bit_id and src.consumed_at is null
                       and src.version = p_source_expected_version) then 'not_applied'
        else 'conflict'
      end as s
      from acct
    )
    select case when verdict.s = 'account_missing'
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', 'account_missing'))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('scratch_breakdowns', case when exists (select 1 from src) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(src)) from src), 'deleted', '[]'::jsonb) end),
        ('staged_candidates', case when exists (select 1 from cand union all select 1 from bysrc)
           then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(x)) from (select * from cand union select * from bysrc) x), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
    end
    from verdict
  $$;

-- ---------------------------------------------------------------------------------------------
alter function public.stage_candidate(uuid, uuid, uuid, integer, text) owner to griddo_writer;
alter function public.unstage_candidate(uuid, integer, uuid, integer) owner to griddo_writer;
revoke all on function public.stage_candidate(uuid, uuid, uuid, integer, text) from public, anon, service_role;
revoke all on function public.reconcile_stage_candidate(uuid, uuid, uuid, integer, text) from public, anon, service_role;
revoke all on function public.unstage_candidate(uuid, integer, uuid, integer) from public, anon, service_role;
revoke all on function public.reconcile_unstage_candidate(uuid, integer, uuid, integer) from public, anon, service_role;
grant execute on function public.stage_candidate(uuid, uuid, uuid, integer, text) to authenticated;
grant execute on function public.reconcile_stage_candidate(uuid, uuid, uuid, integer, text) to authenticated;
grant execute on function public.unstage_candidate(uuid, integer, uuid, integer) to authenticated;
grant execute on function public.reconcile_unstage_candidate(uuid, integer, uuid, integer) to authenticated;
revoke create on schema internal from griddo_writer;
revoke create on schema public from griddo_writer;
