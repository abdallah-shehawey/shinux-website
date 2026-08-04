"use server";

import { revalidatePath } from "next/cache";
import { getArticlesByAuthor } from "@/lib/articles";
import { getLessonsByAuthor } from "@/lib/tutorials";
import { siteAuthor } from "@/lib/site";
import { revalidateAuthorCaches } from "@/lib/revalidate-authors";

export interface RenameFollowUp {
  /** Content files whose `author:` frontmatter still credits the OLD handle. */
  staleContentFiles: number;
}

/**
 * Run right after a user changes their username.
 *
 * A rename RELEASES the old handle. profiles.username is one unique column with
 * no history table behind it, so the instant the update lands nothing maps
 * /u/<old> to that account any more and the next person to type it into the
 * username field gets it. That is the intended behaviour — but two caches have
 * to be told, or the old URL keeps serving a profile it no longer owns:
 *
 *   tags  — the profiles_public reads in src/lib/profiles.ts (the /u/* pages and
 *           the sitemap's username list) and src/lib/authors.ts (bylines).
 *   paths — the route entries themselves. /u/[username] is prerendered
 *           (generateStaticParams + `revalidate = 3600`), so the old handle has
 *           a baked 200 that has to flip to a 404, and the new handle has no
 *           entry at all. "layout" covers the articles/tutorials/questions
 *           sub-routes under each.
 *
 * Awaited by the caller before router.refresh(), so the refresh cannot race the
 * purge and re-cache the page it was meant to drop.
 *
 * Returns how many content files still name the old handle: those bylines now
 * link to a handle their author gave up (and could later belong to someone
 * else). Only a git edit fixes them — see scripts/rename-author.mjs.
 */
export async function completeUsernameRename(
  oldUsername: string,
  newUsername: string,
): Promise<RenameFollowUp> {
  await revalidateAuthorCaches();

  for (const username of new Set([oldUsername, newUsername].filter(Boolean))) {
    revalidatePath(`/u/${username}`, "layout");
  }
  revalidatePath("/sitemap.xml");

  const staleContentFiles =
    getArticlesByAuthor(oldUsername).length +
    getLessonsByAuthor(oldUsername).length +
    (siteAuthor.username === oldUsername ? 1 : 0);

  return { staleContentFiles };
}
