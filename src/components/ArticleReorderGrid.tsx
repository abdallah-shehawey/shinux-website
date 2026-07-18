"use client";

import ArticleCard from "./ArticleCard";
import DragReorderList from "./DragReorderList";
import type { ArticleMeta } from "@/lib/articles";
import type { Author } from "@/lib/site";

export default function ArticleReorderGrid({
  initialItems,
  authors,
  isAdmin,
}: {
  initialItems: ArticleMeta[];
  authors: Record<string, Author>;
  isAdmin: boolean;
}) {
  const grid = (items: ArticleMeta[]) => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((article) => (
        <ArticleCard
          key={article.slug}
          article={article}
          readingLabel={`${article.readingMinutes} min read`}
          author={article.author ? authors[article.author] : null}
        />
      ))}
    </div>
  );

  if (!isAdmin) return grid(initialItems);

  return (
    <DragReorderList
      initialItems={initialItems}
      getId={(a) => a.slug}
      table="article_order"
      idColumn="slug"
      renderNormal={grid}
      renderRow={(item) => (
        <span className="truncate text-sm font-medium text-fg">{item.title}</span>
      )}
    />
  );
}
