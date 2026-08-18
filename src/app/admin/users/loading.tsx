import AdminTabs from "@/components/AdminTabs";

// Skeleton matching the Admin registered-users page. The tab bar is the real
// one, not a placeholder — see AdminTabs for why it lives inside the skeleton.
export default function Loading() {
  return (
    <div className="mx-auto w-full px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      <AdminTabs />

      <div className="animate-pulse">
        <div className="mb-2 h-9 w-64 rounded skeleton-bar" />
        <div className="mb-8 h-4 w-96 max-w-full rounded skeleton-bar" />

        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
            >
              <div className="h-10 w-10 shrink-0 rounded-full bg-border" />
              <div className="min-w-0 flex-1">
                <div className="h-5 w-40 max-w-full rounded bg-border" />
                <div className="mt-2 h-3.5 w-56 max-w-full rounded bg-border/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
