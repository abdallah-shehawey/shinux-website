// Instant skeleton for the questions index while the list loads.
export default function Loading() {
  return (
    <div className="mx-auto w-full animate-pulse px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      <div className="h-9 w-56 rounded skeleton-bar" />
      <div className="mt-3 h-4 w-80 max-w-full rounded skeleton-bar" />
      <div className="mt-8 h-10 w-full max-w-sm rounded-lg skeleton-bar" />
      <div className="mt-8 flex flex-wrap gap-2">
        <div className="h-7 w-14 rounded-full skeleton-bar" />
        <div className="h-7 w-20 rounded-full skeleton-bar" />
        <div className="h-7 w-16 rounded-full skeleton-bar" />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-40 rounded-xl border border-border bg-card" />
        <div className="h-40 rounded-xl border border-border bg-card" />
        <div className="h-40 rounded-xl border border-border bg-card" />
        <div className="h-40 rounded-xl border border-border bg-card" />
        <div className="h-40 rounded-xl border border-border bg-card" />
        <div className="h-40 rounded-xl border border-border bg-card" />
      </div>
    </div>
  );
}
