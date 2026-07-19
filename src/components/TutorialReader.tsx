"use client";

import TableOfContents from "@/components/TableOfContents";
import TutorialSidebar from "@/components/TutorialSidebar";
import CopyCodeButtons from "@/components/CopyCodeButtons";
import type { TocItem } from "@/lib/markdown";
import type { LessonMeta } from "@/lib/tutorials";

// English-only lesson reader: the server renders the lesson Markdown to HTML + a
// TOC once, and this view lays it out (lesson sidebar + body + sticky "On this
// page") and wires up the copy-code buttons. Deliberately simpler than
// <ArticleReader> — tutorials carry no per-lesson language toggle.
const CONTENT_ID = "lesson-body";

export default function TutorialReader({
  title,
  tags,
  readingMinutes,
  html,
  toc,
  track,
  lessons,
  currentSlug,
  children,
}: {
  title: string;
  tags: string[];
  readingMinutes: number;
  html: string;
  toc: TocItem[];
  track: string;
  lessons: LessonMeta[];
  currentSlug: string;
  children?: React.ReactNode;
}) {
  return (
    <article className="mt-6 grid gap-10 lg:grid-cols-[1fr_16rem_minmax(0,44rem)_17rem_1fr]">
      <aside className="hidden lg:col-start-2 lg:block">
        <div className="sticky top-20">
          <TutorialSidebar track={track} lessons={lessons} currentSlug={currentSlug} />
        </div>
      </aside>

      <div className="lg:col-start-3">
        <div className="mb-6 lg:hidden">
          <TutorialSidebar
            track={track}
            lessons={lessons}
            currentSlug={currentSlug}
            collapsedOnMobile
          />
        </div>

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

      <aside className="hidden lg:col-start-4 lg:block">
        <div className="sticky top-20">
          <TableOfContents items={toc} title="On this page" />
        </div>
      </aside>
    </article>
  );
}
