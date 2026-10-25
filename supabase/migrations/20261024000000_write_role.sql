-- Task 215: the write role (S14). Write functions are security definer and owned by
-- griddo_writer, a NOLOGIN role without BYPASSRLS that owns no table, so RLS still applies
-- inside them. authenticated keeps no write grant.

create role griddo_writer nologin nobypassrls noinherit;

-- postgres is not a superuser here: it needs membership to give functions this owner.
-- The reverse (griddo_writer a member of postgres or of a table owner) must never exist.
grant griddo_writer to postgres;

alter default privileges for role griddo_writer revoke execute on functions from public;

grant usage on schema app to griddo_writer;
grant usage on schema internal to griddo_writer;
-- Giving a function to a role needs CREATE on the schema for that role; it is held only
-- while the migration changes owners.
grant create on schema internal to griddo_writer;

-- postgres holds USAGE on schema auth without grant option, so the writer cannot call
-- auth.uid(). This invoker helper reads the same JWT claims as auth.uid() does. A claim
-- format it does not know gives null, so every policy is unmatched (fails closed).
create function internal.uid() returns uuid
  language sql stable security invoker set search_path = ''
  as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
  $$;
alter function internal.uid() owner to griddo_writer;
revoke all on function internal.uid() from public;
revoke create on schema internal from griddo_writer;

grant select, insert, update on app.accounts to griddo_writer;
grant select, insert, update, delete on app.nodes, app.bits, app.chunks, app.scratch_breakdowns, app.staged_candidates
  to griddo_writer;

-- accounts: no delete (an account row goes only with its auth user).
create policy accounts_writer_select on app.accounts for select to griddo_writer
  using (user_id = (select internal.uid()));
create policy accounts_writer_insert on app.accounts for insert to griddo_writer
  with check (user_id = (select internal.uid()));
create policy accounts_writer_update on app.accounts for update to griddo_writer
  using (user_id = (select internal.uid())) with check (user_id = (select internal.uid()));

create policy nodes_writer_select on app.nodes for select to griddo_writer
  using (user_id = (select internal.uid()));
create policy nodes_writer_insert on app.nodes for insert to griddo_writer
  with check (user_id = (select internal.uid()));
create policy nodes_writer_update on app.nodes for update to griddo_writer
  using (user_id = (select internal.uid())) with check (user_id = (select internal.uid()));
create policy nodes_writer_delete on app.nodes for delete to griddo_writer
  using (user_id = (select internal.uid()));

create policy bits_writer_select on app.bits for select to griddo_writer
  using (user_id = (select internal.uid()));
create policy bits_writer_insert on app.bits for insert to griddo_writer
  with check (user_id = (select internal.uid()));
create policy bits_writer_update on app.bits for update to griddo_writer
  using (user_id = (select internal.uid())) with check (user_id = (select internal.uid()));
create policy bits_writer_delete on app.bits for delete to griddo_writer
  using (user_id = (select internal.uid()));

create policy chunks_writer_select on app.chunks for select to griddo_writer
  using (user_id = (select internal.uid()));
create policy chunks_writer_insert on app.chunks for insert to griddo_writer
  with check (user_id = (select internal.uid()));
create policy chunks_writer_update on app.chunks for update to griddo_writer
  using (user_id = (select internal.uid())) with check (user_id = (select internal.uid()));
create policy chunks_writer_delete on app.chunks for delete to griddo_writer
  using (user_id = (select internal.uid()));

create policy scratch_breakdowns_writer_select on app.scratch_breakdowns for select to griddo_writer
  using (user_id = (select internal.uid()));
create policy scratch_breakdowns_writer_insert on app.scratch_breakdowns for insert to griddo_writer
  with check (user_id = (select internal.uid()));
create policy scratch_breakdowns_writer_update on app.scratch_breakdowns for update to griddo_writer
  using (user_id = (select internal.uid())) with check (user_id = (select internal.uid()));
create policy scratch_breakdowns_writer_delete on app.scratch_breakdowns for delete to griddo_writer
  using (user_id = (select internal.uid()));

create policy staged_candidates_writer_select on app.staged_candidates for select to griddo_writer
  using (user_id = (select internal.uid()));
create policy staged_candidates_writer_insert on app.staged_candidates for insert to griddo_writer
  with check (user_id = (select internal.uid()));
create policy staged_candidates_writer_update on app.staged_candidates for update to griddo_writer
  using (user_id = (select internal.uid())) with check (user_id = (select internal.uid()));
create policy staged_candidates_writer_delete on app.staged_candidates for delete to griddo_writer
  using (user_id = (select internal.uid()));
