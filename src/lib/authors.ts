import "server-only";
import { unstable_cache } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";
import type { Author } from "@/lib/site";

// Resolves an article frontmatter `author: <username>` into a real, live
// profile (display name + avatar) via the public.author_profiles view — see
// supabase/migrations/0006_author_profiles.sql. Scoped to admins, since
// articles are still admin-authored (Linux-site-spec.md §1).
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
      .from("author_profiles")
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

/** Batch lookup — one query for every distinct username on a listing page. */
export async function getAuthorProfiles(usernames: string[]): Promise<Record<string, Author>> {
  const unique = [...new Set(usernames)].filter(Boolean);
  if (unique.length === 0) return {};

  const all = await getAllAuthorProfiles();
  const map: Record<string, Author> = {};
  for (const username of unique) {
    if (all[username]) map[username] = all[username];
  }
  return map;
}

/** Single lookup, for an article's own detail page. */
export async function getAuthorProfile(username: string): Promise<Author | null> {
  const map = await getAuthorProfiles([username]);
  return map[username] ?? null;
}
