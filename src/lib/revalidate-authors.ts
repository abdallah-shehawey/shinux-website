"use server";

import { updateTag } from "next/cache";

// Busts the cached profiles_public lookup (src/lib/authors.ts) — and with it
// every static page that baked an author name/avatar in — after a profile
// edit. Same pattern as revalidate-questions.ts: updateTag (vs revalidateTag)
// expires immediately so the caller's router.refresh() sees its own write.
export async function revalidateAuthorCaches(): Promise<void> {
  updateTag("authors");
}
