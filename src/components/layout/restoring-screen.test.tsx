import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RestoringScreen } from "@/components/layout/restoring-screen";
import type { UseRestore } from "@/hooks/use-backup";
import type { RestoreView } from "@/lib/backup/restore-controller";
import { BACKUP_COPY, RESTORING_COPY } from "@/lib/copy/feedback";

function restore(view: RestoreView): UseRestore {
  return { state: { view, notice: null }, start: vi.fn(), checkAgain: vi.fn(), clearNotice: vi.fn() };
}
const self = (step: "saving" | "getting" | "applying" | null): RestoreView => ({ phase: "restoring", role: "self", restoreId: "r", step });
const stateOf = (name: string) => document.querySelector(`[data-restoring-step="${name}"]`)?.getAttribute("data-restoring-state");

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("RestoringScreen", () => {
  it("renders nothing while idle", () => {
    render(<RestoringScreen restore={restore({ phase: "idle" })} />);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("this tab: the title, the reason and three steps with no step reached yet", () => {
    render(<RestoringScreen restore={restore(self(null))} />);
    expect(screen.getByRole("alertdialog")).toHaveAccessibleName(RESTORING_COPY.title);
    expect(screen.getByText(RESTORING_COPY.reason)).toBeInTheDocument();
    for (const name of ["saving", "getting", "applying"]) expect(stateOf(name)).toBe("pending");
  });

  it.each([
    ["saving", ["current", "pending", "pending"]],
    ["getting", ["done", "current", "pending"]],
    ["applying", ["done", "done", "current"]],
  ] as const)("marks the steps as the function reports %s", (step, expected) => {
    render(<RestoringScreen restore={restore(self(step))} />);
    expect(["saving", "getting", "applying"].map(stateOf)).toEqual(expected);
    expect(document.querySelector('[aria-current="step"]')).toHaveTextContent(RESTORING_COPY.steps[step]);
  });

  it("one 16px marker per state: an outline circle pending, the F03 loader current, a check done", () => {
    render(<RestoringScreen restore={restore(self("getting"))} />);
    const marker = (name: string) => document.querySelector(`[data-restoring-step="${name}"]`)!;
    expect(marker("saving").querySelector("svg.lucide-check")).not.toBeNull();
    const loader = marker("getting").querySelector('[data-feedback-role="status-icon"]')!;
    expect(loader).toHaveAttribute("data-glyph", "loader");
    expect(loader).toHaveAccessibleName(RESTORING_COPY.steps.getting);
    expect((loader as HTMLElement).style.getPropertyValue("--status-icon-size")).toBe("16px");
    expect(marker("applying").querySelector('[data-app-role="restoring-pending-marker"]')).not.toBeNull();
    expect(marker("applying").querySelector('[data-feedback-role="status-icon"]')).toBeNull();
  });

  it("shows no percentage and no progress bar", () => {
    render(<RestoringScreen restore={restore(self("getting"))} />);
    expect(document.body.textContent).not.toMatch(/%/);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("another tab: the other-tab text and no steps", () => {
    render(<RestoringScreen restore={restore({ phase: "restoring", role: "other", restoreId: "r" })} />);
    expect(screen.getByRole("alertdialog")).toHaveAccessibleName(RESTORING_COPY.otherTitle);
    expect(screen.getByText(RESTORING_COPY.otherReason)).toBeInTheDocument();
    expect(document.querySelector('[data-app-role="restoring-steps"]')).toBeNull();
  });

  it("the way-out: Still finishing… with Check again, which reads once", () => {
    const r = restore({ phase: "wayout", role: "self", restoreId: "r", reading: false, readFailed: false });
    render(<RestoringScreen restore={r} />);
    expect(screen.getByRole("status")).toHaveTextContent(BACKUP_COPY.stillFinishing);
    expect(screen.getByRole("status").querySelector('[data-glyph="loader"]')).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: BACKUP_COPY.checkAgain }));
    expect(r.checkAgain).toHaveBeenCalledTimes(1);
  });

  it("the way-out: Checking… disables the button; a failed read says so", () => {
    const { rerender } = render(<RestoringScreen restore={restore({ phase: "wayout", role: "other", restoreId: "r", reading: true, readFailed: false })} />);
    expect(screen.getByRole("status")).toHaveTextContent(BACKUP_COPY.checking);
    expect(screen.getByRole("button", { name: BACKUP_COPY.checkAgain })).toBeDisabled();
    rerender(<RestoringScreen restore={restore({ phase: "wayout", role: "other", restoreId: "r", reading: false, readFailed: true })} />);
    expect(screen.getByRole("status")).toHaveTextContent(BACKUP_COPY.readFailed);
    expect(screen.getByRole("status").querySelector('[data-glyph="exclamation"]')).not.toBeNull();
    expect(screen.getByRole("status").querySelector('[data-glyph="loader"]')).toBeNull();
  });

  it("makes the rest of the page inert and gives it back", () => {
    document.body.innerHTML = '<div id="app"></div>';
    const { unmount } = render(<RestoringScreen restore={restore(self(null))} />);
    expect(document.getElementById("app")).toHaveAttribute("inert");
    expect(document.querySelector('[data-app-role="restoring-screen"]')).not.toHaveAttribute("inert");
    unmount();
    expect(document.getElementById("app")).not.toHaveAttribute("inert");
  });
});
