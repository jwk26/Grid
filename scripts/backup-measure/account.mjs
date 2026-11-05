// Task 255 local fixture: an account of about 10 MB raw under a random test user, plus a temporary
// export and fingerprint function of the same shape as Task 256's. Local database only.
// Usage: node scripts/backup-measure/account.mjs up   (prints the user id; state file in $MEASURE_STATE)
//        node scripts/backup-measure/account.mjs down (deletes the user and the temporary functions)
import pg from "pg";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { LOCAL_DB_URL, assertLocalDatabase, randomTestUserId } from "./lib.mjs";

assertLocalDatabase();
const STATE = process.env.MEASURE_STATE ?? "/tmp/backup-measure-state.json";
const [cmd] = process.argv.slice(2);
const client = new pg.Client({ connectionString: LOCAL_DB_URL });
await client.connect();

async function down(userId) {
  if (userId) await client.query("delete from auth.users where id = $1", [userId]);
  await client.query("drop function if exists public.measure_export(uuid)");
  await client.query("drop function if exists public.measure_hangul(int)");
  await client.query("drop function if exists public.measure_fingerprint(uuid)");
}

if (cmd === "down") {
  const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {};
  await down(state.userId);
  if (existsSync(STATE)) unlinkSync(STATE);
  await client.end();
  console.log("removed");
} else if (cmd === "up") {
  const userId = randomTestUserId();
  writeFileSync(STATE, JSON.stringify({ userId }));
  // On failure or a signal while building, remove what was made.
  const onSignal = (code) => async () => {
    await down(userId).catch(() => {});
    process.exit(code);
  };
  process.on("SIGINT", onSignal(130));
  process.on("SIGTERM", onSignal(143));
  try {
    await client.query("begin");
    await client.query(
      "insert into auth.users (id, instance_id, aud, role, email) values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2)",
      [userId, `measure-${userId}@example.invalid`],
    );
    await client.query("insert into app.accounts (user_id, created_at, last_visit_at) values ($1, 1, 1)", [userId]);
    // A volatile function in the select list runs once per row, so every row gets its own
    // string (a scalar subquery with no outer reference would run once and share one string).
    await client.query(`create or replace function public.measure_hangul(n int) returns text
      language sql volatile as $$ select string_agg(chr(44032 + floor(random()*11172)::int), '') from generate_series(1, n) $$`);
    const hangul = (n) => `public.measure_hangul(${n})`;
    // 60 Nodes (level 0 has no parent), 10 Bits each, 6-7 Chunks per Bit.
    await client.query(
      `insert into app.nodes (id, user_id, title, color, icon, mtime, created_at, version, level, x, y)
       select gen_random_uuid(), $1, ${hangul(40)}, 'hsl(200, 50%, 50%)', 'star', 1, 1, 1, 0, (g % 18), (g / 18)
       from generate_series(0, 59) g`,
      [userId],
    );
    await client.query(
      `insert into app.bits (id, user_id, title, description, icon, priority, status, mtime, created_at, version, parent_id, x, y)
       select gen_random_uuid(), $1, ${hangul(60)}, ${hangul(1000)}, 'star', 'mid', 'active', 1, 1, 1, n.id, (b % 18), (b / 18)
       from (select id, row_number() over () r from app.nodes where user_id = $1) n, generate_series(0, 9) b`,
      [userId],
    );
    await client.query(
      `insert into app.chunks (id, user_id, title, description, status, "order", parent_id)
       select gen_random_uuid(), $1, ${hangul(60)}, ${hangul(500)}, 'incomplete', c, b.id
       from app.bits b, generate_series(0, 6) c where b.user_id = $1`,
      [userId],
    );
    await client.query(`
      create or replace function public.measure_export(p_user_id uuid) returns jsonb
      language sql security definer set search_path = '' as $$
        select jsonb_build_object(
          'format_version', 1, 'user_id', p_user_id,
          'nodes', coalesce((select jsonb_agg(to_jsonb(t)) from app.nodes t where t.user_id = p_user_id), '[]'),
          'bits', coalesce((select jsonb_agg(to_jsonb(t)) from app.bits t where t.user_id = p_user_id), '[]'),
          'chunks', coalesce((select jsonb_agg(to_jsonb(t)) from app.chunks t where t.user_id = p_user_id), '[]'),
          'scratch_breakdowns', '[]'::jsonb, 'staged_candidates', '[]'::jsonb) $$;
      revoke all on function public.measure_export(uuid) from public;
      grant execute on function public.measure_export(uuid) to service_role;
      create or replace function public.measure_fingerprint(p_user_id uuid) returns text
      language sql security definer set search_path = '' as $$
        select md5(concat_ws(',',
          (select md5(coalesce(string_agg(t::text, ',' order by t.id), '')) from app.nodes t where t.user_id = p_user_id),
          (select md5(coalesce(string_agg(t::text, ',' order by t.id), '')) from app.bits t where t.user_id = p_user_id),
          (select md5(coalesce(string_agg(t::text, ',' order by t.id), '')) from app.chunks t where t.user_id = p_user_id),
          (select md5(coalesce(string_agg(t::text, ',' order by t.id), '')) from app.scratch_breakdowns t where t.user_id = p_user_id),
          (select md5(coalesce(string_agg(t::text, ',' order by t.id), '')) from app.staged_candidates t where t.user_id = p_user_id))) $$;
      revoke all on function public.measure_fingerprint(uuid) from public;
      grant execute on function public.measure_fingerprint(uuid) to service_role;`);
    await client.query("commit");
    const { rows } = await client.query(
      "select length(public.measure_export($1)::text) raw_chars, octet_length(public.measure_export($1)::text) raw_bytes, (select count(*) from app.nodes where user_id=$1) n, (select count(*) from app.bits where user_id=$1) b, (select count(*) from app.chunks where user_id=$1) c",
      [userId],
    );
    const distinct = await client.query(
      "select count(distinct description) d, count(*) n from app.bits where user_id = $1", [userId]);
    console.log(JSON.stringify({ userId, ...rows[0], distinctBitDescriptions: distinct.rows[0].d, bits: distinct.rows[0].n }));
    await client.end();
    process.removeAllListeners("SIGINT");
    process.removeAllListeners("SIGTERM");
  } catch (e) {
    await client.query("rollback").catch(() => {});
    await down(userId).catch(() => {});
    console.error("build failed:", e.message);
    process.exit(1);
  }
} else {
  console.error("usage: account.mjs up|down");
  process.exit(1);
}
