// Instant skeleton for the account page while profile + notifications load.
export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse px-4 py-16 sm:px-8">
      <div className="h-9 w-56 rounded bg-card" />
      <div className="mt-8 h-48 rounded-xl border border-border bg-card" />
      <div className="mt-8 h-5 w-36 rounded bg-card" />
      <div className="mt-3 flex flex-col gap-2">
        <div className="h-16 rounded-xl border border-border bg-card" />
        <div className="h-16 rounded-xl border border-border bg-card" />
      </div>
    </div>
  );
}
