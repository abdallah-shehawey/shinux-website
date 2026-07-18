"use server";

import { updateTag } from "next/cache";

// Q&A mutations happen client-side (browser → Supabase), so the server's data
// cache can't see them land. Every write component calls this right after a
// successful mutation. Coarse on purpose: one tag covers the cached threads,
// listing, tags and pin order — the next visitor re-fills them, which is the
// right trade at this site's size. Callable by anyone, but the worst it can do
// is drop a cache that time-based revalidation would drop anyway.
export async function revalidateQuestionCaches(): Promise<void> {
  // updateTag (vs revalidateTag) expires the tag immediately, so the caller's
  // router.refresh() right after already sees its own write.
  updateTag("questions");
}
