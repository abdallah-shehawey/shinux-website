import "server-only";
import { createAnonClient } from "@/lib/supabase/anon";
import { extractMentions } from "@/lib/mentions";

/**
 * Of every `@handle` written across `texts`, the ones that belong to a real
 * account — the allow-list both renderers take (see RenderOptions.mentions and
 * splitMentions). Resolving is what keeps an unknown handle plain text instead
 * of a link to a profile that does not exist.
 *
 * One query for a whole question thread, and none at all when nobody was
 * mentioned. Reads profiles_public through the cookie-free anon client so it is
 * safe to call inside unstable_cache().
 */
export async function resolveMentionHandles(texts: string[]): Promise<string[]> {
  const handles = [...new Set(texts.flatMap(extractMentions))];
  if (handles.length === 0) return [];

  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from("profiles_public")
    .select("username")
    .in("username", handles);
  // A failed lookup degrades to "nothing is a mention" — the text still reads
  // fine, it just isn't linked. Never let it take the page down.
  if (error) return [];

  return (data ?? []).map((row) => row.username as string);
}
