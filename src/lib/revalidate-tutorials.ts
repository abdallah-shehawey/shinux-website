"use server";

import { updateTag } from "next/cache";

// Busts the cached tutorial_track_order lookup (src/lib/tutorial-order.ts)
// after the admin drag-reorders the track cards on /tutorials. Mirrors
// revalidate-articles.ts.
export async function revalidateTutorialCaches(): Promise<void> {
  updateTag("tutorials");
}
