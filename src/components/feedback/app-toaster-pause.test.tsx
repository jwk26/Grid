import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppToaster } from "@/components/feedback/app-toaster";

const setToastPaused = vi.hoisted(() => vi.fn());
vi.mock("@/lib/feedback/toast", () => ({ MAX_LIVE_TOASTS: 3, setToastPaused }));

afterEach(() => {
  act(() => {
    toast.dismiss();
  });
  cleanup();
  setToastPaused.mockClear();
});

async function showOne() {
  render(<AppToaster />);
  act(() => {
    toast.error("Failed.", { closeButton: true });
  });
  await waitFor(() => expect(document.querySelector("[data-sonner-toast]")).not.toBeNull());
  return document.querySelector<HTMLElement>("[data-sonner-toast]")!;
}

describe("AppToaster pause reports", () => {
  it("reports the pointer entering and leaving the stack", async () => {
    const item = await showOne();

    fireEvent.pointerOver(item);
    expect(setToastPaused).toHaveBeenLastCalledWith("pointer", true);

    fireEvent.pointerOut(item, { relatedTarget: document.body });
    expect(setToastPaused).toHaveBeenLastCalledWith("pointer", false);
  });

  it("keeps the pointer pause while the pointer moves between toasts of the stack", async () => {
    const item = await showOne();
    const inner = item.querySelector("[data-title]") ?? item.firstElementChild!;

    fireEvent.pointerOver(item);
    setToastPaused.mockClear();
    fireEvent.pointerOut(item, { relatedTarget: inner });

    expect(setToastPaused).not.toHaveBeenCalledWith("pointer", false);
  });

  it("reports focus entering and leaving the stack", async () => {
    const item = await showOne();
    const close = item.querySelector<HTMLElement>("[data-close-button]")!;

    fireEvent.focusIn(close);
    expect(setToastPaused).toHaveBeenLastCalledWith("focus", true);

    fireEvent.focusOut(close, { relatedTarget: document.body });
    expect(setToastPaused).toHaveBeenLastCalledWith("focus", false);
  });

  it("clears both pauses when the toast under the pointer and the focus is removed", async () => {
    const item = await showOne();
    const close = item.querySelector<HTMLElement>("[data-close-button]")!;
    fireEvent.pointerOver(item);
    act(() => close.focus());
    setToastPaused.mockClear();

    act(() => {
      toast.dismiss();
    });

    await waitFor(() => {
      expect(setToastPaused).toHaveBeenCalledWith("pointer", false);
      expect(setToastPaused).toHaveBeenCalledWith("focus", false);
    });
    expect(setToastPaused).not.toHaveBeenCalledWith("pointer", true);
    expect(setToastPaused).not.toHaveBeenCalledWith("focus", true);
  });

  it("clears the pointer pause when the pointer is seen outside the stack", async () => {
    await showOne();
    const outside = document.body.appendChild(document.createElement("button"));
    setToastPaused.mockClear();

    fireEvent.pointerOver(outside);

    expect(setToastPaused).toHaveBeenCalledWith("pointer", false);
  });

  it("never starts a pause for pointer and focus outside the stack", async () => {
    await showOne();
    const outside = document.body.appendChild(document.createElement("button"));

    fireEvent.pointerOver(outside);
    fireEvent.focusIn(outside);

    expect(setToastPaused).not.toHaveBeenCalledWith(expect.anything(), true);
  });
});
