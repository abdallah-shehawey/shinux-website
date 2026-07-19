import "server-only";
import { unstable_cache } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";

/** slug -> explicit position (lower = earlier), from public.article_order.
 *  Cookie-free + cached (same reasoning as getQuestionOrder): it feeds the
 *  static home page, so it must not touch cookies(). Admin reorder busts the
 *  tag via revalidateArticleCaches(); `revalidate` is only a backstop. */
export const getArticleOrder = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const supabase = createAnonClient();
    const { data, error } = await supabase.from("article_order").select("slug, position");
    if (error || !data) return {};

    const map: Record<string, number> = {};
    for (const row of data as { slug: string; position: number }[]) map[row.slug] = row.position;
    return map;
  },
  ["article-order"],
  // 1h backstop only — reorders bust the tag immediately (see authors.ts for
  // why a short revalidate here would be paid by static-page visitors).
  { revalidate: 3600, tags: ["articles"] },
);

/**
 * Explicitly-ordered articles first (by position, ascending), then anything
 * without a row in article_order — new articles that haven't been placed yet
 * — appended after, in their existing (date-desc) order.
 */
export function applyCustomOrder<T extends { slug: string }>(
  articles: T[],
  order: Record<string, number>,
): T[] {
  const ordered = articles.filter((a) => order[a.slug] !== undefined);
  const rest = articles.filter((a) => order[a.slug] === undefined);
  ordered.sort((a, b) => order[a.slug] - order[b.slug]);
  return [...ordered, ...rest];
}
