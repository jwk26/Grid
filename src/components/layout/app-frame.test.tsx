import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppFrame } from "@/components/layout/app-frame";
import type { EntryState, SessionController } from "@/lib/auth/session";

function fakeController(initial: EntryState) {
  let state = initial;
  const listeners = new Set<() => void>();
  const controller = {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: vi.fn(async () => undefined),
    retry: vi.fn(async () => undefined),
    continueAsGuest: vi.fn(async () => undefined),
  };
  return {
    controller: controller as unknown as SessionController,
    spies: controller,
    set(next: EntryState) {
      state = next;
      act(() => listeners.forEach((listener) => listener()));
    },
  };
}

afterEach(cleanup);

const App = () => <div data-testid="app">app</div>;

describe("AppFrame", () => {
  it("starts entry and shows nothing, not even the app, while entering", () => {
    const { controller, spies } = fakeController({ phase: "entering" });
    const { container } = render(
      <AppFrame controller={controller}>
        <App />
      </AppFrame>,
    );
    expect(spies.start).toHaveBeenCalledTimes(1);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the app only while the account is ready, and unmounts it when entry runs again", () => {
    const fake = fakeController({ phase: "ready" });
    const { container } = render(
      <AppFrame controller={fake.controller}>
        <App />
      </AppFrame>,
    );
    expect(screen.getByTestId("app")).toBeInTheDocument();
    fake.set({ phase: "entering" });
    expect(screen.queryByTestId("app")).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
    fake.set({ phase: "ready" });
    expect(screen.getByTestId("app")).toBeInTheDocument();
  });

  it.each([
    ["unreachable", "The server can't be reached. Check your connection and try again."],
    ["other", "Something went wrong while loading."],
  ] as const)("shows the load failure with its %s reason, focuses Retry and retries", (reason, line) => {
    const { controller, spies } = fakeController({ phase: "load-failure", reason });
    render(
      <AppFrame controller={controller}>
        <App />
      </AppFrame>,
    );
    expect(screen.getByRole("heading", { name: "Couldn't load your grid." })).toBeInTheDocument();
    expect(screen.getByText(line)).toBeInTheDocument();
    const retry = screen.getByRole("button", { name: "Retry" });
    expect(retry).toHaveFocus();
    expect(screen.queryByTestId("app")).not.toBeInTheDocument();
    fireEvent.click(retry);
    expect(spies.retry).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["turnstile", "The security check didn't pass."],
    ["rate-limit", "Too many guest sessions were started from this network. Try again later."],
    ["unreachable", "The server can't be reached. Check your connection and try again."],
  ] as const)("shows the guest-creation failure for %s", (reason, line) => {
    const { controller } = fakeController({ phase: "guest-failure", reason });
    render(
      <AppFrame controller={controller}>
        <App />
      </AppFrame>,
    );
    expect(screen.getByRole("heading", { name: "Couldn't start a guest session." })).toBeInTheDocument();
    expect(screen.getByText(line)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toHaveFocus();
  });

  it("moves focus to the first action when the screen changes", () => {
    const fake = fakeController({ phase: "load-failure", reason: "other" });
    render(
      <AppFrame controller={fake.controller}>
        <App />
      </AppFrame>,
    );
    fake.set({ phase: "guest-failure", reason: "other" });
    expect(screen.getByRole("button", { name: "Retry" })).toHaveFocus();
  });

  it("shows the session-expired variants with Continue as guest only", () => {
    const fake = fakeController({ phase: "session-expired", variant: "account" });
    render(
      <AppFrame controller={fake.controller}>
        <App />
      </AppFrame>,
    );
    expect(screen.getByRole("heading", { name: "Your sign-in expired." })).toBeInTheDocument();
    expect(screen.getByText("Your saved data is safe. The last change may not have been saved.")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    fake.set({ phase: "session-expired", variant: "guest" });
    expect(screen.getByRole("heading", { name: "Your guest session ended." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue as guest" }));
    expect(fake.spies.continueAsGuest).toHaveBeenCalledTimes(1);
  });
});
