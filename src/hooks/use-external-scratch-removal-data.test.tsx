import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataStore } from "@/lib/db/datastore";
import type { Bit } from "@/lib/db/schema";
import { useExternalScratchRemovalData } from "./use-external-scratch-removal-data";

const getDataStoreMock = vi.hoisted(() => vi.fn());
const liveReadMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/datastore", () => ({
  getDataStore: getDataStoreMock,
  liveRead: (read: (store: unknown) => Promise<unknown>) =>
    liveReadMock(() => getDataStoreMock().then(read)),
}));

type Observer = {
  next: (value: unknown) => void;
  error: (error: unknown) => void;
};

const subscriptions: Array<{
  query: () => Promise<unknown>;
  observer?: Observer;
  unsubscribe: ReturnType<typeof vi.fn>;
}> = [];

function bit(id: string, overrides: Partial<Bit> = {}): Bit {
  return {
    id,
    title: overrides.title ?? id,
    description: overrides.description ?? "",
    icon: overrides.icon ?? "sparkles",
    deadline: overrides.deadline ?? null,
    deadlineAllDay: overrides.deadlineAllDay ?? false,
    priority: overrides.priority ?? null,
    status: overrides.status ?? "active",
    mtime: overrides.mtime ?? 1,
    createdAt: overrides.createdAt ?? 1,
    parentId: overrides.parentId ?? "inbox",
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    deletedAt: overrides.deletedAt ?? null,
    archivedAt: overrides.archivedAt ?? null,
    version: overrides.version ?? 1,
    pastDeadlineDismissed: overrides.pastDeadlineDismissed ?? false,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("useExternalScratchRemovalData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscriptions.length = 0;
    liveReadMock.mockImplementation((query: () => Promise<unknown>) => ({
      subscribe: (observer: Observer) => {
        const subscription = { query, observer, unsubscribe: vi.fn() };
        subscriptions.push(subscription);
        void query().then(observer.next).catch(observer.error);
        return { unsubscribe: subscription.unsubscribe };
      },
    }));
  });

  afterEach(cleanup);

  it("sets no external lifecycle for an own-Trash observation but does for any other deletion", async () => {
    const getBit = vi
      .fn()
      .mockResolvedValue(bit("scratch-1", { deletedAt: 10, version: 5 }));
    getDataStoreMock.mockResolvedValue({ getBit } as unknown as DataStore);

    const { result } = renderHook(() =>
      useExternalScratchRemovalData({
        ownTrash: [{ scratchId: "scratch-1", expectedVersion: 4 }],
        activeRemovalScratchId: null,
        selectedScratchId: "scratch-1",
        unresolvedRemovalContext: null,
        unresolvedScratchId: null,
      }),
    );
    await waitFor(() => expect(getBit).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.observation).toBeNull();

    getBit.mockResolvedValue(bit("scratch-1", { deletedAt: 10, version: 9 }));
    await act(async () => {
      subscriptions[0]!.observer!.next(
        bit("scratch-1", { deletedAt: 10, version: 9 }),
      );
    });
    expect(result.current.observation).toEqual({
      scratchId: "scratch-1",
      lifecycle: "delete",
    });
  });

  it("reactively classifies the selected Scratch archive lifecycle", async () => {
    const dataStore = {
      getBit: vi.fn().mockResolvedValue(bit("scratch-1", { archivedAt: 10 })),
    } as unknown as DataStore;
    getDataStoreMock.mockResolvedValue(dataStore);

    const { result } = renderHook(() =>
      useExternalScratchRemovalData({
        activeRemovalScratchId: "scratch-1",
        selectedScratchId: "scratch-1",
        unresolvedRemovalContext: null,
        unresolvedScratchId: null,
      }),
    );

    await waitFor(() =>
      expect(result.current.observation).toEqual({
        scratchId: "scratch-1",
        lifecycle: "archive",
      }),
    );
    expect(subscriptions).toHaveLength(1);
  });

  it("uses an authoritative fallback for an unresolved lifecycle and ignores a stale read", async () => {
    const first = deferred<Bit | undefined>();
    const second = deferred<Bit | undefined>();
    const dataStore = {
      getBit: vi.fn((id: string) =>
        id === "scratch-1" ? first.promise : second.promise,
      ),
    } as unknown as DataStore;
    getDataStoreMock.mockResolvedValue(dataStore);
    const { result, rerender } = renderHook(
      ({ unresolvedScratchId }: { unresolvedScratchId: string | null }) =>
        useExternalScratchRemovalData({
          activeRemovalScratchId: unresolvedScratchId,
          selectedScratchId: null,
          unresolvedRemovalContext:
            unresolvedScratchId === null ? null : { scratchId: unresolvedScratchId },
          unresolvedScratchId,
        }),
      { initialProps: { unresolvedScratchId: "scratch-1" } },
    );

    rerender({ unresolvedScratchId: "scratch-2" });
    await act(async () => {
      first.resolve(bit("scratch-1", { archivedAt: 10 }));
      await Promise.resolve();
    });
    expect(result.current.observation).toBeNull();

    await act(async () => {
      second.resolve(undefined);
      await Promise.resolve();
    });
    expect(result.current.observation).toEqual({
      scratchId: "scratch-2",
      lifecycle: "delete",
    });
  });

  it("cancels a pending fallback when the same Scratch removal context changes", async () => {
    const first = deferred<Bit | undefined>();
    const second = deferred<Bit | undefined>();
    const dataStore = {
      getBit: vi
        .fn()
        .mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => second.promise),
    } as unknown as DataStore;
    getDataStoreMock.mockResolvedValue(dataStore);
    const { result, rerender } = renderHook(
      ({ unresolvedRemovalContext }) =>
        useExternalScratchRemovalData({
          activeRemovalScratchId: "scratch-1",
          selectedScratchId: null,
          unresolvedScratchId: "scratch-1",
          unresolvedRemovalContext,
        }),
      {
        initialProps: {
          unresolvedRemovalContext: {
            scratchId: "scratch-1",
            destinationId: "scratch-2",
          },
        },
      },
    );

    rerender({
      unresolvedRemovalContext: {
        scratchId: "scratch-1",
        destinationId: "scratch-3",
      },
    });
    await act(async () => {
      first.resolve(bit("scratch-1"));
      await Promise.resolve();
    });
    expect(result.current.observation).toBeNull();

    await act(async () => {
      second.resolve(bit("scratch-1", { archivedAt: 10 }));
      await Promise.resolve();
    });
    expect(result.current.observation).toEqual({
      scratchId: "scratch-1",
      lifecycle: "archive",
    });
  });

  it("reads the terminal Inbox projection before the source identity", async () => {
    const calls: string[] = [];
    const projection = [bit("scratch-2")];
    const source = bit("scratch-1", { deletedAt: 10 });
    const dataStore = {
      getBits: vi.fn(async () => {
        calls.push("projection");
        return projection;
      }),
      getBit: vi.fn(async () => {
        calls.push("source");
        return source;
      }),
    } as unknown as DataStore;
    getDataStoreMock.mockResolvedValue(dataStore);
    const { result } = renderHook(() =>
      useExternalScratchRemovalData({
        activeRemovalScratchId: null,
        selectedScratchId: null,
        unresolvedRemovalContext: null,
        unresolvedScratchId: null,
      }),
    );

    const snapshot = await result.current.readTerminalSnapshot(
      "inbox",
      "scratch-1",
    );

    expect(calls).toEqual(["projection", "source"]);
    expect(snapshot).toEqual({ projectedActiveScratchBits: projection, source });
  });

  it("clears the cached lifecycle when the removal ends", async () => {
    const dataStore = {
      getBit: vi.fn().mockResolvedValue(bit("scratch-1", { archivedAt: 10 })),
    } as unknown as DataStore;
    getDataStoreMock.mockResolvedValue(dataStore);
    const { result, rerender } = renderHook(
      ({ activeRemovalScratchId, selectedScratchId }) =>
        useExternalScratchRemovalData({
          activeRemovalScratchId,
          selectedScratchId,
          unresolvedRemovalContext: null,
          unresolvedScratchId: null,
        }),
      {
        initialProps: {
          activeRemovalScratchId: "scratch-1" as string | null,
          selectedScratchId: "scratch-1" as string | null,
        },
      },
    );
    await waitFor(() => expect(result.current.observation).not.toBeNull());

    rerender({ activeRemovalScratchId: null, selectedScratchId: null });

    await waitFor(() => expect(result.current.observation).toBeNull());
  });

  it("keeps Zustand and session ownership out of the pure query hook", () => {
    const source = readFileSync(
      join(process.cwd(), "src/hooks/use-external-scratch-removal-data.ts"),
      "utf8",
    );

    expect(source).not.toContain("zustand");
    expect(source).not.toContain("triage-store");
    expect(source).not.toContain("sessionStorage");
  });
});
