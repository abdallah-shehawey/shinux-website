// Skeleton matching the HomePage layout, section for section:
// - Hero: terminal box, then the text column beside the whoami card
// - Latest articles (3 cards)
// - Latest tutorials (3 cards)
// - Latest answered questions (3 cards)
//
// The section list and the spacing between them have to match `page.tsx`
// exactly. They drifted once — the tutorials section was added to the page and
// not to this file — and the result was a skeleton that handed over to a page
// with an extra band of cards in the middle, shoving everything below it down
// the moment the real content arrived.

// One "Latest …" band: heading + "Browse …" link + a row of cards. Every
// section on the home page is this shape; only the card innards differ.
function CardSection({
  headingWidth,
  linkWidth,
  children,
}: {
  headingWidth: string;
  linkWidth: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <div className={`h-6 ${headingWidth} rounded skeleton-bar`} />
        <div className={`h-4 ${linkWidth} rounded skeleton-bar`} />
      </div>
      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5"
          >
            {children}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Loading() {
  return (
    <div className="mx-auto w-full animate-pulse px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      <div className="space-y-12">
        <section>
          {/* Terminal box — same max-w-2xl card TerminalHero renders into. */}
          <div className="mb-8">
            <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              {/* Title bar with its three dots */}
              <div className="flex items-center gap-1.5 border-b border-border px-3.5 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-border" />
                <span className="h-2.5 w-2.5 rounded-full bg-border" />
                <span className="h-2.5 w-2.5 rounded-full bg-border" />
                <span className="ms-2 h-3 w-8 rounded bg-border/60" />
              </div>
              <div className="flex flex-col gap-2 px-3 py-3 sm:px-4 sm:py-4">
                <div className="h-4 w-56 max-w-full rounded skeleton-bar" />
                <div className="h-4 w-full rounded skeleton-bar" />
                <div className="h-4 w-4/5 rounded skeleton-bar" />
              </div>
            </div>
          </div>

          {/* Hero text beside the whoami card, same two-column split. */}
          <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-[1fr_1.1fr]">
            <div className="flex h-full flex-col justify-center space-y-6">
              {/* Title */}
              <div className="h-10 w-96 max-w-full rounded skeleton-bar" />
              {/* Lead paragraph */}
              <div className="flex flex-col gap-2">
                <div className="h-5 w-full max-w-2xl rounded skeleton-bar" />
                <div className="h-5 w-4/5 max-w-2xl rounded skeleton-bar" />
              </div>
              {/* Second paragraph */}
              <div className="flex flex-col gap-2">
                <div className="h-4 w-full max-w-2xl rounded skeleton-bar" />
                <div className="h-4 w-full max-w-2xl rounded skeleton-bar" />
                <div className="h-4 w-11/12 max-w-2xl rounded skeleton-bar" />
                <div className="h-4 w-3/4 max-w-2xl rounded skeleton-bar" />
              </div>
              {/* Buttons */}
              <div className="flex flex-wrap gap-3">
                <div className="h-10 w-36 rounded-lg skeleton-bar" />
                <div className="h-10 w-36 rounded-lg border border-border bg-card" />
                <div className="h-10 w-36 rounded-lg border border-border bg-card" />
              </div>
            </div>

            {/* whoami card */}
            <div className="card flex flex-col justify-center">
              <div className="mb-1 h-3 w-20 rounded bg-border/60" />
              <div className="mb-3 h-6 w-52 rounded skeleton-bar" />
              <div className="flex flex-col gap-2">
                <div className="h-4 w-full rounded bg-border/40" />
                <div className="h-4 w-full rounded bg-border/40" />
                <div className="h-4 w-full rounded bg-border/40" />
                <div className="h-4 w-5/6 rounded bg-border/40" />
                <div className="h-4 w-2/3 rounded bg-border/40" />
              </div>
              {/* Highlight figures */}
              <div className="mt-5 flex flex-row flex-wrap gap-x-6 gap-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="h-6 w-12 rounded skeleton-bar" />
                    <div className="h-3 w-20 rounded bg-border/40" />
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <div className="h-10 w-44 rounded-lg skeleton-bar" />
                <div className="h-10 w-36 rounded-lg border border-border bg-card" />
              </div>
            </div>
          </div>
        </section>

        {/* Latest articles */}
        <CardSection headingWidth="w-32" linkWidth="w-28">
          <div className="h-3.5 w-24 rounded bg-border/40" />
          <div className="h-5 w-4/5 rounded bg-border" />
          <div className="h-4 w-full rounded bg-border/40" />
          <div className="h-4 w-2/3 rounded bg-border/40" />
          <div className="mt-auto h-3 w-28 rounded bg-border/30" />
        </CardSection>

        {/* Latest tutorials */}
        <CardSection headingWidth="w-36" linkWidth="w-32">
          <div className="flex items-center justify-between gap-2">
            <div className="h-5 w-2/3 rounded bg-border" />
            <div className="h-5 w-12 rounded-full bg-border/40" />
          </div>
          <div className="h-4 w-full rounded bg-border/40" />
          <div className="h-4 w-3/4 rounded bg-border/40" />
          <div className="mt-1 h-3 w-24 rounded bg-border/30" />
          <div className="mt-auto border-t border-border pt-2">
            <div className="h-3 w-32 rounded bg-border/30" />
          </div>
        </CardSection>

        {/* Latest answered questions */}
        <CardSection headingWidth="w-52" linkWidth="w-32">
          <div className="h-5 w-4/5 rounded bg-border" />
          <div className="flex gap-2">
            <div className="h-5 w-12 rounded-full bg-border/40" />
            <div className="h-5 w-10 rounded-full bg-border/40" />
          </div>
          <div className="mt-auto flex items-center gap-2">
            <div className="h-3 w-16 rounded bg-border/30" />
            <div className="h-3 w-20 rounded bg-border/30" />
          </div>
        </CardSection>
      </div>
    </div>
  );
}
