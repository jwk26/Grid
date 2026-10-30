import { describe, expect, it, vi } from "vitest";
import { baseEntities } from "@/lib/db/boundary-cases";
import { nodeToRow } from "@/lib/db/row-mapping";
import { SnapshotStore } from "@/lib/db/snapshot-store";
import type { GriddoSupabaseClient } from "@/lib/db/supabase-client";
import { createSupabaseStore } from "@/lib/db/supabase-store";
import { WriteOfflineError } from "@/lib/db/write-errors";
import { dropReportedFailure } from "@/lib/db/write-failure";

// Task 233: while offline an ordinary write changes nothing, sends nothing and tells the
// feedback layer once (F18). Automatic calls skip silently.

const USER = "00000000-0000-4000-8000-0000000000aa";
const NODE = "00000000-0000-4000-8000-000000000001";

async function setup(offline: boolean) {
  const rpc = vi.fn(async () => ({ data: null, error: null, status: 200 }));
  const client = { rpc } as unknown as GriddoSupabaseClient;
  const snapshot = new SnapshotStore({
    fetchSnapshot: async () => ({
      nodes: [nodeToRow({ ...baseEntities.node, id: NODE, x: 0, y: 0, level: 0 }, USER)],
      bits: [],
      chunks: [],
      scratch_breakdowns: [],
      staged_candidates: [],
    }),
  });
  await snapshot.load();
  const reportOffline = vi.fn();
  const reportFailure = vi.fn();
  const store = createSupabaseStore(snapshot, () => client, { isOffline: () => offline, reportOffline, reportFailure });
  return { rpc, snapshot, store, reportOffline, reportFailure };
}

const newNode = {
  title: "New",
  color: "hsl(210, 80%, 55%)",
  icon: "Folder",
  deadline: null,
  deadlineAllDay: false,
  parentId: null,
  level: 0,
  x: 4,
  y: 4,
};

describe("the offline write gate", () => {
  it("blocks an edit: nothing sent, nothing changed, one report", async () => {
    const s = await setup(true);
    await expect(s.store.updateNode(NODE, { x: 3, y: 3 })).rejects.toBeInstanceOf(WriteOfflineError);
    expect(s.rpc).not.toHaveBeenCalled();
    expect(s.snapshot.getState().view.nodes.get(NODE)?.x).toBe(0);
    expect(s.snapshot.getState().pending).toHaveLength(0);
    expect(s.reportOffline).toHaveBeenCalledTimes(1);
    expect(s.reportFailure).not.toHaveBeenCalled();
  });

  it("marks the error reported, so a caller with no message of its own drops it", async () => {
    const s = await setup(true);
    await expect(s.store.softDeleteNode(NODE).catch(dropReportedFailure)).resolves.toBeUndefined();
  });

  it("blocks a group 3 command too", async () => {
    const s = await setup(true);
    await expect(s.store.hardDeleteNode(NODE)).rejects.toBeInstanceOf(WriteOfflineError);
    expect(s.rpc).not.toHaveBeenCalled();
  });

  it("a dialog create (report: false) still shows the offline report", async () => {
    const s = await setup(true);
    await expect(s.store.createNode(newNode, { report: false })).rejects.toBeInstanceOf(WriteOfflineError);
    expect(s.reportOffline).toHaveBeenCalledTimes(1);
    expect(s.snapshot.getState().view.nodes.size).toBe(1);
  });

  it("the hourly Trash cleanup skips silently", async () => {
    const s = await setup(true);
    await expect(s.store.cleanupExpiredTrash()).resolves.toBeDefined();
    expect(s.rpc).not.toHaveBeenCalled();
    expect(s.reportOffline).not.toHaveBeenCalled();
  });

  it("sends normally when not offline", async () => {
    const s = await setup(false);
    await s.store.updateNode(NODE, { x: 3, y: 3 }).catch(() => undefined);
    expect(s.rpc).toHaveBeenCalled();
    expect(s.reportOffline).not.toHaveBeenCalled();
  });
});
