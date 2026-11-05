import { describe, expect, it } from "vitest";
import { constantTimeEqual, secretMatches, secretMissing } from "./secret.ts";

describe("secret", () => {
  it("counts unset, empty and env(...) values as missing", () => {
    expect(secretMissing(undefined)).toBe(true);
    expect(secretMissing("")).toBe(true);
    expect(secretMissing("env(BACKUP_SHARED_SECRET)")).toBe(true);
    expect(secretMissing("abc")).toBe(false);
  });
  it("compares equal and unequal strings, including different lengths", () => {
    expect(constantTimeEqual("abc", "abc")).toBe(true);
    expect(constantTimeEqual("abc", "abd")).toBe(false);
    expect(constantTimeEqual("abc", "abcd")).toBe(false);
    expect(constantTimeEqual("", "a")).toBe(false);
  });
  it("matches only a set secret", () => {
    expect(secretMatches("s", "s")).toBe(true);
    expect(secretMatches(null, "s")).toBe(false);
    expect(secretMatches("env(X)", "env(X)")).toBe(false);
    expect(secretMatches("", "")).toBe(false);
    expect(secretMatches("x", undefined)).toBe(false);
  });
});
