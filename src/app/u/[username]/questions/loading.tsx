// Skeleton matching the user questions listing: back link + title + 2-col question cards.
export default function Loading() {
  return (
    <div className="mx-auto w-full animate-pulse px-4 py-12 sm:px-8 lg:px-12">
      <div className="h-4 w-28 rounded bg-card" />
      <div className="mb-8 mt-4 h-9 w-72 rounded bg-card" />

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
            <div className="h-5 w-3/4 rounded bg-border" />
            <div className="flex gap-2">
              <div className="h-5 w-12 rounded-full bg-border/40" />
              <div className="h-5 w-10 rounded-full bg-border/40" />
            </div>
            <div className="mt-auto flex items-center gap-2">
              <div className="h-3 w-16 rounded bg-border/30" />
              <div className="h-3 w-20 rounded bg-border/30" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
