// Instant skeleton while the question, its answers and replies load — matches
// the real page's column widths so content doesn't jump when it arrives.
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl animate-pulse px-4 py-12 sm:px-8">
      <div className="h-4 w-32 rounded bg-card" />
      <div className="mt-6 h-4 w-44 rounded bg-card" />
      <div className="mt-3 h-9 w-3/4 rounded bg-card" />
      <div className="mt-6 flex flex-col gap-3">
        <div className="h-4 w-full rounded bg-card" />
        <div className="h-4 w-11/12 rounded bg-card" />
        <div className="h-4 w-2/3 rounded bg-card" />
      </div>
      <div className="mt-10 h-5 w-28 rounded bg-card" />
      <div className="mt-4 flex flex-col gap-4">
        <div className="h-36 rounded-xl border border-border bg-card" />
        <div className="h-36 rounded-xl border border-border bg-card" />
      </div>
    </div>
  );
}
