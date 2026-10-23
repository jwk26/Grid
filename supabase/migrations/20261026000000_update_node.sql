-- Task 217: public.update_node() (SCHEMA Database Functions, Hooks 1, 8 and 12, and the Node
-- structure rules of Hook 8). Last write wins: no expected version (S15). Hook 2 for Nodes is
-- scenario 2 only, so there is no parent-deadline check and no parent extension here.
--
-- p_changes is a JSON object of snake_case columns: an absent key is left alone, a null value
-- sets the column to null. Allowed keys: title, color, icon, deadline, deadline_all_day,
-- parent_id, x, y, hidden_from_grid, past_deadline_dismissed. Any other key (level included)
-- fails the call with 22023 and writes nothing. A value the table refuses (a CHECK) also ends
-- the call with an error (S16).

grant create on schema public to griddo_writer;

create function public.update_node(p_id uuid, p_changes jsonb, p_reserved_cells jsonb default '[]')
  returns jsonb
  language plpgsql volatile security definer set search_path = ''
  as $$
declare
  v_user uuid := internal.uid();
  v_now bigint := internal.now_ms();
  v_allowed constant text[] := array[
    'title', 'color', 'icon', 'deadline', 'deadline_all_day', 'parent_id', 'x', 'y',
    'hidden_from_grid', 'past_deadline_dismissed'
  ];
  v_key text;
  v_old app.nodes;
  v_new app.nodes;
  v_rec app.nodes;
  v_parent app.nodes;
  v_locked_parent uuid;
  v_target uuid;
  v_ids uuid[];
  v_ids_after uuid[];
  v_attempt integer;
  v_position boolean;
  v_touches boolean;
  v_showing boolean;
  v_depth integer;
  v_in_subtree boolean;
  v_level integer;
  v_delta integer;
  v_rows jsonb;
  v_part jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' then
    raise exception 'p_changes must be a JSON object' using errcode = '22023';
  end if;
  for v_key in select jsonb_object_keys(p_changes) loop
    if v_key <> all (v_allowed) then
      raise exception 'update_node does not accept the key %', v_key using errcode = '22023';
    end if;
  end loop;
  if not internal.valid_reserved_cells(p_reserved_cells) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'invalid_input'));
  end if;
  if not exists (select 1 from app.accounts where user_id = v_user) then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'account_missing'));
  end if;

  select * into v_old from app.nodes where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;

  -- The Grid the Node ends up in: the Grid advisory lock first, then the row locks (S30).
  v_target := case when p_changes ? 'parent_id' then (p_changes ->> 'parent_id')::uuid else v_old.parent_id end;
  v_locked_parent := v_target;
  v_position := p_changes ?| array['parent_id', 'x', 'y', 'hidden_from_grid'];
  if v_position then
    perform internal.lock_grid(v_user, v_target);
  end if;

  -- A call without a position key (a field edit) locks only its own row; it never depends on the
  -- Node's place in the tree, so it waits for a concurrent move and then applies on top of it.
  -- Row locks of a position call, in one statement ordered by id: the moved subtree, the target
  -- parent's ancestor chain and the old parent. The set is computed again once the locks are
  -- held; a set that grew meanwhile is locked again.
  if not v_position then
    perform 1 from app.nodes where id = p_id and user_id = v_user for update;
  end if;
  for v_attempt in 1 .. case when v_position then 3 else 0 end loop
    with recursive sub as (
      select id from app.nodes where id = p_id and user_id = v_user
      union all
      select n.id from app.nodes n join sub on n.parent_id = sub.id where n.user_id = v_user
    ), chain as (
      select id, parent_id from app.nodes where id = v_target and user_id = v_user
      union all
      select n.id, n.parent_id from app.nodes n join chain c on n.id = c.parent_id where n.user_id = v_user
    )
    select coalesce(array_agg(id order by id), '{}') into v_ids from (
      select id from sub union select id from chain union select v_old.parent_id where v_old.parent_id is not null
    ) s;
    perform 1 from (
      select n.id from app.nodes n where n.user_id = v_user and n.id = any (v_ids) order by n.id for update
    ) locked;
    with recursive sub as (
      select id from app.nodes where id = p_id and user_id = v_user
      union all
      select n.id from app.nodes n join sub on n.parent_id = sub.id where n.user_id = v_user
    ), chain as (
      select id, parent_id from app.nodes where id = v_target and user_id = v_user
      union all
      select n.id, n.parent_id from app.nodes n join chain c on n.id = c.parent_id where n.user_id = v_user
    )
    select coalesce(array_agg(id order by id), '{}') into v_ids_after from (
      select id from sub union select id from chain union select v_old.parent_id where v_old.parent_id is not null
    ) s;
    exit when v_ids_after <@ v_ids;
    if v_attempt = 3 then
      raise exception 'update_node could not settle its lock set' using errcode = '40001';
    end if;
  end loop;

  -- Everything below reads the locked rows.
  select * into v_old from app.nodes where id = p_id and user_id = v_user;
  if not found then
    return internal.envelope('rejected', null, '{}', jsonb_build_object('code', 'not_found'));
  end if;
  if v_position and not (p_changes ? 'parent_id') and v_old.parent_id is distinct from v_locked_parent then
    raise exception 'update_node: the Node moved while the call waited' using errcode = '40001';
  end if;

  v_rec := jsonb_populate_record(null::app.nodes, p_changes);
  v_new := v_old;
  if p_changes ? 'title' then v_new.title := v_rec.title; end if;
  if p_changes ? 'color' then v_new.color := v_rec.color; end if;
  if p_changes ? 'icon' then v_new.icon := v_rec.icon; end if;
  if p_changes ? 'deadline' then v_new.deadline := v_rec.deadline; end if;
  if p_changes ? 'deadline_all_day' then v_new.deadline_all_day := v_rec.deadline_all_day; end if;
  if p_changes ? 'parent_id' then v_new.parent_id := v_rec.parent_id; end if;
  if p_changes ? 'x' then v_new.x := v_rec.x; end if;
  if p_changes ? 'y' then v_new.y := v_rec.y; end if;
  if p_changes ? 'hidden_from_grid' then v_new.hidden_from_grid := v_rec.hidden_from_grid; end if;
  if p_changes ? 'past_deadline_dismissed' then v_new.past_deadline_dismissed := v_rec.past_deadline_dismissed; end if;

  -- Showing a hidden system Node ignores x and y and picks the first free L0 cell.
  v_showing := v_old.system_role is not null and v_old.hidden_from_grid
               and p_changes ? 'hidden_from_grid' and v_new.hidden_from_grid is false;
  if v_showing then
    v_new.x := v_old.x;
    v_new.y := v_old.y;
  end if;

  if v_new.title is not distinct from v_old.title and v_new.color is not distinct from v_old.color
     and v_new.icon is not distinct from v_old.icon and v_new.deadline is not distinct from v_old.deadline
     and v_new.deadline_all_day is not distinct from v_old.deadline_all_day
     and v_new.parent_id is not distinct from v_old.parent_id
     and v_new.x is not distinct from v_old.x and v_new.y is not distinct from v_old.y
     and v_new.hidden_from_grid is not distinct from v_old.hidden_from_grid
     and v_new.past_deadline_dismissed is not distinct from v_old.past_deadline_dismissed then
    return internal.envelope('applied');
  end if;

  v_rows := jsonb_build_array(to_jsonb(v_old));

  if v_new.hidden_from_grid and v_old.system_role is null then
    return internal.envelope('rejected', null, jsonb_build_object('nodes', jsonb_build_object('upserted', v_rows, 'deleted', '[]'::jsonb)),
                             jsonb_build_object('code', 'invalid_target'));
  end if;

  v_level := v_old.level;
  if v_new.parent_id is distinct from v_old.parent_id then
    if v_new.parent_id is not null then
      select * into v_parent from app.nodes where id = v_new.parent_id and user_id = v_user;
      if not found then
        return internal.envelope('rejected', null, jsonb_build_object('nodes', jsonb_build_object('upserted', v_rows, 'deleted', '[]'::jsonb)),
                                 jsonb_build_object('code', 'not_found'));
      end if;
      if v_parent.id <> v_old.id then
        v_rows := v_rows || jsonb_build_array(to_jsonb(v_parent));
      end if;
    end if;
    with recursive sub(id, depth) as (
      select id, 0 from app.nodes where id = p_id and user_id = v_user
      union all
      select n.id, sub.depth + 1 from app.nodes n join sub on n.parent_id = sub.id where n.user_id = v_user
    )
    select max(depth), coalesce(bool_or(id = v_new.parent_id), false) into v_depth, v_in_subtree from sub;
    v_level := case when v_new.parent_id is null then 0 else v_parent.level + 1 end;
    if v_old.system_role is not null or v_in_subtree or v_parent.system_role is not null or v_level + v_depth > 2 then
      return internal.envelope('rejected', null, jsonb_build_object('nodes', jsonb_build_object('upserted', v_rows, 'deleted', '[]'::jsonb)),
                               jsonb_build_object('code', 'invalid_target'));
    end if;
    if v_parent.id is not null and (v_parent.deleted_at is not null or v_parent.archived_at is not null) then
      return internal.envelope('rejected', null, jsonb_build_object('nodes', jsonb_build_object('upserted', v_rows, 'deleted', '[]'::jsonb)),
                               jsonb_build_object('code', 'parent_inactive'));
    end if;
  end if;

  if v_showing then
    select f.x, f.y into v_new.x, v_new.y from internal.pick_free_cell(v_user, null, p_reserved_cells) f;
    if not found then
      return internal.envelope('rejected', null, jsonb_build_object('nodes', jsonb_build_object('upserted', v_rows, 'deleted', '[]'::jsonb)),
                               jsonb_build_object('code', 'grid_full'));
    end if;
  elsif (v_new.parent_id is distinct from v_old.parent_id or v_new.x <> v_old.x or v_new.y <> v_old.y)
        and not (v_new.parent_id is null and v_new.hidden_from_grid) then
    if exists (
         select 1 from app.nodes n
          where n.user_id = v_user and n.id <> v_old.id and n.parent_id is not distinct from v_new.parent_id
            and n.x = v_new.x and n.y = v_new.y and n.deleted_at is null and n.archived_at is null
            and (v_new.parent_id is not null or not n.hidden_from_grid)
       ) or (v_new.parent_id is not null and exists (
         select 1 from app.bits b
          where b.user_id = v_user and b.parent_id = v_new.parent_id
            and b.x = v_new.x and b.y = v_new.y and b.deleted_at is null and b.archived_at is null
       )) then
      return internal.envelope('rejected', null, jsonb_build_object('nodes', jsonb_build_object('upserted', v_rows, 'deleted', '[]'::jsonb)),
                               jsonb_build_object('code', 'cell_taken'));
    end if;
  end if;

  -- Hook 1: mtime unless only the position or parent changed. Hook 12: one version per call.
  v_touches := v_new.title is distinct from v_old.title or v_new.color is distinct from v_old.color
               or v_new.icon is distinct from v_old.icon or v_new.deadline is distinct from v_old.deadline
               or v_new.deadline_all_day is distinct from v_old.deadline_all_day
               or v_new.hidden_from_grid is distinct from v_old.hidden_from_grid
               or v_new.past_deadline_dismissed is distinct from v_old.past_deadline_dismissed;

  update app.nodes
     set title = v_new.title, color = v_new.color, icon = v_new.icon, deadline = v_new.deadline,
         deadline_all_day = v_new.deadline_all_day, parent_id = v_new.parent_id, level = v_level,
         x = v_new.x, y = v_new.y, hidden_from_grid = v_new.hidden_from_grid,
         past_deadline_dismissed = v_new.past_deadline_dismissed,
         mtime = case when v_touches then v_now else mtime end,
         version = version + 1
   where id = v_old.id and user_id = v_user
  returning to_jsonb(app.nodes.*) into v_part;
  v_rows := jsonb_build_array(v_part);

  if v_new.parent_id is distinct from v_old.parent_id then
    v_delta := v_level - v_old.level;
    if v_delta <> 0 then
      with recursive sub as (
        select id from app.nodes where parent_id = p_id and user_id = v_user
        union all
        select n.id from app.nodes n join sub on n.parent_id = sub.id where n.user_id = v_user
      ), upd as (
        update app.nodes n set level = n.level + v_delta, version = n.version + 1
          from sub where n.id = sub.id and n.user_id = v_user
        returning to_jsonb(n.*) as j
      )
      select coalesce(jsonb_agg(j), '[]'::jsonb) into v_part from upd;
      v_rows := v_rows || v_part;
    end if;
    -- The old and the new parent are touched (Hook 1); their version stays.
    with upd as (
      update app.nodes n set mtime = v_now
       where n.user_id = v_user and n.id in (v_old.parent_id, v_new.parent_id)
      returning to_jsonb(n.*) as j
    )
    select coalesce(jsonb_agg(j), '[]'::jsonb) into v_part from upd;
    v_rows := v_rows || v_part;
  end if;

  return internal.envelope(
    'applied', null,
    jsonb_build_object('nodes', jsonb_build_object('upserted', v_rows, 'deleted', '[]'::jsonb))
  );
end
$$;

alter function public.update_node(uuid, jsonb, jsonb) owner to griddo_writer;
revoke all on function public.update_node(uuid, jsonb, jsonb) from public, anon, service_role;
grant execute on function public.update_node(uuid, jsonb, jsonb) to authenticated;
revoke create on schema public from griddo_writer;
