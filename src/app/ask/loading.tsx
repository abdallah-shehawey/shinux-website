// Skeleton matching the Ask page: title + subtitle + form fields.
export default function Loading() {
  return (
    <div className="mx-auto w-full animate-pulse px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      {/* Title */}
      <div className="mb-2 h-9 w-52 rounded bg-card" />
      <div className="mb-8 h-4 w-96 max-w-full rounded bg-card" />

      {/* Form skeleton */}
      <div className="flex flex-col gap-6">
        {/* Title input */}
        <div>
          <div className="mb-1.5 h-3 w-12 rounded bg-card" />
          <div className="h-10 w-full rounded-lg border border-border bg-card" />
        </div>

        {/* Body textarea */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <div className="h-3 w-16 rounded bg-card" />
            <div className="flex gap-2">
              <div className="h-6 w-14 rounded bg-card" />
              <div className="h-6 w-16 rounded bg-card" />
            </div>
          </div>
          <div className="h-40 w-full rounded-lg border border-border bg-card" />
        </div>

        {/* Tags input */}
        <div>
          <div className="mb-1.5 h-3 w-10 rounded bg-card" />
          <div className="h-10 w-full rounded-lg border border-border bg-card" />
        </div>

        {/* Submit button */}
        <div className="h-10 w-36 rounded-lg bg-card" />
      </div>
    </div>
  );
}
