import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AccountButton } from "@/components/layout/account-button";
import { CONNECTION_SENTENCE } from "@/lib/copy/feedback";
import { getConnectionMonitor } from "@/lib/db/connection";

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  act(() => getConnectionMonitor().setForced(null));
  cleanup();
});

function force(state: "normal" | "unstable" | "offline" | null) {
  act(() => getConnectionMonitor().setForced(state));
}

const live = () => document.querySelector('[data-feedback-role="status-announcement"]');

describe("AccountButton", () => {
  it("is a focusable status element named Account, with no action and no tooltip when normal", () => {
    render(<AccountButton variant="guest" />);
    const icon = screen.getByLabelText("Account");
    expect(icon).toHaveAttribute("data-app-role", "account-button");
    expect(icon).toHaveAttribute("tabindex", "0");
    expect(icon.tagName).not.toBe("BUTTON");
    expect(icon).not.toHaveAccessibleDescription(expect.stringMatching(/./));
    expect(document.querySelector('[data-app-role="account-badge"]')).toBeNull();
    fireEvent.focus(icon);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("uses the neighbour icon-button classes and the variant's glyph", () => {
    const { rerender } = render(<AccountButton variant="guest" />);
    const icon = screen.getByLabelText("Account");
    for (const cls of ["h-10", "w-10", "rounded-lg", "p-2.5", "text-muted-foreground", "hover:bg-accent"]) {
      expect(icon).toHaveClass(cls);
    }
    expect(icon.querySelector("svg")).toHaveClass("lucide-user-round");
    rerender(<AccountButton variant="account" />);
    expect(screen.getByLabelText("Account").querySelector("svg")).toHaveClass("lucide-user-round-check");
    expect(screen.getByLabelText("Account")).toHaveAccessibleName("Account");
  });

  it("shows the ! badge and the unstable sentence while unstable", () => {
    render(<AccountButton variant="guest" />);
    force("unstable");
    const badge = document.querySelector('[data-app-role="account-badge"]');
    expect(badge).toHaveAttribute("data-connection-state", "unstable");
    expect(badge).toHaveTextContent("!");
    expect(screen.getByLabelText("Account")).toHaveAccessibleDescription(CONNECTION_SENTENCE.unstable);
  });

  it("shows the wifi-off badge and the offline sentence while offline", () => {
    render(<AccountButton variant="guest" />);
    force("offline");
    const badge = document.querySelector('[data-app-role="account-badge"]');
    expect(badge).toHaveAttribute("data-connection-state", "offline");
    expect(badge?.querySelector("svg")).toHaveClass("lucide-wifi-off");
    expect(screen.getByLabelText("Account")).toHaveAccessibleDescription(CONNECTION_SENTENCE.offline);
  });

  it("opens the connection sentence as a tooltip on focus while not normal", async () => {
    render(<AccountButton variant="guest" />);
    force("offline");
    fireEvent.focus(screen.getByLabelText("Account"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent(CONNECTION_SENTENCE.offline);
  });

  it("does not announce the state it mounts with", () => {
    render(<AccountButton variant="guest" />);
    expect(live()).toHaveTextContent("");
  });

  it("announces each change to unstable or offline, and Back online. only on recovery", () => {
    render(<AccountButton variant="guest" />);
    force("unstable");
    expect(live()).toHaveTextContent(CONNECTION_SENTENCE.unstable);
    force("offline");
    expect(live()).toHaveTextContent(CONNECTION_SENTENCE.offline);
    force("normal");
    expect(live()).toHaveTextContent("Back online.");
  });

  it("does not announce a recovery that never left normal", () => {
    render(<AccountButton variant="guest" />);
    force("normal");
    expect(live()).toHaveTextContent("");
  });
});
