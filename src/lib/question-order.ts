import "server-only";
import { unstable_cache } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";

/** question_id -> explicit position (lower = earlier), from public.question_order.
 *  Cached under the shared "questions" tag — reordering busts it like any other
 *  Q&A mutation. */
export const getQuestionOrder = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const supabase = createAnonClient();
    const { data, error } = await supabase.from("question_order").select("question_id, position");
    if (error || !data) return {};

    const map: Record<string, number> = {};
    for (const row of data as { question_id: string; position: number }[]) {
      map[row.question_id] = row.position;
    }
    return map;
  },
  ["questions-order"],
  { revalidate: 300, tags: ["questions"] },
);
