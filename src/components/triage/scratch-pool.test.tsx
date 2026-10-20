import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bit } from "@/types";
import { useTriagePreferencesStore } from "@/stores/triage-preferences-store";
import { useTriageStore } from "@/stores/triage-store";
import {
  TrashScratchEntriesContext,
  type TrashScratchDisabledReason,
  type TrashScratchEntries,
} from "@/hooks/use-trash-scratch";
import { ScratchPool } from "./scratch-pool";

const globalsCss = readFileSync(
  join(process.cwd(), "src/app/globals.css"),
  "utf8",
);

const useInboxMock = vi.hoisted(() => vi.fn());
const departureState = vi.hoisted(() => ({
  destination: null as null | {
    id: string;
    focus?: () => void;
    kind: "scratch";
    perform: () => void;
  },
  requestDeparture: vi.fn(),
}));
const operationLockState = vi.hoisted(() => ({
  activeOperation: null as null | { kind: "add"; operationId: string },
}));

vi.mock("@/hooks/use-inbox", () => ({
  useInbox: useInboxMock,
}));

vi.mock("@/hooks/use-triage-operation-lock", () => ({
  useTriageOperationLockContext: () => ({
    ...operationLockState,
    isLocked: () => operationLockState.activeOperation !== null,
  }),
}));

vi.mock("@/hooks/use-triage-departure", () => ({
  useTriageDepartureContext: () => ({
    requestDeparture: departureState.requestDeparture,
  }),
}));

function createBit(overrides: Partial<Bit> = {}): Bit {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "Scratch",
    description: overrides.description ?? "",
    icon: overrides.icon ?? "sparkles",
    deadline: overrides.deadline ?? null,
    deadlineAllDay: overrides.deadlineAllDay ?? false,
    priority: overrides.priority ?? null,
    status: overrides.status ?? "active",
    mtime: overrides.mtime ?? Date.now(),
    createdAt: overrides.createdAt ?? Date.now(),
    parentId: overrides.parentId ?? "inbox-node",
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
  vi.setSystemTime(new Date(2026, 5, 17, 12, 0, 0));
  window.matchMedia = vi.fn().mockReturnValue({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    matches: false,
  });
  useTriageStore.setState({
    selectedScratchId: null,
    scratchPoolExpanded: true,
    scratchPoolManualExpandedForId: null,
    scratchPoolQuery: "",
    scratchPoolActiveIds: [],
    scratchPoolResultIds: [],
    scratchPoolScroll: { anchorId: null, offset: 0 },
  });
  useTriagePreferencesStore.setState({ poolCreatedAtSort: "DESC" });
  useInboxMock.mockReturnValue({
    activeScratchBits: [],
    poolLifecycleProjection: { revision: 0, changes: [] },
  });
  operationLockState.activeOperation = null;
  departureState.destination = null;
  departureState.requestDeparture.mockReset();
  departureState.requestDeparture.mockImplementation((destination) => {
    departureState.destination = destination;
    destination.perform();
    destination.focus?.();
    return "performed";
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
  useTriageStore.setState({
    selectedScratchId: null,
    scratchPoolExpanded: true,
    scratchPoolManualExpandedForId: null,
    scratchPoolQuery: "",
    scratchPoolActiveIds: [],
    scratchPoolResultIds: [],
    scratchPoolScroll: { anchorId: null, offset: 0 },
  });
  useTriagePreferencesStore.setState({ poolCreatedAtSort: "DESC" });
});

describe("ScratchPool", () => {
  it("places the static DP-VQ06-POOL reduced-motion override in the global base layer", () => {
    const baseLayer = globalsCss.slice(
      globalsCss.indexOf("@layer base {"),
      globalsCss.indexOf("@layer components {"),
    );

    expect(baseLayer).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.pool-status-band,[\s\S]*\.pool-status-line,[\s\S]*\.pool-status-action,[\s\S]*\.pool-activity-marker[\s\S]*animation: none !important;[\s\S]*transition: none !important;/,
    );
  });

  it("uses the established Neumorphism and Claymorphism inset and raised shadow families", () => {
    const block = (selector: string) => {
      const start = globalsCss.indexOf(`${selector}[data-color-theme="neumorphism"] {`);
      return globalsCss.slice(start, globalsCss.indexOf("\n}", start));
    };
    const light = block(":root");
    const dark = block(".dark");
    const family = /--theme-shadow-(?:inset|card)[\w-]*/g;
    const referenced = new Set(
      [...globalsCss.matchAll(/var\((--theme-shadow-(?:inset|card)[\w-]*)/g)].map(
        (match) => match[1],
      ),
    );
    expect(referenced.size).toBeGreaterThan(0);
    for (const name of referenced) {
      expect(light).toContain(`${name}:`);
      expect(dark).toContain(`${name}:`);
    }
    // Only neumorphism-scoped rules may consume the family.
    const outside = globalsCss
      .split("\n")
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.includes("var(--theme-shadow-inset") || line.includes("var(--theme-shadow-card"));
    for (const { index } of outside) {
      const upto = globalsCss.split("\n").slice(0, index + 1).join("\n");
      const open = upto.lastIndexOf("{", upto.lastIndexOf("\n", upto.length - 2));
      const selector = upto.slice(upto.lastIndexOf("}", open) + 1, open);
      expect(selector).toContain('[data-color-theme="neumorphism"]');
    }
    expect(globalsCss.match(family)).not.toBeNull();
    expect(globalsCss).toMatch(
      /:root\[data-color-theme="neumorphism"\] \.pool-status-band \{[\s\S]*box-shadow: var\(--theme-shadow-inset-sm\);/,
    );
    expect(globalsCss).toMatch(
      /:root\[data-color-theme="claymorphism"\] \.pool-status-band \{[\s\S]*box-shadow: inset 2px 2px 5px hsl\(var\(--foreground\) \/ 0\.12\),[\s\S]*inset -2px -2px 5px hsl\(var\(--background\) \/ 0\.8\);/,
    );
    for (const theme of ["neumorphism", "claymorphism"]) {
      expect(globalsCss).toMatch(
        new RegExp(
          `:root\\[data-color-theme="${theme}"\\] \\.pool-activity-marker \\{[\\s\\S]*box-shadow: var\\(--theme-shadow\\);`,
        ),
      );
    }
  });

  it("renders active Scratch rows newest-first with relative-time labels", () => {
    useInboxMock.mockReturnValue({
      activeScratchBits: [
        createBit({
          id: "older",
          title: "Older scratch",
          createdAt: new Date(2026, 5, 17, 10, 0, 0).getTime(),
        }),
        createBit({
          id: "newer",
          title: "Newer scratch",
          createdAt: new Date(2026, 5, 17, 11, 15, 0).getTime(),
        }),
      ],
    });

    render(<ScratchPool />);

    const rows = [
      screen.getByText("Newer scratch").closest("button"),
      screen.getByText("Older scratch").closest("button"),
    ];

    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Newer scratch");
    expect(rows[0]).toHaveTextContent("45m ago");
    expect(rows[1]).toHaveTextContent("Older scratch");
    expect(rows[1]).toHaveTextContent("2h ago");
  });

  describe("capture reveal", () => {
    const bits = [
      createBit({ id: "a", title: "Alpha", createdAt: 2 }),
      createBit({ id: "b", title: "Beta", createdAt: 1 }),
    ];
    let scrollSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      scrollSpy = vi.fn();
      Element.prototype.scrollIntoView = scrollSpy as unknown as typeof Element.prototype.scrollIntoView;
      useInboxMock.mockReturnValue({
        activeScratchBits: bits,
        poolLifecycleProjection: { revision: 0, changes: [] },
      });
    });

    it("scrolls the requested row into view once and clears the reveal, without moving focus", () => {
      useTriageStore.setState({ selectedScratchId: "b", scratchRevealId: "b" });
      const before = document.activeElement;
      render(<ScratchPool />);
      expect(scrollSpy).toHaveBeenCalledTimes(1);
      expect(scrollSpy).toHaveBeenCalledWith({ block: "nearest" });
      expect(useTriageStore.getState().scratchRevealId).toBeNull();
      expect(document.activeElement).toBe(before);
    });

    it("never scrolls for a row click or ordinary selection", () => {
      render(<ScratchPool />);
      fireEvent.click(screen.getByRole("button", { name: /Beta/ }));
      expect(scrollSpy).not.toHaveBeenCalled();
    });

    it("does not reveal a Scratch the query hides, and clears the reveal", () => {
      useTriageStore.setState({
        selectedScratchId: "b",
        scratchRevealId: "b",
        scratchPoolQuery: "alph",
      });
      render(<ScratchPool />);
      expect(scrollSpy).not.toHaveBeenCalled();
      expect(useTriageStore.getState().scratchRevealId).toBeNull();
    });

    it("keeps a collapsed Pool collapsed and reveals its switcher", () => {
      useTriageStore.setState({
        selectedScratchId: "b",
        scratchRevealId: "b",
        scratchPoolExpanded: false,
      });
      render(<ScratchPool />);
      expect(useTriageStore.getState().scratchPoolExpanded).toBe(false);
      expect(scrollSpy).toHaveBeenCalledTimes(1);
      expect(useTriageStore.getState().scratchRevealId).toBeNull();
    });

    it("reveals the switcher of a collapsed Pool even when the query would hide it", () => {
      useTriageStore.setState({
        selectedScratchId: "b",
        scratchRevealId: "b",
        scratchPoolExpanded: false,
        scratchPoolQuery: "alph",
      });
      render(<ScratchPool />);
      expect(scrollSpy).toHaveBeenCalledTimes(1);
      expect(useTriageStore.getState().scratchRevealId).toBeNull();
    });

    it("waits for a Scratch the Pool has not received yet", () => {
      useTriageStore.setState({ selectedScratchId: "c", scratchRevealId: "c" });
      render(<ScratchPool />);
      expect(scrollSpy).not.toHaveBeenCalled();
      expect(useTriageStore.getState().scratchRevealId).toBe("c");
    });
  });

  it("renders the expanded empty state", () => {
    render(<ScratchPool />);

    expect(screen.getByText("No active scratches")).toHaveAttribute(
      "data-external-removal-focus",
      "inbox-empty",
    );
    expect(screen.getByText("No active scratches")).toHaveAttribute(
      "tabindex",
      "-1",
    );
    expect(screen.getByText("Captured items will appear here.")).toBeInTheDocument();
  });

  it("manual toggle collapses to the rail and expands back", () => {
    useInboxMock.mockReturnValue({
      activeScratchBits: [createBit({ id: "scratch-1", title: "Scratch one" })],
    });

    render(<ScratchPool />);

    const pool = screen.getByTestId("scratch-pool");
    expect(pool).toHaveClass("w-72");

    fireEvent.click(screen.getByLabelText("Collapse Scratch Pool"));

    expect(pool).toHaveClass("w-12");
    expect(screen.getByLabelText("Expand Scratch Pool")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Expand Scratch Pool"));

    expect(pool).toHaveClass("w-72");
  });

  it("does not render the selected Scratch title in the collapsed rail", () => {
    const scratch = createBit({
      id: "scratch-1",
      title: "Selected scratch",
    });
    useTriageStore.setState({ selectedScratchId: "scratch-1" });
    useInboxMock.mockReturnValue({ activeScratchBits: [scratch] });

    render(<ScratchPool />);

    fireEvent.click(screen.getByLabelText("Collapse Scratch Pool"));

    expect(screen.queryByText("Selected scratch")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Selected scratch" })).toBeInTheDocument();
  });

  it("shows a collapsed count badge when items exist", () => {
    useInboxMock.mockReturnValue({
      activeScratchBits: [
        createBit({ id: "scratch-1" }),
        createBit({ id: "scratch-2" }),
      ],
    });

    render(<ScratchPool />);

    fireEvent.click(screen.getByLabelText("Collapse Scratch Pool"));

    expect(screen.getByLabelText("2 scratches")).toHaveClass("bg-primary");
  });

  it("shows the all-active zero count in the compact empty Pool", () => {
    render(<ScratchPool />);

    fireEvent.click(screen.getByLabelText("Collapse Scratch Pool"));

    expect(screen.getByText("0")).toHaveAttribute("data-triage-role", "pool-total-count");
    expect(screen.queryByText("No active scratches")).not.toBeInTheDocument();
  });

  it("shows total count in expanded header", () => {
    useInboxMock.mockReturnValue({
      activeScratchBits: [
        createBit({ id: "scratch-1" }),
        createBit({ id: "scratch-2" }),
      ],
    });

    render(<ScratchPool />);

    expect(screen.getByLabelText("2 scratches")).toBeInTheDocument();
  });

  it("search filters scratch titles", () => {
    useInboxMock.mockReturnValue({
      activeScratchBits: [
        createBit({ id: "alpha", title: "Alpha task" }),
        createBit({ id: "beta", title: "Beta task" }),
      ],
    });

    render(<ScratchPool />);

    fireEvent.change(screen.getByLabelText("Search scratches"), {
      target: { value: "alpha" },
    });

    expect(screen.getByText("Alpha task")).toBeInTheDocument();
    expect(screen.queryByText("Beta task")).not.toBeInTheDocument();
  });

  it("search shows No matches when nothing matches", () => {
    useInboxMock.mockReturnValue({
      activeScratchBits: [
        createBit({ id: "alpha", title: "Alpha task" }),
        createBit({ id: "beta", title: "Beta task" }),
      ],
    });

    render(<ScratchPool />);

    fireEvent.change(screen.getByLabelText("Search scratches"), {
      target: { value: "zzz" },
    });

    expect(screen.getByText("No matches")).toHaveAttribute(
      "data-external-removal-focus",
      "search-empty",
    );
    expect(screen.getByText("No matches")).toHaveAttribute("tabindex", "-1");
    expect(screen.queryByRole("button", { name: "Alpha task" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Beta task" })).not.toBeInTheDocument();
  });

  it("clear search restores full list", () => {
    useInboxMock.mockReturnValue({
      activeScratchBits: [
        createBit({ id: "alpha", title: "Alpha task" }),
        createBit({ id: "beta", title: "Beta task" }),
      ],
    });

    render(<ScratchPool />);

    fireEvent.change(screen.getByLabelText("Search scratches"), {
      target: { value: "alpha" },
    });
    fireEvent.click(screen.getByLabelText("Clear search"));

    expect(screen.getByText("Alpha task")).toBeInTheDocument();
    expect(screen.getByText("Beta task")).toBeInTheDocument();
  });

  it("sort toggle switches to oldest-first then back", () => {
    useInboxMock.mockReturnValue({
      activeScratchBits: [
        createBit({
          id: "older",
          title: "Older scratch",
          createdAt: new Date(2026, 5, 17, 10, 0, 0).getTime(),
        }),
        createBit({
          id: "newer",
          title: "Newer scratch",
          createdAt: new Date(2026, 5, 17, 11, 15, 0).getTime(),
        }),
      ],
    });

    render(<ScratchPool />);

    const rowTitles = () =>
      screen
        .getAllByRole("button", { name: /^(Older|Newer) scratch$/ })
        .map((row) => row.textContent);

    expect(rowTitles()).toEqual(["Newer scratch45m ago", "Older scratch2h ago"]);

    fireEvent.click(screen.getByRole("button", { name: /Sort:/ }));

    expect(rowTitles()).toEqual(["Older scratch2h ago", "Newer scratch45m ago"]);

    fireEvent.click(screen.getByRole("button", { name: /Sort:/ }));

    expect(rowTitles()).toEqual(["Newer scratch45m ago", "Older scratch2h ago"]);
    expect(useTriagePreferencesStore.getState().poolCreatedAtSort).toBe("DESC");
  });

  it("restores session query, exposes separate total and filtered counts, and records current results", () => {
    useTriageStore.setState({ scratchPoolQuery: "project" });
    useTriagePreferencesStore.setState({ poolCreatedAtSort: "ASC" });
    useInboxMock.mockReturnValue({
      activeScratchBits: [
        createBit({ id: "new-hidden", title: "Inbox", createdAt: 300 }),
        createBit({ id: "new-visible", title: "Project newer", createdAt: 200 }),
        createBit({ id: "old-visible", title: "Project older", createdAt: 100 }),
      ],
    });

    render(<ScratchPool />);

    expect(screen.getByLabelText("Search scratches")).toHaveValue("project");
    expect(screen.getByLabelText("3 scratches")).toBeInTheDocument();
    expect(screen.getByTestId("pool-filtered-count")).toHaveTextContent(
      "2 of 3 Scratches",
    );
    expect(
      screen
        .getAllByRole("button", { name: /Project (older|newer)/ })
        .map((row) => row.getAttribute("aria-label")),
    ).toEqual(["Project older", "Project newer"]);
  });

  it("keeps a filtered hidden selection explicit and Clear search preserves selection and search focus", () => {
    useTriageStore.setState({
      selectedScratchId: "hidden",
      scratchPoolQuery: "visible",
    });
    useInboxMock.mockReturnValue({
      activeScratchBits: [
        createBit({ id: "hidden", title: "Hidden Scratch" }),
        createBit({ id: "visible", title: "Visible Scratch" }),
      ],
      poolLifecycleProjection: { revision: 0, changes: [] },
    });

    render(<ScratchPool />);

    expect(screen.getByText("1 of 2 Scratches")).toBeInTheDocument();
    expect(
      screen.getByText("Selected Scratch is hidden by this search."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(useTriageStore.getState().selectedScratchId).toBe("hidden");
    expect(useTriageStore.getState().scratchPoolQuery).toBe("");
    expect(screen.getByLabelText("Search scratches")).toHaveFocus();
  });

  it("aggregates Pool activity and clears arrival and lifecycle categories independently with exact focus", () => {
    const initial = createBit({ id: "initial", title: "Initial" });
    const remote = createBit({ id: "remote", title: "Remote" });
    let inboxValue = {
      activeScratchBits: [initial],
      poolLifecycleProjection: { revision: 0, changes: [] as Array<{
        kind: "remote-arrival" | "archive" | "delete" | "restore";
        scratchId: string;
      }> },
    };
    useInboxMock.mockImplementation(() => inboxValue);
    const { rerender } = render(<ScratchPool />);

    inboxValue = {
      activeScratchBits: [initial, remote],
      poolLifecycleProjection: {
        revision: 1,
        changes: [
          { kind: "remote-arrival", scratchId: "remote" },
          { kind: "archive", scratchId: "archived" },
          { kind: "delete", scratchId: "deleted" },
          { kind: "restore", scratchId: "restored" },
        ],
      },
    };
    rerender(<ScratchPool />);

    expect(
      screen.getByText(
        "Pool updated elsewhere: 1 new, 1 archived, 1 deleted, 1 restored.",
      ).closest('[aria-live="polite"]'),
    ).toHaveAttribute("aria-atomic", "true");
    expect(useTriageStore.getState().selectedScratchId).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Review new" }));

    expect(screen.getByRole("button", { name: "Remote" })).toHaveFocus();
    expect(useTriageStore.getState().selectedScratchId).toBeNull();
    expect(screen.getByText("Pool updated elsewhere: 1 archived, 1 deleted, 1 restored.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByText(/Pool updated elsewhere:/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Search scratches")).toHaveFocus();
  });

  it("preserves non-control arrival and lifecycle markers through collapse and expand", () => {
    const scratch = createBit({ id: "scratch", title: "Scratch" });
    let inboxValue = {
      activeScratchBits: [scratch],
      poolLifecycleProjection: { revision: 0, changes: [] as Array<{
        kind: "remote-arrival" | "archive";
        scratchId: string;
      }> },
    };
    useInboxMock.mockImplementation(() => inboxValue);
    const { rerender } = render(<ScratchPool />);
    inboxValue = {
      activeScratchBits: [scratch],
      poolLifecycleProjection: {
        revision: 1,
        changes: [
          { kind: "remote-arrival", scratchId: "new" },
          { kind: "archive", scratchId: "old" },
        ],
      },
    };
    rerender(<ScratchPool />);

    fireEvent.click(screen.getByLabelText("Collapse Scratch Pool"));

    expect(screen.getByText("+1")).not.toHaveAttribute("role", "button");
    expect(screen.getByLabelText("Pool updated elsewhere.")).not.toHaveAttribute(
      "role",
      "button",
    );

    fireEvent.click(screen.getByLabelText("Expand Scratch Pool"));
    expect(screen.getByRole("button", { name: "Review new" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("excludes selected external removal from ordinary Pool activity", () => {
    const selected = createBit({ id: "selected", title: "Selected" });
    useTriageStore.setState({ selectedScratchId: "selected" });
    let inboxValue = {
      activeScratchBits: [selected],
      poolLifecycleProjection: { revision: 0, changes: [] as Array<{
        kind: "archive";
        scratchId: string;
      }> },
    };
    useInboxMock.mockImplementation(() => inboxValue);
    const { rerender } = render(<ScratchPool />);
    inboxValue = {
      activeScratchBits: [],
      poolLifecycleProjection: {
        revision: 1,
        changes: [{ kind: "archive", scratchId: "selected" }],
      },
    };
    rerender(<ScratchPool />);

    expect(screen.queryByText("A Scratch was archived elsewhere.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();
  });

  it("Review new clears vanished arrivals and falls back to Pool search focus", () => {
    let inboxValue = {
      activeScratchBits: [] as Bit[],
      poolLifecycleProjection: { revision: 0, changes: [] as Array<{
        kind: "remote-arrival";
        scratchId: string;
      }> },
    };
    useInboxMock.mockImplementation(() => inboxValue);
    const { rerender } = render(<ScratchPool />);
    inboxValue = {
      activeScratchBits: [],
      poolLifecycleProjection: {
        revision: 1,
        changes: [{ kind: "remote-arrival", scratchId: "vanished" }],
      },
    };
    rerender(<ScratchPool />);

    fireEvent.click(screen.getByRole("button", { name: "Review new" }));

    expect(screen.queryByRole("button", { name: "Review new" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Search scratches")).toHaveFocus();
  });

  it("ignores a preserved hidden query for collapsed switchers and total count", () => {
    useTriageStore.setState({
      scratchPoolExpanded: false,
      scratchPoolQuery: "alpha",
    });
    useTriagePreferencesStore.setState({ poolCreatedAtSort: "ASC" });
    useInboxMock.mockReturnValue({
      activeScratchBits: [
        createBit({ id: "beta", title: "Beta", createdAt: 200 }),
        createBit({ id: "alpha", title: "Alpha", createdAt: 100 }),
      ],
    });

    render(<ScratchPool />);

    const switcher = screen.getByRole("group", { name: "Switch scratch" });
    expect(
      within(switcher)
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label")),
    ).toEqual(["Alpha", "Beta"]);
    expect(screen.getByLabelText("2 scratches")).toBeInTheDocument();
    expect(screen.queryByTestId("pool-filtered-count")).not.toBeInTheDocument();
  });

  it("restores and updates session Pool scroll without persisting pixels elsewhere", () => {
    useTriageStore.setState({
      scratchPoolScroll: { anchorId: "scratch-1", offset: 36 },
    });
    useInboxMock.mockReturnValue({
      activeScratchBits: [createBit({ id: "scratch-1", title: "Scratch one" })],
    });

    render(<ScratchPool />);

    const viewport = screen.getByTestId("pool-scroll-viewport");
    expect(viewport.scrollTop).toBe(36);

    Object.defineProperty(viewport, "scrollTop", { value: 72, writable: true });
    fireEvent.scroll(viewport);

    expect(useTriageStore.getState().scratchPoolScroll).toEqual({
      anchorId: "scratch-1",
      offset: 72,
    });
  });

  it("collapsed mode has no search or sort controls", () => {
    useInboxMock.mockReturnValue({
      activeScratchBits: [createBit({ id: "scratch-1", title: "Scratch one" })],
    });

    render(<ScratchPool />);

    fireEvent.click(screen.getByLabelText("Collapse Scratch Pool"));

    expect(screen.queryByLabelText("Search scratches")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sort:/ })).not.toBeInTheDocument();
  });

  it("collapsed mode renders a pill button per scratch", () => {
    useInboxMock.mockReturnValue({
      activeScratchBits: [
        createBit({ id: "scratch-1", title: "Scratch one" }),
        createBit({ id: "scratch-2", title: "Scratch two" }),
      ],
    });

    render(<ScratchPool />);

    fireEvent.click(screen.getByLabelText("Collapse Scratch Pool"));

    const switcher = screen.getByRole("group", { name: "Switch scratch" });
    expect(within(switcher).getAllByRole("button")).toHaveLength(2);
  });

  it("clicking collapsed pill selects scratch and does not expand pool", () => {
    useInboxMock.mockReturnValue({
      activeScratchBits: [
        createBit({ id: "scratch-1", title: "Scratch one" }),
        createBit({ id: "scratch-2", title: "Scratch two" }),
      ],
    });

    render(<ScratchPool />);

    const pool = screen.getByTestId("scratch-pool");
    fireEvent.click(screen.getByLabelText("Collapse Scratch Pool"));
    fireEvent.click(screen.getByRole("button", { name: "Scratch two" }));

    expect(pool).toHaveClass("w-12");
    expect(useTriageStore.getState().selectedScratchId).toBe("scratch-2");
  });

  it("selecting scratch in expanded mode does not collapse pool", () => {
    useInboxMock.mockReturnValue({
      activeScratchBits: [createBit({ id: "scratch-1", title: "Scratch one" })],
    });

    render(<ScratchPool />);

    const pool = screen.getByTestId("scratch-pool");
    fireEvent.click(screen.getByRole("button", { name: "Scratch one" }));

    expect(pool).toHaveClass("w-72");
  });

  it("denies expanded and collapsed Scratch switches while an operation owns the lock", () => {
    useInboxMock.mockReturnValue({
      activeScratchBits: [
        createBit({ id: "scratch-1", title: "Scratch one" }),
        createBit({ id: "scratch-2", title: "Scratch two" }),
      ],
    });
    useTriageStore.setState({ selectedScratchId: "scratch-1" });
    operationLockState.activeOperation = {
      kind: "add",
      operationId: "add-1",
    };

    render(<ScratchPool />);

    fireEvent.click(screen.getByRole("button", { name: "Scratch two" }));
    expect(useTriageStore.getState().selectedScratchId).toBe("scratch-1");

    fireEvent.click(screen.getByLabelText("Collapse Scratch Pool"));
    fireEvent.click(screen.getByRole("button", { name: "Scratch two" }));
    expect(useTriageStore.getState().selectedScratchId).toBe("scratch-1");
  });

  it("exposes exact filtered-null focus owners without changing query or selecting a hidden Scratch", () => {
    useInboxMock.mockReturnValue({
      activeScratchBits: [
        createBit({ id: "scratch-hidden", title: "Hidden Scratch" }),
      ],
    });
    useTriageStore.setState({
      selectedScratchId: null,
      scratchPoolQuery: "no match",
    });

    render(<ScratchPool />);

    expect(screen.getByRole("textbox", { name: "Search scratches" })).toHaveAttribute(
      "data-archive-handoff-focus",
      "search-empty",
    );
    expect(screen.getByText("No matches")).toHaveAttribute(
      "data-archive-handoff-focus",
      "search-empty-status",
    );
    expect(useTriageStore.getState()).toMatchObject({
      selectedScratchId: null,
      scratchPoolQuery: "no match",
    });
  });

  it("keeps the final filtered-null result in search-empty instead of true-empty presentation", () => {
    useInboxMock.mockReturnValue({ activeScratchBits: [] });
    useTriageStore.setState({
      selectedScratchId: null,
      scratchPoolQuery: "still filtered",
    });

    render(<ScratchPool />);

    expect(screen.getByText("No matches")).toHaveAttribute(
      "data-archive-handoff-focus",
      "search-empty-status",
    );
    expect(screen.queryByText("No active scratches")).not.toBeInTheDocument();
  });

  it("captures a Scratch destination before selection mutation and preserves its focus owner", () => {
    useInboxMock.mockReturnValue({
      activeScratchBits: [
        createBit({ id: "scratch-1", title: "Scratch one" }),
        createBit({ id: "scratch-2", title: "Scratch two" }),
      ],
    });
    useTriageStore.setState({ selectedScratchId: "scratch-1" });
    departureState.requestDeparture.mockImplementation((destination) => {
      departureState.destination = destination;
      return "decision-required";
    });

    render(<ScratchPool />);
    const destinationButton = screen.getByRole("button", {
      name: "Scratch two",
    });
    fireEvent.click(destinationButton);

    expect(useTriageStore.getState().selectedScratchId).toBe("scratch-1");
    expect(departureState.destination).toMatchObject({
      id: "scratch-2",
      kind: "scratch",
    });

    departureState.destination?.perform();
    expect(useTriageStore.getState().selectedScratchId).toBe("scratch-2");

    screen.getByLabelText("Collapse Scratch Pool").focus();
    departureState.destination?.focus?.();
    expect(destinationButton).toHaveFocus();
  });

  it("does not request departure when selecting the current Scratch", () => {
    useInboxMock.mockReturnValue({
      activeScratchBits: [
        createBit({ id: "scratch-1", title: "Current Scratch" }),
      ],
    });
    useTriageStore.setState({ selectedScratchId: "scratch-1" });

    render(<ScratchPool />);
    fireEvent.click(screen.getByRole("button", { name: "Current Scratch" }));

    expect(departureState.requestDeparture).not.toHaveBeenCalled();
    expect(useTriageStore.getState().selectedScratchId).toBe("scratch-1");
  });

  it("collapsed pills have accessible labels with scratch titles", () => {
    useInboxMock.mockReturnValue({
      activeScratchBits: [createBit({ id: "scratch-1", title: "My scratch" })],
    });

    render(<ScratchPool />);

    fireEvent.click(screen.getByLabelText("Collapse Scratch Pool"));

    expect(screen.getByRole("button", { name: "My scratch" })).toBeInTheDocument();
  });

  it("ScratchRow button has focus-visible ring classes", () => {
    useInboxMock.mockReturnValue({
      activeScratchBits: [createBit({ id: "scratch-1", title: "Scratch one" })],
    });

    render(<ScratchPool />);

    const row = screen.getByRole("button", { name: "Scratch one" });
    expect(row).toHaveClass("focus-visible:ring-2");
    expect(row).toHaveClass("focus-visible:ring-ring");
    expect(row).toHaveAttribute(
      "data-external-removal-destination",
      "scratch-1",
    );
  });

  it("collapsed pill button has focus-visible ring classes", () => {
    useInboxMock.mockReturnValue({
      activeScratchBits: [createBit({ id: "scratch-1", title: "Scratch one" })],
    });

    render(<ScratchPool />);

    fireEvent.click(screen.getByLabelText("Collapse Scratch Pool"));

    const pill = screen.getByRole("button", { name: "Scratch one" });
    expect(pill).toHaveClass("focus-visible:ring-2");
    expect(pill).toHaveClass("focus-visible:ring-ring");
  });

  it("sort toggle button has focus-visible ring classes", () => {
    render(<ScratchPool />);

    const sortButton = screen.getByRole("button", { name: /Sort:/ });
    expect(sortButton).toHaveClass("focus-visible:ring-2");
    expect(sortButton).toHaveClass("focus-visible:ring-ring");
  });

  it("search input has focus-visible ring classes", () => {
    render(<ScratchPool />);

    const searchInput = screen.getByLabelText("Search scratches");
    expect(searchInput).toHaveClass("focus-visible:ring-2");
    expect(searchInput).toHaveClass("focus-visible:ring-ring");
  });

  it("manual expand records selectedScratchId in scratchPoolManualExpandedForId", () => {
    useTriageStore.setState({ selectedScratchId: "scratch-1", scratchPoolExpanded: false });
    useInboxMock.mockReturnValue({
      activeScratchBits: [createBit({ id: "scratch-1", title: "Scratch one" })],
    });

    render(<ScratchPool />);

    fireEvent.click(screen.getByLabelText("Expand Scratch Pool"));

    expect(useTriageStore.getState().scratchPoolManualExpandedForId).toBe("scratch-1");
  });

  it("changing selectedScratchId resets scratchPoolManualExpandedForId to null", () => {
    useTriageStore.setState({
      selectedScratchId: "scratch-1",
      scratchPoolManualExpandedForId: "scratch-1",
    });
    useInboxMock.mockReturnValue({
      activeScratchBits: [
        createBit({ id: "scratch-1", title: "Scratch one" }),
        createBit({ id: "scratch-2", title: "Scratch two" }),
      ],
    });

    render(<ScratchPool />);

    useTriageStore.getState().selectScratch("scratch-2");

    expect(useTriageStore.getState().scratchPoolManualExpandedForId).toBeNull();
  });
});

describe("common Scratch createdAt metadata", () => {
  it("renders the padded local date from createdAt while preserving selection and search", () => {
    const bit = createBit({ id: "date-owner", title: "Date owner", createdAt: new Date(2026, 4, 4).getTime(), mtime: Date.now() });
    useInboxMock.mockReturnValue({ activeScratchBits: [bit], poolLifecycleProjection: { revision: 0, changes: [] } });
    const { rerender } = render(<ScratchPool />);
    const row = screen.getByRole("button", { name: /Date owner/ });
    expect(row.querySelector(".scratch-pool__row-time")).toHaveTextContent("4/05/26");
    expect(row).not.toHaveTextContent("LAST_STAMP:");
    fireEvent.click(row);
    expect(useTriageStore.getState().selectedScratchId).toBe(bit.id);
    fireEvent.change(screen.getByRole("textbox", { name: "Search scratches" }), { target: { value: "Date" } });
    rerender(<ScratchPool />);
    expect(screen.getByRole("button", { name: /Date owner/ })).toBe(row);
    expect(row.querySelector(".scratch-pool__row-time")).toHaveTextContent("4/05/26");
  });
});

describe("ScratchPool Trash control (Task 210)", () => {
  function renderWithTrash(
    reasons: Record<string, TrashScratchDisabledReason | null> = {},
  ) {
    const request = vi.fn();
    const entries: TrashScratchEntries = {
      disabledReason: (id) => reasons[id] ?? null,
      request,
    };
    useInboxMock.mockReturnValue({
      activeScratchBits: [
        createBit({ id: "a", title: "Alpha" }),
        createBit({ id: "b", title: "Beta" }),
      ],
      poolLifecycleProjection: { revision: 0, changes: [] },
    });
    render(
      <TrashScratchEntriesContext.Provider value={entries}>
        <ScratchPool />
      </TrashScratchEntriesContext.Provider>,
    );
    return { request };
  }

  it("renders a sibling Trash button per row, never nested in the selection button", () => {
    renderWithTrash();
    const trash = screen.getByRole("button", { name: 'Move "Alpha" to Trash' });
    const select = screen.getByRole("button", { name: "Alpha" });
    expect(trash).toHaveAttribute("data-triage-role", "pool-row-trash-action");
    expect(trash).toHaveAttribute("data-scratch-trash-entry", "pool");
    expect(trash).toHaveAttribute("title", "Move to Trash");
    expect(select.contains(trash)).toBe(false);
    expect(select.parentElement).toBe(trash.parentElement);
    expect(select).toHaveClass("h-[52px]");
  });

  it("requests Trash for the right Scratch with the control as opener, without selecting the row", () => {
    const { request } = renderWithTrash();
    const trash = screen.getByRole("button", { name: 'Move "Beta" to Trash' });
    fireEvent.click(trash);
    expect(request).toHaveBeenCalledWith("b", trash);
    expect(useTriageStore.getState().selectedScratchId).toBeNull();
    expect(departureState.requestDeparture).not.toHaveBeenCalled();
  });

  it.each([
    ["placement-open", "Finish or cancel placement to move a Scratch to Trash."],
    [
      "unresolved-source",
      "A staged item in this Scratch lost its source. Resolve it in Staging first.",
    ],
    ["operation-pending", "Wait for the current action to finish."],
  ] as const)(
    "disables the control for %s and exposes the reason as description and tooltip",
    (reason, copy) => {
      const { request } = renderWithTrash({ a: reason });
      const trash = screen.getByRole("button", { name: 'Move "Alpha" to Trash' });
      expect(trash).toBeDisabled();
      expect(trash).toHaveAttribute("title", copy);
      expect(trash).toHaveAccessibleDescription(copy);
      fireEvent.click(trash);
      expect(request).not.toHaveBeenCalled();
      expect(
        screen.getByRole("button", { name: 'Move "Beta" to Trash' }),
      ).toBeEnabled();
    },
  );

  it("has no Trash control on collapsed switchers", () => {
    useTriageStore.setState({ scratchPoolExpanded: false });
    renderWithTrash();
    expect(
      screen.queryByRole("button", { name: /to Trash/ }),
    ).not.toBeInTheDocument();
  });

  it("renders no Trash control without a coordinator", () => {
    useInboxMock.mockReturnValue({
      activeScratchBits: [createBit({ id: "a", title: "Alpha" })],
      poolLifecycleProjection: { revision: 0, changes: [] },
    });
    render(<ScratchPool />);
    expect(screen.queryByRole("button", { name: /to Trash/ })).not.toBeInTheDocument();
  });
});
