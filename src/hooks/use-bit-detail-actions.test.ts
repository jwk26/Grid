import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DataStore } from "@/lib/db/datastore";
import { useBitDetailActions } from "./use-bit-detail-actions";

const getDataStoreMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/datastore", () => ({
  getDataStore: getDataStoreMock,
}));

type BitDetailActions = ReturnType<typeof useBitDetailActions>;
type BitUpdate = Parameters<BitDetailActions["updateBit"]>[1];
type NodeUpdate = Parameters<BitDetailActions["updateNode"]>[1];

// @ts-expect-error version is repository-owned
const forbiddenBitVersion: BitUpdate = { version: 2 };
// @ts-expect-error lifecycle is repository-owned
const forbiddenBitLifecycle: BitUpdate = { deletedAt: Date.now() };
// @ts-expect-error system metadata is repository-owned
const forbiddenNodeRole: NodeUpdate = { systemRole: "inbox" };
void forbiddenBitVersion;
void forbiddenBitLifecycle;
void forbiddenNodeRole;

describe("useBitDetailActions", () => {
  const dataStore = {
    updateBit: vi.fn().mockResolvedValue(undefined),
    updateNode: vi.fn().mockResolvedValue(undefined),
    softDeleteBit: vi.fn().mockResolvedValue(undefined),
    promoteBitToNode: vi.fn(),
  } as unknown as DataStore;

  beforeEach(() => {
    vi.clearAllMocks();
    getDataStoreMock.mockResolvedValue(dataStore);
  });

  it("forwards narrow user-owned bit and node patches", async () => {
    const bitPatch: BitUpdate = { title: "Renamed bit", priority: "high" };
    const nodePatch: NodeUpdate = { deadline: 1_800_000_000_000 };
    const { result } = renderHook(() => useBitDetailActions());

    await act(async () => {
      await result.current.updateBit("bit-1", bitPatch);
      await result.current.updateNode("node-1", nodePatch);
    });

    expect(dataStore.updateBit).toHaveBeenCalledWith("bit-1", bitPatch);
    expect(dataStore.updateNode).toHaveBeenCalledWith("node-1", nodePatch);
  });

  it("passes the parent extension to updateBit only when asked", async () => {
    const { result } = renderHook(() => useBitDetailActions());

    await act(async () => {
      await result.current.updateBit("bit-1", { deadline: 1 }, { extendParent: true });
    });

    expect(dataStore.updateBit).toHaveBeenCalledWith("bit-1", { deadline: 1 }, { extendParent: true });
  });
});
