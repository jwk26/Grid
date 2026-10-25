import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { StateSwitchPanel } from "@/components/dev/state-switch-panel";
import { DISPLAY_DELAY_MS } from "@/lib/constants";
import { STATE_SWITCH_MARKER, useStateSwitchStore } from "@/lib/dev/state-switch";
import {
  clearForcedItemStates,
  forcedItemKeys,
  useForcedItemStatus,
} from "@/lib/feedback/forced-item-status";
import { useTriageStore } from "@/stores/triage-store";

const useScratchBreakdownsMock = vi.hoisted(() => vi.fn());
const useStagedCandidatesMock = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-scratch-breakdowns", () => ({
  useScratchBreakdowns: useScratchBreakdownsMock,
}));
vi.mock("@/hooks/use-staged-candidates", () => ({
  useStagedCandidates: useStagedCandidatesMock,
}));

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

beforeEach(() => {
  useStateSwitchStore.getState().reset();
  useTriageStore.setState({ selectedScratchId: "scratch-1" });
  useScratchBreakdownsMock.mockReturnValue({
    breakdowns: [{ id: "row-1", content: "Write the draft" }],
  });
  useStagedCandidatesMock.mockReturnValue({
    candidates: [
      { id: "cand-1", resultType: "node", content: "Plan the launch" },
    ],
  });
});

afterEach(() => {
  cleanup();
  clearForcedItemStates();
  vi.useRealTimers();
});

function openPanel() {
  render(<StateSwitchPanel />);
  fireEvent.click(screen.getByRole("button", { name: "State switch" }));
  return screen.getByRole("region", { name: "State switch (development)" });
}

describe("StateSwitchPanel", () => {
  it("is collapsed to one button and carries the dev-only marker", () => {
    const { container } = render(<StateSwitchPanel />);
    expect(screen.getByRole("button", { name: "State switch" })).toBeInTheDocument();
    expect(screen.queryByRole("region")).toBeNull();
    expect(container.querySelector(`[data-state-switch="${STATE_SWITCH_MARKER}"]`)).not.toBeNull();
  });

  it("shows every primitive in every state", () => {
    vi.useFakeTimers();
    const panel = openPanel();
    const rowOf = (state: string) =>
      panel.querySelector(`[data-state-switch-row="${state}"]`) as HTMLElement;

    expect(within(rowOf("unknown")).getByRole("img")).toHaveTextContent("?");
    for (const state of ["not-applied", "rejected", "conflict", "integrity"]) {
      expect(within(rowOf(state)).getByRole("img")).toHaveTextContent("!");
      expect(rowOf(state)).toHaveAttribute("data-status-emphasis");
    }
    expect(rowOf("unknown")).toHaveAttribute("data-status-emphasis");

    // Delayed pending shows nothing until the display delay, then the loader.
    expect(within(rowOf("delayed-pending")).queryByRole("img")).toBeNull();
    // Reconciling keeps ? with emphasis, then the loader without it.
    expect(within(rowOf("reconciling")).getByRole("img")).toHaveAttribute("data-glyph", "question");
    act(() => {
      vi.advanceTimersByTime(DISPLAY_DELAY_MS);
    });
    expect(within(rowOf("delayed-pending")).getByRole("img")).toHaveAttribute("data-glyph", "loader");
    expect(within(rowOf("reconciling")).getByRole("img")).toHaveAttribute("data-glyph", "loader");
    expect(rowOf("reconciling")).not.toHaveAttribute("data-status-emphasis");

    // Integrity uses the candidate integrity sentence, not an Add sentence.
    expect(within(rowOf("integrity")).getByRole("img")).toHaveAccessibleName(
      "Checking a staged Node source…",
    );

    // Editor offline has no item status.
    expect(within(rowOf("editor-offline")).queryByRole("img")).toBeNull();
  });

  it("lists the add field, editors, rows and staged candidates of the selected Scratch", () => {
    const panel = openPanel();
    for (const key of [
      forcedItemKeys.add("scratch-1"),
      forcedItemKeys.scratchTitleEditor("scratch-1"),
      forcedItemKeys.breakdown("row-1"),
      forcedItemKeys.breakdownEditor("row-1"),
      forcedItemKeys.candidate("cand-1"),
    ]) {
      expect(panel.querySelector(`[data-state-switch-item="${key}"]`), key).not.toBeNull();
    }
  });

  it("says so when no Scratch is selected", () => {
    useTriageStore.setState({ selectedScratchId: null });
    const panel = openPanel();
    expect(within(panel).getByText(/No Scratch is selected/)).toBeInTheDocument();
  });

  it("forces a state on an item, shows its sentence, and publishes it to the seam", () => {
    const panel = openPanel();
    const { result } = renderHook(() =>
      useForcedItemStatus(forcedItemKeys.add("scratch-1")),
    );
    expect(result.current).toBeNull();

    const item = panel.querySelector(
      `[data-state-switch-item="${forcedItemKeys.add("scratch-1")}"]`,
    ) as HTMLElement;
    fireEvent.change(within(item).getByRole("combobox"), { target: { value: "unknown" } });

    expect(result.current).toEqual({ state: "unknown", status: "unknown" });
    expect(within(item).getByRole("img", { name: "We couldn’t confirm whether it was added." })).toHaveTextContent("?");

    fireEvent.change(within(item).getByRole("combobox"), { target: { value: "" } });
    expect(result.current).toBeNull();
  });

  it("offers each item kind only the states that have copy for it", () => {
    const panel = openPanel();
    const optionsOf = (key: string) =>
      Array.from(
        (panel.querySelector(`[data-state-switch-item="${key}"] select`) as HTMLSelectElement)
          .options,
      ).map((option) => option.value);

    expect(optionsOf(forcedItemKeys.add("scratch-1"))).not.toContain("integrity");
    expect(optionsOf(forcedItemKeys.add("scratch-1"))).not.toContain("editor-offline");
    expect(optionsOf(forcedItemKeys.breakdownEditor("row-1"))).toEqual([
      "", "delayed-pending", "reconciling", "not-applied", "editor-offline",
    ]);
    expect(optionsOf(forcedItemKeys.candidate("cand-1"))).toContain("integrity");
  });

  it("clears the seam when it goes away", () => {
    const { unmount } = render(<StateSwitchPanel />);
    const { result } = renderHook(() =>
      useForcedItemStatus(forcedItemKeys.breakdown("row-1")),
    );
    act(() => useStateSwitchStore.getState().setForced(forcedItemKeys.breakdown("row-1"), "conflict"));
    expect(result.current?.state).toBe("conflict");

    unmount();
    expect(result.current).toBeNull();
  });

  it("queues, lists and removes a DataStore injection, offering only real outcomes", () => {
    const panel = openPanel();
    const outcome = within(panel).getByLabelText("Outcome") as HTMLSelectElement;
    const method = within(panel).getByLabelText("Command");

    // Add command: unknown (both variants), rejected, conflict; no not applied.
    const values = () => Array.from(outcome.options).map((option) => option.value);
    expect(values()).toContain("unknown-after-commit");
    expect(values()).not.toContain("not_applied");

    fireEvent.change(outcome, { target: { value: "unknown-after-commit" } });
    fireEvent.click(within(panel).getByRole("button", { name: "Queue" }));
    expect(useStateSwitchStore.getState().injections).toMatchObject([
      { method: "addBreakdown", outcome: "unknown-after-commit", remaining: 1 },
    ]);
    const queue = within(panel).getByRole("list", { name: "Queued injections" });
    expect(queue).toHaveTextContent("Add Breakdown · command · Unknown — answer lost, committed");

    // Switching to a Check again method drops an outcome it cannot return.
    fireEvent.change(method, { target: { value: "reconcileAddBreakdown" } });
    expect(values()).toContain("not_applied");
    expect(values()).not.toContain("unknown-after-commit");
    expect(outcome.value).toBe("real");

    fireEvent.click(within(panel).getByRole("button", { name: "Remove Add Breakdown injection" }));
    expect(useStateSwitchStore.getState().injections).toEqual([]);
    expect(within(panel).getByText("Nothing queued.")).toBeInTheDocument();
  });

  it("resets forced states and the queue", () => {
    const panel = openPanel();
    act(() => {
      useStateSwitchStore.getState().setForced(forcedItemKeys.add("scratch-1"), "rejected");
      useStateSwitchStore.getState().queueInjection({
        method: "addBreakdown", outcome: "conflict", delayMs: 0, count: 1,
      });
    });
    fireEvent.click(within(panel).getByRole("button", { name: "Reset all" }));
    expect(useStateSwitchStore.getState().forced).toEqual({});
    expect(useStateSwitchStore.getState().injections).toEqual([]);
  });
});
