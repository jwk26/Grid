import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { connect } from "./helpers/db";
import { call, openSession, waitForLockWait } from "./helpers/lifecycle";
import { beginRestore, exportOf, fingerprintOf, owner, stageRestore, stagingRow } from "./helpers/restore";
import { seedAccount, type SeededAccount } from "./helpers/seed";
import { createTestUser, type TestUser } from "./helpers/users";

// Task 260: restore_account() beside other writes (S30; SCHEMA §Locks, Restore). Two sessions on
// committed data: the first holds its locks uncommitted while the second waits and then sees the
// result. The lock order is the L0 Grid lock, the staging row, every Node by id, every Bit by id.

async function fresh(label: string): Promise<{ u: TestUser; seed: SeededAccount; second: string }> {
  const u = await createTestUser(label);
  const db = await connect();
  try {
    const seed = await seedAccount(db, u.id);
    // A second L0 Node, so a Node move has something to move under.
    const second = randomUUID();
    await db.query(
      `insert into app.nodes (id, user_id, title, color, icon, mtime, created_at, level, x, y)
       values ($1, $2, 'Second', 'hsl(10, 50%, 50%)', 'folder', 1, 1, 0, 5, 5)`,
      [second, u.id],
    );
    return { u, seed, second };
  } finally {
    await db.end();
  }
}

async function staged(u: TestUser): Promise<{ id: string; fingerprint: string }> {
  const id = randomUUID();
  const backup = await exportOf(u.id);
  await beginRestore(u.id, id);
  await stageRestore(u.id, id, backup);
  return { id, fingerprint: backup.fingerprint };
}

const restoreCall = (id: string, fingerprint: string) => (db: Client) =>
  call(db, "restore_account", [id, fingerprint]);

describe("restore_account() under concurrency", () => {
  it("two calls for one restore id give one applied and the recorded result stays applied", async () => {
    const { u } = await fresh("rc-twice");
    const { id, fingerprint } = await staged(u);
    const a = await openSession(u);
    const b = await openSession(u);
    const watcher = await connect();
    try {
      const first = await restoreCall(id, fingerprint)(a);
      const pending = restoreCall(id, fingerprint)(b);
      await waitForLockWait(watcher, "restore_account");
      await a.query("commit");
      const second = await pending;
      await b.query("commit");
      expect(first.status).toBe("applied");
      expect(second.status).toBe("already_applied");
      expect(await stagingRow(id)).toMatchObject({ result: "applied", payload: null });
    } finally {
      await a.query("rollback").catch(() => undefined);
      await b.query("rollback").catch(() => undefined);
      await Promise.all([a.end(), b.end(), watcher.end()]);
    }
  });

  it("waits for a Chunk write in flight, then reports account_changed with no deadlock", async () => {
    const { u, seed } = await fresh("rc-after-chunk");
    const { id, fingerprint } = await staged(u);
    const writer = await openSession(u);
    const restorer = await openSession(u);
    const watcher = await connect();
    try {
      expect((await call(writer, "update_chunk", [seed.chunkId, { title: "Edited" }])).status).toBe("applied");
      const pending = restoreCall(id, fingerprint)(restorer);
      await waitForLockWait(watcher, "restore_account");
      await writer.query("commit");
      const result = await pending;
      await restorer.query("commit");
      expect(result).toMatchObject({ status: "rejected", rejection: { code: "account_changed" } });
      expect((await owner("select title from app.chunks where id = $1", [seed.chunkId]))[0].title).toBe("Edited");
      expect(await stagingRow(id)).toMatchObject({ result: "account_changed" });
    } finally {
      await writer.query("rollback").catch(() => undefined);
      await restorer.query("rollback").catch(() => undefined);
      await Promise.all([writer.end(), restorer.end(), watcher.end()]);
    }
  });

  it("makes a Chunk write wait for a restore in flight and then end without an error", async () => {
    const { u, seed } = await fresh("rc-before-chunk");
    const { id, fingerprint } = await staged(u);
    const restorer = await openSession(u);
    const writer = await openSession(u);
    const watcher = await connect();
    try {
      expect((await restoreCall(id, fingerprint)(restorer)).status).toBe("applied");
      const pending = call(writer, "update_chunk", [seed.chunkId, { title: "Late" }]);
      await waitForLockWait(watcher, "update_chunk");
      await restorer.query("commit");
      const result = await pending;
      await writer.query("commit");
      expect(["applied", "rejected"]).toContain(result.status);
    } finally {
      await restorer.query("rollback").catch(() => undefined);
      await writer.query("rollback").catch(() => undefined);
      await Promise.all([restorer.end(), writer.end(), watcher.end()]);
    }
  });

  it("makes a Node move wait for a restore in flight and then end without an error", async () => {
    const { u, seed, second } = await fresh("rc-before-move");
    const { id, fingerprint } = await staged(u);
    const restorer = await openSession(u);
    const mover = await openSession(u);
    const watcher = await connect();
    try {
      expect((await restoreCall(id, fingerprint)(restorer)).status).toBe("applied");
      const pending = call(mover, "update_node", [second, { parent_id: seed.nodeId }]);
      await waitForLockWait(watcher, "update_node");
      await restorer.query("commit");
      const result = await pending;
      await mover.query("commit");
      expect(["applied", "rejected"]).toContain(result.status);
    } finally {
      await restorer.query("rollback").catch(() => undefined);
      await mover.query("rollback").catch(() => undefined);
      await Promise.all([restorer.end(), mover.end(), watcher.end()]);
    }
  });

  it("ends a restore beside concurrent Chunk writes and Node moves without a deadlock error", async () => {
    const { u, seed, second } = await fresh("rc-stress");
    for (let round = 0; round < 12; round += 1) {
      const backup = await exportOf(u.id);
      const id = randomUUID();
      await owner("update app.backup_status set restore_started_at = null where user_id = $1", [u.id]);
      await beginRestore(u.id, id);
      await stageRestore(u.id, id, backup);
      const sessions = await Promise.all([openSession(u), openSession(u), openSession(u), openSession(u)]);
      try {
        const fp = await fingerprintOf(u.id);
        // Each session commits right after its own call, so a waiting call is released by the
        // other's commit instead of waiting for the test.
        const inOwnTransaction = async (db: Client, run: () => Promise<{ status: string }>) => {
          try {
            const out = await run();
            await db.query("commit");
            return out;
          } catch (error) {
            await db.query("rollback").catch(() => undefined);
            throw error;
          }
        };
        const settled = await Promise.allSettled([
          inOwnTransaction(sessions[0], () => restoreCall(id, fp)(sessions[0])),
          inOwnTransaction(sessions[1], () => call(sessions[1], "update_chunk", [seed.chunkId, { title: `Round ${round}` }])),
          inOwnTransaction(sessions[2], () => call(sessions[2], "update_node", [second, { parent_id: round % 2 === 0 ? seed.nodeId : null }])),
          inOwnTransaction(sessions[3], () => call(sessions[3], "reorder_chunks", [seed.bitId, [seed.chunkId]])),
        ]);
        for (const s of settled) {
          if (s.status === "rejected") {
            expect((s.reason as { code?: string }).code, String(s.reason)).not.toBe("40P01");
            throw s.reason;
          }
        }
      } finally {
        await Promise.all(sessions.map((s) => s.query("rollback").catch(() => undefined)));
        await Promise.all(sessions.map((s) => s.end()));
      }
    }
  });
});
