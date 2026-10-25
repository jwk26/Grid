import { nodePatchToRow, type NodePatch } from "@/lib/db/row-mapping";
import { UnknownOutcomeError, type Envelope } from "@/lib/db/snapshot-store";
import type { GriddoSupabaseClient } from "@/lib/db/supabase-client";

// The Supabase calls the snapshot store is given (Task 217 wires get_snapshot and update_node;
// later tasks add one wrapper per function). An API error is thrown, so the store treats it as
// an `error` outcome; a rule violation arrives as an envelope with `rejected`.

// The top-left 3x2 block the fixed breadcrumb may cover; passed until Task 249 (SCHEMA Internal
// functions, cell picking).
export const BREADCRUMB_RESERVED_CELLS = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 2, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: 2, y: 1 },
];

export async function fetchSnapshotValue(client: GriddoSupabaseClient): Promise<unknown> {
  const { data, error } = await client.rpc("get_snapshot");
  if (error) throw new Error(`get_snapshot failed: ${error.message}`);
  return data;
}

export async function callEnsureAccount(client: GriddoSupabaseClient): Promise<Envelope> {
  const { data, error } = await client.rpc("ensure_account", {
    p_reserved_cells: BREADCRUMB_RESERVED_CELLS,
  });
  if (error) throw new Error(`ensure_account failed: ${error.message}`);
  return data as unknown as Envelope;
}

export async function callUpdateNode(
  client: GriddoSupabaseClient,
  id: string,
  patch: NodePatch,
): Promise<Envelope> {
  const { data, error, status } = await client.rpc("update_node", {
    p_id: id,
    p_changes: nodePatchToRow(patch),
    p_reserved_cells: BREADCRUMB_RESERVED_CELLS,
  });
  // postgrest-js reports a request that got no response as an error with status 0 instead of
  // throwing. The write may have committed, so it is an unknown outcome, not a failed write.
  if (error && status === 0) throw new UnknownOutcomeError(`update_node got no response: ${error.message}`);
  if (error) throw new Error(`update_node failed: ${error.message}`);
  return data as unknown as Envelope;
}
