// Skeleton that mirrors the real question detail layout with sticky subheader:
// sticky back-bar + question content — no layout shift.
export default function Loading() {
  return (
    <>
      {/* Sticky subheader skeleton */}
      <div className="sticky top-14 z-10 border-b border-border bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-11 w-full items-center px-4 sm:px-8 lg:px-12">
          <div className="h-4 w-32 animate-pulse rounded bg-card" />
        </div>
      </div>

      <div className="mx-auto w-full animate-pulse px-4 pt-6 pb-12 sm:px-8 lg:px-12">
        <div className="mt-4 h-4 w-44 rounded bg-card" />
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
    </>
  );
}
