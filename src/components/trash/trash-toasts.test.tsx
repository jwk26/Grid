import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrashList } from "@/components/trash/trash-list";
import { baseEntities } from "@/lib/db/boundary-cases";
import { toastCopy } from "@/lib/copy/feedback";

// The kept Trash toasts move to the helper with their SPEC copy (Task 232).

const actions = vi.hoisted(() => ({
  restoreNode: vi.fn(),
  hardDeleteNode: vi.fn(),
  restoreBit: vi.fn(),
  hardDeleteBit: vi.fn(),
  emptyTrash: vi.fn(),
}));
const showToast = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-trash-actions", () => ({ useTrashActions: () => actions }));
vi.mock("@/lib/feedback/toast", () => ({ showToast }));

const node = { ...baseEntities.node, id: "n1", title: "Old node", parentId: null, deletedAt: 10 };
const bit = { ...baseEntities.bit, id: "b1", title: "Old bit", parentId: "elsewhere", deletedAt: 9 };

function renderList() {
  render(<TrashList items={{ nodes: [node as never], bits: [bit as never] }} />);
}


beforeEach(() => {
  for (const action of Object.values(actions)) action.mockReset().mockResolvedValue(undefined);
  showToast.mockClear();
});
afterEach(cleanup);

describe("Trash toasts", () => {
  it("restores a Node and a Bit with the restored sentence", async () => {
    renderList();
    fireEvent.click(screen.getAllByRole("button", { name: "Restore" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Restore" })[1]);

    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(2));
    expect(showToast).toHaveBeenCalledWith(toastCopy.restoreSucceeded, "Old node");
    expect(showToast).toHaveBeenCalledWith(toastCopy.restoreSucceeded, "Old bit");
  });

  it("says the Grid is full when the parent has no empty cell, and the item stays in Trash otherwise", async () => {
    actions.restoreNode.mockRejectedValue(new Error("GRID_FULL"));
    actions.restoreBit.mockRejectedValue(new Error("boom"));
    renderList();
    fireEvent.click(screen.getAllByRole("button", { name: "Restore" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Restore" })[1]);

    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(2));
    expect(showToast).toHaveBeenCalledWith(toastCopy.restoreBlocked, "Old node");
    expect(showToast).toHaveBeenCalledWith(toastCopy.restoreFailed, "Old bit");
  });

  it.each([
    ["Old node", 0, actions.hardDeleteNode],
    ["Old bit", 1, actions.hardDeleteBit],
  ])("deletes %s permanently, with the failed sentence on a failure", async (title, index, hardDelete) => {
    renderList();
    const confirm = async () => {
      fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[index]);
      const dialog = await screen.findByRole("alertdialog");
      fireEvent.click(within(dialog).getByRole("button", { name: "Delete permanently" }));
    };

    await confirm();
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(toastCopy.permanentDeleteSucceeded, title));

    hardDelete.mockRejectedValue(new Error("boom"));
    await confirm();
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(toastCopy.permanentDeleteFailed, title));
  });

  it("empties Trash with its sentences", async () => {
    renderList();
    const empty = async () => {
      fireEvent.click(screen.getByRole("button", { name: "Empty trash" }));
      const dialog = await screen.findByRole("alertdialog");
      fireEvent.click(within(dialog).getByRole("button", { name: "Delete all" }));
    };

    await empty();
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(toastCopy.emptyTrashSucceeded));

    actions.emptyTrash.mockRejectedValue(new Error("boom"));
    await empty();
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(toastCopy.emptyTrashFailed));
  });
});

describe("Trash controls wait for the answer (group 3)", () => {
  function hold<T>(action: { mockImplementation: (fn: () => Promise<T>) => unknown }) {
    let release!: () => void;
    action.mockImplementation(() => new Promise<T>((resolve) => {
      release = () => resolve(undefined as T);
    }));
    return () => release();
  }

  it("Restore is busy at once, shows the loader only after 300 ms and frees at the answer", async () => {
    vi.useFakeTimers();
    try {
      const release = hold(actions.restoreNode);
      renderList();
      const restore = screen.getAllByRole("button", { name: /Restore/ })[0];
      await act(async () => {
        fireEvent.click(restore);
      });

      expect(restore).toHaveAttribute("aria-busy", "true");
      expect(restore).toBeDisabled();
      // The Delete control of the same row waits too.
      expect(screen.getAllByRole("button", { name: /Delete/ })[0]).toBeDisabled();
      expect(within(restore).queryByRole("img")).not.toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      expect(within(restore).getByRole("img", { name: "Restoring…" })).toHaveAttribute("data-glyph", "loader");

      await act(async () => {
        release();
      });
      expect(restore).not.toBeDisabled();
      expect(within(restore).queryByRole("img")).not.toBeInTheDocument();
      expect(showToast).toHaveBeenCalledWith(toastCopy.restoreSucceeded, "Old node");
    } finally {
      vi.useRealTimers();
    }
  });

  it("Empty trash is busy with its loader after 300 ms", async () => {
    vi.useFakeTimers();
    try {
      const release = hold(actions.emptyTrash);
      renderList();
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Empty trash" }));
      });
      await act(async () => {
        fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete all" }));
      });

      const empty = screen.getByRole("button", { name: /Empty trash/ });
      expect(empty).toHaveAttribute("aria-busy", "true");
      expect(within(empty).queryByRole("img")).not.toBeInTheDocument();
      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      expect(within(empty).getByRole("img", { name: "Emptying Trash…" })).toBeInTheDocument();
      await act(async () => {
        release();
      });
      expect(empty).not.toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("a permanent delete busies its own control", async () => {
    vi.useFakeTimers();
    try {
      const release = hold(actions.hardDeleteBit);
      renderList();
      await act(async () => {
        fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[1]);
      });
      await act(async () => {
        fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete permanently" }));
      });
      const del = screen.getAllByRole("button", { name: /Delete/ })[1];
      expect(del).toHaveAttribute("aria-busy", "true");
      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      expect(within(del).getByRole("img", { name: "Deleting…" })).toBeInTheDocument();
      await act(async () => {
        release();
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
