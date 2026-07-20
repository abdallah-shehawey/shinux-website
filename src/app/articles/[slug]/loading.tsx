// Skeleton that mirrors the real ArticleReader layout with sticky subheader:
// sticky back-bar + 2-column grid [content | TOC sidebar] — no layout shift.
export default function Loading() {
  return (
    <>
      {/* Sticky subheader skeleton */}
      <div className="sticky top-14 z-10 border-b border-border bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-11 w-full items-center px-4 sm:px-8 lg:px-12">
          <div className="h-4 w-28 animate-pulse rounded bg-card" />
        </div>
      </div>

      <div className="mx-auto w-full animate-pulse px-4 pt-6 pb-12 sm:px-8 lg:px-12">
        {/* Date · reading time */}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-3 w-28 rounded bg-card" />
          <div className="h-6 w-24 rounded-lg bg-card/60" />
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_17rem]">
          {/* ── Content column ── */}
          <div>
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

            {/* Another heading */}
            <div className="mt-10 h-7 w-48 rounded bg-card" />

            {/* Text */}
            <div className="mt-5 flex flex-col gap-2.5">
              <div className="h-4 w-full rounded bg-card" />
              <div className="h-4 w-11/12 rounded bg-card" />
              <div className="h-4 w-2/3 rounded bg-card" />
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
          <aside className="hidden lg:block">
            <div className="sticky top-[100px] rounded-xl border border-border bg-card p-5">
              <div className="mb-4 h-3 w-24 rounded bg-border" />
              <div className="flex flex-col gap-2.5">
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
    </>
  );
}
