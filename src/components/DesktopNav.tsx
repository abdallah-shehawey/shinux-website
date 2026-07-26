"use client";

import Link from "next/link";
import AdminNavLink from "./AdminNavLink";
import { useNavigationTarget } from "./NavigationPending";

export type NavLinkItem = {
  href: string;
  label: string;
};

export default function DesktopNav({
  links,
}: {
  links: readonly NavLinkItem[];
}) {
  // The tab being opened, not the one we're still technically on: a click has
  // to light its tab up immediately, even while the page behind it is still a
  // skeleton.
  const pathname = useNavigationTarget();

  const isLinkActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav className="ms-2 hidden h-14 items-center gap-1 text-sm sm:flex">
      {links.map((l) => {
        const active = isLinkActive(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            prefetch={true}
            scroll={false}
            className={`flex h-full items-center px-3 font-medium transition-colors ${
              active ? "text-accent" : "text-muted hover:text-accent"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
      <AdminNavLink />
    </nav>
  );
}
