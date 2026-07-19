// Skeleton matching the Admin questions review page.
export default function Loading() {
  return (
    <div className="mx-auto w-full animate-pulse px-4 py-12 sm:px-8 lg:px-12">
      <div className="mb-2 h-9 w-52 rounded bg-card" />
      <div className="mb-8 h-4 w-96 max-w-full rounded bg-card" />

      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-3 w-20 rounded bg-border" />
              <div className="h-3 w-16 rounded bg-border/60" />
            </div>
            <div className="h-5 w-3/4 rounded bg-border" />
            <div className="mt-2 h-4 w-full rounded bg-border/40" />
            <div className="mt-4 flex gap-2">
              <div className="h-8 w-20 rounded-lg bg-border/50" />
              <div className="h-8 w-20 rounded-lg bg-border/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
