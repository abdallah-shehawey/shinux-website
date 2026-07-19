/**
 * Shared merge rule for the admin's drag-to-reorder tables (article_order,
 * tutorial_track_order): explicitly-ordered items first, by position ascending,
 * then anything without a row — new content that hasn't been placed yet —
 * appended after, keeping the order it already had (date-desc for articles,
 * frontmatter order for tracks).
 *
 * Lives on its own rather than inside article-order.ts because more than one
 * content type now shares it. question-order.ts keeps its own copy: questions
 * are keyed by id, not slug, and carry an extra unanswered-first rule.
 */
export function applyCustomOrder<T extends { slug: string }>(
  items: T[],
  order: Record<string, number>,
): T[] {
  const ordered = items.filter((a) => order[a.slug] !== undefined);
  const rest = items.filter((a) => order[a.slug] === undefined);
  ordered.sort((a, b) => order[a.slug] - order[b.slug]);
  return [...ordered, ...rest];
}
