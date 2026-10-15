"use client";

import { useCallback } from "react";
import { CommandPalette } from "@/components/quick-capture/command-palette";
import { ScratchModal } from "@/components/quick-capture/scratch-modal";
import { useInbox } from "@/hooks/use-inbox";
import { useQuickCaptureStore } from "@/stores/quick-capture-store";
import { useTriageStore } from "@/stores/triage-store";

export function QuickCaptureOverlays() {
  const activeOverlay = useQuickCaptureStore((state) => state.activeOverlay);
  const closeAll = useQuickCaptureStore((state) => state.closeAll);
  const requestScratchSelection = useTriageStore(
    (state) => state.requestScratchSelection,
  );
  const { inboxNodeId, createScratchBit } = useInbox();

  // The store ignores the request unless an Inbox workspace is mounted now.
  const handleScratchClose = useCallback(
    (capturedId?: string) => {
      if (capturedId !== undefined) requestScratchSelection(capturedId);
      closeAll();
    },
    [closeAll, requestScratchSelection],
  );

  return (
    <>
      <CommandPalette />
      <ScratchModal
        open={activeOverlay === "scratch"}
        onClose={handleScratchClose}
        onSubmit={createScratchBit}
        inboxNodeId={inboxNodeId}
      />
    </>
  );
}
