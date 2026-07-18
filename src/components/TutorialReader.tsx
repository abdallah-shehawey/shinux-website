"use client";

import TableOfContents from "@/components/TableOfContents";
import CopyCodeButtons from "@/components/CopyCodeButtons";
import type { TocItem } from "@/lib/markdown";

// English-only lesson reader: the server renders the lesson Markdown to HTML + a
// TOC once, and this view lays it out (body + sticky "On this page") and wires up
// the copy-code buttons. Deliberately simpler than <ArticleReader> — tutorials
// carry no per-lesson language toggle.
const CONTENT_ID = "lesson-body";

export default function TutorialReader({
  title,
  tags,
  readingMinutes,
  html,
  toc,
  children,
}: {
  title: string;
  tags: string[];
  readingMinutes: number;
  html: string;
  toc: TocItem[];
  children?: React.ReactNode;
}) {
  return (
    <article className="mt-6 grid gap-10 lg:grid-cols-[1fr_minmax(0,46rem)_17rem_1fr]">
      <div className="lg:col-start-2">
        <header className="mb-8">
          <p className="mb-3 font-mono text-xs text-muted">{readingMinutes} min read</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        <div
          id={CONTENT_ID}
          className="prose"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <CopyCodeButtons containerId={CONTENT_ID} />

        {children}
      </div>

      <aside className="hidden lg:col-start-3 lg:block">
        <div className="sticky top-20">
          <TableOfContents items={toc} title="On this page" />
        </div>
      </aside>
    </article>
  );
}
