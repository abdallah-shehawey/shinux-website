import "server-only";
import { createClient } from "@/lib/supabase/server";

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
