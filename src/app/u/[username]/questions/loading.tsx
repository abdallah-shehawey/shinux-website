// Skeleton matching the Q&A hub: back link + title + 2 stat cards.
export default function Loading() {
  return (
    <div className="mx-auto w-full animate-pulse px-4 py-12 sm:px-8 lg:px-12">
      <div className="h-4 w-28 rounded bg-card" />
      <div className="mb-8 mt-4 h-9 w-72 rounded bg-card" />

      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-6">
            <div className="h-7 w-10 rounded bg-border" />
            <div className="h-3 w-24 rounded bg-border/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
