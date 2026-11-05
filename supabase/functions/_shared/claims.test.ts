import { describe, expect, it } from "vitest";
import { bearerToken, judgeClaims } from "./claims.ts";

const ID = "3f2b8c1e-5a47-4d0e-9b6a-1c2d3e4f5a6b";

describe("judgeClaims", () => {
  it("takes the user id from sub of an authenticated user", () => {
    expect(judgeClaims({ sub: ID, role: "authenticated" })).toEqual({ ok: true, userId: ID });
    expect(judgeClaims({ sub: ID, role: "authenticated", is_anonymous: false })).toEqual({ ok: true, userId: ID });
  });
  it("refuses a guest with 403 before anything else", () => {
    expect(judgeClaims({ sub: ID, role: "authenticated", is_anonymous: true })).toEqual({ ok: false, status: 403, code: "guest" });
    expect(judgeClaims({ is_anonymous: true })).toMatchObject({ status: 403 });
  });
  it("refuses missing claims, the anon and service roles, and a bad sub", () => {
    expect(judgeClaims(null)).toMatchObject({ ok: false, status: 401 });
    expect(judgeClaims({ role: "anon" })).toMatchObject({ ok: false, status: 401 });
    expect(judgeClaims({ sub: ID, role: "service_role" })).toMatchObject({ ok: false, status: 401 });
    expect(judgeClaims({ sub: "x", role: "authenticated" })).toMatchObject({ ok: false, status: 401 });
    expect(judgeClaims({ role: "authenticated" })).toMatchObject({ ok: false, status: 401 });
  });
});

describe("bearerToken", () => {
  it("reads a bearer token only", () => {
    expect(bearerToken("Bearer abc.def")).toBe("abc.def");
    expect(bearerToken("bearer abc")).toBe("abc");
    expect(bearerToken("Basic abc")).toBeNull();
    expect(bearerToken(null)).toBeNull();
  });
});
