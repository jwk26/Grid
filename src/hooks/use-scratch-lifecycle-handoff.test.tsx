import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Bit } from "@/lib/db/schema";
import { useTriagePreferencesStore } from "@/stores/triage-preferences-store";
import { useTriageStore } from "@/stores/triage-store";
import { useScratchLifecycleHandoff } from "./use-scratch-lifecycle-handoff";

function scratch(id: string, title: string, createdAt: number): Bit {
  return {
    id,
    title,
    description: "",
    icon: "sparkles",
    deadline: null,
    deadlineAllDay: false,
    priority: null,
    status: "active",
    mtime: 1,
    createdAt,
    parentId: "inbox",
    x: 0,
    y: 0,
    deletedAt: null,
    archivedAt: null,
    version: 1,
    pastDeadlineDismissed: false,
  };
}

beforeEach(() => {
  useTriagePreferencesStore.setState({ poolCreatedAtSort: "DESC" });
  useTriageStore.setState({
    selectedScratchId: "selected",
    scratchPoolQuery: "",
    scratchPoolActiveIds: [],
    scratchPoolResultIds: [],
    externalScratchRemoval: null,
    ownTrashMarkers: {},
  });
});

function setup(projected: Bit[], source?: Bit) {
  const readTerminalSnapshot = vi.fn().mockResolvedValue({
    projectedActiveScratchBits: projected,
    source,
  });
  return {
    readTerminalSnapshot,
    ...renderHook(() =>
      useScratchLifecycleHandoff({ inboxNodeId: "inbox", readTerminalSnapshot }),
    ),
  };
}

describe("useScratchLifecycleHandoff", () => {
  const newer = scratch("newer", "Alpha", 300);
  const selected = scratch("selected", "Beta", 200);
  const older = scratch("older", "Gamma", 100);

  it("hands off to the next visible Scratch, then the previous visible one", async () => {
    const first = setup([newer, selected, older], { ...selected, deletedAt: 5 });
    await expect(
      first.result.current("selected", { scratch: selected }),
    ).resolves.toEqual({ id: "older", kind: "scratch" });
    expect(useTriageStore.getState().selectedScratchId).toBe("older");

    useTriageStore.setState({ selectedScratchId: "older" });
    const last = setup([newer, older], { ...older, deletedAt: 5 });
    await expect(
      last.result.current("older", { scratch: older }),
    ).resolves.toEqual({ id: "newer", kind: "scratch" });
  });

  it("distinguishes filtered-empty from true Inbox empty and never selects a hidden Scratch", async () => {
    useTriageStore.setState({ scratchPoolQuery: "zzz" });
    const filtered = setup([selected, newer], selected);
    await expect(
      filtered.result.current("selected", { scratch: selected }),
    ).resolves.toEqual({ id: null, kind: "search-empty" });

    useTriageStore.setState({ selectedScratchId: "selected", scratchPoolQuery: "" });
    const empty = setup([selected], selected);
    await expect(
      empty.result.current("selected", { scratch: selected }),
    ).resolves.toEqual({ id: null, kind: "inbox-empty" });
  });

  it("falls back to the store's current Pool order when the terminal read fails", async () => {
    useTriageStore.setState({
      scratchPoolActiveIds: ["newer", "selected", "older"],
      scratchPoolResultIds: ["newer", "selected", "older"],
    });
    const readTerminalSnapshot = vi.fn().mockRejectedValue(new Error("read failed"));
    const { result } = renderHook(() =>
      useScratchLifecycleHandoff({ inboxNodeId: "inbox", readTerminalSnapshot }),
    );
    await expect(
      result.current("selected", { scratch: selected }),
    ).resolves.toEqual({ id: "older", kind: "scratch" });
  });

  it("reports the destination through onBeforeDestination before the selection changes (A2)", async () => {
    const seenSelection: Array<string | null> = [];
    const onBeforeDestination = vi.fn(() => {
      seenSelection.push(useTriageStore.getState().selectedScratchId);
    });
    const readTerminalSnapshot = vi.fn().mockResolvedValue({
      projectedActiveScratchBits: [newer, selected, older],
      source: selected,
    });
    const { result } = renderHook(() =>
      useScratchLifecycleHandoff({
        inboxNodeId: "inbox",
        onBeforeDestination,
        readTerminalSnapshot,
      }),
    );
    await expect(
      result.current("selected", { scratch: selected }),
    ).resolves.toEqual({ id: "older", kind: "scratch" });
    expect(onBeforeDestination).toHaveBeenCalledWith({ id: "older", kind: "scratch" });
    expect(seenSelection).toEqual(["selected"]);
    expect(useTriageStore.getState().selectedScratchId).toBe("older");
  });

  it("also reports the destination before the selection changes on the fallback path", async () => {
    useTriageStore.setState({
      scratchPoolActiveIds: ["newer", "selected", "older"],
      scratchPoolResultIds: ["newer", "selected", "older"],
    });
    const seenSelection: Array<string | null> = [];
    const onBeforeDestination = vi.fn(() => {
      seenSelection.push(useTriageStore.getState().selectedScratchId);
    });
    const readTerminalSnapshot = vi.fn().mockRejectedValue(new Error("read failed"));
    const { result } = renderHook(() =>
      useScratchLifecycleHandoff({
        inboxNodeId: "inbox",
        onBeforeDestination,
        readTerminalSnapshot,
      }),
    );
    await result.current("selected", { scratch: selected });
    expect(onBeforeDestination).toHaveBeenCalledWith({ id: "older", kind: "scratch" });
    expect(seenSelection).toEqual(["selected"]);
  });
});
