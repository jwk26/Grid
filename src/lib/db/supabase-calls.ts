import type { Database } from "@/lib/db/database.types";
import {
  nodePatchToRow,
  type BitCreateRow,
  type BitPatchRow,
  type ChunkCreateRow,
  type ChunkPatchRow,
  type NodeCreateRow,
  type NodePatch,
} from "@/lib/db/row-mapping";
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

export type Functions = Database["public"]["Functions"];
export type Args<Name extends keyof Functions> = Functions[Name]["Args"];

// One call, one function (SCHEMA §Exposed functions). An API error is thrown, so the store
// treats it as a failed write; a request that got no response is an unknown outcome.
// postgrest-js reports that case as an error with status 0 instead of throwing, and the write
// may have committed.
export async function callWrite(
  client: GriddoSupabaseClient,
  name: keyof Functions,
  args: Record<string, unknown>,
): Promise<Envelope> {
  const rpc = client.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null; status: number }>;
  const { data, error, status } = await rpc.call(client, name, args);
  if (error && status === 0) throw new UnknownOutcomeError(`${name} got no response: ${error.message}`);
  if (error) throw new Error(`${name} failed: ${error.message}`);
  return data as unknown as Envelope;
}

export const callEnsureAccount = (client: GriddoSupabaseClient) =>
  callWrite(client, "ensure_account", {
    p_reserved_cells: BREADCRUMB_RESERVED_CELLS,
  } satisfies Args<"ensure_account">);

export const callUpdateNode = (client: GriddoSupabaseClient, id: string, patch: NodePatch) =>
  callWrite(client, "update_node", {
    p_id: id,
    p_changes: nodePatchToRow(patch),
    p_reserved_cells: BREADCRUMB_RESERVED_CELLS,
  } satisfies Args<"update_node">);

export const callCreateNode = (client: GriddoSupabaseClient, id: string, values: NodeCreateRow) =>
  callWrite(client, "create_node", { p_id: id, p_values: values } satisfies Args<"create_node">);

export const callCreateBit = (client: GriddoSupabaseClient, id: string, values: BitCreateRow) =>
  callWrite(client, "create_bit", { p_id: id, p_values: values } satisfies Args<"create_bit">);

export const callUpdateBit = (
  client: GriddoSupabaseClient,
  id: string,
  changes: BitPatchRow,
  extendParent: boolean,
) =>
  callWrite(client, "update_bit", {
    p_id: id,
    p_changes: changes,
    p_extend_parent: extendParent,
  } satisfies Args<"update_bit">);

export const callCreateChunk = (client: GriddoSupabaseClient, id: string, values: ChunkCreateRow) =>
  callWrite(client, "create_chunk", { p_id: id, p_values: values } satisfies Args<"create_chunk">);

export const callUpdateChunk = (
  client: GriddoSupabaseClient,
  id: string,
  changes: ChunkPatchRow,
  extendParent: boolean,
) =>
  callWrite(client, "update_chunk", {
    p_id: id,
    p_changes: changes,
    p_extend_parent: extendParent,
  } satisfies Args<"update_chunk">);

export const callDeleteChunk = (client: GriddoSupabaseClient, id: string) =>
  callWrite(client, "delete_chunk", { p_id: id } satisfies Args<"delete_chunk">);

export const callReorderChunks = (client: GriddoSupabaseClient, bitId: string, chunkIds: readonly string[]) =>
  callWrite(client, "reorder_chunks", {
    p_bit_id: bitId,
    p_chunk_ids: [...chunkIds],
  } satisfies Args<"reorder_chunks">);

// Lifecycle: soft delete, hard delete and archive take the id; restore, unarchive and promotion
// also take the reserved block (feedback F34).
type IdFunction =
  | "soft_delete_node"
  | "soft_delete_bit"
  | "hard_delete_node"
  | "hard_delete_bit"
  | "archive_node"
  | "archive_bit";
export const callById = (client: GriddoSupabaseClient, name: IdFunction, id: string) =>
  callWrite(client, name, { p_id: id });

type ReservedFunction =
  | "restore_node"
  | "restore_bit"
  | "unarchive_node"
  | "unarchive_bit"
  | "promote_bit_to_node";
export const callWithReserved = (client: GriddoSupabaseClient, name: ReservedFunction, id: string) =>
  callWrite(client, name, { p_id: id, p_reserved_cells: BREADCRUMB_RESERVED_CELLS });

export const callEmptyTrash = (client: GriddoSupabaseClient) => callWrite(client, "empty_trash", {});

export const callCleanupExpiredTrash = (client: GriddoSupabaseClient) =>
  callWrite(client, "cleanup_expired_trash", {});
