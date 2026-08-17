// Skeleton matching the track listing page: back link + title + 2-col lesson
// cards.
//
// The card below mirrors the real one row for row — number, title with its
// arrow, a clamped description, the reading time, then the author behind a
// rule. It used to be a third shorter than the card that replaced it, so the
// whole grid rose by a couple of hundred pixels on handover.
export default function Loading() {
  return (
    <div className="mx-auto w-full animate-pulse px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      {/* ← All tutorials */}
      <div className="h-4 w-28 rounded skeleton-bar" />

      {/* Header */}
      <div className="mb-8 mt-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-72 rounded skeleton-bar" />
          <div className="h-6 w-14 rounded-full border border-border bg-card" />
        </div>
        {/* Two lines: a track description wraps at this width. */}
        <div className="mt-2 flex flex-col gap-2">
          <div className="h-4 w-full max-w-5xl rounded skeleton-bar" />
          <div className="h-4 w-2/5 max-w-5xl rounded skeleton-bar" />
        </div>
        {/* Author · View on GitHub */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full skeleton-bar" />
            <div className="h-3 w-28 rounded skeleton-bar" />
          </div>
          <div className="h-3 w-1 rounded bg-border/40" />
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded skeleton-bar" />
            <div className="h-3 w-24 rounded skeleton-bar" />
          </div>
        </div>
      </div>

      {/* Lesson cards grid */}
      <div className="grid auto-rows-fr gap-4 md:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-4 rounded-xl border border-border bg-card p-6"
          >
            {/* 01, 02, … */}
            <div className="mt-0.5 h-4 w-6 rounded bg-border/60" />
            <div className="flex flex-1 flex-col gap-1">
              {/* Title, with the → on the far side */}
              <div className="flex items-center justify-between gap-2">
                <div className="h-5 w-3/5 rounded bg-border" />
                <div className="h-4 w-4 shrink-0 rounded bg-border/40" />
              </div>
              {/* Description — clamped at three lines on the real card */}
              <div className="mt-1 flex flex-col gap-2">
                <div className="h-4 w-full rounded bg-border/40" />
                <div className="h-4 w-full rounded bg-border/40" />
                <div className="h-4 w-3/4 rounded bg-border/40" />
              </div>
              {/* N min read */}
              <div className="mt-3 h-3 w-20 rounded bg-border/30" />
              {/* Author, behind the rule */}
              <div className="mt-1 flex items-center gap-2 border-t border-border pt-2">
                <div className="h-5 w-5 rounded-full bg-border/40" />
                <div className="h-3 w-28 rounded bg-border/30" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
