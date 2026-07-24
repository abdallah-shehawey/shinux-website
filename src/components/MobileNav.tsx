"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useDismissOnOutsideOrBack } from "@/hooks/useDismissOnOutsideOrBack";

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// Header's primary nav is `hidden sm:flex`, so below 640px there's otherwise
// no way to reach Articles/Tutorials/Questions/About except the home page.
// Reuses the same link array as the desktop nav so the two never drift.
// The trigger shows the current section's name (not a generic hamburger) so
// where you are is visible at a glance; tapping it opens the rest.
export default function MobileNav({
  links,
}: {
  links: readonly { href: string; label: string }[];
}) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);

  const current = links.find((l) =>
    l.href === "/" ? pathname === "/" : pathname.startsWith(l.href),
  );

  // Tapping a row closes the menu straight away — with every tab prefetched
  // the new page (or its skeleton) is already on screen by then, so the menu
  // snapping shut IS the acknowledgement.
  //
  // Open state is derived rather than set from an effect: the menu is open
  // only while we are still on the page it was opened from, so arriving
  // anywhere else closes it in the same render that swaps the page in — which
  // also covers back/forward navigation.
  const [openedFrom, setOpenedFrom] = useState<string | null>(null);
  const open = openedFrom === pathname;

  const dismiss = useDismissOnOutsideOrBack(open, () => setOpenedFrom(null), rootRef);

  return (
    <div ref={rootRef} className="relative sm:hidden">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpenedFrom((v) => (v === pathname ? null : pathname))}
        className="inline-flex h-10 min-w-[7.5rem] items-center justify-between gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-fg active:scale-95"
      >
        {current?.label ?? "Menu"}
        <ChevronIcon
          className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <nav
          role="menu"
          className="dropdown-panel absolute start-0 top-full z-30 mt-2 min-w-[7.5rem] rounded-lg border border-border bg-card p-1.5 shadow-lg"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              prefetch={true}
              scroll={false}
              role="menuitem"
              onClick={dismiss}
              className={`flex items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors active:scale-[0.98] ${
                l.href === current?.href
                  ? "bg-accent/10 font-semibold text-accent"
                  : "text-muted hover:bg-accent/10 hover:text-accent"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
