"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * The photos attached to a question, laid out the way a post's attachments are:
 * one image runs wide, two split the row, three give the first one a tall
 * column beside a stacked pair, and a fourth carries a "+N" cover for anything
 * beyond it. Tapping one opens it full-screen, with the rest reachable from
 * there.
 *
 * Every tile is a fixed-ratio crop rather than the image's own shape, so a
 * screenshot and a phone photo in the same question do not produce a ragged
 * column — the full, uncropped image is one tap away.
 */
const MAX_TILES = 4;

export default function QuestionImages({ images }: { images: string[] }) {
  const [openAt, setOpenAt] = useState<number | null>(null);

  const close = useCallback(() => setOpenAt(null), []);
  const step = useCallback(
    (delta: number) =>
      setOpenAt((current) =>
        current === null ? null : (current + delta + images.length) % images.length,
      ),
    [images.length],
  );

  // Escape closes, arrows move. Locking the body while open stops the page
  // behind the viewer from scrolling under the reader's finger.
  useEffect(() => {
    if (openAt === null) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [openAt, close, step]);

  if (images.length === 0) return null;

  const tiles = images.slice(0, MAX_TILES);
  const overflow = images.length - tiles.length;

  // Grid shape per count. Three is the only asymmetric case: the first image
  // spans both rows of the first column.
  const gridClass =
    tiles.length === 1
      ? "grid-cols-1"
      : tiles.length === 3
        ? "grid-cols-2 grid-rows-2"
        : "grid-cols-2";

  return (
    <>
      {/* dir="ltr": the reading order of an attachment grid is the order they
          were uploaded in, which is not a property of the question's language. */}
      <div dir="ltr" className={`mt-3 grid gap-1 overflow-hidden rounded-xl ${gridClass}`}>
        {tiles.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setOpenAt(i)}
            aria-label={`Open image ${i + 1} of ${images.length}`}
            className={`group relative overflow-hidden bg-card ${
              tiles.length === 3 && i === 0 ? "row-span-2" : ""
            } ${tiles.length === 1 ? "aspect-[16/10]" : tiles.length === 3 && i === 0 ? "h-full" : "aspect-square"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition duration-200 group-hover:brightness-110"
            />
            {overflow > 0 && i === tiles.length - 1 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/65 text-3xl font-semibold text-white">
                +{overflow}
              </span>
            )}
          </button>
        ))}
      </div>

      {openAt !== null &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
            onClick={close}
            role="dialog"
            aria-modal="true"
            aria-label="Image viewer"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute end-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition hover:bg-black/80"
            >
              ✕
            </button>

            {images.length > 1 && (
              <>
                {/* start/end rather than left/right so the controls follow the
                    page direction, and stopPropagation so a tap on an arrow
                    does not also close the viewer. */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(-1);
                  }}
                  aria-label="Previous image"
                  className="absolute start-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition hover:bg-black/80"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    step(1);
                  }}
                  aria-label="Next image"
                  className="absolute end-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition hover:bg-black/80"
                >
                  ›
                </button>
                <p className="absolute bottom-5 font-mono text-xs text-white/70">
                  {openAt + 1} / {images.length}
                </p>
              </>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[openAt]}
              alt=""
              onClick={(e) => e.stopPropagation()}
              className="max-h-[88vh] max-w-[92vw] rounded-lg object-contain"
            />
          </div>,
          document.body,
        )}
    </>
  );
}
