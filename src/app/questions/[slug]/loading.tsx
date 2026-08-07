// Skeleton for a question thread. It mirrors the real layout piece for piece —
// same 3xl column, same avatar sizes, same bubble offsets — so the placeholder
// and the page that replaces it occupy the same space and nothing jumps.
//
// The bubbles are drawn at plausible widths rather than full-bleed, because the
// real ones hug their text; a row of full-width slabs would settle into
// something visibly narrower.
function Bubble({ width }: { width: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-[1.1rem] border border-border bg-card px-3.5 py-2.5" style={{ width }}>
      <div className="h-3 w-28 rounded skeleton-bar" />
      <div className="h-3.5 w-full rounded skeleton-bar" />
    </div>
  );
}

export default function Loading() {
  return (
    <>
      {/* Sticky back-bar, matching the real one's height so the content below
          starts at the same y. */}
      <div className="sticky top-14 z-10 bg-bg">
        <div className="mx-auto flex h-11 w-full max-w-3xl items-center px-4 sm:px-6">
          <div className="h-4 w-32 animate-pulse rounded skeleton-bar" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl animate-pulse px-4 pt-2 pb-16 sm:px-6">
        {/* Post header: avatar + name + timestamp */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full skeleton-bar" />
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-40 rounded skeleton-bar" />
            <div className="h-3 w-16 rounded skeleton-bar" />
          </div>
        </div>

        {/* Title + body */}
        <div className="mt-4 h-8 w-4/5 rounded skeleton-bar" />
        <div className="mt-4 flex flex-col gap-2.5">
          <div className="h-4 w-full rounded skeleton-bar" />
          <div className="h-4 w-11/12 rounded skeleton-bar" />
          <div className="h-4 w-2/3 rounded skeleton-bar" />
        </div>
        <div className="mt-4 h-6 w-16 rounded-full skeleton-bar" />

        {/* Action bar */}
        <div className="mt-5 flex gap-1 border-t border-border pt-1">
          <div className="h-10 flex-1 rounded-lg skeleton-bar" />
          <div className="h-10 flex-1 rounded-lg skeleton-bar" />
        </div>

        {/* Answers */}
        <div className="mt-4 border-t border-border pt-5">
          <div className="mb-4 h-4 w-20 rounded skeleton-bar" />

          <div className="flex flex-col gap-5">
            {/* An answer that has replies under it */}
            <div className="flex gap-2.5">
              <div className="h-8 w-8 shrink-0 rounded-full skeleton-bar" />
              <div className="min-w-0 flex-1">
                <Bubble width="min(100%, 30rem)" />
                <div className="mt-2 h-3 w-24 rounded skeleton-bar" />

                <div className="mt-2 flex flex-col gap-2">
                  {/* ps-[2.1rem] is .reply-row's own indent, so the nested
                      avatars line up with the real ones. */}
                  <div className="flex gap-2 ps-[2.1rem]">
                    <div className="h-7 w-7 shrink-0 rounded-full skeleton-bar" />
                    <Bubble width="min(100%, 18rem)" />
                  </div>
                  <div className="flex gap-2 ps-[2.1rem]">
                    <div className="h-7 w-7 shrink-0 rounded-full skeleton-bar" />
                    <Bubble width="min(100%, 22rem)" />
                  </div>
                </div>
              </div>
            </div>

            {/* A plain answer */}
            <div className="flex gap-2.5">
              <div className="h-8 w-8 shrink-0 rounded-full skeleton-bar" />
              <div className="min-w-0 flex-1">
                <Bubble width="min(100%, 24rem)" />
                <div className="mt-2 h-3 w-24 rounded skeleton-bar" />
              </div>
            </div>
          </div>

          {/* The answer composer */}
          <div className="mt-6 flex gap-2.5">
            <div className="h-8 w-8 shrink-0 rounded-full skeleton-bar" />
            <div className="h-20 min-w-0 flex-1 rounded-[1.1rem] border border-border bg-card" />
          </div>
        </div>
      </div>
    </>
  );
}
