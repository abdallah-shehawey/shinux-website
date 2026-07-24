"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminNavLink from "./AdminNavLink";
import NavLinkLabel from "./NavLinkLabel";

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
            prefetch={true}
            scroll={false}
            className={`flex h-full items-center px-3 font-medium transition-colors ${
              active ? "text-accent" : "text-muted hover:text-accent"
            }`}
          >
            <NavLinkLabel label={l.label} />
          </Link>
        );
      })}
      <AdminNavLink />
    </nav>
  );
}
