-- Task 223: the Placement and Undo commands (SCHEMA §Atomic command matrix: Place staged candidate,
-- Place direct row, Undo placement; §Operation reconciliation; Hooks 8, 12, 13), ported from
-- placeStagedCandidate / placeDirectBreakdown / applyPlacementUndo and their validate* / matches*
-- predicates in indexeddb.ts, which are the answer key. Same shape as the Task 221 and 222 commands:
-- `security definer`, owner griddo_writer, no `operationId` parameter, and a one-statement
-- `security invoker` `reconcile_*` for each that rejects only `account_missing`.
--
-- Placement locks (SCHEMA §Locks, advisory first, Nodes by id, then Bits): lock_grid(target or L0);
-- then the Inbox Node and the target Node in one statement ordered by id; then the Scratch Bit (its
-- parent re-checked), the source row. A target that is missing or a system Node takes no Grid lock
-- (it is rejected later), so a client cannot make us take the Inbox Grid lock behind the Inbox row.
-- Result: {id} (the result id). Rejection codes: `not_found` (no Scratch or source), `invalid_target`
-- (a Scratch that is not a child of the Inbox Node or not active; a foreign or consumed source; a
-- direct source that owns a candidate; an unreachable target), `invalid_input` (title, cell range),
-- `cell_taken`, `account_limit`, `account_missing`.

grant create on schema internal to griddo_writer;
grant create on schema public to griddo_writer;

-- Task 222's internal.inbox_changes with Node rows and deleted Node and Bit ids (placement and Undo
-- create and delete a result). The new arguments come last and have defaults, so the earlier
-- positional calls keep working.
drop function internal.inbox_changes(jsonb, jsonb, jsonb, uuid[], uuid[]);
create function internal.inbox_changes(
  p_bits jsonb default '[]', p_breakdowns jsonb default '[]', p_candidates jsonb default '[]',
  p_deleted_breakdowns uuid[] default '{}', p_deleted_candidates uuid[] default '{}',
  p_nodes jsonb default '[]', p_deleted_nodes uuid[] default '{}', p_deleted_bits uuid[] default '{}'
) returns jsonb
  language sql immutable security invoker set search_path = ''
  as $$
    select coalesce(jsonb_object_agg(t.name, jsonb_build_object('upserted', t.rows, 'deleted', t.gone)), '{}'::jsonb)
      from (values
        ('nodes', coalesce(p_nodes, '[]'::jsonb), to_jsonb(coalesce(p_deleted_nodes, '{}'::uuid[]))),
        ('bits', coalesce(p_bits, '[]'::jsonb), to_jsonb(coalesce(p_deleted_bits, '{}'::uuid[]))),
        ('scratch_breakdowns', coalesce(p_breakdowns, '[]'::jsonb), to_jsonb(coalesce(p_deleted_breakdowns, '{}'::uuid[]))),
        ('staged_candidates', coalesce(p_candidates, '[]'::jsonb), to_jsonb(coalesce(p_deleted_candidates, '{}'::uuid[])))
      ) as t(name, rows, gone)
     where jsonb_array_length(t.rows) > 0 or jsonb_array_length(t.gone) > 0
  $$;
alter function internal.inbox_changes(jsonb, jsonb, jsonb, uuid[], uuid[], jsonb, uuid[], uuid[]) owner to griddo_writer;
revoke all on function internal.inbox_changes(jsonb, jsonb, jsonb, uuid[], uuid[], jsonb, uuid[], uuid[]) from public;
grant execute on function internal.inbox_changes(jsonb, jsonb, jsonb, uuid[], uuid[], jsonb, uuid[], uuid[]) to griddo_writer;

-- The current rows of the records a placement involves, as `changes`: the Scratch, the result (a
-- Node or a Bit) if it exists, the source, and the candidate (the requested id, else the source's).
create function internal.placement_view(p_user uuid, p_scratch uuid, p_result uuid, p_source uuid, p_candidate uuid)
  returns jsonb
  language sql stable security invoker set search_path = ''
  as $$
    select internal.inbox_changes(
      p_bits => (select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb) from app.bits b
                  where b.user_id = p_user and b.id in (p_scratch, p_result)),
      p_breakdowns => (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from app.scratch_breakdowns r
                        where r.user_id = p_user and r.id = p_source),
      p_candidates => (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) from app.staged_candidates c
                        where c.user_id = p_user and (c.id = p_candidate or c.source_breakdown_id = p_source)),
      p_nodes => (select coalesce(jsonb_agg(to_jsonb(n)), '[]'::jsonb) from app.nodes n
                   where n.user_id = p_user and n.id = p_result)
    )
  $$;

-- True when the target is a reachable placement target (Dexie targetIsValid): Home takes only a Node
-- and an empty path; otherwise every Node from the target up to its root is a plain Node (not a
-- system Node, not trashed, archived or hidden), the chain ends at an L0 Node, its ids equal the
-- expected ancestors root first, its levels are 0, 1, 2, and a Node result needs a target of level < 2.
create function internal.placement_target_ok(p_user uuid, p_target uuid, p_ancestors uuid[], p_type text)
  returns boolean
  language sql stable security invoker set search_path = ''
  as $$
    select case when p_target is null then p_type = 'node' and cardinality(p_ancestors) = 0
    else coalesce((
      with recursive chain(id, parent_id, level, depth, ok) as (
        select n.id, n.parent_id, n.level, 1,
               (n.deleted_at is null and n.archived_at is null and n.system_role is null and not n.hidden_from_grid)
          from app.nodes n where n.user_id = p_user and n.id = p_target
        union all
        select n.id, n.parent_id, n.level, c.depth + 1,
               (n.deleted_at is null and n.archived_at is null and n.system_role is null and not n.hidden_from_grid)
          from chain c join app.nodes n on n.user_id = p_user and n.id = c.parent_id
         where c.depth < 4
      )
      select bool_and(ok)
         and count(*) = cardinality(p_ancestors)
         and (select parent_id from chain order by depth desc limit 1) is null
         and (select array_agg(id order by depth desc) from chain) = p_ancestors
         and bool_and(level = (select count(*) from chain) - depth)
         and (p_type = 'bit' or (select level from chain where depth = 1) < 2)
        from chain
    ), false)
    end
  $$;

alter function internal.placement_view(uuid, uuid, uuid, uuid, uuid) owner to griddo_writer;
alter function internal.placement_target_ok(uuid, uuid, uuid[], text) owner to griddo_writer;
revoke all on function internal.placement_view(uuid, uuid, uuid, uuid, uuid) from public;
revoke all on function internal.placement_target_ok(uuid, uuid, uuid[], text) from public;
grant execute on function internal.placement_view(uuid, uuid, uuid, uuid, uuid) to griddo_writer;
grant execute on function internal.placement_target_ok(uuid, uuid, uuid[], text) to griddo_writer;

-- ---------------------------------------------------------------------------------------------
-- Task 223 note: stage_candidate and delete_breakdown refuse a Scratch that is not an active Inbox
-- Scratch right after the Scratch lock, before the source row is locked (the deadlock path against
-- a placement). An inactive Scratch with a missing source moves from not_found to invalid_target.
create or replace function public.stage_candidate(
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
  -- Task 223: a Scratch that is not an active Inbox Scratch is refused before the source row is
  -- locked, so a placement (Inbox -> Scratch -> source row -> target Grid) cannot meet this call
  -- on the other side of a lock cycle. Unlocked reads, no write.
  if not internal.active_inbox_scratch(v_user, v_scratch) then
    select * into v_src from app.scratch_breakdowns where id = p_source_id and user_id = v_user;
    select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) into v_cands
      from app.staged_candidates c
     where c.user_id = v_user and (c.id = p_candidate_id or c.source_breakdown_id = p_source_id);
    return internal.envelope('rejected', null,
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)),
                                                    case when v_src.id is null then '[]'::jsonb else jsonb_build_array(to_jsonb(v_src)) end, v_cands),
                             jsonb_build_object('code', 'invalid_target'));
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

create or replace function public.delete_breakdown(
  p_id uuid, p_expected_version integer, p_scratch_id uuid, p_scratch_expected_version integer
) returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
declare
  v_user uuid := internal.uid();
  v_scratch app.bits;
  v_row app.scratch_breakdowns;
  v_cand app.staged_candidates;
  v_active boolean;
  v_bit jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_id is null or p_expected_version is null or p_scratch_id is null or p_scratch_expected_version is null then
    raise exception 'delete_breakdown needs every argument' using errcode = '22023';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;

  v_scratch := internal.lock_bit_and_node(v_user, p_scratch_id);
  if v_scratch.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  -- Task 223: see stage_candidate; an inactive Scratch is refused before the row is locked.
  if not internal.active_inbox_scratch(v_user, v_scratch) then
    select * into v_row from app.scratch_breakdowns where id = p_id and user_id = v_user;
    select * into v_cand from app.staged_candidates where source_breakdown_id = p_id and user_id = v_user;
    return internal.envelope('rejected', null,
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)),
                                                    case when v_row.id is null then '[]'::jsonb else jsonb_build_array(to_jsonb(v_row)) end,
                                                    case when v_cand.id is null then '[]'::jsonb else jsonb_build_array(to_jsonb(v_cand)) end),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  select * into v_row from app.scratch_breakdowns where id = p_id and user_id = v_user for update;
  select * into v_cand from app.staged_candidates where source_breakdown_id = p_id and user_id = v_user;
  v_active := internal.active_inbox_scratch(v_user, v_scratch);

  if v_active and v_row.id is null and v_cand.id is null and v_scratch.version = p_scratch_expected_version + 1 then
    return internal.envelope('already_applied', jsonb_build_object('id', p_id),
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch))));
  end if;
  if v_row.id is null or not v_active or v_cand.id is not null
     or v_row.scratch_bit_id <> p_scratch_id or v_row.consumed_at is not null then
    return internal.envelope('rejected', null,
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)),
                                                    case when v_row.id is null then '[]' else jsonb_build_array(to_jsonb(v_row)) end,
                                                    case when v_cand.id is null then '[]' else jsonb_build_array(to_jsonb(v_cand)) end),
                             jsonb_build_object('code', case when v_row.id is null then 'not_found' else 'invalid_target' end));
  end if;
  if v_row.version <> p_expected_version or v_scratch.version <> p_scratch_expected_version then
    return internal.envelope('conflict', null,
                             internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch)), jsonb_build_array(to_jsonb(v_row))));
  end if;

  delete from app.scratch_breakdowns where id = p_id and user_id = v_user;
  update app.bits set version = version + 1 where id = p_scratch_id and user_id = v_user
  returning to_jsonb(app.bits.*) into v_bit;
  return internal.envelope('applied', jsonb_build_object('id', p_id),
                           internal.inbox_changes(jsonb_build_array(v_bit), '[]', '[]', array[p_id]));
end
$$;

-- ---------------------------------------------------------------------------------------------
-- place_staged_candidate(p_result_id, p_scratch_id, p_source_id, p_source_expected_version,
--   p_result_type, p_title, p_target_parent_id, p_expected_ancestor_ids, p_x, p_y,
--   p_candidate_id, p_candidate_expected_version)
-- Creates the result at the given cell, consumes the source (consumed_at = the result's created_at,
-- version + 1), deletes the candidate and touches the target Node's mtime. Decision order is Dexie's:
-- the complete postcondition is already_applied; a result id that exists, a source version or a
-- candidate identity or version mismatch is conflict; then the rejections; the account limit is the
-- last check before the write.
create function public.place_staged_candidate(
  p_result_id uuid, p_scratch_id uuid, p_source_id uuid, p_source_expected_version integer,
  p_result_type text, p_title text, p_target_parent_id uuid, p_expected_ancestor_ids uuid[],
  p_x integer, p_y integer, p_candidate_id uuid, p_candidate_expected_version integer
) returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_inbox uuid;
  v_tgt app.nodes;
  v_lock_grid boolean := true;
  v_scratch app.bits;
  v_src app.scratch_breakdowns;
  v_cand app.staged_candidates;
  v_bysrc app.staged_candidates;
  v_rn app.nodes;
  v_rb app.bits;
  v_created bigint;
  v_limit integer;
  v_max integer;
  v_new jsonb;
  v_par jsonb;
  v_srcnew jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_result_id is null or p_scratch_id is null or p_source_id is null or p_source_expected_version is null
     or p_result_type is null or p_result_type not in ('node', 'bit') or p_title is null
     or p_expected_ancestor_ids is null or p_x is null or p_y is null
     or p_candidate_id is null or p_candidate_expected_version is null then
    raise exception 'place_staged_candidate needs every argument (a null target parent is Home) and a node or bit result type'
      using errcode = '22023';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;

  select id into v_inbox from app.nodes where user_id = v_user and system_role = 'inbox';
  if v_inbox is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  -- The Grid lock first. A target that is missing or a system Node is rejected later without it.
  if p_target_parent_id is not null then
    select * into v_tgt from app.nodes where id = p_target_parent_id and user_id = v_user;
    v_lock_grid := v_tgt.id is not null and v_tgt.system_role is null;
  end if;
  if v_lock_grid then
    perform internal.lock_grid(v_user, p_target_parent_id);
  end if;
  perform 1 from app.nodes
   where user_id = v_user and id in (v_inbox, case when v_lock_grid then p_target_parent_id end)
   order by id for update;

  select * into v_scratch from app.bits where id = p_scratch_id and user_id = v_user;
  if v_scratch.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  if v_scratch.parent_id <> v_inbox then
    return internal.envelope('rejected', null, internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch))),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  select * into v_scratch from app.bits where id = p_scratch_id and user_id = v_user for update;
  if v_scratch.id is null or v_scratch.parent_id <> v_inbox then
    raise exception 'could not settle the lock set of Bit %', p_scratch_id using errcode = '40001';
  end if;

  select * into v_src from app.scratch_breakdowns where id = p_source_id and user_id = v_user for update;
  select * into v_cand from app.staged_candidates where id = p_candidate_id and user_id = v_user;
  select * into v_bysrc from app.staged_candidates where source_breakdown_id = p_source_id and user_id = v_user;
  select * into v_rn from app.nodes where id = p_result_id and user_id = v_user;
  select * into v_rb from app.bits where id = p_result_id and user_id = v_user;
  select * into v_tgt from app.nodes where id = p_target_parent_id and user_id = v_user;

  -- The complete postcondition: the exact result, the source consumed at its created_at at expected + 1,
  -- the candidate absent by id and by source.
  if p_result_type = 'node' then
    if v_rn.id is not null and v_rb.id is null and v_rn.title = p_title and v_rn.parent_id is not distinct from p_target_parent_id
       and v_rn.x = p_x and v_rn.y = p_y and v_rn.version = 1 and not v_rn.past_deadline_dismissed
       and v_rn.deleted_at is null and v_rn.archived_at is null and v_rn.system_role is null and not v_rn.hidden_from_grid
       and v_rn.deadline is null and not v_rn.deadline_all_day and v_rn.color = 'hsl(210, 80%, 55%)' and v_rn.icon = 'Folder'
       and v_rn.created_at = v_rn.mtime and v_rn.level = cardinality(p_expected_ancestor_ids) then
      v_created := v_rn.created_at;
    end if;
  elsif v_rb.id is not null and v_rn.id is null and p_target_parent_id is not null and v_rb.title = p_title
        and v_rb.parent_id = p_target_parent_id and v_rb.x = p_x and v_rb.y = p_y and v_rb.version = 1
        and not v_rb.past_deadline_dismissed and v_rb.deleted_at is null and v_rb.archived_at is null
        and v_rb.description = '' and v_rb.icon = 'ListTodo' and v_rb.deadline is null and not v_rb.deadline_all_day
        and v_rb.priority is null and v_rb.status = 'active' and v_rb.created_at = v_rb.mtime then
    v_created := v_rb.created_at;
  end if;
  if v_created is not null and v_src.id is not null and v_src.scratch_bit_id = p_scratch_id
     and v_src.version = p_source_expected_version + 1 and v_src.consumed_at = v_created
     and v_cand.id is null and v_bysrc.id is null then
    return internal.envelope('already_applied', jsonb_build_object('id', p_result_id),
                             internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, p_candidate_id));
  end if;

  if v_rn.id is not null or v_rb.id is not null then
    return internal.envelope('conflict', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, p_candidate_id));
  end if;
  if v_src.id is null then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, p_candidate_id),
                             jsonb_build_object('code', 'not_found'));
  end if;
  if not internal.active_inbox_scratch(v_user, v_scratch) or v_src.scratch_bit_id <> p_scratch_id or v_src.consumed_at is not null then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, p_candidate_id),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  if v_src.version <> p_source_expected_version then
    return internal.envelope('conflict', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, p_candidate_id));
  end if;
  if v_cand.id is null or v_bysrc.id is distinct from v_cand.id or v_cand.source_breakdown_id <> p_source_id
     or v_cand.scratch_bit_id <> p_scratch_id or v_cand.lifecycle <> 'staged' or v_cand.result_type <> p_result_type
     or v_cand.version <> p_candidate_expected_version then
    return internal.envelope('conflict', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, p_candidate_id));
  end if;

  -- Title length in UTF-16 units, as the column check and the client count it.
  v_max := case p_result_type when 'node' then 100 else 200 end;
  if (char_length(p_title) + char_length(regexp_replace(p_title, '[^\U00010000-\U0010FFFF]', '', 'g'))) < 1 or (char_length(p_title) + char_length(regexp_replace(p_title, '[^\U00010000-\U0010FFFF]', '', 'g'))) > v_max then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, p_candidate_id),
                             jsonb_build_object('code', 'invalid_input'));
  end if;
  -- A target missing at the unlocked pre-read stays invalid: its Grid lock was not taken.
  if not v_lock_grid or not internal.placement_target_ok(v_user, p_target_parent_id, p_expected_ancestor_ids, p_result_type) then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, p_candidate_id),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  if p_x < 0 or p_x > 17 or p_y < 0 or p_y > 8 then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, p_candidate_id),
                             jsonb_build_object('code', 'invalid_input'));
  end if;
  if internal.cell_taken(v_user, p_target_parent_id, p_x, p_y) then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, p_candidate_id),
                             jsonb_build_object('code', 'cell_taken'));
  end if;
  v_limit := internal.limit_reached(v_user, case p_result_type when 'node' then 'nodes' else 'bits' end);
  if v_limit is not null then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, p_candidate_id),
                             jsonb_build_object('code', 'account_limit', 'table', case p_result_type when 'node' then 'nodes' else 'bits' end, 'limit', v_limit));
  end if;

  if p_result_type = 'node' then
    insert into app.nodes (id, user_id, title, color, icon, deadline, deadline_all_day, mtime, created_at, version,
                           parent_id, level, x, y, past_deadline_dismissed)
    values (p_result_id, v_user, p_title, 'hsl(210, 80%, 55%)', 'Folder', null, false, v_now, v_now, 1,
            p_target_parent_id, coalesce(v_tgt.level + 1, 0), p_x, p_y, false)
    returning to_jsonb(app.nodes.*) into v_new;
  else
    insert into app.bits (id, user_id, title, description, icon, deadline, deadline_all_day, priority, status,
                          mtime, created_at, version, parent_id, x, y, past_deadline_dismissed)
    values (p_result_id, v_user, p_title, '', 'ListTodo', null, false, null, 'active',
            v_now, v_now, 1, p_target_parent_id, p_x, p_y, false)
    returning to_jsonb(app.bits.*) into v_new;
  end if;
  if p_target_parent_id is not null then
    update app.nodes set mtime = v_now where id = p_target_parent_id and user_id = v_user
    returning to_jsonb(app.nodes.*) into v_par;
  end if;
  update app.scratch_breakdowns set consumed_at = v_now, version = version + 1 where id = p_source_id and user_id = v_user
  returning to_jsonb(app.scratch_breakdowns.*) into v_srcnew;
  delete from app.staged_candidates where id = p_candidate_id and user_id = v_user;

  return internal.envelope('applied', jsonb_build_object('id', p_result_id),
    internal.inbox_changes(
      p_bits => case when p_result_type = 'bit' then jsonb_build_array(v_new) else '[]'::jsonb end,
      p_breakdowns => jsonb_build_array(v_srcnew),
      p_deleted_candidates => array[p_candidate_id],
      p_nodes => (case when p_result_type = 'node' then jsonb_build_array(v_new) else '[]'::jsonb end)
                 || (case when v_par is null then '[]'::jsonb else jsonb_build_array(v_par) end)));
end
$$;

-- Read-only classification of place_staged_candidate: already_applied (the complete postcondition),
-- not_applied (no result, the source unconsumed at the expected version, the exact candidate, and
-- every validity rule of the command except the account limit holds), else conflict.
create function public.reconcile_place_staged_candidate(
  p_result_id uuid, p_scratch_id uuid, p_source_id uuid, p_source_expected_version integer,
  p_result_type text, p_title text, p_target_parent_id uuid, p_expected_ancestor_ids uuid[],
  p_x integer, p_y integer, p_candidate_id uuid, p_candidate_expected_version integer
) returns jsonb
  language sql stable security invoker set search_path = ''
  as $$
    with recursive u as (select (select auth.uid()) as id),
    acct as (select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok),
    sc as (select b.* from app.bits b, u where b.user_id = u.id and b.id = p_scratch_id),
    src as (select r.* from app.scratch_breakdowns r, u where r.user_id = u.id and r.id = p_source_id),
    cand as (select c.* from app.staged_candidates c, u where c.user_id = u.id and c.id = p_candidate_id),
    bysrc as (select c.* from app.staged_candidates c, u where c.user_id = u.id and c.source_breakdown_id = p_source_id),
    rn as (select n.* from app.nodes n, u where n.user_id = u.id and n.id = p_result_id),
    rb as (select b.* from app.bits b, u where b.user_id = u.id and b.id = p_result_id),
    act as (
      select exists (
        select 1 from sc join app.nodes n on n.user_id = sc.user_id and n.id = sc.parent_id
         where sc.deleted_at is null and sc.archived_at is null
           and n.system_role = 'inbox' and n.deleted_at is null and n.archived_at is null
      ) as ok
    ),
    chain(id, parent_id, level, depth, ok) as (
      select n.id, n.parent_id, n.level, 1,
             (n.deleted_at is null and n.archived_at is null and n.system_role is null and not n.hidden_from_grid)
        from app.nodes n, u where n.user_id = u.id and n.id = p_target_parent_id
      union all
      select n.id, n.parent_id, n.level, c.depth + 1,
             (n.deleted_at is null and n.archived_at is null and n.system_role is null and not n.hidden_from_grid)
        from chain c join app.nodes n on n.id = c.parent_id, u
       where n.user_id = u.id and c.depth < 4
    ),
    tgt as (
      select case when p_target_parent_id is null then p_result_type = 'node' and cardinality(p_expected_ancestor_ids) = 0
        else coalesce((
          select bool_and(ok)
             and count(*) = cardinality(p_expected_ancestor_ids)
             and (select parent_id from chain order by depth desc limit 1) is null
             and (select array_agg(id order by depth desc) from chain) = p_expected_ancestor_ids
             and bool_and(level = (select count(*) from chain) - depth)
             and (p_result_type = 'bit' or (select level from chain where depth = 1) < 2)
            from chain), false)
        end as ok
    ),
    -- created_at of the result when it is exactly what this placement creates
    mres as (
      select rn.created_at from rn
       where p_result_type = 'node' and not exists (select 1 from rb)
         and rn.title = p_title and rn.parent_id is not distinct from p_target_parent_id and rn.x = p_x and rn.y = p_y
         and rn.version = 1 and not rn.past_deadline_dismissed and rn.deleted_at is null and rn.archived_at is null
         and rn.system_role is null and not rn.hidden_from_grid and rn.deadline is null and not rn.deadline_all_day
         and rn.color = 'hsl(210, 80%, 55%)' and rn.icon = 'Folder' and rn.created_at = rn.mtime
         and rn.level = cardinality(p_expected_ancestor_ids)
      union all
      select rb.created_at from rb
       where p_result_type = 'bit' and not exists (select 1 from rn) and p_target_parent_id is not null
         and rb.title = p_title and rb.parent_id = p_target_parent_id and rb.x = p_x and rb.y = p_y
         and rb.version = 1 and not rb.past_deadline_dismissed and rb.deleted_at is null and rb.archived_at is null
         and rb.description = '' and rb.icon = 'ListTodo' and rb.deadline is null and not rb.deadline_all_day
         and rb.priority is null and rb.status = 'active' and rb.created_at = rb.mtime
    ),
    verdict as (
      select case
        when not acct.ok then 'account_missing'
        when p_result_id is null or p_scratch_id is null or p_source_id is null or p_source_expected_version is null
             or p_result_type is null or p_result_type not in ('node', 'bit') or p_title is null
             or p_expected_ancestor_ids is null or p_x is null or p_y is null
             or p_candidate_id is null or p_candidate_expected_version is null then 'conflict'
        when exists (select 1 from mres, src where src.scratch_bit_id = p_scratch_id
                       and src.version = p_source_expected_version + 1 and src.consumed_at = mres.created_at)
             and not exists (select 1 from cand) and not exists (select 1 from bysrc) then 'already_applied'
        when not exists (select 1 from rn) and not exists (select 1 from rb) and act.ok
             and exists (select 1 from src where src.scratch_bit_id = p_scratch_id and src.consumed_at is null
                           and src.version = p_source_expected_version)
             and exists (select 1 from cand, bysrc where bysrc.id = cand.id and cand.source_breakdown_id = p_source_id
                           and cand.scratch_bit_id = p_scratch_id and cand.lifecycle = 'staged'
                           and cand.result_type = p_result_type and cand.version = p_candidate_expected_version)
             and (char_length(p_title) + char_length(regexp_replace(p_title, '[^\U00010000-\U0010FFFF]', '', 'g'))) between 1 and (case p_result_type when 'node' then 100 else 200 end)
             and tgt.ok
             and p_x between 0 and 17 and p_y between 0 and 8
             and not exists (select 1 from app.nodes n, u where n.user_id = u.id and n.parent_id is not distinct from p_target_parent_id
                               and n.x = p_x and n.y = p_y and n.deleted_at is null and n.archived_at is null
                               and (p_target_parent_id is not null or not n.hidden_from_grid))
             and not exists (select 1 from app.bits b, u where b.user_id = u.id and p_target_parent_id is not null
                               and b.parent_id = p_target_parent_id and b.x = p_x and b.y = p_y
                               and b.deleted_at is null and b.archived_at is null) then 'not_applied'
        else 'conflict'
      end as s
      from acct, act, tgt
    )
    select case when verdict.s = 'account_missing'
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', 'account_missing'))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('nodes', case when exists (select 1 from rn) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(rn)) from rn), 'deleted', '[]'::jsonb) end),
        ('bits', case when exists (select 1 from sc union all select 1 from rb)
           then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(w)) from (select * from sc union select * from rb) w), 'deleted', '[]'::jsonb) end),
        ('scratch_breakdowns', case when exists (select 1 from src) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(src)) from src), 'deleted', '[]'::jsonb) end),
        ('staged_candidates', case when exists (select 1 from cand union all select 1 from bysrc)
           then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(x)) from (select * from cand union select * from bysrc) x), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
    end
    from verdict
  $$;

-- ---------------------------------------------------------------------------------------------
-- place_direct_breakdown(p_result_id, p_scratch_id, p_source_id, p_source_expected_version,
--   p_result_type, p_title, p_target_parent_id, p_expected_ancestor_ids, p_x, p_y)
-- As place_staged_candidate, for a source that has no candidate: nothing is deleted besides the
-- change to the source (consumed_at = the result's created_at, version + 1) and the target Node's
-- mtime. A source that owns a candidate is rejected (invalid_target), and the title must equal the
-- source content (invalid_input). The postcondition needs the exact result, the source consumed at
-- expected + 1 and no candidate for the source. Decision order is Dexie's, the account limit last.
create function public.place_direct_breakdown(
  p_result_id uuid, p_scratch_id uuid, p_source_id uuid, p_source_expected_version integer,
  p_result_type text, p_title text, p_target_parent_id uuid, p_expected_ancestor_ids uuid[],
  p_x integer, p_y integer
) returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_inbox uuid;
  v_tgt app.nodes;
  v_lock_grid boolean := true;
  v_scratch app.bits;
  v_src app.scratch_breakdowns;
  v_bysrc app.staged_candidates;
  v_rn app.nodes;
  v_rb app.bits;
  v_created bigint;
  v_limit integer;
  v_max integer;
  v_new jsonb;
  v_par jsonb;
  v_srcnew jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_result_id is null or p_scratch_id is null or p_source_id is null or p_source_expected_version is null
     or p_result_type is null or p_result_type not in ('node', 'bit') or p_title is null
     or p_expected_ancestor_ids is null or p_x is null or p_y is null
     then
    raise exception 'place_direct_breakdown needs every argument (a null target parent is Home) and a node or bit result type'
      using errcode = '22023';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;

  select id into v_inbox from app.nodes where user_id = v_user and system_role = 'inbox';
  if v_inbox is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  -- The Grid lock first. A target that is missing or a system Node is rejected later without it.
  if p_target_parent_id is not null then
    select * into v_tgt from app.nodes where id = p_target_parent_id and user_id = v_user;
    v_lock_grid := v_tgt.id is not null and v_tgt.system_role is null;
  end if;
  if v_lock_grid then
    perform internal.lock_grid(v_user, p_target_parent_id);
  end if;
  perform 1 from app.nodes
   where user_id = v_user and id in (v_inbox, case when v_lock_grid then p_target_parent_id end)
   order by id for update;

  select * into v_scratch from app.bits where id = p_scratch_id and user_id = v_user;
  if v_scratch.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  if v_scratch.parent_id <> v_inbox then
    return internal.envelope('rejected', null, internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch))),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  select * into v_scratch from app.bits where id = p_scratch_id and user_id = v_user for update;
  if v_scratch.id is null or v_scratch.parent_id <> v_inbox then
    raise exception 'could not settle the lock set of Bit %', p_scratch_id using errcode = '40001';
  end if;

  select * into v_src from app.scratch_breakdowns where id = p_source_id and user_id = v_user for update;
  select * into v_bysrc from app.staged_candidates where source_breakdown_id = p_source_id and user_id = v_user;
  select * into v_rn from app.nodes where id = p_result_id and user_id = v_user;
  select * into v_rb from app.bits where id = p_result_id and user_id = v_user;
  select * into v_tgt from app.nodes where id = p_target_parent_id and user_id = v_user;

  -- The complete postcondition: the exact result, the source consumed at its created_at at expected + 1,
  -- the candidate absent by id and by source.
  if p_result_type = 'node' then
    if v_rn.id is not null and v_rb.id is null and v_rn.title = p_title and v_rn.parent_id is not distinct from p_target_parent_id
       and v_rn.x = p_x and v_rn.y = p_y and v_rn.version = 1 and not v_rn.past_deadline_dismissed
       and v_rn.deleted_at is null and v_rn.archived_at is null and v_rn.system_role is null and not v_rn.hidden_from_grid
       and v_rn.deadline is null and not v_rn.deadline_all_day and v_rn.color = 'hsl(210, 80%, 55%)' and v_rn.icon = 'Folder'
       and v_rn.created_at = v_rn.mtime and v_rn.level = cardinality(p_expected_ancestor_ids) then
      v_created := v_rn.created_at;
    end if;
  elsif v_rb.id is not null and v_rn.id is null and p_target_parent_id is not null and v_rb.title = p_title
        and v_rb.parent_id = p_target_parent_id and v_rb.x = p_x and v_rb.y = p_y and v_rb.version = 1
        and not v_rb.past_deadline_dismissed and v_rb.deleted_at is null and v_rb.archived_at is null
        and v_rb.description = '' and v_rb.icon = 'ListTodo' and v_rb.deadline is null and not v_rb.deadline_all_day
        and v_rb.priority is null and v_rb.status = 'active' and v_rb.created_at = v_rb.mtime then
    v_created := v_rb.created_at;
  end if;
  if v_created is not null and v_src.id is not null and v_src.scratch_bit_id = p_scratch_id
     and v_src.version = p_source_expected_version + 1 and v_src.consumed_at = v_created
     and v_bysrc.id is null then
    return internal.envelope('already_applied', jsonb_build_object('id', p_result_id),
                             internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null));
  end if;

  if v_rn.id is not null or v_rb.id is not null then
    return internal.envelope('conflict', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null));
  end if;
  if v_src.id is null then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null),
                             jsonb_build_object('code', 'not_found'));
  end if;
  if not internal.active_inbox_scratch(v_user, v_scratch) or v_src.scratch_bit_id <> p_scratch_id or v_src.consumed_at is not null then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  if v_src.version <> p_source_expected_version then
    return internal.envelope('conflict', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null));
  end if;
  if v_bysrc.id is not null then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  if p_title <> v_src.content then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null),
                             jsonb_build_object('code', 'invalid_input'));
  end if;

  -- Title length in UTF-16 units, as the column check and the client count it.
  v_max := case p_result_type when 'node' then 100 else 200 end;
  if (char_length(p_title) + char_length(regexp_replace(p_title, '[^\U00010000-\U0010FFFF]', '', 'g'))) < 1 or (char_length(p_title) + char_length(regexp_replace(p_title, '[^\U00010000-\U0010FFFF]', '', 'g'))) > v_max then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null),
                             jsonb_build_object('code', 'invalid_input'));
  end if;
  -- A target missing at the unlocked pre-read stays invalid: its Grid lock was not taken.
  if not v_lock_grid or not internal.placement_target_ok(v_user, p_target_parent_id, p_expected_ancestor_ids, p_result_type) then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  if p_x < 0 or p_x > 17 or p_y < 0 or p_y > 8 then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null),
                             jsonb_build_object('code', 'invalid_input'));
  end if;
  if internal.cell_taken(v_user, p_target_parent_id, p_x, p_y) then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null),
                             jsonb_build_object('code', 'cell_taken'));
  end if;
  v_limit := internal.limit_reached(v_user, case p_result_type when 'node' then 'nodes' else 'bits' end);
  if v_limit is not null then
    return internal.envelope('rejected', null, internal.placement_view(v_user, p_scratch_id, p_result_id, p_source_id, null),
                             jsonb_build_object('code', 'account_limit', 'table', case p_result_type when 'node' then 'nodes' else 'bits' end, 'limit', v_limit));
  end if;

  if p_result_type = 'node' then
    insert into app.nodes (id, user_id, title, color, icon, deadline, deadline_all_day, mtime, created_at, version,
                           parent_id, level, x, y, past_deadline_dismissed)
    values (p_result_id, v_user, p_title, 'hsl(210, 80%, 55%)', 'Folder', null, false, v_now, v_now, 1,
            p_target_parent_id, coalesce(v_tgt.level + 1, 0), p_x, p_y, false)
    returning to_jsonb(app.nodes.*) into v_new;
  else
    insert into app.bits (id, user_id, title, description, icon, deadline, deadline_all_day, priority, status,
                          mtime, created_at, version, parent_id, x, y, past_deadline_dismissed)
    values (p_result_id, v_user, p_title, '', 'ListTodo', null, false, null, 'active',
            v_now, v_now, 1, p_target_parent_id, p_x, p_y, false)
    returning to_jsonb(app.bits.*) into v_new;
  end if;
  if p_target_parent_id is not null then
    update app.nodes set mtime = v_now where id = p_target_parent_id and user_id = v_user
    returning to_jsonb(app.nodes.*) into v_par;
  end if;
  update app.scratch_breakdowns set consumed_at = v_now, version = version + 1 where id = p_source_id and user_id = v_user
  returning to_jsonb(app.scratch_breakdowns.*) into v_srcnew;

  return internal.envelope('applied', jsonb_build_object('id', p_result_id),
    internal.inbox_changes(
      p_bits => case when p_result_type = 'bit' then jsonb_build_array(v_new) else '[]'::jsonb end,
      p_breakdowns => jsonb_build_array(v_srcnew),
      p_nodes => (case when p_result_type = 'node' then jsonb_build_array(v_new) else '[]'::jsonb end)
                 || (case when v_par is null then '[]'::jsonb else jsonb_build_array(v_par) end)));
end
$$;

-- Read-only classification of place_direct_breakdown: already_applied (the complete postcondition),
-- not_applied (no result, the source unconsumed at the expected version, no candidate, and
-- every validity rule of the command except the account limit holds), else conflict.
create function public.reconcile_place_direct_breakdown(
  p_result_id uuid, p_scratch_id uuid, p_source_id uuid, p_source_expected_version integer,
  p_result_type text, p_title text, p_target_parent_id uuid, p_expected_ancestor_ids uuid[],
  p_x integer, p_y integer
) returns jsonb
  language sql stable security invoker set search_path = ''
  as $$
    with recursive u as (select (select auth.uid()) as id),
    acct as (select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok),
    sc as (select b.* from app.bits b, u where b.user_id = u.id and b.id = p_scratch_id),
    src as (select r.* from app.scratch_breakdowns r, u where r.user_id = u.id and r.id = p_source_id),
    bysrc as (select c.* from app.staged_candidates c, u where c.user_id = u.id and c.source_breakdown_id = p_source_id),
    rn as (select n.* from app.nodes n, u where n.user_id = u.id and n.id = p_result_id),
    rb as (select b.* from app.bits b, u where b.user_id = u.id and b.id = p_result_id),
    act as (
      select exists (
        select 1 from sc join app.nodes n on n.user_id = sc.user_id and n.id = sc.parent_id
         where sc.deleted_at is null and sc.archived_at is null
           and n.system_role = 'inbox' and n.deleted_at is null and n.archived_at is null
      ) as ok
    ),
    chain(id, parent_id, level, depth, ok) as (
      select n.id, n.parent_id, n.level, 1,
             (n.deleted_at is null and n.archived_at is null and n.system_role is null and not n.hidden_from_grid)
        from app.nodes n, u where n.user_id = u.id and n.id = p_target_parent_id
      union all
      select n.id, n.parent_id, n.level, c.depth + 1,
             (n.deleted_at is null and n.archived_at is null and n.system_role is null and not n.hidden_from_grid)
        from chain c join app.nodes n on n.id = c.parent_id, u
       where n.user_id = u.id and c.depth < 4
    ),
    tgt as (
      select case when p_target_parent_id is null then p_result_type = 'node' and cardinality(p_expected_ancestor_ids) = 0
        else coalesce((
          select bool_and(ok)
             and count(*) = cardinality(p_expected_ancestor_ids)
             and (select parent_id from chain order by depth desc limit 1) is null
             and (select array_agg(id order by depth desc) from chain) = p_expected_ancestor_ids
             and bool_and(level = (select count(*) from chain) - depth)
             and (p_result_type = 'bit' or (select level from chain where depth = 1) < 2)
            from chain), false)
        end as ok
    ),
    -- created_at of the result when it is exactly what this placement creates
    mres as (
      select rn.created_at from rn
       where p_result_type = 'node' and not exists (select 1 from rb)
         and rn.title = p_title and rn.parent_id is not distinct from p_target_parent_id and rn.x = p_x and rn.y = p_y
         and rn.version = 1 and not rn.past_deadline_dismissed and rn.deleted_at is null and rn.archived_at is null
         and rn.system_role is null and not rn.hidden_from_grid and rn.deadline is null and not rn.deadline_all_day
         and rn.color = 'hsl(210, 80%, 55%)' and rn.icon = 'Folder' and rn.created_at = rn.mtime
         and rn.level = cardinality(p_expected_ancestor_ids)
      union all
      select rb.created_at from rb
       where p_result_type = 'bit' and not exists (select 1 from rn) and p_target_parent_id is not null
         and rb.title = p_title and rb.parent_id = p_target_parent_id and rb.x = p_x and rb.y = p_y
         and rb.version = 1 and not rb.past_deadline_dismissed and rb.deleted_at is null and rb.archived_at is null
         and rb.description = '' and rb.icon = 'ListTodo' and rb.deadline is null and not rb.deadline_all_day
         and rb.priority is null and rb.status = 'active' and rb.created_at = rb.mtime
    ),
    verdict as (
      select case
        when not acct.ok then 'account_missing'
        when p_result_id is null or p_scratch_id is null or p_source_id is null or p_source_expected_version is null
             or p_result_type is null or p_result_type not in ('node', 'bit') or p_title is null
             or p_expected_ancestor_ids is null or p_x is null or p_y is null
             then 'conflict'
        when exists (select 1 from mres, src where src.scratch_bit_id = p_scratch_id
                       and src.version = p_source_expected_version + 1 and src.consumed_at = mres.created_at)
             and not exists (select 1 from bysrc) then 'already_applied'
        when not exists (select 1 from rn) and not exists (select 1 from rb) and act.ok
             and exists (select 1 from src where src.scratch_bit_id = p_scratch_id and src.consumed_at is null
                           and src.version = p_source_expected_version)
             and not exists (select 1 from bysrc) and exists (select 1 from src where src.content = p_title)
             and (char_length(p_title) + char_length(regexp_replace(p_title, '[^\U00010000-\U0010FFFF]', '', 'g'))) between 1 and (case p_result_type when 'node' then 100 else 200 end)
             and tgt.ok
             and p_x between 0 and 17 and p_y between 0 and 8
             and not exists (select 1 from app.nodes n, u where n.user_id = u.id and n.parent_id is not distinct from p_target_parent_id
                               and n.x = p_x and n.y = p_y and n.deleted_at is null and n.archived_at is null
                               and (p_target_parent_id is not null or not n.hidden_from_grid))
             and not exists (select 1 from app.bits b, u where b.user_id = u.id and p_target_parent_id is not null
                               and b.parent_id = p_target_parent_id and b.x = p_x and b.y = p_y
                               and b.deleted_at is null and b.archived_at is null) then 'not_applied'
        else 'conflict'
      end as s
      from acct, act, tgt
    )
    select case when verdict.s = 'account_missing'
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', 'account_missing'))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('nodes', case when exists (select 1 from rn) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(rn)) from rn), 'deleted', '[]'::jsonb) end),
        ('bits', case when exists (select 1 from sc union all select 1 from rb)
           then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(w)) from (select * from sc union select * from rb) w), 'deleted', '[]'::jsonb) end),
        ('scratch_breakdowns', case when exists (select 1 from src) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(src)) from src), 'deleted', '[]'::jsonb) end),
        ('staged_candidates', case when exists (select 1 from bysrc)
           then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(bysrc)) from bysrc), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
    end
    from verdict
  $$;


-- ---------------------------------------------------------------------------------------------
alter function public.place_staged_candidate(uuid, uuid, uuid, integer, text, text, uuid, uuid[], integer, integer, uuid, integer) owner to griddo_writer;
revoke all on function public.place_staged_candidate(uuid, uuid, uuid, integer, text, text, uuid, uuid[], integer, integer, uuid, integer) from public, anon, service_role;
revoke all on function public.reconcile_place_staged_candidate(uuid, uuid, uuid, integer, text, text, uuid, uuid[], integer, integer, uuid, integer) from public, anon, service_role;
grant execute on function public.place_staged_candidate(uuid, uuid, uuid, integer, text, text, uuid, uuid[], integer, integer, uuid, integer) to authenticated;
grant execute on function public.reconcile_place_staged_candidate(uuid, uuid, uuid, integer, text, text, uuid, uuid[], integer, integer, uuid, integer) to authenticated;
alter function public.place_direct_breakdown(uuid, uuid, uuid, integer, text, text, uuid, uuid[], integer, integer) owner to griddo_writer;
revoke all on function public.place_direct_breakdown(uuid, uuid, uuid, integer, text, text, uuid, uuid[], integer, integer) from public, anon, service_role;
revoke all on function public.reconcile_place_direct_breakdown(uuid, uuid, uuid, integer, text, text, uuid, uuid[], integer, integer) from public, anon, service_role;
grant execute on function public.place_direct_breakdown(uuid, uuid, uuid, integer, text, text, uuid, uuid[], integer, integer) to authenticated;
grant execute on function public.reconcile_place_direct_breakdown(uuid, uuid, uuid, integer, text, text, uuid, uuid[], integer, integer) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Undo placement. undo_staged_placement(p_result, p_source, p_candidate) and
-- undo_direct_placement(p_result, p_source) take the complete rows the client holds from the
-- placement's `changes` (the result Node or Bit, the source row as placed, and for a staged
-- placement the candidate as it was before). They are compared with the stored rows with
-- `user_id` dropped on both sides, which is Dexie's sameFlatRecord; a Node result is told by its
-- `level`. Result: null. Rejection: `not_found` (no Scratch), `invalid_target` (the Scratch is not a
-- child of the Inbox Node, or not active).
--
-- Decision order is Dexie's: the complete postcondition (result and children gone, the source
-- restored at version + 1, the candidate back for a staged placement or absent for a direct one) is
-- already_applied; an inactive owning Scratch is rejected, also in the reconcile; the exact
-- precondition (creation snapshots as validPlacementUndoSnapshots, the stored rows equal the
-- snapshots, no children, the parent present, no candidate) applies; anything else is conflict.
-- Locks: the Inbox Node, the result's parent and a Node result in one statement ordered by id; then the
-- Scratch and a Bit result ordered by id; then the source row.

create function internal.undo_placement(p_result jsonb, p_source jsonb, p_candidate jsonb, p_staged boolean)
  returns jsonb
  language plpgsql volatile security invoker set search_path = ''
  as $$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_isnode boolean;
  v_rid uuid;
  v_sid uuid;
  v_scid uuid;
  v_cid uuid;
  v_parent uuid;
  v_inbox uuid;
  v_scratch app.bits;
  v_src app.scratch_breakdowns;
  v_cand app.staged_candidates;
  v_bysrc app.staged_candidates;
  v_rn app.nodes;
  v_rb app.bits;
  v_kids boolean;
  v_valid boolean;
  v_post boolean;
  v_par jsonb;
  v_srcnew jsonb;
  v_candnew jsonb;
  v_view jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if jsonb_typeof(p_result) is distinct from 'object' or jsonb_typeof(p_source) is distinct from 'object'
     or (p_staged and jsonb_typeof(p_candidate) is distinct from 'object') then
    raise exception 'an Undo needs the result, source and (staged) candidate rows' using errcode = '22023';
  end if;
  v_isnode := jsonb_exists(p_result, 'level');
  v_rid := (p_result ->> 'id')::uuid;
  v_sid := (p_source ->> 'id')::uuid;
  v_scid := (p_source ->> 'scratch_bit_id')::uuid;
  v_cid := case when p_staged then (p_candidate ->> 'id')::uuid end;
  v_parent := (p_result ->> 'parent_id')::uuid;
  if v_rid is null or v_sid is null or v_scid is null or (p_staged and v_cid is null) then
    raise exception 'an Undo needs the ids of the result, source, Scratch and candidate' using errcode = '22023';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;

  select id into v_inbox from app.nodes where user_id = v_user and system_role = 'inbox';
  if v_inbox is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  perform 1 from app.nodes
   where user_id = v_user and id in (v_inbox, v_parent, case when v_isnode then v_rid end)
   order by id for update;

  select * into v_scratch from app.bits where id = v_scid and user_id = v_user;
  if v_scratch.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  if v_scratch.parent_id <> v_inbox then
    return internal.envelope('rejected', null, internal.inbox_changes(jsonb_build_array(to_jsonb(v_scratch))),
                             jsonb_build_object('code', 'invalid_target'));
  end if;
  perform 1 from app.bits
   where user_id = v_user and id in (v_scid, case when not v_isnode then v_rid end)
   order by id for update;
  select * into v_scratch from app.bits where id = v_scid and user_id = v_user;
  if v_scratch.id is null or v_scratch.parent_id <> v_inbox then
    raise exception 'could not settle the lock set of Bit %', v_scid using errcode = '40001';
  end if;
  select * into v_src from app.scratch_breakdowns where id = v_sid and user_id = v_user for update;
  select * into v_cand from app.staged_candidates where id = v_cid and user_id = v_user;
  select * into v_bysrc from app.staged_candidates where source_breakdown_id = v_sid and user_id = v_user;
  select * into v_rn from app.nodes where id = v_rid and user_id = v_user;
  select * into v_rb from app.bits where id = v_rid and user_id = v_user;
  v_kids := exists (select 1 from app.nodes where user_id = v_user and parent_id = v_rid)
         or exists (select 1 from app.bits where user_id = v_user and parent_id = v_rid)
         or exists (select 1 from app.chunks where user_id = v_user and parent_id = v_rid);
  v_view := internal.placement_view(v_user, v_scid, v_rid, v_sid, v_cid);

  v_post := coalesce(
    v_rn.id is null and v_rb.id is null and not v_kids and v_src.id is not null
    and (to_jsonb(v_src) - 'user_id') = ((p_source - 'user_id')
         || jsonb_build_object('consumed_at', null, 'version', (p_source ->> 'version')::integer + 1))
    and case when p_staged then
          v_cand.id is not null and v_bysrc.id = v_cand.id and v_cand.updated_at >= v_cand.created_at
          and (to_jsonb(v_cand) - 'user_id' - 'updated_at') = ((p_candidate - 'user_id' - 'updated_at')
               || jsonb_build_object('version', (p_candidate ->> 'version')::integer + 1))
        else v_bysrc.id is null end, false);
  if v_post then
    return internal.envelope('already_applied', null, v_view);
  end if;
  if not internal.active_inbox_scratch(v_user, v_scratch) then
    return internal.envelope('rejected', null, v_view, jsonb_build_object('code', 'invalid_target'));
  end if;

  v_valid := coalesce(
    (p_result ->> 'version')::integer = 1 and (p_result -> 'created_at') = (p_result -> 'mtime')
    and (p_result ->> 'deleted_at') is null and (p_result ->> 'archived_at') is null
    and (not v_isnode or ((p_result ->> 'system_role') is null and (p_result ->> 'hidden_from_grid')::boolean = false))
    and (p_source -> 'consumed_at') = (p_result -> 'created_at')
    and (not p_staged or ((p_candidate ->> 'scratch_bit_id') = (p_source ->> 'scratch_bit_id')
         and (p_candidate ->> 'source_breakdown_id') = (p_source ->> 'id')
         and (p_candidate ->> 'result_type') = case when v_isnode then 'node' else 'bit' end
         and (p_candidate ->> 'lifecycle') = 'staged')), false);
  if not coalesce(
       v_valid and not v_kids and v_src.id is not null
       and (to_jsonb(v_src) - 'user_id') = (p_source - 'user_id')
       and case when v_isnode then v_rn.id is not null and v_rb.id is null and (to_jsonb(v_rn) - 'user_id') = (p_result - 'user_id')
                else v_rb.id is not null and v_rn.id is null and (to_jsonb(v_rb) - 'user_id') = (p_result - 'user_id') end
       and (v_parent is null or exists (select 1 from app.nodes where user_id = v_user and id = v_parent))
       and case when p_staged then v_cand.id is null and v_bysrc.id is null else v_bysrc.id is null end, false) then
    return internal.envelope('conflict', null, v_view);
  end if;

  if v_isnode then
    delete from app.nodes where id = v_rid and user_id = v_user;
  else
    delete from app.bits where id = v_rid and user_id = v_user;
  end if;
  if v_parent is not null then
    update app.nodes set mtime = v_now where id = v_parent and user_id = v_user
    returning to_jsonb(app.nodes.*) into v_par;
  end if;
  update app.scratch_breakdowns set consumed_at = null, version = version + 1 where id = v_sid and user_id = v_user
  returning to_jsonb(app.scratch_breakdowns.*) into v_srcnew;
  if p_staged then
    insert into app.staged_candidates (id, user_id, scratch_bit_id, source_breakdown_id, result_type, lifecycle,
                                       created_at, updated_at, version)
    values (v_cid, v_user, v_scid, v_sid, p_candidate ->> 'result_type', 'staged',
            (p_candidate ->> 'created_at')::bigint, v_now, (p_candidate ->> 'version')::integer + 1)
    returning to_jsonb(app.staged_candidates.*) into v_candnew;
  end if;

  return internal.envelope('applied', null, internal.inbox_changes(
    p_breakdowns => jsonb_build_array(v_srcnew),
    p_candidates => case when p_staged then jsonb_build_array(v_candnew) else '[]'::jsonb end,
    p_nodes => case when v_par is null then '[]'::jsonb else jsonb_build_array(v_par) end,
    p_deleted_nodes => case when v_isnode then array[v_rid] else '{}'::uuid[] end,
    p_deleted_bits => case when v_isnode then '{}'::uuid[] else array[v_rid] end));
end
$$;
alter function internal.undo_placement(jsonb, jsonb, jsonb, boolean) owner to griddo_writer;
revoke all on function internal.undo_placement(jsonb, jsonb, jsonb, boolean) from public;
grant execute on function internal.undo_placement(jsonb, jsonb, jsonb, boolean) to griddo_writer;

create function public.undo_staged_placement(p_result jsonb, p_source jsonb, p_candidate jsonb) returns jsonb
  language sql volatile security definer set search_path = ''
  as $$ select internal.undo_placement(p_result, p_source, p_candidate, true) $$;
create function public.undo_direct_placement(p_result jsonb, p_source jsonb) returns jsonb
  language sql volatile security definer set search_path = ''
  as $$ select internal.undo_placement(p_result, p_source, null, false) $$;

-- Read-only classification of the Undo commands (the same decision order): already_applied, rejected
-- (invalid_target) for an inactive or non-Inbox owning Scratch, not_applied for the exact
-- precondition, else conflict. A null or non-object argument is a conflict.
create function public.reconcile_undo_staged_placement(p_result jsonb, p_source jsonb, p_candidate jsonb) returns jsonb
  language sql stable security invoker set search_path = ''
  as $$
    with u as (select (select auth.uid()) as id),
    acct as (select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok),
    k as (
      select (jsonb_typeof(p_result) = 'object' and jsonb_typeof(p_source) = 'object' and jsonb_typeof(p_candidate) = 'object') as shaped,
             (p_result ->> 'id')::uuid as rid, (p_source ->> 'id')::uuid as sid,
             (p_source ->> 'scratch_bit_id')::uuid as scid, (p_candidate ->> 'id')::uuid as cid,
             (p_result ->> 'parent_id')::uuid as pid, jsonb_exists(p_result, 'level') as isnode
    ),
    rn as (select n.* from app.nodes n, u, k where n.user_id = u.id and n.id = k.rid),
    rb as (select b.* from app.bits b, u, k where b.user_id = u.id and b.id = k.rid),
    src as (select r.* from app.scratch_breakdowns r, u, k where r.user_id = u.id and r.id = k.sid),
    sc as (select b.* from app.bits b, u, k where b.user_id = u.id and b.id = k.scid),
    cand as (select c.* from app.staged_candidates c, u, k where c.user_id = u.id and c.id = k.cid),
    bysrc as (select c.* from app.staged_candidates c, u, k where c.user_id = u.id and c.source_breakdown_id = k.sid),
    kids as (
      select (exists (select 1 from app.nodes n, u, k where n.user_id = u.id and n.parent_id = k.rid)
           or exists (select 1 from app.bits b, u, k where b.user_id = u.id and b.parent_id = k.rid)
           or exists (select 1 from app.chunks c, u, k where c.user_id = u.id and c.parent_id = k.rid)) as any
    ),
    par as (select (k.pid is null or exists (select 1 from app.nodes n, u where n.user_id = u.id and n.id = k.pid)) as ok from k),
    act as (
      select exists (
        select 1 from sc join app.nodes n on n.user_id = sc.user_id and n.id = sc.parent_id
         where sc.deleted_at is null and sc.archived_at is null
           and n.system_role = 'inbox' and n.deleted_at is null and n.archived_at is null
      ) as ok
    ),
    snap as (
      select coalesce(
        (p_result ->> 'version')::integer = 1 and (p_result -> 'created_at') = (p_result -> 'mtime')
        and (p_result ->> 'deleted_at') is null and (p_result ->> 'archived_at') is null
        and (not k.isnode or ((p_result ->> 'system_role') is null and (p_result ->> 'hidden_from_grid')::boolean = false))
        and (p_source -> 'consumed_at') = (p_result -> 'created_at')
        and (p_candidate ->> 'scratch_bit_id') = (p_source ->> 'scratch_bit_id')
        and (p_candidate ->> 'source_breakdown_id') = (p_source ->> 'id')
        and (p_candidate ->> 'result_type') = case when k.isnode then 'node' else 'bit' end
        and (p_candidate ->> 'lifecycle') = 'staged', false) as ok
      from k
    ),
    post as (
      select coalesce(
        not exists (select 1 from rn) and not exists (select 1 from rb) and not kids.any
        and exists (select 1 from src where (to_jsonb(src) - 'user_id') = ((p_source - 'user_id')
              || jsonb_build_object('consumed_at', null, 'version', (p_source ->> 'version')::integer + 1)))
        and exists (select 1 from cand, bysrc where bysrc.id = cand.id and cand.updated_at >= cand.created_at
              and (to_jsonb(cand) - 'user_id' - 'updated_at') = ((p_candidate - 'user_id' - 'updated_at')
                  || jsonb_build_object('version', (p_candidate ->> 'version')::integer + 1))), false) as ok
      from kids
    ),
    pre as (
      select coalesce(
        snap.ok and not kids.any and par.ok
        and exists (select 1 from src where (to_jsonb(src) - 'user_id') = (p_source - 'user_id'))
        and (case when k.isnode then exists (select 1 from rn where (to_jsonb(rn) - 'user_id') = (p_result - 'user_id')) and not exists (select 1 from rb)
                  else exists (select 1 from rb where (to_jsonb(rb) - 'user_id') = (p_result - 'user_id')) and not exists (select 1 from rn) end)
        and not exists (select 1 from cand) and not exists (select 1 from bysrc), false) as ok
      from k, snap, kids, par
    ),
    verdict as (
      select case
        when not acct.ok then 'account_missing'
        when not k.shaped or k.rid is null or k.sid is null or k.scid is null or k.cid is null then 'conflict'
        when post.ok then 'already_applied'
        when not act.ok then 'rejected'
        when pre.ok then 'not_applied'
        else 'conflict'
      end as s
      from acct, k, post, act, pre
    )
    select case when verdict.s = 'account_missing'
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', 'account_missing'))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('nodes', case when exists (select 1 from rn) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(rn)) from rn), 'deleted', '[]'::jsonb) end),
        ('bits', case when exists (select 1 from sc union all select 1 from rb)
           then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(w)) from (select * from sc union select * from rb) w), 'deleted', '[]'::jsonb) end),
        ('scratch_breakdowns', case when exists (select 1 from src) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(src)) from src), 'deleted', '[]'::jsonb) end),
        ('staged_candidates', case when exists (select 1 from cand union all select 1 from bysrc)
           then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(x)) from (select * from cand union select * from bysrc) x), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
        || case when verdict.s = 'rejected' then jsonb_build_object('rejection', jsonb_build_object('code', 'invalid_target')) else '{}'::jsonb end
    end
    from verdict
  $$;

create function public.reconcile_undo_direct_placement(p_result jsonb, p_source jsonb) returns jsonb
  language sql stable security invoker set search_path = ''
  as $$
    with u as (select (select auth.uid()) as id),
    acct as (select exists (select 1 from app.accounts a, u where a.user_id = u.id) as ok),
    k as (
      select (jsonb_typeof(p_result) = 'object' and jsonb_typeof(p_source) = 'object') as shaped,
             (p_result ->> 'id')::uuid as rid, (p_source ->> 'id')::uuid as sid,
             (p_source ->> 'scratch_bit_id')::uuid as scid, null::uuid as cid,
             (p_result ->> 'parent_id')::uuid as pid, jsonb_exists(p_result, 'level') as isnode
    ),
    rn as (select n.* from app.nodes n, u, k where n.user_id = u.id and n.id = k.rid),
    rb as (select b.* from app.bits b, u, k where b.user_id = u.id and b.id = k.rid),
    src as (select r.* from app.scratch_breakdowns r, u, k where r.user_id = u.id and r.id = k.sid),
    sc as (select b.* from app.bits b, u, k where b.user_id = u.id and b.id = k.scid),
    cand as (select c.* from app.staged_candidates c, u, k where c.user_id = u.id and c.id = k.cid),
    bysrc as (select c.* from app.staged_candidates c, u, k where c.user_id = u.id and c.source_breakdown_id = k.sid),
    kids as (
      select (exists (select 1 from app.nodes n, u, k where n.user_id = u.id and n.parent_id = k.rid)
           or exists (select 1 from app.bits b, u, k where b.user_id = u.id and b.parent_id = k.rid)
           or exists (select 1 from app.chunks c, u, k where c.user_id = u.id and c.parent_id = k.rid)) as any
    ),
    par as (select (k.pid is null or exists (select 1 from app.nodes n, u where n.user_id = u.id and n.id = k.pid)) as ok from k),
    act as (
      select exists (
        select 1 from sc join app.nodes n on n.user_id = sc.user_id and n.id = sc.parent_id
         where sc.deleted_at is null and sc.archived_at is null
           and n.system_role = 'inbox' and n.deleted_at is null and n.archived_at is null
      ) as ok
    ),
    snap as (
      select coalesce(
        (p_result ->> 'version')::integer = 1 and (p_result -> 'created_at') = (p_result -> 'mtime')
        and (p_result ->> 'deleted_at') is null and (p_result ->> 'archived_at') is null
        and (not k.isnode or ((p_result ->> 'system_role') is null and (p_result ->> 'hidden_from_grid')::boolean = false))
        and (p_source -> 'consumed_at') = (p_result -> 'created_at'), false) as ok
      from k
    ),
    post as (
      select coalesce(
        not exists (select 1 from rn) and not exists (select 1 from rb) and not kids.any
        and exists (select 1 from src where (to_jsonb(src) - 'user_id') = ((p_source - 'user_id')
              || jsonb_build_object('consumed_at', null, 'version', (p_source ->> 'version')::integer + 1)))
        and not exists (select 1 from bysrc), false) as ok
      from kids
    ),
    pre as (
      select coalesce(
        snap.ok and not kids.any and par.ok
        and exists (select 1 from src where (to_jsonb(src) - 'user_id') = (p_source - 'user_id'))
        and (case when k.isnode then exists (select 1 from rn where (to_jsonb(rn) - 'user_id') = (p_result - 'user_id')) and not exists (select 1 from rb)
                  else exists (select 1 from rb where (to_jsonb(rb) - 'user_id') = (p_result - 'user_id')) and not exists (select 1 from rn) end)
        and not exists (select 1 from bysrc), false) as ok
      from k, snap, kids, par
    ),
    verdict as (
      select case
        when not acct.ok then 'account_missing'
        when not k.shaped or k.rid is null or k.sid is null or k.scid is null then 'conflict'
        when post.ok then 'already_applied'
        when not act.ok then 'rejected'
        when pre.ok then 'not_applied'
        else 'conflict'
      end as s
      from acct, k, post, act, pre
    )
    select case when verdict.s = 'account_missing'
      then jsonb_build_object('status', 'rejected', 'result', null, 'changes', '{}'::jsonb,
                              'rejection', jsonb_build_object('code', 'account_missing'))
      else jsonb_build_object('status', verdict.s, 'result', null, 'changes', coalesce((select jsonb_object_agg(t.k, t.v) from (values
        ('nodes', case when exists (select 1 from rn) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(rn)) from rn), 'deleted', '[]'::jsonb) end),
        ('bits', case when exists (select 1 from sc union all select 1 from rb)
           then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(w)) from (select * from sc union select * from rb) w), 'deleted', '[]'::jsonb) end),
        ('scratch_breakdowns', case when exists (select 1 from src) then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(src)) from src), 'deleted', '[]'::jsonb) end),
        ('staged_candidates', case when exists (select 1 from cand union all select 1 from bysrc)
           then jsonb_build_object('upserted', (select jsonb_agg(to_jsonb(x)) from (select * from cand union select * from bysrc) x), 'deleted', '[]'::jsonb) end)
      ) as t(k, v) where t.v is not null), '{}'::jsonb))
        || case when verdict.s = 'rejected' then jsonb_build_object('rejection', jsonb_build_object('code', 'invalid_target')) else '{}'::jsonb end
    end
    from verdict
  $$;


alter function public.undo_staged_placement(jsonb, jsonb, jsonb) owner to griddo_writer;
alter function public.undo_direct_placement(jsonb, jsonb) owner to griddo_writer;
revoke all on function public.undo_staged_placement(jsonb, jsonb, jsonb) from public, anon, service_role;
revoke all on function public.undo_direct_placement(jsonb, jsonb) from public, anon, service_role;
revoke all on function public.reconcile_undo_staged_placement(jsonb, jsonb, jsonb) from public, anon, service_role;
revoke all on function public.reconcile_undo_direct_placement(jsonb, jsonb) from public, anon, service_role;
grant execute on function public.undo_staged_placement(jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.undo_direct_placement(jsonb, jsonb) to authenticated;
grant execute on function public.reconcile_undo_staged_placement(jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.reconcile_undo_direct_placement(jsonb, jsonb) to authenticated;
revoke create on schema internal from griddo_writer;
revoke create on schema public from griddo_writer;
