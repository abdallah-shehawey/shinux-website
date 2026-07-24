// Skeleton matching the user track lessons listing: back link + title + lesson list.
export default function Loading() {
  return (
    <div className="mx-auto w-full animate-pulse px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      <div className="h-4 w-40 rounded skeleton-bar" />

      <div className="mb-8 mt-4">
        <div className="h-9 w-72 rounded skeleton-bar" />
        <div className="mt-2 h-4 w-56 rounded skeleton-bar" />
      </div>

      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-5">
            <div className="h-4 w-3/4 rounded bg-border" />
            <div className="h-5 w-8 shrink-0 rounded-full bg-border/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
