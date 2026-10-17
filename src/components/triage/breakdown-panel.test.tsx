import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { useEffect, useState, type ComponentProps } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  BreakdownOperationProjection,
  ConditionalEditorSnapshot,
} from "@/hooks/use-scratch-breakdowns";
import {
  TriageDepartureContext,
  useTriageDeparture,
  type TriageDepartureController,
} from "@/hooks/use-triage-departure";
import type { ScratchBreakdown } from "@/lib/db/schema";
import type { Bit } from "@/types";
import { useTriagePreferencesStore } from "@/stores/triage-preferences-store";
import {
  TrashDraftRegistryContext,
  TrashScratchEntriesContext,
  type TrashDraftOwner,
  type TrashScratchDisabledReason,
  type TrashScratchEntries,
} from "@/hooks/use-trash-scratch";
import { BreakdownPanel as RealBreakdownPanel } from "./breakdown-panel";

const hookState = vi.hoisted(() => ({
  breakdownsByScratch: {} as Record<string, unknown[]>,
  operations: [] as BreakdownOperationProjection[],
  createBreakdown: vi.fn(),
  reconcileAddBreakdown: vi.fn(),
  deleteBreakdown: vi.fn(),
  reconcileDeleteBreakdown: vi.fn(),
}));
const operationLockState = vi.hoisted(() => ({
  activeOperation: null as null | { kind: "add" | "delete"; operationId: string },
  acquire: vi.fn(),
  release: vi.fn(),
}));
const departureState = vi.hoisted(() => ({
  useRealContext: false,
  owner: null as null | { clearDraft: () => void; focusDraft: () => void },
  pendingDestination: null as null | { id: string; kind: "scratch" | "path" | "route" },
  continueWriting: vi.fn(),
  discardAndMove: vi.fn(),
  setAddDraft: vi.fn(),
  registerAddDraftOwner: vi.fn(),
}));
const integrationControllerState = vi.hoisted(() => ({
  controller: null as TriageDepartureController | null,
}));
const clearSelectionMock = vi.hoisted(() => vi.fn());
const triageStoreState = vi.hoisted(() => ({
  selectedScratchId: null as string | null,
  stagedCandidates: {} as Record<
    string,
    Array<{
      id: string;
      type: "node" | "bit";
      sourceBreakdownId: string;
      label: string;
    }>
  >,
  clearSelection: clearSelectionMock,
  scratchPoolExpanded: true as boolean,
  scratchPoolManualExpandedForId: null as string | null,
  setScratchPoolExpanded: vi.fn() as ReturnType<typeof vi.fn>,
}));
const useScratchBreakdownsMock = vi.hoisted(() => vi.fn());
const editorState = vi.hoisted(() => ({
  snapshot: null as ConditionalEditorSnapshot,
  titleBlocker: null,
  focusIntent: null as null | "field-end" | "field" | "edit-trigger" | "active-scratch-fallback" | "pending-action",
  openScratchTitle: vi.fn(),
  openBreakdown: vi.fn(),
  changeDraft: vi.fn(),
  save: vi.fn(),
  reconcile: vi.fn(),
  useMine: vi.fn(),
  useLatest: vi.fn(),
  cancel: vi.fn(),
  invalidate: vi.fn(),
  stayHere: vi.fn(),
}));
const useStagedCandidatesMock = vi.hoisted(() => vi.fn());
const useTriageStoreMock = vi.hoisted(() => vi.fn());
const getDataStoreMock = vi.hoisted(() => vi.fn());
const archiveBitMock = vi.hoisted(() => vi.fn());
const useInboxMock = vi.hoisted(() => vi.fn());
const currentTime = new Date(2026, 5, 17, 12, 0, 0).getTime();
const globalsCss = readFileSync(
  join(process.cwd(), "src/app/globals.css"),
  "utf8",
);

function getCssBlock(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = globalsCss.match(
    new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, "s"),
  );
  expect(match, `missing CSS block for ${selector}`).not.toBeNull();
  return match?.[1] ?? "";
}

function getHslToken(block: string, token: string) {
  const match = block.match(
    new RegExp(`--${token}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`),
  );
  expect(match, `missing --${token}`).not.toBeNull();
  return [Number(match?.[1]), Number(match?.[2]), Number(match?.[3])] as const;
}

function hslToRgb([hue, saturation, lightness]: readonly number[]) {
  const saturationUnit = saturation / 100;
  const lightnessUnit = lightness / 100;
  const chroma = (1 - Math.abs(2 * lightnessUnit - 1)) * saturationUnit;
  const segment = ((hue % 360) + 360) % 360 / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const [red, green, blue] =
    segment < 1
      ? [chroma, secondary, 0]
      : segment < 2
        ? [secondary, chroma, 0]
        : segment < 3
          ? [0, chroma, secondary]
          : segment < 4
            ? [0, secondary, chroma]
            : segment < 5
              ? [secondary, 0, chroma]
              : [chroma, 0, secondary];
  const match = lightnessUnit - chroma / 2;
  return [red + match, green + match, blue + match];
}

function contrastRatio(first: readonly number[], second: readonly number[]) {
  const luminance = (hsl: readonly number[]) => {
    const [red, green, blue] = hslToRgb(hsl).map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
}

vi.mock("@/hooks/use-scratch-breakdowns", () => ({
  useScratchBreakdowns: useScratchBreakdownsMock,
  useScratchTitleBlockerContext: () => ({
    getSnapshot: () => null,
    setSnapshot: vi.fn(),
  }),
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

vi.mock("@/hooks/use-triage-departure", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/hooks/use-triage-departure")
  >();
  return {
    ...actual,
    useTriageDepartureContext: () =>
      departureState.useRealContext
        ? actual.useTriageDepartureContext()
        : {
            pendingDestination: departureState.pendingDestination,
            continueWriting: departureState.continueWriting,
            discardAndMove: departureState.discardAndMove,
            hasAddDraft: vi.fn(() => false),
            isExitBlocked: vi.fn(() => false),
            requestDeparture: vi.fn(),
            setAddDraft: departureState.setAddDraft,
            registerAddDraftOwner: departureState.registerAddDraftOwner,
          },
  };
});

vi.mock("@/stores/triage-store", () => ({
  useTriageStore: useTriageStoreMock,
}));

vi.mock("@/lib/db/datastore", () => ({
  getDataStore: getDataStoreMock,
}));

function createScratchBreakdown(
  overrides: Partial<ScratchBreakdown> = {},
): ScratchBreakdown {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    scratchBitId: overrides.scratchBitId ?? "scratch-1",
    content: overrides.content ?? "breakdown content",
    order: overrides.order ?? 0,
    createdAt:
      overrides.createdAt ?? new Date(2026, 5, 17, 11, 15, 0).getTime(),
    consumedAt: overrides.consumedAt ?? null,
    version: overrides.version ?? 1,
  };
}

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
    mtime: overrides.mtime ?? currentTime,
    createdAt: overrides.createdAt ?? currentTime,
    parentId: overrides.parentId ?? "inbox-node",
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    deletedAt: overrides.deletedAt ?? null,
    archivedAt: overrides.archivedAt ?? null,
    version: overrides.version ?? 1,
    pastDeadlineDismissed: overrides.pastDeadlineDismissed ?? false,
  };
}

const integrationOperationLock = {
  activeOperation: null,
  acquire: vi.fn(() => true),
  isLocked: vi.fn(() => false),
  release: vi.fn(() => true),
};

function DepartureIntegrationHarness() {
  const departure = useTriageDeparture(integrationOperationLock);
  useEffect(() => {
    integrationControllerState.controller = departure;
    return () => {
      if (integrationControllerState.controller === departure) {
        integrationControllerState.controller = null;
      }
    };
  }, [departure]);
  return (
    <TriageDepartureContext.Provider value={departure}>
      <BreakdownPanel />
    </TriageDepartureContext.Provider>
  );
}

function CompletionHarness({
  archive = vi.fn(async () => true),
  archiveOperation,
  initial = "overlay",
}: {
  archive?: () => Promise<boolean>;
  archiveOperation?: Record<string, unknown>;
  initial?: "working" | "overlay" | "complete";
}) {
  const [presentation, setPresentation] = useState(initial);
  return (
    <>
      <h2 id="triage-breakdown-heading" tabIndex={-1}>
        Breakdown
      </h2>
      <BreakdownPanel
        completion={{
          presentation,
          archive,
          archiveOperation,
          cancel: () => setPresentation("complete"),
          reopen: () => setPresentation("overlay"),
        } as never}
      />
    </>
  );
}

beforeEach(() => {
  const style = document.createElement("style");
  style.dataset.task167SortLabels = "true";
  // Load the actual label rules; jsdom does not load the app stylesheet.
  style.textContent = globalsCss.match(
    /(?:^|\n)[^{}]*\[data-triage-role="context-sort-(?:current|next)-label"\][^{]*\{[^}]*\}/g,
  )?.join("\n") ?? "";
  document.head.append(style);
  vi.spyOn(Date, "now").mockReturnValue(currentTime);
  hookState.breakdownsByScratch = {};
  hookState.operations = [];
  hookState.createBreakdown.mockImplementation(async (command) => ({
    operationId: command.operationId,
    status: "applied",
    breakdown: null,
    scratch: null,
  }));
  hookState.deleteBreakdown.mockImplementation(async (command) => ({
    operationId: command.operationId,
    status: "applied",
    breakdown: null,
    candidate: null,
    scratch: null,
  }));
  hookState.reconcileAddBreakdown.mockReset();
  hookState.reconcileAddBreakdown.mockImplementation(async (command) => ({
    operationId: command.operationId,
    status: "not_applied",
    breakdown: null,
    scratch: null,
  }));
  hookState.reconcileDeleteBreakdown.mockReset();
  hookState.reconcileDeleteBreakdown.mockImplementation(async (command) => ({
    operationId: command.operationId,
    status: "not_applied",
    breakdown: null,
    candidate: null,
    scratch: null,
  }));
  operationLockState.activeOperation = null;
  operationLockState.acquire.mockReset();
  operationLockState.acquire.mockImplementation((kind, operationId) => {
    if (operationLockState.activeOperation !== null) return false;
    operationLockState.activeOperation = { kind, operationId };
    return true;
  });
  operationLockState.release.mockReset();
  operationLockState.release.mockImplementation((operationId) => {
    if (operationLockState.activeOperation?.operationId !== operationId) return false;
    operationLockState.activeOperation = null;
    return true;
  });
  departureState.owner = null;
  departureState.useRealContext = false;
  integrationControllerState.controller = null;
  departureState.pendingDestination = null;
  departureState.continueWriting.mockReset();
  departureState.continueWriting.mockReturnValue(true);
  departureState.discardAndMove.mockReset();
  departureState.discardAndMove.mockReturnValue(true);
  departureState.setAddDraft.mockReset();
  departureState.registerAddDraftOwner.mockReset();
  departureState.registerAddDraftOwner.mockImplementation((owner) => {
    departureState.owner = owner;
    return () => {
      if (departureState.owner === owner) departureState.owner = null;
    };
  });
  triageStoreState.selectedScratchId = null;
  editorState.snapshot = null;
  editorState.focusIntent = null;
  editorState.openScratchTitle.mockReset();
  editorState.openScratchTitle.mockReturnValue(true);
  editorState.openBreakdown.mockReset();
  editorState.openBreakdown.mockReturnValue(true);
  editorState.invalidate.mockReset();
  triageStoreState.stagedCandidates = {};
  triageStoreState.scratchPoolExpanded = true;
  triageStoreState.scratchPoolManualExpandedForId = null;
  triageStoreState.setScratchPoolExpanded.mockReset();
  useInboxMock.mockReturnValue({
    activeScratchBits: [createBit({ id: "scratch-1" })],
  });
  useTriageStoreMock.mockImplementation(
    (selector: (state: typeof triageStoreState) => unknown) =>
      selector(triageStoreState),
  );
  useScratchBreakdownsMock.mockImplementation((scratchBitId: string | null) => {
    const rows =
      scratchBitId === null
        ? []
        : ((hookState.breakdownsByScratch[scratchBitId] ?? []) as ScratchBreakdown[]);
    const activeRows = rows.filter((row) => row.consumedAt === null);
    const consumedRows = rows.filter((row) => row.consumedAt !== null);
    const stagedCount =
      scratchBitId === null
        ? 0
        : (triageStoreState.stagedCandidates[scratchBitId] ?? []).length;
    return {
      breakdowns: activeRows,
      consumedBreakdownCount: consumedRows.length,
      hasObservedBreakdownHistory: rows.length > 0,
      isArchiveEligible:
        consumedRows.length > 0 && activeRows.length === 0 && stagedCount === 0,
      operations: hookState.operations.filter(
        (operation) => operation.scratchBitId === scratchBitId,
      ),
      editor: editorState,
      addBreakdown: hookState.createBreakdown,
      reconcileAddBreakdown: hookState.reconcileAddBreakdown,
      deleteBreakdown: hookState.deleteBreakdown,
      reconcileDeleteBreakdown: hookState.reconcileDeleteBreakdown,
    };
  });
  useStagedCandidatesMock.mockImplementation((scratchBitId: string | null) => {
    const candidates =
      scratchBitId === null
        ? []
        : (triageStoreState.stagedCandidates[scratchBitId] ?? []);
    return {
      candidates,
      counts: { authoritative: candidates.length },
      eligibility: {
        stagedSourceIds: new Set(
          candidates.map((candidate) => candidate.sourceBreakdownId),
        ),
      },
    };
  });
  useTriagePreferencesStore.setState({ breakdownCreatedAtSort: "DESC" });
  getDataStoreMock.mockResolvedValue({
    archiveBit: archiveBitMock,
  });
});

afterEach(() => {
  document.head.querySelectorAll("[data-task167-sort-labels]").forEach(style => style.remove());
  document.documentElement.removeAttribute("data-color-theme");
  vi.useRealTimers();
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// The panel receives staged-source state from the workspace; this stands in for it
// from the same fixture the hook mock used to serve.
function BreakdownPanel(
  props: Partial<ComponentProps<typeof RealBreakdownPanel>> = {},
) {
  const selectedScratchId = useTriageStoreMock(
    (state: typeof triageStoreState) => state.selectedScratchId,
  ) as string | null;
  const staged = useStagedCandidatesMock(selectedScratchId);
  return (
    <RealBreakdownPanel
      archiveCandidateClear={staged.counts.authoritative === 0}
      authoritativeStagedSourceIds={staged.eligibility.stagedSourceIds}
      stagedSourceIds={staged.eligibility.stagedSourceIds}
      {...props}
    />
  );
}

describe("BreakdownPanel", () => {
  it("shows an authoritative Unstage signal once, preserves focus, and clears it at 1600ms", async () => {
    vi.useFakeTimers();
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Returned row" }),
    ];
    const signal = {
      kind: "unstage" as const,
      operationId: "unstage-1",
      rowId: "row-1",
    };
    const view = render(<BreakdownPanel successSignal={signal} />);
    const grip = screen.getByRole("button", { name: "Drag breakdown" });
    grip.focus();

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("✓ Returned to Breakdown.");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-atomic", "true");
    expect(status.querySelector("[aria-hidden=true]")).toHaveTextContent("✓");
    expect(screen.getByTestId("breakdown-row")).toHaveAttribute(
      "data-triage-state",
      "success",
    );
    expect(grip).toHaveFocus();

    act(() => vi.advanceTimersByTime(1599));
    expect(screen.getByRole("status")).toBeInTheDocument();
    view.rerender(<BreakdownPanel successSignal={signal} />);
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("status")).toBeNull();

    view.rerender(<BreakdownPanel successSignal={{ ...signal }} />);
    act(() => vi.advanceTimersByTime(1600));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("interrupts a prior success with a different identity and restarts the exact lifetime", () => {
    vi.useFakeTimers();
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "First" }),
      createScratchBreakdown({ id: "row-2", content: "Second" }),
    ];
    const view = render(
      <BreakdownPanel
        successSignal={{ kind: "unstage", operationId: "unstage-1", rowId: "row-1" }}
      />,
    );

    act(() => vi.advanceTimersByTime(1000));
    view.rerender(
      <BreakdownPanel
        successSignal={{ kind: "unstage", operationId: "unstage-2", rowId: "row-2" }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Returned to Breakdown.",
    );
    expect(
      screen
        .getAllByTestId("breakdown-row")
        .find((row) => row.getAttribute("data-breakdown-id") === "row-2"),
    ).toHaveAttribute("data-triage-state", "success");

    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("starts Unstage lifetime only after the source row is restored as active", () => {
    vi.useFakeTimers();
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Delayed restore" }),
    ];
    triageStoreState.stagedCandidates["scratch-1"] = [
      {
        id: "candidate-1",
        type: "node",
        sourceBreakdownId: "row-1",
        label: "Delayed restore",
      },
    ];
    const signal = {
      kind: "unstage" as const,
      operationId: "unstage-delayed",
      rowId: "row-1",
    };
    const view = render(<BreakdownPanel successSignal={signal} />);

    expect(screen.queryByRole("status")).toBeNull();
    act(() => vi.advanceTimersByTime(1000));
    triageStoreState.stagedCandidates["scratch-1"] = [];
    view.rerender(<BreakdownPanel successSignal={signal} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Returned to Breakdown.",
    );
    act(() => vi.advanceTimersByTime(1599));
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("treats a source in stagedSourceIds as staged before any candidate is listed, with grip, Edit and Delete disabled", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Held stage source" }),
    ];

    const view = render(
      <RealBreakdownPanel
        archiveCandidateClear
        authoritativeStagedSourceIds={new Set()}
        stagedSourceIds={new Set(["row-1"])}
      />,
    );

    const row = screen.getByTestId("breakdown-row");
    expect(row).toHaveAttribute("data-triage-role", "breakdown-staged-row");
    expect(row).toHaveClass("opacity-50");
    expect(within(row).getByRole("button", { name: "Drag breakdown" })).toBeDisabled();
    expect(within(row).getByRole("button", { name: /edit/i })).toBeDisabled();
    expect(within(row).getByRole("button", { name: /delete/i })).toBeDisabled();

    view.rerender(
      <RealBreakdownPanel
        archiveCandidateClear
        authoritativeStagedSourceIds={new Set()}
        stagedSourceIds={new Set()}
      />,
    );
    expect(screen.getByTestId("breakdown-row")).toHaveAttribute(
      "data-triage-role",
      "breakdown-active-row",
    );
    expect(screen.getByTestId("breakdown-row")).not.toHaveClass("opacity-50");
  });

  it("does not invalidate an open editor for a Stage that is only pending or held", async () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Editing row" }),
    ];
    const view = render(
      <RealBreakdownPanel
        archiveCandidateClear
        authoritativeStagedSourceIds={new Set()}
        stagedSourceIds={new Set()}
      />,
    );
    editorState.snapshot = {
      target: { kind: "breakdown", id: "row-1" },
      phase: "dirty",
      base: { value: "Editing row", version: 1, order: 0 },
      draft: "Draft",
      latest: null,
      copyableDraft: null,
      pendingIntent: false,
      focusIntent: "field",
      command: null,
    };

    view.rerender(
      <RealBreakdownPanel
        archiveCandidateClear
        authoritativeStagedSourceIds={new Set()}
        stagedSourceIds={new Set(["row-1"])}
      />,
    );
    expect(editorState.invalidate).not.toHaveBeenCalled();

    view.rerender(
      <RealBreakdownPanel
        archiveCandidateClear={false}
        authoritativeStagedSourceIds={new Set(["row-1"])}
        stagedSourceIds={new Set(["row-1"])}
      />,
    );
    expect(editorState.invalidate).toHaveBeenCalled();
  });

  it("holds the Unstage success signal while the source is still in stagedSourceIds", () => {
    vi.useFakeTimers();
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Held unstage" }),
    ];
    const signal = {
      kind: "unstage" as const,
      operationId: "unstage-held",
      rowId: "row-1",
    };
    const view = render(
      <RealBreakdownPanel
        archiveCandidateClear={false}
        authoritativeStagedSourceIds={new Set(["row-1"])}
        stagedSourceIds={new Set(["row-1"])}
        successSignal={signal}
      />,
    );
    expect(screen.queryByRole("status")).toBeNull();

    view.rerender(
      <RealBreakdownPanel
        archiveCandidateClear
        authoritativeStagedSourceIds={new Set()}
        stagedSourceIds={new Set()}
        successSignal={signal}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Returned to Breakdown.");
  });

  it("keeps the row-local status mounted if inline edit begins during its lifetime", () => {
    vi.useFakeTimers();
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Edit during success" }),
    ];
    const signal = {
      kind: "unstage" as const,
      operationId: "unstage-edit",
      rowId: "row-1",
    };
    const view = render(<BreakdownPanel successSignal={signal} />);
    act(() => vi.advanceTimersByTime(600));
    editorState.snapshot = {
      target: { kind: "breakdown", id: "row-1" },
      phase: "dirty",
      base: { value: "Edit during success", version: 1, order: 0 },
      draft: "Editing",
      latest: null,
      copyableDraft: null,
      pendingIntent: false,
      focusIntent: "field",
      command: null,
    };
    view.rerender(<BreakdownPanel successSignal={signal} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Returned to Breakdown.",
    );
    act(() => vi.advanceTimersByTime(999));
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("turns a confirmed local Add into the shared row signal without moving input focus", async () => {
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.createBreakdown.mockImplementation(async (command) => {
      hookState.breakdownsByScratch["scratch-1"] = [
        createScratchBreakdown({
          id: command.breakdownId,
          content: command.content,
        }),
      ];
      return {
        operationId: command.operationId,
        status: "applied" as const,
        breakdown: hookState.breakdownsByScratch["scratch-1"][0],
        scratch: null,
      };
    });
    render(<BreakdownPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));
    const input = screen.getByPlaceholderText("Add a note...");
    fireEvent.change(input, { target: { value: "New row" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(await screen.findByRole("status")).toHaveTextContent("✓ Added.");
    expect(input).toHaveFocus();
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: originalScrollIntoView,
    });
  });

  it("starts Add lifetime only when its committed row projection mounts", async () => {
    vi.useFakeTimers();
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    triageStoreState.selectedScratchId = "scratch-1";
    let committedRow: ScratchBreakdown | null = null;
    hookState.createBreakdown.mockImplementation(async (command) => {
      committedRow = createScratchBreakdown({
        id: command.breakdownId,
        content: command.content,
      });
      return {
        operationId: command.operationId,
        status: "applied" as const,
        breakdown: committedRow,
        scratch: null,
      };
    });
    const view = render(<BreakdownPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));
    const input = screen.getByPlaceholderText("Add a note...");
    fireEvent.change(input, { target: { value: "Delayed Add" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await act(async () => Promise.resolve());

    expect(screen.queryByRole("status")).toBeNull();
    act(() => vi.advanceTimersByTime(1000));
    hookState.breakdownsByScratch["scratch-1"] = [committedRow!];
    view.rerender(<BreakdownPanel />);
    expect(screen.getByRole("status")).toHaveTextContent("Added.");
    act(() => vi.advanceTimersByTime(1599));
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("status")).toBeNull();
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: originalScrollIntoView,
    });
  });

  it("reserves the success slot and binds exact motion and reduced-motion CSS", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1" }),
    ];
    render(<BreakdownPanel />);

    expect(screen.getByTestId("breakdown-success-slot")).toBeEmptyDOMElement();
    expect(globalsCss).toContain("animation: breakdown-success-wash 600ms ease-out forwards");
    expect(globalsCss).toContain('[data-triage-state~="success"]');
    expect(globalsCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(globalsCss).toContain(".breakdown-success-status");
    for (const theme of [
      "tiny-desk",
      "neumorphism",
      "claymorphism",
      "origami",
      "terminal",
      "retro-mac",
      "graphite",
    ]) {
      expect(globalsCss).toContain(
        `[data-color-theme="${theme}"] [data-triage-role="breakdown-active-row"][data-triage-state~="success"]`,
      );
    }
  });
  it("exposes a transient Breakdown drop-back target only for a staged drag", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    render(
      <BreakdownPanel
        activeDragItem={{
          kind: "triage-staged-node",
          id: "candidate-1",
          label: "Return me",
          scratchId: "scratch-1",
          sourceBreakdownId: "row-1",
          sourceVersion: 2,
          sourceLifecycle: "active",
          candidateVersion: 1,
          candidateLifecycle: "staged",
          resultType: "node",
        }}
        overTargetId="triage-remove-drop:breakdown"
      />,
    );

    expect(
      screen.getByRole("region", { name: "Return staged item to Breakdown" }),
    ).toHaveAttribute("data-drop-active", "true");
    expect(
      screen.getByRole("region", { name: "Return staged item to Breakdown" }).parentElement,
    ).toHaveAttribute("data-triage-role", "breakdown-body");

    cleanup();
    render(<BreakdownPanel />);
    expect(
      screen.queryByRole("region", { name: "Return staged item to Breakdown" }),
    ).not.toBeInTheDocument();
  });

  it("does not emphasize Return for an invalidated staged source even if its previous target is retained", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    render(<BreakdownPanel activeDragItem={{ kind: "triage-staged-node", id: "candidate-1", label: "Return me", integrity: "invalidated" }} overTargetId="triage-remove-drop:breakdown" />);
    const target = screen.getByRole("region", { name: "Return staged item to Breakdown" });
    expect(target).toHaveAttribute("data-drop-active", "false");
    expect(target).not.toHaveClass("border-primary", "bg-accent", "text-foreground");
  });

  it("renders the empty state when no Scratch is selected", () => {
    render(<BreakdownPanel />);

    expect(
      screen.getByText("Select a Scratch to view breakdowns"),
    ).toBeInTheDocument();
  });

  it("publishes the Add draft synchronously and registers clear and focus intents", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    render(<BreakdownPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));
    const input = screen.getByRole("textbox", { name: "" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Protected Add draft" } });

    expect(departureState.setAddDraft).toHaveBeenLastCalledWith(
      "Protected Add draft",
    );
    expect(departureState.owner).not.toBeNull();

    act(() => departureState.owner?.focusDraft());
    expect(input).toHaveFocus();

    act(() => departureState.owner?.clearDraft());
    expect(input).toHaveValue("");
    expect(departureState.setAddDraft).toHaveBeenLastCalledWith("");
  });

  it("renders the approved Add-adjacent departure sheet only for a pending destination", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    const view = render(<BreakdownPanel />);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));
    fireEvent.change(screen.getByRole("textbox", { name: "" }), {
      target: { value: "Protected Add draft" },
    });
    departureState.pendingDestination = { id: "scratch-2", kind: "scratch" };
    view.rerender(<BreakdownPanel />);

    const sheet = screen.getByRole("alertdialog", { name: "Keep writing?" });
    expect(sheet).toHaveAttribute(
      "aria-describedby",
      expect.stringMatching(/departure-description/),
    );
    expect(sheet).toHaveAttribute("data-triage-state", "departure-decision");
    expect(within(sheet).getByText("Unsaved Add draft")).toBeInTheDocument();
    expect(
      within(sheet).getByText(
        "Continue writing here, or discard this draft and move.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "" })).toHaveValue(
      "Protected Add draft",
    );

    const addRow = screen.getByTestId("breakdown-add-row");
    expect(
      addRow.compareDocumentPosition(sheet) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByTestId("breakdown-content-region")).toHaveAttribute(
      "inert",
    );
    expect(addRow).toHaveAttribute("inert");
  });

  it("keeps every DP-VQ03 normal-text role at 4.5:1 across all theme surfaces and interaction states", () => {
    const themeSelectors = [
      ["griddo-light", ":root"],
      ["griddo-dark", ".dark"],
      ["tiny-desk-light", ':root[data-color-theme="tiny-desk"]'],
      ["tiny-desk-dark", '.dark[data-color-theme="tiny-desk"]'],
      ["neumorphism-light", ':root[data-color-theme="neumorphism"]'],
      ["neumorphism-dark", '.dark[data-color-theme="neumorphism"]'],
      ["claymorphism-light", ':root[data-color-theme="claymorphism"]'],
      ["claymorphism-dark", '.dark[data-color-theme="claymorphism"]'],
      ["origami-light", ':root[data-color-theme="origami"]'],
      ["origami-dark", '.dark[data-color-theme="origami"]'],
      ["terminal-light", ':root[data-color-theme="terminal"]'],
      ["terminal-dark", '.dark[data-color-theme="terminal"]'],
      ["retro-mac-light", ':root[data-color-theme="retro-mac"]'],
      ["retro-mac-dark", '.dark[data-color-theme="retro-mac"]'],
      ["graphite-light", ':root[data-color-theme="graphite"]'],
      ["graphite-dark", '.dark[data-color-theme="graphite"]'],
    ] as const;

    for (const [name, selector] of themeSelectors) {
      const theme = getCssBlock(selector);
      const background = getHslToken(theme, "background");
      const card = getHslToken(theme, "card");
      const foreground = getHslToken(theme, "foreground");

      expect(
        contrastRatio(foreground, card),
        `${name} foreground/card`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(foreground, background),
        `${name} foreground/background`,
      ).toBeGreaterThanOrEqual(4.5);
    }

    const readableCopy = getCssBlock(
      `.breakdown-departure-sheet__eyebrow,
.breakdown-departure-sheet__description`,
    );
    expect(readableCopy).toContain("color: hsl(var(--foreground));");

    const continueAction = getCssBlock(
      `[data-triage-role="breakdown-departure-continue"],
[data-triage-role="breakdown-departure-continue"]:hover,
[data-triage-role="breakdown-departure-continue"]:focus-visible,
[data-triage-role="breakdown-departure-continue"]:active`,
    );
    expect(continueAction).toContain(
      "background-color: hsl(var(--foreground));",
    );
    expect(continueAction).toContain("color: hsl(var(--background));");

    const discardAction = getCssBlock(
      `.breakdown-departure-sheet__discard,
.breakdown-departure-sheet__discard:hover,
.breakdown-departure-sheet__discard:focus-visible,
.breakdown-departure-sheet__discard:active`,
    );
    expect(discardAction).toContain("color: hsl(var(--foreground));");
  });

  it("maps DP-VQ05 through all eight theme families with reduced-motion-identical static treatment", () => {
    expect(globalsCss).toContain(".breakdown-add-reliability");
    expect(globalsCss).toContain(".breakdown-delete-reliability");
    for (const theme of [
      "tiny-desk",
      "neumorphism",
      "claymorphism",
      "origami",
      "terminal",
      "retro-mac",
      "graphite",
    ]) {
      expect(globalsCss).toContain(
        `:root[data-color-theme="${theme}"] .breakdown-reliability`,
      );
    }
    expect(globalsCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.breakdown-reliability,[\s\S]*\.breakdown-reliability \*[\s\S]*animation: none !important;[\s\S]*transition: none !important;/,
    );
    const reliabilityBlock = getCssBlock(".breakdown-reliability");
    expect(reliabilityBlock).not.toMatch(
      /animation|transform|transition|blink|pulse|bounce|spin/i,
    );
  });

  it("orders the default Continue action before destructive Discard and calls only the selected transition", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    departureState.pendingDestination = { id: "/trash", kind: "route" };
    render(<BreakdownPanel />);

    const sheet = screen.getByRole("alertdialog");
    const actions = within(sheet).getAllByRole("button");
    expect(actions.map((action) => action.textContent)).toEqual([
      "Continue writing",
      "Discard and move",
    ]);
    expect(actions[0]).toHaveAttribute(
      "data-triage-role",
      "breakdown-departure-continue",
    );
    expect(actions[1]).toHaveAttribute(
      "data-triage-role",
      "breakdown-departure-discard",
    );
    expect(within(sheet).queryByRole("button", { name: /close/i })).toBeNull();

    fireEvent.click(actions[1]);
    expect(departureState.discardAndMove).toHaveBeenCalledTimes(1);
    expect(departureState.continueWriting).not.toHaveBeenCalled();
  });

  it("focuses Continue, contains sequential focus, and maps Escape to Continue", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    departureState.pendingDestination = { id: "parent-1", kind: "path" };
    render(<BreakdownPanel />);

    const continueAction = screen.getByRole("button", {
      name: "Continue writing",
    });
    const discardAction = screen.getByRole("button", {
      name: "Discard and move",
    });
    expect(continueAction).toHaveFocus();

    discardAction.focus();
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Tab" });
    expect(continueAction).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("alertdialog"), {
      key: "Tab",
      shiftKey: true,
    });
    expect(discardAction).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(departureState.continueWriting).toHaveBeenCalledTimes(1);
    expect(departureState.discardAndMove).not.toHaveBeenCalled();
  });

  it("returns attempted outside focus to the last focused departure action", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    departureState.pendingDestination = { id: "/trash", kind: "route" };
    render(<BreakdownPanel />);
    const discardAction = screen.getByRole("button", {
      name: "Discard and move",
    });
    discardAction.focus();
    const outsideButton = document.createElement("button");
    document.body.append(outsideButton);

    outsideButton.focus();

    expect(discardAction).toHaveFocus();
    outsideButton.remove();
  });

  it("restores the Add input and its selection after Continue closes the inert sheet", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    const view = render(<BreakdownPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));
    const input = screen.getByRole("textbox", { name: "" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Protected Add draft" } });
    input.setSelectionRange(3, 9);

    departureState.pendingDestination = { id: "scratch-2", kind: "scratch" };
    view.rerender(<BreakdownPanel />);
    fireEvent.click(
      screen.getByRole("button", { name: "Continue writing" }),
    );
    departureState.pendingDestination = null;
    view.rerender(<BreakdownPanel />);

    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(3);
    expect(input.selectionEnd).toBe(9);
  });

  it("keeps one static sheet and focused action when the pending destination is replaced", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    departureState.pendingDestination = { id: "scratch-2", kind: "scratch" };
    const view = render(<BreakdownPanel />);
    const sheet = screen.getByRole("alertdialog");
    const discardAction = screen.getByRole("button", {
      name: "Discard and move",
    });
    discardAction.focus();

    departureState.pendingDestination = { id: "/trash", kind: "route" };
    view.rerender(<BreakdownPanel />);

    expect(screen.getByRole("alertdialog")).toBe(sheet);
    expect(discardAction).toHaveFocus();
    expect(sheet).not.toHaveTextContent("scratch-2");
    expect(sheet).not.toHaveTextContent("/trash");
  });

  it("connects the real Task 139 controller to both actions and the latest destination", () => {
    departureState.useRealContext = true;
    triageStoreState.selectedScratchId = "scratch-1";
    const firstPerform = vi.fn();
    const firstFocus = vi.fn();
    const latestPerform = vi.fn();
    const latestFocus = vi.fn();
    render(<DepartureIntegrationHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));
    const input = screen.getByRole("textbox", { name: "" });
    fireEvent.change(input, { target: { value: "Protected Add draft" } });

    act(() => {
      expect(
        integrationControllerState.controller?.requestDeparture({
          id: "scratch-2",
          kind: "scratch",
          perform: firstPerform,
          focus: firstFocus,
        }),
      ).toBe("decision-required");
      expect(
        integrationControllerState.controller?.requestDeparture({
          id: "parent-1",
          kind: "path",
          perform: latestPerform,
          focus: latestFocus,
        }),
      ).toBe("decision-required");
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Discard and move" }),
    );

    expect(input).toHaveValue("");
    expect(firstPerform).not.toHaveBeenCalled();
    expect(firstFocus).not.toHaveBeenCalled();
    expect(latestPerform).toHaveBeenCalledTimes(1);
    expect(latestFocus).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "Keep this draft" } });
    const routePerform = vi.fn();
    act(() => {
      expect(
        integrationControllerState.controller?.requestDeparture({
          id: "/trash",
          kind: "route",
          perform: routePerform,
        }),
      ).toBe("decision-required");
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Continue writing" }),
    );

    expect(input).toHaveValue("Keep this draft");
    expect(input).toHaveFocus();
    expect(routePerform).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("renders breakdown content without row time labels", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({
        id: "row-1",
        content: "First note",
        createdAt: new Date(2026, 5, 17, 11, 15, 0).getTime(),
      }),
      createScratchBreakdown({
        id: "row-2",
        content: "Older note",
        createdAt: new Date(2026, 5, 17, 10, 0, 0).getTime(),
      }),
    ];

    render(<BreakdownPanel />);

    expect(screen.getByText("First note")).toBeInTheDocument();
    expect(screen.getByText("Older note")).toBeInTheDocument();
    expect(screen.queryByText("45m ago")).not.toBeInTheDocument();
    expect(screen.queryByText("2h ago")).not.toBeInTheDocument();
  });

  it("keeps permanent fixed Context and Breakdown slots in view and edit modes", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Fixed geometry row" }),
    ];

    const view = render(<BreakdownPanel />);

    const expectContextSlots = () => {
      const context = screen.getByTestId("selected-scratch-context");
      expect(context).toHaveAttribute(
        "data-triage-layout",
        "fixed-inline-editor",
      );
      expect(within(context).getByTestId("context-content-slot")).toHaveAttribute(
        "data-triage-role",
        "context-content-slot",
      );
      expect(within(context).getByTestId("context-content-slot")).toHaveAttribute(
        "data-triage-block-slot",
        "stretch",
      );
      expect(within(context).getByTestId("context-action-slot")).toHaveAttribute(
        "data-triage-role",
        "context-action-slot",
      );
      expect(within(context).getByTestId("context-action-slot")).toHaveAttribute(
        "data-triage-block-slot",
        "stretch",
      );
    };
    const expectBreakdownSlots = () => {
      const row = screen.getByTestId("breakdown-row");
      expect(row).toHaveAttribute("data-triage-layout", "fixed-inline-editor");
      expect(within(row).getByTestId("breakdown-drag-slot")).toHaveAttribute(
        "data-triage-role",
        "breakdown-drag-slot",
      );
      expect(within(row).getByTestId("breakdown-drag-slot")).toHaveAttribute(
        "data-triage-block-slot",
        "stretch",
      );
      expect(within(row).getByTestId("breakdown-content-slot")).toHaveAttribute(
        "data-triage-role",
        "breakdown-content-slot",
      );
      expect(within(row).getByTestId("breakdown-content-slot")).toHaveAttribute(
        "data-triage-block-slot",
        "stretch",
      );
      expect(within(row).getByTestId("breakdown-action-slot")).toHaveAttribute(
        "data-triage-role",
        "breakdown-action-slot",
      );
      expect(within(row).getByTestId("breakdown-action-slot")).toHaveAttribute(
        "data-triage-block-slot",
        "stretch",
      );
    };

    expectContextSlots();
    expectBreakdownSlots();
    expect(screen.getByText("Fixed geometry row")).toHaveAttribute(
      "data-triage-role",
      "breakdown-view-text",
    );

    editorState.snapshot = {
      target: { kind: "scratch-title", id: "scratch-1" },
      phase: "dirty",
      base: { value: "Scratch", version: 1 },
      draft: "Scratch title draft",
      latest: null,
      copyableDraft: null,
      pendingIntent: false,
      focusIntent: "field",
      command: null,
    };
    view.rerender(<BreakdownPanel />);
    expectContextSlots();

    editorState.snapshot = {
      target: { kind: "breakdown", id: "row-1" },
      phase: "dirty",
      base: { value: "Fixed geometry row", version: 1, order: 0 },
      draft: "Breakdown draft",
      latest: null,
      copyableDraft: null,
      pendingIntent: false,
      focusIntent: "field",
      command: null,
    };
    view.rerender(<BreakdownPanel />);
    expectContextSlots();
    expectBreakdownSlots();
  });

  it("keeps Context Home/End in the draft while preserving guarded keys and commands", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    editorState.snapshot = {
      target: { kind: "scratch-title", id: "scratch-1" }, phase: "dirty",
      base: { value: "Scratch", version: 1 }, draft: "T".repeat(60),
      latest: null, copyableDraft: null, pendingIntent: false,
      focusIntent: "field-end", command: null,
    };
    render(<BreakdownPanel />);
    const field = screen.getByRole("textbox", { name: "Scratch title" }) as HTMLInputElement;
    expect(fireEvent.keyDown(field, { key: "Home" })).toBe(false);
    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe(0);
    expect(fireEvent.keyDown(field, { key: "End" })).toBe(false);
    expect(field.selectionStart).toBe(60);
    expect(field.selectionEnd).toBe(60);
    for (const key of ["Home", "End"]) {
      for (const modifier of ["shiftKey", "ctrlKey", "metaKey", "altKey"]) {
        expect(fireEvent.keyDown(field, { key, [modifier]: true })).toBe(true);
        expect(field.selectionStart).toBe(60);
      }
    }
    fireEvent.compositionStart(field);
    expect(fireEvent.keyDown(field, { key: "Home" })).toBe(true);
    expect(field.selectionStart).toBe(60);
    fireEvent.compositionEnd(field);
    expect(fireEvent.keyDown(field, { key: "Home", isComposing: true })).toBe(true);
    expect(field.selectionStart).toBe(60);
    expect(field).toHaveValue("T".repeat(60));
    expect(field).toHaveFocus();
    expect(editorState.changeDraft).not.toHaveBeenCalled();
    expect(editorState.save).not.toHaveBeenCalled();
    expect(editorState.cancel).not.toHaveBeenCalled();
    fireEvent.keyDown(field, { key: "Enter" });
    expect(editorState.save).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(field, { key: "Escape" });
    expect(editorState.cancel).toHaveBeenCalledTimes(1);
  });

  it.each(["saving", "reconciling"] as const)(
    "leaves read-only Context %s Home/End to the existing browser boundary",
    (phase) => {
      triageStoreState.selectedScratchId = "scratch-1";
      editorState.snapshot = {
        target: { kind: "scratch-title", id: "scratch-1" }, phase,
        base: { value: "Scratch", version: 1 }, draft: "T".repeat(60),
        latest: null, copyableDraft: null, pendingIntent: true,
        focusIntent: "field-end", command: null,
      };
      render(<BreakdownPanel />);
      const field = screen.getByRole("textbox", { name: "Scratch title" }) as HTMLInputElement;
      expect(field).toHaveAttribute("readonly");
      expect(fireEvent.keyDown(field, { key: "Home" })).toBe(true);
      expect(fireEvent.keyDown(field, { key: "End" })).toBe(true);
      expect(field.selectionStart).toBe(60);
      expect(field).toHaveValue("T".repeat(60));
      expect(field).toHaveFocus();
      expect(editorState.changeDraft).not.toHaveBeenCalled();
      expect(editorState.save).not.toHaveBeenCalled();
      expect(editorState.cancel).not.toHaveBeenCalled();
    },
  );

  it("keeps plain row Home/End in the draft without saving or changing it", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [createScratchBreakdown({ id: "row-1", content: "Row" })];
    editorState.snapshot = {
      target: { kind: "breakdown", id: "row-1" }, phase: "dirty",
      base: { value: "Row", version: 1, order: 0 }, draft: "R".repeat(120),
      latest: null, copyableDraft: null, pendingIntent: false,
      focusIntent: "field", command: null,
    };
    render(<BreakdownPanel />);
    const field = screen.getByRole("textbox", { name: "Breakdown content" }) as HTMLInputElement;
    expect(fireEvent.keyDown(field, { key: "End" })).toBe(false);
    expect(field.selectionStart).toBe(120);
    expect(fireEvent.keyDown(field, { key: "Home" })).toBe(false);
    expect(field.selectionStart).toBe(0);
    expect(fireEvent.keyDown(field, { key: "End" })).toBe(false);
    expect(field.selectionStart).toBe(120);
    expect(field).toHaveValue("R".repeat(120));
    expect(field).toHaveFocus();
    expect(editorState.changeDraft).not.toHaveBeenCalled();
    expect(editorState.save).not.toHaveBeenCalled();
    expect(editorState.cancel).not.toHaveBeenCalled();
    for (const modifier of ["shiftKey", "ctrlKey", "metaKey", "altKey"]) {
      expect(fireEvent.keyDown(field, { key: "Home", [modifier]: true })).toBe(true);
      expect(field.selectionStart).toBe(120);
    }
    fireEvent.compositionStart(field);
    expect(fireEvent.keyDown(field, { key: "Home", isComposing: true })).toBe(true);
    expect(field.selectionStart).toBe(120);
  });

  it("opens both DP-VQ04 editors from their exact source surfaces", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    const row = createScratchBreakdown({ id: "row-1", content: "Editable" });
    hookState.breakdownsByScratch["scratch-1"] = [row];

    render(<BreakdownPanel />);

    const [contextEdit, rowEdit] = screen.getAllByRole("button", { name: "Edit" });
    expect(contextEdit).toBeEnabled();
    expect(rowEdit).toBeEnabled();

    fireEvent.click(contextEdit);
    expect(editorState.openScratchTitle).toHaveBeenCalledWith(
      expect.objectContaining({ id: "scratch-1" }),
    );
    fireEvent.click(rowEdit);
    expect(editorState.openBreakdown).toHaveBeenCalledWith(row, false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the Scratch-title editor in the Context title slot", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    editorState.snapshot = {
      target: { kind: "scratch-title", id: "scratch-1" },
      phase: "dirty",
      base: { value: "Scratch", version: 1 },
      draft: "Protected title draft",
      latest: null,
      copyableDraft: null,
      pendingIntent: false,
      focusIntent: "field-end",
      command: null,
    };

    render(<BreakdownPanel />);

    const surface = screen
      .getByRole("textbox", { name: "Scratch title" })
      .closest('[data-triage-editor-surface="scratch-title"]');
    expect(surface).toHaveAttribute("data-triage-role", "context-inline-editor");
    expect(surface).toHaveAttribute("data-triage-editor-state", "dirty");
    expect(
      within(surface as HTMLElement).queryByText("Unsaved changes."),
    ).not.toBeInTheDocument();
    const actionSlot = screen.getByTestId("context-action-slot");
    const save = within(actionSlot).getByRole("button", { name: "Save" });
    expect(save).toHaveAttribute("data-triage-emphasis", "destructive");
    expect(save).toHaveAttribute("data-triage-contrast", "adaptive");
    expect(
      within(actionSlot).getByRole("button", { name: "Cancel" }),
    ).toHaveAttribute(
      "data-triage-treatment",
      "text",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the Breakdown editor inside its exact source row", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Authoritative row" }),
    ];
    editorState.snapshot = {
      target: { kind: "breakdown", id: "row-1" },
      phase: "validation",
      base: { value: "Authoritative row", version: 1, order: 0 },
      draft: "",
      latest: null,
      copyableDraft: null,
      pendingIntent: false,
      focusIntent: "field",
      command: null,
    };

    render(<BreakdownPanel />);

    const row = screen.getByTestId("breakdown-row");
    const surface = within(row)
      .getByRole("textbox", { name: "Breakdown content" })
      .closest('[data-triage-editor-surface="breakdown-content"]');
    expect(surface).toHaveAttribute("data-triage-role", "breakdown-inline-editor");
    expect(surface).toHaveAttribute("data-triage-editor-state", "validation");
    expect(
      within(surface as HTMLElement).getByText("Enter breakdown content."),
    ).toHaveAttribute("data-triage-role", "inline-editor-required");
  });

  it.each([
    ["scratch-title", "Scratch title", 60],
    ["breakdown", "Breakdown content", 120],
  ] as const)(
    "renders %s as a capped single-line field",
    (targetKind, fieldLabel, limit) => {
      triageStoreState.selectedScratchId = "scratch-1";
      if (targetKind === "breakdown") {
        hookState.breakdownsByScratch["scratch-1"] = [
          createScratchBreakdown({ id: "row-1", content: "Current row" }),
        ];
      }
      editorState.snapshot = {
        target:
          targetKind === "scratch-title"
            ? { kind: "scratch-title", id: "scratch-1" }
            : { kind: "breakdown", id: "row-1" },
        phase: "dirty",
        base: {
          value: targetKind === "scratch-title" ? "Scratch" : "Current row",
          version: 1,
          ...(targetKind === "breakdown" ? { order: 0 } : {}),
        },
        draft: "Protected draft",
        latest: null,
        copyableDraft: null,
        pendingIntent: false,
        focusIntent: "field",
        command: null,
      };

      render(<BreakdownPanel />);

      const field = screen.getByRole("textbox", { name: fieldLabel });
      expect(field.tagName).toBe("INPUT");
      expect(field).toHaveAttribute("type", "text");
      expect(field).toHaveAttribute("maxlength", String(limit));
      expect(document.querySelector("textarea")).not.toBeInTheDocument();
    },
  );

  it("announces an applied Save once and returns focus to the surviving Edit", async () => {
    triageStoreState.selectedScratchId = "scratch-1";
    editorState.snapshot = {
      target: { kind: "scratch-title", id: "scratch-1" },
      phase: "dirty",
      base: { value: "Scratch", version: 1 },
      draft: "Saved title",
      latest: null,
      copyableDraft: null,
      pendingIntent: false,
      focusIntent: "field",
      command: null,
    };
    const view = render(<BreakdownPanel />);
    editorState.save.mockResolvedValueOnce(true);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(editorState.save).toHaveBeenCalledTimes(1));

    editorState.snapshot = null;
    editorState.focusIntent = "edit-trigger";
    view.rerender(<BreakdownPanel />);

    expect(screen.getByText("Saved.")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("button", { name: "Edit" })).toHaveFocus();
  });

  it("keeps an invalidated draft in the former Breakdown row position", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Removed row" }),
      createScratchBreakdown({ id: "row-2", content: "Survivor", order: 1 }),
    ];
    const view = render(<BreakdownPanel />);
    fireEvent.click(
      within(screen.getAllByTestId("breakdown-row")[0]).getByRole("button", {
        name: "Edit",
      }),
    );
    editorState.snapshot = {
      target: { kind: "breakdown", id: "row-1" },
      phase: "dirty",
      base: { value: "Removed row", version: 1, order: 0 },
      draft: "Draft to recover",
      latest: null,
      copyableDraft: null,
      pendingIntent: false,
      focusIntent: "field",
      command: null,
    };
    view.rerender(<BreakdownPanel />);

    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-2", content: "Survivor", order: 1 }),
    ];
    editorState.snapshot = {
      ...editorState.snapshot,
      phase: "invalidated",
      copyableDraft: "Draft to recover",
      focusIntent: "active-scratch-fallback",
    };
    view.rerender(<BreakdownPanel />);

    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0]).getByText("Draft to recover")).toBeVisible();
    expect(
      within(rows[0]).getByTestId("inline-editor-issue-overlay"),
    ).toHaveTextContent("Draft not saved");
    expect(within(rows[1]).getByText("Survivor")).toBeVisible();
  });

  it.each([
    ["offline", "Offline. Your draft is still here."],
    ["not_applied", "Not saved. Your draft is still here."],
    ["conflict", "This changed elsewhere."],
    ["invalidated", "Draft not saved"],
  ] as const)(
    "renders Breakdown %s in one fixed source-bound issue overlay",
    (phase, expectedStatus) => {
      triageStoreState.selectedScratchId = "scratch-1";
      hookState.breakdownsByScratch["scratch-1"] = [
        createScratchBreakdown({ id: "row-1", content: "Authority" }),
      ];
      if (phase === "offline") {
        vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
      }
      editorState.snapshot = {
        target: { kind: "breakdown", id: "row-1" },
        phase,
        base: { value: "Authority", version: 1, order: 0 },
        draft: "Protected draft",
        latest:
          phase === "conflict"
            ? { value: "Latest authority", version: 2, order: 0 }
            : null,
        copyableDraft: phase === "invalidated" ? "Protected draft" : null,
        pendingIntent: false,
        focusIntent:
          phase === "invalidated" ? "active-scratch-fallback" : "field",
        command: null,
      };

      render(<BreakdownPanel />);

      const row = screen.getByTestId("breakdown-row");
      expect(
        within(row).getByTestId("inline-editor-content-layer"),
      ).toHaveAttribute("data-triage-obscured", "true");
      const overlay = within(row).getByTestId("inline-editor-issue-overlay");
      expect(overlay).toHaveAttribute(
        "data-triage-role",
        "inline-editor-issue-overlay",
      );
      expect(overlay).toHaveTextContent(expectedStatus);
      expect(
        overlay.querySelectorAll(
          '[data-triage-role="inline-editor-issue-status"]',
        ),
      ).toHaveLength(1);

      if (phase === "offline" || phase === "not_applied") {
        const retry = within(overlay).getByRole("button", {
          name: "Retry save",
        });
        if (phase === "offline") expect(retry).toBeDisabled();
        else expect(retry).toBeEnabled();
        expect(
          within(overlay).getByRole("button", { name: "Cancel" }),
        ).toBeVisible();
      }
      if (phase === "conflict") {
        expect(
          within(overlay).getByRole("button", { name: "Use mine" }),
        ).toBeVisible();
        expect(
          within(overlay).getByRole("button", { name: "Use latest" }),
        ).toBeVisible();
        expect(
          within(overlay).getByRole("button", { name: "Copy draft" }),
        ).toBeVisible();
        expect(
          row.querySelector('[data-triage-role="inline-editor-compare"]'),
        ).not.toBeInTheDocument();
        expect(
          row.querySelector('[data-triage-role="inline-editor-latest"]'),
        ).not.toBeInTheDocument();
        expect(
          row.querySelector('[data-triage-role="inline-editor-draft"]'),
        ).not.toBeInTheDocument();
      }
      if (phase === "invalidated") {
        expect(
          within(overlay).getByRole("button", { name: "Copy draft" }),
        ).toBeVisible();
        expect(
          within(overlay).getByRole("button", { name: "Close" }),
        ).toBeVisible();
      }
    },
  );

  it.each([
    ["scratch-title", "pristine", null],
    ["scratch-title", "dirty", null],
    ["scratch-title", "validation", "Enter a Scratch title."],
    ["scratch-title", "saving", "Saving…"],
    ["scratch-title", "offline", "Offline. Your draft is still here."],
    ["scratch-title", "not_applied", "Not saved. Your draft is still here."],
    ["scratch-title", "reconciling", "Checking whether your changes were saved…"],
    ["scratch-title", "conflict", "This changed elsewhere."],
    ["scratch-title", "invalidated", "Draft not saved"],
    ["breakdown", "pristine", null],
    ["breakdown", "dirty", null],
    ["breakdown", "validation", "Enter breakdown content."],
    ["breakdown", "saving", "Saving…"],
    ["breakdown", "offline", "Offline. Your draft is still here."],
    ["breakdown", "not_applied", "Not saved. Your draft is still here."],
    ["breakdown", "reconciling", "Checking whether your changes were saved…"],
    ["breakdown", "conflict", "This changed elsewhere."],
    ["breakdown", "invalidated", "Draft not saved"],
  ] as const)(
    "renders %s %s with the approved status and shared state binding",
    (targetKind, phase, expectedStatus) => {
      triageStoreState.selectedScratchId = "scratch-1";
      if (targetKind === "breakdown") {
        hookState.breakdownsByScratch["scratch-1"] = [
          createScratchBreakdown({ id: "row-1", content: "Current row" }),
        ];
      }
      editorState.snapshot = {
        target:
          targetKind === "scratch-title"
            ? { kind: "scratch-title", id: "scratch-1" }
            : { kind: "breakdown", id: "row-1" },
        phase,
        base: {
          value: targetKind === "scratch-title" ? "Scratch" : "Current row",
          version: 1,
          ...(targetKind === "breakdown" ? { order: 0 } : {}),
        },
        draft: phase === "validation" ? "" : "Protected draft",
        latest:
          phase === "conflict"
            ? { value: "Latest authority", version: 2, ...(targetKind === "breakdown" ? { order: 0 } : {}) }
            : null,
        copyableDraft: phase === "invalidated" ? "Protected draft" : null,
        pendingIntent: false,
        focusIntent: phase === "invalidated" ? "active-scratch-fallback" : "field",
        command: null,
      };

      render(<BreakdownPanel />);

      const surfaceName =
        targetKind === "scratch-title" ? "scratch-title" : "breakdown-content";
      const surface = document.querySelector(
        `[data-triage-editor-surface="${surfaceName}"]`,
      );
      expect(surface).toHaveAttribute(
        "data-triage-editor-state",
        phase.replace("_", "-"),
      );
      if (expectedStatus === null) {
        expect(
          within(surface as HTMLElement).queryByTestId("inline-editor-status"),
        ).not.toBeInTheDocument();
        expect(
          (surface as HTMLElement).querySelector(
            '[data-triage-role="inline-editor-status"]',
          ),
        ).not.toBeInTheDocument();
      } else {
        const statusOwner =
          phase === "offline" ||
          phase === "not_applied" ||
          phase === "conflict" ||
          phase === "invalidated"
            ? (surface as HTMLElement).closest(
                '[data-triage-layout="fixed-inline-editor"]',
              )
            : surface;
        expect(
          within(statusOwner as HTMLElement).getAllByText(expectedStatus).length,
        ).toBeGreaterThan(0);
      }
      if (phase === "saving" || phase === "reconciling") {
        const field = within(surface as HTMLElement).getByRole("textbox");
        expect(field).toHaveAttribute("readonly");
        expect(field).toHaveFocus();
        const sourceSurface = (surface as HTMLElement).closest(
          '[data-triage-layout="fixed-inline-editor"]',
        );
        expect(
          within(sourceSurface as HTMLElement).getByTestId(
            targetKind === "scratch-title"
              ? "context-action-slot"
              : "breakdown-action-slot",
          ),
        ).toHaveTextContent(
          phase === "saving"
            ? "Saving…"
            : "Checking whether your changes were saved…",
        );
      }
      if (phase === "validation") {
        expect(
          within(surface as HTMLElement).getByRole("textbox"),
        ).toHaveAttribute("aria-invalid", "true");
        expect(
          (surface as HTMLElement).querySelector(
            '[data-triage-role="inline-editor-required"]',
          ),
        ).toHaveTextContent(expectedStatus);
        const sourceSurface = (surface as HTMLElement).closest(
          '[data-triage-layout="fixed-inline-editor"]',
        );
        expect(
          within(sourceSurface as HTMLElement).getByRole("button", {
            name: "Save",
          }),
        ).toBeDisabled();
      }
    },
  );

  it("preserves IME input, explicit theme activation, blur Save, and Escape Cancel boundaries", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    editorState.snapshot = {
      target: { kind: "scratch-title", id: "scratch-1" },
      phase: "dirty",
      base: { value: "Scratch", version: 1 },
      draft: "Protected draft",
      latest: null,
      copyableDraft: null,
      pendingIntent: false,
      focusIntent: "field-end",
      command: null,
    };
    render(<BreakdownPanel />);
    const field = screen.getByRole("textbox", { name: "Scratch title" });
    expect(field).toHaveFocus();
    expect((field as HTMLInputElement).selectionStart).toBe("Protected draft".length);

    fireEvent.change(field, { target: { value: "Composed draft" } });
    expect(editorState.changeDraft).toHaveBeenCalledWith("Composed draft");
    fireEvent.compositionStart(field);
    fireEvent.keyDown(field, { key: "Escape", isComposing: true });
    expect(editorState.cancel).not.toHaveBeenCalled();
    fireEvent.compositionEnd(field);

    const themeToggle = document.createElement("button");
    themeToggle.setAttribute("aria-label", "Toggle theme");
    document.body.append(themeToggle);
    fireEvent.blur(field, { relatedTarget: themeToggle });
    expect(editorState.save).not.toHaveBeenCalled();
    themeToggle.remove();

    const themeDialog = document.createElement("div");
    themeDialog.setAttribute("role", "dialog");
    const themeOption = document.createElement("button");
    themeOption.setAttribute("aria-pressed", "false");
    themeOption.textContent = "Terminal";
    themeDialog.append(themeOption);
    document.body.append(themeDialog);
    fireEvent.blur(field, { relatedTarget: themeOption });
    expect(editorState.save).not.toHaveBeenCalled();
    themeDialog.remove();

    fireEvent.blur(field, { relatedTarget: null });
    expect(editorState.save).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(field, { key: "Escape" });
    expect(editorState.cancel).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["scratch-title", "Scratch title"],
    ["breakdown", "Breakdown content"],
  ] as const)(
    "submits %s on Enter while preserving IME and Escape boundaries",
    (targetKind, fieldLabel) => {
      triageStoreState.selectedScratchId = "scratch-1";
      if (targetKind === "breakdown") {
        hookState.breakdownsByScratch["scratch-1"] = [
          createScratchBreakdown({ id: "row-1", content: "Current row" }),
        ];
      }
      const draft =
        targetKind === "scratch-title" ? "Protected title" : "Protected row";
      editorState.snapshot = {
        target:
          targetKind === "scratch-title"
            ? { kind: "scratch-title", id: "scratch-1" }
            : { kind: "breakdown", id: "row-1" },
        phase: "dirty",
        base: {
          value: targetKind === "scratch-title" ? "Scratch" : "Current row",
          version: 1,
          ...(targetKind === "breakdown" ? { order: 0 } : {}),
        },
        draft,
        latest: null,
        copyableDraft: null,
        pendingIntent: false,
        focusIntent: "field-end",
        command: null,
      };

      render(<BreakdownPanel />);

      const field = screen.getByRole("textbox", { name: fieldLabel });
      expect(field).toHaveFocus();
      expect((field as HTMLInputElement).selectionStart).toBe(draft.length);

      fireEvent.keyDown(field, { key: "Enter" });
      expect(editorState.save).toHaveBeenCalledTimes(1);

      fireEvent.compositionStart(field);
      fireEvent.keyDown(field, { key: "Enter", isComposing: true });
      expect(editorState.save).toHaveBeenCalledTimes(1);
      fireEvent.keyDown(field, { key: "Escape", isComposing: true });
      expect(editorState.cancel).not.toHaveBeenCalled();
      fireEvent.compositionEnd(field);

      fireEvent.keyDown(field, { key: "Escape" });
      expect(editorState.cancel).toHaveBeenCalledTimes(1);
    },
  );

  it("renders Scratch conflict as a fixed overlay and dispatches only the approved resolver actions", async () => {
    triageStoreState.selectedScratchId = "scratch-1";
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    editorState.snapshot = {
      target: { kind: "scratch-title", id: "scratch-1" },
      phase: "conflict",
      base: { value: "Base", version: 1 },
      draft: "Your protected draft",
      latest: { value: "Latest authority", version: 2 },
      copyableDraft: null,
      pendingIntent: false,
      focusIntent: "field",
      command: null,
    };
    render(<BreakdownPanel />);

    const context = screen.getByTestId("selected-scratch-context");
    expect(
      within(context).getByTestId("inline-editor-content-layer"),
    ).toHaveAttribute("data-triage-obscured", "true");
    const overlay = within(context).getByTestId("inline-editor-issue-overlay");
    expect(overlay).toHaveTextContent("This changed elsewhere.");
    expect(
      context.querySelector('[data-triage-role="inline-editor-compare"]'),
    ).not.toBeInTheDocument();
    expect(
      context.querySelector('[data-triage-role="inline-editor-latest"]'),
    ).not.toBeInTheDocument();
    expect(
      context.querySelector('[data-triage-role="inline-editor-draft"]'),
    ).not.toBeInTheDocument();
    fireEvent.click(within(overlay).getByRole("button", { name: "Use mine" }));
    fireEvent.click(within(overlay).getByRole("button", { name: "Use latest" }));
    fireEvent.click(within(overlay).getByRole("button", { name: "Copy draft" }));

    expect(editorState.useMine).toHaveBeenCalledTimes(1);
    expect(editorState.useLatest).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("Your protected draft"));
    expect(screen.getByText(/Copied\./)).toHaveAttribute(
      "data-triage-role",
      "inline-editor-copy-status",
    );
  });

  it("renders pending-intent copy without adding Task 143 reconciliation actions", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    editorState.snapshot = {
      target: { kind: "scratch-title", id: "scratch-1" },
      phase: "saving",
      base: { value: "Base", version: 1 },
      draft: "Draft",
      latest: null,
      copyableDraft: null,
      pendingIntent: true,
      focusIntent: "field",
      command: null,
    };
    render(<BreakdownPanel />);

    expect(screen.getAllByText("Saving before continuing…").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Stay here" }));
    expect(editorState.stayHere).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Check again" })).not.toBeInTheDocument();
  });

  it("enables Retry save only after the browser reconnects", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    let online = false;
    vi.spyOn(navigator, "onLine", "get").mockImplementation(() => online);
    editorState.snapshot = {
      target: { kind: "scratch-title", id: "scratch-1" },
      phase: "offline",
      base: { value: "Base", version: 1 },
      draft: "Offline draft",
      latest: null,
      copyableDraft: null,
      pendingIntent: false,
      focusIntent: "field",
      command: null,
    };
    render(<BreakdownPanel />);
    const retry = screen.getByRole("button", { name: "Retry save" });
    expect(retry).toBeDisabled();

    online = true;
    fireEvent(window, new Event("online"));

    expect(retry).toBeEnabled();
    fireEvent.click(retry);
    expect(editorState.save).toHaveBeenCalledTimes(1);
  });

  it("keeps the same editor semantics across light/dark and all eight color themes", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    editorState.snapshot = {
      target: { kind: "scratch-title", id: "scratch-1" },
      phase: "dirty",
      base: { value: "Base", version: 1 },
      draft: "Theme-stable draft",
      latest: null,
      copyableDraft: null,
      pendingIntent: false,
      focusIntent: "field",
      command: null,
    };
    const themes = [
      "griddo",
      "tiny-desk",
      "neumorphism",
      "claymorphism",
      "origami",
      "terminal",
      "retro-mac",
      "graphite",
    ];
    const view = render(<BreakdownPanel />);

    for (const theme of themes) {
      for (const mode of ["light", "dark"] as const) {
        document.documentElement.dataset.colorTheme = theme;
        document.documentElement.classList.toggle("dark", mode === "dark");
        view.rerender(<BreakdownPanel />);
        const surface = screen
          .getByRole("textbox", { name: "Scratch title" })
          .closest('[data-triage-editor-surface="scratch-title"]');
        expect(surface).toHaveAttribute("data-triage-editor-state", "dirty");
        expect(
          within(surface as HTMLElement).queryByText("Unsaved changes."),
        ).not.toBeInTheDocument();
        expect(
          within(screen.getByTestId("context-action-slot")).getByRole(
            "button",
            { name: "Save" },
          ),
        ).toHaveAttribute("data-triage-emphasis", "destructive");
      }
    }
    document.documentElement.classList.remove("dark");
    delete document.documentElement.dataset.colorTheme;
  });

  it("blocks both Edit entries while another shared operation is active", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Locked" }),
    ];
    operationLockState.activeOperation = { kind: "add", operationId: "add-1" };

    render(<BreakdownPanel />);

    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
    for (const edit of screen.getAllByRole("button", { name: "Edit" })) {
      expect(edit).toBeDisabled();
    }
    expect(editorState.openScratchTitle).not.toHaveBeenCalled();
    expect(editorState.openBreakdown).not.toHaveBeenCalled();
  });

  it("invalidates an open row editor when authoritative staging makes the row unsaveable", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    triageStoreState.stagedCandidates = {
      "scratch-1": [
        {
          id: "candidate-1",
          type: "node",
          sourceBreakdownId: "row-1",
          label: "Staged",
        },
      ],
    };
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Staged" }),
    ];
    editorState.snapshot = {
      target: { kind: "breakdown", id: "row-1" },
      phase: "dirty",
      base: { value: "Staged", version: 1, order: 0 },
      draft: "Protected draft",
      latest: null,
      copyableDraft: null,
      pendingIntent: false,
      focusIntent: "field",
      command: null,
    };

    render(<BreakdownPanel />);

    expect(editorState.invalidate).toHaveBeenCalledTimes(1);
  });

  it("activates the input when clicking the add-note placeholder", () => {
    triageStoreState.selectedScratchId = "scratch-1";

    render(<BreakdownPanel />);

    const addEntry = screen.getByRole("button", { name: "Add a note..." });
    expect(addEntry).toHaveAttribute("data-triage-role", "breakdown-add-field");
    expect(screen.getByRole("button", { name: "Add" })).toHaveAttribute(
      "data-triage-role",
      "breakdown-add-control",
    );
    fireEvent.click(addEntry);

    expect(screen.getByPlaceholderText("Add a note...")).toHaveFocus();
    expect(screen.getByPlaceholderText("Add a note...")).toHaveAttribute(
      "data-triage-role",
      "breakdown-add-field",
    );
  });

  it("creates a trimmed breakdown when pressing Enter", async () => {
    triageStoreState.selectedScratchId = "scratch-1";

    render(<BreakdownPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));
    const input = screen.getByPlaceholderText("Add a note...");
    fireEvent.change(input, { target: { value: "  Follow up  " } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(hookState.createBreakdown).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "Follow up",
          scratchBitId: "scratch-1",
          scratchExpectedVersion: 1,
        }),
      );
    });
  });

  it("dispatches one Add for duplicate Enter/click and releases only its terminal identity", async () => {
    triageStoreState.selectedScratchId = "scratch-1";
    let resolveAdd!: (value: {
      operationId: string;
      status: "applied";
      breakdown: null;
      scratch: null;
    }) => void;
    hookState.createBreakdown.mockImplementation(
      (command) =>
        new Promise((resolve) => {
          resolveAdd = resolve;
        }).then(() => ({
          operationId: command.operationId,
          status: "applied" as const,
          breakdown: null,
          scratch: null,
        })),
    );

    render(<BreakdownPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));
    const input = screen.getByPlaceholderText("Add a note...");
    fireEvent.change(input, { target: { value: "Only once" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(hookState.createBreakdown).toHaveBeenCalledTimes(1);
    const command = hookState.createBreakdown.mock.calls[0][0];
    resolveAdd({
      operationId: command.operationId,
      status: "applied",
      breakdown: null,
      scratch: null,
    });
    await waitFor(() => {
      expect(operationLockState.release).toHaveBeenCalledWith(
        command.operationId,
        "applied",
      );
    });
  });

  it("retains an unknown Add draft and denies Escape without releasing the lock", async () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.createBreakdown.mockImplementation(async (command) => ({
      operationId: command.operationId,
      outcome: "unknown",
    }));

    render(<BreakdownPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));
    const input = screen.getByPlaceholderText("Add a note...");
    fireEvent.change(input, { target: { value: "Protected draft" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(hookState.createBreakdown).toHaveBeenCalledOnce());
    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.getByPlaceholderText("Add a note...")).toHaveValue(
      "Protected draft",
    );
    expect(operationLockState.activeOperation?.kind).toBe("add");
    expect(operationLockState.release).not.toHaveBeenCalled();
  });

  it("retains an Add draft but releases the lock on terminal not_applied", async () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.createBreakdown.mockImplementation(async (command) => ({
      operationId: command.operationId,
      status: "not_applied",
      breakdown: null,
      scratch: null,
    }));

    render(<BreakdownPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));
    const input = screen.getByPlaceholderText("Add a note...");
    fireEvent.change(input, { target: { value: "Try later" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(operationLockState.release).toHaveBeenCalledWith(
        expect.any(String),
        "not_applied",
      );
    });
    expect(input).toHaveValue("Try later");
    expect(operationLockState.activeOperation).toBeNull();
  });

  it.each([
    ["pending", undefined, "Adding…", null],
    [
      "unknown",
      undefined,
      "We couldn’t confirm whether it was added.",
      "Check again",
    ],
    [
      "reconciling",
      undefined,
      "Checking whether it was added…",
      "Check again",
    ],
    [
      "terminal",
      "not_applied",
      "Not added. Your draft is still here.",
      "Retry Add",
    ],
    [
      "terminal",
      "rejected",
      "Add unavailable. Your draft is still here.",
      null,
    ],
    [
      "terminal",
      "conflict",
      "This Scratch changed. Your draft is still here.",
      null,
    ],
  ] as const)(
    "renders the authoritative Add %s/%s reliability state",
    (phase, status, copy, action) => {
      triageStoreState.selectedScratchId = "scratch-1";
      hookState.operations = [
        {
          kind: "add",
          operationId: "add-operation",
          scratchBitId: "scratch-1",
          breakdownId: "new-row",
          phase,
          ...(status === undefined ? {} : { status }),
        },
      ];

      render(<BreakdownPanel />);

      const statusText = screen.getByText(copy);
      const reliability = statusText.closest(
        '[data-triage-reliability-surface="add"]',
      );
      const reliabilityLine = statusText.closest(
        '[data-triage-role="breakdown-reliability"]',
      );
      expect(reliability).toHaveAttribute(
        "data-triage-reliability-state",
        phase === "terminal" ? status?.replace("_", "-") : phase,
      );
      expect(statusText).toHaveAttribute("role", "status");
      expect(statusText).toHaveAttribute("aria-live", "polite");
      expect(statusText).toHaveAttribute("aria-atomic", "true");
      if (action === null) {
        expect(
          within(reliabilityLine as HTMLElement).queryByRole("button"),
        ).toBeNull();
      } else {
        const button = within(reliabilityLine as HTMLElement).getByRole("button", {
          name: action,
        });
        if (phase === "reconciling") {
          expect(button).toHaveAttribute("aria-disabled", "true");
          expect(button).not.toBeDisabled();
        }
      }
      expect(screen.queryByRole("button", { name: "Retry Delete" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Delete again" })).toBeNull();
    },
  );

  it("reconciles and retries Add with the preserved command identity and focus", async () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.createBreakdown
      .mockImplementationOnce(async (command) => {
        hookState.operations = [
          {
            kind: "add",
            operationId: command.operationId,
            scratchBitId: command.scratchBitId,
            breakdownId: command.breakdownId,
            phase: "unknown",
          },
        ];
        return { operationId: command.operationId, outcome: "unknown" };
      })
      .mockImplementationOnce(
        (command) =>
          new Promise(() => {
            hookState.operations = [
              {
                kind: "add",
                operationId: command.operationId,
                scratchBitId: command.scratchBitId,
                breakdownId: command.breakdownId,
                phase: "pending",
              },
            ];
          }),
      );
    let resolveReconcile!: (value: {
      operationId: string;
      status: "not_applied";
      breakdown: null;
      scratch: null;
    }) => void;
    hookState.reconcileAddBreakdown.mockImplementation(
      (command) =>
        new Promise((resolve) => {
          hookState.operations = [
            {
              kind: "add",
              operationId: command.operationId,
              scratchBitId: command.scratchBitId,
              breakdownId: command.breakdownId,
              phase: "reconciling",
            },
          ];
          resolveReconcile = resolve;
        }),
    );

    const view = render(<BreakdownPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));
    const input = screen.getByPlaceholderText("Add a note...");
    fireEvent.change(input, { target: { value: "Preserved Add" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(hookState.createBreakdown).toHaveBeenCalledOnce());
    view.rerender(<BreakdownPanel />);

    const checkAgain = screen.getByRole("button", { name: "Check again" });
    fireEvent.click(checkAgain);
    view.rerender(<BreakdownPanel />);
    expect(checkAgain).toHaveFocus();
    expect(checkAgain).toHaveAttribute("aria-disabled", "true");

    const originalCommand = hookState.createBreakdown.mock.calls[0][0];
    expect(hookState.reconcileAddBreakdown).toHaveBeenCalledWith(originalCommand);
    await act(async () => {
      hookState.operations = [
        {
          kind: "add",
          operationId: originalCommand.operationId,
          scratchBitId: originalCommand.scratchBitId,
          breakdownId: originalCommand.breakdownId,
          phase: "terminal",
          status: "not_applied",
        },
      ];
      resolveReconcile({
        operationId: originalCommand.operationId,
        status: "not_applied",
        breakdown: null,
        scratch: null,
      });
    });
    view.rerender(<BreakdownPanel />);

    const retryAdd = screen.getByRole("button", { name: "Retry Add" });
    await waitFor(() => expect(retryAdd).toHaveFocus());
    expect(operationLockState.release).toHaveBeenCalledWith(
      originalCommand.operationId,
      "not_applied",
    );
    fireEvent.click(retryAdd);
    expect(input).toHaveFocus();
    expect(hookState.createBreakdown).toHaveBeenLastCalledWith(originalCommand);
  });

  it("withdraws authoritative not_applied Retry Add when the retained draft changes", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.operations = [
      {
        kind: "add",
        operationId: "add-operation",
        scratchBitId: "scratch-1",
        breakdownId: "new-row",
        phase: "terminal",
        status: "not_applied",
      },
    ];

    render(<BreakdownPanel />);
    const input = screen.getByPlaceholderText("Add a note...");
    fireEvent.change(input, { target: { value: "Edited draft" } });

    expect(screen.queryByRole("button", { name: "Retry Add" })).toBeNull();
    expect(screen.queryByText("Not added. Your draft is still here.")).toBeNull();
  });

  it("resets only the owning Breakdown viewport for a deep-scroll DESC Add", async () => {
    triageStoreState.selectedScratchId = "scratch-1";
    useTriagePreferencesStore.setState({ breakdownCreatedAtSort: "DESC" });
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    const view = render(<BreakdownPanel />);
    const contentRegion = screen.getByTestId("breakdown-content-region");
    contentRegion.scrollTop = 240;
    const documentScroll = window.scrollY;
    fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));
    const input = screen.getByPlaceholderText("Add a note...");
    fireEvent.change(input, { target: { value: "New confirmed row" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(hookState.createBreakdown).toHaveBeenCalledOnce());
    await waitFor(() => expect(operationLockState.release).toHaveBeenCalled());

    const command = hookState.createBreakdown.mock.calls[0][0];
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({
        id: command.breakdownId,
        content: "New confirmed row",
      }),
    ];
    view.rerender(<BreakdownPanel />);

    await waitFor(() => expect(contentRegion.scrollTop).toBe(0));
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(input).toHaveFocus();
    expect(window.scrollY).toBe(documentScroll);
    expect(
      screen
        .getByTestId("selected-scratch-context")
        .compareDocumentPosition(screen.getByText("New confirmed row")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByRole("status")).toHaveTextContent("Added.");

    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: originalScrollIntoView,
    });
  });

  it("preserves the confirmed ASC Add end handoff", async () => {
      triageStoreState.selectedScratchId = "scratch-1";
      useTriagePreferencesStore.setState({ breakdownCreatedAtSort: "ASC" });
      const scrollIntoView = vi.fn();
      const originalScrollIntoView = Element.prototype.scrollIntoView;
      Object.defineProperty(Element.prototype, "scrollIntoView", {
        configurable: true,
        value: scrollIntoView,
      });

      const view = render(<BreakdownPanel />);
      fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));
      const input = screen.getByPlaceholderText("Add a note...");
      fireEvent.change(input, { target: { value: "New confirmed row" } });
      fireEvent.keyDown(input, { key: "Enter" });
      await waitFor(() =>
        expect(hookState.createBreakdown).toHaveBeenCalledOnce(),
      );
      await waitFor(() => expect(operationLockState.release).toHaveBeenCalled());

      const command = hookState.createBreakdown.mock.calls[0][0];
      hookState.breakdownsByScratch["scratch-1"] = [
        createScratchBreakdown({
          id: command.breakdownId,
          content: "New confirmed row",
        }),
      ];
      view.rerender(<BreakdownPanel />);

      await waitFor(() => {
        expect(scrollIntoView).toHaveBeenCalledWith({ block: "end" });
      });
      expect(screen.getByPlaceholderText("Add a note...")).toHaveFocus();
      Object.defineProperty(Element.prototype, "scrollIntoView", {
        configurable: true,
        value: originalScrollIntoView,
      });
  });

  it("shows the section-scoped completion overlay and delegates guarded Archive only to its coordinator", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({
        id: "row-1",
        content: "Processed note",
        consumedAt: currentTime,
      }),
    ];

    const archive = vi.fn(async () => true);
    render(<CompletionHarness archive={archive} />);

    const overlay = screen.getByRole("region", { name: "Scratch complete" });
    expect(overlay).toHaveAttribute(
      "data-triage-role",
      "archive-completion-overlay",
    );
    expect(screen.getByTestId("breakdown-content-region")).toHaveAttribute(
      "inert",
    );
    const archiveAction = within(overlay).getByRole("button", {
      name: "Archive Scratch",
    });
    expect(archiveAction).toBeEnabled();
    fireEvent.click(archiveAction);
    expect(archive).toHaveBeenCalledOnce();
    expect(within(overlay).getByRole("button", { name: "Cancel" })).toBeEnabled();
    expect(
      screen.getByTestId("archive-completion-announcement"),
    ).toHaveTextContent("Scratch complete");
    expect(archiveBitMock).not.toHaveBeenCalled();
  });

  it("locks Archive, Cancel, and Escape while the shared Archive owner is active", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", consumedAt: currentTime }),
    ];
    operationLockState.activeOperation = {
      kind: "archive" as never,
      operationId: "archive-1",
    };
    const archive = vi.fn(async () => true);
    render(<CompletionHarness archive={archive} />);

    const overlay = screen.getByRole("region", { name: "Scratch complete" });
    expect(
      within(overlay).getByRole("button", { name: "Archive Scratch" }),
    ).toBeDisabled();
    expect(within(overlay).getByRole("button", { name: "Cancel" })).toBeDisabled();
    fireEvent.keyDown(overlay, { key: "Escape" });
    expect(screen.getByRole("region", { name: "Scratch complete" })).toBeVisible();
    expect(archive).not.toHaveBeenCalled();
  });

  it.each([
    ["pending", undefined, "Archiving this Scratch…", "Archive Scratch"],
    ["unknown", undefined, "We couldn’t confirm whether this Scratch was archived.", "Check again"],
    ["reconciling", undefined, "Checking whether this Scratch was archived…", "Check again"],
    ["terminal", "not_applied", "This Scratch was not archived.", "Retry"],
    ["terminal", "rejected", "Archive stopped because this Scratch is no longer ready.", "Cancel"],
    ["terminal", "conflict", "Archive couldn’t finish because this Scratch changed while the result was being checked.", "Cancel"],
    ["storage_failed", undefined, "Archive couldn’t start because this tab couldn’t keep its recovery details.", "Cancel"],
  ] as const)(
    "renders one stable Archive card for %s/%s",
    (phase, terminalStatus, sentence, currentAction) => {
      triageStoreState.selectedScratchId = "scratch-1";
      hookState.breakdownsByScratch["scratch-1"] = [
        createScratchBreakdown({ id: "row-1", consumedAt: currentTime }),
      ];
      const recovery = {
        operationId: "00000000-0000-4000-8000-000000000001",
        kind: "archive_scratch",
        scratchBitId: "scratch-1",
        expectedVersion: 7,
        startedAt: currentTime,
      };
      const state =
        phase === "terminal"
          ? { phase, recovery, terminalStatus }
          : phase === "storage_failed"
            ? { phase, recovery: null }
            : { phase, recovery };
      render(
        <CompletionHarness
          archiveOperation={{
            state,
            isRecoveryProjection: false,
            reconcile: vi.fn(),
            retry: vi.fn(),
            dismissTerminal: vi.fn(() => true),
          }}
        />,
      );

      const card = screen.getByRole("region", { name: sentence });
      expect(card).toHaveAttribute("data-triage-role", "archive-completion-overlay");
      expect(within(card).getAllByText(sentence)).toHaveLength(1);
      const action = within(card).getByRole("button", { name: currentAction });
      expect(action).toHaveAttribute("data-triage-role", "archive-current-action");
      if (phase === "pending" || phase === "reconciling") {
        expect(action).toHaveAttribute("aria-disabled", "true");
      }
      if (terminalStatus === "not_applied") {
        expect(within(card).getByRole("button", { name: "Cancel" })).toBeEnabled();
      } else if (phase !== "storage_failed" && phase !== "terminal") {
        expect(within(card).queryByRole("button", { name: "Cancel" })).toBeNull();
      }
    },
  );

  it("uses Check again without resend, retains its focus while reconciling, and blocks Escape dismissal", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", consumedAt: currentTime }),
    ];
    const reconcile = vi.fn();
    const archive = vi.fn(async () => true);
    const archiveOperation = {
      state: {
        phase: "unknown",
        recovery: {
          operationId: "00000000-0000-4000-8000-000000000001",
          kind: "archive_scratch",
          scratchBitId: "scratch-1",
          expectedVersion: 7,
          startedAt: currentTime,
        },
      },
      isRecoveryProjection: false,
      reconcile,
      retry: vi.fn(),
      dismissTerminal: vi.fn(),
    };
    const view = render(
      <CompletionHarness archive={archive} archiveOperation={archiveOperation} />,
    );
    const checkAgain = screen.getByRole("button", { name: "Check again" });
    expect(checkAgain).toHaveFocus();
    fireEvent.click(checkAgain);
    expect(reconcile).toHaveBeenCalledOnce();
    expect(archive).not.toHaveBeenCalled();

    archiveOperation.state = {
      ...archiveOperation.state,
      phase: "reconciling",
    };
    view.rerender(
      <CompletionHarness archive={archive} archiveOperation={archiveOperation} />,
    );
    const retained = screen.getByRole("button", { name: "Check again" });
    expect(retained).toHaveFocus();
    fireEvent.keyDown(retained, { key: "Escape" });
    expect(screen.getByText("Checking whether this Scratch was archived…")).toBeVisible();
  });

  it("binds the Archive card roles to every theme with static reduced-motion-identical treatment", () => {
    for (const selector of [
      ".archive-card",
      ".archive-status",
      ".archive-status-mark",
      ".archive-current-action",
    ]) {
      expect(globalsCss).toContain(selector);
    }
    expect(globalsCss).toMatch(/\.archive-card[\s\S]*animation: none !important;/);
    expect(globalsCss).toMatch(/\.archive-card[\s\S]*transition: none !important;/);
    for (const theme of [
      "tiny-desk",
      "neumorphism",
      "claymorphism",
      "origami",
      "terminal",
      "retro-mac",
      "graphite",
    ]) {
      expect(globalsCss).toContain(
        `:root[data-color-theme="${theme}"] .archive-card`,
      );
    }
  });

  it("Cancel restores Add, marks Context complete, and focuses explicit Reopen", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", consumedAt: currentTime }),
    ];
    render(<CompletionHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("region", { name: "Scratch complete" })).toBeNull();
    expect(screen.getByTestId("selected-scratch-context")).toHaveAttribute(
      "data-triage-state",
      "complete",
    );
    expect(screen.getByRole("button", { name: "Add a note..." })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Reopen" })).toHaveFocus();
  });

  it("Cancel restores the Add entry after an empty Add draft opens completion", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", consumedAt: currentTime }),
    ];
    const completion = {
      presentation: "working" as "working" | "overlay" | "complete",
      cancel: vi.fn(),
      reopen: vi.fn(),
    };
    const view = render(<BreakdownPanel completion={completion} />);
    fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));
    expect(screen.getByPlaceholderText("Add a note...")).toHaveValue("");

    completion.presentation = "overlay";
    view.rerender(<BreakdownPanel completion={completion} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    completion.presentation = "complete";
    view.rerender(<BreakdownPanel completion={completion} />);

    expect(screen.getByRole("button", { name: "Add a note..." })).toBeEnabled();
  });

  it("explicit Reopen restores the overlay and focuses its heading", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", consumedAt: currentTime }),
    ];
    render(<CompletionHarness initial="complete" />);

    fireEvent.click(screen.getByRole("button", { name: "Reopen" }));

    expect(
      screen.getByRole("heading", { name: "Scratch complete" }),
    ).toHaveFocus();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });

  it("moves completion focus to the Breakdown heading when eligibility is withdrawn", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    const completion = {
      presentation: "overlay" as "working" | "overlay" | "complete",
      cancel: vi.fn(),
      reopen: vi.fn(),
    };
    const { rerender } = render(
      <>
        <h2 id="triage-breakdown-heading" tabIndex={-1}>
          Breakdown
        </h2>
        <BreakdownPanel completion={completion} />
      </>,
    );
    screen.getByRole("button", { name: "Cancel" }).focus();

    completion.presentation = "working";
    rerender(
      <>
        <h2 id="triage-breakdown-heading" tabIndex={-1}>
          Breakdown
        </h2>
        <BreakdownPanel completion={completion} />
      </>,
    );

    expect(screen.getByRole("heading", { name: "Breakdown" })).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Reopen" })).toBeNull();
  });

  it("retains Reopen focus ownership across a background-tab blur before remote withdrawal", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    const completion = {
      presentation: "complete" as "working" | "overlay" | "complete",
      withdrawalReason: null as null | "active-breakdown",
      cancel: vi.fn(),
      reopen: vi.fn(),
    };
    const hasFocus = vi.spyOn(document, "hasFocus").mockReturnValue(false);
    const view = render(
      <>
        <h2 id="triage-breakdown-heading" tabIndex={-1}>
          Breakdown
        </h2>
        <BreakdownPanel completion={completion} />
      </>,
    );
    const reopen = screen.getByRole("button", { name: "Reopen" });
    reopen.focus();
    fireEvent.blur(reopen, { relatedTarget: null });

    completion.presentation = "working";
    completion.withdrawalReason = "active-breakdown";
    view.rerender(
      <>
        <h2 id="triage-breakdown-heading" tabIndex={-1}>
          Breakdown
        </h2>
        <BreakdownPanel completion={completion} />
      </>,
    );

    expect(screen.getByRole("heading", { name: "Breakdown" })).toHaveFocus();
    hasFocus.mockRestore();
  });

  it("preserves Add focus when withdrawal removes a previously focused Reopen", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    const completion = {
      presentation: "complete" as "working" | "overlay" | "complete",
      cancel: vi.fn(),
      reopen: vi.fn(),
    };
    const view = render(
      <>
        <h2 id="triage-breakdown-heading" tabIndex={-1}>
          Breakdown
        </h2>
        <BreakdownPanel completion={completion} />
      </>,
    );
    screen.getByRole("button", { name: "Reopen" }).focus();
    fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));
    const input = screen.getByPlaceholderText("Add a note...");
    fireEvent.change(input, { target: { value: "Keep this focus" } });

    completion.presentation = "working";
    view.rerender(
      <>
        <h2 id="triage-breakdown-heading" tabIndex={-1}>
          Breakdown
        </h2>
        <BreakdownPanel completion={completion} />
      </>,
    );

    expect(input).toHaveFocus();
  });

  it("holds completion blocked after Add success until persisted truth catches up", async () => {
    triageStoreState.selectedScratchId = "scratch-1";
    const onAddDraftBlockerChange = vi.fn();
    const completion = {
      presentation: "working" as "working" | "overlay" | "complete",
      persistedEligible: true,
      cancel: vi.fn(),
      reopen: vi.fn(),
    };
    const view = render(
      <BreakdownPanel
        completion={completion}
        onAddDraftBlockerChange={onAddDraftBlockerChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));
    const input = screen.getByPlaceholderText("Add a note...");
    fireEvent.change(input, { target: { value: "New active work" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(hookState.createBreakdown).toHaveBeenCalledOnce());

    expect(onAddDraftBlockerChange).toHaveBeenLastCalledWith(true);
    completion.persistedEligible = false;
    view.rerender(
      <BreakdownPanel
        completion={completion}
        onAddDraftBlockerChange={onAddDraftBlockerChange}
      />,
    );
    await waitFor(() =>
      expect(onAddDraftBlockerChange).toHaveBeenLastCalledWith(false),
    );
  });

  it("renders the Add completion blocker below reliability copy and preserves Add focus", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.operations = [
      {
        kind: "add",
        operationId: "add-1",
        scratchBitId: "scratch-1",
        breakdownId: "row-1",
        phase: "terminal",
        status: "not_applied",
      },
    ];
    const completion = {
      presentation: "working" as const,
      persistedEligible: true,
      completionBlockers: { addDraft: true, title: null },
      withdrawalReason: null,
      cancel: vi.fn(),
      reopen: vi.fn(),
    };
    render(<BreakdownPanel completion={completion} />);
    const input = screen.getByPlaceholderText("Add a note...");
    input.focus();

    const region = screen.getByTestId("breakdown-add-row");
    const reliability = within(region).getByText(
      "Not added. Your draft is still here.",
    );
    const blocker = within(region).getByText(
      "Add this idea or clear the draft to complete this Scratch.",
    );
    expect(reliability.compareDocumentPosition(blocker)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(blocker.closest('[role="status"]')).toHaveAttribute(
      "data-triage-role",
      "breakdown-add-completion-blocker",
    );
    expect(input).toHaveAttribute(
      "aria-describedby",
      blocker.closest('[role="status"]')?.id,
    );
    expect(input).toHaveFocus();
  });

  it.each([
    ["pristine", "open", "Save or cancel the Scratch title edit to complete this Scratch."],
    ["dirty", "dirty", "Save or cancel the Scratch title edit to complete this Scratch."],
    ["saving", "saving", "Saving the Scratch title before completion…"],
    ["reconciling", "reconciling", "Checking the Scratch title before completion…"],
  ] as const)(
    "uses the Context eyebrow for %s title completion blocking without moving focus",
    (phase, title, copy) => {
      triageStoreState.selectedScratchId = "scratch-1";
      editorState.snapshot = {
        target: { kind: "scratch-title", id: "scratch-1" },
        phase,
        base: { value: "Scratch", version: 1 },
        draft: "Scratch draft",
        latest: null,
        copyableDraft: null,
        pendingIntent: false,
        focusIntent: "field",
        command: null,
      };
      const completion = {
        presentation: "working" as const,
        persistedEligible: true,
        completionBlockers: { addDraft: false, title },
        withdrawalReason: null,
        cancel: vi.fn(),
        reopen: vi.fn(),
      };
      const view = render(<BreakdownPanel completion={completion} />);
      const field = screen.getByRole("textbox", { name: "Scratch title" });
      expect(field).toHaveFocus();
      const eyebrow = screen.getByText(copy);
      expect(eyebrow).toHaveAttribute(
        "data-triage-role",
        "context-completion-blocker-mark",
      );
      expect(field.getAttribute("aria-describedby")?.split(" ")).toContain(
        eyebrow.id,
      );
      expect(screen.queryByText("Selected Scratch")).toBeNull();

      view.rerender(
        <BreakdownPanel
          completion={{
            ...completion,
            completionBlockers: { addDraft: false, title: null },
          }}
        />,
      );
      expect(screen.getByText("Selected Scratch")).toBeInTheDocument();
      expect(field).toHaveFocus();
    },
  );

  it.each([
    ["offline", "dirty", "Offline. Your draft is still here."],
    ["not_applied", "dirty", "Not saved. Your draft is still here."],
    ["conflict", "conflicted", "This changed elsewhere."],
  ] as const)(
    "appends the %s title blocker inside the existing issue overlay",
    (phase, title, editorCopy) => {
      triageStoreState.selectedScratchId = "scratch-1";
      editorState.snapshot = {
        target: { kind: "scratch-title", id: "scratch-1" },
        phase,
        base: { value: "Scratch", version: 1 },
        draft: "Scratch draft",
        latest:
          phase === "conflict"
            ? { value: "Latest Scratch", version: 2 }
            : null,
        copyableDraft: null,
        pendingIntent: false,
        focusIntent: phase === "conflict" ? "pending-action" : "field",
        command: null,
      };
      render(
        <BreakdownPanel
          completion={{
            presentation: "working",
            persistedEligible: true,
            completionBlockers: { addDraft: false, title },
            withdrawalReason: null,
            cancel: vi.fn(),
            reopen: vi.fn(),
          }}
        />,
      );

      const overlay = screen.getByTestId("inline-editor-issue-overlay");
      const status = overlay.querySelector(
        '[data-triage-role="inline-editor-issue-status"]',
      );
      expect(status).not.toBeNull();
      expect(status).toHaveTextContent(editorCopy);
      expect(status).toHaveTextContent(
        title === "conflicted"
          ? "Resolve the Scratch title conflict to complete this Scratch."
          : "Save or cancel the Scratch title edit to complete this Scratch.",
      );
      expect(screen.getAllByTestId("inline-editor-issue-overlay")).toHaveLength(1);
    },
  );

  it.each([
    ["active-breakdown", "Completion is no longer available because a Breakdown item is active."],
    ["staging", "Completion is no longer available because an item is in Staging."],
    ["breakdown-and-staging", "Completion is no longer available because Breakdown and Staging have active items."],
  ] as const)("renders %s withdrawal in the vacated completion slot", (reason, copy) => {
    triageStoreState.selectedScratchId = "scratch-1";
    render(
      <BreakdownPanel
        completion={{
          presentation: "working",
          persistedEligible: false,
          completionBlockers: { addDraft: false, title: null },
          withdrawalReason: reason,
          cancel: vi.fn(),
          reopen: vi.fn(),
        }}
      />,
    );
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(copy);
    expect(status).toHaveAttribute("data-triage-role", "archive-withdrawal-status");
    expect(screen.queryByRole("button", { name: "Reopen" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Scratch complete" })).toBeNull();
  });

  it("maps Task 160 roles through every theme with immediate reduced-motion-identical treatment", () => {
    expect(globalsCss).toContain(".breakdown-add-completion-blocker");
    expect(globalsCss).toContain(".context-completion-blocker-mark");
    expect(globalsCss).toContain(".archive-withdrawal-status");
    expect(globalsCss).toContain("animation: none !important;");
    expect(globalsCss).toContain("transition: none !important;");
    expect(getCssBlock(".context-completion-blocker-mark")).toContain(
      "white-space: normal",
    );
    expect(globalsCss).toMatch(
      /\.triage-fixed-context \.triage-inline-editor__issue-overlay[\s\S]*\[data-triage-role="inline-editor-issue-status"\][\s\S]*white-space: normal/,
    );
    for (const theme of [
      "tiny-desk",
      "neumorphism",
      "claymorphism",
      "origami",
      "terminal",
      "retro-mac",
      "graphite",
    ]) {
      expect(globalsCss).toContain(
        `:root[data-color-theme="${theme}"] .breakdown-add-completion-blocker`,
      );
      expect(globalsCss).toContain(
        `:root[data-color-theme="${theme}"] .archive-withdrawal-status`,
      );
    }
  });

  it("limits Escape cancellation to focus inside the completion overlay", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", consumedAt: currentTime }),
    ];
    render(<CompletionHarness />);

    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();

    const cancel = screen.getByRole("button", { name: "Cancel" });
    cancel.focus();
    fireEvent.keyDown(cancel, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Reopen" })).toHaveFocus();
  });

  it("keeps the add-note bar when consumed breakdowns still have staged candidates", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    triageStoreState.stagedCandidates = {
      "scratch-1": [
        {
          id: "candidate-1",
          type: "node",
          sourceBreakdownId: "row-1",
          label: "Processed note",
        },
      ],
    };
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({
        id: "row-1",
        content: "Processed note",
        consumedAt: currentTime,
      }),
    ];

    render(<BreakdownPanel />);

    expect(screen.getByTestId("breakdown-empty-state")).toHaveAttribute(
      "data-triage-state",
      "ordinary",
    );
    expect(screen.queryByText("All items processed")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add a note..." }),
    ).toBeInTheDocument();
  });

  it("does not create a breakdown for empty blur or Escape cancels", () => {
    triageStoreState.selectedScratchId = "scratch-1";

    render(<BreakdownPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));
    const input = screen.getByPlaceholderText("Add a note...");
    fireEvent.blur(input);
    fireEvent.keyDown(input, {
      key: "Escape",
    });

    expect(hookState.createBreakdown).not.toHaveBeenCalled();
  });

  it("opens a confirmation dialog when the delete button is clicked", async () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Delete me" }),
    ];

    render(<BreakdownPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(hookState.deleteBreakdown).not.toHaveBeenCalled();
  });

  it("deletes the selected row when confirming the dialog", async () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Delete me" }),
    ];

    render(<BreakdownPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(hookState.deleteBreakdown).toHaveBeenCalledWith(
        expect.objectContaining({
          breakdownId: "row-1",
          expectedVersion: 1,
          scratchBitId: "scratch-1",
          scratchExpectedVersion: 1,
        }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  it("reconciles an unknown Delete without resend and preserves terminal release/focus", async () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Still here" }),
      createScratchBreakdown({ id: "row-2", content: "Focus next" }),
    ];
    hookState.deleteBreakdown.mockImplementation(async (command) => {
      hookState.operations = [
        {
          kind: "delete",
          operationId: command.operationId,
          scratchBitId: command.scratchBitId,
          breakdownId: command.breakdownId,
          phase: "unknown",
          sourceSnapshot: hookState.breakdownsByScratch["scratch-1"][0],
        } as BreakdownOperationProjection,
      ];
      return {
        operationId: command.operationId,
        outcome: "unknown",
      };
    });
    let resolveReconcile!: (value: {
      operationId: string;
      status: "applied";
      breakdown: null;
      candidate: null;
      scratch: null;
    }) => void;
    hookState.reconcileDeleteBreakdown.mockImplementation(
      (command) =>
        new Promise((resolve) => {
          hookState.operations = [
            {
              kind: "delete",
              operationId: command.operationId,
              scratchBitId: command.scratchBitId,
              breakdownId: command.breakdownId,
              phase: "reconciling",
            },
          ];
          resolveReconcile = resolve;
        }),
    );

    const view = render(<BreakdownPanel />);
    const sourceRow = screen.getByText("Still here").closest("[role=listitem]");
    fireEvent.click(
      within(sourceRow as HTMLElement).getByRole("button", { name: "Delete" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(hookState.deleteBreakdown).toHaveBeenCalledOnce());
    view.rerender(<BreakdownPanel />);
    expect(screen.getByText("Still here")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    const checkAgain = within(sourceRow as HTMLElement).getByRole("button", {
      name: "Check again",
    });
    await waitFor(() => expect(checkAgain).toHaveFocus());
    fireEvent.click(checkAgain);
    view.rerender(<BreakdownPanel />);
    expect(checkAgain).toHaveFocus();
    expect(checkAgain).toHaveAttribute("aria-disabled", "true");
    const originalCommand = hookState.deleteBreakdown.mock.calls[0][0];
    expect(hookState.reconcileDeleteBreakdown).toHaveBeenCalledWith(originalCommand);
    expect(hookState.deleteBreakdown).toHaveBeenCalledTimes(1);

    await act(async () => {
      hookState.operations = [];
      hookState.breakdownsByScratch["scratch-1"] = [
        createScratchBreakdown({ id: "row-2", content: "Focus next" }),
      ];
      resolveReconcile({
        operationId: originalCommand.operationId,
        status: "applied",
        breakdown: null,
        candidate: null,
        scratch: null,
      });
    });
    view.rerender(<BreakdownPanel />);

    expect(operationLockState.release).toHaveBeenCalledWith(
      originalCommand.operationId,
      "applied",
    );
    const nextRow = screen.getByText("Focus next").closest("[role=listitem]");
    await waitFor(() =>
      expect(
        within(nextRow as HTMLElement).getByRole("button", { name: "Delete" }),
      ).toHaveFocus(),
    );
  });

  it.each([
    ["pending", undefined, "Deleting…"],
    ["unknown", undefined, "We couldn’t confirm whether it was deleted."],
    ["reconciling", undefined, "Checking whether it was deleted…"],
    ["terminal", "not_applied", "Not deleted. This breakdown is still here."],
    ["terminal", "rejected", "Delete unavailable. This breakdown is still here."],
    ["terminal", "conflict", "This breakdown changed. Delete was not completed."],
  ] as const)(
    "retains the source row for Delete %s/%s without a retry or resend action",
    (phase, status, copy) => {
      triageStoreState.selectedScratchId = "scratch-1";
      hookState.breakdownsByScratch["scratch-1"] = [
        createScratchBreakdown({ id: "row-1", content: "Retained row" }),
      ];
      hookState.operations = [
        {
          kind: "delete",
          operationId: "delete-operation",
          scratchBitId: "scratch-1",
          breakdownId: "row-1",
          phase,
          ...(status === undefined ? {} : { status }),
        },
      ];

      render(<BreakdownPanel />);

      const row = screen.getByText("Retained row").closest("[role=listitem]");
      expect(row).toBeInTheDocument();
      expect(within(row as HTMLElement).getByText(copy)).toBeInTheDocument();
      expect(within(row as HTMLElement).queryByRole("button", { name: "Retry" })).toBeNull();
      expect(
        within(row as HTMLElement).queryByRole("button", { name: "Retry Delete" }),
      ).toBeNull();
      expect(
        within(row as HTMLElement).queryByRole("button", { name: "Delete again" }),
      ).toBeNull();
      if (phase === "unknown" || phase === "reconciling" || status !== undefined) {
        expect(
          within(row as HTMLElement).getByRole("button", { name: "Check again" }),
        ).toBeInTheDocument();
      }
    },
  );

  it("clears a terminal Delete reliability line when the retained row starts a new source interaction", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Review then edit" }),
    ];
    hookState.operations = [
      {
        kind: "delete",
        operationId: "delete-operation",
        scratchBitId: "scratch-1",
        breakdownId: "row-1",
        phase: "terminal",
        status: "not_applied",
      },
    ];

    render(<BreakdownPanel />);
    const row = screen.getByText("Review then edit").closest("[role=listitem]");
    expect(
      within(row as HTMLElement).getByText(
        "Not deleted. This breakdown is still here.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      within(row as HTMLElement).getByRole("button", { name: "Edit" }),
    );

    expect(
      screen.queryByText("Not deleted. This breakdown is still here."),
    ).toBeNull();
  });

  it("does not restore a terminal reliability line after leaving and returning to its Scratch", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.operations = [
      {
        kind: "add",
        operationId: "add-operation",
        scratchBitId: "scratch-1",
        breakdownId: "new-row",
        phase: "terminal",
        status: "rejected",
      },
    ];
    const view = render(<BreakdownPanel />);
    expect(
      screen.getByText("Add unavailable. Your draft is still here."),
    ).toBeInTheDocument();

    triageStoreState.selectedScratchId = "scratch-2";
    view.rerender(<BreakdownPanel />);
    triageStoreState.selectedScratchId = "scratch-1";
    view.rerender(<BreakdownPanel />);

    expect(
      screen.queryByText("Add unavailable. Your draft is still here."),
    ).toBeNull();
  });

  it("focuses the next visible row after confirmed Delete", async () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Delete first" }),
      createScratchBreakdown({ id: "row-2", content: "Focus next" }),
    ];

    const view = render(<BreakdownPanel />);
    const firstRow = screen.getByText("Delete first").closest("[role=listitem]");
    fireEvent.click(within(firstRow as HTMLElement).getByRole("button", { name: "Delete" }));
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Delete",
      }),
    );
    await waitFor(() => expect(hookState.deleteBreakdown).toHaveBeenCalledOnce());

    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-2", content: "Focus next" }),
    ];
    view.rerender(<BreakdownPanel />);

    const nextRow = screen.getByText("Focus next").closest("[role=listitem]");
    await waitFor(() => {
      expect(
        within(nextRow as HTMLElement).getByRole("button", { name: "Delete" }),
      ).toHaveFocus();
    });
  });

  it("focuses the previous visible row when confirmed Delete has no next row", async () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Focus previous" }),
      createScratchBreakdown({ id: "row-2", content: "Delete last" }),
    ];

    const view = render(<BreakdownPanel />);
    const lastRow = screen.getByText("Delete last").closest("[role=listitem]");
    fireEvent.click(within(lastRow as HTMLElement).getByRole("button", { name: "Delete" }));
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Delete",
      }),
    );
    await waitFor(() => expect(hookState.deleteBreakdown).toHaveBeenCalledOnce());

    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Focus previous" }),
    ];
    view.rerender(<BreakdownPanel />);

    const previousRow = screen
      .getByText("Focus previous")
      .closest("[role=listitem]");
    await waitFor(() => {
      expect(
        within(previousRow as HTMLElement).getByRole("button", {
          name: "Delete",
        }),
      ).toHaveFocus();
    });
  });

  it("focuses Add after confirmed Delete leaves an ordinary empty state", async () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Delete only" }),
    ];

    const view = render(<BreakdownPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Delete",
      }),
    );
    await waitFor(() => expect(hookState.deleteBreakdown).toHaveBeenCalledOnce());

    hookState.breakdownsByScratch["scratch-1"] = [];
    view.rerender(<BreakdownPanel />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add a note..." })).toHaveFocus();
    });
  });

  it("focuses the overlay heading after confirmed Delete creates completion", async () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Delete final active" }),
    ];

    const completion = {
      presentation: "working" as "working" | "overlay" | "complete",
      cancel: vi.fn(),
      reopen: vi.fn(),
    };
    const view = render(<BreakdownPanel completion={completion} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Delete",
      }),
    );
    await waitFor(() => expect(hookState.deleteBreakdown).toHaveBeenCalledOnce());

    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({
        id: "consumed-row",
        content: "Already processed",
        consumedAt: currentTime,
      }),
    ];
    view.rerender(<BreakdownPanel completion={completion} />);

    (document.activeElement as HTMLElement).blur();
    completion.presentation = "overlay";
    view.rerender(<BreakdownPanel completion={completion} />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Scratch complete" }),
      ).toHaveFocus();
    });
  });

  it("does not delete when cancelling the confirmation dialog", async () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Keep me" }),
    ];

    render(<BreakdownPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(hookState.deleteBreakdown).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  it("updates the breakdown list when the selected Scratch changes", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Scratch one note" }),
    ];
    hookState.breakdownsByScratch["scratch-2"] = [
      createScratchBreakdown({
        id: "row-2",
        scratchBitId: "scratch-2",
        content: "Scratch two note",
      }),
    ];

    const { rerender } = render(<BreakdownPanel />);

    expect(screen.getByText("Scratch one note")).toBeInTheDocument();

    triageStoreState.selectedScratchId = "scratch-2";
    rerender(<BreakdownPanel />);

    expect(screen.queryByText("Scratch one note")).not.toBeInTheDocument();
    expect(screen.getByText("Scratch two note")).toBeInTheDocument();
  });

  it("renders the grip as a visual-only non-draggable handle", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Has grip" }),
    ];

    render(<BreakdownPanel />);

    const grip = screen.getByTestId("breakdown-grip");
    expect(grip).toHaveAttribute("aria-hidden", "true");
    expect(grip).not.toHaveAttribute("draggable");
    expect(grip).not.toHaveAttribute("ondragstart");
    expect(grip).not.toHaveAttribute("ondragend");
    expect(grip).not.toHaveAttribute("data-dnd-kit");
  });

  it("de-emphasises a breakdown row whose id matches a staged candidate sourceBreakdownId", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    triageStoreState.stagedCandidates = {
      "scratch-1": [
        {
          id: "candidate-1",
          type: "node",
          sourceBreakdownId: "row-1",
          label: "Staged note",
        },
      ],
    };
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Staged note" }),
    ];

    render(<BreakdownPanel />);

    const text = screen.getByText("Staged note");
    const row = text.closest(".group");
    const grip = within(row as HTMLElement).getByTestId("breakdown-grip");

    expect(row).toHaveClass("opacity-50", "transition-opacity", "duration-200");
    expect(text).toHaveClass("text-muted-foreground");
    expect(grip).toHaveClass("text-muted-foreground/20");
  });

  it("does not retain a consumed row in the active Breakdown list", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({
        id: "row-1",
        content: "Consumed note",
        consumedAt: currentTime,
      }),
    ];

    render(<BreakdownPanel />);

    expect(screen.queryByText("Consumed note")).not.toBeInTheDocument();
    expect(screen.getByTestId("breakdown-empty-state")).toHaveAttribute(
      "data-triage-state",
      "consumed-completion",
    );
  });

  it("does not add line-through styling to a staged row", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    triageStoreState.stagedCandidates = {
      "scratch-1": [
        {
          id: "candidate-1",
          type: "bit",
          sourceBreakdownId: "row-1",
          label: "Staged note",
        },
      ],
    };
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Staged note" }),
    ];

    render(<BreakdownPanel />);

    const text = screen.getByText("Staged note");
    const row = text.closest(".group");

    expect(row).not.toHaveClass("line-through");
    expect(text).not.toHaveClass("line-through");
  });

  it("does not de-emphasise a non-staged row", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    triageStoreState.stagedCandidates = {
      "scratch-1": [
        {
          id: "candidate-1",
          type: "node",
          sourceBreakdownId: "row-2",
          label: "Other staged note",
        },
      ],
    };
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Active note" }),
    ];

    render(<BreakdownPanel />);

    const text = screen.getByText("Active note");
    const row = text.closest(".group");
    const grip = within(row as HTMLElement).getByTestId("breakdown-grip");

    expect(row).not.toHaveClass("opacity-50");
    expect(text).toHaveClass("text-foreground");
    expect(text).not.toHaveClass("text-muted-foreground");
    expect(grip).toHaveClass("text-muted-foreground/45");
  });

  it("clears the confirmation dialog on Escape without deleting", async () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Keep me" }),
    ];

    render(<BreakdownPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(hookState.deleteBreakdown).not.toHaveBeenCalled();
  });

  it("closes the confirmation dialog without deleting when the selected Scratch changes", async () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Keep me" }),
    ];

    const { rerender } = render(<BreakdownPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();

    triageStoreState.selectedScratchId = "scratch-2";
    rerender(<BreakdownPanel />);

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(hookState.deleteBreakdown).not.toHaveBeenCalled();
  });

  it("renders the selected Scratch Context with title and shared date", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    useInboxMock.mockReturnValue({
      activeScratchBits: [
        createBit({
          id: "scratch-1",
          title: "Inbox planning note",
          createdAt: new Date(2026, 5, 17, 11, 15, 0).getTime(),
        }),
      ],
    });

    render(<BreakdownPanel />);

    const strip = screen.getByLabelText("Selected Scratch: Inbox planning note");
    expect(strip).toBeInTheDocument();
    const title = within(strip).getByText("Inbox planning note");
    expect(title).toHaveClass("break-words", "whitespace-pre-wrap");
    expect(title).not.toHaveClass("truncate");
    expect(within(strip).getByText("45m ago")).toBeInTheDocument();
  });

  it("clicking the add-note placeholder does not collapse the Scratch Pool", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    triageStoreState.scratchPoolExpanded = true;
    triageStoreState.scratchPoolManualExpandedForId = null;

    render(<BreakdownPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));

    expect(triageStoreState.setScratchPoolExpanded).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText("Add a note...")).toHaveFocus();
  });

  it("focusing the add-note input does not collapse the Scratch Pool", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    triageStoreState.scratchPoolExpanded = true;

    render(<BreakdownPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));
    fireEvent.focus(screen.getByPlaceholderText("Add a note..."));

    expect(triageStoreState.setScratchPoolExpanded).not.toHaveBeenCalled();
  });

  it("pressing a printable key in the add-note input collapses the Scratch Pool when conditions are met", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    triageStoreState.scratchPoolExpanded = true;
    triageStoreState.scratchPoolManualExpandedForId = null;

    render(<BreakdownPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));
    const input = screen.getByPlaceholderText("Add a note...");
    fireEvent.keyDown(input, { key: "A" });

    expect(triageStoreState.setScratchPoolExpanded).toHaveBeenCalledWith(false);
  });

  it("pressing a modifier shortcut (metaKey+k) in the input does not collapse the Scratch Pool", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    triageStoreState.scratchPoolExpanded = true;
    triageStoreState.scratchPoolManualExpandedForId = null;

    render(<BreakdownPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));
    const input = screen.getByPlaceholderText("Add a note...");
    fireEvent.keyDown(input, { key: "k", metaKey: true });

    expect(triageStoreState.setScratchPoolExpanded).not.toHaveBeenCalled();
  });

  it("pressing Enter submits the breakdown and keeps the add-note input focused", async () => {
    triageStoreState.selectedScratchId = "scratch-1";

    render(<BreakdownPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));
    const input = screen.getByPlaceholderText("Add a note...");
    fireEvent.change(input, { target: { value: "Follow up" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(hookState.createBreakdown).toHaveBeenCalledWith(
        expect.objectContaining({ content: "Follow up" }),
      );
    });
    expect(screen.getByPlaceholderText("Add a note...")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Add a note...")).toHaveFocus();
    });
    expect(screen.getByPlaceholderText("Add a note...")).toHaveValue("");
  });

  it("typing does not collapse pool if the current Scratch was manually re-expanded", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    triageStoreState.scratchPoolExpanded = true;
    triageStoreState.scratchPoolManualExpandedForId = "scratch-1";

    render(<BreakdownPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));
    const input = screen.getByPlaceholderText("Add a note...");
    fireEvent.keyDown(input, { key: "A" });

    expect(triageStoreState.setScratchPoolExpanded).not.toHaveBeenCalled();
  });

  it("typing collapses pool when selected Scratch changed and manual expand was for a different Scratch", () => {
    triageStoreState.selectedScratchId = "scratch-2";
    triageStoreState.scratchPoolExpanded = true;
    triageStoreState.scratchPoolManualExpandedForId = "scratch-1";

    render(<BreakdownPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Add a note..." }));
    const input = screen.getByPlaceholderText("Add a note...");
    fireEvent.keyDown(input, { key: "A" });

    expect(triageStoreState.setScratchPoolExpanded).toHaveBeenCalledWith(false);
  });

  it("the drag grip button has the larger h-7 w-7 hit target and is the only drag activator", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Has grip" }),
    ];

    render(<BreakdownPanel />);

    const gripButton = screen.getByRole("button", { name: "Drag breakdown" });
    expect(gripButton).toHaveClass("h-7");
    expect(gripButton).toHaveClass("w-7");
    expect(gripButton).toHaveClass("rounded-md");
    expect(gripButton).toHaveClass("focus-visible:ring-2");
    expect(gripButton).toHaveClass("cursor-grab", "active:cursor-grabbing");
    expect(gripButton).not.toHaveClass("cursor-not-allowed");
    expect(gripButton).toHaveAttribute("data-triage-drag-source", "breakdown-grip");
    expect(gripButton).toHaveAttribute(
      "data-triage-staging-focus-source",
      "true",
    );
    expect(gripButton).toHaveAttribute("data-source-version", "1");

    const rowContainer = gripButton.closest(".group");
    expect(rowContainer).not.toHaveAttribute("aria-label", "Drag breakdown");
  });

  it("renders a standalone Context with common creation-date metadata, Edit, and Breakdown sort", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    useInboxMock.mockReturnValue({
      activeScratchBits: [
        createBit({
          id: "scratch-1",
          title: "Inbox planning note",
          createdAt: new Date(2026, 5, 17, 11, 15, 0).getTime(),
        }),
      ],
    });

    render(<BreakdownPanel />);

    const context = screen.getByTestId("selected-scratch-context");
    expect(context).toHaveAttribute(
      "data-triage-role",
      "context-signature-plate",
    );
    expect(context).toHaveClass("min-h-[104px]");
    expect(within(context).getByText("Selected Scratch")).toHaveAttribute(
      "data-triage-role",
      "context-eyebrow-meta",
    );
    expect(within(context).getByText("Inbox planning note")).toHaveAttribute(
      "data-triage-role",
      "context-title",
    );
    expect(within(context).getByText("45m ago")).toBeVisible();
    const contextEdit = within(context).getByRole("button", { name: "Edit" });
    expect(contextEdit).toBeVisible();
    expect(contextEdit).not.toHaveAttribute(
      "data-triage-role",
      "breakdown-row-action",
    );
    expect(
      within(context).getByRole("button", { name: "Sort: newest first" }),
    ).toBeVisible();
  });

  it("mounts the Context strip text as aria-hidden decoration and [X] as the Trash button (H10)", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    render(<BreakdownPanel />);
    const strip = screen.getByTestId("selected-scratch-context")
      .querySelector('[data-triage-role="context-title-strip"]');
    // Phase 34 asserted the whole strip aria-hidden with no button; H10 supersedes it.
    expect(strip).not.toHaveAttribute("aria-hidden");
    const info = strip?.querySelector('[data-triage-role="context-dialog-info"]');
    expect(info).toHaveAttribute("aria-hidden", "true");
    expect(info).toHaveTextContent("[ FOLDER DIALOG: INFO ]");
    const close = strip?.querySelector('[data-triage-role="context-decoration-close"]');
    expect(close).toHaveTextContent("[X]");
    expect(close?.tagName).toBe("BUTTON");
    expect(close).toHaveAttribute("aria-label", "Move selected Scratch to Trash");
    expect(close).toHaveAttribute("data-scratch-trash-entry", "context");
  });

  it("keeps icon-only Context Edit accessible and opens the same Scratch editor", () => {
    document.documentElement.dataset.colorTheme = "retro-mac";
    triageStoreState.selectedScratchId = "scratch-1";
    render(<div className="triage-shell"><BreakdownPanel /></div>);
    const context = screen.getByTestId("selected-scratch-context");
    const edit = within(context).getByRole("button", { name: "Edit" });
    expect(edit).toHaveAttribute("aria-label", "Edit");
    expect(edit.querySelector('[data-triage-role="context-edit-label"]')).toHaveTextContent("Edit");
    fireEvent.click(edit);
    expect(editorState.openScratchTitle).toHaveBeenCalledWith(expect.objectContaining({ id: "scratch-1" }));
  });

  it("names the next retro sort order and preserves operation-lock disabling", () => {
    document.documentElement.dataset.colorTheme = "retro-mac";
    triageStoreState.selectedScratchId = "scratch-1";
    const { rerender } = render(<div className="triage-shell"><BreakdownPanel /></div>);
    fireEvent.click(screen.getByRole("button", { name: "OLD FIRST" }));
    expect(useTriagePreferencesStore.getState().breakdownCreatedAtSort).toBe("ASC");
    fireEvent.click(screen.getByRole("button", { name: "NEW FIRST" }));
    expect(useTriagePreferencesStore.getState().breakdownCreatedAtSort).toBe("DESC");
    operationLockState.activeOperation = { kind: "add", operationId: "sort-lock" };
    rerender(<div className="triage-shell"><BreakdownPanel /></div>);
    const sort = screen.getByRole("button", { name: "OLD FIRST" });
    expect(sort).toBeDisabled();
    fireEvent.click(sort);
    expect(useTriagePreferencesStore.getState().breakdownCreatedAtSort).toBe("DESC");
  });

  it("toggles stable Breakdown created-at ordering without row time labels", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "older", content: "Older", createdAt: 10 }),
      createScratchBreakdown({ id: "newer", content: "Newer", createdAt: 20 }),
    ];
    useScratchBreakdownsMock.mockImplementation(
      (_scratchBitId: string | null, sort: "ASC" | "DESC") => ({
        breakdowns: (hookState.breakdownsByScratch["scratch-1"] as ScratchBreakdown[])
          .toSorted((left, right) =>
            sort === "ASC"
              ? left.createdAt - right.createdAt
              : right.createdAt - left.createdAt,
          ),
        consumedBreakdownCount: 0,
        hasObservedBreakdownHistory: true,
        isArchiveEligible: false,
        operations: [],
        editor: editorState,
        addBreakdown: hookState.createBreakdown,
        reconcileAddBreakdown: vi.fn(),
        deleteBreakdown: hookState.deleteBreakdown,
        reconcileDeleteBreakdown: vi.fn(),
      }),
    );

    render(<BreakdownPanel />);

    expect(screen.getAllByTestId("breakdown-row").map((row) => row.textContent)).toEqual([
      "Newer",
      "Older",
    ]);
    expect(screen.queryByText("45m ago")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sort: newest first" }));

    expect(screen.getAllByTestId("breakdown-row").map((row) => row.textContent)).toEqual([
      "Older",
      "Newer",
    ]);
  });

  it("keeps staged rows visible, non-struck, and interaction-disabled from Task 131 truth", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    triageStoreState.stagedCandidates = {
      "scratch-1": [
        {
          id: "candidate-1",
          type: "node",
          sourceBreakdownId: "row-1",
          label: "Staged note",
        },
      ],
    };
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Staged note" }),
    ];

    render(<BreakdownPanel />);

    const row = screen.getByTestId("breakdown-row");
    expect(row).toHaveAttribute("data-triage-state", "staged");
    expect(within(row).getByText("Staged note")).not.toHaveClass("line-through");
    const gripButton = within(row).getByRole("button", {
      name: "Drag breakdown",
    });
    expect(gripButton).toBeDisabled();
    expect(gripButton).toHaveClass("cursor-not-allowed");
    expect(gripButton).not.toHaveClass("cursor-grab", "active:cursor-grabbing");
    expect(within(row).getByRole("button", { name: "Edit" })).toBeDisabled();
    expect(within(row).getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  it("removes consumed rows and shows completion only with consumed history and no staged candidate", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "consumed", content: "Done", consumedAt: 30 }),
    ];

    render(<BreakdownPanel />);

    expect(screen.queryByText("Done")).not.toBeInTheDocument();
    expect(screen.getByTestId("breakdown-empty-state")).toHaveAttribute(
      "data-triage-state",
      "consumed-completion",
    );
    expect(screen.getByText("All items processed")).toBeVisible();
  });

  it("does not imply completion for never-used or observed all-deleted empty states", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    useScratchBreakdownsMock.mockReturnValue({
      breakdowns: [],
      consumedBreakdownCount: 0,
      hasObservedBreakdownHistory: false,
      isArchiveEligible: false,
      operations: [],
      editor: editorState,
      addBreakdown: hookState.createBreakdown,
      reconcileAddBreakdown: vi.fn(),
      deleteBreakdown: hookState.deleteBreakdown,
      reconcileDeleteBreakdown: vi.fn(),
    });
    const { rerender } = render(<BreakdownPanel />);

    expect(screen.getByTestId("breakdown-empty-state")).toHaveAttribute(
      "data-triage-state",
      "never-used",
    );
    expect(screen.queryByText("All items processed")).not.toBeInTheDocument();

    useScratchBreakdownsMock.mockReturnValue({
      breakdowns: [],
      consumedBreakdownCount: 0,
      hasObservedBreakdownHistory: true,
      isArchiveEligible: false,
      operations: [],
      editor: editorState,
      addBreakdown: hookState.createBreakdown,
      reconcileAddBreakdown: vi.fn(),
      deleteBreakdown: hookState.deleteBreakdown,
      reconcileDeleteBreakdown: vi.fn(),
    });
    rerender(<BreakdownPanel />);

    expect(screen.getByTestId("breakdown-empty-state")).toHaveAttribute(
      "data-triage-state",
      "all-deleted",
    );
    expect(screen.queryByText("All items processed")).not.toBeInTheDocument();
  });

  it("fails completion closed for a missing selected Scratch or delayed eligibility", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    useInboxMock.mockReturnValue({ activeScratchBits: [] });
    useScratchBreakdownsMock.mockReturnValue({
      breakdowns: [],
      consumedBreakdownCount: 1,
      hasObservedBreakdownHistory: true,
      isArchiveEligible: true,
      operations: [],
      editor: editorState,
      addBreakdown: hookState.createBreakdown,
      reconcileAddBreakdown: vi.fn(),
      deleteBreakdown: hookState.deleteBreakdown,
      reconcileDeleteBreakdown: vi.fn(),
    });

    const { rerender } = render(<BreakdownPanel />);
    expect(screen.queryByText("All items processed")).not.toBeInTheDocument();

    useInboxMock.mockReturnValue({
      activeScratchBits: [createBit({ id: "scratch-1" })],
    });
    useScratchBreakdownsMock.mockReturnValue({
      breakdowns: [],
      consumedBreakdownCount: 1,
      hasObservedBreakdownHistory: true,
      isArchiveEligible: false,
      operations: [],
      editor: editorState,
      addBreakdown: hookState.createBreakdown,
      reconcileAddBreakdown: vi.fn(),
      deleteBreakdown: hookState.deleteBreakdown,
      reconcileDeleteBreakdown: vi.fn(),
    });
    rerender(<BreakdownPanel />);

    expect(screen.getByTestId("breakdown-empty-state")).toHaveAttribute(
      "data-triage-state",
      "ordinary",
    );
    expect(screen.queryByText("All items processed")).not.toBeInTheDocument();
  });
});


describe("Task167 shared Context/Breakdown presentation", () => {
  it.each(["griddo", "tiny-desk", "neumorphism", "claymorphism", "origami", "terminal", "retro-mac", "graphite"])("retains source slots, grip-only activation and canonical actions in %s", (theme) => {
    document.documentElement.dataset.colorTheme = theme;
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [createScratchBreakdown({ id: "row-1", content: "Arrange workshop materials" })];
    const view = render(<BreakdownPanel />);
    const context = screen.getByTestId("selected-scratch-context");
    expect(context.querySelector('[data-triage-role="context-title-strip"] [data-triage-role="context-dialog-info"]')).toHaveAttribute("aria-hidden", "true");
    expect(context.querySelector('[data-triage-role="context-identity-object"]')).toHaveAttribute("aria-hidden", "true");
    expect(context.querySelector('[data-triage-role="context-timestamp"]')).toBeVisible();
    fireEvent.click(within(context).getByRole("button", { name: "Edit" }));
    expect(editorState.openScratchTitle).toHaveBeenCalledOnce();
    expect(editorState.openScratchTitle).toHaveBeenCalledWith(expect.objectContaining({ id: "scratch-1" }));
    const row = screen.getByTestId("breakdown-row");
    expect(within(row).getByRole("button", { name: "Drag breakdown" })).toHaveAttribute("data-triage-role", "breakdown-grip-control");
    expect(row).not.toHaveAttribute("draggable");
    fireEvent.click(within(row).getByRole("button", { name: "Edit" }));
    expect(editorState.openBreakdown).toHaveBeenCalled();
    document.documentElement.dataset.colorTheme = "graphite";
    view.rerender(<BreakdownPanel />);
    expect(screen.getByTestId("selected-scratch-context")).toBe(context);
    expect(context.querySelectorAll('[data-triage-role="context-title-strip"]')).toHaveLength(1);
    document.documentElement.removeAttribute("data-color-theme");
  });

  it("keeps the same Context, protected draft and focus through a live theme change", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    editorState.snapshot = { target: { kind: "scratch-title", id: "scratch-1" }, phase: "dirty",
      base: { value: "Scratch", version: 1 }, draft: "Preserve this draft", latest: null,
      copyableDraft: null, pendingIntent: false, focusIntent: "field", command: null };
    document.documentElement.dataset.colorTheme = "retro-mac";
    const view = render(<BreakdownPanel />);
    const context = screen.getByTestId("selected-scratch-context");
    const field = screen.getByRole("textbox", { name: "Scratch title" });
    field.focus();
    document.documentElement.dataset.colorTheme = "griddo";
    view.rerender(<BreakdownPanel />);
    expect(screen.getByTestId("selected-scratch-context")).toBe(context);
    expect(screen.getByRole("textbox", { name: "Scratch title" })).toBe(field);
    expect(field).toHaveValue("Preserve this draft");
    expect(field).toHaveFocus();
    expect(field).toHaveAttribute("maxlength", "60");
    expect(within(context).getByRole("button", { name: "Save" })).toBeEnabled();
    expect(within(context).getByRole("button", { name: "Cancel" })).toBeEnabled();
    document.documentElement.removeAttribute("data-color-theme");
  });
});

describe("shared Context creation-date metadata", () => {
  it("keeps the same createdAt date in view and every mounted editor state", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    useInboxMock.mockReturnValue({ activeScratchBits: [createBit({ id: "scratch-1", title: "Original title", createdAt: new Date(2026, 4, 4).getTime(), mtime: currentTime })] });
    const view = render(<BreakdownPanel />);
    const assertStamp = () => {
      const context = screen.getByTestId("selected-scratch-context");
      expect(context.querySelector('[data-triage-role="context-timestamp-value"]')).toHaveTextContent("4/05/26");
      const prefix = context.querySelector('[data-triage-role="context-timestamp-prefix"]');
      expect(prefix).toHaveTextContent("LAST_STAMP:");
      expect(prefix).toHaveAttribute("aria-hidden", "true");
      expect(prefix).not.toHaveAttribute("tabindex");
    };
    assertStamp();
    for (const phase of ["pristine", "dirty", "saving", "reconciling", "offline", "not_applied", "conflict", "invalidated"] as const) {
      editorState.snapshot = { target: { kind: "scratch-title", id: "scratch-1" }, phase, base: { value: "Original title", version: 1 }, draft: "Retained draft", latest: phase === "conflict" ? { value: "Remote title", version: 2 } : null, copyableDraft: null, pendingIntent: false, focusIntent: "field", command: null };
      view.rerender(<BreakdownPanel />); assertStamp();
    }
  });
});

describe("Task 210 Scratch Trash entry on the Context strip", () => {
  function renderWithTrash(
    reason: TrashScratchDisabledReason | null = null,
    registerOwner?: (owner: TrashDraftOwner) => () => void,
  ) {
    const request = vi.fn();
    const entries: TrashScratchEntries = {
      disabledReason: () => reason,
      request,
    };
    const view = render(
      <TrashScratchEntriesContext.Provider value={entries}>
        <TrashDraftRegistryContext.Provider value={registerOwner ?? null}>
          <BreakdownPanel />
        </TrashDraftRegistryContext.Provider>
      </TrashScratchEntriesContext.Provider>,
    );
    return { ...view, request };
  }

  it("requests Trash for the selected Scratch with the button as opener", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    const { request } = renderWithTrash();
    const close = screen.getByRole("button", { name: "Move selected Scratch to Trash" });
    expect(close).toBeEnabled();
    fireEvent.click(close);
    expect(request).toHaveBeenCalledWith("scratch-1", close);
  });

  it.each([
    ["placement-open", "Finish or cancel placement to move a Scratch to Trash."],
    [
      "unresolved-source",
      "A staged item in this Scratch lost its source. Resolve it in Staging first.",
    ],
    ["operation-pending", "Wait for the current action to finish."],
  ] as const)("is disabled for %s and exposes the reason", (reason, copy) => {
    triageStoreState.selectedScratchId = "scratch-1";
    const { request } = renderWithTrash(reason);
    const close = screen.getByRole("button", { name: "Move selected Scratch to Trash" });
    expect(close).toBeDisabled();
    expect(close).toHaveAttribute("title", copy);
    expect(close).toHaveAccessibleDescription(copy);
    fireEvent.click(close);
    expect(request).not.toHaveBeenCalled();
  });

  it("is disabled while the VQ-03 departure sheet makes the Breakdown inert", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    departureState.pendingDestination = { id: "scratch-2", kind: "scratch" };
    renderWithTrash();
    expect(
      screen.getByRole("button", { name: "Move selected Scratch to Trash" }),
    ).toBeDisabled();
    departureState.pendingDestination = null;
  });

  it("is disabled without a Trash coordinator", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    render(<BreakdownPanel />);
    expect(
      screen.getByRole("button", { name: "Move selected Scratch to Trash" }),
    ).toBeDisabled();
  });

  it("keeps a dirty Scratch-title editor unsaved when a Trash entry takes focus (H17)", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    editorState.snapshot = {
      target: { kind: "scratch-title", id: "scratch-1" },
      phase: "dirty",
      base: { value: "Scratch", version: 1 },
      draft: "Dirty title",
      latest: null,
      copyableDraft: null,
      pendingIntent: false,
      focusIntent: "field-end",
      command: null,
    };
    renderWithTrash();
    const field = screen.getByRole("textbox", { name: "Scratch title" });

    const poolTrash = document.createElement("button");
    poolTrash.setAttribute("data-scratch-trash-entry", "pool");
    document.body.append(poolTrash);
    fireEvent.blur(field, { relatedTarget: poolTrash });
    expect(editorState.save).not.toHaveBeenCalled();
    poolTrash.remove();

    const other = document.createElement("button");
    document.body.append(other);
    fireEvent.blur(field, { relatedTarget: other });
    expect(editorState.save).toHaveBeenCalledTimes(1);
    other.remove();
  });

  it("keeps a dirty row editor unsaved when a Trash entry takes focus (H17)", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Row content" }),
    ];
    editorState.snapshot = {
      target: { kind: "breakdown", id: "row-1" },
      phase: "dirty",
      base: { value: "Row content", version: 1 },
      draft: "Dirty row",
      latest: null,
      copyableDraft: null,
      pendingIntent: false,
      focusIntent: "field-end",
      command: null,
    };
    renderWithTrash();
    const field = screen.getByRole("textbox", { name: "Breakdown content" });
    const poolTrash = document.createElement("button");
    poolTrash.setAttribute("data-scratch-trash-entry", "pool");
    document.body.append(poolTrash);
    fireEvent.blur(field, { relatedTarget: poolTrash });
    expect(editorState.save).not.toHaveBeenCalled();
    poolTrash.remove();
  });

  it("registers a draft owner: any open editor counts, and discard cancels it and clears the Add draft", () => {
    triageStoreState.selectedScratchId = "scratch-1";
    let owner: TrashDraftOwner | null = null;
    const unregister = vi.fn();
    const register = vi.fn((next: TrashDraftOwner) => {
      owner = next;
      return unregister;
    });
    const view = renderWithTrash(null, register);
    expect(owner).not.toBeNull();
    expect(owner!.hasDiscardableWork()).toBe(false);

    editorState.snapshot = {
      target: { kind: "scratch-title", id: "scratch-1" },
      phase: "pristine",
      base: { value: "Scratch", version: 1 },
      draft: "Scratch",
      latest: null,
      copyableDraft: null,
      pendingIntent: false,
      focusIntent: "field-end",
      command: null,
    };
    view.rerender(
      <TrashScratchEntriesContext.Provider
        value={{ disabledReason: () => null, request: vi.fn() }}
      >
        <TrashDraftRegistryContext.Provider value={register}>
          <BreakdownPanel />
        </TrashDraftRegistryContext.Provider>
      </TrashScratchEntriesContext.Provider>,
    );
    expect(owner!.hasDiscardableWork()).toBe(true);

    owner!.discard();
    expect(editorState.cancel).toHaveBeenCalled();
    expect(departureState.setAddDraft).toHaveBeenCalledWith("");
    view.unmount();
    expect(unregister).toHaveBeenCalled();
  });

  it("gives the row Delete dialog and its overlay the Retro Mac theming hooks", async () => {
    triageStoreState.selectedScratchId = "scratch-1";
    hookState.breakdownsByScratch["scratch-1"] = [
      createScratchBreakdown({ id: "row-1", content: "Delete me" }),
    ];
    render(<BreakdownPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveClass("breakdown-delete-dialog");
    expect(
      document.querySelector('[data-slot="alert-dialog-overlay"]'),
    ).toHaveClass("breakdown-delete-dialog-overlay");
  });
});
