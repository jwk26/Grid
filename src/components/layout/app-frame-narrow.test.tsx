import "@testing-library/jest-dom/vitest";
import { useEffect, useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AppFrame } from "@/components/layout/app-frame";
import type { EntryState, SessionController } from "@/lib/auth/session";
import { NARROW_WINDOW } from "@/lib/copy/feedback";
import { installMatchMedia, setViewportWidth } from "@/lib/viewport-test-utils";

// Task 238, Stage 2: the narrow-window notice (SPEC §Account entry step 1; DESIGN_TOKENS SA-5).

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

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
    signInWithOAuth: vi.fn(async () => "started"),
  };
  return {
    controller: controller as unknown as SessionController,
    set(next: EntryState) {
      state = next;
      act(() => listeners.forEach((listener) => listener()));
    },
  };
}

const notice = () => document.querySelector<HTMLElement>('[data-app-role="narrow-notice"]');
const widen = (width: number) => act(() => setViewportWidth(width));

beforeEach(() => installMatchMedia(1440));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.title = "";
});

function Draft() {
  return <input aria-label="draft" defaultValue="" />;
}

describe("the narrow-window notice", () => {
  it("shows nothing at 1024px and the notice at 1023px, over the mounted app", () => {
    installMatchMedia(1024);
    const fake = fakeController({ phase: "ready" });
    render(
      <AppFrame controller={fake.controller}>
        <Draft />
      </AppFrame>,
    );
    expect(notice()).toBeNull();
    widen(1023);
    expect(notice()).not.toBeNull();
    expect(notice()).toHaveTextContent(NARROW_WINDOW.title);
    expect(notice()).toHaveTextContent(NARROW_WINDOW.reason);
    expect(NARROW_WINDOW.title).toBe("Please use a larger window.");
    expect(NARROW_WINDOW.reason).toBe("grid needs a window at least 1024 pixels wide, such as a desktop browser.");
    expect(screen.getByLabelText("draft")).toBeInTheDocument();
    widen(1024);
    expect(notice()).toBeNull();
  });

  it("shows at first render when the window is already narrow, over every screen of the frame", () => {
    installMatchMedia(700);
    const fake = fakeController({ phase: "security-check" });
    render(
      <AppFrame controller={fake.controller}>
        <Draft />
      </AppFrame>,
    );
    expect(notice()).not.toBeNull();
    fake.set({ phase: "load-failure", reason: "other" } as EntryState);
    expect(notice()).not.toBeNull();
  });

  it("is a dialog with no action, above every app layer", () => {
    installMatchMedia(700);
    const fake = fakeController({ phase: "ready" });
    render(
      <AppFrame controller={fake.controller}>
        <Draft />
      </AppFrame>,
    );
    const card = screen.getByRole("dialog", { name: NARROW_WINDOW.title });
    expect(card).toHaveAttribute("aria-modal", "true");
    expect(card).toHaveAccessibleDescription(NARROW_WINDOW.reason);
    expect(notice()?.querySelectorAll("button, a, input")).toHaveLength(0);
    // The Scratch modal is z-[400]; the notice sits above it.
    expect(notice()?.innerHTML).toMatch(/z-\[500\]/);
  });

  it("puts inert on every body child except the notice, and removes only what it set when the window widens", () => {
    const already = document.createElement("div");
    already.setAttribute("inert", "");
    already.id = "already-inert";
    document.body.append(already);
    installMatchMedia(700);
    const fake = fakeController({ phase: "ready" });
    const { container } = render(
      <AppFrame controller={fake.controller}>
        <Draft />
      </AppFrame>,
    );
    expect(container).toHaveAttribute("inert");
    expect(notice()).not.toHaveAttribute("inert");
    for (const child of document.body.children) {
      if (child !== notice()) expect(child, child.outerHTML.slice(0, 40)).toHaveAttribute("inert");
    }
    widen(1200);
    expect(container).not.toHaveAttribute("inert");
    expect(already).toHaveAttribute("inert");
    already.remove();
  });

  it("makes a portal added while narrow inert too, and frees it on widening", async () => {
    installMatchMedia(700);
    const fake = fakeController({ phase: "ready" });
    render(
      <AppFrame controller={fake.controller}>
        <Draft />
      </AppFrame>,
    );
    const late = document.createElement("div");
    late.id = "late-portal";
    document.body.append(late);
    await act(async () => {
      await Promise.resolve();
    });
    expect(late).toHaveAttribute("inert");
    widen(1200);
    expect(late).not.toHaveAttribute("inert");
    late.remove();
  });

  it("brings back the same screen with the draft intact", () => {
    const fake = fakeController({ phase: "ready" });
    render(
      <AppFrame controller={fake.controller}>
        <Draft />
      </AppFrame>,
    );
    const input = screen.getByLabelText("draft") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "half-written note" } });
    widen(800);
    expect(notice()).not.toBeNull();
    widen(1300);
    expect(notice()).toBeNull();
    expect(screen.getByLabelText("draft")).toBe(input);
    expect(input.value).toBe("half-written note");
  });

  it("returns focus to the element that had it when the window widens", () => {
    const fake = fakeController({ phase: "ready" });
    render(
      <AppFrame controller={fake.controller}>
        <Draft />
      </AppFrame>,
    );
    const input = screen.getByLabelText("draft");
    input.focus();
    widen(800);
    widen(1300);
    expect(document.activeElement).toBe(input);
  });

  it("leaves a modal that was open through narrowing unusable and then intact", async () => {
    const onOpenChange = vi.fn();
    function Modal() {
      const [open, setOpen] = useState(true);
      return (
        <Dialog
          open={open}
          onOpenChange={(next) => {
            onOpenChange(next);
            setOpen(next);
          }}
        >
          <DialogContent>
            <DialogTitle>Account</DialogTitle>
            <DialogDescription>modal body</DialogDescription>
            <input aria-label="modal draft" />
          </DialogContent>
        </Dialog>
      );
    }
    const fake = fakeController({ phase: "ready" });
    render(
      <AppFrame controller={fake.controller}>
        <Modal />
      </AppFrame>,
    );
    fireEvent.change(screen.getByLabelText("modal draft"), { target: { value: "typed" } });
    // Radix arms its outside-press listener one task after it opens.
    await act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
    widen(800);
    const content = document.querySelector('[data-slot="dialog-content"]');
    expect(content?.closest("[inert]")).not.toBeNull();
    // The notice's overlay is outside the dialog; touching it must not dismiss the modal.
    const card = screen.getByRole("dialog", { name: NARROW_WINDOW.title });
    expect(notice()).toHaveClass("pointer-events-auto");
    fireEvent.pointerDown(card);
    fireEvent.mouseDown(card);
    fireEvent.click(card);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalled();
    widen(1300);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(content?.closest("[inert]")).toBeNull();
    expect((screen.getByLabelText("modal draft") as HTMLInputElement).value).toBe("typed");
  });

  it("lets no key reach an app listener while narrow: Escape on document, Cmd+K on window capture", () => {
    const onEscape = vi.fn();
    const onPalette = vi.fn();
    function Listeners() {
      useEffect(() => {
        const escape = (event: KeyboardEvent) => event.key === "Escape" && onEscape();
        const palette = (event: KeyboardEvent) => event.key === "k" && event.metaKey && onPalette();
        document.addEventListener("keydown", escape);
        // Registered after AppFrame's own listener, as the command palette's is.
        window.addEventListener("keydown", palette, { capture: true });
        return () => {
          document.removeEventListener("keydown", escape);
          window.removeEventListener("keydown", palette, { capture: true });
        };
      }, []);
      return null;
    }
    const fake = fakeController({ phase: "ready" });
    render(
      <AppFrame controller={fake.controller}>
        <Listeners />
      </AppFrame>,
    );
    fireEvent.keyDown(document.body, { key: "Escape" });
    fireEvent.keyDown(document.body, { key: "k", metaKey: true });
    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(onPalette).toHaveBeenCalledTimes(1);
    widen(800);
    fireEvent.keyDown(document.body, { key: "Escape" });
    fireEvent.keyDown(document.body, { key: "k", metaKey: true });
    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(onPalette).toHaveBeenCalledTimes(1);
    widen(1300);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onEscape).toHaveBeenCalledTimes(2);
  });

  it("blocks keys even when the app was already ready before AppFrame's effects ran (child effects first)", () => {
    // Children mounted at `ready` register their listeners in passive effects; AppFrame's blocker
    // must be registered earlier than that, so it is a layout effect.
    installMatchMedia(700);
    const onKey = vi.fn();
    function Child() {
      useEffect(() => {
        window.addEventListener("keydown", onKey, { capture: true });
        return () => window.removeEventListener("keydown", onKey, { capture: true });
      }, []);
      return null;
    }
    const fake = fakeController({ phase: "ready" });
    render(
      <AppFrame controller={fake.controller}>
        <Child />
      </AppFrame>,
    );
    fireEvent.keyDown(document.body, { key: "k", metaKey: true });
    expect(onKey).not.toHaveBeenCalled();
  });

  it("does not wrap the app in a new element", () => {
    const fake = fakeController({ phase: "ready" });
    const { container } = render(
      <AppFrame controller={fake.controller}>
        <Draft />
      </AppFrame>,
    );
    expect(container.firstElementChild?.tagName).toBe("INPUT");
    void createPortal;
  });
});
