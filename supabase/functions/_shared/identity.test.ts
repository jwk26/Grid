import { describe, expect, it } from "vitest";
import { judgeAuthUser, sameIdentity } from "./identity.ts";

const ID = "3f2b8c1e-5a47-4d0e-9b6a-1c2d3e4f5a6b";

describe("judgeAuthUser", () => {
  it("lists the OAuth providers and provider user ids, and nothing else", () => {
    const r = judgeAuthUser({
      id: ID,
      identities: [{ provider: "google", id: "g-1" }, { provider: "email", id: ID }, { provider: "github", id: "42" }],
    });
    expect(r).toEqual({
      ok: true,
      identity: { user_id: ID, providers: [{ provider: "github", provider_user_id: "42" }, { provider: "google", provider_user_id: "g-1" }] },
    });
    expect(JSON.stringify(r)).not.toMatch(/@/);
  });
  it("refuses an anonymous user and one with no OAuth identity", () => {
    expect(judgeAuthUser({ id: ID, is_anonymous: true, identities: [{ provider: "github", id: "1" }] })).toEqual({ ok: false, code: "anonymous" });
    expect(judgeAuthUser({ id: ID, identities: [{ provider: "email", id: ID }] })).toEqual({ ok: false, code: "no_oauth_identity" });
    expect(judgeAuthUser({ id: ID, identities: null })).toEqual({ ok: false, code: "no_oauth_identity" });
  });
});

describe("sameIdentity", () => {
  const id = { user_id: ID, providers: [{ provider: "github", provider_user_id: "42" }, { provider: "google", provider_user_id: "g" }] };
  it("compares user id, providers and provider user ids, in any order", () => {
    expect(sameIdentity(JSON.stringify(id), id)).toBe(true);
    expect(sameIdentity(JSON.stringify({ ...id, providers: [...id.providers].reverse() }), id)).toBe(true);
  });
  it("is false for a missing, unreadable or different file", () => {
    expect(sameIdentity(null, id)).toBe(false);
    expect(sameIdentity("{not json", id)).toBe(false);
    expect(sameIdentity("[]", id)).toBe(false);
    expect(sameIdentity("null", id)).toBe(false);
    expect(sameIdentity(JSON.stringify({ user_id: ID, providers: [id.providers[0]] }), id)).toBe(false);
    expect(sameIdentity(JSON.stringify({ ...id, user_id: "x" }), id)).toBe(false);
    expect(sameIdentity(JSON.stringify({ ...id, providers: [{ provider: "github", provider_user_id: "43" }, id.providers[1]] }), id)).toBe(false);
  });
});
