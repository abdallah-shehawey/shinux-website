// Skeleton that mirrors the real ArticleReader viewport-filling layout:
// sticky back-bar + 2-column grid [content | TOC] — no layout shift.
export default function Loading() {
  return (
    <>
      {/* Sticky subheader skeleton */}
      <div className="sticky top-14 z-10 bg-bg">
        <div className="mx-auto flex h-11 w-full items-center px-4 sm:px-8 lg:px-12">
          <div className="h-4 w-28 animate-pulse rounded bg-card" />
        </div>
      </div>

      <div className="mx-auto w-full animate-pulse px-4 pt-4 pb-12 sm:px-8 lg:h-[calc(100vh-6.25rem)] lg:overflow-hidden lg:px-12 lg:pb-0 lg:pt-0">
        <div className="mt-4 flex h-full flex-col lg:mt-0 lg:overflow-hidden">
          {/* Date · reading time */}
          <div className="mb-4 shrink-0 flex items-center gap-3 lg:pt-3">
            <div className="h-3 w-28 rounded bg-card" />
            <div className="h-6 w-24 rounded-lg bg-card/60" />
          </div>

          <div className="min-h-0 flex-1 grid gap-6 lg:h-full lg:gap-4 lg:grid-cols-[1fr_17rem]">
            {/* ── Content column ── */}
            <div className="min-w-0 lg:min-h-0 lg:overflow-y-auto lg:pb-8">
              {/* Title */}
              <div className="h-9 w-3/4 rounded bg-card" />
              {/* Tags */}
              <div className="mt-3 flex gap-2">
                <div className="h-6 w-16 rounded-full border border-border bg-card" />
                <div className="h-6 w-14 rounded-full border border-border bg-card" />
                <div className="h-6 w-12 rounded-full border border-border bg-card" />
              </div>
              {/* Intro paragraph */}
              <div className="mt-8 flex flex-col gap-2.5">
                <div className="h-4 w-full rounded bg-card" />
                <div className="h-4 w-11/12 rounded bg-card" />
                <div className="h-4 w-full rounded bg-card" />
                <div className="h-4 w-4/5 rounded bg-card" />
              </div>
              {/* Heading */}
              <div className="mt-10 h-7 w-64 rounded bg-card" />
              {/* More text */}
              <div className="mt-5 flex flex-col gap-2.5">
                <div className="h-4 w-full rounded bg-card" />
                <div className="h-4 w-5/6 rounded bg-card" />
                <div className="h-4 w-full rounded bg-card" />
              </div>
              {/* Code block */}
              <div className="mt-5 h-28 rounded-xl border border-border bg-card" />
              {/* More text */}
              <div className="mt-5 flex flex-col gap-2.5">
                <div className="h-4 w-full rounded bg-card" />
                <div className="h-4 w-3/4 rounded bg-card" />
              </div>
              {/* Author card */}
              <div className="mt-10 flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                <div className="h-11 w-11 shrink-0 rounded-full bg-border" />
                <div className="flex flex-col gap-1.5">
                  <div className="h-3 w-20 rounded bg-border" />
                  <div className="h-4 w-32 rounded bg-border" />
                </div>
              </div>
            </div>

            {/* ── TOC sidebar ── */}
            <aside className="hidden lg:flex lg:min-h-0 lg:flex-col">
              <div className="card flex h-full flex-col overflow-hidden">
                <div className="mb-4 h-3 w-24 shrink-0 rounded bg-border" />
                <div className="min-h-0 flex-1 space-y-2.5 overflow-hidden">
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
