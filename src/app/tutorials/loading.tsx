// Skeleton matching the tutorials hub: title + search box + grid of track
// cards + the "More resources" band of repo cards.
//
// That last section is part of the page and has to be part of this too — a
// skeleton that stops after the tracks hands over to a page with another band
// of cards below it, which reads as the page growing under the reader.
export default function Loading() {
  return (
    <div className="mx-auto w-full animate-pulse px-4 pt-6 pb-12 sm:px-8 lg:px-12">
      {/* Title */}
      <div className="mb-2 h-9 w-40 rounded skeleton-bar" />
      <div className="mt-2 flex flex-col gap-2">
        <div className="h-4 w-full max-w-3xl rounded skeleton-bar" />
        <div className="h-4 w-2/3 max-w-3xl rounded skeleton-bar" />
      </div>

      {/* Search box. The Clear button beside it only exists once something has
          been typed, so it is not part of the resting layout. */}
      <div className="mb-8 mt-8 flex gap-2">
        <div className="h-10 w-full max-w-sm rounded-lg border border-border bg-card" />
      </div>

      {/* Track cards grid. Mirrors TrackCard row for row — title with its tag,
          a three-line description, the lesson count, then the author and the
          GitHub link behind a rule — because a card half the real height drags
          every row below it up when the page lands. */}
      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          // min-h is the height a real track card settles at, measured at both
          // 1280px and 390px. `auto-rows-fr` makes every card in the grid match
          // the tallest, so the row has one height and the placeholder can just
          // take it — without it the cards came out 56px short each and the
          // grid rose by a couple of hundred pixels on handover.
          <div
            key={i}
            className="card flex h-full min-h-[17rem] min-w-0 flex-col gap-2 overflow-hidden"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="h-7 w-3/5 rounded bg-border" />
              <div className="h-6 w-14 shrink-0 rounded-full border border-border bg-card" />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-4 w-full rounded bg-border/40" />
              <div className="h-4 w-full rounded bg-border/40" />
              <div className="h-4 w-3/4 rounded bg-border/40" />
            </div>
            <div className="mt-1 h-3 w-20 rounded bg-border/30" />
            <div className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-2">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-border/40" />
                <div className="h-3 w-28 rounded bg-border/30" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-4 rounded bg-border/40" />
                <div className="h-3 w-24 rounded bg-border/30" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* More resources — the five reference repos below the tracks */}
      <div className="mt-14">
        <div className="h-6 w-40 rounded skeleton-bar" />
        <div className="mt-1 flex flex-col gap-2">
          <div className="h-4 w-full max-w-3xl rounded skeleton-bar" />
          <div className="h-4 w-1/2 max-w-3xl rounded skeleton-bar" />
        </div>
        <div className="mt-4 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            // Same measurement, for the shorter repo card.
            <div
              key={i}
              className="card flex h-full min-h-[12.625rem] min-w-0 flex-col gap-2 overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="h-7 w-3/5 rounded bg-border" />
                <div className="h-6 w-14 shrink-0 rounded-full border border-border bg-card" />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-4 w-full rounded bg-border/40" />
                <div className="h-4 w-full rounded bg-border/40" />
                <div className="h-4 w-2/3 rounded bg-border/40" />
              </div>
              <div className="mt-1 h-3 w-32 rounded bg-border/30" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
