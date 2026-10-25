import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { StatusIcon } from "@/components/feedback/status-icon";
import { StatusTooltip } from "@/components/feedback/status-tooltip";

beforeAll(() => {
  // Radix Popper measures its anchor; jsdom has no ResizeObserver.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(cleanup);

describe("StatusTooltip", () => {
  it("describes the host with its sentence while closed", () => {
    render(
      <StatusTooltip sentence="Not added. Your draft is still here.">
        <button type="button">Add field</button>
      </StatusTooltip>,
    );
    const host = screen.getByRole("button", { name: "Add field" });
    expect(host).toHaveAccessibleDescription("Not added. Your draft is still here.");
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("opens on keyboard focus and closes on blur", async () => {
    render(
      <StatusTooltip sentence="Checking whether it was added…">
        <button type="button">Add field</button>
      </StatusTooltip>,
    );
    const host = screen.getByRole("button", { name: "Add field" });

    fireEvent.focus(host);
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("Checking whether it was added…");
    expect(
      document.querySelector('[data-feedback-role="status-tooltip"]'),
    ).toHaveClass("explorer-title-tooltip");
    expect(host).toHaveAccessibleDescription("Checking whether it was added…");

    fireEvent.blur(host);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("opens on hover", async () => {
    render(
      <StatusTooltip sentence="Delete unavailable. This breakdown is still here.">
        <button type="button">Row</button>
      </StatusTooltip>,
    );
    fireEvent.pointerMove(screen.getByRole("button", { name: "Row" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Delete unavailable. This breakdown is still here.",
    );
  });

  it("holds no controls", async () => {
    render(
      <StatusTooltip sentence="Not saved. Your draft is still here.">
        <button type="button">Save</button>
      </StatusTooltip>,
    );
    fireEvent.focus(screen.getByRole("button", { name: "Save" }));
    const tooltip = await screen.findByRole("tooltip");
    const content = document.querySelector(
      '[data-feedback-role="status-tooltip"]',
    ) as HTMLElement;
    expect(tooltip.querySelector("button, a, input, [tabindex]")).toBeNull();
    expect(content.querySelector("button, a, input, [tabindex]")).toBeNull();
  });

  it("shows only one tooltip at a time", async () => {
    render(
      <>
        <StatusTooltip sentence="First sentence.">
          <button type="button">First</button>
        </StatusTooltip>
        <StatusTooltip sentence="Second sentence.">
          <button type="button">Second</button>
        </StatusTooltip>
      </>,
    );
    fireEvent.focus(screen.getByRole("button", { name: "First" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("First sentence.");

    fireEvent.focus(screen.getByRole("button", { name: "Second" }));
    const visible = await screen.findAllByRole("tooltip");
    expect(visible).toHaveLength(1);
    expect(visible[0]).toHaveTextContent("Second sentence.");
  });

  it("can be controlled for hosts that dismiss tooltips themselves", async () => {
    function Host() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <StatusTooltip
            sentence="Controlled sentence."
            open={open}
            onOpenChange={setOpen}
          >
            <button type="button">Host</button>
          </StatusTooltip>
          <button type="button" onClick={() => setOpen(false)}>
            Dismiss
          </button>
        </>
      );
    }
    render(<Host />);
    fireEvent.focus(screen.getByRole("button", { name: "Host" }));
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("works on a focusable status icon that is not in a Tab-order host", async () => {
    render(
      <StatusTooltip sentence="We couldn’t confirm whether it was added.">
        <StatusIcon
          status="unknown"
          sentence="We couldn’t confirm whether it was added."
          focusable
        />
      </StatusTooltip>,
    );
    const icon = screen.getByRole("img");
    expect(icon).toHaveAttribute("tabindex", "0");
    fireEvent.focus(icon);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "We couldn’t confirm whether it was added.",
    );
  });
});
