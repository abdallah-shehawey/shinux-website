import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Author } from "@/lib/site";

// Resolves an article frontmatter `author: <username>` into a real, live
// profile (display name + avatar) via the public.author_profiles view — see
// supabase/migrations/0006_author_profiles.sql. Scoped to admins, since
// articles are still admin-authored (Linux-site-spec.md §1).

/** Batch lookup — one query for every distinct username on a listing page. */
export async function getAuthorProfiles(usernames: string[]): Promise<Record<string, Author>> {
  const unique = [...new Set(usernames)].filter(Boolean);
  if (unique.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("author_profiles")
    .select("username, display_name, avatar_url")
    .in("username", unique);
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
}

/** Single lookup, for an article's own detail page. */
export async function getAuthorProfile(username: string): Promise<Author | null> {
  const map = await getAuthorProfiles([username]);
  return map[username] ?? null;
}
