import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseClient, resetSupabaseClientForTests } from "@/lib/db/supabase-client";

afterEach(() => {
  vi.unstubAllEnvs();
  resetSupabaseClientForTests();
});

describe("getSupabaseClient", () => {
  it("throws a clear error when the public env vars are missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(() => getSupabaseClient()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("builds one client and reuses it", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    const first = getSupabaseClient();
    expect(getSupabaseClient()).toBe(first);
  });
});
