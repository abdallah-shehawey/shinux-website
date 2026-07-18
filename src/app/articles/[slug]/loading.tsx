// Instant skeleton while the article renders — mirrors the reader's centered
// column so the layout doesn't shift when the real content arrives.
export default function Loading() {
  return (
    <div className="mx-auto w-full animate-pulse px-4 py-12 sm:px-8 lg:px-12">
      <div className="h-4 w-32 rounded bg-card" />
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_minmax(0,46rem)_17rem_1fr]">
        <div className="lg:col-start-2">
          <div className="h-4 w-40 rounded bg-card" />
          <div className="mt-4 h-10 w-4/5 rounded bg-card" />
          <div className="mt-4 flex gap-2">
            <div className="h-6 w-16 rounded-full bg-card" />
            <div className="h-6 w-16 rounded-full bg-card" />
          </div>
          <div className="mt-8 flex flex-col gap-3">
            <div className="h-4 w-full rounded bg-card" />
            <div className="h-4 w-11/12 rounded bg-card" />
            <div className="h-4 w-full rounded bg-card" />
            <div className="h-4 w-3/4 rounded bg-card" />
            <div className="mt-4 h-32 rounded-xl border border-border bg-card" />
            <div className="h-4 w-5/6 rounded bg-card" />
            <div className="h-4 w-2/3 rounded bg-card" />
          </div>
        </div>
        <div className="hidden lg:col-start-3 lg:block">
          <div className="h-40 rounded-xl border border-border bg-card" />
        </div>
      </div>
    </div>
  );
}
