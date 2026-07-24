// Skeleton matching the user tutorials listing: back link + title + 3-col track group cards.
export default function Loading() {
  return (
    <div className="mx-auto w-full animate-pulse px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      <div className="h-4 w-28 rounded skeleton-bar" />
      <div className="mb-8 mt-4 h-9 w-64 rounded skeleton-bar" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
            <div className="h-5 w-3/4 rounded bg-border" />
            <div className="h-4 w-24 rounded bg-border/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
