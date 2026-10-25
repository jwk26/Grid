import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { accountToRow, bitToRow, chunkToRow, nodeToRow } from "@/lib/db/row-mapping";
import type { Bit, Chunk, Node } from "@/lib/db/schema";
import { assertChangeSet, type Envelope as ChangeEnvelope } from "./helpers/change-set";
import { becomeActor, connect, expectDbError, insertRow, withActor } from "./helpers/db";
import { createTestUser, type TestUser } from "./helpers/users";

// create_chunk(), update_chunk(), delete_chunk() and reorder_chunks() (Task 219, Stage 2): Hooks 1,
// 2, 3 and 12 (Hook 3 as amended on 2026-10-25), the account limits and the Bit lock.

type Row = Record<string, unknown>;
type Table = { upserted: Row[]; deleted: string[] };
type Envelope = {
  status: string;
  result: unknown;
  changes: { nodes?: Table; bits?: Table; chunks?: Table };
  rejection?: { code: string; table?: string; limit?: number };
};

let user: TestUser;
let stranger: TestUser;

beforeAll(async () => {
  user = await createTestUser("ch");
  stranger = await createTestUser("ch-other");
});

const authed = (u: TestUser = user) => ({ role: "authenticated" as const, userId: u.id });

async function call(db: Client, fn: string, args: unknown[]): Promise<Envelope> {
  const params = args.map((a, i) => (a !== null && typeof a === "object" && !Array.isArray(a) ? `$${i + 1}::jsonb` : `$${i + 1}`));
  const values = args.map((a) => (a !== null && typeof a === "object" && !Array.isArray(a) ? JSON.stringify(a) : a));
  const { rows } = await db.query(`select public.${fn}(${params.join(", ")}) as e`, values);
  return rows[0].e as Envelope;
}
const createChunk = (db: Client, values: unknown, id: string = randomUUID()) => call(db, "create_chunk", [id, values]);
const updateChunk = (db: Client, id: string, changes: unknown, extend?: boolean) =>
  call(db, "update_chunk", extend === undefined ? [id, changes] : [id, changes, extend]);
const deleteChunk = (db: Client, id: string) => call(db, "delete_chunk", [id]);
const reorder = (db: Client, bit: string, ids: string[]) => call(db, "reorder_chunks", [bit, ids]);

async function account(db: Client, userId: string) {
  await insertRow(
    db,
    "accounts",
    accountToRow({ userId, createdAt: 1, lastVisitAt: 1, seededAt: null, deletionRequestedAt: null }),
  );
}
async function addNode(db: Client, overrides: Partial<Node>, userId = user.id): Promise<string> {
  const id = overrides.id ?? randomUUID();
  await insertRow(db, "nodes", nodeToRow({ ...baseEntities.node, ...overrides, id }, userId));
  return id;
}
async function addBit(db: Client, overrides: Partial<Bit>, userId = user.id): Promise<string> {
  const id = overrides.id ?? randomUUID();
  await insertRow(db, "bits", bitToRow({ ...baseEntities.bit, ...overrides, id }, userId));
  return id;
}
async function addChunk(db: Client, overrides: Partial<Chunk>, userId = user.id): Promise<string> {
  const id = overrides.id ?? randomUUID();
  await insertRow(db, "chunks", chunkToRow({ ...baseEntities.chunk, ...overrides, id }, userId));
  return id;
}
const stored = async (db: Client, table: "nodes" | "bits" | "chunks", id: string) =>
  (await db.query(`select to_jsonb(t.*) as r from app.${table} t where id = $1`, [id])).rows[0]?.r as Row;

// A Node P (3,3) with a Bit B (0,0) that holds three Chunks c1..c3 (order 0..2), all incomplete.
async function setup(db: Client, owner: <R>(run: () => Promise<R>) => Promise<R>) {
  return owner(async () => {
    await account(db, user.id);
    const ids = { p: randomUUID(), b: randomUUID(), c1: randomUUID(), c2: randomUUID(), c3: randomUUID() };
    await addNode(db, { id: ids.p, x: 3, y: 3, title: "P" });
    await addBit(db, { id: ids.b, parentId: ids.p, x: 0, y: 0, title: "B" });
    await addChunk(db, { id: ids.c1, parentId: ids.b, order: 0, title: "c1" });
    await addChunk(db, { id: ids.c2, parentId: ids.b, order: 1, title: "c2" });
    await addChunk(db, { id: ids.c3, parentId: ids.b, order: 2, title: "c3" });
    return ids;
  });
}
// Runs one or more `;`-separated statements; each gets only the parameters it references.
async function sql(db: Client, text: string, params: unknown[] = []): Promise<void> {
  for (const statement of text.split(";").map((part) => part.trim()).filter(Boolean)) {
    const used = [...new Set([...statement.matchAll(/\$(\d+)/g)].map((match) => Number(match[1])))].sort((a, b) => a - b);
    const renumbered = statement.replace(/\$(\d+)/g, (_, n) => `$${used.indexOf(Number(n)) + 1}`);
    await db.query(renumbered, used.map((n) => params[n - 1]));
  }
}
const NOW = 1_700_000_000_000;

describe("create_chunk", () => {
  it("creates an incomplete Chunk and touches the Bit and its Node (versions kept)", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, p } = await setup(db, owner);
      const id = randomUUID();
      const envelope = await createChunk(db, { title: "new", parent_id: b, order: 3, time: 5_000 }, id);
      expect(envelope).toMatchObject({ status: "applied", result: { id } });
      const row = await stored(db, "chunks", id);
      expect(row).toMatchObject({ title: "new", status: "incomplete", description: "", order: 3, time: 5_000, user_id: user.id });
      const bit = await stored(db, "bits", b);
      expect(bit).toMatchObject({ status: "active", version: 1 });
      expect(Number(bit.mtime)).toBeGreaterThan(NOW);
      expect(await stored(db, "nodes", p)).toMatchObject({ version: 1, mtime: bit.mtime });
      expect(envelope.changes.chunks?.upserted).toEqual([row]);
      expect(envelope.changes.bits?.upserted).toEqual([bit]);
    });
  });

  it("returns a complete Bit to active with one version (Hook 3)", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b } = await setup(db, owner);
      await owner(() => sql(db, "update app.chunks set status = 'complete'; update app.bits set status = 'complete' where id = $1", [b]));
      await createChunk(db, { title: "new", parent_id: b, order: 3 });
      expect(await stored(db, "bits", b)).toMatchObject({ status: "active", version: 2 });
    });
  });

  for (const key of ["status", "id", "user_id", "version"]) {
    it(`fails on the key ${key}`, async () => {
      await withActor(authed(), async (db, owner) => {
        const { b } = await setup(db, owner);
        expect(await expectDbError(() => createChunk(db, { title: "x", parent_id: b, order: 3, [key]: 1 }))).toBe("22023");
      });
    });
  }

  it("fails on a missing required key and on a value the table refuses", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b } = await setup(db, owner);
      expect(await expectDbError(() => createChunk(db, { title: "x", parent_id: b }))).toBe("22023");
    });
    await withActor(authed(), async (db, owner) => {
      const { b } = await setup(db, owner);
      expect(await expectDbError(() => createChunk(db, { title: "", parent_id: b, order: 3 }))).toBe("23514");
    });
  });

  it("returns account_missing, not_found (missing and other account's Bit) and invalid_target (null parent)", async () => {
    await withActor(authed(), async (db) => {
      expect(await createChunk(db, { title: "x", parent_id: randomUUID(), order: 0 })).toMatchObject({ rejection: { code: "account_missing" } });
    });
    await withActor(authed(), async (db, owner) => {
      await setup(db, owner);
      const theirs = await owner(async () => {
        await account(db, stranger.id);
        const node = await addNode(db, { x: 5, y: 5 }, stranger.id);
        return addBit(db, { parentId: node, x: 0, y: 0 }, stranger.id);
      });
      for (const parent of [randomUUID(), theirs]) {
        expect(await createChunk(db, { title: "x", parent_id: parent, order: 0 })).toMatchObject({
          status: "rejected", rejection: { code: "not_found" }, changes: {},
        });
      }
      expect(await createChunk(db, { title: "x", parent_id: null, order: 0 })).toMatchObject({ rejection: { code: "invalid_target" } });
    });
  });

  it("rejects a trashed or archived Bit, or a Bit under a trashed Node, with parent_inactive", async () => {
    for (const statement of [
      "update app.bits set deleted_at = 5 where id = $1",
      "update app.bits set archived_at = 5 where id = $1",
      "update app.nodes set deleted_at = 5 where id = (select parent_id from app.bits where id = $1)",
    ]) {
      await withActor(authed(), async (db, owner) => {
        const { b } = await setup(db, owner);
        await owner(() => sql(db, statement, [b]));
        expect(await createChunk(db, { title: "x", parent_id: b, order: 3 })).toMatchObject({ rejection: { code: "parent_inactive" } });
      });
    }
  });

  it("rejects a time past the Bit's deadline (table bits), with the all-day end-of-day rule", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b } = await setup(db, owner);
      await owner(() => sql(db, "update app.bits set deadline = 1000000000000, deadline_all_day = true where id = $1", [b]));
      expect(await createChunk(db, { title: "x", parent_id: b, order: 3, time: 1000000000000 + 86_399_999 })).toMatchObject({ status: "applied" });
      expect(await createChunk(db, { title: "x", parent_id: b, order: 4, time: 1000000000000 + 86_400_000 })).toMatchObject({
        status: "rejected", rejection: { code: "deadline_exceeds_parent", table: "bits" },
      });
    });
  });

  it.each([
    [false, 10_000],
    [true, 1_000],
  ] as const)("stops a %s guest account at %i Chunks, counting all rows", async (guest, limit) => {
    await withActor(authed(), async (db, owner) => {
      const { b } = await setup(db, owner);
      await owner(() =>
        sql(
          db,
          `insert into app.chunks (id, user_id, title, "order", parent_id)
           select gen_random_uuid(), $1, 'f', 0, $3 from generate_series(1, $2)`,
          [user.id, limit - 4, b],
        ),
      );
      if (guest) {
        await sql(db, "select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ role: "authenticated", sub: user.id, is_anonymous: true }),
        ]);
      }
      expect((await createChunk(db, { title: "x", parent_id: b, order: 9 })).status).toBe("applied");
      expect(await createChunk(db, { title: "x", parent_id: b, order: 9 })).toMatchObject({
        status: "rejected", rejection: { code: "account_limit", table: "chunks", limit },
      });
    });
  }, 60_000);
});

describe("update_chunk", () => {
  it("a status change completes the last incomplete Chunk and the Bit: one Bit version, Node version kept", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, p, c1, c2, c3 } = await setup(db, owner);
      await owner(() => sql(db, "update app.chunks set status = 'complete' where id = any($1)", [[c1, c2]]));
      const envelope = await updateChunk(db, c3, { status: "complete" });
      expect(envelope.status).toBe("applied");
      const bit = await stored(db, "bits", b);
      expect(bit).toMatchObject({ status: "complete", version: 2 });
      expect(Number(bit.mtime)).toBeGreaterThan(NOW);
      expect(await stored(db, "nodes", p)).toMatchObject({ version: 1, mtime: bit.mtime });
      expect(envelope.changes.chunks?.upserted).toEqual([await stored(db, "chunks", c3)]);
      expect(envelope.changes.bits?.upserted).toEqual([bit]);
      expect(envelope.changes.nodes?.upserted).toEqual([await stored(db, "nodes", p)]);
    });
  });

  it("completing a Chunk while others stay incomplete leaves the Bit active, version kept", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, c1 } = await setup(db, owner);
      await updateChunk(db, c1, { status: "complete" });
      expect(await stored(db, "bits", b)).toMatchObject({ status: "active", version: 1 });
      expect(Number((await stored(db, "bits", b)).mtime)).toBeGreaterThan(NOW);
    });
  });

  it("unchecking returns an auto-completed Bit to active (one Chunk incomplete)", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, c1 } = await setup(db, owner);
      await owner(() => sql(db, "update app.chunks set status = 'complete'; update app.bits set status = 'complete', version = 5 where id = $1", [b]));
      await updateChunk(db, c1, { status: "incomplete" });
      expect(await stored(db, "bits", b)).toMatchObject({ status: "active", version: 6 });
    });
  });

  it("sticky force-complete: unchecking keeps a hand-completed Bit complete (two or more incomplete)", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, c1, c2 } = await setup(db, owner);
      await owner(() => sql(db, "update app.chunks set status = 'complete' where id = $1; update app.bits set status = 'complete', version = 7 where id = $2", [c1, b]));
      await updateChunk(db, c1, { status: "incomplete" });
      expect(await stored(db, "bits", b)).toMatchObject({ status: "complete", version: 7 });
      // A check never returns a complete Bit to active (Hook 3, 2026-10-25), though one Chunk is
      // still incomplete.
      await updateChunk(db, c2, { status: "complete" });
      expect(await stored(db, "bits", b)).toMatchObject({ status: "complete", version: 7 });
    });
  });

  it("a title or time edit touches mtime only: a hand-completed Bit stays complete, no version", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, p, c1 } = await setup(db, owner);
      await owner(() => sql(db, "update app.bits set status = 'complete', version = 4 where id = $1", [b]));
      const envelope = await updateChunk(db, c1, { title: "renamed", time: 5_000, description: "d" });
      expect(envelope.status).toBe("applied");
      const bit = await stored(db, "bits", b);
      expect(bit).toMatchObject({ status: "complete", version: 4 });
      expect(Number(bit.mtime)).toBeGreaterThan(NOW);
      expect(Number((await stored(db, "nodes", p)).mtime)).toBeGreaterThan(NOW);
      expect(await stored(db, "chunks", c1)).toMatchObject({ title: "renamed", time: 5_000, description: "d" });
      expect(envelope.changes.bits?.upserted).toEqual([bit]);
      expect(envelope.changes.nodes?.upserted).toEqual([await stored(db, "nodes", p)]);
    });
  });

  it("a no-op is applied with no changes; order, parent_id and other keys fail", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, c1 } = await setup(db, owner);
      for (const changes of [{}, { title: "c1", status: "incomplete" }]) {
        expect(await updateChunk(db, c1, changes)).toEqual({ status: "applied", result: null, changes: {} });
      }
      expect(await stored(db, "bits", b)).toMatchObject({ version: 1, mtime: 1 });
    });
    for (const key of ["order", "parent_id", "id", "user_id", "version"]) {
      await withActor(authed(), async (d, o) => {
        const s = await setup(d, o);
        expect(await expectDbError(() => updateChunk(d, s.c1, { [key]: key === "order" ? 5 : s.b }))).toBe("22023");
      });
    }
  });

  it("returns not_found, account_missing; fails on a CHECK", async () => {
    await withActor(authed(), async (db, owner) => {
      const { c1 } = await setup(db, owner);
      expect(await updateChunk(db, randomUUID(), { title: "x" })).toMatchObject({ rejection: { code: "not_found" } });
      expect(await expectDbError(() => updateChunk(db, c1, { status: "done" }))).toBe("23514");
    });
    await withActor(authed(), async (db) => {
      expect(await updateChunk(db, randomUUID(), { title: "x" })).toMatchObject({ rejection: { code: "account_missing" } });
    });
  });

  it("Hook 2: a time past the Bit's deadline is rejected (table bits) and writes nothing", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, c1 } = await setup(db, owner);
      await owner(() => sql(db, "update app.bits set deadline = 1000 where id = $1", [b]));
      const envelope = await updateChunk(db, c1, { time: 2000 });
      expect(envelope).toMatchObject({ status: "rejected", rejection: { code: "deadline_exceeds_parent", table: "bits" } });
      expect(await stored(db, "chunks", c1)).toMatchObject({ time: null });
      expect(await stored(db, "bits", b)).toMatchObject({ deadline: 1000, version: 1, mtime: 1 });
      expect((await updateChunk(db, c1, { time: 1000 })).status).toBe("applied");
    });
  });

  it("Hook 2: p_extend_parent extends the Bit in the same call (Calendar answer): one Bit version", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, c1 } = await setup(db, owner);
      await owner(() => sql(db, "update app.bits set deadline = 1000 where id = $1", [b]));
      const envelope = await updateChunk(db, c1, { time: 2000, time_all_day: true }, true);
      expect(envelope.status).toBe("applied");
      expect(await stored(db, "bits", b)).toMatchObject({ deadline: 2000, deadline_all_day: true, version: 2 });
      expect(await stored(db, "chunks", c1)).toMatchObject({ time: 2000, time_all_day: true });
    });
  });

  it("Hook 2: the Bit extension and a status change share one version", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, c1, c2, c3 } = await setup(db, owner);
      await owner(() => sql(db, "update app.chunks set status = 'complete' where id = any($1); update app.bits set deadline = 1000 where id = $2", [[c1, c2], b]));
      await updateChunk(db, c3, { time: 2000, status: "complete" }, true);
      expect(await stored(db, "bits", b)).toMatchObject({ deadline: 2000, status: "complete", version: 2 });
    });
  });

  it("Hook 2: the extension must fit the Bit's Node, otherwise nothing is written", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, p, c1 } = await setup(db, owner);
      await owner(() => sql(db, "update app.bits set deadline = 1000 where id = $1; update app.nodes set deadline = 1500 where id = $2", [b, p]));
      const envelope = await updateChunk(db, c1, { time: 2000 }, true);
      expect(envelope).toMatchObject({ status: "rejected", rejection: { code: "deadline_exceeds_parent", table: "nodes" } });
      expect(await stored(db, "chunks", c1)).toMatchObject({ time: null });
      expect(await stored(db, "bits", b)).toMatchObject({ deadline: 1000, version: 1, mtime: 1 });
      expect(await stored(db, "nodes", p)).toMatchObject({ mtime: 1 });
      expect((await updateChunk(db, c1, { time: 1500 }, true)).status).toBe("applied");
      expect(await stored(db, "bits", b)).toMatchObject({ deadline: 1500 });
    });
  });

  it("a Chunk already past its Bit's deadline can still be renamed or completed", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, c1 } = await setup(db, owner);
      await owner(() => sql(db, "update app.chunks set time = 2000 where id = $1; update app.bits set deadline = 1000 where id = $2", [c1, b]));
      expect((await updateChunk(db, c1, { title: "renamed", status: "complete" })).status).toBe("applied");
    });
  });
});

describe("delete_chunk", () => {
  it("deletes the Chunk, recomputes the Bit and touches it and its Node", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, p, c1, c2, c3 } = await setup(db, owner);
      await owner(() => sql(db, "update app.chunks set status = 'complete' where id = any($1)", [[c1, c2]]));
      const envelope = await deleteChunk(db, c3);
      expect(envelope.status).toBe("applied");
      expect(envelope.changes.chunks).toEqual({ upserted: [], deleted: [c3] });
      expect(await stored(db, "chunks", c3)).toBeUndefined();
      const bit = await stored(db, "bits", b);
      expect(bit).toMatchObject({ status: "complete", version: 2 });
      expect(await stored(db, "nodes", p)).toMatchObject({ version: 1, mtime: bit.mtime });
      expect(envelope.changes.bits?.upserted).toEqual([bit]);
      expect(envelope.changes.nodes?.upserted).toEqual([await stored(db, "nodes", p)]);
    });
  });

  it("a delete never returns a complete Bit to active: the only Chunk, or one of several incomplete", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, c1, c2, c3 } = await setup(db, owner);
      await owner(() => sql(db, "update app.bits set status = 'complete', version = 4 where id = $1", [b]));
      await deleteChunk(db, c1);
      expect(await stored(db, "bits", b)).toMatchObject({ status: "complete", version: 4 });
      await deleteChunk(db, c2);
      await deleteChunk(db, c3);
      expect(await stored(db, "bits", b)).toMatchObject({ status: "complete", version: 4 });
    });
  });

  it("deleting the last incomplete Chunk of an active Bit completes it", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, c1, c2, c3 } = await setup(db, owner);
      await owner(() => sql(db, "update app.chunks set status = 'complete' where id = any($1)", [[c1, c2]]));
      await deleteChunk(db, c3);
      expect(await stored(db, "bits", b)).toMatchObject({ status: "complete", version: 2 });
    });
  });

  it("returns not_found and account_missing", async () => {
    await withActor(authed(), async (db, owner) => {
      await setup(db, owner);
      expect(await deleteChunk(db, randomUUID())).toMatchObject({ rejection: { code: "not_found" } });
    });
    await withActor(authed(), async (db) => {
      expect(await deleteChunk(db, randomUUID())).toMatchObject({ rejection: { code: "account_missing" } });
    });
  });
});

describe("reorder_chunks", () => {
  it("writes only order on the Chunks that move: no status, mtime or version", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, p, c1, c2, c3 } = await setup(db, owner);
      await owner(() => sql(db, "update app.bits set status = 'complete', version = 4 where id = $1", [b]));
      const envelope = await reorder(db, b, [c3, c2, c1]);
      expect(envelope.status).toBe("applied");
      expect(envelope.changes.chunks?.upserted.map((r) => [r.id, r.order]).sort()).toEqual(
        [[c3, 0], [c1, 2]].sort(),
      );
      expect(envelope.changes.bits).toBeUndefined();
      expect(envelope.changes.nodes).toBeUndefined();
      expect(await stored(db, "chunks", c2)).toMatchObject({ order: 1 });
      expect(await stored(db, "bits", b)).toMatchObject({ status: "complete", version: 4, mtime: 1 });
      expect(await stored(db, "nodes", p)).toMatchObject({ mtime: 1, version: 1 });
    });
  });

  it("the same order is applied with no changes", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, c1, c2, c3 } = await setup(db, owner);
      expect(await reorder(db, b, [c1, c2, c3])).toEqual({ status: "applied", result: null, changes: {} });
    });
  });

  it("rejects a list that is not exactly the Bit's Chunks with invalid_input", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, c1, c2, c3 } = await setup(db, owner);
      for (const ids of [[c1, c2], [c1, c2, c3, randomUUID()], [c1, c1, c2], []]) {
        expect(await reorder(db, b, ids)).toMatchObject({ status: "rejected", rejection: { code: "invalid_input" } });
      }
      expect(await stored(db, "chunks", c1)).toMatchObject({ order: 0 });
    });
  });

  it("a stale list carries the Bit's current Chunks and the vanished ids, so the client converges", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, c1, c2, c3 } = await setup(db, owner);
      let added = "";
      // The other tab's writes happen after the client's snapshot, before its call.
      const envelope = await assertChangeSet(db, user.id, async () => {
        added = await owner(() => addChunk(db, { parentId: b, order: 3 }));
        await owner(() => sql(db, "delete from app.chunks where id = $1", [c3]));
        return reorder(db, b, [c3, c2, c1]) as unknown as ChangeEnvelope;
      });
      expect(envelope).toMatchObject({ status: "rejected", rejection: { code: "invalid_input" } });
      expect(envelope.changes.chunks?.deleted).toEqual([c3]);
      expect(envelope.changes.chunks?.upserted.map((r) => r.id).sort()).toEqual([c1, c2, added].sort());
    });
  });

  it("returns not_found for a missing or another account's Bit, and account_missing", async () => {
    await withActor(authed(), async (db, owner) => {
      await setup(db, owner);
      const theirs = await owner(async () => {
        await account(db, stranger.id);
        const node = await addNode(db, { x: 5, y: 5 }, stranger.id);
        const bit = await addBit(db, { parentId: node, x: 0, y: 0 }, stranger.id);
        await addChunk(db, { parentId: bit, order: 0 }, stranger.id);
        return bit;
      });
      expect(await reorder(db, randomUUID(), [])).toMatchObject({ rejection: { code: "not_found" } });
      expect(await reorder(db, theirs, [])).toMatchObject({ rejection: { code: "not_found" } });
    });
    await withActor(authed(), async (db) => {
      expect(await reorder(db, randomUUID(), [])).toMatchObject({ rejection: { code: "account_missing" } });
    });
  });
});

describe("cross-account", () => {
  it("leaves another account's Chunks untouched and sees nothing of them", async () => {
    await withActor(authed(), async (db, owner) => {
      await setup(db, owner);
      const theirs = await owner(async () => {
        await account(db, stranger.id);
        const node = await addNode(db, { x: 5, y: 5 }, stranger.id);
        const bit = await addBit(db, { parentId: node, x: 0, y: 0 }, stranger.id);
        const chunk = await addChunk(db, { parentId: bit, order: 0, title: "Theirs" }, stranger.id);
        return { bit, chunk };
      });
      expect(await updateChunk(db, theirs.chunk, { title: "Hijacked", status: "complete" })).toMatchObject({
        rejection: { code: "not_found" }, changes: {},
      });
      expect(await deleteChunk(db, theirs.chunk)).toMatchObject({ rejection: { code: "not_found" }, changes: {} });
      expect(await createChunk(db, { title: "x", parent_id: theirs.bit, order: 1 })).toMatchObject({ rejection: { code: "not_found" } });
      await owner(async () => {
        expect(await stored(db, "chunks", theirs.chunk)).toMatchObject({ title: "Theirs", status: "incomplete" });
        expect(await stored(db, "bits", theirs.bit)).toMatchObject({ version: 1, mtime: 1 });
      });
    });
  });

  it("a create with an id another account holds fails and leaves that Chunk unchanged", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b } = await setup(db, owner);
      const theirs = await owner(async () => {
        await account(db, stranger.id);
        const node = await addNode(db, { x: 5, y: 5 }, stranger.id);
        const bit = await addBit(db, { parentId: node, x: 0, y: 0 }, stranger.id);
        return addChunk(db, { parentId: bit, order: 0, title: "Theirs" }, stranger.id);
      });
      expect(await expectDbError(() => createChunk(db, { title: "x", parent_id: b, order: 9 }, theirs))).toBe("23505");
    });
  });
});

describe("change set (S31)", () => {
  it("before + changes equals after for create, update, extension, delete, reorder and rejections", async () => {
    await withActor(authed(), async (db, owner) => {
      const { b, c1, c2, c3 } = await setup(db, owner);
      // One transaction shares one timestamp, so reset the mtimes before every call: a parent
      // row left out of `changes` must show as a difference.
      const run = async (fn: () => Promise<Envelope>) => {
        await owner(() => sql(db, "update app.nodes set mtime = 1; update app.bits set mtime = 1"));
        return assertChangeSet(db, user.id, fn as unknown as () => Promise<ChangeEnvelope>);
      };
      await run(() => createChunk(db, { title: "n", parent_id: b, order: 3 }));
      await run(() => updateChunk(db, c1, { title: "edited" }));
      await run(() => updateChunk(db, c1, { status: "complete" }));
      await run(() => updateChunk(db, c2, {}));
      await run(() => reorder(db, b, [c3, c2, c1]));
      await run(() => reorder(db, b, [c1]));
      await owner(() => sql(db, "update app.bits set deadline = 1000 where id = $1", [b]));
      await run(() => updateChunk(db, c3, { time: 2000 })); // deadline_exceeds_parent
      await run(() => updateChunk(db, c3, { time: 2000 }, true));
      await run(() => deleteChunk(db, c3));
      await run(() => deleteChunk(db, randomUUID()));
    });
  });
});

describe("concurrency (S30)", () => {
  async function open(u: TestUser): Promise<Client> {
    const db = await connect();
    await db.query("begin");
    await becomeActor(db, authed(u));
    return db;
  }

  it("the last two incomplete Chunks checked at once end with the Bit complete", async () => {
    const u = await createTestUser("ch-race");
    const owner = await connect();
    const a = await open(u);
    const b = await open(u);
    const watcher = await connect();
    try {
      await account(owner, u.id);
      const node = await addNode(owner, { x: 3, y: 3 }, u.id);
      const bit = await addBit(owner, { parentId: node, x: 0, y: 0 }, u.id);
      const c1 = await addChunk(owner, { parentId: bit, order: 0 }, u.id);
      const c2 = await addChunk(owner, { parentId: bit, order: 1 }, u.id);
      const first = await updateChunk(a, c1, { status: "complete" });
      const pending = updateChunk(b, c2, { status: "complete" });
      for (let i = 0; i < 80; i += 1) {
        const { rows } = await watcher.query(
          "select 1 from pg_stat_activity where wait_event_type = 'Lock' and state = 'active' and query like '%update_chunk%'",
        );
        if (rows.length > 0) break;
        if (i === 79) throw new Error("the second call never waited for the first");
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      await a.query("commit");
      const second = await pending;
      await b.query("commit");
      expect(first.status).toBe("applied");
      expect(second.status).toBe("applied");
      const { rows } = await owner.query("select status, version from app.bits where id = $1", [bit]);
      expect(rows[0]).toEqual({ status: "complete", version: 2 });
    } finally {
      await a.query("rollback").catch(() => undefined);
      await b.query("rollback").catch(() => undefined);
      await a.end();
      await b.end();
      await watcher.end();
      await owner.end();
    }
  }, 30_000);
});
