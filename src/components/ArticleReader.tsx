"use client";

import { useState } from "react";
import Link from "next/link";
import TableOfContents from "@/components/TableOfContents";
import OnThisPageFab from "@/components/OnThisPageFab";
import CopyCodeButtons from "@/components/CopyCodeButtons";
import CodeTabs from "@/components/CodeTabs";
import type { TocItem } from "@/lib/markdown";

// One pre-rendered language of an article: the server turns each language's
// Markdown into HTML + a TOC once, and this client view just swaps between them
// when the reader flips the in-page language toggle (no re-fetch, no client-side
// Markdown rendering).
export interface RenderedLocale {
  title: string;
  html: string;
  toc: TocItem[];
  readingMinutes: number;
}

const CONTENT_ID = "article-body";

// Native language names for the toggle (fall back to the uppercased code).
const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  ar: "العربية",
};

function localeLabel(loc: string) {
  return LOCALE_LABELS[loc] ?? loc.toUpperCase();
}

export default function ArticleReader({
  date,
  tags,
  locales,
  defaultLocale,
  rendered,
  children,
}: {
  date: string;
  tags: string[];
  locales: string[];
  defaultLocale: string;
  rendered: Record<string, RenderedLocale>;
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState(defaultLocale);
  const current = rendered[locale] ?? rendered[defaultLocale];
  const isRtl = locale === "ar";
  const langStyle = isRtl ? { fontFamily: "var(--font-ibm-plex-arabic)" } : undefined;

  // RTL: TOC on the left, content on the right (natural Arabic reading flow).
  // LTR: content on the left, TOC on the right (standard English layout).
  // The document is the only scroller — the TOC rides along as a sticky rail
  // (.reader-rail), so the page ends where the article text ends.
  const gridBase = isRtl
    ? "lg:grid-cols-[17rem_1fr]"
    : "lg:grid-cols-[1fr_17rem]";
  const gridCls = `grid gap-6 lg:gap-4 ${gridBase}`;

  return (
    <article className="mt-4 lg:mt-0">
      <div className={gridCls}>
        <div className={`min-w-0 ${isRtl ? "lg:order-2" : ""}`}>
          {/* Metadata bar. Lives inside the content column (not above the grid)
              so the TOC rail starts level with it — pinned from scroll 0. */}
          <div className="mb-4 flex flex-wrap items-center gap-3" dir="ltr">
            <p className="font-mono text-xs text-muted">
              {date} · {current.readingMinutes} min read
            </p>
            {locales.length > 1 && (
              <div
                className="inline-flex overflow-hidden rounded-lg border border-border"
                role="group"
                aria-label="Article language"
              >
                {locales.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setLocale(loc)}
                    className="lang-toggle-btn"
                    data-active={loc === locale}
                    aria-pressed={loc === locale}
                    lang={loc}
                  >
                    {localeLabel(loc)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <header className="mb-8" dir={isRtl ? "rtl" : "ltr"} lang={locale} style={langStyle}>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" dir="auto">
              {current.title}
            </h1>
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5" dir={isRtl ? "rtl" : "ltr"}>
                {tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/articles?tag=${encodeURIComponent(tag)}`}
                    className="tag-chip"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </header>

          {/* `key={locale}` gives each language a fresh DOM node so the copy
              buttons (injected below) re-attach to the new code blocks. */}
          <div
            id={CONTENT_ID}
            key={locale}
            className="prose"
            dir={isRtl ? "rtl" : "ltr"}
            lang={locale}
            style={langStyle}
            dangerouslySetInnerHTML={{ __html: current.html }}
          />
          <CopyCodeButtons key={`copy-${locale}`} containerId={CONTENT_ID} />
          <CodeTabs key={`tabs-${locale}`} containerId={CONTENT_ID} />

          {children}
        </div>

        <aside className={`hidden lg:flex lg:flex-col ${isRtl ? "lg:order-1" : ""}`}>
          <TableOfContents
            items={current.toc}
            title="On this page"
            dir={isRtl ? "rtl" : "ltr"}
            lang={locale}
          />
        </aside>
      </div>

      <OnThisPageFab items={current.toc} isRtl={isRtl} lang={locale} />
    </article>
  );
}
