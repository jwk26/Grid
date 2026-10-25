import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type TestUser = { id: string; email: string; password: string };

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set; run through pnpm test:db`);
  return value;
}

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };

export function adminClient(): SupabaseClient {
  return createClient(env("SUPABASE_TEST_URL"), env("SUPABASE_TEST_SECRET_KEY"), clientOptions);
}

// A per-run random suffix keeps emails unique, so the suite reruns without a reset.
export async function createTestUser(label: string): Promise<TestUser> {
  const email = `${label}-${randomUUID().slice(0, 8)}@test.local`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  return { id: data.user.id, email, password };
}

export async function signedInClient(user: TestUser): Promise<SupabaseClient> {
  const client = createClient(env("SUPABASE_TEST_URL"), env("SUPABASE_TEST_PUBLISHABLE_KEY"), clientOptions);
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error) throw new Error(`sign-in failed: ${error.message}`);
  return client;
}
