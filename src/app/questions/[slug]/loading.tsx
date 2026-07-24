// Skeleton that mirrors the real question detail layout:
// sticky back-bar + content in normal document flow — no layout shift.
export default function Loading() {
  return (
    <>
      {/* Sticky subheader skeleton */}
      <div className="sticky top-14 z-10 bg-bg">
        <div className="mx-auto flex h-11 w-full items-center px-4 sm:px-8 lg:px-12">
          <div className="h-4 w-32 animate-pulse rounded skeleton-bar" />
        </div>
      </div>

      <div className="mx-auto w-full animate-pulse px-4 pt-4 pb-12 sm:px-8 lg:px-12">
        <div className="mt-4 h-4 w-44 rounded skeleton-bar" />
        <div className="mt-3 h-9 w-3/4 rounded skeleton-bar" />
        <div className="mt-6 flex flex-col gap-3">
          <div className="h-4 w-full rounded skeleton-bar" />
          <div className="h-4 w-11/12 rounded skeleton-bar" />
          <div className="h-4 w-2/3 rounded skeleton-bar" />
        </div>
        <div className="mt-10 h-5 w-28 rounded skeleton-bar" />
        <div className="mt-4 flex flex-col gap-4">
          <div className="h-36 rounded-xl border border-border bg-card" />
          <div className="h-36 rounded-xl border border-border bg-card" />
        </div>
      </div>
    </>
  );
}
