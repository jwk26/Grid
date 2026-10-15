import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { GridExplorerSearchResult } from "@/lib/utils/grid-explorer-search";
import { GridExplorerSearchResults } from "./grid-explorer-search-results";

function result(
  key: GridExplorerSearchResult["key"],
  overrides: Partial<GridExplorerSearchResult> = {},
): GridExplorerSearchResult {
  const [type, id] = key.split(":") as ["node" | "bit", string];
  return {
    key,
    id,
    type,
    title: type === "node" ? "Alpha" : "Alpha note",
    icon: type === "node" ? "folder" : "list",
    color: type === "node" ? "hsl(210, 50%, 50%)" : null,
    breadcrumb: "Home / Projects",
    ancestorIds: ["projects"],
    nodePathIds: type === "node" ? ["projects", id] : ["projects"],
    hierarchyOrder: 0,
    relevance: "title-prefix",
    rank: 1,
    duplicate: null,
    ...overrides,
  };
}

const defaultProps = {
  feedback: null,
  focusTarget: { kind: "input" } as const,
  query: "",
  resultScrollTop: 0,
  results: [] as GridExplorerSearchResult[],
  status: "idle" as const,
  onClose: vi.fn(),
  onFocusInput: vi.fn(),
  onFocusResult: vi.fn(),
  onQueryChange: vi.fn(),
  onRetry: vi.fn(),
  onScrollTopChange: vi.fn(),
  onSelectResult: vi.fn(),
  getResultUndo: () => null,
};

const globalsCss = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

function renderedResultRows(): HTMLButtonElement[] {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      '[data-triage-role="explorer-search-result"]',
    ),
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("GridExplorerSearchResults", () => {
  it("delivers the sole input and close control through the header while retaining native focus intent", () => {
    const view = render(<GridExplorerSearchResults {...defaultProps} query="alpha" status="ready" results={[result("node:alpha")]}
      renderHeader={control => <div data-testid="shared-header">{control}</div>} />);
    const input = screen.getByRole("searchbox");
    expect(screen.getByTestId("shared-header")).toContainElement(input);
    expect(screen.getByTestId("explorer-search-body")).not.toContainElement(input);
    expect(screen.getAllByRole("searchbox")).toHaveLength(1);
    expect(input).toHaveFocus();
    view.rerender(<GridExplorerSearchResults {...defaultProps} query="alpha" status="ready" results={[result("node:alpha")]}
      focusTarget={{kind:"result",resultKey:"node:alpha"}} renderHeader={control => <div data-testid="shared-header">{control}</div>} />);
    expect(renderedResultRows()[0]).toHaveFocus();
    view.rerender(<GridExplorerSearchResults {...defaultProps} query="alpha" status="ready" results={[]}
      focusTarget={{kind:"input"}} renderHeader={control => <div data-testid="shared-header">{control}</div>} />);
    expect(input).toHaveFocus();
    expect(screen.getByTestId("shared-header")).toContainElement(screen.getByRole("button", {name:"Clear and close Explorer search"}));
  });

  it("renders the fixed input, fixed pre-search state, and close action", () => {
    render(<GridExplorerSearchResults {...defaultProps} />);

    expect(screen.getByPlaceholderText("Search all Nodes and Bits")).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Search the entire Grid Explorer.",
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Clear and close Explorer search",
      }),
    );
    expect(defaultProps.onClose).toHaveBeenCalledOnce();
  });

  it("renders typed flat results and exact duplicate text without drag semantics", () => {
    render(
      <GridExplorerSearchResults
        {...defaultProps}
        query="alpha"
        status="ready"
        results={[
          result("node:alpha", {
            duplicate: { index: 1, total: 2 },
          }),
          result("bit:alpha-note", { hierarchyOrder: 1 }),
        ]}
      />,
    );

    expect(screen.getByText("Node")).toBeVisible();
    expect(screen.getByText("Bit")).toBeVisible();
    expect(screen.getAllByText("Home / Projects")).toHaveLength(2);
    expect(screen.getByText("Duplicate 1 of 2")).toBeVisible();
    expect(renderedResultRows()).toHaveLength(2);
    expect(renderedResultRows()[0]).not.toHaveAttribute("draggable");
    const resultsList = screen.getByRole("list", { name: "2 results" });
    const resultItems = within(resultsList).getAllByRole("listitem");
    expect(resultItems).toHaveLength(2);
    expect(resultItems[0]).toContainElement(renderedResultRows()[0]);
    expect(resultItems[1]).toContainElement(renderedResultRows()[1]);
  });

  it("renders each result's stored icon and color identity", () => {
    render(
      <GridExplorerSearchResults
        {...defaultProps}
        query="custom"
        status="ready"
        results={[
          result("node:custom-node", { icon: "Star", color: "rgb(12, 34, 56)" }),
          result("bit:custom-bit", { icon: "Heart", color: "rgb(78, 90, 12)" }),
        ]}
      />,
    );

    const icons = document.querySelectorAll<SVGElement>(".explorer-search-result-icon");
    expect(icons[0]).toHaveClass("lucide-star");
    expect(icons[0]).toHaveStyle({ color: "rgb(12, 34, 56)" });
    expect(icons[1]).toHaveClass("lucide-heart");
    expect(icons[1]).toHaveStyle({ color: "rgb(78, 90, 12)" });
  });

  it("composes a trailing independent Undo control without reveal or drag behavior", () => {
    const onActivate = vi.fn();
    const onSelectResult = vi.fn();
    render(
      <GridExplorerSearchResults
        {...defaultProps}
        query="alpha"
        status="ready"
        results={[result("node:alpha"), result("bit:alpha-note")]}
        getResultUndo={(item) =>
          item.key === "node:alpha"
            ? {
                actionLabel: "Undo",
                copy: "Undo this placement.",
                disabled: false,
                onActivate,
                state: "available",
              }
            : null
        }
        onSelectResult={onSelectResult}
      />,
    );

    const resultRow = renderedResultRows()[0]!;
    const undo = screen.getByRole("button", {
      name: "Undo placement of Alpha",
    });
    expect(resultRow).not.toContainElement(undo);
    expect(undo).toHaveClass("explorer-search-undo", "newly-undo-action");
    expect(undo).toHaveAttribute(
      "data-triage-role",
      "explorer-search-undo",
    );
    expect(undo).toHaveAttribute("data-undo-action", "Undo");
    expect(undo).not.toHaveAttribute("draggable");
    expect(screen.getByText("Undo this placement.")).toBeVisible();

    fireEvent.click(undo);
    expect(onActivate).toHaveBeenCalledOnce();
    expect(onSelectResult).not.toHaveBeenCalled();
  });

  it("renders exact Search Undo success feedback and focuses recovery actions in place", () => {
    const item = result("node:alpha");
    const view = render(
      <GridExplorerSearchResults
        {...defaultProps}
        query="alpha"
        status="ready"
        results={[item]}
        getResultUndo={() => ({
          actionLabel: "Undo",
          copy: "Undoing “Alpha”…",
          disabled: true,
          onActivate: vi.fn(),
          state: "pending",
        })}
      />,
    );

    view.rerender(
      <GridExplorerSearchResults
        {...defaultProps}
        feedback={{ kind: "undo-success", source: "Source 1", title: "Alpha" }}
        query="alpha"
        status="ready"
        results={[item]}
        getResultUndo={() => ({
          actionLabel: "Check again",
          copy: "We couldn’t confirm whether “Alpha” was undone.",
          disabled: false,
          onActivate: vi.fn(),
          state: "unknown",
        })}
      />,
    );

    expect(screen.getByRole("status", { name: "Explorer search status" })).toHaveTextContent(
      "Restored “Alpha” to Source 1.",
    );
    expect(screen.getByRole("button", { name: "Check again" })).toHaveFocus();
  });

  it("moves focus with arrows and activates the focused result with Enter", () => {
    const onFocusResult = vi.fn();
    const onSelectResult = vi.fn();
    render(
      <GridExplorerSearchResults
        {...defaultProps}
        query="alpha"
        status="ready"
        results={[result("node:alpha"), result("bit:alpha-note")]}
        onFocusResult={onFocusResult}
        onSelectResult={onSelectResult}
      />,
    );

    const input = screen.getByPlaceholderText("Search all Nodes and Bits");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(onFocusResult).toHaveBeenCalledWith("node:alpha");

    const first = renderedResultRows()[0];
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(onFocusResult).toHaveBeenLastCalledWith("bit:alpha-note");
    fireEvent.keyDown(first, { key: "Enter" });
    expect(onSelectResult).toHaveBeenCalledWith(expect.objectContaining({ key: "node:alpha" }));
  });

  it("uses the canonical field role and moves DOM focus without manufacturing selection", () => {
    const rows = [result("node:alpha"), result("bit:alpha-note")];
    const view = render(
      <GridExplorerSearchResults {...defaultProps} query="alpha" status="ready" results={rows} />,
    );
    const input = screen.getByRole("searchbox", { name: "Search all Nodes and Bits" });
    expect(input).toHaveAttribute("data-triage-role", "explorer-search-field");

    view.rerender(
      <GridExplorerSearchResults
        {...defaultProps}
        focusTarget={{ kind: "result", resultKey: "node:alpha" }}
        query="alpha"
        status="ready"
        results={rows}
      />,
    );
    expect(renderedResultRows()[0]).toHaveFocus();
    expect(renderedResultRows()[0]).not.toHaveAttribute("aria-selected");
    expect(globalsCss).toMatch(
      /\[data-triage-role="explorer-search-field"\]:focus-visible[\s\S]*outline:/,
    );
  });

  it("scrolls focused results only inside the results viewport", () => {
    const outer = document.createElement("div");
    outer.scrollTop = 37;
    document.body.append(outer);
    const rows = [result("node:alpha"), result("bit:alpha-note")];
    const view = render(
      <GridExplorerSearchResults {...defaultProps} query="alpha" status="ready" results={rows} />,
      { container: outer },
    );
    const viewport = screen.getByRole("list");
    const focused = renderedResultRows()[1];
    Object.defineProperty(viewport, "clientHeight", { configurable: true, value: 100 });
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({
      bottom: 120,
      height: 100,
      left: 0,
      right: 200,
      top: 20,
      width: 200,
      x: 0,
      y: 20,
      toJSON: () => ({}),
    });
    vi.spyOn(focused, "getBoundingClientRect").mockReturnValue({
      bottom: 180,
      height: 40,
      left: 0,
      right: 200,
      top: 140,
      width: 200,
      x: 0,
      y: 140,
      toJSON: () => ({}),
    });
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    view.rerender(
      <GridExplorerSearchResults
        {...defaultProps}
        focusTarget={{ kind: "result", resultKey: "bit:alpha-note" }}
        query="alpha"
        status="ready"
        results={rows}
      />,
    );

    expect(viewport.scrollTop).toBe(60);
    expect(outer.scrollTop).toBe(37);
    expect(scrollIntoView).not.toHaveBeenCalled();
    outer.remove();
  });

  it("renders loading, stale, no-result, error, and stale-selection states", () => {
    const view = render(
      <GridExplorerSearchResults {...defaultProps} query="alpha" status="loading" />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Searching Grid Explorer…");
    expect(screen.getByRole("list")).toHaveAttribute("aria-busy", "true");

    view.rerender(
      <GridExplorerSearchResults
        {...defaultProps}
        query="alpha"
        status="refreshing"
        results={[result("node:alpha")]}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Updating results…");
    expect(renderedResultRows()).toHaveLength(1);

    view.rerender(
      <GridExplorerSearchResults {...defaultProps} query="alpha" status="ready" />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("No results for “alpha”.");

    view.rerender(
      <GridExplorerSearchResults {...defaultProps} query="alpha" status="error" />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Search couldn’t be updated.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(defaultProps.onRetry).toHaveBeenCalled();

    view.rerender(
      <GridExplorerSearchResults
        {...defaultProps}
        feedback="stale-selection"
        query="alpha"
        status="loading"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Searching Grid Explorer…");

    view.rerender(
      <GridExplorerSearchResults
        {...defaultProps}
        feedback="stale-selection"
        query="alpha"
        status="ready"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "That item is no longer available. Results were updated.",
    );
  });
});


it("owns the result shell and attached Undo reason separately from row activation", () => {
  render(<GridExplorerSearchResults {...defaultProps} query="alpha" status="ready" results={[result("node:alpha")]} getResultUndo={() => ({ actionLabel: "Undo", copy: "Undo this placement.", disabled: false, onActivate: vi.fn(), state: "available" })} />);
  const field = screen.getByRole("searchbox", { name: "Search all Nodes and Bits" });
  expect(field.parentElement).toHaveAttribute("data-triage-role", "explorer-search-find-strip");
  const shell = screen.getByRole("listitem");
  expect(shell).toHaveAttribute("data-triage-role", "explorer-search-result-shell");
  const reason = screen.getByText("Undo this placement.").closest<HTMLElement>('[role="status"]');
  expect(reason).toHaveAttribute("data-triage-role", "explorer-search-undo-status");
  expect(reason).not.toContainElement(screen.getByRole("button", { name: "Undo placement of Alpha" }));
  expect(renderedResultRows()[0]).not.toContainElement(reason);
});
