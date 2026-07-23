"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function ArticleImageZoom({ containerId }: { containerId: string }) {
  const [activeImg, setActiveImg] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const images = container.querySelectorAll<HTMLImageElement>("img");
    const cleanups: Array<() => void> = [];

    images.forEach((img) => {
      img.style.cursor = "zoom-in";
      const onClick = () => {
        setActiveImg({
          src: img.src,
          alt: img.alt || img.title || "",
        });
      };
      img.addEventListener("click", onClick);
      cleanups.push(() => img.removeEventListener("click", onClick));
    });

    return () => cleanups.forEach((fn) => fn());
  }, [containerId]);

  useEffect(() => {
    if (!activeImg) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveImg(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [activeImg]);

  if (!activeImg) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4 backdrop-blur-md transition-all duration-200"
      onClick={() => setActiveImg(null)}
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged image view"
    >
      <div className="relative max-h-[92vh] max-w-[92vw] overflow-hidden rounded-xl bg-card/40 p-2 border border-border/50 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setActiveImg(null)}
          className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90 focus:outline-none transition-colors border border-white/20"
          aria-label="Close zoomed image"
        >
          ✕
        </button>
        <img
          src={activeImg.src}
          alt={activeImg.alt}
          className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
        />
        {activeImg.alt && (
          <p className="mt-3 text-center text-sm font-medium text-muted px-4 py-1">
            {activeImg.alt}
          </p>
        )}
      </div>
    </div>,
    document.body
  );
}
