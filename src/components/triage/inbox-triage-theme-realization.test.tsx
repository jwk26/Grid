import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTriageStore } from "@/stores/triage-store";
import { useTriagePreferencesStore } from "@/stores/triage-preferences-store";
import { INBOX_TRIAGE_COPY } from "@/lib/copy/inbox-triage";
import type { Bit } from "@/types";
import { ScratchPool } from "./scratch-pool";
import { BreakdownPanel as RealBreakdownPanel } from "./breakdown-panel";
import { StagingZone } from "./staging-zone";
import { GridExplorerSearchResults } from "./grid-explorer-search-results";
import { TriageDragToken } from "./triage-drag-token";
import { NodeCard } from "@/components/grid/node-card";
import { BitCard } from "@/components/grid/bit-card";

vi.mock("@/hooks/use-archive", () => ({
  useArchiveActions: () => ({ archive: vi.fn() }),
}));

const inbox = vi.hoisted(() => ({ bits: [] as Bit[] }));
vi.mock("@/hooks/use-inbox", () => ({
  useInbox: () => ({ activeScratchBits: inbox.bits, poolLifecycleProjection: { revision: 0, changes: [] } }),
}));
vi.mock("@/hooks/use-triage-operation-lock", () => ({
  useTriageOperationLockContext: () => ({ activeOperation: null, isLocked: () => false }),
}));
vi.mock("@/hooks/use-triage-departure", () => ({
  useTriageDepartureContext: () => ({ pendingDestination: null, registerAddDraftOwner: () => () => {}, setAddDraft: vi.fn(), requestDeparture: (destination: {perform: () => void; focus?: () => void}) => { destination.perform(); destination.focus?.(); } }),
}));

const l2 = vi.hoisted(() => ({ stagedIds: new Set<string>() }));
vi.mock("@/hooks/use-scratch-breakdowns", () => ({
  useScratchTitleBlockerContext: () => ({ getSnapshot: () => null, setSnapshot: vi.fn(), subscribe: () => () => {} }),
  useScratchBreakdowns: () => ({ breakdowns: [{ id: "idea", scratchBitId: "first", content: "Prepare the research summary", order: 0, createdAt: 2000, consumedAt: null, version: 1 }],
    consumedBreakdownCount: 0, hasObservedBreakdownHistory: true, isArchiveEligible: false, operations: [],
    editor: { snapshot: null, focusIntent: null, openScratchTitle: vi.fn(), openBreakdown: vi.fn() },
    addBreakdown: vi.fn(), deleteBreakdown: vi.fn() }),
}));

// The panel takes staged-source state as props from the workspace.
function BreakdownPanel() {
  return (
    <RealBreakdownPanel
      archiveCandidateClear={l2.stagedIds.size === 0}
      authoritativeStagedSourceIds={l2.stagedIds}
      stagedSourceIds={l2.stagedIds}
    />
  );
}

function scratch(id: string, title: string, createdAt: number): Bit {
  return { id, title, createdAt, description: "", icon: "sparkles", deadline: null,
    deadlineAllDay: false, priority: null, status: "active", mtime: createdAt,
    parentId: "inbox", x: 0, y: 0, deletedAt: null, archivedAt: null, version: 1,
    pastDeadlineDismissed: false };
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  inbox.bits = [scratch("first", "Plan the autumn release", 2000), scratch("second", "Collect workshop feedback", 1000)];
  useTriageStore.setState({ selectedScratchId: "first", scratchPoolExpanded: true,
    scratchPoolManualExpandedForId: null, scratchPoolQuery: "", scratchPoolActiveIds: ["first", "second"],
    scratchPoolResultIds: ["first", "second"], scratchPoolScroll: { anchorId: null, offset: 0 } });
  useTriagePreferencesStore.setState({ poolCreatedAtSort: "DESC" });
});
afterEach(() => {
  cleanup();
  document.head.querySelectorAll("[data-task167-sort-labels]").forEach(style => style.remove());
  document.documentElement.removeAttribute("data-color-theme");
});

it("keeps actual Finder and ordinary card identities across shared theme rerenders", () => {
  const node = { id: "finder-node", title: "Finder Identity", icon: "Folder", color: "red",
    createdAt: 2000, mtime: 2000, parentId: null, level: 0, x: 0, y: 0, version: 1,
    deadline: null, deadlineAllDay: false, deletedAt: null, archivedAt: null,
    systemRole: null, hiddenFromGrid: false, pastDeadlineDismissed: false };
  const bit = scratch("finder-bit", "Finder Bit", 2000);
  const activate = vi.fn();
  const tree = <><NodeCard node={node} onClick={activate} presentation="inbox-explorer" />
    <NodeCard node={{ ...node, id: "ordinary", title: "Ordinary Identity" }} onClick={activate} />
    <BitCard bit={bit} parentColor="red" chunkStats={{ completed: 0, total: 0 }} onClick={activate} presentation="inbox-explorer" />
    <BitCard aria-label="Ordinary Bit" bit={{ ...bit, id: "ordinary-bit", title: "Ordinary Bit", priority: "high" }} parentColor="red" chunkStats={{ completed: 1, total: 4 }} onClick={activate} /></>;
  const view = render(tree);
  const finder = screen.getByRole("button", { name: "Finder Identity" });
  const ordinary = screen.getByRole("button", { name: "Ordinary Identity" });
  const actualBit = screen.getByText("Finder Bit").closest('[role="button"]');
  const ordinaryBit = screen.getByRole("button", { name: "Ordinary Bit" });
  for (const theme of ["griddo", "tiny-desk", "neumorphism", "claymorphism", "origami", "terminal", "retro-mac", "graphite"]) {
    document.documentElement.dataset.colorTheme = theme;
    view.rerender(tree);
    expect(screen.getByRole("button", { name: "Finder Identity" })).toBe(finder);
    expect(finder).toHaveAttribute("data-card-presentation", "inbox-explorer");
    expect(finder).toHaveClass("cursor-pointer");
    expect(screen.queryByLabelText("Finder Identity options")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Ordinary Identity options")).toBeInTheDocument();
    expect(actualBit).toHaveClass("cursor-default");
    expect(screen.queryByLabelText("Finder Bit options")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ordinary Identity" })).toBe(ordinary);
    expect(ordinary).toHaveAttribute("data-card-presentation", "default");
    expect(screen.getByText("Finder Bit").closest('[role="button"]')).toBe(actualBit);
    expect(screen.getByRole("button", { name: "Ordinary Bit" })).toBe(ordinaryBit);
    expect(ordinaryBit).toHaveAttribute("data-card-presentation", "default");
    expect(ordinaryBit).toHaveClass("cursor-grab");
    expect(within(ordinaryBit).getByText("high")).toBeInTheDocument();
    expect(within(ordinaryBit).getByText("1/4")).toBeInTheDocument();
    expect(screen.getByLabelText("Ordinary Bit options")).toBeInTheDocument();
  }
  fireEvent.click(finder);
  expect(activate).toHaveBeenCalledOnce();
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const rules = css.matchAll(/([^{}]+)\{([^{}]*)\}/g);
  for (const [rule, selector] of rules) {
    if (selector.includes('data-card-presentation="inbox-explorer"')) {
      if (!selector.includes('[data-triage-role="explorer-card-state"]') && !selector.includes('[data-card-state="overdue"]') && !selector.includes('.theme-node-card')) {
        // Q01: retro-mac (Task 169) and, by the user's 2026-10-17 decision, neumorphism (Task 176).
        expect(selector).toMatch(/:root\[data-color-theme="(?:retro-mac|neumorphism)"\]/);
      }
      expect(rule).not.toContain("--grid-node-size:");
    }
  }
});

describe("Inbox/Triage shared theme realization — L1", () => {
  it.each(["griddo", "tiny-desk", "neumorphism", "claymorphism", "origami", "terminal", "retro-mac", "graphite"])("retains a single semantic Pool tree under %s", theme => {
    document.documentElement.dataset.colorTheme = theme;
    render(<ScratchPool />);
    const pool = screen.getByTestId("scratch-pool");
    const heading = within(pool).getByRole("heading", { name: "Scratch Pool" });
    expect(heading).toHaveAttribute("id", "triage-scratch-pool-heading");
    expect(within(pool).getByRole("textbox", { name: "Search scratches" })).toBeInTheDocument();
    expect(within(pool).getByRole("button", { name: "Plan the autumn release" })).toHaveAttribute("aria-pressed", "true");
    expect(within(pool).getByRole("button", { name: "Collect workshop feedback" })).toHaveAttribute("data-triage-role", "pool-row");
    expect(pool.querySelector('[data-triage-role="pool-total-count"]')).toHaveTextContent("2");
  });

  it("retains Pool query, selected Context identity, sort and focus across a same-tree theme rerender", () => {
    const { rerender } = render(<ScratchPool />);
    const search = screen.getByRole("textbox", { name: "Search scratches" });
    fireEvent.change(search, { target: { value: "feedback" } });
    search.focus();
    useTriagePreferencesStore.setState({ poolCreatedAtSort: "ASC" });
    document.documentElement.dataset.colorTheme = "retro-mac";
    rerender(<ScratchPool />);
    expect(screen.getByRole("textbox", { name: "Search scratches" })).toBe(search);
    expect(search).toHaveValue("feedback");
    expect(search).toHaveFocus();
    expect(useTriageStore.getState().selectedScratchId).toBe("first");
    expect(useTriagePreferencesStore.getState().poolCreatedAtSort).toBe("ASC");
    expect(screen.getByText("Selected Scratch is hidden by this search.")).toBeInTheDocument();
  });

  it("orders compact identity/count before expand, then the unfiltered switchers", () => {
    useTriageStore.setState({ scratchPoolExpanded: false, scratchPoolQuery: "release" });
    render(<ScratchPool />);
    const pool = screen.getByTestId("scratch-pool");
    const count = pool.querySelector('[data-triage-role="pool-total-count"]')!;
    const expand = screen.getByRole("button", { name: "Expand Scratch Pool" });
    const switchers = screen.getByRole("group", { name: "Switch scratch" });
    expect(count.compareDocumentPosition(expand) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(expand.compareDocumentPosition(switchers) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(switchers).getAllByRole("button")).toHaveLength(2);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText("Selected Scratch is hidden by this search.")).not.toBeInTheDocument();
  });

  it("keeps the all-active zero count and semantic identity in compact empty state", () => {
    inbox.bits = [];
    useTriageStore.setState({ selectedScratchId: null, scratchPoolExpanded: false });
    render(<ScratchPool />);
    expect(screen.getByTestId("scratch-pool").querySelector('[data-triage-role="pool-total-count"]')).toHaveTextContent("0");
    expect(document.getElementById("triage-scratch-pool-heading")).toHaveTextContent("Scratch Pool");
  });

  it("preserves hidden selection, clear-search focus, and created-at sort semantics", () => {
    render(<ScratchPool />);
    const search = screen.getByRole("textbox", { name: "Search scratches" });
    fireEvent.change(search, { target: { value: "feedback" } });
    expect(screen.getByText("Selected Scratch is hidden by this search.")).toBeInTheDocument();
    expect(useTriageStore.getState().selectedScratchId).toBe("first");
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(search).toHaveFocus();
    expect(useTriageStore.getState().selectedScratchId).toBe("first");
    fireEvent.click(screen.getByRole("button", { name: INBOX_TRIAGE_COPY.baseActions.sortNewestFirst }));
    expect(useTriagePreferencesStore.getState().poolCreatedAtSort).toBe("ASC");
    const rows = [...screen.getByTestId("scratch-pool").querySelectorAll('button[aria-pressed]')];
    expect(rows.map(row => row.getAttribute("aria-label"))).toEqual(["Collect workshop feedback", "Plan the autumn release"]);
  });

  it("keeps shared search then sort roles before the fixed production status and scroll list", () => {
    render(<ScratchPool />);
    fireEvent.change(screen.getByRole("textbox", { name: "Search scratches" }), { target: { value: "feedback" } });
    const pool = screen.getByTestId("scratch-pool");
    const searchRow = pool.querySelector('[data-triage-role="pool-search-row"]');
    const sort = pool.querySelector('[data-triage-role="pool-created-at-sort"]');
    const band = pool.querySelector('[data-triage-role="pool-status-band"]')!;
    const viewport = pool.querySelector('[data-triage-role="pool-scroll-viewport"]')!;
    expect(searchRow).not.toBeNull();
    expect(sort).not.toBeNull();
    expect(searchRow!.compareDocumentPosition(sort!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(sort!.compareDocumentPosition(band) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(band.compareDocumentPosition(viewport) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(viewport.contains(band)).toBe(false);
    expect(useTriageStore.getState().selectedScratchId).toBe("first");
    expect(pool.querySelector('[data-triage-role="pool-total-count"]')).toHaveTextContent("2");
  });
});


describe("Neumorphism L1 frame and Pool (Task 173)", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  it("keeps one sort toggle whose accessible name is stable and whose presentational state follows the order", () => {
    render(<ScratchPool />);
    const sort = screen.getByRole("button", { name: INBOX_TRIAGE_COPY.baseActions.sortNewestFirst });
    expect(sort).toHaveAttribute("data-triage-state", "desc");
    fireEvent.click(sort);
    const flipped = screen.getByRole("button", { name: INBOX_TRIAGE_COPY.baseActions.sortOldestFirst });
    expect(flipped).toBe(sort);
    expect(flipped).toHaveAttribute("data-triage-state", "asc");
  });

  it("renders fixed OLD/NEW track labels from the copy owner inside the single sort button", () => {
    render(<ScratchPool />);
    const sort = screen.getByRole("button", { name: INBOX_TRIAGE_COPY.baseActions.sortNewestFirst });
    const track = sort.querySelector(".scratch-pool__sort-track");
    expect(track).toHaveAttribute("aria-hidden", "true");
    expect([...track!.children].map((node) => node.textContent)).toEqual([
      INBOX_TRIAGE_COPY.baseActions.sortTrackOld,
      INBOX_TRIAGE_COPY.baseActions.sortTrackNew,
    ]);
    expect(INBOX_TRIAGE_COPY.baseActions.sortTrackOld).toBe("OLD");
    expect(INBOX_TRIAGE_COPY.baseActions.sortTrackNew).toBe("NEW");
    expect(css).toMatch(/\.scratch-pool__sort-track \{ display: var\(--triage-pool-sort-track-display, none\); \}/);
  });

  it("gates the neumorphism Pool transitions behind the app reduced-motion class and the OS query", () => {
    for (const target of ['.scratch-pool__sort:not(.transition-none)::before', '.scratch-pool__row:not(.transition-none)', '[data-triage-role="pool-compact-switcher"]:not(.transition-none)::before']) {
      expect(css).toContain(target);
    }
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s*:root\[data-color-theme="neumorphism"\] \.scratch-pool__row\[data-triage-state="default"\]:hover/);
    expect(css).toMatch(/scratch-pool__sort-direction \{\s*display: var\(--triage-pool-sort-badge-display, none\)/);
  });

  it("wraps a long Scratch Trash title inside the dialog card for every theme", () => {
    expect(css).toMatch(/^\.scratch-trash-dialog__content \{ min-inline-size: 0; \}$/m);
    expect(css).toMatch(/^\.scratch-trash-dialog \[data-triage-role="scratch-trash-body"\] \{ overflow-wrap: anywhere; \}$/m);
  });

  it("adds no visible copy through CSS content on the Pool count", () => {
    expect(css).not.toMatch(/pool-total-count"\]::(?:after|before)/);
    render(<ScratchPool />);
    expect(screen.getByTestId("scratch-pool").querySelector('[data-triage-role="pool-total-count"]')).toHaveTextContent(/^2$/);
  });

  it("keeps theme ids out of the Pool markup and scopes the L1 look to the neumorphism root", () => {
    const source = readFileSync(join(process.cwd(), "src/components/triage/scratch-pool.tsx"), "utf8");
    expect(source).not.toMatch(/neumorphism/);
    const l1 = css.slice(css.indexOf("/* Neumorphism L1 (Task 173)")).replace(/\/\*[\s\S]*?\*\//g, "").replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*\s*\}/g, "").replace(/@media[^{]*\{/g, "");
    for (const [, selector] of l1.matchAll(/(?:^|\})\s*([^{}@/][^{}]*)\{/g)) {
      expect(selector.trim()).toMatch(/^:root\[data-color-theme="neumorphism"\]/);
    }
  });

  it("keeps the Pool row Trash control a sibling of the selection button with its own role", () => {
    render(<ScratchPool />);
    const pool = screen.getByTestId("scratch-pool");
    for (const row of pool.querySelectorAll('[data-triage-role="pool-row-container"]')) {
      const selection = row.querySelector('[data-triage-role="pool-row"], [data-triage-role="pool-selected-row"]');
      expect(selection?.querySelector("button")).toBeNull();
    }
  });

  it("keeps collapsed switchers as one labelled group with the selected one pressed", () => {
    useTriageStore.setState({ scratchPoolExpanded: false });
    render(<ScratchPool />);
    const group = screen.getByRole("group", { name: "Switch scratch" });
    const switchers = within(group).getAllByRole("button");
    expect(switchers.map((button) => button.getAttribute("aria-pressed"))).toContain("true");
    expect(switchers.every((button) => button.getAttribute("data-triage-role") === "pool-compact-switcher")).toBe(true);
  });

  it("defines the sort accent in both modes with distinct readable values and consumes it from a scoped rule", () => {
    const light = css.slice(css.indexOf(':root[data-color-theme="neumorphism"] {'));
    const dark = css.slice(css.indexOf('.dark[data-color-theme="neumorphism"] {'));
    expect(light.slice(0, light.indexOf("\n}"))).toContain("--triage-pool-sort-active: #3f4fd0;");
    expect(dark.slice(0, dark.indexOf("\n}"))).toContain("--triage-pool-sort-active: #9aa6ff;");
    expect(light.slice(0, light.indexOf("\n}"))).toContain("--triage-pool-sort-inactive: #566070;");
    expect(dark.slice(0, dark.indexOf("\n}"))).toContain("--triage-pool-sort-inactive: #9aa1ae;");
    expect(css).toMatch(/\.scratch-pool__row:not\(\.transition-none\) \{\s*transition-duration: var\(--triage-pool-motion-duration\);/);
    expect(css).toMatch(/color-theme="neumorphism"\] \.scratch-pool__sort\[data-triage-state="asc"\][^{]*\{[^}]*var\(--triage-pool-sort-active\)/);
  });

  it("Task174 Context marker tokens exist in both modes and the complete state is a ring, not a dot", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const light = css.slice(css.indexOf(':root[data-color-theme="neumorphism"] {'));
    const dark = css.slice(css.indexOf('.dark[data-color-theme="neumorphism"] {'));
    for (const block of [light.slice(0, light.indexOf("\n}")), dark.slice(0, dark.indexOf("\n}"))]) {
      expect(block).toContain("--triage-context-marker-working:");
      expect(block).toContain("--triage-context-marker-complete:");
      expect(block).toContain("--theme-shadow-inset-xs:");
    }
    expect(css).toMatch(/color-theme="neumorphism"\] \.triage-shell \.triage-fixed-context\[data-triage-state="complete"\] \[data-triage-role="context-identity-object"\]::before\s*\{[^}]*background: transparent;[^}]*border: 2px solid var\(--triage-context-marker-complete\)/);
  });

  it("Task174 Breakdown rows keep the raised shadow family, drop the staged fade, and end the success wash on the raised row", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const light = css.slice(css.indexOf(':root[data-color-theme="neumorphism"] {'));
    const dark = css.slice(css.indexOf('.dark[data-color-theme="neumorphism"] {'));
    for (const block of [light.slice(0, light.indexOf("\n}")), dark.slice(0, dark.indexOf("\n}"))]) {
      expect(block).toContain("--theme-shadow-card-hover:");
      expect(block).toContain("--triage-breakdown-grip-hover-bg:");
    }
    expect(css).toMatch(/color-theme="neumorphism"\] \.triage-shell \[data-triage-role="breakdown-staged-row"\] \{[^}]*box-shadow: var\(--theme-shadow-inset-sm\);[^}]*opacity: 0\.35;/);
    expect(css).toMatch(/color-theme="neumorphism"\] \.triage-shell \[data-triage-role="breakdown-staged-row"\] :is\(\[data-triage-role="breakdown-grip-control"\], \[data-triage-role="breakdown-row-action"\]\):disabled \{\s*opacity: 0\.1;/);
    expect(css).toMatch(/\[data-triage-role="breakdown-active-row"\]\[data-triage-state="active"\]:hover \{\s*box-shadow: var\(--theme-shadow-card-hover\);/);
    expect(css).toMatch(/--breakdown-success-rest-shadow: var\(--theme-shadow-card\);/);
    expect(css).toMatch(/@keyframes breakdown-success-wash-neumorphism \{[\s\S]*?to \{[^}]*box-shadow: var\(--breakdown-success-rest-shadow\);/);
    expect(css).toMatch(/\[data-triage-role="breakdown-ordinary-empty"\] > \[data-triage-role="breakdown-empty-object"\] \{[^}]*block-size: 112px;[^}]*box-shadow: var\(--theme-shadow-inset\);/);
    expect(css).toMatch(/\[data-triage-role="breakdown-consumed-completion"\] > \[data-triage-role="breakdown-empty-object"\] \{[^}]*block-size: 64px;[^}]*box-shadow: var\(--theme-shadow-inset-sm\);/);
    expect(css).toMatch(/color-theme="neumorphism"\] \.triage-shell \.triage-fixed-breakdown-row \{[^}]*column-gap: 12px;/);
    expect(css).toMatch(/\[data-triage-role="breakdown-grip-control"\] \{\s*box-shadow: var\(--theme-shadow-card-xs\);/);
    expect(css).toMatch(/\[data-triage-role="breakdown-grip-control"\]:not\(:disabled\):hover \{\s*background: var\(--triage-breakdown-grip-hover-bg\);/);
    expect(css).toMatch(/\.scratch-pool \.scratch-pool__toggle:not\(:disabled\):hover \{\s*color: hsl\(var\(--foreground\) \/ 0\.9\);/);
    expect(css).toMatch(/\.scratch-pool \.scratch-pool__toggle:not\(:disabled\):active \{\s*box-shadow: var\(--theme-shadow-inset-sm\);/);
    expect(css).toMatch(/pool-row-trash-action"\]\):not\(:disabled\):not\(\.transition-none\):hover \{\s*transform: translateY\(-1px\);/);
    expect(css).toMatch(/pool-row-trash-action"\]:not\(:disabled\):hover \{[^}]*box-shadow: var\(--theme-shadow-card\);[^}]*var\(--triage-pool-destructive-ink\)/);
    expect(css).toMatch(/pool-row-trash-action"\]:not\(:disabled\):active \{\s*box-shadow: var\(--theme-shadow-inset-sm\);/);
  });

  it("Task174 Stage 3 realizes the editors, reliability lines, departure sheet and Delete dialog from the shared shadow family", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toMatch(/color-theme="neumorphism"\] :is\(\.scratch-trash-dialog, \.breakdown-delete-dialog\) \{/);
    expect(css).toMatch(/color-theme="neumorphism"\] :is\(\.scratch-trash-dialog-overlay, \.breakdown-delete-dialog-overlay\) \{/);
    expect(css).toMatch(/color-theme="neumorphism"\] \.triage-inline-editor__field \{[^}]*border-radius: 999px;[^}]*box-shadow: var\(--theme-shadow-inset-sm\);/);
    expect(css).toMatch(/color-theme="neumorphism"\] \.breakdown-reliability \{[^}]*box-shadow: var\(--theme-shadow-inset-sm\);/);
    expect(css).toMatch(/color-theme="neumorphism"\] \.breakdown-reliability__action \{[^}]*box-shadow: var\(--theme-shadow-card-xs\);/);
    expect(css).toMatch(/color-theme="neumorphism"\] \.breakdown-departure-sheet \{[^}]*box-shadow: var\(--theme-shadow-inset-sm\);/);
    expect(css).toMatch(/\[data-triage-role="breakdown-departure-continue"\]:active \{\s*background-color: var\(--page-bg\);\s*box-shadow: var\(--theme-shadow-card\);\s*color: var\(--triage-pool-sort-active\);/);
    // The shared red bracket (inset 3px destructive stub) is cleared on the neumorphism Discard action.
    expect(css).toMatch(/color-theme="neumorphism"\] \.breakdown-departure-sheet__discard:active \{\s*background-color: transparent;\s*box-shadow: none;\s*color: var\(--triage-pool-destructive-ink\);/);
  });
});

describe("Task167 L2 shared theme conformance", () => {
  it.each(["griddo", "tiny-desk", "neumorphism", "claymorphism", "origami", "terminal", "retro-mac", "graphite"])("preserves accessible Context Edit and sort while selecting their decoration in %s", theme => {
    document.documentElement.dataset.colorTheme = theme;
    const style = document.createElement("style");
    style.dataset.task167SortLabels = "true";
    style.textContent = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8").match(
      /(?:^|\n)[^{}]*\[data-triage-role="context-(?:edit-label|sort-icon|sort-(?:current|next|order|short)-label)"\][^{]*\{[^}]*\}/g,
    )?.join("\n") ?? "";
    document.head.append(style);
    useTriagePreferencesStore.setState({ breakdownCreatedAtSort: "DESC" });
    render(<div className="triage-shell"><BreakdownPanel /></div>);
    const context = screen.getByTestId("selected-scratch-context");
    const edit = within(context).getByRole("button", { name: "Edit" });
    const label = edit.querySelector('[data-triage-role="context-edit-label"]');
    const icon = context.querySelector('[data-triage-role="context-sort-icon"]');
    expect(label).toHaveTextContent("Edit");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(edit).toBeEnabled();
    expect(getComputedStyle(label!).display === "none").toBe(theme === "retro-mac" || theme === "neumorphism");
    expect(getComputedStyle(icon!).display === "none").toBe(theme === "retro-mac" || theme === "neumorphism");
    const track = context.querySelector('[data-triage-role="context-sort-short-label"]');
    expect(track).toHaveAttribute("aria-hidden", "true");
    expect(track).toHaveTextContent(INBOX_TRIAGE_COPY.baseActions.sortTrackNew);
    expect(getComputedStyle(track!).display === "none").toBe(theme !== "neumorphism");
    const order = context.querySelector('[data-triage-role="context-sort-order-label"]');
    expect(getComputedStyle(order!).display === "none").toBe(theme === "neumorphism");
    const sort = within(context).getByRole("button", {
      name: theme === "retro-mac" ? "OLD FIRST" : INBOX_TRIAGE_COPY.baseActions.sortNewestFirst,
    });
    fireEvent.click(sort);
    expect(useTriagePreferencesStore.getState().breakdownCreatedAtSort).toBe("ASC");
    expect(within(context).getByRole("button", { name: "Edit" })).toBe(edit);
  });

  it.each(["griddo", "tiny-desk", "neumorphism", "claymorphism", "origami", "terminal", "retro-mac", "graphite"])("preserves current-order names except the approved next-order presentation in %s", theme => {
    document.documentElement.dataset.colorTheme = theme;
    const style = document.createElement("style");
  style.dataset.task167SortLabels = "true";
  style.textContent = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8").match(
    /(?:^|\n)[^{}]*\[data-triage-role="context-sort-(?:current|next)-label"\][^{]*\{[^}]*\}/g,
  )?.join("\n") ?? "";
  document.head.append(style);
    useTriagePreferencesStore.setState({ breakdownCreatedAtSort: "DESC" });
    render(<div className="triage-shell"><BreakdownPanel /></div>);
    const context = screen.getByTestId("selected-scratch-context");
    const name = theme === "retro-mac" ? "OLD FIRST" : INBOX_TRIAGE_COPY.baseActions.sortNewestFirst;
    const sort = within(context).getByRole("button", { name });
    fireEvent.click(sort);
    expect(useTriagePreferencesStore.getState().breakdownCreatedAtSort).toBe("ASC");
    expect(within(context).getByRole("button", {
      name: theme === "retro-mac" ? "NEW FIRST" : INBOX_TRIAGE_COPY.baseActions.sortOldestFirst,
    })).toBe(sort);
    expect(screen.getByTestId("selected-scratch-context")).toBe(context);
  });
  it.each(["griddo", "tiny-desk", "neumorphism", "claymorphism", "origami", "terminal", "retro-mac", "graphite"])("keeps canonical identity/actions and staged source gates in %s", theme => {
    document.documentElement.dataset.colorTheme = theme;
    l2.stagedIds = new Set();
    const view = render(<BreakdownPanel />);
    const context = screen.getByTestId("selected-scratch-context");
    expect(within(context).getByText("Plan the autumn release")).toHaveAttribute("data-triage-role", "context-title");
    expect(context.querySelector('[data-triage-role="context-timestamp"]')).toBeVisible();
    expect(within(context).getByRole("button", { name: "Edit" })).toBeEnabled();
    const row = screen.getByTestId("breakdown-row");
    expect(within(row).getByRole("button", { name: "Drag breakdown" })).toBeEnabled();
    l2.stagedIds = new Set(["idea"]);
    view.rerender(<BreakdownPanel />);
    expect(screen.getByTestId("breakdown-row")).toBe(row);
    expect(row).toHaveAttribute("data-triage-role", "breakdown-staged-row");
    expect(within(row).getByRole("button", { name: "Drag breakdown" })).toBeDisabled();
    expect(within(row).getByRole("button", { name: "Edit" })).toBeDisabled();
    expect(within(row).getByRole("button", { name: "Delete" })).toBeDisabled();
    expect(screen.getByTestId("selected-scratch-context")).toBe(context);
    l2.stagedIds = new Set();
  });
});

describe("one shared date body across all theme consumers", () => {
  it.each(["griddo", "tiny-desk", "neumorphism", "claymorphism", "origami", "terminal", "retro-mac", "graphite"])("uses createdAt rather than mtime in Pool and Context for %s", theme => {
    vi.spyOn(Date, "now").mockReturnValue(new Date(2026, 5, 17, 12).getTime());
    document.documentElement.dataset.colorTheme = theme;
    inbox.bits = [{ ...scratch("first", "Date identity", new Date(2026, 4, 4).getTime()), mtime: Date.now() }];
    const view = render(<div className="triage-shell"><ScratchPool /><BreakdownPanel /></div>);
    const body = screen.getByTestId("selected-scratch-context").querySelector('[data-triage-role="context-timestamp-value"]');
    expect(body).toHaveTextContent("4/05/26");
    expect(screen.getByTestId("scratch-pool").querySelector(".scratch-pool__row-time")).toHaveTextContent("4/05/26");
    expect(screen.getByTestId("scratch-pool").querySelector('[data-triage-role="context-timestamp-prefix"]')).toBeNull();
    document.documentElement.dataset.colorTheme = "retro-mac";
    view.rerender(<div className="triage-shell"><ScratchPool /><BreakdownPanel /></div>);
    expect(screen.getByTestId("selected-scratch-context").querySelector('[data-triage-role="context-timestamp-value"]')).toBe(body);
    vi.restoreAllMocks();
  });
});


describe("Neumorphism L3 drop targets and drag token (Task 175)", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  it("skins Remove and Return with opaque inset surfaces; their motion is the Task 176 (g) fade and hover transition only", () => {
    expect(css).toMatch(/color-theme="neumorphism"\] \.triage-staging__remove,\s*:root\[data-color-theme="neumorphism"\] \.triage-breakdown__return \{[^}]*background: var\(--page-bg\);[^}]*box-shadow: var\(--theme-shadow-inset-sm\);/);
    expect(css).toMatch(/\.triage-staging__remove\[data-triage-state="active-hover"\],\s*:root\[data-color-theme="neumorphism"\] \.triage-breakdown__return\[data-drop-active="true"\] \{[^}]*background: color-mix\(in srgb, var\(--page-bg\) 91%[^}]*box-shadow: var\(--theme-shadow-inset\);/);
    // No transform or scale on either target; the only animation is the opacity fade-in.
    expect(css).not.toMatch(/color-theme="neumorphism"\] \.triage-breakdown__return[^{]*\{[^}]*(?:[^-]transform:|opacity)/);
  });

  it("fades Remove and Return in at drag start and takes the subsection hover transition (Task 176 g, h)", () => {
    const from = css.indexOf("/* Task 176 Stage 4 (g");
    const block = css.slice(from).replace(/\/\*[\s\S]*?\*\//g, "");
    expect(block).toMatch(/:is\(\.triage-staging__remove, \.triage-breakdown__return\):not\(\.transition-none\) \{[^}]*animation: triage-target-fade-in var\(--triage-pool-motion-duration\) ease-out;[^}]*transition-property: background-color, box-shadow;/);
    expect(block).toMatch(/@keyframes triage-target-fade-in \{\s*from \{ opacity: 0; \}\s*to \{ opacity: 1; \}\s*\}/);
    expect(block).toMatch(/prefers-reduced-motion: reduce\) \{[^}]*animation: none; transition: none;/);
    expect(css).toMatch(/color-theme="neumorphism"\] \.triage-breakdown__return \{\s*border-radius: 18px;\s*inset: 0;/);
  });

  it("places the Remove target in flow-like geometry above the section bottom, not over the wells", () => {
    expect(css).toMatch(/color-theme="neumorphism"\] \.triage-staging:has\(\.triage-staging__remove\) \.triage-shell__staging \{ padding-block-end: 68px; \}/);
    expect(css).toMatch(/color-theme="neumorphism"\] \.triage-staging__remove \{[^}]*block-size: 40px;[^}]*border-radius: 18px;[^}]*bottom: 16px;[^}]*inline-size: auto;[^}]*inset-inline: 16px;/);
  });

  it("realizes DP-VQ06-STAGING as an inset alert well, raised count and alert action, and an inset status line", () => {
    expect(css).toMatch(/color-theme="neumorphism"\] \.triage-staging \.staging-local-alert \{[^}]*border: 0;[^}]*box-shadow: var\(--theme-shadow-inset-sm\);/);
    expect(css).toMatch(/color-theme="neumorphism"\] \.triage-staging :is\(\.staging-alert-action, \.staging-arrival-count\) \{[^}]*box-shadow: var\(--theme-shadow-card-xs\);/);
    expect(css).toMatch(/color-theme="neumorphism"\] \.triage-staging :is\(\.staging-alert-action, \.staging-arrival-count\):not\(:disabled\):active \{\s*box-shadow: var\(--theme-shadow-inset-sm\);/);
    expect(css).toMatch(/color-theme="neumorphism"\] \.staging-operation-status,\s*:root\[data-color-theme="neumorphism"\] \[data-triage-role="staging-integrity-status"\] \{[^}]*box-shadow: var\(--theme-shadow-inset-xs\);/);
    expect(css).not.toMatch(/color-theme="neumorphism"\] \.staging-(?:operation-status|target-reason)[^{]*\{[^}]*content:/);
  });

  it("raises the drag token and quiets well drag states without a ring", () => {
    expect(css).toMatch(/color-theme="neumorphism"\] \.triage-drag-token \{[^}]*box-shadow: var\(--theme-shadow-card-hover\);/);
    expect(css).toMatch(/color-theme="neumorphism"\] \.triage-staging__well:is\([^)]*\[data-triage-state="invalid"\]\) \{[^}]*box-shadow: none;/);
  });

  it("states the Staging drop region on the whole subsection in depth and tint, not lines (Task 176 Stage 4)", () => {
    const from = css.indexOf("/* Task 176 Stage 4");
    const stage = css.slice(from, css.indexOf("/* Task 175 Stage 3", from)).replace(/\/\*[\s\S]*?\*\//g, "");
    expect(stage).toMatch(/\.triage-staging__well \{[^}]*border-color: transparent;[^}]*box-shadow: none;/);
    expect(stage).toMatch(/\.triage-staging__subsection\[data-triage-state="valid"\] \{[^}]*color-mix[^}]*box-shadow: var\(--theme-shadow-inset\), var\(--theme-shadow-inset-sm\);/);
    expect(stage).toMatch(/\[data-triage-state="invalid"\]\) \{[^}]*box-shadow: none;/);
    expect(stage).toMatch(/\.triage-shell__subsection-heading, \.triage-staging__well > :is\(\.grid, \.flex-col\)\) \{[^}]*opacity: 0\.7;/);
    expect(stage).not.toMatch(/outline|border-style|dashed|(?:^|[^a-z])ring/);
  });
});

describe("Neumorphism L4 Explorer base chrome (Task 176)", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const stage = css.slice(css.indexOf("/* Task 176 Stage 1"));

  it("draws four inset plates with full uppercase labels and no scrollbar chrome", () => {
    expect(stage).toMatch(/\[data-triage-role="explorer-pane"\] \{[^}]*border-radius: 20px;[^}]*box-shadow: var\(--theme-shadow-inset\);/);
    expect(stage).toMatch(/\[data-triage-role="explorer-column-label"\] \{[^}]*text-transform: uppercase;/);
    expect(stage).toMatch(/\[data-triage-role="explorer-viewport"\] \{[^}]*scrollbar-width: none;/);
    expect(stage).not.toMatch(/(?:^|[\s{;])content:/);
  });

  it("raises Node and Bit rows through the Task 169 card hooks and keeps hover colour-only", () => {
    expect(stage).toMatch(/data-card-presentation="inbox-explorer"\]:is\(\[data-triage-role="explorer-card-node"\], \[data-triage-role="explorer-card-bit"\]\) \{[^}]*border-radius: 18px;[^}]*box-shadow: var\(--theme-shadow-card\);/);
    const hover = stage.match(/explorer-card-bit"\]\):hover \{([^}]*)\}/)?.[1] ?? "";
    expect(hover).toContain("box-shadow: var(--theme-shadow-card)");
    expect(hover).not.toMatch(/transform|translate|scale/);
  });

  it("marks the selected Node with inset depth plus a darker surface, and completed Bits with strike-through", () => {
    expect(stage).toMatch(/\[aria-current="true"\] \{[^}]*background: color-mix\(in srgb, var\(--page-bg\) 80%[^}]*box-shadow: var\(--theme-shadow-inset-sm\);/);
    expect(stage).toMatch(/data-card-muted="true"\] \[data-triage-role="explorer-card-title"\] \{[^}]*text-decoration: line-through;/);
  });

  it("styles the header search control as the shared raised control", () => {
    expect(stage).toMatch(/\.explorer-search-entry \{[^}]*box-shadow: var\(--theme-shadow-card-xs\);/);
    expect(stage).toMatch(/\.explorer-search-entry:hover \{[^}]*translateY\(-1px\)/);
    expect(stage).toMatch(/\.explorer-search-entry:active \{[^}]*box-shadow: var\(--theme-shadow-inset-sm\)/);
    expect(stage).toMatch(/\.explorer-search-entry:not\(\.transition-none\) \{[^}]*var\(--triage-pool-motion-duration\)/);
    expect(stage).toMatch(/prefers-reduced-motion: reduce\) \{[^}]*explorer-search-entry \{ transition: none; \}/);
    expect(css).not.toMatch(/color-theme="neumorphism"\] \.explorer-search-entry \{[^}]*text-shadow/);
  });
});

describe("Neumorphism L4 targets and DP-VQ06-EXPLORER (Task 176 Stage 2)", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const stage = css.slice(css.indexOf("/* Task 176 Stage 2"));

  it("paints column targets on the whole pane with depth and tint only, no pulse", () => {
    const target = stage.slice(0, stage.indexOf("DP-VQ06-EXPLORER")).replace(/\/\*[\s\S]*?\*\//g, "");
    expect(target).toMatch(/explorer-pane"\] \{[^}]*animation: none;/);
    expect(target).toMatch(/explorer-pane"\]\[data-triage-target-state="idle-valid"\] \{[^}]*color-mix[^}]*box-shadow: var\(--theme-shadow-inset\);/);
    expect(target).toMatch(/\[data-triage-target-state="pending-confirmation"\]\) \{[^}]*box-shadow: var\(--theme-shadow-inset\), var\(--theme-shadow-inset-sm\);/);
    expect(target).toMatch(/\[data-triage-target-state="invalid"\]\) \{[^}]*box-shadow: none;[^}]*cursor: not-allowed;[^}]*opacity: 0\.7;/);
    expect(target).toMatch(/explorer-node-target"\] \{[^}]*box-shadow: none;/);
    expect(target).not.toMatch(/outline|[^-]transform:/);
  });

  it("realizes the count control and Dismiss as raised controls and the notice as an inset line", () => {
    expect(stage).toMatch(/\.explorer-remote-count,\s*:root\[data-color-theme="neumorphism"\] \.explorer-status-action \{[^}]*box-shadow: var\(--theme-shadow-card-xs\);/);
    expect(stage).toMatch(/:is\(\.explorer-remote-count, \.explorer-status-action\):hover \{[^}]*translateY\(-1px\)/);
    expect(stage).toMatch(/:is\(\.explorer-remote-count, \.explorer-status-action\):active \{[^}]*var\(--theme-shadow-inset-sm\)/);
    expect(stage).toMatch(/\.explorer-path-status \{[^}]*box-shadow: var\(--theme-shadow-inset-xs\);/);
    // The earlier partial rules with hard-coded shadows are gone (rewritten, not layered).
    expect(css).not.toMatch(/color-theme="neumorphism"\] \.explorer-(?:path-status|remote-count) \{[^}]*inset 3px 3px 6px hsl/);
  });
});

describe("Neumorphism target transition and Retro Mac well line (Task 176 Stage 4 e/f)", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  it("changes target tint and depth over the Pool token, background and box-shadow only, immediate under reduced motion", () => {
    const eFrom = css.indexOf("/* Task 176 Stage 4 (e");
    const block = css.slice(eFrom, css.indexOf("/* Task 176 Stage 4 (g", eFrom)).replace(/\/\*[\s\S]*?\*\//g, "");
    expect(block).toMatch(/\.triage-staging__subsection, \[data-triage-role="explorer-pane"\][^{]*:not\(\.transition-none\) \{[^}]*transition-duration: var\(--triage-pool-motion-duration\);[^}]*transition-property: background-color, box-shadow;/);
    expect(block).toMatch(/prefers-reduced-motion: reduce\) \{[^}]*transition: none;/);
    expect(block).not.toMatch(/transform|opacity|height|width/);
    // The earlier immediate-change rules no longer fight the transition.
    expect(css).not.toMatch(/color-theme="neumorphism"\] \.triage-staging__subsection \{\s*transition: none;/);
  });

  it("leaves other themes' target changes immediate and drops the Retro Mac well's dashed drop-state line", () => {
    expect(css).not.toMatch(/color-theme="(?!neumorphism)[a-z-]+"\][^{]*(?:triage-staging__subsection|explorer-pane)[^{]*\{[^}]*transition-duration: var\(--triage-pool-motion-duration\)/);
    expect(css).toMatch(/color-theme="retro-mac"\] \.triage-staging__well:is\(\[data-triage-state="invalid"\], \[data-triage-state="unavailable"\]\) \{\s*background: transparent; border-color: transparent;/);
    expect(css).not.toMatch(/color-theme="retro-mac"\] \.triage-staging__well:is\([^)]*\) \{[^}]*1px dashed/);
    // The dashed frames mark the whole subsection; a hovered valid one shows only the hatch.
    expect(css).toMatch(/color-theme="retro-mac"\] \.triage-staging__subsection\[data-triage-state="idle-valid"\] \{\s*outline: 1px dashed/);
    expect(css).toMatch(/color-theme="retro-mac"\] \.triage-staging__subsection:is\(\[data-triage-state="invalid"\], \[data-triage-state="unavailable"\]\) \{\s*outline: 1px dashed/);
    expect(css).not.toMatch(/color-theme="retro-mac"\] \.triage-staging__subsection\[data-triage-state="valid"\]/);
  });
});

describe("Neumorphism L4 replacement search (Task 176 Stage 3)", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const stage = css.slice(css.indexOf("/* Task 176 Stage 3"));

  it("draws an inset field, an inset state trough and raised result rows, without CSS-injected copy", () => {
    expect(stage).toMatch(/\.explorer-search-field \{[^}]*border-radius: 999px;[^}]*box-shadow: var\(--theme-shadow-inset\);/);
    expect(stage).toMatch(/\.explorer-search-status,[\s\S]*?explorer-search-undo-status"\] \{[^}]*box-shadow: var\(--theme-shadow-inset-xs\);/);
    expect(stage).toMatch(/\.explorer-search-result \{[^}]*border-radius: 18px;[^}]*box-shadow: var\(--theme-shadow-card\);/);
    expect(stage).toMatch(/\.explorer-search-status:empty \{[^}]*box-shadow: none;/);
    expect(stage).not.toMatch(/(?:^|[\s{;])content:/);
  });

  it("gives the six raised controls the shared interaction and keeps result rows colour-only", () => {
    expect(stage).toMatch(/:is\(\.explorer-search-close, \.explorer-search-retry, \.explorer-search-undo\)[^{]*:hover \{[^}]*translateY\(-1px\)/);
    expect(stage).toMatch(/:is\(\.explorer-search-close, \.explorer-search-retry, \.explorer-search-undo\)[^{]*:active \{[^}]*var\(--theme-shadow-inset-sm\)/);
    expect(stage).toMatch(/:not\(\.transition-none\) \{[^}]*var\(--triage-pool-motion-duration\)/);
    const hover = stage.match(/\.explorer-search-result:hover \{([^}]*)\}/)?.[1] ?? "";
    expect(hover).not.toMatch(/transform|box-shadow/);
  });

  it("rewrote the earlier partial search rules instead of layering over them", () => {
    expect(css).not.toMatch(/color-theme="neumorphism"\] \.explorer-search-(?:body|field|result|status)[^{]*\{[^}]*inset 2px 2px 4px hsl|color-theme="neumorphism"\] \.explorer-search-result \{[^}]*box-shadow: var\(--theme-shadow\);/);
  });
});

describe("L3 shared presentation tree", () => {
  it.each(["griddo", "tiny-desk", "neumorphism", "claymorphism", "origami", "terminal", "retro-mac", "graphite"])("preserves shared neutral and unavailable meanings during real-target presentation in %s", theme => {
    document.documentElement.dataset.colorTheme = theme;
    const item = { kind: "triage-staged-node" as const, id: "candidate", label: "Research" };
    const projection = { candidates: [], integrityCandidates: [], operations: [] };
    render(<><StagingZone type="node" activeDragItem={item} overTargetId="triage-bit-zone-drop" projection={projection} /><StagingZone type="bit" activeDragItem={item} overTargetId="triage-bit-zone-drop" projection={projection} /></>);
    expect(screen.getByTestId("node-staging-zone")).toHaveAttribute("data-triage-state", "neutral");
    expect(screen.getByTestId("node-staging-zone")).toHaveAttribute("data-triage-hover", "false");
    expect(screen.getByTestId("bit-staging-zone")).toHaveAttribute("data-triage-state", "unavailable");
    expect(screen.getByTestId("bit-staging-zone")).toHaveAttribute("data-triage-hover", "true");
    expect(screen.queryByRole("button", { name: /unstage|retry/i })).not.toBeInTheDocument();
  });

  it.each(["griddo", "tiny-desk", "neumorphism", "claymorphism", "origami", "terminal", "retro-mac", "graphite"])("keeps wells quiet and drag preview pointer-inert in %s", theme => {
    document.documentElement.dataset.colorTheme = theme;
    render(<><StagingZone type="node" projection={{ candidates: [], integrityCandidates: [], operations: [] }} /><StagingZone type="bit" projection={{ candidates: [], integrityCandidates: [], operations: [] }} /><TriageDragToken item={{ kind: "triage-breakdown", id: "l3-row", label: "Research note", scratchId: "first", sourceBreakdownId: "l3-row", sourceVersion: 1, sourceLifecycle: "active" }} /></>);
    expect(screen.getByTestId("node-staging-zone")).toHaveAttribute("data-empty", "true");
    expect(screen.getByTestId("bit-staging-zone")).toHaveAttribute("data-empty", "true");
    expect(document.querySelector('[data-triage-role="drag-token"]')).toHaveClass("pointer-events-none");
    expect(screen.queryByRole("button", { name: /unstage|retry/i })).not.toBeInTheDocument();
  });
});


describe("Inbox/Triage shared theme realization — L4 replacement search", () => {
  it("retains the same mounted input, result, scroll and recovery action across theme/mode changes", () => {
    const activate = vi.fn();
    const props = {
      feedback: null, focusTarget: { kind: "result" as const, resultKey: "bit:note" as const },
      query: "note", resultScrollTop: 37, status: "ready" as const,
      results: [{ key: "bit:note" as const, id: "note", type: "bit" as const, title: "Note", icon: "FileText", color: null, breadcrumb: "Home / Documents", ancestorIds: ["documents"], nodePathIds: ["documents"], hierarchyOrder: 0, relevance: "title-prefix" as const, rank: 1 as const, duplicate: null }],
      onClose: vi.fn(), onFocusInput: vi.fn(), onFocusResult: vi.fn(), onQueryChange: vi.fn(), onRetry: vi.fn(), onScrollTopChange: vi.fn(), onSelectResult: vi.fn(),
      getResultUndo: () => ({ actionLabel: "Check again", copy: "We couldn’t confirm whether “Note” was undone.", disabled: false, onActivate: activate, state: "unknown" }),
    };
    const view = render(<GridExplorerSearchResults {...props} />);
    const input = screen.getByRole("searchbox");
    const row = document.querySelector('[data-triage-role="explorer-search-result"]')!;
    const undo = screen.getByRole("button", { name: "Check again" });
    const viewport = screen.getByRole("list", { name: "1 results" });
    undo.focus();
    for (const theme of ["griddo", "tiny-desk", "neumorphism", "claymorphism", "origami", "terminal", "retro-mac", "graphite"]) {
      for (const mode of ["light", "dark"]) {
        document.documentElement.dataset.colorTheme = theme;
        document.documentElement.classList.toggle("dark", mode === "dark");
        view.rerender(<GridExplorerSearchResults {...props} />);
        expect(screen.getByRole("searchbox")).toBe(input);
        expect(input).toHaveValue("note");
        expect(document.querySelector('[data-triage-role="explorer-search-result"]')).toBe(row);
        expect(viewport.scrollTop).toBe(37);
        expect(undo).toHaveFocus();
        expect(screen.getByText(props.getResultUndo().copy)).toBeVisible();
        expect(document.querySelector('[data-triage-role="explorer-search-undo-status"]')).toBeInTheDocument();
      }
    }
    fireEvent.click(undo);
    expect(activate).toHaveBeenCalledOnce();
    expect(props.onSelectResult).not.toHaveBeenCalled();
    document.documentElement.classList.remove("dark");
  });
});


it("Task170 pilot makes normal and reduced Newly card descendants static", () => {
  const css=readFileSync(join(process.cwd(),"src/app/globals.css"),"utf8");
  expect(css).toMatch(/\[data-card-presentation="inbox-explorer"\]\[data-newly-placed="true"\] \*\s*\{[^}]*animation:\s*none !important;[^}]*transition:\s*none !important;/);
});


it("Task170 final P1-P8 declares independent body, paint-only and in-flow roles", () => {
  const css=readFileSync(join(process.cwd(),"src/app/globals.css"),"utf8");
  expect(css).toContain("--triage-explorer-node-body-min-height");
  expect(css).toContain("data-triage-paint-suppressed");
  expect(css).toContain("--triage-finder-feedback-pattern");
  expect(css).toContain("--triage-placement-close-glyph-size");
  const workspace=readFileSync(join(process.cwd(),"src/components/triage/triage-workspace.tsx"),"utf8");
  const breakdown=readFileSync(join(process.cwd(),"src/components/triage/breakdown-panel.tsx"),"utf8");
  expect(workspace).toContain('data-triage-role="staging-display-columns"');
  expect(breakdown).toContain('data-triage-role="breakdown-body"');
});

it("Task170 common ordinary Bit base is independent of conditional NEW/Undo", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  expect(css).toContain("--triage-explorer-bit-min-height: 34px");
  expect(css).toMatch(/\[data-card-presentation="inbox-explorer"\]\[data-triage-role="explorer-card-bit"\]\s*\{[^}]*min-block-size:\s*var\(--triage-explorer-bit-min-height\);/);
});

it("Task170 green Return and red unavailable have independent color roles", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  expect(css).toContain("--triage-return-positive-ink");
  expect(css).toContain("--triage-finder-feedback-surface: var(--triage-finder-unavailable-surface)");
  expect(css).not.toContain("--triage-finder-feedback-surface: var(--triage-return-hover-surface)");
});

it("Task172 retro-mac Context sort chip derives its fill from the mode background", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  expect(css).toMatch(/--triage-context-sort-fill:\s*color-mix\(in srgb, hsl\(var\(--background\)\)[^;]*yellow\);/);
  expect(css).toMatch(/--triage-context-sort-hover:\s*color-mix\(in srgb, hsl\(var\(--background\)\)[^;]*yellow\);/);
});

it("Task172 retro-mac Context sort chip shows a focus-visible state over its fixed shadow", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  expect(css).toMatch(/\[data-triage-role="context-sort-control"\]:focus-visible\s*\{[^}]*background: var\(--triage-context-ink\)/);
});

describe("Phase 41 Scratch Trash realization (Task 210)", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const phase41 = css.slice(css.indexOf("/* Phase 41 (Task 210)"));

  it("keeps the Context [X] hidden (and so unfocusable) outside Retro Mac, with no theme-id branch in the markup", () => {
    expect(css).toMatch(
      /\.triage-shell \[data-triage-role="context-title-strip"\],[\s\S]*?\{ display: none; \}/,
    );
    // Only Retro Mac re-shows the strip, and only there does the button take pointer input.
    const shown = css.match(/:root\[data-color-theme="([^"]+)"\] \.triage-shell \[data-triage-role="context-title-strip"\] \{[^}]*display: flex/g) ?? [];
    expect(shown).toHaveLength(1);
    expect(shown[0]).toContain('data-color-theme="retro-mac"');
    expect(phase41).toMatch(
      /retro-mac"\] \.triage-shell \[data-triage-role="context-title-strip"\] \[data-triage-role="context-decoration-close"\] \{[^}]*pointer-events: auto/,
    );
  });

  it("realizes the Retro Mac Archive-alert family for both portal dialogs without motion", () => {
    expect(phase41).toMatch(/:is\(\.scratch-trash-dialog-overlay, \.breakdown-delete-dialog-overlay\) \{[^}]*animation: none;[^}]*hsl\(var\(--background\) \/ 0\.7\)[^}]*blur\(1px\)/);
    const card = phase41.match(/:is\(\.scratch-trash-dialog, \.breakdown-delete-dialog\) \{([^}]*)\}/)?.[1] ?? "";
    expect(card).toContain("border: 4px double hsl(var(--foreground))");
    expect(card).toContain("border-radius: 0");
    expect(card).toContain("box-shadow: 6px 6px 0 hsl(var(--foreground))");
    expect(card).toContain("padding: 24px");
    expect(card).toContain("grid-template-columns: 40px");
    expect(card).toContain("animation: none");
    const mark = phase41.match(/__mark, \.breakdown-delete-dialog__mark\) \{([^}]*)\}/)?.[1] ?? "";
    expect(mark).toContain("inline-size: 40px");
    expect(mark).toContain("border: 2px solid hsl(var(--foreground))");
    expect(phase41).toMatch(/\[data-slot="alert-dialog-cancel"\] \{\s*border-width: 2px/);
  });

  it("scopes the dialog theming to the two classes so other app dialogs keep their look", () => {
    const selectors = phase41.match(/^:root\[data-color-theme="retro-mac"\] :is\([^)]*\)/gm) ?? [];
    for (const selector of selectors) {
      expect(selector).toMatch(/scratch-trash-dialog|breakdown-delete-dialog/);
    }
  });

  it("styles the Pool Trash control with the Breakdown row action treatment in Retro Mac", () => {
    expect(phase41).toMatch(/pool-row-trash-action"\] \{[^}]*border-radius: 0[^}]*var\(--triage-breakdown-control-size\)/);
    expect(phase41).toMatch(/pool-row-trash-action"\]:not\(:disabled\):hover,[\s\S]*?focus-visible \{[^}]*background: var\(--triage-context-ink\)/);
  });

  it("renders the Context [X] as a labelled button in every theme", () => {
    for (const theme of ["griddo", "retro-mac", "graphite"]) {
      document.documentElement.dataset.colorTheme = theme;
      const view = render(<BreakdownPanel />);
      expect(
        screen.getByRole("button", { name: "Move selected Scratch to Trash", hidden: true }),
      ).toHaveAttribute("data-scratch-trash-entry", "context");
      view.unmount();
    }
  });
});

describe("Phase 41 Retro Mac departure sheet realization (Task 211)", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const start = css.indexOf("/* Phase 41 (Task 211)");
  const block = css.slice(start, css.indexOf(':root[data-color-theme="graphite"] .breakdown-departure-sheet', start));
  const rule = (selector: string) =>
    block.match(new RegExp(`${selector.replace(/[.[\]()*>]/g, "\\$&")} \\{([^}]*)\\}`))?.[1] ?? "";

  it("takes the Archive-alert family in flow, with no scrim, portal, title bar or motion", () => {
    const sheet = rule(':root[data-color-theme="retro-mac"] .breakdown-departure-sheet');
    expect(sheet).toContain("border: 4px double hsl(var(--foreground))");
    expect(sheet).toContain("border-radius: 0");
    expect(sheet).toContain("box-shadow: 6px 6px 0 hsl(var(--foreground))");
    expect(sheet).toContain("grid-template-columns: 40px");
    expect(sheet).toContain("font-family: var(--triage-context-font)");
    expect(block).not.toMatch(/position: (fixed|absolute)|backdrop-filter|animation: (?!none)/);
  });

  it("draws a silent 40px `!` mark with a pseudo-element, spanning the four children", () => {
    const mark = rule(':root[data-color-theme="retro-mac"] .breakdown-departure-sheet::before');
    expect(mark).toContain('content: "!" / ""');
    expect(mark).toContain("inline-size: 40px");
    expect(mark).toContain("border: 2px solid hsl(var(--foreground))");
    expect(mark).toContain("grid-row: 1 / span 4");
    expect(rule(':root[data-color-theme="retro-mac"] .breakdown-departure-sheet > *')).toContain("grid-column: 2");
  });

  it("gives Continue the 2px default border, keeps Discard plain and inverts on hover/focus", () => {
    expect(block).toMatch(/__actions \[data-triage-role="breakdown-departure-continue"\] \{\s*border-width: 2px/);
    const buttons = rule(':root[data-color-theme="retro-mac"] .breakdown-departure-sheet__actions button');
    expect(buttons).toContain("background: hsl(var(--background))");
    expect(buttons).toContain("box-shadow: none");
    expect(buttons).toContain("border-radius: 0");
    expect(block).toMatch(/__actions button:hover,[\s\S]*?focus-visible \{[^}]*background: hsl\(var\(--foreground\)\)/);
    // mi-2: hover/focus change colors and outline only, so the button never changes size.
    const state = block.match(/__actions button:hover,[\s\S]*?focus-visible \{([^}]*)\}/)?.[1] ?? "";
    expect(state).not.toMatch(/border|padding|font|line-height|height|width|letter-spacing/);
    const focus = block.match(/__actions button:focus-visible \{([^}]*)\}/)?.[1] ?? "";
    expect(focus).not.toMatch(/border|padding|font|line-height|height|width|letter-spacing/);
    expect(block).not.toContain("__actions button:active");
    expect(rule(':root[data-color-theme="retro-mac"] .breakdown-departure-sheet')).not.toContain("margin-inline");
    expect(block).toMatch(/button:focus-visible \{[^}]*outline: 2px solid/);
  });
});
