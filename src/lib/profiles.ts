import "server-only";
import { unstable_cache } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";
import { getContentHandlesFor } from "@/lib/content-handles";

export interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  socialLinks: { platform: string; label: string; url: string }[];
  role: string;
  createdAt: string;
  /**
   * Every handle this account's articles and lessons may be filed under: the
   * live username plus any it released by renaming. Pass to
   * getArticlesByAuthor()/getLessonsByAuthor() — filtering on `username` alone
   * empties the profile the moment its owner renames.
   */
  contentHandles: string[];
}

/**
 * A user's public profile (/u/[username]) — see public.profiles_public.
 *
 * Reads through the COOKIE-FREE anon client and the Next data cache. The view
 * is anon-readable and identical for every viewer, so the session was only ever
 * dead weight here — and asking for cookies() opted every /u/* route into
 * dynamic rendering, so each profile (all of them are in the sitemap, so
 * crawlers walk the lot) cost a serverless render plus its Supabase round trips
 * on every single hit.
 */
export const getPublicProfile = unstable_cache(
  async (username: string): Promise<PublicProfile | null> => {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("profiles_public")
      .select("id, username, display_name, avatar_url, social_links, role, created_at")
      .eq("username", decodeURIComponent(username))
      .maybeSingle();
    if (error || !data) return null;

    return {
      id: data.id,
      username: data.username,
      displayName: data.display_name || data.username,
      avatarUrl: data.avatar_url,
      socialLinks: data.social_links ?? [],
      role: data.role,
      createdAt: data.created_at,
      contentHandles: await getContentHandlesFor(data.id, data.username),
    };
  },
  ["public-profile"],
  { revalidate: 300, tags: ["profiles"] },
);

/**
 * All public profile usernames, for the sitemap. Cookie-free anon read wrapped
 * in the Next data cache (like getCachedPublicQuestions) so crawlers never
 * trigger a live Supabase query. Usernames match [a-z0-9_-]+ so no percent
 * encoding is needed downstream.
 */
export const getCachedPublicProfileUsernames = unstable_cache(
  async (): Promise<string[]> => {
    const supabase = createAnonClient();
    const { data, error } = await supabase.from("profiles_public").select("username");
    if (error) throw error;
    return (data ?? []).map((row) => row.username as string);
  },
  ["public-profile-usernames"],
  { revalidate: 300, tags: ["profiles"] },
);
