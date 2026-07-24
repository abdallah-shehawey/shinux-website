// Instant skeleton for the account page while profile + notifications load.
export default function Loading() {
  return (
    <div className="mx-auto w-full animate-pulse px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      <div className="h-9 w-56 rounded skeleton-bar" />
      <div className="mt-8 h-48 rounded-xl border border-border bg-card" />
      <div className="mt-8 h-5 w-36 rounded skeleton-bar" />
      <div className="mt-3 flex flex-col gap-2">
        <div className="h-16 rounded-xl border border-border bg-card" />
        <div className="h-16 rounded-xl border border-border bg-card" />
      </div>
    </div>
  );
}
