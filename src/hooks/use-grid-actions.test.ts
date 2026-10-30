import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DataStore } from "@/lib/db/datastore";
import { useGridActions } from "./use-grid-actions";

const getDataStoreMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/datastore", () => ({
  getDataStore: getDataStoreMock,
}));

type GridActions = ReturnType<typeof useGridActions>;
type CreateNodeInput = Parameters<GridActions["createNode"]>[0];
type CreateBitInput = Parameters<GridActions["createBit"]>[0];

const validNodeInput: CreateNodeInput = {
  title: "Project",
  color: "hsl(210, 80%, 55%)",
  icon: "folder",
  deadline: null,
  deadlineAllDay: false,
  parentId: null,
  level: 0,
  x: 1,
  y: 2,
};
const validBitInput: CreateBitInput = {
  title: "Task",
  description: "",
  icon: "circle",
  deadline: null,
  deadlineAllDay: false,
  priority: null,
  parentId: crypto.randomUUID(),
  x: 2,
  y: 3,
};
const forbiddenNodeVersion: CreateNodeInput = {
  ...validNodeInput,
  // @ts-expect-error repository-owned versions cannot enter public create payloads
  version: 2,
};
const forbiddenBitLifecycle: CreateBitInput = {
  ...validBitInput,
  // @ts-expect-error repository-owned lifecycle cannot enter public create payloads
  deletedAt: Date.now(),
};
void forbiddenNodeVersion;
void forbiddenBitLifecycle;

describe("useGridActions", () => {
  const dataStore = {
    createNode: vi.fn(),
    createBit: vi.fn(),
    getGridOccupancy: vi.fn(),
    softDeleteNode: vi.fn(),
    softDeleteBit: vi.fn(),
    runBreadcrumbZoneMigration: vi.fn(),
  } as unknown as DataStore;

  beforeEach(() => {
    vi.clearAllMocks();
    getDataStoreMock.mockResolvedValue(dataStore);
  });

  it("forwards only the declared create payload", async () => {
    const { result } = renderHook(() => useGridActions());

    await act(async () => {
      await result.current.createNode(validNodeInput);
      await result.current.createBit(validBitInput);
    });

    expect(dataStore.createNode).toHaveBeenCalledWith(validNodeInput, undefined);
    await act(async () => {
      await result.current.createNode(validNodeInput, { report: false });
    });
    expect(dataStore.createNode).toHaveBeenLastCalledWith(validNodeInput, { report: false });
    expect(dataStore.createBit).toHaveBeenCalledWith(validBitInput, undefined);
  });
});
