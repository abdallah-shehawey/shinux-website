/**
 * Sanitises the `?next=` destination used across the sign-in flow
 * (/login → OAuth/magic link → /auth/callback → /welcome).
 *
 * Only same-origin paths are allowed. Without this, `next` was an open
 * redirect: the callback builds `${origin}${next}`, so `next=.evil.com` or
 * `next=@evil.com` lands a freshly signed-in user on another host, and
 * redirect("//evil.com") / redirect("https://evil.com") from /login and
 * /welcome did the same.
 */
export function safeNext(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  // Must be a single-slash absolute path: rejects "https://…", "//host",
  // "/\host" (browsers treat "\" as "/"), ".host", "@host", etc.
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  // Backslashes and control characters (tab/newline are stripped by URL
  // parsers, so "/\t/evil.com" would collapse to "//evil.com").
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return fallback;
  return raw;
}
