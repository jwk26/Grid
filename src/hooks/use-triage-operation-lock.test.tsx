import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toastCopy } from "@/lib/copy/feedback";
import { getConnectionMonitor } from "@/lib/db/connection";
import { resetToasts } from "@/lib/feedback/toast";
import * as toastModule from "@/lib/feedback/toast";
import {
  TRIAGE_OPERATION_KINDS,
  useTriageOperationLock,
} from "./use-triage-operation-lock";

describe("useTriageOperationLock", () => {
  it.each(TRIAGE_OPERATION_KINDS)(
    "makes every %s acquisition mutually exclusive with every operation kind",
    (ownerKind) => {
      for (const competingKind of TRIAGE_OPERATION_KINDS) {
        const { result, unmount } = renderHook(() => useTriageOperationLock());

        act(() => {
          expect(result.current.acquire(ownerKind, `owner-${ownerKind}`)).toBe(true);
          expect(
            result.current.acquire(competingKind, `next-${competingKind}`),
          ).toBe(false);
        });

        expect(result.current.activeOperation).toEqual({
          kind: ownerKind,
          operationId: `owner-${ownerKind}`,
        });
        unmount();
      }
    },
  );

  it("rejects duplicate acquisition without queueing or replaying it", () => {
    const { result } = renderHook(() => useTriageOperationLock());

    act(() => {
      expect(result.current.acquire("add", "operation-1")).toBe(true);
      expect(result.current.acquire("add", "operation-1")).toBe(false);
      expect(result.current.acquire("delete", "operation-2")).toBe(false);
    });

    act(() => {
      expect(result.current.release("operation-1", "applied")).toBe(true);
    });
    expect(result.current.activeOperation).toBeNull();

    act(() => {
      expect(result.current.release("operation-2", "not_applied")).toBe(false);
    });
    expect(result.current.activeOperation).toBeNull();
  });

  it.each([
    "applied",
    "already_applied",
    "not_applied",
    "rejected",
    "conflict",
  ] as const)("releases the matching owner exactly once on terminal %s", (status) => {
    const { result } = renderHook(() => useTriageOperationLock());

    act(() => {
      expect(result.current.acquire("delete", `delete-${status}`)).toBe(true);
    });
    act(() => {
      expect(result.current.release(`delete-${status}`, status)).toBe(true);
      expect(result.current.release(`delete-${status}`, status)).toBe(false);
    });

    expect(result.current.activeOperation).toBeNull();
  });

  it("does not release a different operation identity", () => {
    const { result } = renderHook(() => useTriageOperationLock());

    act(() => {
      expect(result.current.acquire("archive", "archive-1")).toBe(true);
      expect(result.current.release("archive-2", "conflict")).toBe(false);
    });

    expect(result.current.activeOperation).toEqual({
      kind: "archive",
      operationId: "archive-1",
    });
  });

  it("retains an Edit owner across pending and reconciliation until its terminal result", () => {
    const { result } = renderHook(() => useTriageOperationLock());

    act(() => {
      expect(result.current.acquire("edit", "edit-1")).toBe(true);
      expect(result.current.isLocked()).toBe(true);
      expect(result.current.acquire("delete", "delete-1")).toBe(false);
    });
    expect(result.current.activeOperation).toEqual({
      kind: "edit",
      operationId: "edit-1",
    });

    act(() => {
      expect(result.current.release("edit-1", "conflict")).toBe(true);
    });
    expect(result.current.isLocked()).toBe(false);
    expect(result.current.activeOperation).toBeNull();
  });

  it.each(["stage", "unstage"] as const)(
    "retains the %s owner while every competing intent is rejected, then releases only its matching terminal identity",
    (kind) => {
      const { result } = renderHook(() => useTriageOperationLock());
      const operationId = `${kind}-operation`;

      act(() => {
        expect(result.current.acquire(kind, operationId)).toBe(true);
        for (const competingKind of TRIAGE_OPERATION_KINDS) {
          expect(
            result.current.acquire(
              competingKind,
              `${competingKind}-competing`,
            ),
          ).toBe(false);
        }
        expect(result.current.release(`${operationId}-stale`, "applied")).toBe(
          false,
        );
      });
      expect(result.current.activeOperation).toEqual({ kind, operationId });

      act(() => {
        expect(result.current.release(operationId, "conflict")).toBe(true);
      });
      expect(result.current.activeOperation).toBeNull();
    },
  );

  it("retains the placement owner through pending/unknown/reconciling and rejects the complete competing matrix without replay", () => {
    const { result } = renderHook(() => useTriageOperationLock());

    act(() => {
      expect(result.current.acquire("placement", "placement-1")).toBe(true);
      for (const kind of TRIAGE_OPERATION_KINDS) {
        expect(result.current.acquire(kind, `${kind}-competing`)).toBe(false);
      }
      expect(result.current.release("placement-1", "pending" as never)).toBe(false);
      expect(result.current.release("placement-1", "unknown" as never)).toBe(false);
      expect(result.current.release("placement-1", "reconciling" as never)).toBe(false);
    });
    expect(result.current.activeOperation).toEqual({
      kind: "placement",
      operationId: "placement-1",
    });

    act(() => {
      expect(result.current.release("placement-1", "not_applied")).toBe(true);
    });
    expect(result.current.activeOperation).toBeNull();
    expect(result.current.acquire).toBeDefined();
  });

  it("retains the Undo owner through pending/unknown/reconciling and releases only on a terminal result", () => {
    const { result } = renderHook(() => useTriageOperationLock());

    act(() => {
      expect(result.current.acquire("undo", "undo-1")).toBe(true);
      for (const kind of TRIAGE_OPERATION_KINDS) {
        expect(result.current.acquire(kind, `${kind}-competing`)).toBe(false);
      }
      expect(result.current.release("undo-1", "pending" as never)).toBe(false);
      expect(result.current.release("undo-1", "unknown" as never)).toBe(false);
      expect(result.current.release("undo-1", "reconciling" as never)).toBe(false);
    });
    expect(result.current.activeOperation).toEqual({
      kind: "undo",
      operationId: "undo-1",
    });

    act(() => {
      expect(result.current.release("undo-1", "conflict")).toBe(true);
    });
    expect(result.current.activeOperation).toBeNull();
  });

  it("retains the Archive owner through pending/unknown/reconciling and rejects every competing intent without replay", () => {
    const { result } = renderHook(() => useTriageOperationLock());

    act(() => {
      expect(result.current.acquire("archive", "archive-1")).toBe(true);
      for (const kind of TRIAGE_OPERATION_KINDS) {
        expect(result.current.acquire(kind, `${kind}-competing`)).toBe(false);
      }
      expect(result.current.release("archive-1", "pending" as never)).toBe(false);
      expect(result.current.release("archive-1", "unknown" as never)).toBe(false);
      expect(result.current.release("archive-1", "reconciling" as never)).toBe(false);
    });
    expect(result.current.activeOperation).toEqual({
      kind: "archive",
      operationId: "archive-1",
    });

    act(() => {
      expect(result.current.release("archive-1", "rejected")).toBe(true);
    });
    expect(result.current.activeOperation).toBeNull();
  });

  it.each(TRIAGE_OPERATION_KINDS)(
    "exposes the active %s owner synchronously to shared exit blockers",
    (kind) => {
      const { result } = renderHook(() => useTriageOperationLock());

      act(() => {
        expect(result.current.acquire(kind, `${kind}-exit`)).toBe(true);
        expect(result.current.isLocked()).toBe(true);
      });
      expect(result.current.activeOperation).toEqual({
        kind,
        operationId: `${kind}-exit`,
      });

      act(() => {
        expect(result.current.release(`${kind}-exit`, "not_applied")).toBe(true);
      });
      expect(result.current.isLocked()).toBe(false);
    },
  );
});

describe("the offline gate (Task 233)", () => {
  let showToastSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    showToastSpy = vi.spyOn(toastModule, "showToast").mockImplementation(() => {});
  });
  afterEach(() => {
    getConnectionMonitor().setForced(null);
    showToastSpy.mockRestore();
    resetToasts();
  });

  it("stops a write while offline, takes no lock and shows the offline toast", () => {
    getConnectionMonitor().setForced("offline");
    const { result } = renderHook(() => useTriageOperationLock());

    let acquired = true;
    act(() => {
      acquired = result.current.acquire("add", "op-1");
    });

    expect(acquired).toBe(false);
    expect(result.current.isLocked()).toBe(false);
    expect(result.current.activeOperation).toBeNull();
    expect(showToastSpy).toHaveBeenCalledWith(toastCopy.offlineWrite);
  });

  it("lets a reconcile through, with no toast", () => {
    getConnectionMonitor().setForced("offline");
    const { result } = renderHook(() => useTriageOperationLock());

    let acquired = false;
    act(() => {
      acquired = result.current.acquire("add", "op-1", { reconcile: true });
    });

    expect(acquired).toBe(true);
    expect(showToastSpy).not.toHaveBeenCalled();
  });

  it("acquires normally when unstable", () => {
    getConnectionMonitor().setForced("unstable");
    const { result } = renderHook(() => useTriageOperationLock());
    let acquired = false;
    act(() => {
      acquired = result.current.acquire("add", "op-1");
    });
    expect(acquired).toBe(true);
  });
});

describe("held command whose surface is gone (stabilization ST24, ST33, ST37, ST38)", () => {
  const monitor = () => getConnectionMonitor();

  beforeEach(() => {
    monitor().report("reachable");
    monitor().start();
  });
  afterEach(() => {
    monitor().stop();
    monitor().setForced(null);
    monitor().report("reachable");
  });

  const flush = () =>
    act(async () => {
      for (let tick = 0; tick < 10; tick++) await Promise.resolve();
    });

  function setup(status: "applied" | null = null) {
    const check = vi.fn(async () => status);
    const hook = renderHook(() => useTriageOperationLock());
    act(() => {
      hook.result.current.acquire("add", "op-1");
      hook.result.current.holdUnknown?.("op-1", check);
    });
    return { ...hook, check };
  }

  it("a gone surface sends exactly one check, and a terminal answer releases the lock", async () => {
    const { result, check } = setup("applied");
    act(() => result.current.surfaceGone?.("op-1"));
    await flush();
    expect(check).toHaveBeenCalledTimes(1);
    expect(result.current.activeOperation).toBeNull();
  });

  it("a failed check keeps the lock and sends nothing else", async () => {
    const { result, check } = setup(null);
    act(() => result.current.surfaceGone?.("op-1"));
    await flush();
    expect(check).toHaveBeenCalledTimes(1);
    expect(result.current.activeOperation).not.toBeNull();
    act(() => result.current.surfaceGone?.("op-1"));
    await flush();
    // A second report is still only the same surface: the check that started after the mark counts.
    expect(check).toHaveBeenCalledTimes(1);
  });

  it("a holder's own check that started after the surface began to go counts: one request", async () => {
    const { result, check } = setup(null);
    act(() => {
      result.current.markSurfaceGone?.("op-1");
      const done = result.current.noteCheckStart?.("op-1");
      expect(done).not.toBeNull();
      done?.();
    });
    act(() => result.current.surfaceGone?.("op-1"));
    await flush();
    expect(check).not.toHaveBeenCalled();
  });

  it("a check made while the surface was mounted does not count", async () => {
    const { result, check } = setup(null);
    act(() => {
      result.current.noteCheckStart?.("op-1")?.();
    });
    act(() => result.current.surfaceGone?.("op-1"));
    await flush();
    expect(check).toHaveBeenCalledTimes(1);
  });

  it("a mounted check still out when the surface goes: one more check when it fails", async () => {
    const { result, check } = setup(null);
    let done: (() => void) | null = null;
    act(() => {
      done = result.current.noteCheckStart?.("op-1") ?? null;
    });
    act(() => result.current.surfaceGone?.("op-1"));
    await flush();
    expect(check).not.toHaveBeenCalled();
    // The mounted check failed on its own path: the lock is still held, so the owner checks once.
    act(() => (done as unknown as () => void)());
    await flush();
    expect(check).toHaveBeenCalledTimes(1);
  });

  it("a mounted check still out when the surface goes: none when it answers terminal", async () => {
    const { result, check } = setup(null);
    let done: (() => void) | null = null;
    act(() => {
      done = result.current.noteCheckStart?.("op-1") ?? null;
    });
    act(() => result.current.surfaceGone?.("op-1"));
    await flush();
    act(() => {
      result.current.release("op-1", "applied");
      (done as unknown as () => void)();
    });
    await flush();
    expect(check).not.toHaveBeenCalled();
  });

  it("a check that started after the surface began to go, still out at surfaceGone, adds nothing", async () => {
    const { result, check } = setup(null);
    let done: (() => void) | null = null;
    act(() => {
      result.current.markSurfaceGone?.("op-1");
      done = result.current.noteCheckStart?.("op-1") ?? null;
    });
    act(() => result.current.surfaceGone?.("op-1"));
    await flush();
    act(() => (done as unknown as () => void)());
    await flush();
    expect(check).not.toHaveBeenCalled();
  });

  it("sends nothing while a check of the command is out", () => {
    const { result } = setup(null);
    let done: (() => void) | null = null;
    act(() => {
      done = result.current.noteCheckStart?.("op-1") ?? null;
    });
    expect(done).not.toBeNull();
    expect(result.current.noteCheckStart?.("op-1")).toBeNull();
    act(() => (done as unknown as () => void)());
    expect(result.current.noteCheckStart?.("op-1")).not.toBeNull();
  });

  it("after the workspace left, a late registration or check start is refused", () => {
    const { result, unmount } = setup(null);
    unmount();
    const check = vi.fn(async () => null);
    result.current.holdUnknown?.("op-1", check);
    expect(result.current.noteCheckStart?.("op-1")).toBeNull();
    result.current.surfaceGone?.("op-1");
    expect(check).not.toHaveBeenCalled();
  });

  it("drops the deferred check once the workspace left", async () => {
    const { result, check, unmount } = setup(null);
    act(() => result.current.surfaceGone?.("op-1"));
    unmount();
    await flush();
    expect(check).not.toHaveBeenCalled();
  });

  describe("return to normal", () => {
    async function goneAndChecked() {
      const ctx = setup(null);
      act(() => ctx.result.current.surfaceGone?.("op-1"));
      await flush();
      expect(ctx.check).toHaveBeenCalledTimes(1);
      return ctx;
    }

    it("runs one more check after outage evidence, and not again without new evidence", async () => {
      const { check } = await goneAndChecked();
      act(() => {
        window.dispatchEvent(new Event("offline"));
      });
      act(() => monitor().report("reachable"));
      await flush();
      expect(check).toHaveBeenCalledTimes(2);
      // The check's own failure is not evidence: the next return to normal sends nothing.
      act(() => monitor().report("unreachable"));
      act(() => monitor().report("reachable"));
      await flush();
      expect(check).toHaveBeenCalledTimes(2);
    });

    it("a further offline-online cycle sends one more check", async () => {
      const { check } = await goneAndChecked();
      for (let cycle = 0; cycle < 2; cycle++) {
        act(() => {
          window.dispatchEvent(new Event("offline"));
        });
        act(() => monitor().report("reachable"));
        await flush();
      }
      expect(check).toHaveBeenCalledTimes(3);
    });

    it("a check that started while the connection was not normal earns the return", async () => {
      monitor().report("unreachable");
      const { result, check } = setup(null);
      act(() => result.current.surfaceGone?.("op-1"));
      await flush();
      expect(check).toHaveBeenCalledTimes(1);
      act(() => monitor().report("reachable"));
      await flush();
      expect(check).toHaveBeenCalledTimes(2);
    });

    it("a check that only failed on its own path earns nothing", async () => {
      const { check } = await goneAndChecked();
      act(() => monitor().report("unreachable"));
      act(() => monitor().report("reachable"));
      await flush();
      expect(check).toHaveBeenCalledTimes(1);
    });

    it("a development forced state and its end earn nothing", async () => {
      const { check } = await goneAndChecked();
      act(() => monitor().setForced("offline"));
      act(() => monitor().setForced(null));
      await flush();
      expect(check).toHaveBeenCalledTimes(1);
    });

    it("a mounted holder (surface not gone) gets no automatic check", async () => {
      const { check } = setup(null);
      act(() => {
        window.dispatchEvent(new Event("offline"));
      });
      act(() => monitor().report("reachable"));
      await flush();
      expect(check).not.toHaveBeenCalled();
    });

    it("a return to normal during a holder's check sends no second request and is judged when it fails", async () => {
      const ctx = setup(null);
      act(() => ctx.result.current.markSurfaceGone?.("op-1"));
      let done: (() => void) | null = null;
      act(() => {
        done = ctx.result.current.noteCheckStart?.("op-1") ?? null;
        window.dispatchEvent(new Event("offline"));
      });
      act(() => monitor().report("reachable"));
      await flush();
      expect(ctx.check).not.toHaveBeenCalled();
      act(() => (done as unknown as () => void)());
      await flush();
      expect(ctx.check).toHaveBeenCalledTimes(1);
    });

    it("a terminal answer releases the lock and ends the record", async () => {
      const ctx = setup("applied");
      act(() => ctx.result.current.surfaceGone?.("op-1"));
      await flush();
      act(() => {
        window.dispatchEvent(new Event("offline"));
      });
      act(() => monitor().report("reachable"));
      await flush();
      expect(ctx.check).toHaveBeenCalledTimes(1);
      expect(ctx.result.current.activeOperation).toBeNull();
    });

    it("leaving the workspace drops the record: nothing is sent", async () => {
      const ctx = await goneAndChecked();
      ctx.unmount();
      act(() => {
        window.dispatchEvent(new Event("offline"));
      });
      act(() => monitor().report("reachable"));
      await flush();
      expect(ctx.check).toHaveBeenCalledTimes(1);
    });
  });
});
