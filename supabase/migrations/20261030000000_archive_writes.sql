-- Task 220, Stage 2: public.archive_node(), archive_bit(), unarchive_node() and unarchive_bit()
-- (SCHEMA Hooks 1, 8, 10, 11 and 12). The locks, the restore window and the cell picking are the
-- ones of Stage 1 (internal.lock_tree, internal.lock_restore, internal.restore_tree with
-- p_deleted = false).
--
-- Archive sets `archived_at` only where it is null, so a descendant archived on its own keeps its
-- own time and stays archived when the root is unarchived (Hook 11). A call on an item already in
-- the target state is `applied` with no write and the current row in `changes`.

grant create on schema public to griddo_writer;

-- archive_node(p_id). Hook 10: the Node, its descendant Nodes and their Bits get archived_at = the
-- transaction time where they are not archived yet (version + 1 each; trashed ones included); the
-- parent Node gets mtime. A system Node is invalid_target.
create function public.archive_node(p_id uuid)
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
  if v_node.archived_at is not null then
    return internal.envelope('applied', jsonb_build_object('id', p_id),
                             internal.changes(internal.node_rows(v_user, array[p_id])));
  end if;

  v_subtree := internal.subtree_ids(v_user, p_id);
  with changed as (
    update app.nodes set archived_at = v_now, version = version + 1
     where user_id = v_user and id = any (v_subtree) and archived_at is null
    returning id
  ) select coalesce(array_agg(id), '{}') into v_nodes from changed;
  with changed as (
    update app.bits set archived_at = v_now, version = version + 1
     where user_id = v_user and parent_id = any (v_subtree) and archived_at is null
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

-- archive_bit(p_id). Hook 10: the Bit gets archived_at (version + 1) and its parent Node mtime. An
-- Inbox Scratch Bit is invalid_target: it is archived by the Archive Scratch command.
create function public.archive_bit(p_id uuid)
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
  if v_bit.archived_at is not null then
    return internal.envelope('applied', jsonb_build_object('id', p_id),
                             internal.changes('[]', internal.bit_rows(v_user, array[p_id])));
  end if;

  update app.bits set archived_at = v_now, version = version + 1 where id = p_id and user_id = v_user;
  update app.nodes set mtime = v_now where id = v_parent.id and user_id = v_user;
  return internal.envelope('applied', jsonb_build_object('id', p_id),
                           internal.changes(internal.node_rows(v_user, array[v_parent.id]),
                                            internal.bit_rows(v_user, array[p_id])));
end
$$;

-- unarchive_node(p_id, p_reserved_cells). Hook 11: see internal.restore_tree with p_deleted =
-- false. A Node that is not archived is applied with no write.
create function public.unarchive_node(p_id uuid, p_reserved_cells jsonb default '[]')
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

  perform internal.lock_restore(v_user, p_id, false);
  select * into v_node from app.nodes where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  if v_node.archived_at is null then
    return internal.envelope('applied', jsonb_build_object('id', p_id),
                             internal.changes(internal.node_rows(v_user, array[p_id])));
  end if;

  v_out := internal.restore_tree(v_user, p_id, false, p_reserved_cells, v_now);
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

-- unarchive_bit(p_id, p_reserved_cells). Hook 11: an archived parent Node comes back first (with
-- its archived ancestors and its window), then the Bit if it is still archived; an Inbox Scratch
-- Bit keeps its (0,0) sentinel.
create function public.unarchive_bit(p_id uuid, p_reserved_cells jsonb default '[]')
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

  for v_attempt in 1 .. 3 loop
    select parent_id into v_parent from app.bits where id = p_id and user_id = v_user;
    if not found then
      return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
    end if;
    perform internal.lock_restore(v_user, v_parent, false);
    select * into v_bit from app.bits where id = p_id and user_id = v_user;
    if not found then
      return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
    end if;
    exit when v_bit.parent_id = v_parent;
    if v_attempt = 3 then
      raise exception 'could not settle the lock set of Bit %', p_id using errcode = '40001';
    end if;
  end loop;
  if v_bit.archived_at is null then
    return internal.envelope('applied', jsonb_build_object('id', p_id),
                             internal.changes('[]', internal.bit_rows(v_user, array[p_id])));
  end if;

  v_out := internal.restore_tree(v_user, v_parent, false, p_reserved_cells, v_now, p_id);
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

alter function public.archive_node(uuid) owner to griddo_writer;
alter function public.archive_bit(uuid) owner to griddo_writer;
alter function public.unarchive_node(uuid, jsonb) owner to griddo_writer;
alter function public.unarchive_bit(uuid, jsonb) owner to griddo_writer;
revoke all on function public.archive_node(uuid) from public, anon, service_role;
revoke all on function public.archive_bit(uuid) from public, anon, service_role;
revoke all on function public.unarchive_node(uuid, jsonb) from public, anon, service_role;
revoke all on function public.unarchive_bit(uuid, jsonb) from public, anon, service_role;
grant execute on function public.archive_node(uuid) to authenticated;
grant execute on function public.archive_bit(uuid) to authenticated;
grant execute on function public.unarchive_node(uuid, jsonb) to authenticated;
grant execute on function public.unarchive_bit(uuid, jsonb) to authenticated;
revoke create on schema public from griddo_writer;
