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
  const gridClassName = "grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3";

  const grid = (items: ArticleMeta[]) => (
    <div className={gridClassName}>
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
      gridClassName={gridClassName}
      renderNormal={grid}
      renderCard={(item) => (
        <ArticleCard
          article={item}
          readingLabel={`${item.readingMinutes} min read`}
          author={item.author ? authors[item.author] : null}
        />
      )}
    />
  );
}
