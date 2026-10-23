import type { Client } from "pg";

// SCHEMA §Account limits, real account. Staged candidates have no limit of their own: one
// per four Breakdown rows here.
export const REAL_ACCOUNT_LIMITS = {
  nodes: 1000,
  bits: 5000,
  chunks: 10000,
  scratchBreakdowns: 5000,
} as const;

export type AccountCounts = {
  nodes: number;
  bits: number;
  chunks: number;
  scratchBreakdowns: number;
  stagedCandidates: number;
};

const L0_NODES = 100;
const SCRATCH_BITS = 50;
// Cells start after the 3×2 breadcrumb block (feedback F34): row-major index 36 is (0, 2).
const FIRST_CELL_INDEX = 36;

const cell = (index: string) =>
  `(${FIRST_CELL_INDEX} + ${index}) % 18 as x, ((${FIRST_CELL_INDEX} + ${index}) / 18) % 9 as y`;

// Builds an account at `scale` × the real-account limits (1 = at the limits, 0.1 = a tenth) for
// `userId`, with valid rows, realistic text lengths, a two-level Node tree, Bits and Chunks
// spread over it, and Scratch Breakdowns with a staged candidate on every fourth. The ids are
// derived from the user id, so two accounts never collide. Run it on a connection that bypasses
// RLS (the owner). Nothing is deleted afterwards: delete the auth user to remove the account.
export async function buildLimitSizedAccount(
  db: Client,
  userId: string,
  scale: number,
): Promise<AccountCounts> {
  const n = Math.max(L0_NODES, Math.round(REAL_ACCOUNT_LIMITS.nodes * scale));
  const b = Math.round(REAL_ACCOUNT_LIMITS.bits * scale);
  const c = Math.round(REAL_ACCOUNT_LIMITS.chunks * scale);
  const s = Math.round(REAL_ACCOUNT_LIMITS.scratchBreakdowns * scale);
  const l0 = Math.min(L0_NODES, n);
  const scratchBits = Math.min(SCRATCH_BITS, b);

  const id = (kind: string, g: string) => `md5('${kind}:' || $1::uuid::text || ':' || ${g})::uuid`;

  await db.query(
    "insert into app.accounts (user_id, created_at, last_visit_at) values ($1, 1, 1)",
    [userId],
  );

  // Nodes 0 and 1 are the Inbox and the Archive (system Nodes count toward the limit). Nodes
  // 2..l0-1 are Level-0 Nodes; the rest are Level-1 Nodes under those. Cells inside one Grid
  // never repeat: a Grid's child Nodes use cell indexes 0..~10 and its Bits start at 20.
  const userNodes = n - 2;
  await db.query(
    `insert into app.nodes (id, user_id, title, color, icon, mtime, created_at, version, parent_id, level, x, y, system_role)
     select ${id("node", "g::text")}, $1::uuid,
            case g when 0 then 'Inbox' when 1 then 'Archive'
                 else 'Project area ' || g || ' — ' || repeat('x', 20 + g % 30) end,
            'hsl(' || (g * 37 % 360) || ', 70%, 55%)', 'folder', 1000 + g, 1000 + g, 1,
            case when g < $2 then null else ${id("node", "(2 + g % ($2 - 2))::text")} end,
            case when g < $2 then 0 else 1 end,
            ${cell("(case when g < $2 then g else g / ($2 - 2) end)")},
            case g when 0 then 'inbox' when 1 then 'archive_view' end
       from generate_series(0, $3 - 1) g`,
    [userId, l0, n],
  );

  // The first `scratchBits` Bits sit in the Inbox and carry the Breakdown rows; the rest are
  // spread over the other Nodes.
  await db.query(
    `insert into app.bits (id, user_id, title, description, icon, status, priority, mtime, created_at, version, parent_id, x, y)
     select ${id("bit", "g::text")}, $1::uuid, 'Task ' || g || ' ' || repeat('t', 30 + g % 60),
            repeat('Notes about this task, with some detail. ', 1 + g % 7), 'check',
            case when g % 5 = 0 then 'complete' else 'active' end,
            (array['high','mid','low'])[1 + g % 3], 2000 + g, 2000 + g, 1,
            case when g < $4 then ${id("node", "'0'")}
                 else ${id("node", "(2 + g % $2)::text")} end,
            ${cell("(case when g < $4 then g else 20 + g / $2 end)")}
       from generate_series(0, $3 - 1) g`,
    [userId, userNodes, b, scratchBits],
  );

  await db.query(
    `insert into app.chunks (id, user_id, title, description, status, "order", parent_id)
     select ${id("chunk", "g::text")}, $1::uuid, 'Step ' || g || ' ' || repeat('s', 20 + g % 50),
            repeat('Chunk detail line. ', 1 + g % 6),
            case when g % 3 = 0 then 'complete' else 'incomplete' end, g / $2,
            ${id("bit", "(g % $2)::text")}
       from generate_series(0, $3 - 1) g`,
    [userId, b, c],
  );

  await db.query(
    `insert into app.scratch_breakdowns (id, user_id, scratch_bit_id, content, "order", created_at, version)
     select ${id("breakdown", "g::text")}, $1::uuid, ${id("bit", "(g % $2)::text")},
            'Breakdown row ' || g || ': ' || repeat('idea ', 5 + g % 40), g / $2, 3000 + g, 1
       from generate_series(0, $3 - 1) g`,
    [userId, scratchBits, s],
  );

  await db.query(
    `insert into app.staged_candidates (id, user_id, scratch_bit_id, source_breakdown_id, result_type, created_at, updated_at, version)
     select ${id("candidate", "g::text")}, $1::uuid, ${id("bit", "(g % $2)::text")},
            ${id("breakdown", "g::text")}, case when g % 8 = 0 then 'node' else 'bit' end,
            4000 + g, 4000 + g, 1
       from generate_series(0, $3 - 1) g where g % 4 = 0`,
    [userId, scratchBits, s],
  );

  return {
    nodes: n,
    bits: b,
    chunks: c,
    scratchBreakdowns: s,
    stagedCandidates: Math.ceil(s / 4),
  };
}
