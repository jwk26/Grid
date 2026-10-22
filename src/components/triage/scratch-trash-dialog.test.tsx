import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  TrashScratchState,
  TrashScratchView,
} from "@/hooks/use-trash-scratch";
import { ScratchTrashDialog } from "./scratch-trash-dialog";

afterEach(cleanup);

const target = { scratchId: "s1", title: "Plan the week" };
const operation = {
  operationId: "op-1",
  command: {} as never,
};
const baseView: TrashScratchView = {
  scratch: null,
  candidateCount: 0,
  hasDiscardableWork: false,
  confirmDisabledReason: null,
};

function setup(
  state: TrashScratchState,
  view: Partial<TrashScratchView> = {},
) {
  const handlers = {
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
    onRetry: vi.fn(),
    onCheckAgain: vi.fn(),
  };
  const utils = render(
    <ScratchTrashDialog
      state={state}
      view={{ ...baseView, ...view }}
      {...handlers}
    />,
  );
  return { ...utils, ...handlers };
}

describe("ScratchTrashDialog", () => {
  it("renders nothing while closed", () => {
    setup({ phase: "closed" });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("shows the exact confirmation copy with Cancel as the initial focus", () => {
    setup({ phase: "confirming", target });
    const dialog = screen.getByRole("alertdialog", { name: "Move Scratch to Trash?" });
    expect(dialog).toHaveClass("scratch-trash-dialog");
    expect(dialog).toHaveTextContent(
      '"Plan the week" moves to Trash. You can restore it from Trash for 30 days.',
    );
    expect(screen.getByText("Plan the week").tagName).toBe("STRONG");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Move to Trash" })).toBeEnabled();
    expect(screen.queryByText(/staged item/)).not.toBeInTheDocument();
    expect(screen.queryByText(/unsaved draft/)).not.toBeInTheDocument();
  });

  it("shows a live staged count and the draft line (singular and plural)", () => {
    const view = setup(
      { phase: "confirming", target },
      { candidateCount: 1, hasDiscardableWork: true },
    );
    expect(screen.getByText("1 staged item will be removed from Staging.")).toBeInTheDocument();
    expect(
      screen.getByText("Your unsaved draft in this Scratch will be discarded."),
    ).toBeInTheDocument();
    view.rerender(
      <ScratchTrashDialog
        state={{ phase: "confirming", target }}
        view={{ ...baseView, candidateCount: 3 }}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        onRetry={vi.fn()}
        onCheckAgain={vi.fn()}
      />,
    );
    expect(screen.getByText("3 staged items will be removed from Staging.")).toBeInTheDocument();
    expect(screen.queryByText(/unsaved draft/)).not.toBeInTheDocument();
  });

  it("confirms without closing and cancels through Cancel and Escape", () => {
    const { onConfirm, onCancel } = setup({ phase: "confirming", target });
    fireEvent.click(screen.getByRole("button", { name: "Move to Trash" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("pending: shows progress, disables every action and ignores Escape", () => {
    const { onCancel } = setup({ phase: "pending", target, operation });
    expect(screen.getByText("Moving to Trash…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Move to Trash" })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("unknown: offers only Check again and ignores Escape", () => {
    const { onCheckAgain, onCancel } = setup({ phase: "unknown", target, operation });
    expect(
      screen.getByText("Checking whether this Scratch moved to Trash…"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(onCancel).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(onCheckAgain).toHaveBeenCalledTimes(1);
  });

  it("reconciling: Check again is disabled", () => {
    setup({ phase: "reconciling", target, operation });
    expect(screen.getByRole("button", { name: "Check again" })).toBeDisabled();
  });

  it("not applied: offers Retry and Cancel", () => {
    const { onRetry } = setup({ phase: "not_applied", target, operation });
    expect(screen.getByText("Couldn't move this Scratch to Trash.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });

  it("conflict: asks to review and allows confirming again", () => {
    const { onConfirm } = setup({ phase: "conflict", target });
    expect(
      screen.getByText("This Scratch changed. Review and confirm again."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Move to Trash" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("rejected: shows the reason with Cancel only and closes on Cancel", () => {
    const { onCancel } = setup({ phase: "rejected", target });
    expect(
      screen.getAllByText(
        "A staged item in this Scratch lost its source. Resolve it in Staging first.",
      ),
    ).not.toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Move to Trash" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables Move to Trash while the Scratch has an unresolved-source candidate", () => {
    setup(
      { phase: "confirming", target },
      { confirmDisabledReason: "unresolved-source" },
    );
    expect(screen.getByRole("button", { name: "Move to Trash" })).toBeDisabled();
  });

  it.each([
    ["confirming", { phase: "confirming", target }],
    ["pending", { phase: "pending", target, operation }],
  ] as const)(
    "UF-29: a color theme or light/dark change while %s keeps the node, text, state and focus and sends nothing",
    (_name, state) => {
      const { onCancel, onConfirm, onRetry, onCheckAgain } = setup(
        state as TrashScratchState,
        { candidateCount: 2, hasDiscardableWork: true },
      );
      const dialog = screen.getByRole("alertdialog");
      const focused = document.activeElement;
      const text = dialog.textContent;
      for (const theme of ["retro-mac", "neumorphism", "griddo"]) {
        document.documentElement.dataset.colorTheme = theme;
        document.documentElement.classList.toggle("dark");
      }
      document.documentElement.classList.remove("dark");
      delete document.documentElement.dataset.colorTheme;
      expect(screen.getByRole("alertdialog")).toBe(dialog);
      expect(dialog.textContent).toBe(text);
      expect(dialog).toHaveAttribute("data-triage-state", state.phase);
      expect(document.activeElement).toBe(focused);
      expect(onConfirm).not.toHaveBeenCalled();
      expect(onRetry).not.toHaveBeenCalled();
      expect(onCheckAgain).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
    },
  );
});
