import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WriteOfflineError, WriteOutcomeUnknownError, WriteRejectedError } from "@/lib/db/write-errors";
import type { Node } from "@/types";

type DivProps = PropsWithChildren<ComponentPropsWithoutRef<"div">>;

function MockDialog({
  children,
  open,
}: PropsWithChildren<{ open: boolean }>) {
  return open ? <div>{children}</div> : null;
}

function MockDiv({ children, ...props }: DivProps) {
  return <div {...props}>{children}</div>;
}

vi.mock("@/components/ui/dialog", () => ({
  Dialog: MockDialog,
  DialogContent: MockDiv,
  DialogDescription: MockDiv,
  DialogFooter: MockDiv,
  DialogHeader: MockDiv,
  DialogTitle: MockDiv,
}));

vi.mock("@/components/shared/date-first-deadline-picker", () => ({
  DateFirstDeadlinePicker: () => <div data-testid="deadline-picker" />,
}));

const updateNodeMock = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-node-actions", () => ({
  useNodeActions: () => ({
    updateNode: updateNodeMock,
  }),
}));

const { EditNodeDialog } = await import("@/components/grid/edit-node-dialog");

function createNode(overrides: Partial<Node> = {}): Node {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "Node",
    color: overrides.color ?? "hsl(221, 83%, 53%)",
    icon: overrides.icon ?? "Folder",
    deadline: overrides.deadline ?? new Date(2026, 3, 22, 9, 0).getTime(),
    deadlineAllDay: overrides.deadlineAllDay ?? false,
    mtime: overrides.mtime ?? 1,
    createdAt: overrides.createdAt ?? 1,
    parentId: overrides.parentId ?? null,
    level: overrides.level ?? 0,
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    deletedAt: overrides.deletedAt ?? null,
    archivedAt: overrides.archivedAt ?? null,
    systemRole: overrides.systemRole ?? null,
    hiddenFromGrid: overrides.hiddenFromGrid ?? false,
    version: overrides.version ?? 1,
    pastDeadlineDismissed: overrides.pastDeadlineDismissed ?? false,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("EditNodeDialog", () => {
  it("omits the deadline section for level-0 nodes", () => {
    render(
      <EditNodeDialog
        level={0}
        node={createNode({ level: 0 })}
        onOpenChange={vi.fn()}
        open={true}
      />,
    );

    expect(screen.queryByText("Deadline")).not.toBeInTheDocument();
    expect(screen.queryByTestId("deadline-picker")).not.toBeInTheDocument();
  });

  it("shows the deadline section for nested nodes", () => {
    render(
      <EditNodeDialog
        level={1}
        node={createNode({ level: 1 })}
        onOpenChange={vi.fn()}
        open={true}
      />,
    );

    expect(screen.getByText("Deadline")).toBeInTheDocument();
    expect(screen.getByTestId("deadline-picker")).toBeInTheDocument();
  });

  describe("a save the server refuses", () => {
    function save(onOpenChange = vi.fn()) {
      render(
        <EditNodeDialog
          level={1}
          node={createNode({ level: 1, title: "Saved title" })}
          onOpenChange={onOpenChange}
          open={true}
        />,
      );
      fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Typed title" } });
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      return onOpenChange;
    }

    it("saves without the store's toast and closes on success", async () => {
      updateNodeMock.mockResolvedValue(undefined);
      const onOpenChange = save();
      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
      expect(updateNodeMock.mock.calls[0][2]).toEqual({ report: false });
    });

    it("shows the saved title inline and keeps the typed values", async () => {
      updateNodeMock.mockRejectedValue(new WriteRejectedError("rejected", { code: "rejected" }));
      const onOpenChange = save();
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Couldn't save the changes to “Saved title”. Try again.",
      );
      expect(screen.getByLabelText("Title")).toHaveValue("Typed title");
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("shows the line when the unknown outcome was rolled back", async () => {
      updateNodeMock.mockRejectedValue(new WriteOutcomeUnknownError(false));
      save();
      expect(await screen.findByRole("alert")).toHaveTextContent("Try again.");
    });

    it("stays open with the typed values and no line when the write was stopped offline", async () => {
      updateNodeMock.mockRejectedValue(new WriteOfflineError());
      const onOpenChange = save();
      await waitFor(() => expect(updateNodeMock).toHaveBeenCalled());
      await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeEnabled());
      expect(screen.getByRole("alert")).toHaveTextContent("");
      expect(screen.getByLabelText("Title")).toHaveValue("Typed title");
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("closes when the unknown outcome was kept", async () => {
      updateNodeMock.mockRejectedValue(new WriteOutcomeUnknownError(true));
      const onOpenChange = save();
      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
      expect(screen.getByRole("alert")).toHaveTextContent("");
    });
  });
});
