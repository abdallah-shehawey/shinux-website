// Skeleton matching the combined Q&A page: back link + title + two sections
// (question cards, then answer-link rows).
export default function Loading() {
  return (
    <div className="mx-auto w-full animate-pulse px-4 py-12 sm:px-8 lg:px-12">
      <div className="h-4 w-28 rounded bg-card" />
      <div className="mb-8 mt-4 h-9 w-72 rounded bg-card" />

      <div className="flex flex-col gap-10">
        <div>
          <div className="mb-4 h-5 w-40 rounded bg-card" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5"
              >
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

        <div>
          <div className="mb-4 h-5 w-36 rounded bg-card" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6">
                <div className="h-4 w-2/3 rounded bg-border" />
                <div className="mt-2 h-3 w-full rounded bg-border/30" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
