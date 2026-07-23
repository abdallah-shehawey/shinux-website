"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminNavLink from "./AdminNavLink";

export type NavLinkItem = {
  href: string;
  label: string;
};

export default function DesktopNav({
  links,
}: {
  links: readonly NavLinkItem[];
}) {
  const pathname = usePathname();

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
            className={`relative flex h-full items-center px-3 font-medium transition-colors ${
              active
                ? "text-fg font-semibold"
                : "text-muted hover:text-fg"
            }`}
          >
            <span>{l.label}</span>
            {active && (
              <span
                className="absolute bottom-0 inset-x-1.5 h-[2.5px] rounded-full bg-accent shadow-[0_0_8px_var(--accent)]"
                aria-hidden="true"
              />
            )}
          </Link>
        );
      })}
      <AdminNavLink />
    </nav>
  );
}
