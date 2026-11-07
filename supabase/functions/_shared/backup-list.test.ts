import { describe, expect, it } from "vitest";
import { buildBackupList, isBackupName, resolveBackupName } from "./backup-list.ts";

const ID = "3f2b8c1e-5a47-4d0e-9b6a-1c2d3e4f5a6b";
const OTHER = "11111111-1111-4111-8111-111111111111";
const p = `accounts/${ID}/`;

describe("buildBackupList", () => {
  it("lists date slots and pre-restore files newest first by their real time", () => {
    const list = buildBackupList(ID, [
      { key: `${p}2026-11-05.json.gz`, size: 10, lastModified: Date.parse("2026-11-05T03:00:12Z"), etag: "e5" },
      { key: `${p}identity.json`, size: 1 },
      { key: `${p}pre-restore/2026-11-06T09-30-00Z.json.gz`, size: 20, lastModified: Date.parse("2026-11-06T09:30:01Z"), etag: "e6" },
      { key: `${p}2026-11-07.json.gz`, size: 30, lastModified: Date.parse("2026-11-07T03:00:00Z"), etag: "e7" },
      { key: `accounts/${OTHER}/2026-11-08.json.gz`, size: 40 },
    ]);
    expect(list).toEqual([
      { name: "2026-11-07", kind: "daily", at: Date.parse("2026-11-07T03:00:00Z"), size: 30, etag: "e7" },
      { name: "pre-restore/2026-11-06T09-30-00Z", kind: "pre_restore", at: Date.parse("2026-11-06T09:30:01Z"), size: 20, etag: "e6" },
      { name: "2026-11-05", kind: "daily", at: Date.parse("2026-11-05T03:00:12Z"), size: 10, etag: "e5" },
    ]);
  });

  it("falls back to the time in the name when storage gives no last-modified", () => {
    const list = buildBackupList(ID, [
      { key: `${p}2026-11-05.json.gz`, size: 1 },
      { key: `${p}pre-restore/2026-11-05T12-00-00Z.json.gz`, size: 2 },
    ]);
    expect(list.map((e) => [e.name, e.at])).toEqual([
      ["pre-restore/2026-11-05T12-00-00Z", Date.parse("2026-11-05T12:00:00Z")],
      ["2026-11-05", Date.parse("2026-11-05T00:00:00Z")],
    ]);
  });
});

describe("resolveBackupName", () => {
  it("maps a list name to a key inside the account's own prefix", () => {
    expect(resolveBackupName(ID, "2026-11-07")).toBe(`${p}2026-11-07.json.gz`);
    expect(resolveBackupName(ID, "pre-restore/2026-11-07T12-30-05Z")).toBe(`${p}pre-restore/2026-11-07T12-30-05Z.json.gz`);
  });

  it("refuses an object key, a path, an impossible date and anything else", () => {
    for (const n of [`${p}2026-11-07.json.gz`, "../x", "2026-02-30", "2026-13-01", "identity.json", "pre-restore/../x",
      "pre-restore/2026-11-07T25-00-00Z", "", null, 5]) {
      expect(resolveBackupName(ID, n)).toBeNull();
    }
  });

  it("isBackupName accepts the same shapes", () => {
    expect(isBackupName("2026-11-07")).toBe(true);
    expect(isBackupName("pre-restore/2026-11-07T12-30-05Z")).toBe(true);
    expect(isBackupName("2026-02-30")).toBe(false);
    expect(isBackupName("accounts/x")).toBe(false);
  });
});
