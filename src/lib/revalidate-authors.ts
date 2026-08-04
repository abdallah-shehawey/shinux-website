"use server";

import { updateTag } from "next/cache";

// Busts the cached profiles_public lookups — and with them every static page
// that baked an author name/avatar in — after a profile edit. Same pattern as
// revalidate-questions.ts: updateTag (vs revalidateTag) expires immediately so
// the caller's router.refresh() sees its own write.
//
// Two tags, because two different caches read the same view:
//   authors  — src/lib/authors.ts, the byline on articles and lessons.
//   profiles — src/lib/profiles.ts, the /u/[username] pages (and the sitemap's
//              username list). These went from per-request rendering to ISR in
//              a2f6428, so without this an edit sat behind the 5-minute cache:
//              you renamed yourself and your own public page kept the old name.
export async function revalidateAuthorCaches(): Promise<void> {
  updateTag("authors");
  updateTag("profiles");
}
