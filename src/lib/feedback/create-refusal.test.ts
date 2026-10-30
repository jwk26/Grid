import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { WriteOfflineError, WriteOutcomeUnknownError, WriteRejectedError } from "@/lib/db/write-errors";
import { classifyCreateRefusal } from "./create-refusal";

describe("classifyCreateRefusal", () => {
  it("stays on the dialog, with no line, for an offline attempt", () => {
    expect(classifyCreateRefusal(new WriteOfflineError(), "A")).toEqual({ outcome: "stay" });
  });

  it("names the limit for an account-limit refusal", () => {
    const error = new WriteRejectedError("account_limit", { code: "account_limit", table: "bits", limit: 500 });
    expect(classifyCreateRefusal(error, "A")).toEqual({
      outcome: "line",
      text: "This account has reached its limit of 500 Bits.",
    });
  });

  it("gives any other refusal the try-again line with the typed title", () => {
    const error = new WriteRejectedError("cell_taken", { code: "cell_taken" });
    expect(classifyCreateRefusal(error, "A")).toEqual({
      outcome: "line",
      text: "Couldn't create “A”. Try again.",
    });
  });

  it("shows the line when an unknown outcome was rolled back or is not known", () => {
    for (const kept of [false, null]) {
      expect(classifyCreateRefusal(new WriteOutcomeUnknownError(kept), "A")).toEqual({
        outcome: "line",
        text: "Couldn't create “A”. Try again.",
      });
    }
  });

  it("closes the dialog when the unknown outcome was kept", () => {
    expect(classifyCreateRefusal(new WriteOutcomeUnknownError(true), "A")).toEqual({ outcome: "kept" });
  });

  it("gives an API error the try-again line, never its raw message", () => {
    expect(classifyCreateRefusal(new Error("create_bit failed: JWT expired"), "A")).toEqual({
      outcome: "line",
      text: "Couldn't create “A”. Try again.",
    });
  });

  it("leaves a validation error to the caller", () => {
    const error = new ZodError([]);
    expect(classifyCreateRefusal(error, "A")).toEqual({ outcome: "other", error });
  });
});
