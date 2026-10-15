import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useQuickCaptureStore } from "@/stores/quick-capture-store";
import { useTriageStore } from "@/stores/triage-store";
import { QuickCaptureOverlays } from "./quick-capture-overlays";

const createScratchBitMock = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-inbox", () => ({
  useInbox: () => ({
    inboxNodeId: "inbox-1",
    createScratchBit: createScratchBitMock,
  }),
}));

vi.mock("@/components/quick-capture/command-palette", () => ({
  CommandPalette: () => <div data-testid="command-palette" />,
}));

vi.mock("@/components/quick-capture/scratch-modal", () => ({
  ScratchModal: ({
    inboxNodeId,
    onClose,
    onSubmit,
    open,
  }: {
    open: boolean;
    onClose: (capturedId?: string) => void;
    onSubmit: (title: string) => Promise<string | void>;
    inboxNodeId?: string;
  }) =>
    open ? (
      <div data-inbox-node-id={inboxNodeId} data-testid="scratch-modal">
        <button
          aria-label="scratch-close"
          onClick={() => onClose()}
          type="button"
        >
          Close scratch
        </button>
        <button
          aria-label="scratch-close-captured"
          onClick={() => onClose("s-1")}
          type="button"
        >
          Close captured
        </button>
        <button
          aria-label="scratch-submit"
          onClick={() => void onSubmit("Scratch idea")}
          type="button"
        >
          Submit scratch
        </button>
      </div>
    ) : null,
}));

afterEach(() => {
  cleanup();
  useQuickCaptureStore.setState({ activeOverlay: null });
  useTriageStore.setState({
    triageWorkspaceMounted: false,
    requestedScratchSelectionId: null,
    scratchRevealId: null,
  });
  vi.clearAllMocks();
});

describe("QuickCaptureOverlays", () => {
  it("mounts the command palette and global Scratch modal", async () => {
    createScratchBitMock.mockResolvedValue(undefined);
    useQuickCaptureStore.setState({ activeOverlay: "scratch" });

    render(<QuickCaptureOverlays />);

    expect(screen.getByTestId("command-palette")).toBeInTheDocument();
    expect(screen.getByTestId("scratch-modal")).toHaveAttribute(
      "data-inbox-node-id",
      "inbox-1",
    );

    fireEvent.click(screen.getByLabelText("scratch-submit"));

    await waitFor(() => {
      expect(createScratchBitMock).toHaveBeenCalledWith("Scratch idea");
    });

    fireEvent.click(screen.getByLabelText("scratch-close"));

    expect(useQuickCaptureStore.getState().activeOverlay).toBe(null);
  });

  it("requests selection of the captured Scratch only while a workspace is mounted", () => {
    useQuickCaptureStore.setState({ activeOverlay: "scratch" });
    render(<QuickCaptureOverlays />);

    fireEvent.click(screen.getByLabelText("scratch-close-captured"));
    expect(useTriageStore.getState().requestedScratchSelectionId).toBeNull();
    expect(useQuickCaptureStore.getState().activeOverlay).toBeNull();

    act(() => {
      useTriageStore.getState().setTriageWorkspaceMounted(true);
      useQuickCaptureStore.setState({ activeOverlay: "scratch" });
    });
    fireEvent.click(screen.getByLabelText("scratch-close-captured"));
    expect(useTriageStore.getState().requestedScratchSelectionId).toBe("s-1");
  });

  it("requests nothing when closed without a captured Scratch", () => {
    useTriageStore.getState().setTriageWorkspaceMounted(true);
    useQuickCaptureStore.setState({ activeOverlay: "scratch" });
    render(<QuickCaptureOverlays />);

    fireEvent.click(screen.getByLabelText("scratch-close"));
    expect(useTriageStore.getState().requestedScratchSelectionId).toBeNull();
  });
});
