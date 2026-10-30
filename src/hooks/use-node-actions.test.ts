import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DataStore } from "@/lib/db/datastore";
import { useNodeActions } from "./use-node-actions";

const getDataStoreMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/datastore", () => ({
  getDataStore: getDataStoreMock,
}));

type NodeActions = ReturnType<typeof useNodeActions>;
type NodeUpdate = Parameters<NodeActions["updateNode"]>[1];

// @ts-expect-error version is repository-owned
const forbiddenVersion: NodeUpdate = { version: 2 };
// @ts-expect-error lifecycle is repository-owned
const forbiddenLifecycle: NodeUpdate = { archivedAt: Date.now() };
// @ts-expect-error identity is repository-owned
const forbiddenIdentity: NodeUpdate = { id: crypto.randomUUID() };
void forbiddenVersion;
void forbiddenLifecycle;
void forbiddenIdentity;

describe("useNodeActions", () => {
  const dataStore = {
    updateNode: vi.fn().mockResolvedValue(undefined),
    getChildDeadlineConflicts: vi.fn().mockResolvedValue([]),
  } as unknown as DataStore;

  beforeEach(() => {
    vi.clearAllMocks();
    getDataStoreMock.mockResolvedValue(dataStore);
  });

  it("forwards a narrow user-owned node patch", async () => {
    const patch: NodeUpdate = { title: "Renamed", x: 4, y: 2 };
    const { result } = renderHook(() => useNodeActions());

    await act(async () => {
      await result.current.updateNode("node-1", patch);
    });

    expect(dataStore.updateNode).toHaveBeenCalledWith("node-1", patch, undefined);
  });
});
