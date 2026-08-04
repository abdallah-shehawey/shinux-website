import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Runs on every request (Next.js 16 "proxy" convention, replaces middleware).
// Refreshes the Supabase auth session cookie so Server Components always see
// a valid (non-expired) session — required by @supabase/ssr's cookie-based
// auth flow.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // No auth cookie at all → nothing to refresh. Skipping the Supabase Auth
  // round trip here saves ~a network hop on EVERY anonymous page view.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
  if (!hasAuthCookie) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touching the session is what actually triggers the refresh.
  await supabase.auth.getUser();

  return response;
}

// Only the routes that actually read the session on the SERVER. This used to be
// a negated catch-all ("everything except static assets"), which meant the
// proxy ran on every page, every RSC flight and every prefetch — hundreds of
// billed invocations per visitor for a function that had nothing to do on all
// but a handful of them.
//
// Skipping the rest is safe because the proxy only *refreshes* an existing
// token: the refresh cookie survives untouched while someone reads articles,
// and the browser client (src/lib/supabase/client.ts, behind useSession)
// refreshes itself independently — so the header never goes stale either. The
// session is renewed the moment a route below is hit.
export const config = {
  matcher: [
    "/me/:path*",
    "/admin/:path*",
    "/ask/:path*",
    "/login/:path*",
    "/welcome/:path*",
    "/auth/:path*",
    // The question DETAIL page renders upvote/edit state per user. `:slug+`
    // requires at least one segment, so the (static) /questions listing itself
    // is left alone.
    "/questions/:slug+",
    "/api/render-markdown",
  ],
};
