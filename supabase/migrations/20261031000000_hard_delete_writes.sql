-- Task 220, Stage 3: public.hard_delete_node(), hard_delete_bit(), empty_trash() and
-- cleanup_expired_trash() (SCHEMA Hooks 6, 7 and 1; Scratch Bit Permanent Deletion).
--
-- One internal.purge() deletes an aggregate in one order: staged candidates, Scratch Breakdowns,
-- Chunks, Bits, Nodes (a candidate's foreign key refuses the other order, S18). The Node closure
-- is the Node, its descendant Nodes, their Bits, and everything those own. The surviving parent
-- of a deleted root gets mtime (Hook 1). `changes` lists the deleted ids per table and the
-- touched parents as upserted rows.
--
-- Locks: Nodes in one statement ordered by id (the closure, the parents that get mtime), then the
-- Bits, so a concurrent restore (which locks the same way) is either kept whole or finds its item
-- gone. The root set is computed again once the Node locks are held, and the locking starts over
-- when it grew.

grant create on schema internal to griddo_writer;
grant create on schema public to griddo_writer;

-- Ids of the caller's trashed Nodes (all of them when p_cutoff is null, otherwise those trashed
-- before it). System Nodes cannot be trashed, so none is ever listed.
create function internal.trash_node_roots(p_user uuid, p_cutoff bigint) returns uuid[]
  language sql stable security invoker set search_path = ''
  as $$
    select coalesce(array_agg(n.id), '{}') from app.nodes n
     where n.user_id = p_user and n.deleted_at is not null and n.system_role is null
       and (p_cutoff is null or n.deleted_at < p_cutoff)
  $$;

-- Ids of the caller's trashed Bits, the same way.
create function internal.trash_bit_roots(p_user uuid, p_cutoff bigint) returns uuid[]
  language sql stable security invoker set search_path = ''
  as $$
    select coalesce(array_agg(b.id), '{}') from app.bits b
     where b.user_id = p_user and b.deleted_at is not null
       and (p_cutoff is null or b.deleted_at < p_cutoff)
  $$;

-- Ids of the Nodes of the closure of these Node roots (the roots included).
create function internal.closure_ids(p_user uuid, p_roots uuid[]) returns uuid[]
  language sql stable security invoker set search_path = ''
  as $$
    with recursive sub as (
      select id from app.nodes where user_id = p_user and id = any (p_roots)
      union
      select n.id from app.nodes n join sub on n.parent_id = sub.id where n.user_id = p_user
    )
    select coalesce(array_agg(id), '{}') from sub
  $$;

-- The Nodes whose rows a purge of these roots touches: the closure and the parents of the roots.
create function internal.purge_nodes(p_user uuid, p_node_roots uuid[], p_bit_roots uuid[]) returns uuid[]
  language sql stable security invoker set search_path = ''
  as $$
    select coalesce(array_agg(distinct id), '{}') from (
      select unnest(internal.closure_ids(p_user, p_node_roots)) as id
      union
      select n.parent_id from app.nodes n where n.user_id = p_user and n.id = any (p_node_roots) and n.parent_id is not null
      union
      select b.parent_id from app.bits b where b.user_id = p_user and b.id = any (p_bit_roots)
    ) s
  $$;

-- Locks what a purge of the trash (all of it, or what was trashed before p_cutoff) deletes and
-- touches. Returns {"nodes": [root ids], "bits": [root ids]} as computed under the locks.
create function internal.lock_purge(p_user uuid, p_cutoff bigint) returns jsonb
  language plpgsql volatile security invoker set search_path = ''
  as $$
declare
  v_nodes uuid[];
  v_bits uuid[];
  v_set uuid[];
  v_after uuid[];
  v_attempt integer;
begin
  for v_attempt in 1 .. 3 loop
    v_nodes := internal.trash_node_roots(p_user, p_cutoff);
    v_bits := internal.trash_bit_roots(p_user, p_cutoff);
    v_set := internal.purge_nodes(p_user, v_nodes, v_bits);
    perform 1 from (
      select n.id from app.nodes n where n.user_id = p_user and n.id = any (v_set) order by n.id for update
    ) locked;
    v_nodes := internal.trash_node_roots(p_user, p_cutoff);
    v_bits := internal.trash_bit_roots(p_user, p_cutoff);
    v_after := internal.purge_nodes(p_user, v_nodes, v_bits);
    exit when v_after <@ v_set;
    if v_attempt = 3 then
      raise exception 'could not settle the purge lock set' using errcode = '40001';
    end if;
  end loop;
  perform 1 from (
    select b.id from app.bits b
     where b.user_id = p_user
       and (b.id = any (v_bits) or b.parent_id = any (internal.closure_ids(p_user, v_nodes)))
     order by b.id for update
  ) locked;
  return jsonb_build_object('nodes', to_jsonb(v_nodes), 'bits', to_jsonb(v_bits));
end
$$;

-- Deletes the aggregate of these roots and touches the surviving parents. The caller holds the
-- locks. Returns {"deleted": {table: [ids]}, "touched": [Node ids]}.
create function internal.purge(p_user uuid, p_node_roots uuid[], p_bit_roots uuid[], p_now bigint) returns jsonb
  language plpgsql volatile security invoker set search_path = ''
  as $$
declare
  v_closure uuid[] := internal.closure_ids(p_user, p_node_roots);
  v_parents uuid[];
  v_bits uuid[];
  v_candidates uuid[];
  v_breakdowns uuid[];
  v_chunks uuid[];
  v_nodes uuid[];
begin
  select coalesce(array_agg(id), '{}') into v_bits from app.bits
   where user_id = p_user and (id = any (p_bit_roots) or parent_id = any (v_closure));
  select coalesce(array_agg(distinct pid), '{}') into v_parents from (
    select n.parent_id as pid from app.nodes n where n.user_id = p_user and n.id = any (p_node_roots)
    union
    select b.parent_id from app.bits b where b.user_id = p_user and b.id = any (p_bit_roots)
  ) s where pid is not null and pid <> all (v_closure);

  with gone as (
    delete from app.staged_candidates where user_id = p_user and scratch_bit_id = any (v_bits) returning id
  ) select coalesce(array_agg(id), '{}') into v_candidates from gone;
  with gone as (
    delete from app.scratch_breakdowns where user_id = p_user and scratch_bit_id = any (v_bits) returning id
  ) select coalesce(array_agg(id), '{}') into v_breakdowns from gone;
  with gone as (
    delete from app.chunks where user_id = p_user and parent_id = any (v_bits) returning id
  ) select coalesce(array_agg(id), '{}') into v_chunks from gone;
  delete from app.bits where user_id = p_user and id = any (v_bits);
  with gone as (
    delete from app.nodes where user_id = p_user and id = any (v_closure) returning id
  ) select coalesce(array_agg(id), '{}') into v_nodes from gone;
  update app.nodes set mtime = p_now where user_id = p_user and id = any (v_parents);

  return jsonb_build_object(
    'deleted', jsonb_build_object(
      'nodes', to_jsonb(v_nodes), 'bits', to_jsonb(v_bits), 'chunks', to_jsonb(v_chunks),
      'scratch_breakdowns', to_jsonb(v_breakdowns), 'staged_candidates', to_jsonb(v_candidates)),
    'touched', to_jsonb(v_parents));
end
$$;

-- The `changes` of a purge: the touched parents as upserted Node rows, and the deleted ids of
-- every table that lost rows.
create function internal.purge_changes(p_user uuid, p_purge jsonb) returns jsonb
  language plpgsql stable security invoker set search_path = ''
  as $$
declare
  v_changes jsonb := internal.changes(
    internal.node_rows(p_user, array(select value::uuid from jsonb_array_elements_text(p_purge -> 'touched'))));
  v_table text;
begin
  for v_table in select jsonb_object_keys(p_purge -> 'deleted') loop
    if jsonb_array_length(p_purge -> 'deleted' -> v_table) > 0 then
      v_changes := jsonb_set(
        v_changes, array[v_table],
        coalesce(v_changes -> v_table, jsonb_build_object('upserted', '[]'::jsonb))
          || jsonb_build_object('deleted', p_purge -> 'deleted' -> v_table));
    end if;
  end loop;
  return v_changes;
end
$$;

alter function internal.trash_node_roots(uuid, bigint) owner to griddo_writer;
alter function internal.trash_bit_roots(uuid, bigint) owner to griddo_writer;
alter function internal.closure_ids(uuid, uuid[]) owner to griddo_writer;
alter function internal.purge_nodes(uuid, uuid[], uuid[]) owner to griddo_writer;
alter function internal.lock_purge(uuid, bigint) owner to griddo_writer;
alter function internal.purge(uuid, uuid[], uuid[], bigint) owner to griddo_writer;
alter function internal.purge_changes(uuid, jsonb) owner to griddo_writer;
revoke all on function internal.trash_node_roots(uuid, bigint) from public;
revoke all on function internal.trash_bit_roots(uuid, bigint) from public;
revoke all on function internal.closure_ids(uuid, uuid[]) from public;
revoke all on function internal.purge_nodes(uuid, uuid[], uuid[]) from public;
revoke all on function internal.lock_purge(uuid, bigint) from public;
revoke all on function internal.purge(uuid, uuid[], uuid[], bigint) from public;
revoke all on function internal.purge_changes(uuid, jsonb) from public;
grant execute on function internal.trash_node_roots(uuid, bigint) to griddo_writer;
grant execute on function internal.trash_bit_roots(uuid, bigint) to griddo_writer;
grant execute on function internal.closure_ids(uuid, uuid[]) to griddo_writer;
grant execute on function internal.purge_nodes(uuid, uuid[], uuid[]) to griddo_writer;
grant execute on function internal.lock_purge(uuid, bigint) to griddo_writer;
grant execute on function internal.purge(uuid, uuid[], uuid[], bigint) to griddo_writer;
grant execute on function internal.purge_changes(uuid, jsonb) to griddo_writer;

-- ---------------------------------------------------------------------------------------------
-- hard_delete_node(p_id). Hook 6: the Node must be in the trash (invalid_target for a live Node
-- or a system Node, nothing written). Deletes its closure; the parent Node gets mtime.
create function public.hard_delete_node(p_id uuid)
  returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_node app.nodes;
  v_out jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  select * into v_node from app.nodes where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;

  perform internal.lock_tree(v_user, p_id, false);
  select * into v_node from app.nodes where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  if v_node.system_role is not null or v_node.deleted_at is null then
    return internal.envelope('rejected', null, internal.changes(internal.node_rows(v_user, array[p_id])),
                             jsonb_build_object('code', 'invalid_target'));
  end if;

  v_out := internal.purge(v_user, array[p_id], '{}', v_now);
  return internal.envelope('applied', jsonb_build_object('id', p_id), internal.purge_changes(v_user, v_out));
end
$$;

-- hard_delete_bit(p_id). Hook 6 and Scratch Bit Permanent Deletion: the Bit must be in the trash
-- (invalid_target otherwise). Deletes its staged candidates, Breakdowns and Chunks, then the Bit;
-- the parent Node gets mtime.
create function public.hard_delete_bit(p_id uuid)
  returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_bit app.bits;
  v_out jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  v_bit := internal.lock_bit_and_node(v_user, p_id);
  if v_bit.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  if v_bit.deleted_at is null then
    return internal.envelope('rejected', null, internal.changes('[]', internal.bit_rows(v_user, array[p_id])),
                             jsonb_build_object('code', 'invalid_target'));
  end if;

  v_out := internal.purge(v_user, '{}', array[p_id], v_now);
  return internal.envelope('applied', jsonb_build_object('id', p_id), internal.purge_changes(v_user, v_out));
end
$$;

-- empty_trash(). Hook 6: deletes every trashed Node closure and every trashed Bit in one
-- transaction; a failure deletes nothing. The result carries the number of Nodes and Bits deleted.
create function public.empty_trash()
  returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_roots jsonb;
  v_out jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  v_roots := internal.lock_purge(v_user, null);
  v_out := internal.purge(
    v_user,
    array(select value::uuid from jsonb_array_elements_text(v_roots -> 'nodes')),
    array(select value::uuid from jsonb_array_elements_text(v_roots -> 'bits')),
    v_now);
  return internal.envelope('applied',
    jsonb_build_object('nodes', jsonb_array_length(v_out -> 'deleted' -> 'nodes'),
                       'bits', jsonb_array_length(v_out -> 'deleted' -> 'bits')),
    internal.purge_changes(v_user, v_out));
end
$$;

-- cleanup_expired_trash(). Hook 7: deletes what was trashed more than 30 days before the
-- transaction time, closures included, and records the visit (accounts.last_visit_at) even when
-- nothing expired, so a guest with an open tab is not cleaned up.
create function public.cleanup_expired_trash()
  returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_roots jsonb;
  v_out jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  update app.accounts set last_visit_at = v_now where user_id = v_user;
  v_roots := internal.lock_purge(v_user, v_now - 30 * 86400000::bigint);
  v_out := internal.purge(
    v_user,
    array(select value::uuid from jsonb_array_elements_text(v_roots -> 'nodes')),
    array(select value::uuid from jsonb_array_elements_text(v_roots -> 'bits')),
    v_now);
  return internal.envelope('applied',
    jsonb_build_object('nodes', jsonb_array_length(v_out -> 'deleted' -> 'nodes'),
                       'bits', jsonb_array_length(v_out -> 'deleted' -> 'bits')),
    internal.purge_changes(v_user, v_out));
end
$$;

alter function public.hard_delete_node(uuid) owner to griddo_writer;
alter function public.hard_delete_bit(uuid) owner to griddo_writer;
alter function public.empty_trash() owner to griddo_writer;
alter function public.cleanup_expired_trash() owner to griddo_writer;
revoke all on function public.hard_delete_node(uuid) from public, anon, service_role;
revoke all on function public.hard_delete_bit(uuid) from public, anon, service_role;
revoke all on function public.empty_trash() from public, anon, service_role;
revoke all on function public.cleanup_expired_trash() from public, anon, service_role;
grant execute on function public.hard_delete_node(uuid) to authenticated;
grant execute on function public.hard_delete_bit(uuid) to authenticated;
grant execute on function public.empty_trash() to authenticated;
grant execute on function public.cleanup_expired_trash() to authenticated;
revoke create on schema internal from griddo_writer;
revoke create on schema public from griddo_writer;
