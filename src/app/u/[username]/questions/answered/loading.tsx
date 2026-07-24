// Skeleton matching the answers-given listing: back link + title + list rows.
export default function Loading() {
  return (
    <div className="mx-auto w-full animate-pulse px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      <div className="h-4 w-28 rounded skeleton-bar" />
      <div className="mb-8 mt-4 h-9 w-72 rounded skeleton-bar" />

      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6">
            <div className="h-4 w-2/3 rounded bg-border" />
            <div className="mt-2 h-3 w-full rounded bg-border/30" />
          </div>
        ))}
      </div>
    </div>
  );
}
