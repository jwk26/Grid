-- Task 215: internal helpers. No client role can execute them (S29 (1)); griddo_writer can.
-- They are security invoker, so inside a write function they run under RLS as griddo_writer.

grant create on schema internal to griddo_writer;

-- Transaction time as epoch milliseconds: one value per transaction (Hook 10).
create function internal.now_ms() returns bigint
  language sql stable security invoker set search_path = ''
  as $$ select (extract(epoch from transaction_timestamp()) * 1000)::bigint $$;

-- True when p is an array of at most six {x, y} objects with integer JSON numbers inside
-- the 18x9 grid. Extra keys are ignored and duplicates are allowed.
create function internal.valid_reserved_cells(p jsonb) returns boolean
  language plpgsql immutable security invoker set search_path = ''
  as $$
declare
  cell jsonb;
  coord jsonb;
  key text;
  n numeric;
  upper_ integer;
begin
  if p is null or jsonb_typeof(p) <> 'array' or jsonb_array_length(p) > 6 then
    return false;
  end if;
  for cell in select value from jsonb_array_elements(p) loop
    if jsonb_typeof(cell) <> 'object' then
      return false;
    end if;
    foreach key in array array['x', 'y'] loop
      coord := cell -> key;
      if coord is null or jsonb_typeof(coord) <> 'number' then
        return false;
      end if;
      n := (coord #>> '{}')::numeric;
      upper_ := case key when 'x' then 17 else 8 end;
      if n <> trunc(n) or n < 0 or n > upper_ then
        return false;
      end if;
    end loop;
  end loop;
  return true;
end
$$;

-- One advisory lock per target Grid: the account plus the parent, with L0 as its own key.
create function internal.lock_grid(p_user uuid, p_parent uuid) returns void
  language sql volatile security invoker set search_path = ''
  as $$
    select pg_advisory_xact_lock(
      pg_catalog.hashtextextended('grid:' || p_user::text || ':' || coalesce(p_parent::text, 'L0'), 0)
    )
  $$;

-- Pure search over a Grid of 18x9 cells. p_taken has 162 characters, '1' for a taken cell,
-- index y * 18 + x. Without an original cell it returns the first free cell in row-major
-- order (y outer, x inner). With one it returns the nearest free cell by the same breadth
-- first search as findNearestEmptyCell: the queue order N, E, S, W, NW, NE, SE, SW, which
-- is not a distance sort. No free cell: no row.
create function internal.find_free_cell(p_taken text, p_ox integer default null, p_oy integer default null)
  returns table (x integer, y integer)
  language plpgsql immutable security invoker set search_path = ''
  as $$
declare
  cols constant integer := 18;
  rows_ constant integer := 9;
  dx constant integer[] := array[0, 1, 0, -1, -1, 1, 1, -1];
  dy constant integer[] := array[-1, 0, 1, 0, -1, -1, 1, 1];
  queue integer[];
  head integer := 1;
  visited boolean[] := array_fill(false, array[cols * rows_]);
  cur integer;
  cx integer;
  cy integer;
  nx integer;
  ny integer;
  d integer;
begin
  if length(p_taken) <> cols * rows_ then
    raise exception 'p_taken must have % characters', cols * rows_ using errcode = '22023';
  end if;
  if p_ox is null or p_oy is null then
    for cy in 0 .. rows_ - 1 loop
      for cx in 0 .. cols - 1 loop
        if substr(p_taken, cy * cols + cx + 1, 1) <> '1' then
          x := cx; y := cy;
          return next;
          return;
        end if;
      end loop;
    end loop;
    return;
  end if;
  if p_ox not between 0 and cols - 1 or p_oy not between 0 and rows_ - 1 then
    raise exception 'original cell outside the grid' using errcode = '22023';
  end if;
  queue := array[p_oy * cols + p_ox];
  while head <= coalesce(array_length(queue, 1), 0) loop
    cur := queue[head];
    head := head + 1;
    if visited[cur + 1] then
      continue;
    end if;
    visited[cur + 1] := true;
    cx := cur % cols;
    cy := cur / cols;
    if substr(p_taken, cur + 1, 1) <> '1' then
      x := cx; y := cy;
      return next;
      return;
    end if;
    for d in 1 .. 8 loop
      nx := cx + dx[d];
      ny := cy + dy[d];
      if nx >= 0 and nx < cols and ny >= 0 and ny < rows_ and not visited[ny * cols + nx + 1] then
        queue := queue || (ny * cols + nx);
      end if;
    end loop;
  end loop;
end
$$;

-- The first free cell, or the nearest free one from the item's original cell, in the Grid
-- of p_parent (null is L0). A cell is taken by an active Node or Bit of that Grid (not
-- deleted, not archived; at L0 also not hidden from the Grid) or by a reserved cell.
-- p_reserved must already be valid (internal.valid_reserved_cells). Callers hold the Grid
-- lock (internal.lock_grid).
create function internal.pick_free_cell(
  p_user uuid, p_parent uuid, p_reserved jsonb default '[]',
  p_original_x integer default null, p_original_y integer default null
) returns table (x integer, y integer)
  language plpgsql stable security invoker set search_path = ''
  as $$
declare
  taken text[] := array_fill('0'::text, array[162]);
  occupied record;
  cell jsonb;
begin
  for occupied in
    select n.x, n.y from app.nodes n
     where n.user_id = p_user and n.parent_id is not distinct from p_parent
       and n.deleted_at is null and n.archived_at is null
       and (p_parent is not null or not n.hidden_from_grid)
    union all
    select b.x, b.y from app.bits b
     where b.user_id = p_user and p_parent is not null and b.parent_id = p_parent
       and b.deleted_at is null and b.archived_at is null
  loop
    taken[occupied.y * 18 + occupied.x + 1] := '1';
  end loop;
  for cell in select value from jsonb_array_elements(p_reserved) loop
    taken[((cell ->> 'y')::numeric)::integer * 18 + ((cell ->> 'x')::numeric)::integer + 1] := '1';
  end loop;
  return query select f.x, f.y
    from internal.find_free_cell(array_to_string(taken, ''), p_original_x, p_original_y) f;
end
$$;

-- The result envelope (SCHEMA Result envelope). p_changes is the object of per-table
-- {upserted, deleted} entries; a rejection adds {code, table?, limit?}.
create function internal.envelope(
  p_status text, p_result jsonb default null, p_changes jsonb default '{}', p_rejection jsonb default null
) returns jsonb
  language sql immutable security invoker set search_path = ''
  as $$
    select jsonb_build_object('status', p_status, 'result', p_result, 'changes', coalesce(p_changes, '{}'::jsonb))
      || case when p_rejection is null then '{}'::jsonb else jsonb_build_object('rejection', p_rejection) end
  $$;

alter function internal.now_ms() owner to griddo_writer;
alter function internal.valid_reserved_cells(jsonb) owner to griddo_writer;
alter function internal.lock_grid(uuid, uuid) owner to griddo_writer;
alter function internal.find_free_cell(text, integer, integer) owner to griddo_writer;
alter function internal.pick_free_cell(uuid, uuid, jsonb, integer, integer) owner to griddo_writer;
alter function internal.envelope(text, jsonb, jsonb, jsonb) owner to griddo_writer;

revoke all on function internal.now_ms() from public;
revoke all on function internal.valid_reserved_cells(jsonb) from public;
revoke all on function internal.lock_grid(uuid, uuid) from public;
revoke all on function internal.find_free_cell(text, integer, integer) from public;
revoke all on function internal.pick_free_cell(uuid, uuid, jsonb, integer, integer) from public;
revoke all on function internal.envelope(text, jsonb, jsonb, jsonb) from public;
grant execute on function internal.now_ms() to griddo_writer;
grant execute on function internal.valid_reserved_cells(jsonb) to griddo_writer;
grant execute on function internal.lock_grid(uuid, uuid) to griddo_writer;
grant execute on function internal.find_free_cell(text, integer, integer) to griddo_writer;
grant execute on function internal.pick_free_cell(uuid, uuid, jsonb, integer, integer) to griddo_writer;
grant execute on function internal.envelope(text, jsonb, jsonb, jsonb) to griddo_writer;

revoke create on schema internal from griddo_writer;
