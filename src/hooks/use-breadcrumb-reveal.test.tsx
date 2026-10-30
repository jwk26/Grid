import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveEscape, useBreadcrumbReveal, useEscapeOrder } from "@/hooks/use-breadcrumb-reveal";

type Props = { enabled: boolean; nodeId: string | null; dragging: boolean };

function setup(initial: Partial<Props> = {}) {
  return renderHook((props: Props) => useBreadcrumbReveal(props), {
    initialProps: { enabled: true, nodeId: "n1", dragging: false, ...initial },
  });
}

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useBreadcrumbReveal", () => {
  it("shows for 3 seconds on entering a Node, then folds into Home", () => {
    const { result } = setup();
    expect(result.current.phase).toBe("shown");

    advance(2999);
    expect(result.current.phase).toBe("shown");
    advance(1);
    expect(result.current.phase).toBe("folding");
    advance(350);
    expect(result.current.phase).toBe("hidden");
    // Home is emphasized once the fold has landed, for 0.6 seconds.
    expect(result.current.landing).toBe(true);
    advance(600);
    expect(result.current.landing).toBe(false);
  });

  it("stays hidden where there is no breadcrumb", () => {
    const { result } = setup({ enabled: false, nodeId: null });
    expect(result.current.phase).toBe("hidden");
    act(() => result.current.homeHandlers.onPointerEnter());
    expect(result.current.phase).toBe("hidden");
  });

  it("restarts the entry reveal for another Node but not for a re-render", () => {
    const { result, rerender } = setup();
    advance(3400);
    expect(result.current.phase).toBe("hidden");

    rerender({ enabled: true, nodeId: "n1", dragging: false });
    expect(result.current.phase).toBe("hidden");

    rerender({ enabled: true, nodeId: "n2", dragging: false });
    expect(result.current.phase).toBe("shown");
  });

  it("shows on hover or focus on Home and hides 1 second after both leave", () => {
    const { result } = setup();
    advance(3400);

    act(() => result.current.homeHandlers.onPointerEnter());
    expect(result.current.phase).toBe("shown");
    act(() => result.current.homeHandlers.onPointerLeave());
    advance(999);
    expect(result.current.phase).toBe("shown");
    advance(1);
    expect(result.current.phase).toBe("folding");
    advance(350);

    act(() => result.current.barHandlers.onFocus());
    expect(result.current.phase).toBe("shown");
    act(() => result.current.barHandlers.onBlur());
    advance(1000);
    expect(result.current.phase).toBe("folding");
  });

  it("does not flap when the pointer moves from Home to the breadcrumb", () => {
    const { result } = setup();
    advance(3400);
    act(() => result.current.homeHandlers.onPointerEnter());
    act(() => result.current.homeHandlers.onPointerLeave());
    advance(300);
    act(() => result.current.barHandlers.onPointerEnter());
    advance(5000);
    expect(result.current.phase).toBe("shown");
  });

  it("keeps an entry reveal that was hovered until 1 second after the pointer left, and never ends it early", () => {
    const { result } = setup();
    advance(500);
    act(() => result.current.homeHandlers.onPointerEnter());
    act(() => result.current.homeHandlers.onPointerLeave());
    advance(1500);
    // The hide delay ended inside the entry reveal: it ends on its own timer.
    expect(result.current.phase).toBe("shown");
    advance(1000);
    expect(result.current.phase).toBe("folding");
  });

  it("keeps the entry reveal past 3 seconds while hovered", () => {
    const { result } = setup();
    act(() => result.current.barHandlers.onPointerEnter());
    advance(10000);
    expect(result.current.phase).toBe("shown");
  });

  it("is shown for a whole drag, in place, and hides 1 second after it", () => {
    const { result, rerender } = setup();
    advance(3400);
    expect(result.current.phase).toBe("hidden");

    rerender({ enabled: true, nodeId: "n1", dragging: true });
    expect(result.current.phase).toBe("shown");
    expect(result.current.instant).toBe(true);
    advance(20000);
    expect(result.current.phase).toBe("shown");

    rerender({ enabled: true, nodeId: "n1", dragging: false });
    // The reveal stays in place: ending the drag does not replay the unfold.
    expect(result.current.instant).toBe(true);
    advance(1000);
    expect(result.current.phase).toBe("folding");
    advance(350);
    expect(result.current.instant).toBe(false);
  });

  it("hover and focus left on a removed segment do not keep it shown after the Node changes", () => {
    // Clicking a segment navigates and removes that button: no pointerleave or blur is sent.
    const { result, rerender } = setup();
    act(() => result.current.barHandlers.onFocus());
    act(() => result.current.barHandlers.onPointerEnter());
    rerender({ enabled: true, nodeId: "n2", dragging: false });
    expect(result.current.phase).toBe("shown");

    advance(3400);
    expect(result.current.phase).toBe("hidden");

    // A later hover still reveals and still hides.
    act(() => result.current.homeHandlers.onPointerEnter());
    act(() => result.current.homeHandlers.onPointerLeave());
    advance(1000);
    expect(result.current.phase).toBe("folding");
  });

  it("a pointer that stays over the bar after a re-render reveals again on its next move", () => {
    const { result } = setup();
    advance(3400);
    act(() => result.current.barHandlers.onPointerMove());
    expect(result.current.phase).toBe("shown");
    act(() => result.current.barHandlers.onPointerLeave());
    advance(1000);
    expect(result.current.phase).toBe("folding");
  });

  it("clears hover and focus when the breadcrumb is disabled", () => {
    const { result, rerender } = setup();
    act(() => result.current.barHandlers.onFocus());
    rerender({ enabled: false, nodeId: null, dragging: false });
    rerender({ enabled: true, nodeId: "n3", dragging: false });
    advance(3400);
    expect(result.current.phase).toBe("hidden");
  });

  it("a reveal started by a drag fades in without moving and ends being one when it folds", () => {
    const { result, rerender } = setup();
    advance(3400);
    rerender({ enabled: true, nodeId: "n1", dragging: true });
    expect(result.current.instant).toBe(true);
    rerender({ enabled: true, nodeId: "n1", dragging: false });
    // The fade-in mode lasts for this reveal only: it clears as the fold starts.
    expect(result.current.instant).toBe(true);
    advance(1000);
    expect(result.current.phase).toBe("folding");
    expect(result.current.instant).toBe(false);
  });

  it("a drag that starts on a reveal already shown keeps it from replaying the unfold", () => {
    const { result, rerender } = setup();
    expect(result.current.instant).toBe(false);
    rerender({ enabled: true, nodeId: "n1", dragging: true });
    expect(result.current.phase).toBe("shown");
    expect(result.current.instant).toBe(true);
    rerender({ enabled: true, nodeId: "n1", dragging: false });
    expect(result.current.instant).toBe(true);
  });

  it("a drag that starts while it is folding shows it without the slide too", () => {
    const { result, rerender } = setup();
    advance(3000);
    expect(result.current.phase).toBe("folding");
    rerender({ enabled: true, nodeId: "n1", dragging: true });
    expect(result.current.phase).toBe("shown");
    expect(result.current.instant).toBe(true);
  });

  it("holds while the deadline picker is open", () => {
    const { result } = setup();
    advance(3400);
    act(() => result.current.homeHandlers.onPointerEnter());
    act(() => result.current.setHeld(true));
    act(() => result.current.homeHandlers.onPointerLeave());
    advance(10000);
    expect(result.current.phase).toBe("shown");
    act(() => result.current.setHeld(false));
    advance(1000);
    expect(result.current.phase).toBe("folding");
  });

  it("dismisses at once and suppresses hover and focus until both leave and one returns", () => {
    const { result } = setup();
    act(() => result.current.homeHandlers.onPointerEnter());
    act(() => result.current.homeHandlers.onFocus());

    act(() => result.current.dismiss());
    expect(result.current.phase).toBe("folding");
    advance(350);
    expect(result.current.phase).toBe("hidden");

    // Still inside Home: more events do not bring it back.
    act(() => result.current.barHandlers.onPointerEnter());
    expect(result.current.phase).toBe("hidden");
    act(() => result.current.barHandlers.onPointerLeave());
    act(() => result.current.homeHandlers.onPointerLeave());
    expect(result.current.phase).toBe("hidden");
    // Focus is still on Home.
    act(() => result.current.homeHandlers.onPointerEnter());
    expect(result.current.phase).toBe("hidden");
    act(() => result.current.homeHandlers.onPointerLeave());
    act(() => result.current.homeHandlers.onBlur());

    // Both left; one returns.
    act(() => result.current.homeHandlers.onPointerEnter());
    expect(result.current.phase).toBe("shown");
  });

  it("an Esc pressed away from Home and the bar does not suppress the first hover on Home", () => {
    const { result } = setup();
    act(() => result.current.dismiss());
    advance(350);
    act(() => result.current.homeHandlers.onPointerEnter());
    expect(result.current.phase).toBe("shown");
  });

  it("keyboard focus on a segment reveals even right after Esc", () => {
    const { result } = setup();
    act(() => result.current.homeHandlers.onPointerEnter());
    act(() => result.current.dismiss());
    advance(350);
    act(() => result.current.barHandlers.onFocus());
    expect(result.current.phase).toBe("shown");
  });

  it("a drag shows it even while hover and focus are suppressed", () => {
    const { result, rerender } = setup();
    act(() => result.current.homeHandlers.onPointerEnter());
    act(() => result.current.dismiss());
    advance(350);
    rerender({ enabled: true, nodeId: "n1", dragging: true });
    expect(result.current.phase).toBe("shown");
  });

  it("under reduced motion it hides in place with no fold time", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const { result } = setup();
    advance(3000);
    advance(0);
    expect(result.current.phase).toBe("hidden");
  });

  it("goes hidden at once when the page no longer has a breadcrumb", () => {
    const { result, rerender } = setup();
    rerender({ enabled: false, nodeId: null, dragging: false });
    expect(result.current.phase).toBe("hidden");
  });
});

describe("resolveEscape", () => {
  const base = { dragging: false, layerOpen: false, held: false, breadcrumbShown: false, editMode: false };

  it("follows the layer order, top-most first", () => {
    const all = { ...base, layerOpen: true, held: true, breadcrumbShown: true, editMode: true };
    expect(resolveEscape(all)).toBe("none");
    expect(resolveEscape({ ...all, layerOpen: false })).toBe("none");
    expect(resolveEscape({ ...all, layerOpen: false, held: false })).toBe("hide-breadcrumb");
    expect(resolveEscape({ ...base, editMode: true })).toBe("exit-edit-mode");
    expect(resolveEscape(base)).toBe("none");
  });

  it("only cancels the drag during a drag, edit mode and breadcrumb included", () => {
    expect(resolveEscape({ ...base, dragging: true, breadcrumbShown: true, editMode: true })).toBe("none");
  });
});

describe("useEscapeOrder", () => {
  function mount(overrides: Partial<Parameters<typeof useEscapeOrder>[0]> = {}) {
    const calls = { hide: vi.fn(), exit: vi.fn(), focusHome: vi.fn() };
    renderHook(() =>
      useEscapeOrder({
        dragging: false,
        isLayerOpen: () => false,
        held: false,
        breadcrumbShown: true,
        editMode: true,
        hideBreadcrumb: calls.hide,
        exitEditMode: calls.exit,
        focusHome: calls.focusHome,
        ...overrides,
      }),
    );
    return calls;
  }

  const press = (key = "Escape") => document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

  it("hides the breadcrumb first (focus to Home first), then exits edit mode on the next press", () => {
    let shown = true;
    const calls = { hide: vi.fn(() => (shown = false)), exit: vi.fn(), focusHome: vi.fn() };
    const { rerender } = renderHook(
      (props: { shown: boolean }) =>
        useEscapeOrder({
          dragging: false,
          isLayerOpen: () => false,
          held: false,
          breadcrumbShown: props.shown,
          editMode: true,
          hideBreadcrumb: calls.hide,
          exitEditMode: calls.exit,
          focusHome: calls.focusHome,
        }),
      { initialProps: { shown } },
    );

    press();
    expect(calls.focusHome).toHaveBeenCalledOnce();
    expect(calls.hide).toHaveBeenCalledOnce();
    expect(calls.exit).not.toHaveBeenCalled();

    rerender({ shown });
    press();
    expect(calls.exit).toHaveBeenCalledOnce();
  });

  it("does nothing while a dialog layer is open, during a drag or while the picker is held", () => {
    for (const overrides of [{ isLayerOpen: () => true }, { dragging: true }, { held: true }]) {
      const calls = mount(overrides);
      press();
      expect(calls.hide).not.toHaveBeenCalled();
      expect(calls.exit).not.toHaveBeenCalled();
    }
  });

  it("yields to a layer that already handled the key and ignores other keys", () => {
    const calls = mount();
    const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    event.preventDefault();
    document.dispatchEvent(event);
    press("Enter");
    expect(calls.hide).not.toHaveBeenCalled();
    expect(calls.exit).not.toHaveBeenCalled();
  });

  it("exits edit mode on a page without a breadcrumb", () => {
    const calls = mount({ breadcrumbShown: false });
    press();
    expect(calls.exit).toHaveBeenCalledOnce();
    expect(calls.hide).not.toHaveBeenCalled();
  });
});

describe("useBreadcrumbReveal focus", () => {
  it("a mouse-clicked button that keeps focus does not keep it shown", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    const button = document.createElement("button");
    document.body.appendChild(button);
    // The browser says this focus came from the pointer.
    button.matches = ((selector: string) => selector !== ":focus-visible") as typeof button.matches;
    button.focus();
    try {
      const { result } = renderHook((props: Props) => useBreadcrumbReveal(props), {
        initialProps: { enabled: true, nodeId: "n1", dragging: false },
      });
      act(() => result.current.barHandlers.onFocus());
      act(() => void vi.advanceTimersByTime(3400));
      expect(result.current.phase).toBe("hidden");
    } finally {
      button.remove();
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
});

describe("useBreadcrumbReveal hover read from the DOM", () => {
  function mountElements(hovered: { home: boolean; bar: boolean }) {
    const home = document.createElement("button");
    home.dataset.appRole = "home-button";
    const bar = document.createElement("div");
    bar.dataset.appRole = "breadcrumb-reveal";
    for (const [element, key] of [[home, "home"], [bar, "bar"]] as const) {
      const matches = element.matches.bind(element);
      element.matches = ((selector: string) =>
        selector === ":hover" ? hovered[key] : matches(selector)) as typeof element.matches;
      document.body.appendChild(element);
    }
    return () => {
      home.remove();
      bar.remove();
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("a pointer move set after the Node-change reset does not outlive the unmounted element", () => {
    // The clicked segment unmounts only after the new Node's chain loads: a move in between sets
    // the hover again, and the unmount sends no pointerleave. The DOM says nothing is hovered.
    const hovered = { home: false, bar: false };
    const cleanup = mountElements(hovered);
    const { result } = renderHook((props: Props) => useBreadcrumbReveal(props), {
      initialProps: { enabled: true, nodeId: "n1", dragging: false },
    });
    act(() => result.current.barHandlers.onPointerMove());
    hovered.bar = false;
    act(() => void vi.advanceTimersByTime(3400));
    expect(result.current.phase).toBe("hidden");
    cleanup();
  });

  it("a hover that reached the bar through a portaled picker is ignored and does not outlive the picker", () => {
    const hovered = { home: false, bar: false };
    const cleanup = mountElements(hovered);
    const portaled = document.createElement("div");
    document.body.appendChild(portaled);
    const bar = document.querySelector('[data-app-role="breadcrumb-reveal"]') as HTMLElement;
    const { result } = renderHook((props: Props) => useBreadcrumbReveal(props), {
      initialProps: { enabled: true, nodeId: "n1", dragging: false },
    });
    act(() => void vi.advanceTimersByTime(3400));
    act(() => result.current.setHeld(true));

    // React delivers it to the bar's handler; the target is outside the bar's DOM.
    act(() => result.current.barHandlers.onPointerEnter({ currentTarget: bar, target: portaled }));
    act(() => result.current.barHandlers.onPointerMove({ currentTarget: bar, target: portaled }));
    act(() => result.current.setHeld(false));
    act(() => void vi.advanceTimersByTime(1000));
    expect(result.current.phase).toBe("folding");

    // Even when a hover did get in, the hold ending reads the DOM.
    act(() => void vi.advanceTimersByTime(400));
    act(() => result.current.homeHandlers.onPointerEnter());
    act(() => result.current.setHeld(true));
    act(() => result.current.barHandlers.onPointerEnter({ currentTarget: bar, target: bar }));
    act(() => result.current.homeHandlers.onPointerLeave());
    hovered.bar = false;
    act(() => result.current.setHeld(false));
    act(() => void vi.advanceTimersByTime(1000));
    expect(result.current.phase).toBe("folding");

    portaled.remove();
    cleanup();
  });

  it("keeps it shown while the DOM says the pointer is still on the bar", () => {
    const hovered = { home: false, bar: true };
    const cleanup = mountElements(hovered);
    const { result } = renderHook((props: Props) => useBreadcrumbReveal(props), {
      initialProps: { enabled: true, nodeId: "n1", dragging: false },
    });
    act(() => result.current.barHandlers.onPointerEnter());
    act(() => void vi.advanceTimersByTime(10000));
    expect(result.current.phase).toBe("shown");
    cleanup();
  });

  it("the hide timer also reads the DOM", () => {
    const hovered = { home: true, bar: false };
    const cleanup = mountElements(hovered);
    const { result } = renderHook((props: Props) => useBreadcrumbReveal(props), {
      initialProps: { enabled: true, nodeId: "n1", dragging: false },
    });
    act(() => void vi.advanceTimersByTime(3400));
    act(() => result.current.homeHandlers.onPointerEnter());
    expect(result.current.phase).toBe("shown");
    act(() => result.current.homeHandlers.onPointerLeave());
    hovered.home = false;
    act(() => void vi.advanceTimersByTime(1000));
    expect(result.current.phase).toBe("folding");
    cleanup();
  });
});
