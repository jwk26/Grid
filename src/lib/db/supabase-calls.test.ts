import { describe, expect, it, vi } from "vitest";
import {
  BREADCRUMB_RESERVED_CELLS,
  callEnsureAccount,
  callUpdateNode,
  fetchSnapshotValue,
} from "@/lib/db/supabase-calls";
import type { GriddoSupabaseClient } from "@/lib/db/supabase-client";

const clientWith = (result: { data: unknown; error: { message: string } | null }) => {
  const rpc = vi.fn(async () => result);
  return { client: { rpc } as unknown as GriddoSupabaseClient, rpc };
};

describe("supabase calls", () => {
  it("update_node sends snake_case changes only and the reserved block", async () => {
    const { client, rpc } = clientWith({ data: { status: "applied", result: null, changes: {} }, error: null });
    await callUpdateNode(client, "id-1", { x: 3, deadlineAllDay: true, level: 2 } as never);
    expect(rpc).toHaveBeenCalledWith("update_node", {
      p_id: "id-1",
      p_changes: { x: 3, deadline_all_day: true },
      p_reserved_cells: BREADCRUMB_RESERVED_CELLS,
    });
  });

  it("returns the envelope as sent by the server", async () => {
    const envelope = { status: "rejected", result: null, changes: {}, rejection: { code: "cell_taken" } };
    const { client } = clientWith({ data: envelope, error: null });
    expect(await callUpdateNode(client, "id-1", { x: 1 })).toEqual(envelope);
  });

  it("an API error is thrown, not returned", async () => {
    const { client } = clientWith({ data: null, error: { message: "boom" } });
    await expect(callUpdateNode(client, "id-1", { x: 1 })).rejects.toThrow(/boom/);
    await expect(fetchSnapshotValue(client)).rejects.toThrow(/get_snapshot failed/);
    await expect(callEnsureAccount(client)).rejects.toThrow(/ensure_account failed/);
  });

  it("the reserved block is the top-left 3x2 cells", () => {
    expect(BREADCRUMB_RESERVED_CELLS).toHaveLength(6);
    expect(BREADCRUMB_RESERVED_CELLS.every((c) => c.x <= 2 && c.y <= 1)).toBe(true);
  });
});
