import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
