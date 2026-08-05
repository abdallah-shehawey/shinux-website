"use server";

import { revalidatePath } from "next/cache";
import { revalidateAuthorCaches } from "@/lib/revalidate-authors";

// Every prerendered route whose output embeds a username. Listed as route
// PATTERNS, not as `/u/<handle>` literals: a literal only purges an entry that
// already exists, which covers the handle being vacated but does nothing for
// the one being taken — and the incoming handle is exactly the case that bites,
// because any earlier visit to it (a crawler, a mistyped URL, someone checking
// whether it was free) left a cached 404 behind that outlived the rename.
// Purging by pattern drops every profile page in one pass. There are a handful
// of profiles and renames are rare, so the rebuild cost is noise.
const PROFILE_ROUTES = [
  "/u/[username]",
  "/u/[username]/articles",
  "/u/[username]/tutorials",
  "/u/[username]/tutorials/[track]",
  "/u/[username]/questions/asked",
  "/u/[username]/questions/answered",
];

/**
 * Run right after a user changes their username, before the caller refreshes.
 *
 * A rename RELEASES the old handle. profiles.username is one unique column with
 * no history table behind it, so the instant the update lands nothing maps
 * /u/<old> to that account any more and the next person to type it into the
 * username field gets it. Attribution for work published under it is preserved
 * separately, by account id — see supabase/migrations/0017_released_handles.sql —
 * so nothing has to be rewritten by hand and nothing is inherited by whoever
 * claims the handle next.
 *
 * What this has to do is make the two caches agree with the database at once:
 *
 *   tags  — the profiles_public reads in src/lib/profiles.ts (profile pages and
 *           the sitemap), src/lib/authors.ts (bylines across every article and
 *           lesson) and src/lib/content-handles.ts (the released-handle map).
 *   paths — the prerendered route entries above. /u/[username] is SSG
 *           (generateStaticParams + `revalidate = 3600`), so without this the
 *           old handle keeps serving a baked page it no longer owns and the new
 *           one can keep serving a stale 404.
 */
export async function completeUsernameRename(): Promise<void> {
  await revalidateAuthorCaches();
  for (const route of PROFILE_ROUTES) revalidatePath(route, "page");
  // Lists every profile URL, so it names the dead handle until it is rebuilt.
  revalidatePath("/sitemap.xml");
}
