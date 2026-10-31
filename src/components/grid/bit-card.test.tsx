import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useArchiveActions } from "@/hooks/use-archive";
import { useEditModeStore } from "@/stores/edit-mode-store";
import type { Bit } from "@/types";
import { BitCard } from "./bit-card";

const dndState = vi.hoisted(() => ({ active: null as { id: string } | null }));

import type { NewlyUndoSlotModel } from "./newly-undo-slot";

function slot(over: Partial<NewlyUndoSlotModel> = {}): NewlyUndoSlotModel {
  return {
    status: null,
    phaseKey: "",
    sentence: "Undo this placement.",
    disabled: false,
    label: "Undo placement of item",
    onActivate: vi.fn(),
    reason: "available",
    ...over,
  };
}

vi.mock("@dnd-kit/core", () => ({
  useDndContext: () => ({ active: dndState.active }),
}));

vi.mock("@/hooks/use-archive", () => ({
  useArchiveActions: vi.fn(() => ({ archive: vi.fn() })),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode; asChild?: boolean }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
}));

function createBit(overrides: Partial<Bit>): Bit {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "Bit",
    description: overrides.description ?? "",
    icon: overrides.icon ?? "Folder",
    deadline: overrides.deadline ?? null,
    deadlineAllDay: overrides.deadlineAllDay ?? false,
    priority: overrides.priority ?? null,
    status: overrides.status ?? "active",
    mtime: overrides.mtime ?? Date.now(),
    createdAt: overrides.createdAt ?? Date.now(),
    parentId: overrides.parentId ?? "parent-node",
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    deletedAt: overrides.deletedAt ?? null,
    archivedAt: overrides.archivedAt ?? null,
    version: overrides.version ?? 1,
    pastDeadlineDismissed: overrides.pastDeadlineDismissed ?? false,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-25T00:00:00.000Z"));
  useEditModeStore.setState({ isEditMode: false });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.useRealTimers();
  useEditModeStore.setState({ isEditMode: false });
});

describe("BitCard urgency blink", () => {
  it.each([1, 2, 3])("is static in the Inbox Explorer at urgency level %i and keeps blinking in the ordinary Grid", (days) => {
    const bit = createBit({title: "Soon", status: "active", deadline: Date.now() + days * 86400000 - 3600000});
    const view = render(<BitCard presentation="inbox-explorer" aria-label={bit.title} bit={bit} parentColor="red" chunkStats={{completed: 0, total: 0}} onClick={vi.fn()} />);
    expect(screen.getByRole("button", {name: bit.title}).className).not.toContain("animate-urgency-blink");
    view.rerender(<BitCard aria-label={bit.title} bit={bit} parentColor="red" chunkStats={{completed: 0, total: 0}} onClick={vi.fn()} />);
    expect(screen.getByRole("button", {name: bit.title}).className).toContain("animate-urgency-blink");
  });
});

describe("BitCard", () => {
  it.each([
    {status: "active" as const, overdue: true, label: "Overdue", struck: false},
    {status: "complete" as const, overdue: false, label: "Completed", struck: true},
    {status: "complete" as const, overdue: true, label: "Completed", struck: true},
  ])("projects Finder $status overdue=$overdue without importing Grid commands", ({status, overdue, label, struck}) => {
    const bit = createBit({title: "Readable state", status, icon: "Star", priority: "high", deadline: Date.now() + (overdue ? -86400000 : 86400000)});
    const activateUndo = vi.fn();
    const view = render(<BitCard presentation="inbox-explorer" aria-label={bit.title} bit={bit} parentColor="red" chunkStats={{completed: 1, total: 4}} onClick={vi.fn()} isNewlyPlaced undo={slot({ label: "Undo placement of Readable state",disabled: false, reason: "available", onActivate: activateUndo})} />);
    const card = screen.getByRole("button", {name: bit.title});
    expect(card).toHaveClass("cursor-default");
    expect(card).not.toHaveClass("cursor-grab", "active:cursor-grabbing", "opacity-50");
    expect(card.className).not.toContain("animate-urgency-blink");
    const title = card.querySelector('[data-triage-role="explorer-card-title"]');
    if (struck) expect(title).toHaveClass("line-through");
    else expect(title).not.toHaveClass("line-through");
    expect(card.querySelector('[data-triage-role="explorer-card-state"]')).toHaveAccessibleName(label);
    expect(card.querySelector('[data-triage-role="explorer-card-overdue"]')).toBeNull();
    expect(card.querySelector('[data-triage-role="explorer-card-deadline"]')).toBeVisible();
    expect(card.querySelector('[data-triage-role="explorer-card-priority"]')).toHaveTextContent("high");
    expect(screen.queryByLabelText(bit.title + " options")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Mark as done")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Dismiss")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {name: "Undo placement of " + bit.title}));
    expect(activateUndo).toHaveBeenCalledOnce();
    expect(screen.getByText("NEW")).toBeVisible();
    view.rerender(<BitCard presentation="inbox-explorer" aria-label={bit.title} bit={{...bit, icon:"Heart"}} parentColor="red" chunkStats={{completed:1,total:4}} onClick={vi.fn()} />);
    expect(card.querySelector('[data-triage-role="explorer-card-icon"]')).toHaveClass("lucide-heart");
    view.rerender(<BitCard aria-label={bit.title} bit={bit} parentColor="red" chunkStats={{completed:1,total:4}} onClick={vi.fn()} />);
    expect(card).toHaveClass("cursor-grab", "active:cursor-grabbing");
    expect(screen.getByLabelText(bit.title + " options")).toBeInTheDocument();
    if (overdue) expect(screen.getByLabelText("Mark as done")).toBeInTheDocument();
  });

  it("keeps Finder metadata, icon identity, ref, activation and independent Undo on the actual BitCard", () => {
    const bit = createBit({ title: "Mixed Case Bit", icon: "FileText", deadline: Date.now() + 86400000, priority: "high" });
    const navigate = vi.fn(), activateUndo = vi.fn();
    const ref = { current: null as HTMLDivElement | null };
    const view = render(<BitCard presentation="inbox-explorer" aria-label={bit.title} bit={bit} parentColor="red"
      chunkStats={{ completed: 1, total: 4 }} onClick={navigate} ref={ref} isNewlyPlaced
      undo={slot({ label: "Undo placement of Mixed Case Bit", disabled: false, reason: "available", onActivate: activateUndo })} />);
    const card = screen.getByRole("button", { name: bit.title });
    expect(card).toHaveAttribute("data-card-presentation", "inbox-explorer");
    expect(card).toHaveAttribute("data-triage-role", "explorer-card-bit");
    expect(ref.current).toBe(card);
    expect(card.querySelector('[data-triage-role="explorer-card-icon"]')).toHaveClass("lucide-file-text");
    expect(card.querySelector('[data-triage-role="explorer-card-deadline"]')).toHaveTextContent("Mar 26");
    expect(card.querySelector('[data-triage-role="explorer-card-priority"]')).toHaveTextContent("high");
    expect(card.querySelector('[data-triage-role="explorer-card-progress"]')).toHaveTextContent("1/4");
    fireEvent.click(screen.getByRole("button", { name: "Undo placement of " + bit.title }));
    expect(activateUndo).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
    fireEvent.keyDown(card, { key: "Enter" });
    expect(navigate).toHaveBeenCalledOnce();
    view.rerender(<BitCard bit={bit} parentColor="red" chunkStats={{ completed: 1, total: 4 }} onClick={navigate} ref={ref} />);
    expect(ref.current).toBe(card);
    expect(card).toHaveAttribute("data-card-presentation", "default");
    expect(card).toHaveClass("rounded-[10px]", "inline-flex");
  });
  it("layers an independent semantic Newly Placed marker on the actual card", () => {
    const bit = createBit({ title: "Placed bit" });
    const { rerender } = render(
      <BitCard
        bit={bit}
        chunkStats={{ completed: 0, total: 0 }}
        isNewlyPlaced={true}
        onClick={vi.fn()}
        parentColor="hsl(221, 83%, 53%)"
      />,
    );

    const marker = screen.getByText("NEW");
    expect(marker).toHaveAttribute("data-card-marker", "newly-placed");
    expect(marker.closest('[data-newly-placed="true"]')).not.toBeNull();
    expect(screen.getByText("Placed bit")).toBeInTheDocument();

    rerender(
      <BitCard
        bit={bit}
        chunkStats={{ completed: 0, total: 0 }}
        onClick={vi.fn()}
        parentColor="hsl(221, 83%, 53%)"
      />,
    );
    expect(screen.queryByText("NEW")).not.toBeInTheDocument();
  });

  it("keeps marker and Undo eligibility independent and never bubbles Undo into navigation", () => {
    const bit = createBit({ title: "Undo bit" });
    const navigate = vi.fn();
    const activateUndo = vi.fn();
    render(
      <BitCard
        bit={bit}
        chunkStats={{ completed: 0, total: 0 }}
        isNewlyPlaced={true}
        onClick={navigate}
        parentColor="hsl(221, 83%, 53%)"
        undo={slot({ label: "Undo placement of Undo bit", disabled: false, onActivate: activateUndo, reason: "available" })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Undo placement of Undo bit" }));
    expect(activateUndo).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByText("NEW")).toBeInTheDocument();
  });

  it("keeps unavailable Undo focusable and suppresses activation", () => {
    const bit = createBit({ title: "Blocked bit" });
    const activateUndo = vi.fn();
    render(
      <BitCard
        bit={bit}
        chunkStats={{ completed: 0, total: 0 }}
        isNewlyPlaced={true}
        onClick={vi.fn()}
        parentColor="hsl(221, 83%, 53%)"
        undo={slot({ label: "Undo placement of Blocked bit", disabled: true, onActivate: activateUndo, reason: "dependencies" })}
      />,
    );

    const unavailableUndo = screen.getByRole("button", {
      name: "Undo placement of Blocked bit",
    });
    expect(unavailableUndo).toHaveAttribute("aria-disabled", "true");
    expect(unavailableUndo).not.toBeDisabled();
    fireEvent.click(unavailableUndo);
    expect(activateUndo).not.toHaveBeenCalled();
  });

  it("renders deadline, priority, progress, and aging saturation", () => {
    const handleClick = vi.fn();
    const bit = createBit({
      title: "Ship Phase 4",
      priority: "high",
      deadline: new Date("2026-03-27T00:00:00.000Z").getTime(),
      mtime: new Date("2026-03-18T00:00:00.000Z").getTime(),
    });
    const { container } = render(
      <BitCard
        bit={bit}
        chunkStats={{ completed: 1, total: 4 }}
        onClick={handleClick}
        parentColor="hsl(120, 100%, 40%)"
      />,
    );

    const card = screen.getByText("Ship Phase 4").closest('[role="button"]');

    expect(card).not.toBeNull();
    expect(card).toHaveStyle({ filter: "saturate(0.5) brightness(0.9)" });
    expect(screen.getByText("Mar 27")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
    expect(container.querySelector('[style*="width: 25%"]')).not.toBeNull();

    fireEvent.click(card!);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("shows overdue overlay with check and dismiss buttons on past-deadline bits", () => {
    const bit = createBit({
      title: "Overdue bit",
      deadline: new Date("2026-03-24T00:00:00.000Z").getTime(),
    });
    render(
      <BitCard
        bit={bit}
        chunkStats={{ completed: 0, total: 0 }}
        onClick={vi.fn()}
        parentColor="hsl(221, 83%, 53%)"
      />,
    );

    expect(screen.getByText("Overdue bit")).toHaveClass("line-through");
    expect(screen.getByText("Done?")).toBeInTheDocument();
    expect(screen.getByLabelText("Mark as done")).toBeInTheDocument();
    expect(screen.getByLabelText("Dismiss")).toBeInTheDocument();
  });

  it("shows delete overlay in edit mode", () => {
    useEditModeStore.setState({ isEditMode: true });
    const bit = createBit({ title: "Active bit" });
    render(
      <BitCard
        bit={bit}
        chunkStats={{ completed: 0, total: 0 }}
        onClick={vi.fn()}
        parentColor="hsl(221, 83%, 53%)"
      />,
    );

    const card = screen.getByText("Active bit").closest('[role="button"]');

    expect(card).not.toBeNull();
    expect(card).toHaveClass("motion-safe:animate-jiggle");
    expect(screen.getByLabelText("Delete Active bit")).toBeInTheDocument();
  });

  it("keeps the card-root drag cursor contract without forcing full-cell sizing", () => {
    const bit = createBit({
      title: "Cursor probe",
      deadline: new Date("2026-03-27T00:00:00.000Z").getTime(),
      priority: "high",
    });

    render(
      <BitCard
        bit={bit}
        chunkStats={{ completed: 1, total: 4 }}
        onClick={vi.fn()}
        parentColor="hsl(221, 83%, 53%)"
      />,
    );

    const card = screen.getByText("Cursor probe").closest('[role="button"]');

    expect(card).not.toBeNull();
    expect(card).toHaveClass(
      "inline-flex",
      "shrink-0",
      "z-10",
      "cursor-grab",
      "active:cursor-grabbing",
      "select-none",
    );
    expect(card).not.toHaveClass("h-full", "w-full", "overflow-hidden");
  });

  it("keeps passive content layers pointer-enabled while the card stays the drag owner", () => {
    const bit = createBit({
      title: "Pointer target probe",
      deadline: new Date("2026-03-27T00:00:00.000Z").getTime(),
      priority: "high",
    });

    render(
      <BitCard
        bit={bit}
        chunkStats={{ completed: 1, total: 4 }}
        onClick={vi.fn()}
        parentColor="hsl(221, 83%, 53%)"
      />,
    );

    const card = screen.getByText("Pointer target probe").closest('[role="button"]');

    expect(card).not.toBeNull();
    expect(card?.children[0]).not.toHaveClass("pointer-events-none");
    expect(card?.children[1]).not.toHaveClass("pointer-events-none");
  });
});

describe("B2b — archive context menu (BitCard)", () => {
  const mockArchive = vi.fn();

  beforeEach(() => {
    vi.mocked(useArchiveActions).mockReturnValue({ archive: mockArchive });
  });

  it("shows the options trigger in normal mode", () => {
    const bit = createBit({ title: "Design sprint" });
    render(
      <BitCard bit={bit} chunkStats={{ completed: 0, total: 0 }} onClick={vi.fn()} parentColor="hsl(221, 83%, 53%)" />,
    );
    expect(screen.getByLabelText("Design sprint options")).toBeInTheDocument();
  });

  it("shows the Archive menu item", () => {
    const bit = createBit({ title: "Design sprint" });
    render(
      <BitCard bit={bit} chunkStats={{ completed: 0, total: 0 }} onClick={vi.fn()} parentColor="hsl(221, 83%, 53%)" />,
    );
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
  });

  it("calls archive('bit', id) when Archive is clicked", () => {
    const bit = createBit({ title: "Design sprint" });
    render(
      <BitCard bit={bit} chunkStats={{ completed: 0, total: 0 }} onClick={vi.fn()} parentColor="hsl(221, 83%, 53%)" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(mockArchive).toHaveBeenCalledWith("bit", bit.id);
  });

  it("hides the options trigger in edit mode", () => {
    useEditModeStore.setState({ isEditMode: true });
    const bit = createBit({ title: "Design sprint" });
    render(
      <BitCard bit={bit} chunkStats={{ completed: 0, total: 0 }} onClick={vi.fn()} parentColor="hsl(221, 83%, 53%)" />,
    );
    expect(screen.queryByLabelText("Design sprint options")).not.toBeInTheDocument();
  });
});


describe("Task170 Newly Undo pilot Bit Q01", () => {
  it("keeps common-base Bit NEW and Undo optional while preserving metadata", () => {
    const item = createBit({ title: "Common Bit", priority: "high", deadline: Date.now() + 86400000 });
    const view = render(<BitCard presentation="inbox-explorer" bit={item} parentColor="red" chunkStats={{completed:1,total:4}} onClick={vi.fn()} />);
    expect(view.container.querySelector('[data-card-marker="newly-placed"]')).toBeNull();
    expect(view.container.querySelector('[data-triage-role="explorer-card-undo"]')).toBeNull();
    expect(screen.getByText("Common Bit")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
    expect(screen.getByText("1/4")).toBeInTheDocument();
    expect(view.container.querySelector('[data-triage-role="explorer-card-deadline"]')).toBeInTheDocument();
    view.rerender(<BitCard presentation="inbox-explorer" bit={item} parentColor="red" chunkStats={{completed:1,total:4}} onClick={vi.fn()} isNewlyPlaced />);
    expect(view.container.querySelector('[data-card-marker="newly-placed"]')).toHaveTextContent("NEW");
    expect(view.container.querySelector('[data-triage-role="explorer-card-undo"]')).toBeNull();
  });
  it("renders an ordinary inbox Undo2 independently and exposes the exact tooltip reason", () => {
    const item=createBit({title:"Pilot bit"}); const navigate=vi.fn(), activate=vi.fn();
    const {container}=render(<BitCard presentation="inbox-explorer" bit={item} parentColor="red" chunkStats={{completed:1,total:4}} onClick={navigate} isNewlyPlaced undo={slot({ label: "Undo placement of Pilot bit",disabled:false,reason:"available",sentence:"Undo this placement.",onActivate:activate})} />);
    const action=screen.getByRole("button",{name:"Undo placement of Pilot bit"});
    expect(action.querySelector("svg.lucide-undo-2")).not.toBeNull();
    expect(action).not.toHaveTextContent("Undo");
    expect(container.querySelector('[data-card-marker="newly-placed"]')).toHaveTextContent("NEW");
    fireEvent.keyDown(action,{key:"Enter"});fireEvent.keyDown(action,{key:" "});
    expect(navigate).not.toHaveBeenCalled();
    fireEvent.click(action);expect(activate).toHaveBeenCalledOnce();expect(navigate).not.toHaveBeenCalled();
  });
});


it("Task170 Bit unavailable Undo exposes its exact reason on semantic focus and preserves its ref", async () => {
  vi.useRealTimers();
  // JSDOM has no layout observer; this shim enables semantic tooltip DOM only.
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  const item=createBit({title:"Tooltip bit"});const activate=vi.fn(),navigate=vi.fn(),ref=vi.fn();
  render(<BitCard presentation="inbox-explorer" bit={item} parentColor="red" chunkStats={{completed:1,total:4}} onClick={navigate} isNewlyPlaced undoActionRef={ref} undo={slot({ label: "Undo placement of Tooltip bit",disabled:true,reason:"result-mutated",sentence:"This item changed after placement. Undo is unavailable.",onActivate:activate})} />);
  const action=screen.getByRole("button",{name:"Undo placement of Tooltip bit"});
  expect(action).toHaveAttribute("aria-disabled","true");expect(action).not.toBeDisabled();expect(ref).toHaveBeenCalledWith(action);
  fireEvent.focus(action);expect(await screen.findByRole("tooltip")).toHaveTextContent("This item changed after placement. Undo is unavailable.");
  fireEvent.keyDown(action,{key:"Enter"});fireEvent.keyDown(action,{key:" "});fireEvent.click(action);
  expect(activate).not.toHaveBeenCalled();expect(navigate).not.toHaveBeenCalled();
});

describe("Task 179A Explorer truncated-title tooltip", () => {
  const TITLE_ROLE = '[data-triage-role="explorer-title-tooltip"]';
  const item = createBit({ title: "A very long stored title" });
  let view: ReturnType<typeof render>;
  let widths = { scroll: 0, client: 0 };
  let focusVisible = true;
  const originalMatches = Element.prototype.matches;

  beforeEach(() => {
    vi.useRealTimers();
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    widths = { scroll: 200, client: 100 };
    focusVisible = true;
    dndState.active = null;
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", { configurable: true, get: () => widths.scroll });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => widths.client });
    // jsdom never matches :focus-visible; the gate is exercised through this stub.
    Element.prototype.matches = function (selector: string) {
      if (selector === ":focus-visible") return focusVisible;
      return originalMatches.call(this, selector);
    };
  });

  afterEach(() => {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollWidth;
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
    Element.prototype.matches = originalMatches;
  });

  const open = () => document.querySelector(TITLE_ROLE);
  const title = () => document.querySelector('[data-triage-role="explorer-card-title"]') as HTMLElement;
  const root = () => document.querySelector('[data-triage-role="explorer-card-bit"]') as HTMLElement;
  const undoProps = slot();
  const hover = () => fireEvent.pointerMove(title(), { pointerType: "mouse" });

  it("shows the full title above a truncated title on pointer hover and none for a fitting title", async () => {
    view = render(<BitCard presentation="inbox-explorer" bit={item} parentColor="#fff" chunkStats={{ completed: 0, total: 0 }} onClick={vi.fn()} />);
    hover();
    await waitFor(() => expect(open()).toHaveTextContent("A very long stored title"));
    cleanup();
    widths = { scroll: 100, client: 100 };
    view = render(<BitCard presentation="inbox-explorer" bit={item} parentColor="#fff" chunkStats={{ completed: 0, total: 0 }} onClick={vi.fn()} />);
    hover();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(open()).toBeNull();
  });

  it("detects sub-pixel overflow through a text Range width", async () => {
    widths = { scroll: 100, client: 100 };
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 100 } as DOMRect);
    const rangeSpy = vi.spyOn(document, "createRange").mockReturnValue({
      selectNodeContents: vi.fn(),
      getBoundingClientRect: () => ({ width: 100.4 }),
    } as unknown as Range);
    view = render(<BitCard presentation="inbox-explorer" bit={item} parentColor="#fff" chunkStats={{ completed: 0, total: 0 }} onClick={vi.fn()} />);
    hover();
    await waitFor(() => expect(open()).not.toBeNull());
    rangeSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("does not treat a shrink-wrapped title that fits as truncated, even with a fractional width", async () => {
    widths = { scroll: 87, client: 87 };
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 87.36 } as DOMRect);
    vi.spyOn(document, "createRange").mockReturnValue({
      selectNodeContents: vi.fn(),
      getBoundingClientRect: () => ({ width: 87.36 }),
    } as unknown as Range);
    view = render(<BitCard presentation="inbox-explorer" bit={item} parentColor="#fff" chunkStats={{ completed: 0, total: 0 }} onClick={vi.fn()} />);
    hover();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(open()).toBeNull();
    vi.restoreAllMocks();
  });

  it("opens on card-root focus only when it matches :focus-visible and the card root is the target", async () => {
    view = render(<BitCard presentation="inbox-explorer" bit={item} parentColor="#fff" chunkStats={{ completed: 0, total: 0 }} onClick={vi.fn()} />);
    focusVisible = false;
    fireEvent.focus(root());
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(open()).toBeNull();
    fireEvent.blur(root());
    focusVisible = true;
    fireEvent.focus(root());
    await waitFor(() => expect(open()).not.toBeNull());
    fireEvent.blur(root());
    await waitFor(() => expect(open()).toBeNull());
  });

  it("does not open when a descendant, not the card root, takes focus", async () => {
    view = render(<BitCard presentation="inbox-explorer" bit={item} parentColor="#fff" chunkStats={{ completed: 0, total: 0 }} onClick={vi.fn()} isNewlyPlaced undo={undoProps} />);
    fireEvent.focus(screen.getByRole("button", { name: /Undo placement of/ }));
    await waitFor(() => expect(document.querySelector('[data-feedback-role="status-tooltip"]')).not.toBeNull());
    expect(open()).toBeNull();
  });

  it("stays closed after Esc until the pointer leaves the title", async () => {
    view = render(<BitCard presentation="inbox-explorer" bit={item} parentColor="#fff" chunkStats={{ completed: 0, total: 0 }} onClick={vi.fn()} />);
    hover();
    await waitFor(() => expect(open()).not.toBeNull());
    fireEvent.keyDown(document.body, { key: "Escape" });
    await waitFor(() => expect(open()).toBeNull());
    hover();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(open()).toBeNull();
    fireEvent.pointerLeave(title());
    hover();
    await waitFor(() => expect(open()).not.toBeNull());
  });

  it("keeps a focus-opened tooltip through the scroll that focus causes, until blur", async () => {
    view = render(<BitCard presentation="inbox-explorer" bit={item} parentColor="#fff" chunkStats={{ completed: 0, total: 0 }} onClick={vi.fn()} />);
    fireEvent.focus(root());
    await waitFor(() => expect(open()).not.toBeNull());
    fireEvent.scroll(document.body);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(open()).not.toBeNull();
    fireEvent.blur(root());
    await waitFor(() => expect(open()).toBeNull());
  });

  it("keeps a focus-opened title closed after Esc until focus leaves the card", async () => {
    view = render(<BitCard presentation="inbox-explorer" bit={item} parentColor="#fff" chunkStats={{ completed: 0, total: 0 }} onClick={vi.fn()} />);
    fireEvent.focus(root());
    await waitFor(() => expect(open()).not.toBeNull());
    fireEvent.keyDown(document.body, { key: "Escape" });
    await waitFor(() => expect(open()).toBeNull());
    fireEvent.pointerMove(title(), { pointerType: "mouse" });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(open()).toBeNull();
    fireEvent.blur(root());
    fireEvent.focus(root());
    await waitFor(() => expect(open()).not.toBeNull());
  });

  it("does not close when the title resizes while open", async () => {
    view = render(<BitCard presentation="inbox-explorer" bit={item} parentColor="#fff" chunkStats={{ completed: 0, total: 0 }} onClick={vi.fn()} />);
    hover();
    await waitFor(() => expect(open()).not.toBeNull());
    widths = { scroll: 100, client: 100 };
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(open()).not.toBeNull();
  });

  it("shows nothing while a drag is active and closes when one starts", async () => {
    dndState.active = { id: "drag" };
    view = render(<BitCard presentation="inbox-explorer" bit={item} parentColor="#fff" chunkStats={{ completed: 0, total: 0 }} onClick={vi.fn()} />);
    hover();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(open()).toBeNull();
    dndState.active = null;
    view.rerender(<BitCard presentation="inbox-explorer" bit={item} parentColor="#fff" chunkStats={{ completed: 0, total: 0 }} onClick={vi.fn()} />);
    fireEvent.pointerLeave(title());
    hover();
    await waitFor(() => expect(open()).not.toBeNull());
    dndState.active = { id: "drag" };
    view.rerender(<BitCard presentation="inbox-explorer" bit={item} parentColor="#fff" chunkStats={{ completed: 0, total: 0 }} onClick={vi.fn()} />);
    await waitFor(() => expect(open()).toBeNull());
  });

  it("never shows the title and Undo tooltips at once, in either order", async () => {
    view = render(<BitCard presentation="inbox-explorer" bit={item} parentColor="#fff" chunkStats={{ completed: 0, total: 0 }} onClick={vi.fn()} isNewlyPlaced undo={undoProps} />);
    const undo = screen.getByRole("button", { name: /Undo placement of/ });
    fireEvent.focus(undo);
    await waitFor(() => expect(document.querySelector('[data-feedback-role="status-tooltip"]')).not.toBeNull());
    hover();
    await waitFor(() => expect(open()).not.toBeNull());
    await waitFor(() => expect(document.querySelector('[data-feedback-role="status-tooltip"]')).toBeNull());
    fireEvent.focus(undo);
    await waitFor(() => expect(document.querySelector('[data-feedback-role="status-tooltip"]')).not.toBeNull());
    await waitFor(() => expect(open()).toBeNull());
  });

  it("keeps the accessible name and aria-describedby of the card unchanged while open", async () => {
    view = render(<BitCard presentation="inbox-explorer" bit={item} parentColor="#fff" chunkStats={{ completed: 0, total: 0 }} onClick={vi.fn()} />);
    const before = [root().getAttribute("aria-label"), root().getAttribute("aria-describedby")];
    hover();
    await waitFor(() => expect(open()).not.toBeNull());
    expect([root().getAttribute("aria-label"), root().getAttribute("aria-describedby")]).toEqual(before);
    expect(open()).toHaveAttribute("aria-hidden", "true");
  });

  it("renders no title tooltip in the ordinary Grid presentation", async () => {
    view = render(<BitCard bit={item} parentColor="#fff" chunkStats={{ completed: 0, total: 0 }} onClick={vi.fn()} />);
    hover();
    fireEvent.focus(root());
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(open()).toBeNull();
  });
});


describe("Task 247 Undo slot status (BitCard)", () => {
  const label = "Undo placement of Slot item";

  it.each([
    ["pending", "pending", "loader", false],
    ["unknown", "unknown", "question", true],
    ["reconciling", "reconciling", "question", true],
    ["problem", "problem", "exclamation", true],
  ] as const)("shows the %s status in the slot and emphasis only with ? and !", async (_name, status, glyph, emphasis) => {
    vi.useRealTimers();
    const undo = slot({ label, status, sentence: "Slot sentence." });
    const { container } = render(<BitCard presentation="inbox-explorer" bit={createBit({ title: "Slot item" })} parentColor="red" chunkStats={{ completed: 0, total: 0 }} onClick={vi.fn()} isNewlyPlaced undo={undo} />);
    // The loader waits out the display delay; ? and ! show at once.
    if (glyph === "loader") {
      await waitFor(() => expect(container.querySelector('[data-glyph="loader"]')).not.toBeNull());
    } else {
      expect(container.querySelector(`[data-glyph="${glyph}"]`)).not.toBeNull();
    }
    const button = screen.getByRole("button", { name: label });
    expect(button.querySelector('[data-feedback-role="status-icon"]')).toHaveAttribute("aria-hidden", "true");
    expect(button.querySelector("svg.lucide-undo-2")).toBeNull();
    expect(container.querySelector('[data-triage-role="explorer-card-bit"]')?.hasAttribute("data-status-emphasis")).toBe(emphasis);
    expect(container.querySelector('[data-newly-action-kind]')).toBeNull();
    expect(button.hasAttribute("data-feedback-role")).toBe(emphasis);
  });

  it("describes the slot with the tooltip sentence once and keeps aria-disabled, never disabled", () => {
    const undo = slot({ label, status: "problem", disabled: true, sentence: "Conflict. Slot sentence." });
    render(<BitCard presentation="inbox-explorer" bit={createBit({ title: "Slot item" })} parentColor="red" chunkStats={{ completed: 0, total: 0 }} onClick={vi.fn()} isNewlyPlaced undo={undo} />);
    const button = screen.getByRole("button", { name: label });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled();
    const ids = (button.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);
    expect(ids).toHaveLength(1);
    expect(document.getElementById(ids[0])).toHaveTextContent("Conflict. Slot sentence.");
  });
});
