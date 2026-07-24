// Skeleton that mirrors the real TutorialReader layout: sticky back-bar +
// 3-column grid [Lessons | Content | TOC] with sticky rails — no layout shift.
export default function Loading() {
  return (
    <>
      {/* Sticky subheader skeleton */}
      <div className="sticky top-14 z-10 bg-bg">
        <div className="mx-auto flex h-11 w-full items-center px-4 sm:px-8 lg:px-12">
          <div className="h-4 w-36 animate-pulse rounded skeleton-bar" />
        </div>
      </div>

      <div className="mx-auto w-full animate-pulse px-4 pt-4 pb-12 sm:px-8 lg:px-12">
        <div className="mt-6 grid gap-6 lg:mt-0 lg:gap-4 lg:grid-cols-[16rem_1fr_17rem]">
          {/* ── Left sidebar: Lessons ── */}
          <aside className="hidden lg:flex lg:flex-col">
            <div className="card reader-rail flex flex-col overflow-hidden">
              <div className="mb-4 h-3 w-16 shrink-0 rounded bg-border" />
              <div className="min-h-0 flex-1 space-y-2 overflow-hidden">
                <div className="h-7 w-full rounded-md bg-border/60" />
                <div className="h-7 w-full rounded-md bg-border/30" />
                <div className="h-7 w-full rounded-md bg-border/30" />
                <div className="h-7 w-full rounded-md bg-border/30" />
                <div className="h-7 w-full rounded-md bg-border/30" />
                <div className="h-7 w-full rounded-md bg-border/30" />
                <div className="h-7 w-full rounded-md bg-border/30" />
                <div className="h-7 w-full rounded-md bg-border/30" />
              </div>
            </div>
          </aside>

          {/* ── Content column ── */}
          <div className="min-w-0">
            {/* Reading time */}
            <div className="mb-3 h-3 w-20 rounded skeleton-bar" />
            {/* Title */}
            <div className="h-9 w-3/4 rounded skeleton-bar" />
            {/* Tags */}
            <div className="mt-3 flex gap-2">
              <div className="h-6 w-14 rounded-full border border-border bg-card" />
            </div>
            {/* Intro paragraph */}
            <div className="mt-8 flex flex-col gap-2.5">
              <div className="h-4 w-full rounded skeleton-bar" />
              <div className="h-4 w-11/12 rounded skeleton-bar" />
              <div className="h-4 w-full rounded skeleton-bar" />
              <div className="h-4 w-4/5 rounded skeleton-bar" />
            </div>
            {/* Heading */}
            <div className="mt-10 h-7 w-56 rounded skeleton-bar" />
            {/* Text */}
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
          </div>

          {/* ── Right sidebar: On this page ── */}
          <aside className="hidden lg:flex lg:flex-col">
            <div className="card reader-rail flex flex-col overflow-hidden">
              <div className="mb-4 h-3 w-24 shrink-0 rounded bg-border" />
              <div className="min-h-0 flex-1 space-y-2.5 overflow-hidden">
                <div className="h-3.5 w-full rounded bg-border" />
                <div className="ms-4 h-3.5 w-4/5 rounded bg-border/60" />
                <div className="ms-4 h-3.5 w-3/4 rounded bg-border/60" />
                <div className="h-3.5 w-full rounded bg-border" />
                <div className="ms-4 h-3.5 w-2/3 rounded bg-border/60" />
                <div className="h-3.5 w-5/6 rounded bg-border" />
                <div className="ms-4 h-3.5 w-3/4 rounded bg-border/60" />
                <div className="ms-4 h-3.5 w-4/5 rounded bg-border/60" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
