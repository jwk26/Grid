import { describe, expect, it } from "vitest";
import { OFFLINE_WRITE_ATTEMPT, createDialogNoEmptyCell } from "./feedback";

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

describe("OFFLINE_WRITE_ATTEMPT", () => {
  it("is the SPEC offline write-attempt sentence under one fixed toast id", () => {
    expect(OFFLINE_WRITE_ATTEMPT).toEqual({
      id: "offline-write-attempt",
      single: "You're offline. Changes can't be saved right now.",
    });
  });
});
