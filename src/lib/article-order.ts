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
