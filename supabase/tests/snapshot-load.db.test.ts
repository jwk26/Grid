import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { buildLimitSizedAccount, type AccountCounts } from "./fixtures/limit-sized-account";
import { connect } from "./helpers/db";
import { createTestUser, signedInClient } from "./helpers/users";

// D8, local measurement: load time and size of the snapshot of an account at the limits and at
// a tenth of them, through a signed-in supabase-js client. The numbers are logged for the
// ledger; the production measurement is Task 218. Only the row counts are asserted.
const RUNS = 5;

async function measure(label: string, scale: number) {
  const user = await createTestUser(`load-${label}`);
  const db = await connect();
  let counts: AccountCounts;
  try {
    counts = await buildLimitSizedAccount(db, user.id, scale);
  } finally {
    await db.end();
  }
  const client = await signedInClient(user);
  const times: number[] = [];
  let bytes = 0;
  let gzipped = 0;
  let snap: Record<string, unknown[]> = {};
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    const { data, error } = await client.rpc("get_snapshot");
    times.push(performance.now() - start);
    expect(error).toBeNull();
    snap = data as Record<string, unknown[]>;
    const json = JSON.stringify(data);
    bytes = Buffer.byteLength(json);
    gzipped = gzipSync(json).length;
  }
  times.sort((x, y) => x - y);
  const median = times[Math.floor(RUNS / 2)];
  console.log(
    `[D8 local] ${label}: nodes ${counts.nodes}, bits ${counts.bits}, chunks ${counts.chunks}, ` +
      `breakdowns ${counts.scratchBreakdowns}, candidates ${counts.stagedCandidates}; ` +
      `median of ${RUNS} = ${median.toFixed(0)} ms (min ${times[0].toFixed(0)}, max ${times[RUNS - 1].toFixed(0)}); ` +
      `${(bytes / 1024 / 1024).toFixed(2)} MB (gzip ${(gzipped / 1024 / 1024).toFixed(2)} MB)`,
  );
  const check = await connect();
  try {
    const cells = await check.query(
      `select count(*)::int as n from (
         select parent_id, x, y from (
           select parent_id, x, y from app.nodes where user_id = $1 and deleted_at is null
           union all select parent_id, x, y from app.bits where user_id = $1 and deleted_at is null
         ) o group by parent_id, x, y having count(*) > 1) d`,
      [user.id],
    );
    expect(cells.rows[0].n, "cells shared by two items in one Grid").toBe(0);
    const scratch = await check.query(
      `select count(*)::int as n from app.scratch_breakdowns s
         join app.bits b on b.user_id = s.user_id and b.id = s.scratch_bit_id
         join app.nodes p on p.user_id = b.user_id and p.id = b.parent_id
        where s.user_id = $1 and p.system_role is distinct from 'inbox'`,
      [user.id],
    );
    expect(scratch.rows[0].n, "Breakdown rows outside the Inbox").toBe(0);
    const system = await check.query(
      "select count(*)::int as n from app.nodes where user_id = $1 and system_role is not null",
      [user.id],
    );
    expect(system.rows[0].n).toBe(2);
  } finally {
    await check.end();
  }
  return { counts, snap };
}

describe("snapshot load, local", () => {
  it.each([
    ["limit-sized", 1],
    ["one-tenth", 0.1],
  ] as const)("loads the %s account intact", async (label, scale) => {
    const { counts, snap } = await measure(label, scale);
    expect(snap.nodes).toHaveLength(counts.nodes);
    expect(snap.bits).toHaveLength(counts.bits);
    expect(snap.chunks).toHaveLength(counts.chunks);
    expect(snap.scratch_breakdowns).toHaveLength(counts.scratchBreakdowns);
    expect(snap.staged_candidates).toHaveLength(counts.stagedCandidates);
  }, 120_000);
});
