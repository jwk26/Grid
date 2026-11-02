import { afterEach, describe, expect, it } from "vitest";
import { resetAppForUserChange, takeHomeReturn } from "@/lib/auth/user-change";
import { useTriageStore } from "@/stores/triage-store";

afterEach(() => {
  takeHomeReturn();
  useTriageStore.getState().resetAppSession();
});

describe("resetAppForUserChange", () => {
  it("resets the Inbox app session, so the new user enters through the selection fallback", () => {
    useTriageStore.getState().selectScratch("scratch-of-the-old-user");
    resetAppForUserChange();
    expect(useTriageStore.getState().selectedScratchId).toBeNull();
  });

  it("asks for one return to Home, taken once", () => {
    expect(takeHomeReturn()).toBe(false);
    resetAppForUserChange();
    expect(takeHomeReturn()).toBe(true);
    expect(takeHomeReturn()).toBe(false);
  });
});
