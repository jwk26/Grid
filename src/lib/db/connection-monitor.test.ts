import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONNECTION_PROBE_INTERVAL_MS } from "@/lib/constants";
import { ConnectionMonitor, type ConnectionState } from "@/lib/db/connection-monitor";

function make(overrides: Partial<ConstructorParameters<typeof ConnectionMonitor>[0]> = {}) {
  const probe = vi.fn(async () => false);
  const refetch = vi.fn(async () => {});
  let ready = true;
  const monitor = new ConnectionMonitor({
    probe,
    refetch,
    isReady: () => ready,
    isBrowserOnline: () => true,
    ...overrides,
  });
  return { monitor, probe, refetch, setReady: (value: boolean) => (ready = value) };
}

const states = (monitor: ConnectionMonitor) => {
  const seen: ConnectionState[] = [];
  monitor.subscribe(() => seen.push(monitor.getState()));
  return seen;
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("states from request results", () => {
  it("starts normal and stays normal while requests are answered", () => {
    const { monitor } = make();
    monitor.report("reachable");
    expect(monitor.getState()).toBe("normal");
  });

  it("goes unstable on the first unanswered request and offline on the third in a row", () => {
    const { monitor } = make();
    monitor.report("unreachable");
    expect(monitor.getState()).toBe("unstable");
    monitor.report("unreachable");
    expect(monitor.getState()).toBe("unstable");
    monitor.report("unreachable");
    expect(monitor.getState()).toBe("offline");
  });

  it("resets the streak on any answered request", () => {
    const { monitor } = make();
    monitor.report("unreachable");
    monitor.report("unreachable");
    monitor.report("reachable");
    expect(monitor.getState()).toBe("normal");
    monitor.report("unreachable");
    monitor.report("unreachable");
    expect(monitor.getState()).toBe("unstable");
  });

  it("an answered failure only sets unstable and does not count toward offline", () => {
    const { monitor } = make();
    for (let i = 0; i < 5; i += 1) monitor.report("degraded");
    expect(monitor.getState()).toBe("unstable");
  });

  it("an answered failure never lifts offline", () => {
    const { monitor } = make();
    for (let i = 0; i < 3; i += 1) monitor.report("unreachable");
    monitor.report("degraded");
    expect(monitor.getState()).toBe("offline");
  });

  it("notifies subscribers only when the state changes", () => {
    const { monitor } = make();
    const seen = states(monitor);
    monitor.report("reachable");
    monitor.report("unreachable");
    monitor.report("unreachable");
    monitor.report("unreachable");
    monitor.report("unreachable");
    expect(seen).toEqual(["unstable", "offline"]);
  });

  it("a late answer does not lift offline while the browser reports offline", () => {
    let online = true;
    const { monitor } = make({ isBrowserOnline: () => online });
    monitor.start();
    online = false;
    window.dispatchEvent(new Event("offline"));
    monitor.report("reachable");
    expect(monitor.getState()).toBe("offline");
    monitor.stop();
  });

  it("starts offline when the browser reports offline", () => {
    const { monitor } = make({ isBrowserOnline: () => false });
    expect(monitor.getState()).toBe("offline");
  });
});

describe("recovery", () => {
  it("refetches once on the return to normal and clears the state", () => {
    const { monitor, refetch } = make();
    monitor.report("unreachable");
    monitor.report("reachable");
    expect(monitor.getState()).toBe("normal");
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("does not refetch when the success was itself a snapshot read", () => {
    const { monitor, refetch } = make();
    monitor.report("unreachable");
    monitor.report("reachable", { snapshotRead: true });
    expect(refetch).not.toHaveBeenCalled();
  });

  it("does not refetch on a success while already normal", () => {
    const { monitor, refetch } = make();
    monitor.report("reachable");
    expect(refetch).not.toHaveBeenCalled();
  });

  it("does not refetch while the entry is not ready", () => {
    const { monitor, refetch, setReady } = make();
    setReady(false);
    monitor.report("unreachable");
    monitor.report("reachable");
    expect(refetch).not.toHaveBeenCalled();
  });
});

describe("probe", () => {
  it("does not probe while normal", async () => {
    const { monitor, probe } = make();
    monitor.start();
    await vi.advanceTimersByTimeAsync(CONNECTION_PROBE_INTERVAL_MS * 3);
    expect(probe).not.toHaveBeenCalled();
    monitor.stop();
  });

  it("probes every 30 seconds while unstable or offline and recovers on a good probe", async () => {
    const { monitor, probe, refetch } = make();
    monitor.start();
    monitor.report("unreachable");
    await vi.advanceTimersByTimeAsync(CONNECTION_PROBE_INTERVAL_MS - 1);
    expect(probe).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(probe).toHaveBeenCalledTimes(1);
    expect(monitor.getState()).toBe("unstable");

    probe.mockResolvedValue(true);
    await vi.advanceTimersByTimeAsync(CONNECTION_PROBE_INTERVAL_MS);
    expect(probe).toHaveBeenCalledTimes(2);
    expect(monitor.getState()).toBe("normal");
    expect(refetch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(CONNECTION_PROBE_INTERVAL_MS * 3);
    expect(probe).toHaveBeenCalledTimes(2);
    monitor.stop();
  });

  it("a failed probe counts as an unanswered request", async () => {
    const { monitor, probe } = make();
    monitor.start();
    monitor.report("unreachable");
    await vi.advanceTimersByTimeAsync(CONNECTION_PROBE_INTERVAL_MS * 2);
    expect(probe).toHaveBeenCalledTimes(2);
    expect(monitor.getState()).toBe("offline");
    monitor.stop();
  });

  it("never runs two probes at once", async () => {
    let release: (value: boolean) => void = () => {};
    const probe = vi.fn(() => new Promise<boolean>((resolve) => (release = resolve)));
    const { monitor } = make({ probe, probeTimeoutMs: 10 * CONNECTION_PROBE_INTERVAL_MS });
    monitor.start();
    monitor.report("unreachable");
    await vi.advanceTimersByTimeAsync(CONNECTION_PROBE_INTERVAL_MS * 3);
    expect(probe).toHaveBeenCalledTimes(1);
    release(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(monitor.getState()).toBe("normal");
    monitor.stop();
  });

  it("a probe that never answers counts as unreachable and the loop goes on", async () => {
    const probe = vi.fn(() => new Promise<boolean>(() => {}));
    const { monitor } = make({ probe, probeTimeoutMs: 1000 });
    monitor.start();
    monitor.report("unreachable");
    await vi.advanceTimersByTimeAsync(CONNECTION_PROBE_INTERVAL_MS + 1000);
    expect(probe).toHaveBeenCalledTimes(1);
    expect(monitor.getState()).toBe("unstable");
    await vi.advanceTimersByTimeAsync(CONNECTION_PROBE_INTERVAL_MS + 1000);
    expect(probe).toHaveBeenCalledTimes(2);
    expect(monitor.getState()).toBe("offline");
    monitor.stop();
  });

  it("stop() ends the probe loop", async () => {
    const { monitor, probe } = make();
    monitor.start();
    monitor.report("unreachable");
    monitor.stop();
    await vi.advanceTimersByTimeAsync(CONNECTION_PROBE_INTERVAL_MS * 3);
    expect(probe).not.toHaveBeenCalled();
  });
});

describe("browser events", () => {
  it("the offline event makes it offline at once", () => {
    const { monitor } = make();
    monitor.start();
    window.dispatchEvent(new Event("offline"));
    expect(monitor.getState()).toBe("offline");
    monitor.stop();
  });

  it("the online event probes now instead of trusting the browser", async () => {
    const { monitor, probe } = make();
    monitor.start();
    window.dispatchEvent(new Event("offline"));
    probe.mockResolvedValue(true);
    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(0);
    expect(probe).toHaveBeenCalledTimes(1);
    expect(monitor.getState()).toBe("normal");
    monitor.stop();
  });

  it("an online event with a failing probe stays offline", async () => {
    const { monitor } = make();
    monitor.start();
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(0);
    expect(monitor.getState()).toBe("offline");
    monitor.stop();
  });

  it("focus refetches while normal and ready", () => {
    const { monitor, refetch } = make();
    monitor.start();
    window.dispatchEvent(new Event("focus"));
    expect(refetch).toHaveBeenCalledTimes(1);
    monitor.stop();
  });

  it("a tab becoming visible refetches; hidden does not", () => {
    const { monitor, refetch } = make();
    monitor.start();
    const visibility = vi.spyOn(document, "visibilityState", "get");
    visibility.mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(refetch).not.toHaveBeenCalled();
    visibility.mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(refetch).toHaveBeenCalledTimes(1);
    visibility.mockRestore();
    monitor.stop();
  });

  it("focus and visibility refetch while unstable but not while offline", () => {
    const { monitor, refetch } = make();
    monitor.start();
    monitor.report("unreachable");
    window.dispatchEvent(new Event("focus"));
    expect(refetch).toHaveBeenCalledTimes(1);
    monitor.report("unreachable");
    monitor.report("unreachable");
    window.dispatchEvent(new Event("focus"));
    expect(refetch).toHaveBeenCalledTimes(1);
    monitor.stop();
  });

  it("focus does not refetch before the entry is ready", () => {
    const { monitor, refetch, setReady } = make();
    setReady(false);
    monitor.start();
    window.dispatchEvent(new Event("focus"));
    expect(refetch).not.toHaveBeenCalled();
    monitor.stop();
  });

  it("stop() removes the listeners", () => {
    const { monitor, refetch } = make();
    monitor.start();
    monitor.stop();
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("offline"));
    expect(refetch).not.toHaveBeenCalled();
    expect(monitor.getState()).toBe("normal");
  });
});
