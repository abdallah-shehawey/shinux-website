"use client";

import TableOfContents from "@/components/TableOfContents";
import TutorialSidebar from "@/components/TutorialSidebar";
import CopyCodeButtons from "@/components/CopyCodeButtons";
import CodeTabs from "@/components/CodeTabs";
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
  const isRtl = /[\u0600-\u06FF]/.test(title || "");
  const langStyle = isRtl ? { fontFamily: "var(--font-ibm-plex-arabic)" } : undefined;

  // LTR: Lessons sidebar (left) | Content (middle) | TOC sidebar (right)
  // RTL: TOC sidebar (left) | Content (middle) | Lessons sidebar (right)
  const gridCls = isRtl
    ? "mt-6 grid gap-10 lg:grid-cols-[17rem_1fr_16rem]"
    : "mt-6 grid gap-10 lg:grid-cols-[16rem_1fr_17rem]";

  return (
    <article className={gridCls}>
      {/* 1. Lessons Sidebar (left column in LTR, right column in RTL) */}
      <aside className={`hidden lg:block ${isRtl ? "lg:order-3" : ""}`}>
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <TutorialSidebar track={track} lessons={lessons} currentSlug={currentSlug} />
        </div>
      </aside>

      {/* 2. Main Content */}
      <div className={isRtl ? "lg:order-2" : ""}>
        <div className="mb-6 lg:hidden">
          <TutorialSidebar
            track={track}
            lessons={lessons}
            currentSlug={currentSlug}
            collapsedOnMobile
          />
        </div>

        <header className="mb-8" dir={isRtl ? "rtl" : "ltr"} lang={isRtl ? "ar" : "en"} style={langStyle}>
          <p className="mb-3 font-mono text-xs text-muted" dir="ltr">{readingMinutes} min read</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5" dir={isRtl ? "rtl" : "ltr"}>
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
          dir={isRtl ? "rtl" : "ltr"}
          lang={isRtl ? "ar" : "en"}
          style={langStyle}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <CopyCodeButtons containerId={CONTENT_ID} />
        <CodeTabs containerId={CONTENT_ID} />

        {children}
      </div>

      {/* 3. TOC sidebar (right column in LTR, left column in RTL) */}
      <aside className={`hidden lg:block ${isRtl ? "lg:order-1" : ""}`}>
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <TableOfContents
            items={toc}
            title="On this page"
            dir={isRtl ? "rtl" : "ltr"}
            lang={isRtl ? "ar" : "en"}
          />
        </div>
      </aside>
    </article>
  );
}
