import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const innerSubscribe = vi.hoisted(() => vi.fn());
const innerUnsubscribe = vi.hoisted(() => vi.fn());
const storeLiveRead = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  getSessionController: () => ({ whenReady: async () => undefined, store: {} }),
}));
vi.mock("@/lib/db/supabase-store", () => ({
  createSupabaseStore: () => ({ liveRead: storeLiveRead }),
}));

describe("liveRead helper", () => {
  beforeEach(() => {
    vi.resetModules();
    innerSubscribe.mockReset();
    innerUnsubscribe.mockReset();
    innerSubscribe.mockReturnValue({ unsubscribe: innerUnsubscribe });
    storeLiveRead.mockReset();
    storeLiveRead.mockReturnValue({ subscribe: innerSubscribe });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("subscribes the store's live read with the observer once the store resolves", async () => {
    const { liveRead } = await import("@/lib/db/datastore");
    const read = vi.fn(async () => 1);
    const observer = { next: vi.fn(), error: vi.fn() };

    liveRead(read).subscribe(observer);
    await vi.waitFor(() => expect(innerSubscribe).toHaveBeenCalledTimes(1));

    expect(storeLiveRead).toHaveBeenCalledWith(read);
    expect(innerSubscribe).toHaveBeenCalledWith(observer);
  });

  it("subscribes nothing when unsubscribed before the store resolves", async () => {
    const { liveRead } = await import("@/lib/db/datastore");

    const subscription = liveRead(async () => 1).subscribe({ next: vi.fn() });
    subscription.unsubscribe();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(storeLiveRead).not.toHaveBeenCalled();
    expect(innerSubscribe).not.toHaveBeenCalled();
  });

  it("unsubscribes the inner subscription when unsubscribed after it started", async () => {
    const { liveRead } = await import("@/lib/db/datastore");

    const subscription = liveRead(async () => 1).subscribe({ next: vi.fn() });
    await vi.waitFor(() => expect(innerSubscribe).toHaveBeenCalledTimes(1));
    subscription.unsubscribe();
    subscription.unsubscribe();

    expect(innerUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("passes the inner observable's read errors to the observer's error", async () => {
    const { liveRead } = await import("@/lib/db/datastore");
    const failure = new Error("read failed");
    innerSubscribe.mockImplementation((observer: { error?: (e: unknown) => void }) => {
      observer.error?.(failure);
      return { unsubscribe: innerUnsubscribe };
    });
    const observer = { next: vi.fn(), error: vi.fn() };

    liveRead(async () => 1).subscribe(observer);
    await vi.waitFor(() => expect(observer.error).toHaveBeenCalledWith(failure));
    expect(observer.next).not.toHaveBeenCalled();
  });

  it("reports a rejected getDataStore() through error, and not after an unsubscribe", async () => {
    vi.resetModules();
    vi.doMock("@/lib/db/supabase-store", () => {
      throw new Error("store unavailable");
    });
    const { liveRead } = await import("@/lib/db/datastore");
    const observer = { next: vi.fn(), error: vi.fn() };
    liveRead(async () => 1).subscribe(observer);
    await vi.waitFor(() => expect(observer.error).toHaveBeenCalledTimes(1));
    expect(observer.next).not.toHaveBeenCalled();

    const closed = { next: vi.fn(), error: vi.fn() };
    liveRead(async () => 1).subscribe(closed).unsubscribe();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(closed.error).not.toHaveBeenCalled();
    vi.doUnmock("@/lib/db/supabase-store");
  });

  it("callers that ask before the account is ready share one store", async () => {
    const { getDataStore } = await import("@/lib/db/datastore");
    const [first, second] = await Promise.all([getDataStore(), getDataStore()]);
    expect(second).toBe(first);
    expect(await getDataStore()).toBe(first);
  });
});
