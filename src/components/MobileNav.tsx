"use client";

import { useState } from "react";
import Link from "next/link";

function MenuIcon({ className }: { className?: string }) {
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
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

// Header's primary nav is `hidden sm:flex`, so below 640px there's otherwise
// no way to reach Articles/Tutorials/Questions/About except the home page.
// Reuses the same link array as the desktop nav so the two never drift.
export default function MobileNav({
  links,
}: {
  links: readonly { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted sm:hidden active:scale-90"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      {open && (
        <nav className="absolute inset-x-0 top-14 z-30 border-b border-border bg-bg p-4 sm:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-3"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
