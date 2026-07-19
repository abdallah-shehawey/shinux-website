// Skeleton matching the Welcome/onboarding page.
export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse px-4 py-16 sm:px-8">
      <div className="mb-2 h-9 w-36 rounded bg-card" />
      <div className="mb-8 h-4 w-80 max-w-full rounded bg-card" />

      {/* Avatar card */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-6">
        <div className="h-14 w-14 shrink-0 rounded-full bg-border" />
        <div className="h-8 w-32 rounded bg-border" />
      </div>

      {/* Display name card */}
      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <div className="mb-1 h-5 w-28 rounded bg-border" />
        <div className="mt-3 h-10 w-full rounded-lg bg-border/40" />
      </div>

      {/* Username card */}
      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <div className="mb-1 h-5 w-20 rounded bg-border" />
        <div className="mt-1 h-4 w-64 rounded bg-border/40" />
        <div className="mt-3 h-10 w-full rounded-lg bg-border/40" />
      </div>

      {/* Continue button */}
      <div className="mt-8 h-10 w-48 rounded-lg bg-card" />
    </div>
  );
}
