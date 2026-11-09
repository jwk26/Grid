import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeletionGraceDialog } from "@/components/layout/deletion-grace-dialog";
import { DELETION_GRACE_MS, deletionDeadline, type DeletionClock } from "@/lib/auth/deletion-grace";
import { DELETION_GRACE, formatBackupTime } from "@/lib/copy/feedback";

const NOW = Date.parse("2026-11-10T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.useRealTimers();
});

// Requested `agoMs` before the server's now; received at the (faked) current time.
const clockOf = (agoMs: number): DeletionClock => ({
  requestedAt: NOW - agoMs,
  serverNow: NOW,
  receivedMono: performance.now(),
  receivedWall: Date.now(),
});

function controllerOf(cancel: () => Promise<"entered" | "failed" | "deleted"> = async () => "entered") {
  return { cancelAccountDeletion: vi.fn(cancel), continueAsGuest: vi.fn(async () => undefined) };
}

describe("DeletionGraceDialog", () => {
  it("shows the title, the deadline in the user's format and the countdown to request + 24 h", () => {
    const clock = clockOf(60_000);
    render(<DeletionGraceDialog clock={clock} controller={controllerOf()} />);
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveAccessibleName(DELETION_GRACE.title);
    const line = DELETION_GRACE.deadline(formatBackupTime(deletionDeadline(clock)));
    expect(screen.getByText(line)).toBeInTheDocument();
    expect(dialog).toHaveAccessibleDescription(line);
    expect(screen.getByText("23:59:00")).toBeInTheDocument();
    expect(screen.getByText(DELETION_GRACE.countdownLabel)).toBeInTheDocument();
  });

  it("hides the countdown from screen readers; the deadline line is what they read", () => {
    render(<DeletionGraceDialog clock={clockOf(60_000)} controller={controllerOf()} />);
    const countdown = screen.getByText("23:59:00");
    expect(countdown).toHaveAttribute("aria-hidden", "true");
    expect(countdown).toHaveClass("font-mono");
    expect(screen.getByText(DELETION_GRACE.countdownLabel)).toHaveAttribute("aria-hidden", "true");
  });

  it("ticks every second from the server's time", () => {
    render(<DeletionGraceDialog clock={clockOf(60_000)} controller={controllerOf()} />);
    act(() => void vi.advanceTimersByTime(3000));
    expect(screen.getByText("23:58:57")).toBeInTheDocument();
  });

  it("at zero the line changes and Cancel deletion stays", () => {
    render(<DeletionGraceDialog clock={clockOf(DELETION_GRACE_MS - 2000)} controller={controllerOf()} />);
    expect(screen.getByText("00:00:02")).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(2000));
    expect(screen.getByText(DELETION_GRACE.zero)).toBeInTheDocument();
    expect(screen.queryByText(DELETION_GRACE.countdownLabel)).toBeNull();
    expect(screen.getByRole("button", { name: DELETION_GRACE.cancel })).toBeEnabled();
  });

  it("a wrong device clock does not move the countdown: it follows the server's time", () => {
    vi.setSystemTime(NOW + 5 * 3_600_000); // the device thinks it is five hours later
    const clock: DeletionClock = { requestedAt: NOW - 60_000, serverNow: NOW, receivedMono: performance.now(), receivedWall: Date.now() };
    render(<DeletionGraceDialog clock={clock} controller={controllerOf()} />);
    expect(screen.getByText("23:59:00")).toBeInTheDocument();
  });

  it("has Cancel deletion first, focused, then Continue as guest", () => {
    render(<DeletionGraceDialog clock={clockOf(60_000)} controller={controllerOf()} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual([DELETION_GRACE.cancel, DELETION_GRACE.continueAsGuest]);
    expect(buttons[0]).toHaveFocus();
  });

  it("Continue as guest calls the controller", () => {
    const controller = controllerOf();
    render(<DeletionGraceDialog clock={clockOf(60_000)} controller={controller} />);
    fireEvent.click(screen.getByRole("button", { name: DELETION_GRACE.continueAsGuest }));
    expect(controller.continueAsGuest).toHaveBeenCalledTimes(1);
  });

  it("Cancel deletion is busy while the cancel runs, shows the loader only after the display delay, and disables both buttons", async () => {
    let finish!: (value: "entered") => void;
    const controller = controllerOf(() => new Promise((resolve) => (finish = resolve)));
    render(<DeletionGraceDialog clock={clockOf(60_000)} controller={controller} />);
    fireEvent.click(screen.getByRole("button", { name: DELETION_GRACE.cancel }));
    expect(controller.cancelAccountDeletion).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alertdialog")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: DELETION_GRACE.cancel })).toBeDisabled();
    expect(screen.getByRole("button", { name: DELETION_GRACE.continueAsGuest })).toBeDisabled();
    expect(document.querySelector('[data-feedback-role="status-icon"]')).toBeNull();
    act(() => void vi.advanceTimersByTime(300));
    expect(document.querySelector('[data-glyph="loader"]')).not.toBeNull();
    await act(async () => finish("entered"));
  });

  it("a failed cancel shows the inline line and keeps Cancel deletion for a new press", async () => {
    const controller = controllerOf(async () => "failed");
    render(<DeletionGraceDialog clock={clockOf(60_000)} controller={controller} />);
    fireEvent.click(screen.getByRole("button", { name: DELETION_GRACE.cancel }));
    await act(async () => undefined);
    expect(screen.getByRole("status")).toHaveTextContent(DELETION_GRACE.cancelFailed);
    expect(screen.getByRole("button", { name: DELETION_GRACE.cancel })).toBeEnabled();
    expect(screen.getByRole("button", { name: DELETION_GRACE.cancel })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: DELETION_GRACE.cancel }));
    expect(controller.cancelAccountDeletion).toHaveBeenCalledTimes(2);
  });

  it("makes the rest of the page inert and leaves the empty frame behind it", () => {
    document.body.insertAdjacentHTML("beforeend", '<div id="other"></div>');
    render(<DeletionGraceDialog clock={clockOf(60_000)} controller={controllerOf()} />);
    expect(document.getElementById("other")).toHaveAttribute("inert");
    expect(document.querySelector('[data-app-role="deletion-grace-frame"]')).toBeInTheDocument();
  });

  it("with no controller (a forced state) the buttons send nothing", () => {
    render(<DeletionGraceDialog clock={clockOf(60_000)} controller={null} />);
    fireEvent.click(screen.getByRole("button", { name: DELETION_GRACE.cancel }));
    fireEvent.click(screen.getByRole("button", { name: DELETION_GRACE.continueAsGuest }));
    expect(screen.getByRole("button", { name: DELETION_GRACE.cancel })).toBeEnabled();
  });
});
