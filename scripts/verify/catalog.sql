-- Read-only catalog listing, no row data. Same text on restored and production => same catalog.
\pset format unaligned
\pset tuples_only on
select line from (
  select 'schema ' || n.nspname || ' owner=' || pg_get_userbyid(n.nspowner) || ' acl=' || coalesce(n.nspacl::text,'-') as line
    from pg_namespace n where n.nspname in ('app','internal','public','cron','vault','net')
  union all
  select 'table ' || n.nspname || '.' || c.relname || ' kind=' || c.relkind::text || ' owner=' || pg_get_userbyid(c.relowner)
         || ' rls=' || c.relrowsecurity || ' force=' || c.relforcerowsecurity || ' acl=' || coalesce(c.relacl::text,'-')
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('app','internal','public') and c.relkind in ('r','v','m','S','p')
  union all
  select 'colacl ' || n.nspname || '.' || c.relname || '.' || a.attname || ' ' || a.attacl::text
    from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('app','internal','public') and a.attacl is not null
  union all
  select 'func ' || n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') owner=' || pg_get_userbyid(p.proowner)
         || ' secdef=' || p.prosecdef || ' vol=' || p.provolatile::text || ' cfg=' || coalesce(p.proconfig::text,'-') || ' acl=' || coalesce(p.proacl::text,'-')
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('app','internal','public') and p.prokind in ('f','p')
      and not exists (select 1 from pg_depend d where d.objid=p.oid and d.deptype='e')
  union all
  select 'policy ' || schemaname || '.' || tablename || ' ' || policyname || ' cmd=' || cmd::text || ' roles=' || roles::text
         || ' permissive=' || permissive || ' using=' || coalesce(qual,'-') || ' check=' || coalesce(with_check,'-')
    from pg_policies where schemaname in ('app','internal','public')
  union all
  select 'defacl role=' || pg_get_userbyid(d.defaclrole) || ' schema=' || coalesce(n.nspname,'*') || ' type=' || d.defaclobjtype::text || ' acl=' || d.defaclacl::text
    from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace
  union all
  select 'role ' || r.rolname || ' super=' || r.rolsuper || ' inherit=' || r.rolinherit || ' createrole=' || r.rolcreaterole
         || ' createdb=' || r.rolcreatedb || ' login=' || r.rolcanlogin || ' bypassrls=' || r.rolbypassrls
    from pg_roles r where r.rolname in ('griddo_writer','anon','authenticated','service_role','authenticator','postgres')
  union all
  select 'rolecfg ' || coalesce(pg_get_userbyid(s.setrole),'*') || ' ' || array_to_string(s.setconfig, ',')
    from pg_db_role_setting s
  union all
  select 'trigger ' || n.nspname || '.' || c.relname || ' ' || t.tgname
    from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('app','internal','public') and not t.tgisinternal
  union all
  select 'ext ' || e.extname from pg_extension e where e.extname in ('pg_cron','pg_net','supabase_vault','pgcrypto','uuid-ossp','pg_graphql','pg_stat_statements')
) q order by line;
