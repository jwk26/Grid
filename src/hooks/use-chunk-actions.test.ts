import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DataStore } from "@/lib/db/datastore";
import { useChunkActions } from "./use-chunk-actions";

const getDataStoreMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/datastore", () => ({
  getDataStore: getDataStoreMock,
}));

describe("useChunkActions", () => {
  const dataStore = {
    reorderChunks: vi.fn().mockResolvedValue(undefined),
    updateChunk: vi.fn().mockResolvedValue(undefined),
  } as unknown as DataStore;

  beforeEach(() => {
    vi.clearAllMocks();
    getDataStoreMock.mockResolvedValue(dataStore);
  });

  it("reorders a Bit's Chunks with one DataStore call", async () => {
    const { result } = renderHook(() => useChunkActions());

    await act(async () => {
      await result.current.reorderChunks("bit-1", ["c2", "c1", "c3"]);
    });

    expect(dataStore.reorderChunks).toHaveBeenCalledTimes(1);
    expect(dataStore.reorderChunks).toHaveBeenCalledWith("bit-1", ["c2", "c1", "c3"]);
    expect(dataStore.updateChunk).not.toHaveBeenCalled();
  });
});
