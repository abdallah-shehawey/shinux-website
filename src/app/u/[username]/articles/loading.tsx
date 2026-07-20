// Skeleton matching the user articles listing: back link + title + 3-col article cards.
export default function Loading() {
  return (
    <div className="mx-auto w-full animate-pulse px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      <div className="h-4 w-28 rounded bg-card" />
      <div className="mb-8 mt-4 h-9 w-64 rounded bg-card" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
            <div className="h-3 w-20 rounded bg-border/40" />
            <div className="h-5 w-4/5 rounded bg-border" />
            <div className="h-4 w-full rounded bg-border/40" />
            <div className="h-4 w-2/3 rounded bg-border/40" />
            <div className="mt-auto h-3 w-24 rounded bg-border/30" />
          </div>
        ))}
      </div>
    </div>
  );
}
