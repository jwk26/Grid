import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTriageStore } from "@/stores/triage-store";

beforeEach(() => {
  useTriageStore.setState({
    selectedScratchId: null,
    scratchPoolExpanded: true,
    scratchPoolManualExpandedForId: null,
    scratchPoolQuery: "",
    scratchPoolResultIds: [],
    scratchPoolActiveIds: [],
    scratchPoolScroll: { anchorId: null, offset: 0 },
    explorerPathIds: [],
    explorerOpenColumnIds: [],
    explorerColumnScroll: {},
    explorerLocalPlacementIdentities: [],
    explorerRemoteArrivalIds: {},
    explorerPathStatus: null,
    externalScratchRemoval: null,
    ownTrashMarkers: {},
    triageWorkspaceMounted: false,
    requestedScratchSelectionId: null,
    scratchRevealId: null,
  });
});

afterEach(() => {
  useTriageStore.setState({
    selectedScratchId: null,
    scratchPoolExpanded: true,
    scratchPoolManualExpandedForId: null,
    scratchPoolQuery: "",
    scratchPoolResultIds: [],
    scratchPoolActiveIds: [],
    scratchPoolScroll: { anchorId: null, offset: 0 },
    explorerPathIds: [],
    explorerOpenColumnIds: [],
    explorerColumnScroll: {},
    explorerLocalPlacementIdentities: [],
    explorerRemoteArrivalIds: {},
    explorerPathStatus: null,
    externalScratchRemoval: null,
    ownTrashMarkers: {},
    triageWorkspaceMounted: false,
    requestedScratchSelectionId: null,
    scratchRevealId: null,
  });
});

describe("useTriageStore requested Scratch selection", () => {
  it("writes the one-shot request only while a workspace is mounted", () => {
    const store = useTriageStore.getState();
    store.requestScratchSelection("a");
    expect(useTriageStore.getState().requestedScratchSelectionId).toBeNull();

    store.setTriageWorkspaceMounted(true);
    store.requestScratchSelection("a");
    expect(useTriageStore.getState().requestedScratchSelectionId).toBe("a");

    store.clearRequestedScratchSelection();
    expect(useTriageStore.getState().requestedScratchSelectionId).toBeNull();
  });

  it("clears the request and the reveal when the workspace unmounts", () => {
    const store = useTriageStore.getState();
    store.setTriageWorkspaceMounted(true);
    store.requestScratchSelection("a");
    store.setScratchReveal("a");
    store.setTriageWorkspaceMounted(false);
    expect(useTriageStore.getState()).toMatchObject({
      triageWorkspaceMounted: false,
      requestedScratchSelectionId: null,
      scratchRevealId: null,
    });
  });

  it("keeps the request across a mount, unmount, mount cycle only if written after the last mount", () => {
    const store = useTriageStore.getState();
    store.setTriageWorkspaceMounted(true);
    store.setTriageWorkspaceMounted(false);
    store.setTriageWorkspaceMounted(true);
    store.requestScratchSelection("b");
    expect(useTriageStore.getState().requestedScratchSelectionId).toBe("b");
  });
});

describe("useTriageStore app-session ownership", () => {
  it("owns exactly the approved app-session state without candidate domain truth", () => {
    expect(Object.keys(useTriageStore.getState()).sort()).toEqual([
      "clearExplorerPathStatus",
      "clearExplorerRemoteArrivals",
      "clearExplorerRemotePresentation",
      "clearRequestedScratchSelection",
      "clearScratchReveal",
      "clearSelection",
      "explorerColumnScroll",
      "explorerLocalPlacementIdentities",
      "explorerOpenColumnIds",
      "explorerPathIds",
      "explorerPathStatus",
      "explorerRemoteArrivalIds",
      "externalScratchRemoval",
      "finishExternalScratchRemoval",
      "finishScratchArchive",
      "ownTrashMarkers",
      "reconcileExplorerContext",
      "reconcileScratchPoolContext",
      "recordExplorerRemoteArrivals",
      "registerExplorerLocalPlacement",
      "registerOwnTrash",
      "releaseOwnTrash",
      "removeExplorerRemoteArrival",
      "requestScratchSelection",
      "requestedScratchSelectionId",
      "scratchPoolActiveIds",
      "scratchPoolExpanded",
      "scratchPoolManualExpandedForId",
      "scratchPoolQuery",
      "scratchPoolResultIds",
      "scratchPoolScroll",
      "scratchRevealId",
      "selectScratch",
      "selectedScratchId",
      "setExplorerColumnScroll",
      "setExplorerOpenColumnIds",
      "setExplorerPathIds",
      "setExplorerPathStatus",
      "setExternalScratchRemovalLifecycle",
      "setScratchPoolExpanded",
      "setScratchPoolManualExpandedForId",
      "setScratchPoolQuery",
      "setScratchPoolResultIds",
      "setScratchPoolScroll",
      "setScratchReveal",
      "setTriageWorkspaceMounted",
      "triageWorkspaceMounted",
    ]);
  });

  it("owns exact typed per-column arrivals and one replaceable path status", () => {
    const store = useTriageStore.getState();
    store.recordExplorerRemoteArrivals("node-1", [
      { id: "shared", type: "node" },
      { id: "shared", type: "node" },
      { id: "shared", type: "bit" },
    ]);
    store.recordExplorerRemoteArrivals("node-2", [
      { id: "remote-3", type: "node" },
    ]);
    store.setExplorerPathStatus({
      kind: "archived",
      title: "Research",
      destination: "Projects",
      columnId: "node-1",
      fallbackPathIds: ["node-1"],
    });

    expect(useTriageStore.getState()).toMatchObject({
      explorerRemoteArrivalIds: {
        "node-1": [
          { id: "shared", type: "node" },
          { id: "shared", type: "bit" },
        ],
        "node-2": [{ id: "remote-3", type: "node" }],
      },
      explorerPathStatus: { kind: "archived", title: "Research" },
    });

    store.removeExplorerRemoteArrival({ id: "shared", type: "node" });
    store.clearExplorerRemoteArrivals("node-2");
    store.clearExplorerPathStatus();
    expect(useTriageStore.getState()).toMatchObject({
      explorerRemoteArrivalIds: {
        "node-1": [{ id: "shared", type: "bit" }],
      },
      explorerPathStatus: null,
    });
  });

  it("clears presentation on explicit path change and prunes only closed columns on authoritative fallback", () => {
    useTriageStore.setState({
      explorerPathIds: ["node-1", "node-2"],
      explorerOpenColumnIds: ["home", "node-1", "node-2"],
      explorerRemoteArrivalIds: {
        home: [{ id: "root-new", type: "node" }],
        "node-1": [{ id: "child-new", type: "node" }],
        "node-2": [{ id: "grandchild-new", type: "bit" }],
      },
      explorerPathStatus: {
        kind: "moved",
        title: "Moved",
        destination: "Node 1",
        columnId: "node-1",
        fallbackPathIds: ["node-1"],
      },
    });

    useTriageStore.getState().reconcileExplorerContext({
      validPathIds: ["node-1"],
      visibleItemIdsByColumn: { home: ["node-1"], "node-1": [] },
    });
    expect(useTriageStore.getState()).toMatchObject({
      explorerRemoteArrivalIds: {
        home: [{ id: "root-new", type: "node" }],
        "node-1": [{ id: "child-new", type: "node" }],
      },
      explorerPathStatus: { kind: "moved" },
    });

    useTriageStore.getState().setExplorerPathIds([]);
    expect(useTriageStore.getState()).toMatchObject({
      explorerRemoteArrivalIds: {},
      explorerPathStatus: null,
    });
  });

  it("holds an externally removed selection and computes next-visible then previous-visible", () => {
    useTriageStore.setState({
      selectedScratchId: "selected",
      scratchPoolResultIds: ["previous", "selected", "next"],
      scratchPoolActiveIds: ["previous", "selected", "next"],
      scratchPoolScroll: { anchorId: "selected", offset: 18 },
    });

    useTriageStore.getState().reconcileScratchPoolContext({
      activeIds: ["previous", "next"],
      visibleIds: ["previous", "next"],
    });

    expect(useTriageStore.getState()).toMatchObject({
      selectedScratchId: "selected",
      externalScratchRemoval: {
        scratchId: "selected",
        lifecycle: null,
        destinationId: "next",
        destinationKind: "scratch",
      },
    });

    useTriageStore.getState().reconcileScratchPoolContext({
      activeIds: ["previous"],
      visibleIds: ["previous"],
    });
    expect(useTriageStore.getState().externalScratchRemoval).toMatchObject({
      destinationId: "previous",
      destinationKind: "scratch",
    });
  });

  it("holds an own-Trash selection without creating an external removal, then hands off like Archive", () => {
    useTriageStore.setState({
      selectedScratchId: "selected",
      scratchPoolResultIds: ["previous", "selected", "next"],
      scratchPoolActiveIds: ["previous", "selected", "next"],
    });
    useTriageStore.getState().registerOwnTrash("selected", 4);

    useTriageStore.getState().reconcileScratchPoolContext({
      activeIds: ["previous", "next"],
      visibleIds: ["previous", "next"],
      ownTrashIds: ["selected"],
    });

    expect(useTriageStore.getState()).toMatchObject({
      selectedScratchId: "selected",
      externalScratchRemoval: null,
      // The held selection stays tracked at its position until handoff/release.
      scratchPoolActiveIds: ["previous", "selected", "next"],
    });

    expect(
      useTriageStore.getState().finishScratchArchive("selected", {
        activeIds: ["previous", "selected", "next"],
        visibleIds: ["previous", "selected", "next"],
      }),
    ).toEqual({ id: "next", kind: "scratch" });
    expect(useTriageStore.getState().externalScratchRemoval).toBeNull();
  });

  it("a released own-Trash marker reads as external removal against the tracked neighbours", () => {
    useTriageStore.setState({
      selectedScratchId: "selected",
      scratchPoolResultIds: ["previous", "selected", "next"],
      scratchPoolActiveIds: ["previous", "selected", "next"],
    });
    const store = useTriageStore.getState();
    store.reconcileScratchPoolContext({
      activeIds: ["previous", "next"],
      visibleIds: ["previous", "next"],
      ownTrashIds: ["selected"],
    });
    store.reconcileScratchPoolContext({
      activeIds: ["previous", "next"],
      visibleIds: ["previous", "next"],
      ownTrashIds: [],
    });

    expect(useTriageStore.getState()).toMatchObject({
      selectedScratchId: "selected",
      externalScratchRemoval: { scratchId: "selected", destinationId: "next" },
    });
  });

  it("still treats an inactive selection without an own-Trash id as external removal", () => {
    useTriageStore.setState({
      selectedScratchId: "selected",
      scratchPoolResultIds: ["selected", "next"],
      scratchPoolActiveIds: ["selected", "next"],
    });
    useTriageStore.getState().registerOwnTrash("other", 2);

    useTriageStore.getState().reconcileScratchPoolContext({
      activeIds: ["next"],
      visibleIds: ["next"],
      ownTrashIds: ["other"],
    });

    expect(useTriageStore.getState().externalScratchRemoval).toMatchObject({
      scratchId: "selected",
      destinationId: "next",
    });
  });

  it("tracks own-Trash markers by Scratch and version without persistence", () => {
    const store = useTriageStore.getState();
    store.registerOwnTrash("a", 3);
    store.registerOwnTrash("a", 3);
    store.registerOwnTrash("b", 5);
    expect(useTriageStore.getState().ownTrashMarkers).toEqual({
      a: { scratchId: "a", expectedVersion: 3 },
      b: { scratchId: "b", expectedVersion: 5 },
    });

    useTriageStore.getState().releaseOwnTrash("a");
    expect(useTriageStore.getState().ownTrashMarkers).toEqual({
      b: { scratchId: "b", expectedVersion: 5 },
    });
    useTriageStore.getState().releaseOwnTrash(undefined);
    expect(useTriageStore.getState().ownTrashMarkers).toEqual({});
  });

  it("finishes owned Archive with exact next-visible then previous-visible handoff while preserving Pool state", () => {
    useTriageStore.setState({
      selectedScratchId: "selected",
      scratchPoolQuery: "project",
      scratchPoolResultIds: ["previous", "selected", "next"],
      scratchPoolActiveIds: ["previous", "selected", "next"],
      scratchPoolScroll: { anchorId: "selected", offset: 18 },
    });

    expect(
      useTriageStore.getState().finishScratchArchive("selected", {
        activeIds: ["previous", "selected", "next"],
        visibleIds: ["previous", "selected", "next"],
      }),
    ).toEqual({ id: "next", kind: "scratch" });
    expect(useTriageStore.getState()).toMatchObject({
      selectedScratchId: "next",
      scratchPoolQuery: "project",
      scratchPoolScroll: { anchorId: "selected", offset: 18 },
      externalScratchRemoval: null,
    });

    useTriageStore.setState({ selectedScratchId: "selected" });
    expect(
      useTriageStore.getState().finishScratchArchive("selected", {
        activeIds: ["previous", "selected", "hidden-next"],
        visibleIds: ["previous"],
      }),
    ).toEqual({ id: "previous", kind: "scratch" });
    expect(useTriageStore.getState().selectedScratchId).toBe("previous");
  });

  it("never selects a hidden Scratch and distinguishes filtered-null from true empty", () => {
    useTriageStore.setState({
      selectedScratchId: "selected",
      scratchPoolQuery: "no match",
    });
    expect(
      useTriageStore.getState().finishScratchArchive("selected", {
        activeIds: ["selected", "hidden"],
        visibleIds: [],
      }),
    ).toEqual({ id: null, kind: "search-empty" });
    expect(useTriageStore.getState()).toMatchObject({
      selectedScratchId: null,
      scratchPoolQuery: "no match",
    });

    useTriageStore.setState({
      selectedScratchId: "selected",
      scratchPoolQuery: "still filtered",
    });
    expect(
      useTriageStore.getState().finishScratchArchive("selected", {
        activeIds: ["selected"],
        visibleIds: [],
      }),
    ).toEqual({ id: null, kind: "search-empty" });

    useTriageStore.setState({ selectedScratchId: "selected", scratchPoolQuery: "" });
    expect(
      useTriageStore.getState().finishScratchArchive("selected", {
        activeIds: ["selected"],
        visibleIds: [],
      }),
    ).toEqual({ id: null, kind: "inbox-empty" });
    expect(useTriageStore.getState().selectedScratchId).toBeNull();
  });

  it("keeps a paused external-removal lifecycle until authoritative restore", () => {
    useTriageStore.setState({
      selectedScratchId: "selected",
      scratchPoolResultIds: ["selected"],
      scratchPoolActiveIds: ["selected"],
    });
    const store = useTriageStore.getState();
    store.reconcileScratchPoolContext({ activeIds: [], visibleIds: [] });
    store.setExternalScratchRemovalLifecycle("selected", "archive");

    expect(useTriageStore.getState().externalScratchRemoval).toMatchObject({
      lifecycle: "archive",
      destinationKind: "inbox-empty",
    });

    useTriageStore.getState().reconcileScratchPoolContext({
      activeIds: ["selected"],
      visibleIds: ["selected"],
    });
    expect(useTriageStore.getState()).toMatchObject({
      selectedScratchId: "selected",
      externalScratchRemoval: null,
    });
  });

  it("does not treat a deleted identity reappearing as an archive restore", () => {
    useTriageStore.setState({
      selectedScratchId: "selected",
      scratchPoolActiveIds: ["selected", "next"],
      scratchPoolResultIds: ["selected", "next"],
    });
    const store = useTriageStore.getState();
    store.reconcileScratchPoolContext({
      activeIds: ["next"],
      visibleIds: ["next"],
    });
    store.setExternalScratchRemovalLifecycle("selected", "delete");

    useTriageStore.getState().reconcileScratchPoolContext({
      activeIds: ["selected", "next"],
      visibleIds: ["selected", "next"],
    });

    expect(useTriageStore.getState()).toMatchObject({
      selectedScratchId: "selected",
      externalScratchRemoval: {
        scratchId: "selected",
        lifecycle: "delete",
        destinationId: "next",
      },
    });
  });

  it("does not restore an identity before its external lifecycle is classified", () => {
    useTriageStore.setState({
      selectedScratchId: "selected",
      scratchPoolActiveIds: ["selected", "next"],
      scratchPoolResultIds: ["selected", "next"],
    });
    useTriageStore.getState().reconcileScratchPoolContext({
      activeIds: ["next"],
      visibleIds: ["next"],
    });

    useTriageStore.getState().reconcileScratchPoolContext({
      activeIds: ["selected", "next"],
      visibleIds: ["selected", "next"],
    });

    expect(useTriageStore.getState()).toMatchObject({
      selectedScratchId: "selected",
      externalScratchRemoval: {
        scratchId: "selected",
        lifecycle: null,
        destinationId: "next",
      },
    });
  });

  it("revalidates the latest destination atomically at terminal handoff", () => {
    useTriageStore.setState({
      selectedScratchId: "selected",
      scratchPoolResultIds: ["selected", "stale-next", "previous"],
      scratchPoolActiveIds: ["selected", "stale-next", "previous"],
    });
    useTriageStore.getState().reconcileScratchPoolContext({
      activeIds: ["stale-next", "previous"],
      visibleIds: ["stale-next", "previous"],
    });

    const destination = useTriageStore
      .getState()
      .finishExternalScratchRemoval({
        activeIds: ["replacement", "previous"],
        visibleIds: ["replacement", "previous"],
      });

    expect(destination).toEqual({
      id: "previous",
      kind: "scratch",
    });
    expect(useTriageStore.getState()).toMatchObject({
      selectedScratchId: "previous",
      externalScratchRemoval: null,
    });
  });

  it("uses distinct search-empty and Inbox-empty terminal destinations", () => {
    useTriageStore.setState({
      selectedScratchId: "selected",
      scratchPoolQuery: "missing",
      scratchPoolResultIds: ["selected"],
      scratchPoolActiveIds: ["selected", "hidden"],
    });
    useTriageStore.getState().reconcileScratchPoolContext({
      activeIds: ["hidden"],
      visibleIds: [],
    });
    expect(useTriageStore.getState().externalScratchRemoval).toMatchObject({
      destinationKind: "search-empty",
    });

    expect(
      useTriageStore.getState().finishExternalScratchRemoval({
        activeIds: ["hidden"],
        visibleIds: [],
      }),
    ).toEqual({ id: null, kind: "search-empty" });

    useTriageStore.setState({
      selectedScratchId: "selected",
      scratchPoolQuery: "",
      scratchPoolResultIds: ["selected"],
      scratchPoolActiveIds: ["selected"],
    });
    useTriageStore.getState().reconcileScratchPoolContext({
      activeIds: [],
      visibleIds: [],
    });
    expect(
      useTriageStore.getState().finishExternalScratchRemoval({
        activeIds: [],
        visibleIds: [],
      }),
    ).toEqual({ id: null, kind: "inbox-empty" });
  });

  it("retains Pool and Explorer context for same-session route re-entry", () => {
    const store = useTriageStore.getState();

    store.selectScratch("scratch-1");
    store.setScratchPoolExpanded(false);
    store.setScratchPoolQuery("project");
    store.setScratchPoolResultIds(["scratch-2"]);
    store.setScratchPoolScroll({ anchorId: "scratch-2", offset: 18 });
    store.setExplorerPathIds(["node-1", "node-2"]);
    store.setExplorerOpenColumnIds(["home", "node-1", "node-2"]);
    store.setExplorerColumnScroll("node-1", {
      anchorId: "node-3",
      offset: 24,
    });

    expect(useTriageStore.getState()).toMatchObject({
      selectedScratchId: "scratch-1",
      scratchPoolExpanded: false,
      scratchPoolQuery: "project",
      scratchPoolResultIds: ["scratch-2"],
      scratchPoolScroll: { anchorId: "scratch-2", offset: 18 },
      explorerPathIds: ["node-1", "node-2"],
      explorerOpenColumnIds: ["home", "node-1", "node-2"],
      explorerColumnScroll: {
        "node-1": { anchorId: "node-3", offset: 24 },
      },
    });
  });

  it("reconciles an invalid prior selection without manufacturing an external removal", () => {
    useTriageStore.setState({
      selectedScratchId: "removed",
      scratchPoolQuery: "project",
      scratchPoolScroll: { anchorId: "removed", offset: 18 },
      scratchPoolManualExpandedForId: "removed",
    });

    useTriageStore.getState().reconcileScratchPoolContext({
      activeIds: ["scratch-new", "scratch-project"],
      visibleIds: ["scratch-project"],
    });

    expect(useTriageStore.getState()).toMatchObject({
      selectedScratchId: "scratch-project",
      scratchPoolManualExpandedForId: null,
      scratchPoolResultIds: ["scratch-project"],
      scratchPoolScroll: { anchorId: "scratch-project", offset: 0 },
      externalScratchRemoval: null,
    });
  });

  it("uses null for an invalid prior selection with no visible search result", () => {
    useTriageStore.setState({
      selectedScratchId: "removed",
      scratchPoolQuery: "missing",
    });

    useTriageStore.getState().reconcileScratchPoolContext({
      activeIds: ["scratch-new"],
      visibleIds: [],
    });

    expect(useTriageStore.getState().selectedScratchId).toBeNull();
    expect(useTriageStore.getState().externalScratchRemoval).toBeNull();
  });

  it("retains a valid search-hidden selection and its manual-reopen exception", () => {
    useTriageStore.setState({
      selectedScratchId: "scratch-hidden",
      scratchPoolQuery: "visible",
      scratchPoolManualExpandedForId: "scratch-hidden",
    });

    useTriageStore.getState().reconcileScratchPoolContext({
      activeIds: ["scratch-hidden", "scratch-visible"],
      visibleIds: ["scratch-visible"],
    });

    expect(useTriageStore.getState()).toMatchObject({
      selectedScratchId: "scratch-hidden",
      scratchPoolManualExpandedForId: "scratch-hidden",
      scratchPoolResultIds: ["scratch-visible"],
    });
  });

  it("clears the per-Scratch manual-reopen exception only when selection changes", () => {
    useTriageStore.setState({
      selectedScratchId: "scratch-1",
      scratchPoolManualExpandedForId: "scratch-1",
    });

    useTriageStore.getState().selectScratch("scratch-1");
    expect(useTriageStore.getState().scratchPoolManualExpandedForId).toBe(
      "scratch-1",
    );

    useTriageStore.getState().selectScratch("scratch-2");
    expect(useTriageStore.getState().scratchPoolManualExpandedForId).toBeNull();
  });

  it("starts a new app session with deterministic Pool and Explorer defaults", async () => {
    useTriageStore.setState({
      selectedScratchId: "scratch-1",
      scratchPoolExpanded: false,
      scratchPoolQuery: "project",
      scratchPoolResultIds: ["scratch-1"],
      scratchPoolActiveIds: ["scratch-1"],
      scratchPoolScroll: { anchorId: "scratch-1", offset: 12 },
      explorerPathIds: ["node-1"],
      explorerOpenColumnIds: ["home", "node-1"],
      explorerColumnScroll: {
        home: { anchorId: "node-1", offset: 8 },
      },
    });

    vi.resetModules();
    const { useTriageStore: reloadedStore } = await import("./triage-store");

    expect(reloadedStore.getState()).toMatchObject({
      selectedScratchId: null,
      scratchPoolExpanded: true,
      scratchPoolManualExpandedForId: null,
      scratchPoolQuery: "",
      scratchPoolResultIds: [],
      scratchPoolActiveIds: [],
      scratchPoolScroll: { anchorId: null, offset: 0 },
      explorerPathIds: [],
      explorerOpenColumnIds: [],
      explorerColumnScroll: {},
    });
  });

  it("reconciles Explorer state to the longest valid prefix without sibling substitution", () => {
    useTriageStore.setState({
      explorerPathIds: ["home-a", "removed", "stale-child"],
      explorerOpenColumnIds: ["home", "home-a", "removed", "stale-child"],
      explorerColumnScroll: {
        home: { anchorId: "home-a", offset: -6 },
        "home-a": { anchorId: "removed", offset: -12 },
        removed: { anchorId: "stale-child", offset: -4 },
      },
    });

    useTriageStore.getState().reconcileExplorerContext({
      validPathIds: ["home-a"],
      visibleItemIdsByColumn: {
        home: ["home-a", "home-b"],
        "home-a": ["sibling"],
      },
    });

    expect(useTriageStore.getState()).toMatchObject({
      explorerPathIds: ["home-a"],
      explorerOpenColumnIds: ["home", "home-a"],
      explorerColumnScroll: {
        home: { anchorId: "home-a", offset: -6 },
        "home-a": { anchorId: null, offset: 0 },
      },
    });
  });

  it("preserves a surviving stable scroll anchor and offset across remote insertion", () => {
    useTriageStore.setState({
      explorerColumnScroll: {
        home: { anchorId: "home-b", offset: -9 },
      },
    });

    useTriageStore.getState().reconcileExplorerContext({
      validPathIds: [],
      visibleItemIdsByColumn: {
        home: ["remote-new", "home-a", "home-b"],
      },
    });

    expect(useTriageStore.getState().explorerColumnScroll.home).toEqual({
      anchorId: "home-b",
      offset: -9,
    });
  });
});
