import { describe, expect, it } from "vitest";
import { createTestUser, signedInClient } from "./helpers/users";

describe("local Supabase smoke", () => {
  it("creates two test users that both sign in", async () => {
    const a = await createTestUser("a");
    const b = await createTestUser("b");
    expect(a.id).not.toBe(b.id);

    for (const user of [a, b]) {
      const client = await signedInClient(user);
      const { data, error } = await client.auth.getUser();
      expect(error).toBeNull();
      expect(data.user?.id).toBe(user.id);
    }
  });
});
