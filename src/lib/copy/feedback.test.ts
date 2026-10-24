import { describe, expect, it } from "vitest";
import { createDialogNoEmptyCell } from "./feedback";

describe("createDialogNoEmptyCell", () => {
  it("names the target Node in the SPEC create-dialog sentence", () => {
    expect(createDialogNoEmptyCell("Roadmap")).toBe(
      "“Roadmap” has no empty cell. Move or delete an item to make room.",
    );
  });

  it("names Home for a Node created at L0", () => {
    expect(createDialogNoEmptyCell("Home")).toBe(
      "“Home” has no empty cell. Move or delete an item to make room.",
    );
  });
});
