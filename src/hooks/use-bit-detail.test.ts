import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Bit } from "@/types";

type Observer = { next: (value: unknown) => void; error?: (error: unknown) => void };

const subscriptions = vi.hoisted(
  () => [] as Array<{ observer: Observer; closed: boolean }>,
);
const nav = vi.hoisted(() => ({
  search: "",
  replace: vi.fn(),
}));

vi.mock("@/lib/db/datastore", () => ({
  liveRead: () => ({
    subscribe(observer: Observer) {
      const entry = { observer, closed: false };
      subscriptions.push(entry);
      return {
        unsubscribe() {
          entry.closed = true;
        },
      };
    },
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/grid/n1",
  useRouter: () => ({ replace: nav.replace }),
  useSearchParams: () => new URLSearchParams(nav.search),
}));

import { useBitDetail } from "./use-bit-detail";

function bitFixture(id: string, patch: Partial<Bit> = {}): Bit {
  return { id, title: id, parentId: "n1", deletedAt: null, archivedAt: null, ...patch } as Bit;
}

function emit(index: number, bit: Bit | undefined) {
  act(() => subscriptions[index].observer.next([bit, [], undefined]));
}

beforeEach(() => {
  subscriptions.length = 0;
  nav.search = "bit=b1";
  nav.replace.mockClear();
});

describe("useBitDetail read state", () => {
  it("does not judge the Bit before its read", () => {
    const { result } = renderHook(() => useBitDetail());
    expect(result.current.isOpen).toBe(true);
    expect(result.current.unavailable).toBe(false);
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("keeps a found Bit open", () => {
    const { result } = renderHook(() => useBitDetail());
    emit(0, bitFixture("b1"));
    expect(result.current.unavailable).toBe(false);
    expect(result.current.bit?.id).toBe("b1");
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", undefined],
    ["trashed", bitFixture("b1", { deletedAt: 5 })],
    ["archived", bitFixture("b1", { archivedAt: 5 })],
  ])("removes ?bit= once after the read for a %s Bit", (_name, bit) => {
    nav.search = "bit=b1&tab=x";
    const { result } = renderHook(() => useBitDetail());
    emit(0, bit);
    expect(result.current.unavailable).toBe(true);
    expect(nav.replace).toHaveBeenCalledTimes(1);
    expect(nav.replace).toHaveBeenCalledWith("/grid/n1?tab=x");
    // another emission while ?bit is still in the URL does not navigate again
    emit(0, bit);
    expect(nav.replace).toHaveBeenCalledTimes(1);
  });

  it("does not navigate again after the popup's own close when the Bit then reads as trashed", () => {
    const { result } = renderHook(() => useBitDetail());
    emit(0, bitFixture("b1"));
    act(() => result.current.close());
    expect(nav.replace).toHaveBeenCalledTimes(1);
    emit(0, bitFixture("b1", { deletedAt: 5 }));
    expect(nav.replace).toHaveBeenCalledTimes(1);
  });

  it("does not reopen after a rollback: the Bit comes back found with no ?bit=", () => {
    const { result, rerender } = renderHook(() => useBitDetail());
    emit(0, bitFixture("b1"));
    act(() => result.current.close());
    nav.search = "";
    rerender();
    expect(result.current.isOpen).toBe(false);
    expect(nav.replace).toHaveBeenCalledTimes(1);
  });

  it("judges a Bit reopened by the same id again, but only after its new read", () => {
    const { result, rerender } = renderHook(() => useBitDetail());
    emit(0, bitFixture("b1", { deletedAt: 5 }));
    expect(nav.replace).toHaveBeenCalledTimes(1);
    nav.search = "";
    rerender();
    nav.search = "bit=b1";
    rerender();
    // the Bit was restored from Trash meanwhile: no navigation before the new read
    expect(result.current.unavailable).toBe(false);
    expect(nav.replace).toHaveBeenCalledTimes(1);
    emit(subscriptions.length - 1, bitFixture("b1"));
    expect(result.current.unavailable).toBe(false);
    expect(result.current.bit?.id).toBe("b1");
    expect(nav.replace).toHaveBeenCalledTimes(1);
  });

  it("judges a reopened Bit again when its new read is still unavailable", () => {
    const { rerender } = renderHook(() => useBitDetail());
    emit(0, undefined);
    nav.search = "";
    rerender();
    nav.search = "bit=b1";
    rerender();
    emit(subscriptions.length - 1, undefined);
    expect(nav.replace).toHaveBeenCalledTimes(2);
  });

  it("ignores a late read of the previous Bit id", () => {
    const { result, rerender } = renderHook(() => useBitDetail());
    nav.search = "bit=b2";
    rerender();
    emit(0, undefined);
    expect(result.current.unavailable).toBe(false);
    expect(nav.replace).not.toHaveBeenCalled();
  });
});
