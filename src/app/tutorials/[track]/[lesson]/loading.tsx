// Skeleton that mirrors the real TutorialReader layout:
// 3-column grid [Lessons sidebar | Content | TOC sidebar] — no layout shift.
export default function Loading() {
  return (
    <div className="mx-auto w-full animate-pulse px-4 py-12 sm:px-8 lg:px-12">
      {/* ← Track name */}
      <div className="h-4 w-36 rounded bg-card" />

      <div className="mt-6 grid gap-10 lg:grid-cols-[16rem_1fr_17rem]">
        {/* ── Left sidebar: Lessons ── */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-xl border border-border bg-card p-5">
            <div className="mb-4 h-3 w-16 rounded bg-border" />
            <div className="flex flex-col gap-2">
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
        <div>
          {/* Reading time */}
          <div className="mb-3 h-3 w-20 rounded bg-card" />

          {/* Title */}
          <div className="h-9 w-3/4 rounded bg-card" />

          {/* Tags */}
          <div className="mt-3 flex gap-2">
            <div className="h-6 w-14 rounded-full border border-border bg-card" />
          </div>

          {/* Intro paragraph */}
          <div className="mt-8 flex flex-col gap-2.5">
            <div className="h-4 w-full rounded bg-card" />
            <div className="h-4 w-11/12 rounded bg-card" />
            <div className="h-4 w-full rounded bg-card" />
            <div className="h-4 w-4/5 rounded bg-card" />
          </div>

          {/* Heading */}
          <div className="mt-10 h-7 w-56 rounded bg-card" />

          {/* Text */}
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
          <div className="mt-10 h-7 w-44 rounded bg-card" />

          {/* Text */}
          <div className="mt-5 flex flex-col gap-2.5">
            <div className="h-4 w-full rounded bg-card" />
            <div className="h-4 w-11/12 rounded bg-card" />
            <div className="h-4 w-2/3 rounded bg-card" />
          </div>
        </div>

        {/* ── Right sidebar: On this page ── */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-xl border border-border bg-card p-5">
            <div className="mb-4 h-3 w-24 rounded bg-border" />
            <div className="flex flex-col gap-2.5">
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
  );
}
