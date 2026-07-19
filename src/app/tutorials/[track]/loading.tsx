// Skeleton matching the track listing page: back link + title + 2-col lesson cards.
export default function Loading() {
  return (
    <div className="mx-auto w-full animate-pulse px-4 py-12 sm:px-8 lg:px-12">
      {/* ← All tutorials */}
      <div className="h-4 w-28 rounded bg-card" />

      {/* Header */}
      <div className="mb-8 mt-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-72 rounded bg-card" />
          <div className="h-6 w-14 rounded-full border border-border bg-card" />
        </div>
        <div className="mt-2 h-4 w-96 max-w-full rounded bg-card" />
        {/* Author */}
        <div className="mt-3 flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-card" />
          <div className="h-3 w-28 rounded bg-card" />
        </div>
      </div>

      {/* Lesson cards grid */}
      <div className="grid auto-rows-fr gap-4 md:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 rounded-xl border border-border bg-card p-6">
            <div className="mt-0.5 h-4 w-6 rounded bg-border/60 font-mono" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-5 w-4/5 rounded bg-border" />
              <div className="h-4 w-full rounded bg-border/40" />
              <div className="h-4 w-2/3 rounded bg-border/40" />
              <div className="mt-auto h-3 w-20 rounded bg-border/30" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
