import { describe, expect, it } from "vitest";
import { accountPrefix, backupObjectKey, identityKey, parseBackupKey } from "./object-key.ts";

const ID = "3f2b8c1e-5a47-4d0e-9b6a-1c2d3e4f5a6b";

describe("backupObjectKey", () => {
  it("builds a key under the account's own prefix with the UTC date", () => {
    expect(backupObjectKey(ID, new Date("2026-11-05T12:00:00Z"))).toBe(
      `accounts/${ID}/2026-11-05.json.gz`,
    );
  });

  it("uses the UTC date at the boundary (09:00 KST is 00:00 UTC)", () => {
    // 2026-11-05 09:00 KST == 2026-11-05 00:00 UTC
    expect(backupObjectKey(ID, new Date("2026-11-05T09:00:00+09:00"))).toBe(
      `accounts/${ID}/2026-11-05.json.gz`,
    );
    // 2026-11-05 08:59 KST == 2026-11-04 23:59 UTC
    expect(backupObjectKey(ID, new Date("2026-11-05T08:59:59+09:00"))).toBe(
      `accounts/${ID}/2026-11-04.json.gz`,
    );
  });

  it("maps two runs on the same UTC day to the same key", () => {
    expect(backupObjectKey(ID, new Date("2026-11-05T00:00:00Z"))).toBe(
      backupObjectKey(ID, new Date("2026-11-05T23:59:59Z")),
    );
  });

  it("refuses anything that is not a lowercase UUID or a valid date", () => {
    const at = new Date("2026-11-05T00:00:00Z");
    expect(() => backupObjectKey("../other", at)).toThrow();
    expect(() => backupObjectKey(ID.toUpperCase(), at)).toThrow();
    expect(() => backupObjectKey(ID, new Date("nope"))).toThrow();
  });
});

describe("account keys", () => {
  it("builds the prefix and the identity key", () => {
    expect(accountPrefix(ID)).toBe(`accounts/${ID}/`);
    expect(identityKey(ID)).toBe(`accounts/${ID}/identity.json`);
    expect(() => accountPrefix("x")).toThrow();
  });
  it("parses only dated keys of the same account", () => {
    expect(parseBackupKey(ID, `accounts/${ID}/2026-11-05.json.gz`)).toBe("2026-11-05");
    expect(parseBackupKey(ID, `accounts/${ID}/identity.json`)).toBeNull();
    expect(parseBackupKey(ID, `accounts/${ID}/pre-restore/2026-11-05.json.gz`)).toBeNull();
    expect(parseBackupKey(ID, `accounts/${ID}/2026-02-30.json.gz`)).toBeNull();
    expect(parseBackupKey(ID, "accounts/11111111-1111-4111-8111-111111111111/2026-11-05.json.gz")).toBeNull();
  });
});
