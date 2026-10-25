-- Task 216: public.get_snapshot() (SCHEMA §Snapshot). One SQL statement, so under READ
-- COMMITTED it reads one point in time and a candidate never arrives without its source (S17).
-- security invoker: RLS applies, and the explicit user filter keeps a policy change from
-- widening the result. Returned as one value because the API cuts a row set at 1,000 rows.
create function public.get_snapshot()
  returns jsonb
  language sql stable security invoker set search_path = ''
  as $$
    select case
      when not exists (select 1 from app.accounts a where a.user_id = (select auth.uid()))
        then jsonb_build_object('rejection', jsonb_build_object('code', 'account_missing'))
      else jsonb_build_object(
        'nodes', coalesce((select jsonb_agg(to_jsonb(n)) from app.nodes n
                            where n.user_id = (select auth.uid())), '[]'::jsonb),
        'bits', coalesce((select jsonb_agg(to_jsonb(b)) from app.bits b
                           where b.user_id = (select auth.uid())), '[]'::jsonb),
        'chunks', coalesce((select jsonb_agg(to_jsonb(c)) from app.chunks c
                             where c.user_id = (select auth.uid())), '[]'::jsonb),
        'scratch_breakdowns', coalesce((select jsonb_agg(to_jsonb(s)) from app.scratch_breakdowns s
                                         where s.user_id = (select auth.uid())), '[]'::jsonb),
        'staged_candidates', coalesce((select jsonb_agg(to_jsonb(k)) from app.staged_candidates k
                                        where k.user_id = (select auth.uid())), '[]'::jsonb)
      )
    end
  $$;

revoke all on function public.get_snapshot() from public, anon, service_role;
grant execute on function public.get_snapshot() to authenticated;
