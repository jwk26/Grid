import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DataStore } from "@/lib/db/datastore";
import { useTrashActions } from "./use-trash-actions";

const getDataStoreMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/datastore", () => ({
  getDataStore: getDataStoreMock,
}));

describe("useTrashActions", () => {
  const dataStore = {
    emptyTrash: vi.fn().mockResolvedValue({ status: "deleted" }),
    hardDeleteNode: vi.fn(),
    hardDeleteBit: vi.fn(),
  } as unknown as DataStore;

  beforeEach(() => {
    vi.clearAllMocks();
    getDataStoreMock.mockResolvedValue(dataStore);
  });

  it("empties the Trash with one DataStore call", async () => {
    const { result } = renderHook(() => useTrashActions());

    await act(async () => {
      await result.current.emptyTrash();
    });

    expect(dataStore.emptyTrash).toHaveBeenCalledTimes(1);
    expect(dataStore.hardDeleteNode).not.toHaveBeenCalled();
    expect(dataStore.hardDeleteBit).not.toHaveBeenCalled();
  });

  it("lets an Empty Trash failure reach the caller", async () => {
    vi.mocked(dataStore.emptyTrash).mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useTrashActions());

    await expect(result.current.emptyTrash()).rejects.toThrow("boom");
  });
});
