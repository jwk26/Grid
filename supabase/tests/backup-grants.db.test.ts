import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { BACKUP_FUNCTIONS } from "./helpers/backup";
import { connect } from "./helpers/db";

// Task 256: service_role's effective rights in app, internal and public equal the SCHEMA §RLS and
// grants list, and nothing else (backup B9). The catalog test reads effective privileges
// (`has_*_privilege`), so a grant through PUBLIC, a column grant or a default grant counts. It
// leaves out `dev` (local fixture code) and Supabase's own schemas.

const SCHEMAS = ["app", "internal", "public"];
const TABLE_PRIVS = ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"];
const COLUMN_PRIVS = ["SELECT", "INSERT", "UPDATE", "REFERENCES"];
const EXTENSION_FREE = `not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')`;

async function serviceRoleRights(db: Client): Promise<string[]> {
  const out: string[] = [];
  const { rows: tables } = await db.query(
    `select c.oid, n.nspname || '.' || c.relname as name,
            ${TABLE_PRIVS.map((p) => `has_table_privilege('service_role', c.oid, '${p}') as "${p}"`).join(", ")}
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = any($1) and c.relkind in ('r', 'p', 'v', 'm', 'f')`,
    [SCHEMAS],
  );
  for (const t of tables) {
    for (const p of TABLE_PRIVS) if (t[p]) out.push(`table ${t.name} ${p}`);
    // A column grant when the table-level privilege is not held.
    const { rows: cols } = await db.query(
      `select a.attname as col,
              ${COLUMN_PRIVS.map((p) => `has_column_privilege('service_role', a.attrelid, a.attnum, '${p}') as "${p}"`).join(", ")}
         from pg_attribute a where a.attrelid = $1 and a.attnum > 0 and not a.attisdropped`,
      [t.oid],
    );
    for (const col of cols) {
      for (const p of COLUMN_PRIVS) if (col[p] && !t[p]) out.push(`column ${t.name}.${col.col} ${p}`);
    }
  }
  const { rows: seqs } = await db.query(
    `select n.nspname || '.' || c.relname as name,
            has_sequence_privilege('service_role', c.oid, 'USAGE') as u,
            has_sequence_privilege('service_role', c.oid, 'SELECT') as s,
            has_sequence_privilege('service_role', c.oid, 'UPDATE') as w
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = any($1) and c.relkind = 'S'`,
    [SCHEMAS],
  );
  for (const s of seqs) {
    if (s.u) out.push(`sequence ${s.name} USAGE`);
    if (s.s) out.push(`sequence ${s.name} SELECT`);
    if (s.w) out.push(`sequence ${s.name} UPDATE`);
  }
  for (const schema of SCHEMAS) {
    const { rows } = await db.query(
      `select has_schema_privilege('service_role', $1, 'USAGE') as u, has_schema_privilege('service_role', $1, 'CREATE') as c`,
      [schema],
    );
    if (rows[0].u) out.push(`schema ${schema} USAGE`);
    if (rows[0].c) out.push(`schema ${schema} CREATE`);
  }
  const { rows: fns } = await db.query(
    `select n.nspname || '.' || p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = any($1) and ${EXTENSION_FREE} and has_function_privilege('service_role', p.oid, 'EXECUTE')`,
    [SCHEMAS],
  );
  for (const f of fns) out.push(`function ${f.name} EXECUTE`);
  return out.sort();
}

const EXPECTED = [
  // `usage` on `public` is Supabase's own, which the API needs to reach any function.
  "schema app USAGE",
  "schema internal USAGE",
  "schema public USAGE",
  ...["nodes", "bits", "chunks", "scratch_breakdowns", "staged_candidates", "accounts"].map((t) => `table app.${t} SELECT`),
  "table app.backup_status SELECT",
  "table app.backup_status INSERT",
  "table app.backup_status UPDATE",
  "table internal.r2_deletions SELECT",
  "table internal.r2_deletions UPDATE",
  "table internal.r2_deletions DELETE",
  "table internal.backup_summary_state SELECT",
  "column internal.backup_summary_state.last_summary_at UPDATE",
  "column internal.backup_summary_state.over_limit UPDATE",
  ...BACKUP_FUNCTIONS.map((f) => `function public.${f} EXECUTE`),
  "function internal.account_fingerprint EXECUTE",
].sort();

describe("service_role rights", () => {
  it("equal the SCHEMA list in app, internal and public, and nothing else", async () => {
    const db = await connect();
    try {
      expect(await serviceRoleRights(db)).toEqual(EXPECTED);
    } finally {
      await db.end();
    }
  });

  it("fail the comparison when one extra grant is added", async () => {
    const extras = [
      "grant delete on app.nodes to service_role",
      "grant update (title) on app.chunks to service_role",
      "grant insert on internal.r2_deletions to public",
      "grant create on schema app to service_role",
      "grant execute on function internal.cleanup_guests() to service_role",
      "grant execute on function public.get_snapshot() to service_role",
      "grant update (backups_since) on internal.backup_summary_state to service_role",
    ];
    for (const sql of extras) {
      const db = await connect();
      try {
        await db.query("begin");
        await db.query(sql);
        expect(await serviceRoleRights(db), sql).not.toEqual(EXPECTED);
      } finally {
        await db.query("rollback");
        await db.end();
      }
    }
  });
});
