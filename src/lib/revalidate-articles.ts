"use server";

import { updateTag } from "next/cache";

// Busts the cached article_order lookup (src/lib/article-order.ts) — and the
// static home page's "Latest articles" section with it — after the admin
// drag-reorders /articles. Mirrors revalidate-questions.ts.
export async function revalidateArticleCaches(): Promise<void> {
  updateTag("articles");
}
