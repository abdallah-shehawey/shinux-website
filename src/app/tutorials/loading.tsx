// Skeleton matching the tutorials hub: title + search bar + 3-col grid of track cards.
export default function Loading() {
  return (
    <div className="mx-auto w-full animate-pulse px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      {/* Title */}
      <div className="mb-2 h-9 w-40 rounded bg-card" />
      <div className="h-4 w-96 max-w-full rounded bg-card" />

      {/* Search bar */}
      <div className="mb-8 mt-8 flex gap-2">
        <div className="h-10 w-full max-w-sm rounded-lg border border-border bg-card" />
        <div className="h-10 w-20 rounded-lg border border-border bg-card" />
      </div>

      {/* Track cards grid */}
      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="h-5 w-3/4 rounded bg-border" />
              <div className="h-5 w-12 rounded-full bg-border/60" />
            </div>
            <div className="h-4 w-full rounded bg-border/40" />
            <div className="h-4 w-2/3 rounded bg-border/40" />
            <div className="mt-auto h-3 w-20 rounded bg-border/30" />
          </div>
        ))}
      </div>
    </div>
  );
}
