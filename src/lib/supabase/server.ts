import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Supabase client for Server Components / Route Handlers / Server Actions.
// Reads the session from the request's cookies. Per spec §2: any sensitive
// read/write goes through server code like this, never straight from the
// browser, even though RLS is also enforced at the database level.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component that can't set cookies — safe to
            // ignore as long as the proxy (src/proxy.ts) is refreshing the
            // session on every request.
          }
        },
      },
    },
  );
}
