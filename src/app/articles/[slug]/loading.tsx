// Skeleton that mirrors the real ArticleReader layout: sticky back-bar +
// 2-column grid [content | TOC] with a sticky TOC rail — no layout shift.
//
// An Arabic article opens into a mirrored reader — TOC on the left, text bars
// right-aligned — so this has to mirror too, or the page visibly flips sides
// the moment it lands. It does that through `.skeleton-mirror` (globals.css)
// rather than a prop, because Next.js renders this same component again with no
// props as the route's own loading boundary: see NavigationPending, which sets
// the attribute from the link that was clicked. Mirroring by `direction` alone
// is enough — the grid's own columns swap with it, so the markup below is the
// LTR layout in both cases, and the rows that stay English opt back out.
export default function Loading() {
  return (
    <>
      {/* Sticky subheader skeleton */}
      <div className="sticky top-14 z-10 bg-bg">
        <div className="mx-auto flex h-11 w-full items-center px-4 sm:px-8 lg:px-12">
          <div className="h-4 w-28 animate-pulse rounded skeleton-bar" />
        </div>
      </div>

      <div className="mx-auto w-full animate-pulse px-4 pt-4 pb-12 sm:px-8 lg:px-12">
        <div className="mt-4 lg:mt-0">
          <div className="skeleton-mirror grid gap-6 lg:gap-4 lg:grid-cols-[1fr_17rem]">
            {/* ── Content column ──
                Direction is what right-aligns every bar in one go: a block
                narrower than its container hugs the inline-start edge, which
                RTL puts on the right. It also moves this column into the grid's
                first track on the right and the TOC to the left, with no order
                swap. The two rows the real page keeps in English — the metadata
                line and the author card — opt back out below. */}
            <div className="min-w-0">
              {/* Date · reading time */}
              <div className="mb-4 flex items-center gap-3" dir="ltr">
                <div className="h-3 w-28 rounded skeleton-bar" />
                <div className="h-6 w-24 rounded-lg skeleton-bar" />
              </div>
              {/* Title */}
              <div className="h-9 w-3/4 rounded skeleton-bar" />
              {/* Tags */}
              <div className="mt-3 flex gap-2">
                <div className="h-6 w-16 rounded-full border border-border bg-card" />
                <div className="h-6 w-14 rounded-full border border-border bg-card" />
                <div className="h-6 w-12 rounded-full border border-border bg-card" />
              </div>
              {/* Intro paragraph */}
              <div className="mt-8 flex flex-col gap-2.5">
                <div className="h-4 w-full rounded skeleton-bar" />
                <div className="h-4 w-11/12 rounded skeleton-bar" />
                <div className="h-4 w-full rounded skeleton-bar" />
                <div className="h-4 w-4/5 rounded skeleton-bar" />
              </div>
              {/* Heading */}
              <div className="mt-10 h-7 w-64 rounded skeleton-bar" />
              {/* More text */}
              <div className="mt-5 flex flex-col gap-2.5">
                <div className="h-4 w-full rounded skeleton-bar" />
                <div className="h-4 w-5/6 rounded skeleton-bar" />
                <div className="h-4 w-full rounded skeleton-bar" />
              </div>
              {/* Code block */}
              <div className="mt-5 h-28 rounded-xl border border-border bg-card" />
              {/* More text */}
              <div className="mt-5 flex flex-col gap-2.5">
                <div className="h-4 w-full rounded skeleton-bar" />
                <div className="h-4 w-3/4 rounded skeleton-bar" />
              </div>
              {/* Author card */}
              <div
                className="mt-10 flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                dir="ltr"
              >
                <div className="h-11 w-11 shrink-0 rounded-full bg-border" />
                <div className="flex flex-col gap-1.5">
                  <div className="h-3 w-20 rounded bg-border" />
                  <div className="h-4 w-32 rounded bg-border" />
                </div>
              </div>
            </div>

            {/* ── TOC sidebar ── */}
            <aside className="hidden lg:flex lg:flex-col">
              {/* The "On this page" label is site chrome and stays English;
                  only the heading list follows the article — same split as the
                  real TableOfContents. The card carries the LTR because a bar
                  only hugs a side its *container* chose; the list mirrors back
                  on its own. Which side of the grid this rail lands on is
                  already settled by the grid above. */}
              <div className="card reader-rail flex flex-col overflow-hidden" dir="ltr">
                <div className="mb-4 h-3 w-24 shrink-0 rounded bg-border" />
                <div className="skeleton-mirror min-h-0 flex-1 space-y-2.5 overflow-hidden">
                  <div className="h-3.5 w-full rounded bg-border" />
                  <div className="h-3.5 w-4/5 rounded bg-border" />
                  <div className="h-3.5 w-3/4 rounded bg-border" />
                  <div className="h-3.5 w-full rounded bg-border" />
                  <div className="h-3.5 w-2/3 rounded bg-border" />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
