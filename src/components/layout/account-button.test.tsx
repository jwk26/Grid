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

const noError = {
  hasSignInError: () => false,
  takeSignInError: () => false,
  subscribeSignInError: () => () => undefined,
};

describe("AccountButton sign-in return", () => {
  it("reopens the modal once with the inline error after a sign-in that did not complete", () => {
    let flagged = true;
    const takeSignInError = vi.fn(() => {
      const was = flagged;
      flagged = false;
      return was;
    });
    render(<AccountButton variant="guest" controller={{ hasSignInError: () => flagged, takeSignInError, subscribeSignInError: () => () => undefined }}
      />,
    );
    expect(takeSignInError).toHaveBeenCalled();
    expect(screen.getByText("Sign-in didn't complete. You're still browsing as a guest.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    expect(screen.queryByText("Sign-in didn't complete. You're still browsing as a guest.")).toBeNull();
  });

  it("reopens the modal when a back-forward-cache restore raises the error while the app shows", () => {
    let flagged = false;
    let notify: () => void = () => undefined;
    const controller = {
      hasSignInError: () => flagged,
      takeSignInError: () => {
        const was = flagged;
        flagged = false;
        return was;
      },
      subscribeSignInError: (listener: () => void) => {
        notify = listener;
        return () => undefined;
      },
    };
    render(<AccountButton variant="guest" controller={controller} />);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    flagged = true;
    act(() => notify());
    expect(screen.getByText("Sign-in didn't complete. You're still browsing as a guest.")).toBeInTheDocument();
  });

  it("stays closed when nothing failed", () => {
    render(<AccountButton variant="guest" controller={noError} />);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

describe("AccountButton", () => {
  it("is a button named Account that opens the account modal, with no tooltip when normal", () => {
    render(<AccountButton variant="guest" />);
    const icon = screen.getByLabelText("Account");
    expect(icon).toHaveAttribute("data-app-role", "account-button");
    expect(icon.tagName).toBe("BUTTON");
    expect(icon).toHaveAttribute("type", "button");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    fireEvent.click(icon);
    expect(screen.getByRole("alertdialog")).toHaveAccessibleName("You're browsing as a guest");
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
