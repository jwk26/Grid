import { describe, expect, it } from "vitest";
import { findCollisions, findOldOwners, parseIdentityRows, pickOldOwner, planCopy, sameBucket } from "./plan";

const OLD = "11111111-1111-4111-8111-111111111111";
const OLD2 = "33333333-3333-4333-8333-333333333333";
const NEW = "22222222-2222-4222-8222-222222222222";
const idFile = (uid: string, providers: unknown, keyUid = uid) => ({
  key: `accounts/${keyUid}/identity.json`,
  text: JSON.stringify({ user_id: uid, providers }),
});
const google = [{ provider: "google", provider_user_id: "g-1" }];

describe("findOldOwners", () => {
  it("matches on provider and provider user id", () => {
    expect(findOldOwners([{ provider: "google", id: "g-1" }], [idFile(OLD, google)], NEW)).toEqual([OLD]);
  });
  it("does not match the same id under another provider", () => {
    expect(findOldOwners([{ provider: "github", id: "g-1" }], [idFile(OLD, google)], NEW)).toEqual([]);
  });
  it("does not match a different id", () => {
    expect(findOldOwners([{ provider: "google", id: "g-2" }], [idFile(OLD, google)], NEW)).toEqual([]);
  });
  it("ignores a file whose user_id differs from its key", () => {
    expect(findOldOwners([{ provider: "google", id: "g-1" }], [idFile(OLD, google, OLD2)], NEW)).toEqual([]);
  });
  it("never offers the new user id", () => {
    expect(findOldOwners([{ provider: "google", id: "g-1" }], [idFile(NEW, google)], NEW)).toEqual([]);
  });
  it("ignores unreadable text and keys that are not identity.json", () => {
    const files = [
      { key: `accounts/${OLD}/identity.json`, text: "{nope" },
      { key: `accounts/${OLD2}/2026-11-07.json.gz`, text: JSON.stringify({ user_id: OLD2, providers: google }) },
    ];
    expect(findOldOwners([{ provider: "google", id: "g-1" }], files, NEW)).toEqual([]);
  });
  it("lists two owners sorted and unique", () => {
    const files = [idFile(OLD2, google), idFile(OLD, google), idFile(OLD, google)];
    expect(findOldOwners([{ provider: "google", id: "g-1" }], files, NEW)).toEqual([OLD, OLD2]);
  });
});

describe("pickOldOwner", () => {
  it("returns the one owner", () => expect(pickOldOwner([OLD])).toBe(OLD));
  it("refuses none and many with the count only", () => {
    expect(() => pickOldOwner([])).toThrow("found 0");
    expect(() => pickOldOwner([OLD, OLD2])).toThrow("found 2");
    expect(() => pickOldOwner([OLD, OLD2])).not.toThrow(OLD);
  });
});

describe("planCopy", () => {
  const keys = [
    `accounts/${OLD}/identity.json`,
    `accounts/${OLD}/2026-11-06.json.gz`,
    `accounts/${OLD}/2026-11-07.json.gz`,
    `accounts/${OLD}/pre-restore/2026-11-07T01-02-03Z.json.gz`,
    `accounts/${OLD2}/2026-11-07.json.gz`,
    `accounts/${OLD}/notes.txt`,
  ];
  it("copies dated slots only by default, mapped to the new prefix", () => {
    expect(planCopy(OLD, NEW, keys)).toEqual([
      { from: `accounts/${OLD}/2026-11-06.json.gz`, to: `accounts/${NEW}/2026-11-06.json.gz` },
      { from: `accounts/${OLD}/2026-11-07.json.gz`, to: `accounts/${NEW}/2026-11-07.json.gz` },
    ]);
  });
  it("adds pre-restore files only with the flag", () => {
    const plan = planCopy(OLD, NEW, keys, true);
    expect(plan.map((p) => p.to)).toContain(`accounts/${NEW}/pre-restore/2026-11-07T01-02-03Z.json.gz`);
    expect(plan).toHaveLength(3);
  });
  it("never copies identity.json, another account's key or a stranger", () => {
    const froms = planCopy(OLD, NEW, keys, true).map((p) => p.from);
    expect(froms.some((k) => k.endsWith("identity.json") || k.includes(OLD2) || k.endsWith("notes.txt"))).toBe(false);
  });
  it("refuses the same old and new id", () => {
    expect(() => planCopy(OLD, OLD, keys)).toThrow("same prefix");
  });
  it("refuses an empty plan", () => {
    expect(() => planCopy(OLD, NEW, [`accounts/${OLD}/identity.json`])).toThrow("no backup file");
  });
});

describe("findCollisions", () => {
  const plan = planCopy(OLD, NEW, [`accounts/${OLD}/2026-11-06.json.gz`, `accounts/${OLD}/2026-11-07.json.gz`]);
  it("reports target keys that exist", () => {
    expect(findCollisions(plan, [`accounts/${NEW}/2026-11-07.json.gz`])).toEqual([`accounts/${NEW}/2026-11-07.json.gz`]);
  });
  it("reports none when the target is empty or holds other keys", () => {
    expect(findCollisions(plan, [])).toEqual([]);
    expect(findCollisions(plan, [`accounts/${NEW}/2026-01-01.json.gz`])).toEqual([]);
  });
});

describe("sameBucket", () => {
  const a = { endpoint: "https://acc.r2.cloudflarestorage.com", bucket: "prod" };
  it("is true for the same host and bucket", () => expect(sameBucket(a, { ...a, endpoint: "https://ACC.r2.cloudflarestorage.com/" })).toBe(true));
  it("is false for another bucket or another host", () => {
    expect(sameBucket(a, { ...a, bucket: "drill" })).toBe(false);
    expect(sameBucket(a, { ...a, endpoint: "https://other.r2.cloudflarestorage.com" })).toBe(false);
  });
});

describe("parseIdentityRows", () => {
  const row = { provider: "google", id: "g-1", user_id: NEW };
  it("returns the provider and id of rows that name the new user", () => {
    expect(parseIdentityRows([row], NEW)).toEqual([{ provider: "google", id: "g-1" }]);
  });
  it("refuses a row of another user, even among good rows", () => {
    expect(() => parseIdentityRows([row, { ...row, user_id: OLD }], NEW)).toThrow("another user");
  });
  it("refuses a row without a user_id, a provider or an id", () => {
    expect(() => parseIdentityRows([{ provider: "google", id: "g-1" }], NEW)).toThrow("needs provider, id and user_id");
    expect(() => parseIdentityRows([{ ...row, id: 1 }], NEW)).toThrow("needs provider");
  });
  it("refuses a file that is not a non-empty array", () => {
    expect(() => parseIdentityRows([], NEW)).toThrow("non-empty");
    expect(() => parseIdentityRows({ ...row }, NEW)).toThrow("non-empty");
  });
});
