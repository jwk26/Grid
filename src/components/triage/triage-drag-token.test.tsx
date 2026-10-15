import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TriageDragItem } from "@/hooks/use-dnd";
import { TriageDragToken } from "./triage-drag-token";

vi.mock("lucide-react", () => {
  function createIcon(name: string) {
    const Icon = ({ className }: { className?: string }) => (
      <svg className={className} data-icon={name} data-testid={`icon-${name}`} />
    );
    Icon.displayName = name;
    return Icon;
  }
  return {
    Folder: createIcon("Folder"),
    GripVertical: createIcon("GripVertical"),
    ListTodo: createIcon("ListTodo"),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function makeItem(
  overrides: Partial<NonNullable<TriageDragItem>>,
): NonNullable<TriageDragItem> {
  return {
    kind: "triage-breakdown",
    id: "item-1",
    label: "Test label",
    scratchId: "scratch-1",
    sourceBreakdownId: "row-1",
    sourceVersion: 1,
    sourceLifecycle: "active",
    ...overrides,
  } as NonNullable<TriageDragItem>;
}

describe("TriageDragToken", () => {
  it("renders nothing when item is null", () => {
    const { container } = render(<TriageDragToken item={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("keeps the overlay compact and pointer-transparent", () => {
    render(
      <TriageDragToken
        item={makeItem({ kind: "triage-staged-bit", label: "Call Sam" })}
      />,
    );

    const token = screen.getByText("Call Sam").parentElement;
    expect(token).toHaveClass("pointer-events-none", "h-8", "max-w-40");
    expect(token).toHaveAttribute("data-triage-role", "drag-token");
    expect(token).toHaveAttribute("data-triage-drag-token", "triage-staged-bit");
    expect(token).toHaveAttribute("data-source-version", "1");
  });

  describe("triage-breakdown kind", () => {
    it("renders the GripVertical icon", () => {
      render(<TriageDragToken item={makeItem({ kind: "triage-breakdown", label: "My note" })} />);
      expect(screen.getByTestId("icon-GripVertical")).toBeInTheDocument();
    });

    it("renders the label text", () => {
      render(<TriageDragToken item={makeItem({ kind: "triage-breakdown", label: "My note" })} />);
      expect(screen.getByText("My note")).toBeInTheDocument();
    });
  });

  describe("triage-staged-node kind", () => {
    it("renders the Folder icon", () => {
      render(<TriageDragToken item={makeItem({ kind: "triage-staged-node", label: "Project" })} />);
      expect(screen.getByTestId("icon-Folder")).toBeInTheDocument();
    });

    it("does not render a label", () => {
      render(<TriageDragToken item={makeItem({ kind: "triage-staged-node", label: "Project" })} />);
      expect(screen.queryByText("Project")).not.toBeInTheDocument();
    });
  });

  describe("triage-staged-bit kind", () => {
    it("renders the ListTodo icon", () => {
      render(<TriageDragToken item={makeItem({ kind: "triage-staged-bit", label: "Call Sam" })} />);
      expect(screen.getByTestId("icon-ListTodo")).toBeInTheDocument();
    });

    it("renders the label text", () => {
      render(<TriageDragToken item={makeItem({ kind: "triage-staged-bit", label: "Call Sam" })} />);
      expect(screen.getByText("Call Sam")).toBeInTheDocument();
    });
  });
});
