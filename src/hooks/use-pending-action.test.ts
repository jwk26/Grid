import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePendingAction } from "./use-pending-action";

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("usePendingAction", () => {
  it("is busy from the press until the action answers", async () => {
    const { result } = renderHook(() => usePendingAction());
    const gate = deferred();

    let done!: Promise<unknown>;
    act(() => {
      done = result.current.run(() => gate.promise);
    });
    expect(result.current.busy).toBe(true);

    await act(async () => {
      gate.resolve();
      await done;
    });
    expect(result.current.busy).toBe(false);
  });

  it("ignores a second press while the action runs", async () => {
    const { result } = renderHook(() => usePendingAction());
    const gate = deferred();
    let calls = 0;
    const action = () => {
      calls += 1;
      return gate.promise;
    };

    let first!: Promise<unknown>;
    act(() => {
      first = result.current.run(action);
    });
    await act(async () => {
      await result.current.run(action);
    });
    expect(calls).toBe(1);

    await act(async () => {
      gate.resolve();
      await first;
    });
  });

  it("is free again after the action fails, and the failure reaches the caller", async () => {
    const { result } = renderHook(() => usePendingAction());
    const gate = deferred();

    let failed!: Promise<unknown>;
    act(() => {
      failed = result.current.run(() => gate.promise).catch((error: Error) => error);
    });
    await act(async () => {
      gate.reject(new Error("refused"));
      expect(await failed).toEqual(new Error("refused"));
    });
    expect(result.current.busy).toBe(false);
  });
});
