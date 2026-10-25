-- Task 219, Stage 2: public.create_chunk(), update_chunk(), delete_chunk() and reorder_chunks()
-- (SCHEMA Hooks 1, 2, 3 and 12; Hook 3 as amended on 2026-10-25). Values arrive as a JSON object
-- of snake_case columns with the same input rules as the Node and Bit functions (22023 for an
-- unknown or missing required key, an error for a CHECK).
--
-- Lock order: the Bit's parent Node, then the Bit (`for update`, before the sibling Chunks are
-- read), then the Chunk. Every function that touches a Chunk's Bit takes the Bit lock, so two
-- concurrent checks of the last two incomplete Chunks end with the Bit complete.
--
-- Chunk deadline rejections name the table whose deadline is the bound: `bits` for the Bit's
-- deadline, `nodes` when the Bit's own extension would not fit its parent Node.

grant create on schema internal to griddo_writer;
grant create on schema public to griddo_writer;

-- Locks the parent Node of a Bit and then the Bit, both `for update`, and returns the Bit (null
-- when it does not exist for the caller). The Node is read again once the locks are held; a Bit
-- that moved meanwhile locks its new Node too.
create function internal.lock_bit_and_node(p_user uuid, p_bit uuid) returns app.bits
  language plpgsql volatile security invoker set search_path = ''
  as $$
declare
  v_node uuid;
  v_bit app.bits;
  v_attempt integer;
begin
  for v_attempt in 1 .. 3 loop
    select parent_id into v_node from app.bits where id = p_bit and user_id = p_user;
    if not found then
      return null;
    end if;
    perform 1 from app.nodes where id = v_node and user_id = p_user for update;
    select * into v_bit from app.bits where id = p_bit and user_id = p_user for update;
    if not found then
      return null;
    end if;
    if v_bit.parent_id = v_node then
      return v_bit;
    end if;
  end loop;
  raise exception 'could not settle the lock set of Bit %', p_bit using errcode = '40001';
end
$$;

-- What a Chunk write does to its Bit and the Bit's parent Node (Hooks 1, 3 and 12), after the
-- Chunk row is written. The Bit's mtime and the Node's mtime are always touched. p_mode says how
-- the Bit's status is recomputed (SCHEMA Hook 3 as amended on 2026-10-25), null for no recompute
-- (a title, description or time edit): every Chunk complete (at least one) -> complete; otherwise
--   'create'  -> active (new work);
--   'check'   -> a complete Bit stays complete, any other is active;
--   'delete'  -> as 'check';
--   'uncheck' -> sticky: a complete Bit stays complete when two or more Chunks are incomplete,
--                and returns to active with one.
-- p_extend sets the Bit's deadline. The Bit gets version + 1 once when its status or deadline
-- changes; the Node keeps its version. Returns {bit, node} as rows.
create function internal.settle_bit(
  p_user uuid, p_bit app.bits, p_now bigint, p_mode text,
  p_extend boolean default false, p_deadline bigint default null, p_all_day boolean default false
) returns jsonb
  language plpgsql volatile security invoker set search_path = ''
  as $$
declare
  v_status text := p_bit.status;
  v_total bigint;
  v_complete bigint;
  v_bit jsonb;
  v_node jsonb;
begin
  if p_mode is not null and p_mode <> all (array['create', 'check', 'uncheck', 'delete']) then
    raise exception 'internal.settle_bit: unknown mode %', p_mode using errcode = '22023';
  end if;
  if p_mode is not null then
    select count(*), count(*) filter (where status = 'complete') into v_total, v_complete
      from app.chunks where user_id = p_user and parent_id = p_bit.id;
    if v_total > 0 and v_total = v_complete then
      v_status := 'complete';
    elsif p_mode = 'uncheck' and p_bit.status = 'complete' then
      v_status := case when v_total - v_complete <= 1 then 'active' else 'complete' end;
    elsif p_mode in ('check', 'delete') and p_bit.status = 'complete' then
      v_status := 'complete';
    else
      v_status := 'active';
    end if;
  end if;
  update app.bits
     set status = v_status, mtime = p_now,
         deadline = case when p_extend then p_deadline else deadline end,
         deadline_all_day = case when p_extend then p_all_day else deadline_all_day end,
         version = case when p_extend or status is distinct from v_status then version + 1 else version end
   where id = p_bit.id and user_id = p_user
  returning to_jsonb(app.bits.*) into v_bit;
  update app.nodes set mtime = p_now where id = p_bit.parent_id and user_id = p_user
  returning to_jsonb(app.nodes.*) into v_node;
  return jsonb_build_object('bit', v_bit, 'node', v_node);
end
$$;

alter function internal.lock_bit_and_node(uuid, uuid) owner to griddo_writer;
alter function internal.settle_bit(uuid, app.bits, bigint, text, boolean, bigint, boolean) owner to griddo_writer;
revoke all on function internal.lock_bit_and_node(uuid, uuid) from public;
revoke all on function internal.settle_bit(uuid, app.bits, bigint, text, boolean, bigint, boolean) from public;
grant execute on function internal.lock_bit_and_node(uuid, uuid) to griddo_writer;
grant execute on function internal.settle_bit(uuid, app.bits, bigint, text, boolean, bigint, boolean) to griddo_writer;

-- ---------------------------------------------------------------------------------------------
-- create_chunk(p_id, p_values). Required: title, parent_id, order. Optional: description, time,
-- time_all_day. The status is incomplete. The Bit and its Node must be active (parent_inactive).
create function public.create_chunk(p_id uuid, p_values jsonb)
  returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_allowed constant text[] := array['title', 'description', 'time', 'time_all_day', 'parent_id', 'order'];
  v_required constant text[] := array['title', 'parent_id', 'order'];
  v_key text;
  v_rec app.chunks;
  v_bit app.bits;
  v_node app.nodes;
  v_limit integer;
  v_new jsonb;
  v_settled jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_id is null then
    raise exception 'create_chunk needs an id' using errcode = '22023';
  end if;
  if p_values is null or jsonb_typeof(p_values) <> 'object' then
    raise exception 'p_values must be a JSON object' using errcode = '22023';
  end if;
  for v_key in select jsonb_object_keys(p_values) loop
    if v_key <> all (v_allowed) then
      raise exception 'create_chunk does not accept the key %', v_key using errcode = '22023';
    end if;
  end loop;
  foreach v_key in array v_required loop
    if not (p_values ? v_key) then
      raise exception 'create_chunk needs the key %', v_key using errcode = '22023';
    end if;
  end loop;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;

  v_rec := jsonb_populate_record(null::app.chunks, p_values);
  if v_rec.parent_id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'invalid_target'));
  end if;
  v_bit := internal.lock_bit_and_node(v_user, v_rec.parent_id);
  if v_bit.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  select * into v_node from app.nodes where id = v_bit.parent_id and user_id = v_user;
  if v_bit.deleted_at is not null or v_bit.archived_at is not null
     or v_node.deleted_at is not null or v_node.archived_at is not null then
    return internal.envelope('rejected', null,
                             internal.changes(jsonb_build_array(to_jsonb(v_node)), jsonb_build_array(to_jsonb(v_bit))),
                             jsonb_build_object('code', 'parent_inactive'));
  end if;

  v_limit := internal.limit_reached(v_user, 'chunks');
  if v_limit is not null then
    return internal.envelope('rejected', null,
                             internal.changes(jsonb_build_array(to_jsonb(v_node)), jsonb_build_array(to_jsonb(v_bit))),
                             jsonb_build_object('code', 'account_limit', 'table', 'chunks', 'limit', v_limit));
  end if;

  if v_rec.time is not null and v_bit.deadline is not null
     and internal.deadline_after(v_rec.time, coalesce(v_rec.time_all_day, false), v_bit.deadline, v_bit.deadline_all_day) then
    return internal.envelope('rejected', null,
                             internal.changes(jsonb_build_array(to_jsonb(v_node)), jsonb_build_array(to_jsonb(v_bit))),
                             jsonb_build_object('code', 'deadline_exceeds_parent', 'table', 'bits'));
  end if;

  insert into app.chunks (id, user_id, title, description, time, time_all_day, status, "order", parent_id)
  values (p_id, v_user, v_rec.title, coalesce(v_rec.description, ''), v_rec.time,
          coalesce(v_rec.time_all_day, false), 'incomplete', v_rec."order", v_rec.parent_id)
  returning to_jsonb(app.chunks.*) into v_new;

  v_settled := internal.settle_bit(v_user, v_bit, v_now, 'create');
  return internal.envelope('applied', jsonb_build_object('id', p_id),
                           internal.changes(jsonb_build_array(v_settled -> 'node'), jsonb_build_array(v_settled -> 'bit'),
                                            jsonb_build_array(v_new)));
end
$$;

-- ---------------------------------------------------------------------------------------------
-- update_chunk(p_id, p_changes, p_extend_parent). Allowed keys: title, description, time,
-- time_all_day, status. The order changes only through reorder_chunks(); the parent never changes.
--
-- Hook 2: when the call changes time or time_all_day and the new time is after the Bit's
-- deadline, the call is rejected with deadline_exceeds_parent, unless p_extend_parent is true:
-- then the Bit's deadline and deadline_all_day become the Chunk's in the same transaction (the
-- Calendar answer). That extension must itself fit the Bit's parent Node, otherwise the call is
-- rejected the same way and writes nothing.
-- Hook 3: only a status change recomputes the Bit's status (sticky rule on an uncheck); a title,
-- description or time edit touches mtime only (Hook 1: the Bit and its Node).
create function public.update_chunk(p_id uuid, p_changes jsonb, p_extend_parent boolean default false)
  returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_allowed constant text[] := array['title', 'description', 'time', 'time_all_day', 'status'];
  v_key text;
  v_extend boolean := coalesce(p_extend_parent, false);
  v_old app.chunks;
  v_new app.chunks;
  v_rec app.chunks;
  v_bit app.bits;
  v_node app.nodes;
  v_extended boolean := false;
  v_status_changed boolean;
  v_chunk jsonb;
  v_rows jsonb;
  v_settled jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' then
    raise exception 'p_changes must be a JSON object' using errcode = '22023';
  end if;
  for v_key in select jsonb_object_keys(p_changes) loop
    if v_key <> all (v_allowed) then
      raise exception 'update_chunk does not accept the key %', v_key using errcode = '22023';
    end if;
  end loop;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;

  select * into v_old from app.chunks where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  v_bit := internal.lock_bit_and_node(v_user, v_old.parent_id);
  if v_bit.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  select * into v_old from app.chunks where id = p_id and user_id = v_user for update;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;

  v_rec := jsonb_populate_record(null::app.chunks, p_changes);
  v_new := v_old;
  if p_changes ? 'title' then v_new.title := v_rec.title; end if;
  if p_changes ? 'description' then v_new.description := v_rec.description; end if;
  if p_changes ? 'time' then v_new.time := v_rec.time; end if;
  if p_changes ? 'time_all_day' then v_new.time_all_day := v_rec.time_all_day; end if;
  if p_changes ? 'status' then v_new.status := v_rec.status; end if;
  if v_new is not distinct from v_old then
    return internal.envelope('applied');
  end if;

  v_chunk := to_jsonb(v_old);
  select * into v_node from app.nodes where id = v_bit.parent_id and user_id = v_user;
  v_rows := jsonb_build_array(to_jsonb(v_node));

  if (v_new.time is distinct from v_old.time or v_new.time_all_day is distinct from v_old.time_all_day)
     and v_new.time is not null and v_bit.deadline is not null
     and internal.deadline_after(v_new.time, v_new.time_all_day, v_bit.deadline, v_bit.deadline_all_day) then
    if not v_extend then
      return internal.envelope('rejected', null,
                               internal.changes(v_rows, jsonb_build_array(to_jsonb(v_bit)), jsonb_build_array(v_chunk)),
                               jsonb_build_object('code', 'deadline_exceeds_parent', 'table', 'bits'));
    end if;
    if v_node.deadline is not null
       and internal.deadline_after(v_new.time, v_new.time_all_day, v_node.deadline, v_node.deadline_all_day) then
      return internal.envelope('rejected', null,
                               internal.changes(v_rows, jsonb_build_array(to_jsonb(v_bit)), jsonb_build_array(v_chunk)),
                               jsonb_build_object('code', 'deadline_exceeds_parent', 'table', 'nodes'));
    end if;
    v_extended := true;
  end if;

  v_status_changed := v_new.status is distinct from v_old.status;
  update app.chunks set title = v_new.title, description = v_new.description, time = v_new.time,
         time_all_day = v_new.time_all_day, status = v_new.status
   where id = p_id and user_id = v_user
  returning to_jsonb(app.chunks.*) into v_chunk;

  v_settled := internal.settle_bit(v_user, v_bit, v_now,
                                   case when not v_status_changed then null
                                        when v_new.status = 'complete' then 'check' else 'uncheck' end,
                                   v_extended, v_new.time, v_new.time_all_day);
  return internal.envelope('applied', null,
                           internal.changes(jsonb_build_array(v_settled -> 'node'), jsonb_build_array(v_settled -> 'bit'),
                                            jsonb_build_array(v_chunk)));
end
$$;

-- ---------------------------------------------------------------------------------------------
-- delete_chunk(p_id). Recomputes the Bit's status (Hook 3) and touches the Bit and its Node.
create function public.delete_chunk(p_id uuid)
  returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_old app.chunks;
  v_bit app.bits;
  v_settled jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  select * into v_old from app.chunks where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  v_bit := internal.lock_bit_and_node(v_user, v_old.parent_id);
  if v_bit.id is null then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  delete from app.chunks where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;

  v_settled := internal.settle_bit(v_user, v_bit, v_now, 'delete');
  return internal.envelope(
    'applied', null,
    internal.changes(jsonb_build_array(v_settled -> 'node'), jsonb_build_array(v_settled -> 'bit'))
      || jsonb_build_object('chunks', jsonb_build_object('upserted', '[]'::jsonb, 'deleted', jsonb_build_array(p_id)))
  );
end
$$;

-- ---------------------------------------------------------------------------------------------
-- reorder_chunks(p_bit_id, p_chunk_ids): the Bit's Chunks in their new order, each id once and no
-- other. Writes only `order` (0, 1, 2, ...) on the Chunks whose order changes: no status, no
-- mtime, no version (Hook 1, Hook 3). A list that is not exactly the Bit's Chunks is rejected
-- with invalid_input, carrying the Bit's current Chunks (upserted) and the listed ids that are
-- not among them (deleted).
create function public.reorder_chunks(p_bit_id uuid, p_chunk_ids uuid[])
  returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
declare
  v_user uuid := internal.uid();
  v_ids uuid[];
  v_rows jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;
  perform 1 from app.bits where id = p_bit_id and user_id = v_user for update;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  select coalesce(array_agg(id order by id), '{}') into v_ids
    from app.chunks where user_id = v_user and parent_id = p_bit_id;
  if p_chunk_ids is null or array_position(p_chunk_ids, null) is not null
     or (select coalesce(array_agg(i order by i), '{}') from unnest(p_chunk_ids) i) is distinct from v_ids then
    -- The current Chunks of the Bit, and the listed ids that are not among them as deleted, so a
    -- stale tab converges.
    select coalesce(jsonb_agg(to_jsonb(c.*) order by c."order", c.id), '[]'::jsonb) into v_rows
      from app.chunks c where c.user_id = v_user and c.parent_id = p_bit_id;
    return internal.envelope(
      'rejected', null,
      jsonb_build_object('chunks', jsonb_build_object(
        'upserted', v_rows,
        'deleted', coalesce((
          select jsonb_agg(distinct i) from unnest(coalesce(p_chunk_ids, '{}')) i
           where i is not null and i <> all (v_ids)
        ), '[]'::jsonb)
      )),
      jsonb_build_object('code', 'invalid_input')
    );
  end if;

  with wanted as (
    select id, (ord - 1)::integer as new_order from unnest(p_chunk_ids) with ordinality as t(id, ord)
  ), upd as (
    update app.chunks c set "order" = w.new_order
      from wanted w where c.id = w.id and c.user_id = v_user and c."order" <> w.new_order
    returning to_jsonb(c.*) as j
  )
  select coalesce(jsonb_agg(j), '[]'::jsonb) into v_rows from upd;
  return internal.envelope('applied', null, internal.changes('[]', '[]', v_rows));
end
$$;

alter function public.create_chunk(uuid, jsonb) owner to griddo_writer;
alter function public.update_chunk(uuid, jsonb, boolean) owner to griddo_writer;
alter function public.delete_chunk(uuid) owner to griddo_writer;
alter function public.reorder_chunks(uuid, uuid[]) owner to griddo_writer;
revoke all on function public.create_chunk(uuid, jsonb) from public, anon, service_role;
revoke all on function public.update_chunk(uuid, jsonb, boolean) from public, anon, service_role;
revoke all on function public.delete_chunk(uuid) from public, anon, service_role;
revoke all on function public.reorder_chunks(uuid, uuid[]) from public, anon, service_role;
grant execute on function public.create_chunk(uuid, jsonb) to authenticated;
grant execute on function public.update_chunk(uuid, jsonb, boolean) to authenticated;
grant execute on function public.delete_chunk(uuid) to authenticated;
grant execute on function public.reorder_chunks(uuid, uuid[]) to authenticated;
revoke create on schema internal from griddo_writer;
revoke create on schema public from griddo_writer;
