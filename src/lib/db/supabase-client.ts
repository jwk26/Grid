import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";

// The browser client (SPEC Environments And Hosting): the project URL and the publishable key
// are public env vars, and supabase-js persists the session in the browser. The secret key never
// enters client code.

export type GriddoSupabaseClient = SupabaseClient<Database>;

let client: GriddoSupabaseClient | null = null;

export function getSupabaseClient(): GriddoSupabaseClient {
  if (client) return client;
  // Read literally so Next inlines the public values into the client bundle.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.local.example).",
    );
  }
  client = createClient<Database>(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}

// For tests: the next getSupabaseClient() builds a new client.
export function resetSupabaseClientForTests(): void {
  client = null;
}
