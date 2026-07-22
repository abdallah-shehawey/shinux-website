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
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);

  const current = links.find((l) =>
    l.href === "/" ? pathname === "/" : pathname.startsWith(l.href),
  );

  const dismiss = useDismissOnOutsideOrBack(open, () => setOpen(false), rootRef);

  return (
    <div ref={rootRef} className="relative sm:hidden">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 min-w-[7.5rem] items-center justify-between gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-fg active:scale-95"
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
              role="menuitem"
              onClick={dismiss}
              className={`block rounded-md px-3 py-2.5 text-sm active:scale-[0.98] ${
                l.href === current?.href
                  ? "bg-bg font-semibold text-fg"
                  : "text-muted hover:bg-bg hover:text-fg"
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
