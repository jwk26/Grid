import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppToaster } from "@/components/feedback/app-toaster";
import { offlineToastIcon } from "@/components/feedback/toast-icons";
import { useToastAnchorStore } from "@/stores/toast-anchor-store";

beforeEach(() => {
  useToastAnchorStore.getState().reset();
});

afterEach(() => {
  act(() => {
    toast.dismiss();
  });
  cleanup();
});

function stack(container: HTMLElement) {
  return container.ownerDocument.querySelector<HTMLElement>("[data-sonner-toaster]");
}

function toastOf(container: HTMLElement, type: string) {
  return container.ownerDocument.querySelector<HTMLElement>(
    `[data-sonner-toast][data-type="${type}"]`,
  );
}

// sonner publishes to the Toaster asynchronously, so wait for the toasts to render.
async function show(publish: () => void, count = 1) {
  act(() => {
    publish();
  });
  await waitFor(() => {
    expect(document.querySelectorAll("[data-sonner-toast]").length).toBeGreaterThanOrEqual(count);
  });
}

describe("AppToaster", () => {
  it("sits at the top-left, at the breadcrumb row right of the sidebar", async () => {
    const { container } = render(<AppToaster />);
    await show(() => toast.success("Saved."));

    const list = stack(container);
    expect(list).toHaveAttribute("data-y-position", "top");
    expect(list).toHaveAttribute("data-x-position", "left");
    expect(list?.style.getPropertyValue("--offset-top")).toBe("12px");
    expect(list?.style.getPropertyValue("--offset-left")).toBe("60px");
    expect(list).toHaveClass("toast-stack");
  });

  it("moves below the breadcrumb while one is shown", async () => {
    const { container } = render(<AppToaster />);
    await show(() => toast.success("Saved."));

    act(() => useToastAnchorStore.getState().setBreadcrumbBottom(62));
    expect(stack(container)?.style.getPropertyValue("--offset-top")).toBe("70px");

    act(() => useToastAnchorStore.getState().setBreadcrumbBottom(null));
    expect(stack(container)?.style.getPropertyValue("--offset-top")).toBe("12px");
  });

  it("marks the stack while a Node or Bit is dragged", async () => {
    const { container } = render(<AppToaster />);
    await show(() => toast.success("Saved."));
    expect(stack(container)).not.toHaveClass("toast-stack-dragging");

    act(() => useToastAnchorStore.getState().setDragActive(true));
    expect(stack(container)).toHaveClass("toast-stack-dragging");

    act(() => useToastAnchorStore.getState().setDragActive(false));
    expect(stack(container)).not.toHaveClass("toast-stack-dragging");
  });

  it("gives each kind its own icon and does not use rich colours", async () => {
    const { container } = render(<AppToaster />);
    await show(() => {
      toast.success("Saved.");
      toast.warning("Careful.");
      toast.error("Failed.");
    }, 3);

    expect(toastOf(container, "success")?.querySelector("[data-toast-icon]")).toHaveAttribute(
      "data-toast-icon",
      "check",
    );
    expect(toastOf(container, "warning")?.querySelector("[data-toast-icon]")).toHaveAttribute(
      "data-toast-icon",
      "exclamation",
    );
    expect(toastOf(container, "error")?.querySelector("[data-toast-icon]")).toHaveAttribute(
      "data-toast-icon",
      "exclamation",
    );
    expect(toastOf(container, "error")?.querySelector("[data-toast-icon]")).toHaveTextContent("!");

    for (const type of ["success", "warning", "error"]) {
      expect(toastOf(container, type)).not.toHaveAttribute("data-rich-colors", "true");
    }
  });

  it("shows the crossed Wi-Fi icon for the offline write-attempt warning", async () => {
    const { container } = render(<AppToaster />);
    await show(() =>
      toast.warning("You're offline. Changes can't be saved right now.", { icon: offlineToastIcon }),
    );

    expect(toastOf(container, "warning")?.querySelector("[data-toast-icon]")).toHaveAttribute(
      "data-toast-icon",
      "wifi-off",
    );
    expect(toastOf(container, "warning")?.querySelector("svg")).toBeInTheDocument();
  });

  it("gives warnings and failures a close control", async () => {
    const { container } = render(<AppToaster />);
    await show(() => {
      toast.success("Saved.");
      toast.warning("Careful.");
      toast.error("Failed.");
    }, 3);

    expect(toastOf(container, "warning")?.querySelector("[data-close-button]")).toHaveTextContent("×");
    expect(toastOf(container, "error")?.querySelector("[data-close-button]")).toHaveTextContent("×");
  });

  it("shows at most three toasts", async () => {
    const { container } = render(<AppToaster />);
    await show(() => {
      for (let index = 0; index < 5; index += 1) {
        toast.error(`Failed ${index}.`, { id: `failed-${index}` });
      }
    }, 5);

    const toasts = Array.from(
      container.ownerDocument.querySelectorAll("[data-sonner-toast]"),
    );
    expect(toasts.length).toBeGreaterThanOrEqual(3);
    expect(toasts.filter((item) => item.getAttribute("data-visible") === "true")).toHaveLength(3);
  });
});
