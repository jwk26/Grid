import { CONNECTION_PROBE_INTERVAL_MS, OFFLINE_AFTER_FAILURES, REQUEST_TIMEOUT_MS } from "@/lib/constants";

// The connection states (SPEC §Connection states), judged from real request results and not from
// `navigator.onLine` alone (S27). One input, `report`; the browser's own online and offline events
// add to it. Nothing here touches the network: the probe and the snapshot refetch are given.

export type ConnectionState = "normal" | "unstable" | "offline";

/**
 * What a request told us. `unreachable`: no answer (status 0, 408, 502–504, a network error, our
 * timeout). `degraded`: the server answered but a background read failed; unstable at most, and
 * it does not count toward offline. `reachable`: the server answered.
 */
export type RequestResult = "reachable" | "unreachable" | "degraded";

export type ConnectionMonitorOptions = {
  /** A lightweight request; true when the server answered. */
  probe: () => Promise<boolean>;
  /** Refetches the account snapshot. */
  refetch: () => Promise<unknown>;
  /** Whether the entry is ready (a snapshot exists to refresh). */
  isReady: () => boolean;
  isBrowserOnline: () => boolean;
  probeIntervalMs?: number;
  probeTimeoutMs?: number;
  offlineAfter?: number;
};

export class ConnectionMonitor {
  private readonly options: ConnectionMonitorOptions;
  private readonly intervalMs: number;
  private readonly offlineAfter: number;
  private readonly probeTimeoutMs: number;
  private state: ConnectionState;
  private failures = 0;
  private started = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private probing = false;
  private readonly listeners = new Set<() => void>();

  constructor(options: ConnectionMonitorOptions) {
    this.options = options;
    this.intervalMs = options.probeIntervalMs ?? CONNECTION_PROBE_INTERVAL_MS;
    this.offlineAfter = options.offlineAfter ?? OFFLINE_AFTER_FAILURES;
    this.probeTimeoutMs = options.probeTimeoutMs ?? REQUEST_TIMEOUT_MS;
    this.state = options.isBrowserOnline() ? "normal" : "offline";
    if (this.state === "offline") this.failures = this.offlineAfter;
  }

  getState = (): ConnectionState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** True while writes are blocked. */
  isOffline = (): boolean => this.state === "offline";

  report(result: RequestResult, detail: { snapshotRead?: boolean } = {}): void {
    if (result === "reachable") {
      // A late answer to a request sent before Wi-Fi went off must not allow writes again.
      if (!this.options.isBrowserOnline()) return;
      this.failures = 0;
      this.set("normal", detail.snapshotRead !== true);
    } else if (result === "unreachable") {
      this.failures += 1;
      this.set(this.failures >= this.offlineAfter ? "offline" : "unstable");
    } else if (this.state === "normal") {
      this.set("unstable");
    }
  }

  start(): void {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    window.addEventListener("offline", this.onBrowserOffline);
    window.addEventListener("online", this.onBrowserOnline);
    window.addEventListener("focus", this.onFocus);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.syncTimer();
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    window.removeEventListener("offline", this.onBrowserOffline);
    window.removeEventListener("online", this.onBrowserOnline);
    window.removeEventListener("focus", this.onFocus);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.clearTimer();
  }

  private set(next: ConnectionState, refetchOnRecovery = false): void {
    const previous = this.state;
    this.state = next;
    if (next !== previous) {
      for (const listener of [...this.listeners]) listener();
      // Every return to normal refetches once, unless the success was itself a snapshot read.
      if (next === "normal" && refetchOnRecovery && this.options.isReady()) void this.options.refetch();
    }
    this.syncTimer();
  }

  private readonly onBrowserOffline = () => {
    this.failures = this.offlineAfter;
    this.set("offline");
  };

  // The browser says it is back; the server has to say so too.
  private readonly onBrowserOnline = () => {
    void this.runProbe();
  };

  private refreshIfUseful(): void {
    if (this.state !== "offline" && this.options.isReady()) void this.options.refetch();
  }

  private readonly onFocus = () => this.refreshIfUseful();

  private readonly onVisibility = () => {
    if (document.visibilityState === "visible") this.refreshIfUseful();
  };

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  // A probe runs every interval while unstable or offline, one at a time, and the loop ends on normal.
  private syncTimer(): void {
    if (!this.started) return;
    if (this.state === "normal") {
      this.clearTimer();
      return;
    }
    if (this.timer !== null || this.probing) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.runProbe();
    }, this.intervalMs);
  }

  private async runProbe(): Promise<void> {
    if (this.probing) return;
    this.probing = true;
    this.clearTimer();
    let answered = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // A probe that never answers is an unanswered request, so the loop goes on.
      answered = await Promise.race([
        this.options.probe(),
        new Promise<boolean>((resolve) => {
          timer = setTimeout(() => resolve(false), this.probeTimeoutMs);
        }),
      ]);
    } catch {
      answered = false;
    }
    clearTimeout(timer);
    this.probing = false;
    this.report(answered ? "reachable" : "unreachable");
    this.syncTimer();
  }
}
