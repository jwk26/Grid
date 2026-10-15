import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const rows = vi.hoisted(() => ({
  bits: [] as Array<Record<string, unknown>>,
  candidates: [] as Array<Record<string, unknown>>,
  sources: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/db/datastore", () => ({ getDataStore: vi.fn() }));
vi.mock("@/lib/db/indexeddb", () => ({
  db: {
    bits: {
      where: () => ({
        equals: (parentId: string) => ({
          toArray: async () => rows.bits.filter((bit) => bit.parentId === parentId),
        }),
      }),
    },
    stagedCandidates: { toArray: async () => rows.candidates },
    scratchBreakdowns: { toArray: async () => rows.sources },
  },
}));
vi.mock("dexie", () => ({
  liveQuery: (query: () => Promise<unknown>) => ({
    subscribe: (observer: { next: (value: unknown) => void; error: (error: unknown) => void }) => {
      void query().then(observer.next).catch(observer.error);
      return { unsubscribe: vi.fn() };
    },
  }),
}));

import { useTrashScratchSnapshot } from "./use-trash-scratch";

describe("useTrashScratchSnapshot", () => {
  it("projects active Inbox Scratch Bits with only their candidates and Breakdown rows", async () => {
    rows.bits = [
      { id: "a", parentId: "inbox", deletedAt: null, archivedAt: null },
      { id: "trashed", parentId: "inbox", deletedAt: 1, archivedAt: null },
      { id: "archived", parentId: "inbox", deletedAt: null, archivedAt: 1 },
      { id: "elsewhere", parentId: "other", deletedAt: null, archivedAt: null },
    ];
    rows.candidates = [
      { id: "c-a", scratchBitId: "a" },
      { id: "c-trashed", scratchBitId: "trashed" },
    ];
    rows.sources = [
      { id: "s-a", scratchBitId: "a" },
      { id: "s-archived", scratchBitId: "archived" },
    ];

    const { result } = renderHook(() => useTrashScratchSnapshot("inbox"));
    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).not.toBeNull());

    expect(result.current!.scratches.map(({ id }) => id)).toEqual(["a"]);
    expect(result.current!.candidates.map(({ id }) => id)).toEqual(["c-a"]);
    expect(result.current!.sources.map(({ id }) => id)).toEqual(["s-a"]);
  });

  it("stays null without an Inbox node", () => {
    const { result } = renderHook(() => useTrashScratchSnapshot(null));
    expect(result.current).toBeNull();
  });
});
