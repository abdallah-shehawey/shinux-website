// Skeleton matching the user answers listing: back link + title + answer cards.
export default function Loading() {
  return (
    <div className="mx-auto w-full animate-pulse px-4 py-12 sm:px-8 lg:px-12">
      <div className="h-4 w-28 rounded bg-card" />
      <div className="mb-8 mt-4 h-9 w-64 rounded bg-card" />

      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="h-4 w-3/4 rounded bg-border" />
            <div className="mt-2 h-3 w-full rounded bg-border/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
