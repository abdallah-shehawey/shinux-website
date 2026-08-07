// Skeleton for the Ask page, matching the composer card it becomes: the same
// 2xl column, the author row, the two borderless fields, and the footer under
// its divider.
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-2xl animate-pulse px-4 pt-6 pb-16 sm:px-6">
      <div className="mb-1.5 h-8 w-52 rounded skeleton-bar" />
      <div className="mb-6 h-4 w-full max-w-md rounded skeleton-bar" />

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {/* Author row */}
        <div className="flex items-center gap-3 p-4 sm:p-5">
          <div className="h-10 w-10 shrink-0 rounded-full skeleton-bar" />
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-40 rounded skeleton-bar" />
            <div className="h-6 w-28 rounded-full skeleton-bar" />
          </div>
        </div>

        {/* Title + details, both borderless in the real form */}
        <div className="flex flex-col gap-3 px-4 sm:px-5">
          <div className="h-6 w-3/5 rounded skeleton-bar" />
          <div className="h-4 w-full rounded skeleton-bar" />
          <div className="h-4 w-4/5 rounded skeleton-bar" />
          <div className="h-16" />
        </div>

        {/* Footer: tags + submit */}
        <div className="mt-4 flex flex-col gap-4 border-t border-border p-4 sm:p-5">
          <div>
            <div className="mb-1.5 h-3 w-32 rounded skeleton-bar" />
            <div className="h-10 w-full rounded-lg border border-border bg-bg" />
          </div>
          <div className="h-11 w-full rounded-lg skeleton-bar" />
        </div>
      </div>
    </div>
  );
}
