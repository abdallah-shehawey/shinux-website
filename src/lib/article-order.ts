import "server-only";
import { createClient } from "@/lib/supabase/server";

/** slug -> explicit position (lower = earlier), from public.article_order. */
export async function getArticleOrder(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("article_order").select("slug, position");
  if (error || !data) return {};

  const map: Record<string, number> = {};
  for (const row of data as { slug: string; position: number }[]) map[row.slug] = row.position;
  return map;
}

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
