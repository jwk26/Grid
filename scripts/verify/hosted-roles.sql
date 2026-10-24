-- Task 218: hosted-Supabase proof of the write role (S14), the internal-function grants (S29 (1))
-- and the account-deletion role (S42 (1)). Run through `node scripts/verify/hosted-roles.mjs`.
-- Everything runs in one transaction that ends in ROLLBACK, so the schema and the data stay as
-- the migrations left them. Each check raises one NOTICE: `PASS ...`, `FAIL ...` or `INFO ...`.

begin;

create function pg_temp.report(ok boolean, label text, detail text default '') returns void
  language plpgsql as $$
begin
  raise notice '% % %', case when ok then 'PASS' else 'FAIL' end, label, case when detail = '' then '' else '(' || detail || ')' end;
end $$;

-- Two temporary accounts. Direct inserts into auth.users: the point is the database side.
create temp table probe_users (label text primary key, id uuid not null);
insert into probe_users values ('A', gen_random_uuid()), ('B', gen_random_uuid());
insert into auth.users (id, aud, role, email, created_at, updated_at)
  select id, 'authenticated', 'authenticated', 'hosted-roles-' || label || '@probe.invalid', now(), now() from probe_users;
grant select on probe_users to public;

-- 1. The role's attributes -----------------------------------------------------------------
do $$
declare r record; owned int; member_of text;
begin
  select rolcanlogin, rolbypassrls, rolsuper into r from pg_roles where rolname = 'griddo_writer';
  perform pg_temp.report(r.rolcanlogin is false and r.rolbypassrls is false and r.rolsuper is false,
    'griddo_writer is NOLOGIN, no BYPASSRLS, not superuser');
  select count(*) into owned from pg_class c join pg_roles o on o.oid = c.relowner
   where o.rolname = 'griddo_writer' and c.relkind in ('r', 'p', 'v', 'm');
  perform pg_temp.report(owned = 0, 'griddo_writer owns no table');
  select string_agg(distinct o.rolname, ',') into member_of
    from pg_class c join pg_roles o on o.oid = c.relowner join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relkind = 'r' and pg_has_role('griddo_writer', o.oid, 'MEMBER');
  perform pg_temp.report(member_of is null, 'griddo_writer is a member of no table owner', coalesce(member_of, ''));
end $$;

-- 2. Both accounts exist through the real function, run as the signed-in role ---------------
create function pg_temp.act_as(who text, as_role text default 'authenticated') returns void
  language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('role', as_role, 'sub', (select id from probe_users where label = who))::text, true);
  execute format('set local role %I', as_role);
end $$;
grant execute on function pg_temp.act_as(text, text) to public;

do $$
declare ra jsonb; rb jsonb; n int;
begin
  perform pg_temp.act_as('A');
  ra := public.ensure_account();
  reset role;
  perform pg_temp.act_as('B');
  rb := public.ensure_account();
  reset role;
  perform pg_temp.report(ra ->> 'status' = 'applied' and rb ->> 'status' = 'applied',
    'ensure_account() works for an authenticated caller', coalesce(ra ->> 'status', '') || '/' || coalesce(rb ->> 'status', ''));
  select count(*) into n from app.nodes where user_id in (select id from probe_users) and system_role is not null;
  perform pg_temp.report(n = 4, 'each account got its Inbox and Archive', n::text || ' system Nodes');
end $$;

-- 3. A write function cannot reach another account (the proof the role design is for) ---------
do $$
declare node_b uuid; r jsonb; title_after text; seen int;
begin
  select id into node_b from app.nodes where user_id = (select id from probe_users where label = 'B') and system_role = 'inbox';
  perform pg_temp.act_as('A');
  r := public.update_node(node_b, '{"title":"hacked"}'::jsonb);
  reset role;
  select title into title_after from app.nodes where id = node_b;
  perform pg_temp.report(r ->> 'status' = 'rejected' and r -> 'rejection' ->> 'code' = 'not_found' and title_after is distinct from 'hacked',
    'update_node() on another account''s Node is refused', coalesce(r ->> 'status', '') || '/' || coalesce(r -> 'rejection' ->> 'code', ''));

  perform pg_temp.act_as('A');
  r := public.get_snapshot();
  reset role;
  select count(*) into seen from jsonb_array_elements(r -> 'nodes') e
   where e ->> 'id' = node_b::text;
  perform pg_temp.report(seen = 0 and jsonb_array_length(r -> 'nodes') = 2, 'get_snapshot() holds only the caller''s rows',
    jsonb_array_length(r -> 'nodes') || ' Nodes');
end $$;

-- 4. Directly as griddo_writer: RLS holds in every table ------------------------------------
do $$
declare t text; vis int; upd int; del int; ok boolean := true; bad text := '';
begin
  foreach t in array array['accounts', 'nodes', 'bits', 'chunks', 'scratch_breakdowns', 'staged_candidates'] loop
    perform pg_temp.act_as('A', 'griddo_writer');
    execute format('select count(*) from app.%I where user_id = (select id from probe_users where label = ''B'')', t) into vis;
    execute format('update app.%I set user_id = user_id where user_id = (select id from probe_users where label = ''B'')', t);
    get diagnostics upd = row_count;
    if t <> 'accounts' then
      execute format('delete from app.%I where user_id = (select id from probe_users where label = ''B'')', t);
      get diagnostics del = row_count;
    else
      del := 0;
    end if;
    reset role;
    if vis <> 0 or upd <> 0 or del <> 0 then ok := false; bad := bad || t || ' '; end if;
  end loop;
  perform pg_temp.report(ok, 'griddo_writer sees, changes and deletes only the caller''s rows in all six tables', bad);

  begin
    perform pg_temp.act_as('A', 'griddo_writer');
    insert into app.nodes (id, user_id, title, color, icon, mtime, created_at, version, level, x, y)
      values (gen_random_uuid(), (select id from probe_users where label = 'B'), 'x', 'red', 'folder', 1, 1, 1, 0, 17, 8);
    reset role;
    perform pg_temp.report(false, 'griddo_writer insert for another account is refused');
  exception when insufficient_privilege then
    reset role;
    perform pg_temp.report(true, 'griddo_writer insert for another account is refused', '42501');
  end;
end $$;

-- 5. Function owners and grants ---------------------------------------------------------------
do $$
declare bad text; r record;
begin
  select string_agg(p.oid::regprocedure::text, ', ') into bad
    from pg_proc p join pg_roles o on o.oid = p.proowner
   where p.pronamespace in ('public'::regnamespace, 'internal'::regnamespace)
     and p.prosecdef and o.rolname <> 'griddo_writer'
     and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e');
  perform pg_temp.report(bad is null, 'every security definer function is owned by griddo_writer', coalesce(bad, ''));

  select string_agg(p.oid::regprocedure::text || ' -> ' || g.role, ', ') into bad
    from pg_proc p cross join (values ('anon'), ('authenticated'), ('service_role')) g(role)
   where p.pronamespace = 'internal'::regnamespace
     and has_function_privilege(g.role, p.oid, 'execute');
  perform pg_temp.report(bad is null, 'no client role can execute an internal function', coalesce(bad, ''));

  select string_agg(g.role, ', ') into bad
    from (values ('anon'), ('authenticated'), ('service_role')) g(role)
   where has_schema_privilege(g.role, 'internal', 'usage');
  perform pg_temp.report(bad is null, 'no client role has USAGE on schema internal', coalesce(bad, ''));

  select string_agg(p.oid::regprocedure::text || ' -> ' || g.role, ', ') into bad
    from pg_proc p cross join (values ('anon'), ('service_role')) g(role)
   where p.pronamespace = 'public'::regnamespace
     and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
     and has_function_privilege(g.role, p.oid, 'execute');
  perform pg_temp.report(bad is null, 'anon and service_role execute no function of ours in public', coalesce(bad, ''));

  select string_agg(p.oid::regprocedure::text, ', ' order by p.proname) into bad
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
     and has_function_privilege('authenticated', p.oid, 'execute');
  raise notice 'INFO authenticated can execute: %', coalesce(bad, '(none)');

  select string_agg(g.role || ' on ' || t.table_name, ', ') into bad
    from (values ('anon'), ('authenticated')) g(role)
    cross join information_schema.tables t
   where t.table_schema = 'app'
     and (has_table_privilege(g.role, format('app.%I', t.table_name), 'insert')
       or has_table_privilege(g.role, format('app.%I', t.table_name), 'update')
       or has_table_privilege(g.role, format('app.%I', t.table_name), 'delete')
       or (g.role = 'anon' and has_table_privilege(g.role, format('app.%I', t.table_name), 'select')));
  perform pg_temp.report(bad is null, 'no client write grant on app tables, and anon cannot read them', coalesce(bad, ''));
end $$;

-- 6. Account-deletion role (S42 (1)): can hosted Supabase give a dedicated role the right to
--    delete auth users, and does a definer function owned by it delete only the caller's user?
--    A failed grant is a finding (the SCHEMA fallback applies), not an error of this script.
do $$
declare
  granted boolean := false; reason text; gone_a int; kept_b int; rows_a int; rows_b int;
begin
  create role griddo_delete_probe nologin nobypassrls noinherit;
  begin
    grant usage on schema auth to griddo_delete_probe;
    grant select, delete on auth.users to griddo_delete_probe;
    -- Postgres only warns when it grants nothing, so read the result back.
    granted := has_schema_privilege('griddo_delete_probe', 'auth', 'usage')
           and has_table_privilege('griddo_delete_probe', 'auth.users', 'delete');
    if not granted then reason := 'grant had no effect (no grant option on auth.users)'; end if;
  exception when others then
    reason := sqlstate || ' ' || sqlerrm;
  end;
  if not granted then
    raise notice 'INFO account-deletion role: grant refused (%)', reason;
    raise notice 'RESULT account-deletion: FALLBACK (SCHEMA §Account deletion)';
    return;
  end if;

  begin
    grant griddo_delete_probe to current_user;
    grant create on schema public to griddo_delete_probe;
    create function public.probe_delete_me() returns void
      language plpgsql security definer set search_path = '' as $f$
    begin
      delete from auth.users where id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
    end $f$;
    alter function public.probe_delete_me() owner to griddo_delete_probe;
    revoke create on schema public from griddo_delete_probe;
    grant execute on function public.probe_delete_me() to authenticated;
  exception when others then
    raise notice 'INFO account-deletion role: function setup refused (% %)', sqlstate, sqlerrm;
    raise notice 'RESULT account-deletion: FALLBACK (SCHEMA §Account deletion)';
    return;
  end;

  -- auth.users has row level security with no policy for other roles and is owned by
  -- supabase_auth_admin, so a delete by the probe role can match 0 rows. Attempt 2 gives the
  -- role BYPASSRLS (if hosted Supabase allows it) so the user can decide the branch.
  for attempt in 1..2 loop
    begin
      if attempt = 2 then
        alter role griddo_delete_probe bypassrls;
      end if;
      perform pg_temp.act_as('A');
      perform public.probe_delete_me();
      reset role;
    exception when others then
      reset role;
      raise notice 'INFO account-deletion role: attempt % refused (% %)', attempt, sqlstate, sqlerrm;
      exit;
    end;
    select count(*) into gone_a from auth.users where id = (select id from probe_users where label = 'A');
    select count(*) into kept_b from auth.users where id = (select id from probe_users where label = 'B');
    select count(*) into rows_a from app.nodes where user_id = (select id from probe_users where label = 'A');
    select count(*) into rows_b from app.nodes where user_id = (select id from probe_users where label = 'B');
    raise notice 'INFO attempt %: caller''s auth user left: %, caller''s Node rows left: %, other account''s user left: %, other account''s Node rows left: %',
      attempt, gone_a, rows_a, kept_b, rows_b;
    if gone_a = 0 and rows_a = 0 and kept_b = 1 and rows_b = 2 then
      raise notice 'RESULT account-deletion: %', case attempt when 1 then 'DEDICATED ROLE AVAILABLE'
        else 'DEDICATED ROLE AVAILABLE (needs BYPASSRLS; the user decides the branch)' end;
      return;
    end if;
  end loop;
  raise notice 'RESULT account-deletion: FALLBACK (SCHEMA §Account deletion); the dedicated role could not delete the caller''s auth user';
end $$;

rollback;
