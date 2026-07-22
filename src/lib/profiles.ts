import "server-only";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAnonClient } from "@/lib/supabase/anon";

export interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  socialLinks: { platform: string; label: string; url: string }[];
  role: string;
  createdAt: string;
}

/** A user's public profile (/u/[username]) — see public.profiles_public. */
export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const supabase = await createClient();
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
  };
}

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
