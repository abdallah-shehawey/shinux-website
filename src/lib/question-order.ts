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

/** Same merge rule as applyCustomOrder in article-order.ts: explicitly-ordered
 * items first (by position), then everything else in its existing order. */
export function applyQuestionOrder<T extends { id: string }>(
  questions: T[],
  order: Record<string, number>,
): T[] {
  const ordered = questions.filter((q) => order[q.id] !== undefined);
  const rest = questions.filter((q) => order[q.id] === undefined);
  ordered.sort((a, b) => order[a.id] - order[b.id]);
  return [...rest, ...ordered];
}
