import "server-only";
import { unstable_cache } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";

export interface ContentHandleOwner {
  /** A handle that appears in `author:` frontmatter but is no longer a live username. */
  handle: string;
  profileId: string;
  /** The owner's CURRENT username — where the byline should link today. */
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

/**
 * Handles released by a rename, mapped to the account that released them —
 * see supabase/migrations/0017_released_handles.sql.
 *
 * Articles and lessons credit their author by handle in frontmatter, and that
 * text lives in git where a rename cannot reach it. This map is what keeps
 * those bylines attached to a person instead of to a string: it is consulted
 * for attribution only, never for routing, so /u/<released handle> stays a 404
 * and the handle stays claimable.
 *
 * One cached, cookie-free read of the whole table — it holds one row per
 * rename ever performed, and every article page needs it. Tagged under both
 * "authors" (bylines) and "profiles" (profile pages) so a rename busts it
 * through the same call that busts everything else.
 */
export const getContentHandleOwners = unstable_cache(
  async (): Promise<ContentHandleOwner[]> => {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("content_author_handles_public")
      .select("handle, id, username, display_name, avatar_url");
    // Missing table (migration not applied yet) must not take the whole byline
    // down — falling back to an empty map is exactly the pre-0017 behaviour.
    if (error || !data) return [];

    return data.map((row) => ({
      handle: row.handle as string,
      profileId: row.id as string,
      username: row.username as string,
      displayName: (row.display_name as string) || (row.username as string),
      avatarUrl: (row.avatar_url as string | null) ?? null,
    }));
  },
  ["content-handle-owners"],
  { revalidate: 3600, tags: ["authors", "profiles"] },
);

/**
 * Every handle whose content belongs to this account: the live username plus
 * anything it released along the way. Article and lesson lookups filter on the
 * whole set, so a profile keeps its own work after a rename.
 */
export async function getContentHandlesFor(
  profileId: string,
  username: string,
): Promise<string[]> {
  const owners = await getContentHandleOwners();
  const released = owners.filter((o) => o.profileId === profileId).map((o) => o.handle);
  return [...new Set([username, ...released])];
}
