import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toastCopy } from "@/lib/copy/feedback";
import { useArchive } from "./use-archive";

const getDataStoreMock = vi.hoisted(() => vi.fn());
const showToastMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/datastore", () => ({
  getDataStore: getDataStoreMock,
}));
vi.mock("@/lib/feedback/toast", () => ({ showToast: showToastMock }));

function makeDataStore(overrides: Record<string, unknown> = {}) {
  return {
    getArchivedItems: vi.fn().mockResolvedValue({ nodes: [], bits: [] }),
    unarchiveNode: vi.fn().mockResolvedValue(undefined),
    unarchiveBit: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("useArchive — unarchive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls unarchiveNode when type is node", async () => {
    const dataStore = makeDataStore();
    getDataStoreMock.mockResolvedValue(dataStore);

    const { result } = renderHook(() => useArchive());
    await waitFor(() => expect(dataStore.getArchivedItems).toHaveBeenCalled());

    await act(async () => {
      await result.current.unarchive("node", "node-1");
    });

    expect(dataStore.unarchiveNode).toHaveBeenCalledOnce();
    expect(dataStore.unarchiveNode).toHaveBeenCalledWith("node-1");
    expect(dataStore.unarchiveBit).not.toHaveBeenCalled();
  });

  it("calls unarchiveBit when type is bit", async () => {
    const dataStore = makeDataStore();
    getDataStoreMock.mockResolvedValue(dataStore);

    const { result } = renderHook(() => useArchive());
    await waitFor(() => expect(dataStore.getArchivedItems).toHaveBeenCalled());

    await act(async () => {
      await result.current.unarchive("bit", "bit-1");
    });

    expect(dataStore.unarchiveBit).toHaveBeenCalledOnce();
    expect(dataStore.unarchiveBit).toHaveBeenCalledWith("bit-1");
    expect(dataStore.unarchiveNode).not.toHaveBeenCalled();
  });

  it("ignores duplicate calls while first unarchive is in-flight (ref guard)", async () => {
    let resolveUnarchive!: () => void;
    const pendingUnarchive = new Promise<void>((resolve) => {
      resolveUnarchive = resolve;
    });
    const unarchiveNode = vi.fn().mockReturnValue(pendingUnarchive);
    const dataStore = makeDataStore({ unarchiveNode });
    getDataStoreMock.mockResolvedValue(dataStore);

    const { result } = renderHook(() => useArchive());
    await waitFor(() => expect(dataStore.getArchivedItems).toHaveBeenCalled());

    await act(async () => {
      // Both calls launched synchronously — ref is set by first call before any await,
      // so the second call sees the occupied id and returns immediately
      const firstCall = result.current.unarchive("node", "node-1");
      const secondCall = result.current.unarchive("node", "node-1");

      resolveUnarchive();
      await Promise.all([firstCall, secondCall]);
    });

    expect(unarchiveNode).toHaveBeenCalledOnce();
    expect(unarchiveNode).toHaveBeenCalledWith("node-1");
  });
});

describe("useArchive — a refused restore (Task 232)", () => {
  it("shows the archive-restore failure row with the item's title and frees the control", async () => {
    const dataStore = makeDataStore({
      getArchivedItems: vi.fn().mockResolvedValue({
        nodes: [],
        bits: [{ id: "bit-1", title: "Old bit", parentId: "p", archivedAt: 1, deletedAt: null }],
      }),
      unarchiveBit: vi.fn().mockRejectedValue(new Error("refused")),
    });
    getDataStoreMock.mockResolvedValue(dataStore);
    showToastMock.mockClear();

    const { result } = renderHook(() => useArchive());
    await waitFor(() => expect(dataStore.getArchivedItems).toHaveBeenCalled());
    await act(async () => {
      await result.current.unarchive("bit", "bit-1");
    });

    expect(showToastMock).toHaveBeenCalledWith(toastCopy.archiveRestoreFailed, "Old bit");
    expect(result.current.restoringIds.has("bit-1")).toBe(false);
  });
});
