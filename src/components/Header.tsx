import Link from "next/link";
import { site } from "@/lib/site";
import ThemeToggle from "./ThemeToggle";
import HeaderAuth from "./HeaderAuth";
import AdminNavLink from "./AdminNavLink";
import MobileNav from "./MobileNav";

// Deliberately a sync, cookie-free server component: it renders in the root
// layout, so any cookies()/auth lookup here would force EVERY page in the
// site dynamic. All auth-dependent UI lives in the HeaderAuth/AdminNavLink
// client islands instead.

const links = [
  { href: "/", label: "Home" },
  { href: "/articles", label: "Articles" },
  { href: "/tutorials", label: "Tutorials" },
  { href: "/questions", label: "Questions" },
  { href: "/ask", label: "Ask" },
  { href: "/about", label: "About" },
] as const;

const navLinkClass =
  "text-muted transition hover:text-fg active:scale-95 active:text-fg";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full items-center gap-4 px-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="flex items-center gap-1.5 font-mono text-sm font-semibold text-fg active:scale-95 transition-transform"
        >
          <span className="text-accent">$</span>
          <span>{site.name}</span>
        </Link>

        <nav className="ms-2 hidden items-center gap-4 text-sm sm:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={navLinkClass}>
              {l.label}
            </Link>
          ))}
          <AdminNavLink className={navLinkClass} />
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <MobileNav links={links} />
          <HeaderAuth />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
