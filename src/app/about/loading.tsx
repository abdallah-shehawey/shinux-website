// Skeleton matching the About page: title + author card + paragraphs + social links.
export default function Loading() {
  return (
    <div className="mx-auto w-full animate-pulse px-4 py-16 sm:px-8 lg:px-12">
      {/* Title */}
      <div className="mb-6 h-9 w-24 rounded bg-card" />

      {/* Author card */}
      <div className="mb-8 flex items-center gap-3 rounded-xl border border-border bg-card p-6">
        <div className="h-11 w-11 shrink-0 rounded-full bg-border" />
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-24 rounded bg-border" />
          <div className="h-4 w-36 rounded bg-border" />
        </div>
      </div>

      {/* Paragraphs */}
      <div className="flex flex-col gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-4 w-full rounded bg-card" />
            <div className="h-4 w-11/12 rounded bg-card" />
            <div className="h-4 w-5/6 rounded bg-card" />
          </div>
        ))}
      </div>

      {/* Social links */}
      <div className="mt-8">
        <div className="mb-3 h-3 w-28 rounded bg-card" />
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-24 rounded-lg border border-border bg-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
