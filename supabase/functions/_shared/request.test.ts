import { describe, expect, it } from "vitest";
import { parseRequest, readMode } from "./request.ts";

const ID = "3f2b8c1e-5a47-4d0e-9b6a-1c2d3e4f5a6b";
const OTHER = "11111111-1111-4111-8111-111111111111";

describe("parseRequest", () => {
  it("reads the mode", () => {
    expect(readMode({ mode: "manual" })).toBe("manual");
    expect(readMode({ mode: "restore" })).toBe("restore");
    expect(readMode({ mode: "nope" })).toBeNull();
    expect(readMode(null)).toBeNull();
    expect(readMode("manual")).toBeNull();
  });
  it("scheduled needs a lowercase uuid user_id", () => {
    expect(parseRequest({ mode: "scheduled", user_id: ID })).toEqual({ ok: true, mode: "scheduled", userId: ID });
    expect(parseRequest({ mode: "scheduled" })).toEqual({ ok: false, code: "bad_user_id" });
    expect(parseRequest({ mode: "scheduled", user_id: ID.toUpperCase() })).toMatchObject({ ok: false });
  });
  it("manual takes run_id and never a user id from the body", () => {
    const r = parseRequest({ mode: "manual", run_id: ID, user_id: OTHER });
    expect(r).toEqual({ ok: true, mode: "manual", runId: ID });
    expect(parseRequest({ mode: "manual" })).toEqual({ ok: false, code: "bad_run_id" });
  });
  it("restore takes a restore id and a list name, never an object key", () => {
    expect(parseRequest({ mode: "restore", restore_id: ID, file: "2026-11-07" })).toEqual({
      ok: true, mode: "restore", restoreId: ID, file: "2026-11-07",
    });
    expect(parseRequest({ mode: "restore", restore_id: ID, file: "pre-restore/2026-11-07T12-30-05Z" })).toMatchObject({ ok: true });
    for (const file of ["accounts/x/2026-11-07.json.gz", "../2026-11-07", "2026-13-40", "identity.json", "", 5, undefined]) {
      expect(parseRequest({ mode: "restore", restore_id: ID, file })).toEqual({ ok: false, code: "bad_file" });
    }
    expect(parseRequest({ mode: "restore", restore_id: "nope", file: "2026-11-07" })).toEqual({ ok: false, code: "bad_restore_id" });
    expect(parseRequest({ mode: "restore", file: "2026-11-07" })).toEqual({ ok: false, code: "bad_restore_id" });
  });

  it("status takes an optional restore_id beside run_id", () => {
    expect(parseRequest({ mode: "status", restore_id: ID })).toEqual({ ok: true, mode: "status", runId: null, restoreId: ID });
    expect(parseRequest({ mode: "status", restore_id: 5 })).toEqual({ ok: false, code: "bad_restore_id" });
  });

  it("status takes an optional run_id", () => {
    expect(parseRequest({ mode: "status" })).toEqual({ ok: true, mode: "status", runId: null, restoreId: null });
    expect(parseRequest({ mode: "status", run_id: ID })).toEqual({ ok: true, mode: "status", runId: ID, restoreId: null });
    expect(parseRequest({ mode: "status", run_id: 5 })).toMatchObject({ ok: false });
  });
  it("summary needs missing and as_of", () => {
    expect(parseRequest({ mode: "summary", missing: 0, as_of: 5 })).toEqual({ ok: true, mode: "summary", missing: 0, asOf: 5 });
    expect(parseRequest({ mode: "summary", missing: -1, as_of: 5 })).toMatchObject({ ok: false });
    expect(parseRequest({ mode: "summary", missing: 1 })).toMatchObject({ ok: false });
  });
});
