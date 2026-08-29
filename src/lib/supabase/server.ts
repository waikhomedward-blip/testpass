import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service role key. This file must
// never be imported from a Client Component — it holds a key that bypasses
// Row Level Security. All database access in this app goes through server
// code (Route Handlers / Server Components) for exactly that reason: the
// browser never talks to Supabase directly.

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new SupabaseNotConfiguredError();
  }

  cached = createClient(url, key, {
    auth: { persistSession: false },
  });
  return cached;
}

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Supabase isn't configured yet. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment."
    );
    this.name = "SupabaseNotConfiguredError";
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
