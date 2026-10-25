-- Task 220, Stage 4: public.promote_bit_to_node() (SCHEMA Hooks 9, 1, 8 and 12).
--
-- A Bit becomes a Node in its place: the new Node takes the Bit's title, icon, deadline and cell,
-- gets the default colour and level = parent level + 1; each Chunk, in `order`, becomes a Bit
-- inside the new Node (title, description, time as deadline, status carried) placed with
-- internal.pick_free_cell: the first free cell in row-major order outside the reserved cells.
-- The Bit and its Chunks are deleted in the same call, and the parent Node gets mtime. The server
-- generates every new id; the new Node's id is in `result`.
--
-- Locks: the Grid of the Bit's parent (the new Node takes its cell), the parent Node, the Bit,
-- then the Chunks `for update` in `order`.

grant create on schema internal to griddo_writer;
grant create on schema public to griddo_writer;

-- The limit when the table would hold more than the limit after p_delta more rows (a negative
-- delta frees rows), otherwise null. Trashed and archived rows count.
create function internal.limit_reached(p_user uuid, p_table text, p_delta integer) returns integer
  language plpgsql stable security invoker set search_path = ''
  as $$
declare
  v_limit integer := internal.account_limit(p_table);
  v_count bigint;
begin
  if v_limit is null then
    raise exception 'internal.limit_reached: unknown table %', p_table using errcode = '22023';
  end if;
  execute format('select count(*) from app.%I where user_id = $1', p_table) into v_count using p_user;
  return case when v_count + p_delta > v_limit then v_limit end;
end
$$;

alter function internal.limit_reached(uuid, text, integer) owner to griddo_writer;
revoke all on function internal.limit_reached(uuid, text, integer) from public;
grant execute on function internal.limit_reached(uuid, text, integer) to griddo_writer;

create function public.promote_bit_to_node(p_id uuid, p_reserved_cells jsonb default '[]')
  returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_bit app.bits;
  v_parent app.nodes;
  v_parent_id uuid;
  v_attempt integer;
  v_chunks integer;
  v_limit integer;
  v_node_id uuid := gen_random_uuid();
  v_chunk record;
  v_cx integer;
  v_cy integer;
  v_new_node jsonb;
  v_new_bits jsonb := '[]';
  v_chunk_ids uuid[];
  v_par jsonb;
  v_changes jsonb;
  v_b jsonb;
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

  -- The Grid lock first, then the parent Node and the Bit; a Bit that moved meanwhile starts over.
  for v_attempt in 1 .. 3 loop
    select parent_id into v_parent_id from app.bits where id = p_id and user_id = v_user;
    if not found then
      return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
    end if;
    perform internal.lock_grid(v_user, v_parent_id);
    v_bit := internal.lock_bit_and_node(v_user, p_id);
    if v_bit.id is null then
      return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
    end if;
    exit when v_bit.parent_id = v_parent_id;
    if v_attempt = 3 then
      raise exception 'could not settle the lock set of Bit %', p_id using errcode = '40001';
    end if;
  end loop;
  select * into v_parent from app.nodes where id = v_bit.parent_id and user_id = v_user;
  v_b := internal.changes('[]', internal.bit_rows(v_user, array[p_id]));

  -- A Scratch Bit (parent: the Inbox) is never promoted, whatever it holds.
  if v_parent.system_role = 'inbox' or v_parent.system_role = 'archive_view'
     or v_bit.deleted_at is not null or v_bit.archived_at is not null
     or v_parent.level + 1 > 2 then
    return internal.envelope('rejected', null, v_b, jsonb_build_object('code', 'invalid_target'));
  end if;
  if v_parent.deleted_at is not null or v_parent.archived_at is not null then
    return internal.envelope('rejected', null, v_b, jsonb_build_object('code', 'parent_inactive'));
  end if;

  select count(*) into v_chunks from app.chunks where user_id = v_user and parent_id = p_id;
  v_limit := internal.limit_reached(v_user, 'nodes', 1);
  if v_limit is not null then
    return internal.envelope('rejected', null, v_b,
                             jsonb_build_object('code', 'account_limit', 'table', 'nodes', 'limit', v_limit));
  end if;
  v_limit := internal.limit_reached(v_user, 'bits', v_chunks - 1);
  if v_limit is not null then
    return internal.envelope('rejected', null, v_b,
                             jsonb_build_object('code', 'account_limit', 'table', 'bits', 'limit', v_limit));
  end if;

  begin
    insert into app.nodes (id, user_id, title, color, icon, deadline, deadline_all_day, mtime, created_at, version,
                           parent_id, level, x, y, past_deadline_dismissed)
    values (v_node_id, v_user, v_bit.title, 'hsl(221, 83%, 53%)', v_bit.icon, v_bit.deadline, v_bit.deadline_all_day,
            v_now, v_now, 1, v_bit.parent_id, v_parent.level + 1, v_bit.x, v_bit.y, false)
    returning to_jsonb(app.nodes.*) into v_new_node;

    for v_chunk in
      select c.* from app.chunks c where c.user_id = v_user and c.parent_id = p_id order by c."order", c.id for update
    loop
      select f.x, f.y into v_cx, v_cy from internal.pick_free_cell(v_user, v_node_id, p_reserved_cells) f;
      if not found then
        raise exception 'grid_full' using errcode = 'GR001';
      end if;
      insert into app.bits (id, user_id, title, description, icon, deadline, deadline_all_day, priority, status,
                            mtime, created_at, version, parent_id, x, y, past_deadline_dismissed)
      values (gen_random_uuid(), v_user, v_chunk.title, v_chunk.description, v_bit.icon, v_chunk.time,
              v_chunk.time_all_day, null, case when v_chunk.status = 'complete' then 'complete' else 'active' end,
              v_now, v_now, 1, v_node_id, v_cx, v_cy, false);
      v_chunk_ids := coalesce(v_chunk_ids, '{}') || v_chunk.id;
    end loop;
  exception when sqlstate 'GR001' then
    return internal.envelope('rejected', null, v_b, jsonb_build_object('code', 'grid_full'));
  end;

  select coalesce(jsonb_agg(to_jsonb(b) order by b.id), '[]'::jsonb) into v_new_bits
    from app.bits b where b.user_id = v_user and b.parent_id = v_node_id;
  delete from app.chunks where user_id = v_user and parent_id = p_id;
  delete from app.bits where id = p_id and user_id = v_user;
  update app.nodes set mtime = v_now where id = v_parent.id and user_id = v_user
  returning to_jsonb(app.nodes.*) into v_par;

  v_changes := internal.changes(jsonb_build_array(v_new_node, v_par), v_new_bits);
  v_changes := jsonb_set(v_changes, '{bits}',
    coalesce(v_changes -> 'bits', jsonb_build_object('upserted', '[]'::jsonb))
      || jsonb_build_object('deleted', jsonb_build_array(p_id)));
  if coalesce(array_length(v_chunk_ids, 1), 0) > 0 then
    v_changes := jsonb_set(v_changes, '{chunks}',
      jsonb_build_object('upserted', '[]'::jsonb, 'deleted', to_jsonb(v_chunk_ids)));
  end if;
  return internal.envelope('applied', jsonb_build_object('id', v_node_id), v_changes);
end
$$;

alter function public.promote_bit_to_node(uuid, jsonb) owner to griddo_writer;
revoke all on function public.promote_bit_to_node(uuid, jsonb) from public, anon, service_role;
grant execute on function public.promote_bit_to_node(uuid, jsonb) to authenticated;
revoke create on schema internal from griddo_writer;
revoke create on schema public from griddo_writer;
