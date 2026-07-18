import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

// Cookie-free Supabase client for PUBLIC reads only (the *_public views and
// other anon-readable tables). Unlike src/lib/supabase/server.ts it never
// touches cookies(), so it is allowed inside unstable_cache() — that's what
// lets whole question threads live in the Next data cache. Never use it for
// anything session-scoped.
let anonClient: SupabaseClient | null = null;

export function createAnonClient(): SupabaseClient {
  anonClient ??= createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return anonClient;
}
