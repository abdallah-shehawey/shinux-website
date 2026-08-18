import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface RegisteredUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
}

/**
 * Every account on the site, newest first — the roster behind /admin/users.
 *
 * Reads `profiles` through the caller's own session rather than the anon
 * `profiles_public` view, so the row-level policy is what actually gates it:
 * profiles_select_own_or_admin (0001_init.sql) hands an admin every row and
 * anyone else only their own. The page still checks the role itself — this is
 * the second lock, not the only one.
 *
 * Deliberately uncached. Every other read in this app is a public page served
 * to everyone identically; this one is a single admin asking who signed up,
 * and a signup that lands a minute after the cache filled must not be missing
 * from it. Email lives in auth.users, not here, and stays out of reach of the
 * anon key by design.
 */
export async function getRegisteredUsers(): Promise<RegisteredUser[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, role, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    username: row.username,
    // Same fallback the public profile uses: the handle is guaranteed
    // (handle_new_user() derives one on signup), display_name is not.
    displayName: row.display_name || row.username,
    avatarUrl: row.avatar_url,
    role: row.role,
    createdAt: row.created_at,
  }));
}
