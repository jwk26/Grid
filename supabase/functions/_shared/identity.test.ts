import { describe, expect, it } from "vitest";
import { judgeAuthUser } from "./identity.ts";

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
