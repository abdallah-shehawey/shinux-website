// Instant skeleton for public profiles while the profile + activity load.
export default function Loading() {
  return (
    <div className="mx-auto w-full animate-pulse px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-6">
        <div className="h-16 w-16 shrink-0 rounded-full bg-border" />
        <div className="flex-1">
          <div className="h-5 w-40 rounded bg-border" />
          <div className="mt-2 h-4 w-28 rounded bg-border" />
        </div>
      </div>
      <div className="mt-10 h-5 w-40 rounded bg-card" />
      <div className="mt-4 flex flex-col gap-2">
        <div className="h-16 rounded-xl border border-border bg-card" />
        <div className="h-16 rounded-xl border border-border bg-card" />
        <div className="h-16 rounded-xl border border-border bg-card" />
      </div>
    </div>
  );
}
