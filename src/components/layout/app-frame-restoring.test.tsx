import "@testing-library/jest-dom/vitest";
import { useEffect } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppFrame } from "@/components/layout/app-frame";
import type { EntryState, SessionController } from "@/lib/auth/session";
import { registerForcedBackup } from "@/lib/backup/forced-backup";
import { RESTORING_COPY } from "@/lib/copy/feedback";
import { installMatchMedia } from "@/lib/viewport-test-utils";

// Task 262: the restoring screen over the mounted app (SPEC §Account backup, Restore; work-plan
// review item 3). Forced states stand in for a real restore; they post nothing on the channel.

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

function fakeController(initial: EntryState) {
  const listeners = new Set<() => void>();
  return {
    getState: () => initial,
    subscribe: (l: () => void) => (listeners.add(l), () => listeners.delete(l)),
    start: vi.fn(async () => undefined),
  } as unknown as SessionController;
}

const screenEl = () => document.querySelector<HTMLElement>('[data-app-role="restoring-screen"]');

afterEach(() => {
  act(() => registerForcedBackup(null));
  cleanup();
});

function Listeners({ onEscape, onPalette }: { onEscape: () => void; onPalette: () => void }) {
  useEffect(() => {
    const escape = (event: KeyboardEvent) => event.key === "Escape" && onEscape();
    const palette = (event: KeyboardEvent) => event.key === "k" && event.metaKey && onPalette();
    document.addEventListener("keydown", escape);
    // Registered after the frame's own listener, as the command palette's is.
    window.addEventListener("keydown", palette, { capture: true });
    return () => {
      document.removeEventListener("keydown", escape);
      window.removeEventListener("keydown", palette, { capture: true });
    };
  }, [onEscape, onPalette]);
  return <input aria-label="draft" />;
}

describe("the restoring screen in the app frame", () => {
  it("covers the mounted app, which stays mounted and inert", () => {
    installMatchMedia(1440);
    render(
      <AppFrame controller={fakeController({ phase: "ready" })}>
        <input aria-label="draft" />
      </AppFrame>,
    );
    expect(screenEl()).toBeNull();
    act(() => registerForcedBackup("restoring-getting"));
    expect(screenEl()).toHaveTextContent(RESTORING_COPY.title);
    const draft = screen.getByLabelText("draft");
    expect(draft.closest("[inert]")).not.toBeNull();
    act(() => registerForcedBackup(null));
    expect(screenEl()).toBeNull();
    expect(draft.closest("[inert]")).toBeNull();
  });

  it.each(["restoring-saving", "restoring-other-tab", "restore-finishing"] as const)(
    "%s: Esc and Cmd+K reach no app listener, and a key before it restores them",
    (scenario) => {
      installMatchMedia(1440);
      const onEscape = vi.fn();
      const onPalette = vi.fn();
      render(
        <AppFrame controller={fakeController({ phase: "ready" })}>
          <Listeners onEscape={onEscape} onPalette={onPalette} />
        </AppFrame>,
      );
      fireEvent.keyDown(document.body, { key: "Escape" });
      fireEvent.keyDown(document.body, { key: "k", metaKey: true });
      expect([onEscape.mock.calls.length, onPalette.mock.calls.length]).toEqual([1, 1]);
      act(() => registerForcedBackup(scenario));
      fireEvent.keyDown(document.body, { key: "Escape" });
      fireEvent.keyDown(document.body, { key: "k", metaKey: true });
      // Focus is inside the screen in the real app, so the same keys targeted at it must not get through either.
      fireEvent.keyDown(screenEl()!, { key: "Escape" });
      fireEvent.keyDown(screenEl()!, { key: "k", metaKey: true });
      expect([onEscape.mock.calls.length, onPalette.mock.calls.length]).toEqual([1, 1]);
      act(() => registerForcedBackup(null));
      fireEvent.keyDown(document.body, { key: "Escape" });
      fireEvent.keyDown(document.body, { key: "k", metaKey: true });
      expect([onEscape.mock.calls.length, onPalette.mock.calls.length]).toEqual([2, 2]);
    },
  );

  it("lets a key reach the screen's own Check again button", () => {
    installMatchMedia(1440);
    const onKey = vi.fn();
    render(
      <AppFrame controller={fakeController({ phase: "ready" })}>
        <input aria-label="draft" />
      </AppFrame>,
    );
    act(() => registerForcedBackup("restore-finishing"));
    const button = screenEl()!.querySelector("button")!;
    button.addEventListener("keydown", onKey);
    fireEvent.keyDown(button, { key: "Enter" });
    expect(onKey).toHaveBeenCalledTimes(1);
  });
});
