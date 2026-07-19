// Skeleton matching the HomePage layout:
// - Hero terminal and text section
// - Latest articles section (3 cards)
// - Latest answered questions section (3 cards)
export default function Loading() {
  return (
    <div className="mx-auto w-full animate-pulse px-4 sm:px-8 lg:px-12">
      {/* Hero section */}
      <section className="py-20 text-center sm:text-start">
        {/* Terminal whoami / currently learning */}
        <div className="mx-auto mb-8 max-w-xl font-mono text-sm sm:mx-0">
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-3 rounded bg-card" />
            <div className="h-4 w-16 rounded bg-card" />
          </div>
          <div className="mt-1 h-4 w-96 max-w-full rounded bg-card/60" />
          
          <div className="mt-3 flex items-center gap-1.5">
            <div className="h-4 w-3 rounded bg-card" />
            <div className="h-4 w-44 rounded bg-card" />
          </div>
          <div className="mt-1 h-4 w-80 max-w-full rounded bg-card/60" />
        </div>

        {/* Title & Description */}
        <div className="h-10 w-96 max-w-full rounded bg-card" />
        <div className="mt-4 flex flex-col gap-2">
          <div className="h-5 w-[500px] max-w-full rounded bg-card/60" />
          <div className="h-5 w-96 max-w-full rounded bg-card/60" />
        </div>

        {/* Buttons */}
        <div className="mt-8 flex flex-wrap justify-center gap-3 sm:justify-start">
          <div className="h-10 w-36 rounded-lg bg-card" />
          <div className="h-10 w-36 rounded-lg border border-border bg-card" />
          <div className="h-10 w-36 rounded-lg border border-border bg-card" />
        </div>
      </section>

      {/* Latest articles section */}
      <section className="pb-10">
        <div className="mb-4 flex items-baseline justify-between">
          <div className="h-6 w-32 rounded bg-card" />
          <div className="h-4 w-28 rounded bg-card" />
        </div>
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
              <div className="h-3.5 w-24 rounded bg-border/40" />
              <div className="h-5 w-4/5 rounded bg-border" />
              <div className="h-4 w-full rounded bg-border/40" />
              <div className="h-4 w-2/3 rounded bg-border/40" />
              <div className="mt-auto h-3 w-28 rounded bg-border/30" />
            </div>
          ))}
        </div>
      </section>

      {/* Latest questions section */}
      <section className="pb-20">
        <div className="mb-4 flex items-baseline justify-between">
          <div className="h-6 w-52 rounded bg-card" />
          <div className="h-4 w-32 rounded bg-card" />
        </div>
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
              <div className="h-5 w-4/5 rounded bg-border" />
              <div className="flex gap-2">
                <div className="h-5 w-12 rounded-full bg-border/40" />
                <div className="h-5 w-10 rounded-full bg-border/40" />
              </div>
              <div className="mt-auto flex items-center gap-2">
                <div className="h-3 w-16 rounded bg-border/30" />
                <div className="h-3 w-20 rounded bg-border/30" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
