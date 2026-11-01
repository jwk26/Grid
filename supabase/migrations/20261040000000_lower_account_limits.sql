-- Task 240: the real-account row limits drop to half (SCHEMA §Account limits; MI-8).
--
-- The D8 measurement on production (three runs, 2026-11-01) loaded the snapshot of a limit-sized
-- account in 5.4 to 10.4 s against the 3 s target, while the 50% account stayed within 2.1 s in
-- every run. The limits become the largest measured size that passes every run: nodes 500,
-- bits 2,500, chunks 5,000, scratch_breakdowns 2,500. The guest limits are unchanged.
--
-- CREATE OR REPLACE keeps the owner (griddo_writer) and the grants of internal.account_limit(); no
-- other object changes. Accounts already above a new limit keep their rows; only a create that
-- would add to a table at or above its limit is rejected (internal.limit_reached).
create or replace function internal.account_limit(p_table text) returns integer
  language sql stable security invoker set search_path = ''
  as $$
    select case when internal.is_guest() then
      case p_table when 'nodes' then 100 when 'bits' then 300 when 'chunks' then 1000 when 'scratch_breakdowns' then 300 end
    else
      case p_table when 'nodes' then 500 when 'bits' then 2500 when 'chunks' then 5000 when 'scratch_breakdowns' then 2500 end
    end
  $$;
