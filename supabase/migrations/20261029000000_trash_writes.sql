-- Task 220, Stage 1: public.soft_delete_node(), soft_delete_bit(), restore_node() and restore_bit()
-- (SCHEMA Hooks 1, 4, 5, 8 and 12), with the lifecycle helpers Stage 2 (archive) reuses.
--
-- Locks (SCHEMA §Locks): a restore locks the tree of the topmost ancestor in the same state
-- (internal.lock_restore). A function that places items takes the advisory lock of every Grid it
-- places in, in ascending key order, then the row locks: Nodes of its tree ordered by id (the
-- subtree and the ancestor chain, in one statement), then the Bits of the subtree. The set is
-- computed again once the locks are held and the locking starts over when it grew.
--
-- Every function returns `applied` for an item already in the target state, with no write and
-- the current row in `changes`. A restore that cannot place an item returns `grid_full` and
-- writes nothing.

grant create on schema internal to griddo_writer;
grant create on schema public to griddo_writer;

-- Ids of the Nodes of the subtree of p_root, the root included, whatever their lifecycle.
create function internal.subtree_ids(p_user uuid, p_root uuid) returns uuid[]
  language sql stable security invoker set search_path = ''
  as $$
    with recursive sub as (
      select id from app.nodes where id = p_root and user_id = p_user
      union all
      select n.id from app.nodes n join sub on n.parent_id = sub.id where n.user_id = p_user
    )
    select coalesce(array_agg(id), '{}') from sub
  $$;

-- Ids of the ancestors of p_root, nearest first, the root not included.
create function internal.ancestor_ids(p_user uuid, p_root uuid) returns uuid[]
  language sql stable security invoker set search_path = ''
  as $$
    with recursive up as (
      select n.id, n.parent_id, 1 as depth from app.nodes n
       where n.user_id = p_user and n.id = (select parent_id from app.nodes where id = p_root and user_id = p_user)
      union all
      select n.id, n.parent_id, up.depth + 1 from app.nodes n join up on n.id = up.parent_id where n.user_id = p_user
    )
    select coalesce(array_agg(id order by depth), '{}') from up
  $$;

-- Takes the advisory lock of every Grid a restore of these Nodes can place in (the Grid of each
-- Node's parent, L0 for none, and the Grid of each Node itself), in ascending key order. The key
-- is the one internal.lock_grid() uses.
create function internal.lock_grids_of(p_user uuid, p_nodes uuid[]) returns void
  language plpgsql volatile security invoker set search_path = ''
  as $$
declare
  v_key bigint;
begin
  for v_key in
    select distinct k from (
      select pg_catalog.hashtextextended('grid:' || p_user::text || ':' || coalesce(n.parent_id::text, 'L0'), 0) as k
        from app.nodes n where n.user_id = p_user and n.id = any (p_nodes)
      union all
      select pg_catalog.hashtextextended('grid:' || p_user::text || ':' || n.id::text, 0)
        from app.nodes n where n.user_id = p_user and n.id = any (p_nodes)
    ) keys order by k
  loop
    perform pg_advisory_xact_lock(v_key);
  end loop;
end
$$;

-- Locks the tree of p_root for a lifecycle write: optionally the Grids first, then the Nodes of
-- the subtree and of the ancestor chain `for update` in one statement ordered by id, then the
-- Bits of the subtree ordered by id. The Node set is computed again once the locks are held; a
-- set that grew meanwhile is locked again.
create function internal.lock_tree(p_user uuid, p_root uuid, p_grids boolean) returns void
  language plpgsql volatile security invoker set search_path = ''
  as $$
declare
  v_set uuid[];
  v_after uuid[];
  v_attempt integer;
begin
  for v_attempt in 1 .. 3 loop
    v_set := internal.subtree_ids(p_user, p_root) || internal.ancestor_ids(p_user, p_root);
    if p_grids then
      perform internal.lock_grids_of(p_user, v_set);
    end if;
    perform 1 from (
      select n.id from app.nodes n where n.user_id = p_user and n.id = any (v_set) order by n.id for update
    ) locked;
    v_after := internal.subtree_ids(p_user, p_root) || internal.ancestor_ids(p_user, p_root);
    exit when v_after <@ v_set;
    if v_attempt = 3 then
      raise exception 'could not settle the lock set of Node %', p_root using errcode = '40001';
    end if;
  end loop;
  perform 1 from (
    select b.id from app.bits b
     where b.user_id = p_user and b.parent_id = any (internal.subtree_ids(p_user, p_root))
     order by b.id for update
  ) locked;
end
$$;

-- The topmost Node of the chain of p_node that is in the state (trashed for p_deleted, otherwise
-- archived), going up through ancestors that are in it; p_node itself when its parent is not.
create function internal.top_in_state(p_user uuid, p_node uuid, p_deleted boolean) returns uuid
  language plpgsql stable security invoker set search_path = ''
  as $$
declare
  v_top uuid := p_node;
  v_walk uuid;
  v_n app.nodes;
begin
  select parent_id into v_walk from app.nodes where id = p_node and user_id = p_user;
  while v_walk is not null loop
    select * into v_n from app.nodes where id = v_walk and user_id = p_user;
    exit when not found;
    exit when (case when p_deleted then v_n.deleted_at else v_n.archived_at end) is null;
    v_top := v_n.id;
    v_walk := v_n.parent_id;
  end loop;
  return v_top;
end
$$;

-- Locks what a restore of p_node writes: the tree of the topmost ancestor in the same state (its
-- subtree, which holds the same-window siblings, its chain, the Grids and the Bits), and checks
-- the topmost ancestor again under the locks, starting over when it changed.
create function internal.lock_restore(p_user uuid, p_node uuid, p_deleted boolean) returns void
  language plpgsql volatile security invoker set search_path = ''
  as $$
declare
  v_top uuid;
  v_attempt integer;
begin
  for v_attempt in 1 .. 3 loop
    v_top := internal.top_in_state(p_user, p_node, p_deleted);
    perform internal.lock_tree(p_user, v_top, true);
    exit when internal.top_in_state(p_user, p_node, p_deleted) = v_top;
    if v_attempt = 3 then
      raise exception 'could not settle the restore lock set of Node %', p_node using errcode = '40001';
    end if;
  end loop;
end
$$;

-- Complete rows of the caller's Nodes or Bits as a JSON array ordered by id.
create function internal.node_rows(p_user uuid, p_ids uuid[]) returns jsonb
  language sql stable security invoker set search_path = ''
  as $$ select coalesce(jsonb_agg(to_jsonb(n) order by n.id), '[]'::jsonb) from app.nodes n where n.user_id = p_user and n.id = any (p_ids) $$;

create function internal.bit_rows(p_user uuid, p_ids uuid[]) returns jsonb
  language sql stable security invoker set search_path = ''
  as $$ select coalesce(jsonb_agg(to_jsonb(b) order by b.id), '[]'::jsonb) from app.bits b where b.user_id = p_user and b.id = any (p_ids) $$;

-- The restore both lifecycle states share (Hooks 5 and 11). p_deleted is true for the trash
-- (`deleted_at`), false for the archive (`archived_at`). The caller holds the locks.
--
-- p_root is the Node whose restore is asked for (restore_node, unarchive_node) or the parent of
-- the Bit whose restore is asked for (p_bit). The ancestors that are in the same state are
-- restored first, nearest the top first, each as a restore of that Node would be: itself and the
-- members of its subtree whose timestamp is within 5 s of its own and whose parent is restored or
-- active. Then the root, then the Bit if it is still in the state. Each restored item gets
-- version + 1 and keeps its cell when that is free, otherwise the cell internal.pick_free_cell
-- picks (reserved cells count as taken); a Scratch Bit under the Inbox keeps its (0,0) sentinel.
-- The parent of each restored root gets mtime.
--
-- Returns {"nodes": [ids], "bits": [ids]} of the rows written or touched, or {"rejection": code}
-- with nothing written: parent_inactive when the restored item would be live under a Node that is
-- in the other state, grid_full when an item has no free cell.
create function internal.restore_tree(
  p_user uuid, p_root uuid, p_deleted boolean, p_reserved jsonb, p_now bigint, p_bit uuid default null
) returns jsonb
  language plpgsql volatile security invoker set search_path = ''
  as $$
declare
  v_chain uuid[];
  v_walk uuid;
  v_n app.nodes;
  v_top app.nodes;
  v_parent app.nodes;
  v_list uuid[] := '{}';
  v_a app.nodes;
  v_anchor bigint;
  v_ok uuid[];
  v_rec record;
  v_cx integer;
  v_cy integer;
  v_nodes uuid[] := '{}';
  v_bits uuid[] := '{}';
  v_touch uuid[] := '{}';
  v_bit app.bits;
  v_bit_parent app.nodes;
  v_state bigint;
begin
  -- The ancestors in the state, nearest first, stopping at the first one that is not.
  v_chain := '{}';
  v_walk := (select parent_id from app.nodes where id = p_root and user_id = p_user);
  while v_walk is not null loop
    select * into v_n from app.nodes where id = v_walk and user_id = p_user;
    exit when not found;
    exit when (case when p_deleted then v_n.deleted_at else v_n.archived_at end) is null;
    v_chain := v_chain || v_n.id;
    v_walk := v_n.parent_id;
  end loop;

  -- The Nodes to restore, top first: the chain reversed, then the root when it is in the state.
  select * into v_n from app.nodes where id = p_root and user_id = p_user;
  for i in reverse coalesce(array_length(v_chain, 1), 0) .. 1 loop
    v_list := v_list || v_chain[i];
  end loop;
  if (case when p_deleted then v_n.deleted_at else v_n.archived_at end) is not null then
    v_list := v_list || p_root;
  end if;

  -- The item that comes back live must not sit under a Node in the other state.
  if coalesce(array_length(v_list, 1), 0) > 0 then
    select * into v_top from app.nodes where id = v_list[1] and user_id = p_user;
    if v_top.parent_id is not null then
      select * into v_parent from app.nodes where id = v_top.parent_id and user_id = p_user;
      if (case when p_deleted then v_parent.archived_at else v_parent.deleted_at end) is not null
         and (case when p_deleted then v_top.archived_at else v_top.deleted_at end) is null then
        return jsonb_build_object('rejection', 'parent_inactive');
      end if;
    end if;
  elsif p_bit is not null
        and (case when p_deleted then v_n.archived_at else v_n.deleted_at end) is not null then
    return jsonb_build_object('rejection', 'parent_inactive');
  end if;

  begin
    foreach v_walk in array v_list loop
      select * into v_a from app.nodes where id = v_walk and user_id = p_user;
      v_anchor := case when p_deleted then v_a.deleted_at else v_a.archived_at end;
      -- A Node restored with an earlier one of the list needs no restore of its own.
      continue when v_anchor is null;
      v_ok := '{}';
      -- Pre-order of the subtree, siblings by row then column.
      for v_rec in
        with recursive sub as (
          select n.id, n.parent_id, n.x, n.y, n.deleted_at, n.archived_at,
                 array[lpad(n.y::text, 2, '0') || lpad(n.x::text, 2, '0') || n.id::text] as ord
            from app.nodes n where n.id = v_a.id and n.user_id = p_user
          union all
          select c.id, c.parent_id, c.x, c.y, c.deleted_at, c.archived_at,
                 sub.ord || (lpad(c.y::text, 2, '0') || lpad(c.x::text, 2, '0') || c.id::text)
            from app.nodes c join sub on c.parent_id = sub.id where c.user_id = p_user
        )
        select * from sub order by ord
      loop
        if (case when p_deleted then v_rec.deleted_at else v_rec.archived_at end) is null then
          v_ok := v_ok || v_rec.id;
        elsif abs((case when p_deleted then v_rec.deleted_at else v_rec.archived_at end) - v_anchor) <= 5000
              and (v_rec.id = v_a.id or v_rec.parent_id = any (v_ok)) then
          select f.x, f.y into v_cx, v_cy from internal.pick_free_cell(p_user, v_rec.parent_id, p_reserved, v_rec.x, v_rec.y) f;
          if not found then
            raise exception 'grid_full' using errcode = 'GR001';
          end if;
          update app.nodes
             set deleted_at = case when p_deleted then null else deleted_at end,
                 archived_at = case when p_deleted then archived_at else null end,
                 x = v_cx, y = v_cy, version = version + 1
           where id = v_rec.id and user_id = p_user;
          v_ok := v_ok || v_rec.id;
          v_nodes := v_nodes || v_rec.id;
        end if;
      end loop;
      -- Bits of the restorable Nodes in the same window, by row then column.
      for v_rec in
        select b.id, b.parent_id, b.x, b.y, n.system_role
          from app.bits b join app.nodes n on n.id = b.parent_id and n.user_id = b.user_id
         where b.user_id = p_user and b.parent_id = any (v_ok)
           and (case when p_deleted then b.deleted_at else b.archived_at end) is not null
           and abs((case when p_deleted then b.deleted_at else b.archived_at end) - v_anchor) <= 5000
         order by b.y, b.x, b.id
      loop
        if v_rec.system_role = 'inbox' then
          v_cx := v_rec.x;
          v_cy := v_rec.y;
        else
          select f.x, f.y into v_cx, v_cy from internal.pick_free_cell(p_user, v_rec.parent_id, p_reserved, v_rec.x, v_rec.y) f;
          if not found then
            raise exception 'grid_full' using errcode = 'GR001';
          end if;
        end if;
        update app.bits
           set deleted_at = case when p_deleted then null else deleted_at end,
               archived_at = case when p_deleted then archived_at else null end,
               x = v_cx, y = v_cy, version = version + 1
         where id = v_rec.id and user_id = p_user;
        v_bits := v_bits || v_rec.id;
      end loop;
      if v_a.parent_id is not null then
        v_touch := v_touch || v_a.parent_id;
      end if;
    end loop;

    -- The requested Bit, when the restores above did not bring it back.
    if p_bit is not null then
      select * into v_bit from app.bits where id = p_bit and user_id = p_user;
      v_state := case when p_deleted then v_bit.deleted_at else v_bit.archived_at end;
      if v_state is not null then
        select * into v_bit_parent from app.nodes where id = v_bit.parent_id and user_id = p_user;
        if v_bit_parent.system_role = 'inbox' then
          v_cx := v_bit.x;
          v_cy := v_bit.y;
        else
          select f.x, f.y into v_cx, v_cy from internal.pick_free_cell(p_user, v_bit.parent_id, p_reserved, v_bit.x, v_bit.y) f;
          if not found then
            raise exception 'grid_full' using errcode = 'GR001';
          end if;
        end if;
        update app.bits
           set deleted_at = case when p_deleted then null else deleted_at end,
               archived_at = case when p_deleted then archived_at else null end,
               x = v_cx, y = v_cy, version = version + 1
         where id = p_bit and user_id = p_user;
        v_bits := v_bits || p_bit;
        v_touch := v_touch || v_bit.parent_id;
      end if;
    end if;

    if coalesce(array_length(v_touch, 1), 0) > 0 then
      update app.nodes set mtime = p_now where user_id = p_user and id = any (v_touch);
    end if;
  exception when sqlstate 'GR001' then
    return jsonb_build_object('rejection', 'grid_full');
  end;

  return jsonb_build_object('nodes', to_jsonb(v_nodes || v_touch), 'bits', to_jsonb(v_bits));
end
$$;

alter function internal.subtree_ids(uuid, uuid) owner to griddo_writer;
alter function internal.ancestor_ids(uuid, uuid) owner to griddo_writer;
alter function internal.lock_grids_of(uuid, uuid[]) owner to griddo_writer;
alter function internal.lock_tree(uuid, uuid, boolean) owner to griddo_writer;
alter function internal.top_in_state(uuid, uuid, boolean) owner to griddo_writer;
alter function internal.lock_restore(uuid, uuid, boolean) owner to griddo_writer;
alter function internal.node_rows(uuid, uuid[]) owner to griddo_writer;
alter function internal.bit_rows(uuid, uuid[]) owner to griddo_writer;
alter function internal.restore_tree(uuid, uuid, boolean, jsonb, bigint, uuid) owner to griddo_writer;
revoke all on function internal.subtree_ids(uuid, uuid) from public;
revoke all on function internal.ancestor_ids(uuid, uuid) from public;
revoke all on function internal.lock_grids_of(uuid, uuid[]) from public;
revoke all on function internal.lock_tree(uuid, uuid, boolean) from public;
revoke all on function internal.top_in_state(uuid, uuid, boolean) from public;
revoke all on function internal.lock_restore(uuid, uuid, boolean) from public;
revoke all on function internal.node_rows(uuid, uuid[]) from public;
revoke all on function internal.bit_rows(uuid, uuid[]) from public;
revoke all on function internal.restore_tree(uuid, uuid, boolean, jsonb, bigint, uuid) from public;
grant execute on function internal.subtree_ids(uuid, uuid) to griddo_writer;
grant execute on function internal.ancestor_ids(uuid, uuid) to griddo_writer;
grant execute on function internal.lock_grids_of(uuid, uuid[]) to griddo_writer;
grant execute on function internal.lock_tree(uuid, uuid, boolean) to griddo_writer;
grant execute on function internal.top_in_state(uuid, uuid, boolean) to griddo_writer;
grant execute on function internal.lock_restore(uuid, uuid, boolean) to griddo_writer;
grant execute on function internal.node_rows(uuid, uuid[]) to griddo_writer;
grant execute on function internal.bit_rows(uuid, uuid[]) to griddo_writer;
grant execute on function internal.restore_tree(uuid, uuid, boolean, jsonb, bigint, uuid) to griddo_writer;

-- ---------------------------------------------------------------------------------------------
-- soft_delete_node(p_id). Hook 4: the Node, its descendant Nodes and their Bits get deleted_at =
-- the transaction time, only where they are not trashed yet (version + 1 each); the parent Node
-- gets mtime. A system Node is invalid_target. Chunks are trashed implicitly.
create function public.soft_delete_node(p_id uuid)
  returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_node app.nodes;
  v_subtree uuid[];
  v_nodes uuid[];
  v_bits uuid[];
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
  if v_node.system_role is not null then
    return internal.envelope('rejected', null, internal.changes(internal.node_rows(v_user, array[p_id])),
                             jsonb_build_object('code', 'invalid_target'));
  end if;

  perform internal.lock_tree(v_user, p_id, false);
  select * into v_node from app.nodes where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  if v_node.deleted_at is not null then
    return internal.envelope('applied', jsonb_build_object('id', p_id),
                             internal.changes(internal.node_rows(v_user, array[p_id])));
  end if;

  v_subtree := internal.subtree_ids(v_user, p_id);
  with changed as (
    update app.nodes set deleted_at = v_now, version = version + 1
     where user_id = v_user and id = any (v_subtree) and deleted_at is null
    returning id
  ) select coalesce(array_agg(id), '{}') into v_nodes from changed;
  with changed as (
    update app.bits set deleted_at = v_now, version = version + 1
     where user_id = v_user and parent_id = any (v_subtree) and deleted_at is null
    returning id
  ) select coalesce(array_agg(id), '{}') into v_bits from changed;
  if v_node.parent_id is not null then
    update app.nodes set mtime = v_now where id = v_node.parent_id and user_id = v_user;
    v_nodes := v_nodes || v_node.parent_id;
  end if;

  return internal.envelope('applied', jsonb_build_object('id', p_id),
                           internal.changes(internal.node_rows(v_user, v_nodes), internal.bit_rows(v_user, v_bits)));
end
$$;

-- soft_delete_bit(p_id). Hook 4: the Bit gets deleted_at (version + 1) and its parent Node mtime.
-- A Scratch Bit (parent: the Inbox) is invalid_target: it is trashed by the Trash Scratch command.
create function public.soft_delete_bit(p_id uuid)
  returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_bit app.bits;
  v_parent app.nodes;
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
  select * into v_parent from app.nodes where id = v_bit.parent_id and user_id = v_user;
  if v_parent.system_role = 'inbox' then
    return internal.envelope('rejected', null, internal.changes(internal.node_rows(v_user, array[v_parent.id]),
                             internal.bit_rows(v_user, array[p_id])), jsonb_build_object('code', 'invalid_target'));
  end if;
  if v_bit.deleted_at is not null then
    return internal.envelope('applied', jsonb_build_object('id', p_id),
                             internal.changes('[]', internal.bit_rows(v_user, array[p_id])));
  end if;

  update app.bits set deleted_at = v_now, version = version + 1 where id = p_id and user_id = v_user;
  update app.nodes set mtime = v_now where id = v_parent.id and user_id = v_user;
  return internal.envelope('applied', jsonb_build_object('id', p_id),
                           internal.changes(internal.node_rows(v_user, array[v_parent.id]),
                                            internal.bit_rows(v_user, array[p_id])));
end
$$;

-- restore_node(p_id, p_reserved_cells). Hook 5: see internal.restore_tree. A Node that is not
-- trashed is applied with no write.
create function public.restore_node(p_id uuid, p_reserved_cells jsonb default '[]')
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
  if not internal.valid_reserved_cells(p_reserved_cells) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'invalid_input'));
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  select * into v_node from app.nodes where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;

  perform internal.lock_restore(v_user, p_id, true);
  select * into v_node from app.nodes where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  if v_node.deleted_at is null then
    return internal.envelope('applied', jsonb_build_object('id', p_id),
                             internal.changes(internal.node_rows(v_user, array[p_id])));
  end if;

  v_out := internal.restore_tree(v_user, p_id, true, p_reserved_cells, v_now);
  if v_out ? 'rejection' then
    return internal.envelope('rejected', null, internal.changes(internal.node_rows(v_user, array[p_id])),
                             jsonb_build_object('code', v_out ->> 'rejection'));
  end if;
  return internal.envelope('applied', jsonb_build_object('id', p_id),
    internal.changes(
      internal.node_rows(v_user, array(select value::uuid from jsonb_array_elements_text(v_out -> 'nodes'))),
      internal.bit_rows(v_user, array(select value::uuid from jsonb_array_elements_text(v_out -> 'bits')))));
end
$$;

-- restore_bit(p_id, p_reserved_cells). Hook 5: a trashed parent Node comes back first (with its
-- parent chain and its window), then the Bit if it is still trashed; an Inbox Scratch Bit keeps
-- its (0,0) sentinel.
create function public.restore_bit(p_id uuid, p_reserved_cells jsonb default '[]')
  returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_bit app.bits;
  v_parent uuid;
  v_attempt integer;
  v_out jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not internal.valid_reserved_cells(p_reserved_cells) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'invalid_input'));
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;

  -- Lock the tree of the Bit's parent; a Bit that moved meanwhile is locked through its new one.
  for v_attempt in 1 .. 3 loop
    select parent_id into v_parent from app.bits where id = p_id and user_id = v_user;
    if not found then
      return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
    end if;
    perform internal.lock_restore(v_user, v_parent, true);
    select * into v_bit from app.bits where id = p_id and user_id = v_user;
    if not found then
      return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
    end if;
    exit when v_bit.parent_id = v_parent;
    if v_attempt = 3 then
      raise exception 'could not settle the lock set of Bit %', p_id using errcode = '40001';
    end if;
  end loop;
  perform 1 from app.bits where id = p_id and user_id = v_user for update;
  select * into v_bit from app.bits where id = p_id and user_id = v_user;
  if v_bit.deleted_at is null then
    return internal.envelope('applied', jsonb_build_object('id', p_id),
                             internal.changes('[]', internal.bit_rows(v_user, array[p_id])));
  end if;

  v_out := internal.restore_tree(v_user, v_parent, true, p_reserved_cells, v_now, p_id);
  if v_out ? 'rejection' then
    return internal.envelope('rejected', null, internal.changes('[]', internal.bit_rows(v_user, array[p_id])),
                             jsonb_build_object('code', v_out ->> 'rejection'));
  end if;
  return internal.envelope('applied', jsonb_build_object('id', p_id),
    internal.changes(
      internal.node_rows(v_user, array(select value::uuid from jsonb_array_elements_text(v_out -> 'nodes'))),
      internal.bit_rows(v_user, array(select value::uuid from jsonb_array_elements_text(v_out -> 'bits')))));
end
$$;

alter function public.soft_delete_node(uuid) owner to griddo_writer;
alter function public.soft_delete_bit(uuid) owner to griddo_writer;
alter function public.restore_node(uuid, jsonb) owner to griddo_writer;
alter function public.restore_bit(uuid, jsonb) owner to griddo_writer;
revoke all on function public.soft_delete_node(uuid) from public, anon, service_role;
revoke all on function public.soft_delete_bit(uuid) from public, anon, service_role;
revoke all on function public.restore_node(uuid, jsonb) from public, anon, service_role;
revoke all on function public.restore_bit(uuid, jsonb) from public, anon, service_role;
grant execute on function public.soft_delete_node(uuid) to authenticated;
grant execute on function public.soft_delete_bit(uuid) to authenticated;
grant execute on function public.restore_node(uuid, jsonb) to authenticated;
grant execute on function public.restore_bit(uuid, jsonb) to authenticated;
revoke create on schema internal from griddo_writer;
revoke create on schema public from griddo_writer;
