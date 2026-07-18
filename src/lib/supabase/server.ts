import { cache } from "react";
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

// Request-deduped auth lookup: the Header, pages and generateMetadata all
// share ONE Supabase Auth round trip per request instead of each paying their
// own. Anonymous visitors (no auth cookie at all) skip the network entirely.
export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const hasAuthCookie = cookieStore
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
  if (!hasAuthCookie) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
