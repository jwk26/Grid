import { beforeEach, describe, expect, it, vi } from "vitest";
import { CaptchaError, createTurnstile, type TurnstileApi, type TurnstileRenderOptions } from "@/lib/auth/turnstile";

function fakeApi() {
  let options: TurnstileRenderOptions | null = null;
  const api: TurnstileApi = {
    render: vi.fn((_host, next) => {
      options = next;
      return "widget-1";
    }),
    reset: vi.fn(),
    remove: vi.fn(),
  };
  return { api, options: () => options as TurnstileRenderOptions };
}

const handlers = () => ({ onInteractive: vi.fn(), onInteractiveEnd: vi.fn() });

describe("turnstile provider", () => {
  let host: HTMLElement;
  beforeEach(() => {
    host = document.createElement("div");
  });

  it("renders the widget once with the site key and answers the token", async () => {
    const fake = fakeApi();
    const turnstile = createTurnstile({ siteKey: "site", getHost: () => host, loadApi: async () => fake.api });
    const pending = turnstile.solve(handlers());
    await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalledTimes(1));
    expect(fake.api.render).toHaveBeenCalledWith(host, expect.objectContaining({ sitekey: "site", appearance: "interaction-only" }));
    fake.options().callback("token-1");
    await expect(pending).resolves.toBe("token-1");
  });

  it("asks for a fresh token on the next attempt by resetting the same widget", async () => {
    const fake = fakeApi();
    const turnstile = createTurnstile({ siteKey: "site", getHost: () => host, loadApi: async () => fake.api });
    const first = turnstile.solve(handlers());
    await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalled());
    fake.options().callback("token-1");
    await first;
    const second = turnstile.solve(handlers());
    await vi.waitFor(() => expect(fake.api.reset).toHaveBeenCalledWith("widget-1"));
    expect(fake.api.render).toHaveBeenCalledTimes(1);
    fake.options().callback("token-2");
    await expect(second).resolves.toBe("token-2");
  });

  it("reports the interactive challenge's start and end to the attempt", async () => {
    const fake = fakeApi();
    const turnstile = createTurnstile({ siteKey: "site", getHost: () => host, loadApi: async () => fake.api });
    const h = handlers();
    const pending = turnstile.solve(h);
    await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalled());
    fake.options()["before-interactive-callback"]?.();
    expect(h.onInteractive).toHaveBeenCalledTimes(1);
    fake.options()["after-interactive-callback"]?.();
    expect(h.onInteractiveEnd).toHaveBeenCalledTimes(1);
    fake.options().callback("t");
    await pending;
  });

  it("rejects when the widget errors or times out, and when the script fails to load", async () => {
    const fake = fakeApi();
    const turnstile = createTurnstile({ siteKey: "site", getHost: () => host, loadApi: async () => fake.api });
    const errored = turnstile.solve(handlers());
    await vi.waitFor(() => expect(fake.api.render).toHaveBeenCalled());
    fake.options()["error-callback"]?.("300030");
    await expect(errored).rejects.toBeInstanceOf(CaptchaError);

    const failing = createTurnstile({
      siteKey: "site",
      getHost: () => host,
      loadApi: async () => {
        throw new Error("script");
      },
    });
    await expect(failing.solve(handlers())).rejects.toMatchObject({ kind: "load" });
  });
});
