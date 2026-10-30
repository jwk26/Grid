import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toastCopy, type ToastRow } from "@/lib/copy/feedback";

type Options = {
  id: string;
  duration: number;
  closeButton: boolean;
  icon?: unknown;
  onDismiss: () => void;
  onAutoClose: () => void;
};

const sonner = vi.hoisted(() => {
  const calls: { tone: string; text: string; options: Options }[] = [];
  const publish = (tone: string) =>
    vi.fn((text: string, options: Options) => {
      calls.push({ tone, text, options });
      return options.id;
    });
  return {
    calls,
    toast: {
      success: publish("success"),
      error: publish("failure"),
      warning: publish("warning"),
      dismiss: vi.fn(),
    },
  };
});

vi.mock("sonner", () => ({ toast: sonner.toast }));

import { resetToasts, setToastPaused, showToast } from "./toast";

const last = () => sonner.calls[sonner.calls.length - 1];
const dismissed = () => sonner.toast.dismiss.mock.calls.map(([id]) => id);

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", { configurable: true, value: hidden });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  vi.useFakeTimers();
  sonner.calls.length = 0;
  sonner.toast.dismiss.mockClear();
  resetToasts();
  setHidden(false);
});

afterEach(() => {
  vi.useRealTimers();
});

const rowOf = (key: string, tone: ToastRow["tone"] = "failure"): ToastRow =>
  ({ key, tone, single: () => `${key} single`, counted: (count) => `${key} x${count}` });

describe("showToast kinds", () => {
  it("publishes each tone through its sonner kind with the helper owning the time", () => {
    showToast(toastCopy.restoreSucceeded, "A");
    showToast(toastCopy.rolledBackMove, "B");
    showToast(toastCopy.offlineWrite);

    expect(sonner.calls.map((call) => call.tone)).toEqual(["success", "failure", "warning"]);
    for (const call of sonner.calls) expect(call.options.duration).toBe(Infinity);
  });

  it("gives failures and warnings a close button and successes none", () => {
    showToast(toastCopy.restoreSucceeded, "A");
    expect(last().options.closeButton).toBe(false);
    showToast(toastCopy.rolledBackMove, "B");
    expect(last().options.closeButton).toBe(true);
    showToast(toastCopy.offlineWrite);
    expect(last().options.closeButton).toBe(true);
  });

  it("carries the Wi-Fi icon on the offline write row only", () => {
    showToast(toastCopy.offlineWrite);
    expect(last().options.icon).toBeDefined();
    showToast(toastCopy.rolledBackMove, "A");
    expect(last().options.icon).toBeUndefined();
  });
});

describe("showToast bursts", () => {
  it("updates one toast to the counted form on a repeat of the same key", () => {
    showToast(toastCopy.rolledBackMove, "A");
    showToast(toastCopy.rolledBackEdit, "B");
    showToast(toastCopy.rolledBackCreate, "C");

    expect(sonner.calls).toHaveLength(3);
    expect(new Set(sonner.calls.map((call) => call.options.id)).size).toBe(1);
    expect(sonner.calls[0].text).toBe("Couldn't move “A”. It's back where it was.");
    expect(sonner.calls[1].text).toBe("Couldn't save 2 changes. They were put back.");
    expect(sonner.calls[2].text).toBe("Couldn't save 3 changes. They were put back.");
  });

  it("shows the latest single text for a key with no counted form", () => {
    showToast(toastCopy.moveIntoDescendant, "A");
    showToast(toastCopy.moveIntoDescendant, "B");

    expect(new Set(sonner.calls.map((call) => call.options.id)).size).toBe(1);
    expect(last().text).toBe("Couldn't move “B” into a Node inside it.");
  });

  it("never merges rows of different keys or tones", () => {
    showToast(toastCopy.restoreSucceeded, "A");
    showToast(toastCopy.permanentDeleteSucceeded, "B");

    expect(sonner.calls[0].options.id).not.toBe(sonner.calls[1].options.id);
    expect(sonner.calls[0].text).toBe("Restored “A”.");
    expect(sonner.calls[1].text).toBe("Deleted “B” permanently.");
  });

  it("starts the count again once the toast has left", () => {
    showToast(toastCopy.rolledBackMove, "A");
    showToast(toastCopy.rolledBackMove, "B");
    vi.advanceTimersByTime(6000);
    showToast(toastCopy.rolledBackMove, "C");

    expect(last().text).toBe("Couldn't move “C”. It's back where it was.");
    expect(last().options.id).not.toBe(sonner.calls[0].options.id);
  });

  it("starts the count again after the close button", () => {
    showToast(toastCopy.rolledBackMove, "A");
    last().options.onDismiss();
    showToast(toastCopy.rolledBackMove, "B");

    expect(last().text).toBe("Couldn't move “B”. It's back where it was.");
  });

  it("lets at most three kinds live and dismisses the oldest for a fourth", () => {
    showToast(rowOf("a"));
    showToast(rowOf("b"));
    showToast(rowOf("c"));
    expect(sonner.toast.dismiss).not.toHaveBeenCalled();

    showToast(rowOf("d"));
    expect(dismissed()).toEqual([sonner.calls[0].options.id]);

    showToast(rowOf("e"));
    expect(dismissed()).toEqual([sonner.calls[0].options.id, sonner.calls[1].options.id]);
  });

  it("does not count a kind that was dismissed for room as a live repeat", () => {
    showToast(rowOf("a"));
    showToast(rowOf("b"));
    showToast(rowOf("c"));
    showToast(rowOf("d"));
    showToast(rowOf("a"));

    expect(last().text).toBe("a single");
  });
});

describe("showToast timing", () => {
  it("closes a success at 4 seconds", () => {
    showToast(toastCopy.restoreSucceeded, "A");
    vi.advanceTimersByTime(3999);
    expect(sonner.toast.dismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(dismissed()).toEqual([last().options.id]);
  });

  it("closes a failure and a warning at 6 seconds", () => {
    showToast(toastCopy.rolledBackMove, "A");
    showToast(toastCopy.offlineWrite);
    vi.advanceTimersByTime(5999);
    expect(sonner.toast.dismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(sonner.toast.dismiss).toHaveBeenCalledTimes(2);
  });

  it("restarts the time on a repeat", () => {
    showToast(toastCopy.rolledBackMove, "A");
    vi.advanceTimersByTime(5000);
    showToast(toastCopy.rolledBackMove, "B");
    vi.advanceTimersByTime(5000);
    expect(sonner.toast.dismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(sonner.toast.dismiss).toHaveBeenCalledTimes(1);
  });

  it("runs each kind on its own clock", () => {
    showToast(toastCopy.restoreSucceeded, "A");
    vi.advanceTimersByTime(2000);
    showToast(toastCopy.rolledBackMove, "B");
    vi.advanceTimersByTime(2000);
    expect(dismissed()).toEqual([sonner.calls[0].options.id]);
  });

  it("pauses while the pointer is over the stack and resumes the remaining time", () => {
    showToast(toastCopy.restoreSucceeded, "A");
    vi.advanceTimersByTime(3000);
    setToastPaused("pointer", true);
    vi.advanceTimersByTime(60_000);
    expect(sonner.toast.dismiss).not.toHaveBeenCalled();
    setToastPaused("pointer", false);
    vi.advanceTimersByTime(999);
    expect(sonner.toast.dismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(sonner.toast.dismiss).toHaveBeenCalledTimes(1);
  });

  it("pauses while focus is inside the stack", () => {
    showToast(toastCopy.rolledBackMove, "A");
    setToastPaused("focus", true);
    vi.advanceTimersByTime(60_000);
    expect(sonner.toast.dismiss).not.toHaveBeenCalled();
    setToastPaused("focus", false);
    vi.advanceTimersByTime(6000);
    expect(sonner.toast.dismiss).toHaveBeenCalledTimes(1);
  });

  it("stays paused until every reason has ended", () => {
    showToast(toastCopy.rolledBackMove, "A");
    setToastPaused("pointer", true);
    setToastPaused("focus", true);
    setToastPaused("pointer", false);
    vi.advanceTimersByTime(60_000);
    expect(sonner.toast.dismiss).not.toHaveBeenCalled();
  });

  it("pauses while the tab is hidden", () => {
    showToast(toastCopy.rolledBackMove, "A");
    vi.advanceTimersByTime(2000);
    setHidden(true);
    vi.advanceTimersByTime(60_000);
    expect(sonner.toast.dismiss).not.toHaveBeenCalled();
    setHidden(false);
    vi.advanceTimersByTime(4000);
    expect(sonner.toast.dismiss).toHaveBeenCalledTimes(1);
  });

  it("starts a toast shown in a hidden tab only when the tab returns", () => {
    setHidden(true);
    showToast(toastCopy.rolledBackMove, "A");
    vi.advanceTimersByTime(60_000);
    expect(sonner.toast.dismiss).not.toHaveBeenCalled();
    setHidden(false);
    vi.advanceTimersByTime(6000);
    expect(sonner.toast.dismiss).toHaveBeenCalledTimes(1);
  });
});
