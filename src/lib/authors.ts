import "server-only";
import { unstable_cache } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";
import { getContentHandleOwners } from "@/lib/content-handles";
import type { Author } from "@/lib/site";

// Resolves an article/lesson frontmatter `author: <username>` into a real,
// live profile (display name + avatar) via the public.profiles_public view —
// see supabase/migrations/0008_public_profiles.sql.
//
// Deliberately NOT the older author_profiles view (0006): that one is scoped
// to `role = 'admin'`, so lessons contributed by non-admins resolved to
// nothing and lost their byline. Tutorials are no longer admin-only.
//
// Cookie-free + cached on purpose: this runs inside statically generated
// article/tutorial pages, so it must never touch cookies() (that would force
// them dynamic). Authors are a handful of admins, so one cached fetch of the
// whole view replaces per-page .in() queries. Profile edits bust the tag via
// revalidateAuthorCaches(); `revalidate` is only a backstop.
const getAllAuthorProfiles = unstable_cache(
  async (): Promise<Record<string, Author>> => {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("profiles_public")
      .select("username, display_name, avatar_url");
    if (error || !data) return {};

    const map: Record<string, Author> = {};
    for (const row of data) {
      map[row.username] = {
        name: row.display_name || row.username,
        username: row.username,
        avatar: row.avatar_url ?? undefined,
      };
    }
    return map;
  },
  ["author-profiles"],
  // 1h, not 300s: this revalidate propagates to every SSG article/lesson
  // route that uses it, and each expiry makes some visitor pay a full
  // re-render. App-side profile edits already bust the tag immediately; the
  // hourly pass only covers edits made straight in the Supabase dashboard.
  { revalidate: 3600, tags: ["authors"] },
);

/**
 * Byline for a username with no profile row yet (contributor who hasn't
 * signed in). Shows the raw handle — mis-attributing their work to the site
 * owner would be worse than an un-prettified name.
 */
export function unresolvedAuthor(username: string): Author {
  return { name: username, username };
}

/**
 * Batch lookup — one query for every distinct username on a listing page.
 * Every requested username gets an entry: unknown ones fall back to
 * unresolvedAuthor(), so a card never silently drops its byline.
 */
export async function getAuthorProfiles(usernames: string[]): Promise<Record<string, Author>> {
  const unique = [...new Set(usernames)].filter(Boolean);
  if (unique.length === 0) return {};

  const all = await resolvableAuthors();
  const map: Record<string, Author> = {};
  for (const username of unique) {
    map[username] = all[username] ?? unresolvedAuthor(username);
  }
  return map;
}

/**
 * Live usernames, then released handles layered on top.
 *
 * The overlay wins deliberately. Once a handle has been released it is free for
 * anyone to claim, so it can be BOTH a live username (its new holder) and a
 * frontmatter credit (its original author). A byline is a statement about who
 * wrote the file, so it has to resolve to the account that released the handle —
 * otherwise renaming would hand every article ever written under that handle to
 * whoever grabbed it next.
 *
 * Either way the Author carries the resolved account's CURRENT username, so the
 * byline links to where that person lives today, not to the handle in the file.
 */
async function resolvableAuthors(): Promise<Record<string, Author>> {
  const [live, released] = await Promise.all([
    getAllAuthorProfiles(),
    getContentHandleOwners(),
  ]);

  const map: Record<string, Author> = { ...live };
  for (const owner of released) {
    map[owner.handle] = {
      name: owner.displayName,
      username: owner.username,
      avatar: owner.avatarUrl ?? undefined,
    };
  }
  return map;
}

/**
 * Single lookup. Returns null when the username has no profile row, so each
 * caller picks its own fallback — the site's own pages want the hardcoded
 * siteAuthor (full display name), a lesson byline wants unresolvedAuthor().
 */
export async function getAuthorProfile(username: string): Promise<Author | null> {
  const all = await resolvableAuthors();
  return all[username] ?? null;
}
