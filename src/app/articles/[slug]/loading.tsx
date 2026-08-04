// Skeleton that mirrors the real ArticleReader layout: sticky back-bar +
// 2-column grid [content | TOC] with a sticky TOC rail — no layout shift.
//
// `dir` mirrors it for an Arabic article, the way ArticleReader itself does:
// TOC on the left, text bars right-aligned. Next.js renders this with no props
// (hence the LTR default); the hint comes from the link that was clicked — see
// NavigationPending — so an Arabic article no longer opens as an English-shaped
// skeleton that flips sides the moment the real page lands.
export default function Loading({ dir = "ltr" }: { dir?: "rtl" | "ltr" }) {
  const isRtl = dir === "rtl";

  return (
    <>
      {/* Sticky subheader skeleton */}
      <div className="sticky top-14 z-10 bg-bg">
        <div className="mx-auto flex h-11 w-full items-center px-4 sm:px-8 lg:px-12">
          <div className="h-4 w-28 animate-pulse rounded skeleton-bar" />
        </div>
      </div>

      <div className="mx-auto w-full animate-pulse px-4 pt-4 pb-12 sm:px-8 lg:px-12">
        <div className="mt-4 lg:mt-0">
          <div
            className={`grid gap-6 lg:gap-4 ${
              isRtl ? "lg:grid-cols-[17rem_1fr]" : "lg:grid-cols-[1fr_17rem]"
            }`}
          >
            {/* ── Content column ──
                dir is what right-aligns every bar in one go: a block narrower
                than its container hugs the inline-start edge, which RTL puts on
                the right. The two rows the real page keeps in English — the
                metadata line and the author card — opt back out below. */}
            <div className={`min-w-0 ${isRtl ? "lg:order-2" : ""}`} dir={dir}>
              {/* Date · reading time */}
              <div className="mb-4 flex items-center gap-3" dir="ltr">
                <div className="h-3 w-28 rounded skeleton-bar" />
                <div className="h-6 w-24 rounded-lg skeleton-bar" />
              </div>
              {/* Title */}
              <div className="h-9 w-3/4 rounded skeleton-bar" />
              {/* Tags */}
              <div className="mt-3 flex gap-2">
                <div className="h-6 w-16 rounded-full border border-border bg-card" />
                <div className="h-6 w-14 rounded-full border border-border bg-card" />
                <div className="h-6 w-12 rounded-full border border-border bg-card" />
              </div>
              {/* Intro paragraph */}
              <div className="mt-8 flex flex-col gap-2.5">
                <div className="h-4 w-full rounded skeleton-bar" />
                <div className="h-4 w-11/12 rounded skeleton-bar" />
                <div className="h-4 w-full rounded skeleton-bar" />
                <div className="h-4 w-4/5 rounded skeleton-bar" />
              </div>
              {/* Heading */}
              <div className="mt-10 h-7 w-64 rounded skeleton-bar" />
              {/* More text */}
              <div className="mt-5 flex flex-col gap-2.5">
                <div className="h-4 w-full rounded skeleton-bar" />
                <div className="h-4 w-5/6 rounded skeleton-bar" />
                <div className="h-4 w-full rounded skeleton-bar" />
              </div>
              {/* Code block */}
              <div className="mt-5 h-28 rounded-xl border border-border bg-card" />
              {/* More text */}
              <div className="mt-5 flex flex-col gap-2.5">
                <div className="h-4 w-full rounded skeleton-bar" />
                <div className="h-4 w-3/4 rounded skeleton-bar" />
              </div>
              {/* Author card */}
              <div
                className="mt-10 flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                dir="ltr"
              >
                <div className="h-11 w-11 shrink-0 rounded-full bg-border" />
                <div className="flex flex-col gap-1.5">
                  <div className="h-3 w-20 rounded bg-border" />
                  <div className="h-4 w-32 rounded bg-border" />
                </div>
              </div>
            </div>

            {/* ── TOC sidebar ── */}
            <aside className={`hidden lg:flex lg:flex-col ${isRtl ? "lg:order-1" : ""}`}>
              <div className="card reader-rail flex flex-col overflow-hidden">
                {/* The "On this page" label is site chrome and stays English;
                    only the heading list follows the article — same split as
                    the real TableOfContents. */}
                <div className="mb-4 h-3 w-24 shrink-0 rounded bg-border" />
                <div className="min-h-0 flex-1 space-y-2.5 overflow-hidden" dir={dir}>
                  <div className="h-3.5 w-full rounded bg-border" />
                  <div className="h-3.5 w-4/5 rounded bg-border" />
                  <div className="h-3.5 w-3/4 rounded bg-border" />
                  <div className="h-3.5 w-full rounded bg-border" />
                  <div className="h-3.5 w-2/3 rounded bg-border" />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
