import "server-only";
import { unstable_cache } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";

/** track slug -> explicit position (lower = earlier), from
 *  public.tutorial_track_order. Cookie-free + cached for the same reason as
 *  getArticleOrder: it feeds statically rendered tutorial pages, so it must not
 *  touch cookies(). Admin reorder busts the tag via revalidateTutorialCaches();
 *  `revalidate` is only a backstop. */
export const getTutorialTrackOrder = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const supabase = createAnonClient();
    const { data, error } = await supabase.from("tutorial_track_order").select("slug, position");
    if (error || !data) return {};

    const map: Record<string, number> = {};
    for (const row of data as { slug: string; position: number }[]) map[row.slug] = row.position;
    return map;
  },
  ["tutorial-track-order"],
  { revalidate: 3600, tags: ["tutorials"] },
);
