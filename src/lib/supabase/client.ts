import { createBrowserClient } from "@supabase/ssr";

// Supabase client for Client Components. Uses the public URL + anon key
// (safe to expose — access is enforced by RLS, not by keeping this secret).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
