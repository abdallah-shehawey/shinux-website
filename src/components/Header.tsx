import Link from "next/link";
import { site } from "@/lib/site";
import ThemeToggle from "./ThemeToggle";
import HeaderAuth from "./HeaderAuth";
import DesktopNav from "./DesktopNav";
import MobileNav from "./MobileNav";
import PrefetchTabs from "./PrefetchTabs";

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

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full items-center gap-4 px-4 sm:px-6 lg:px-6">
        <Link
          href="/"
          className="flex items-center gap-1.5 font-mono text-sm font-semibold text-fg active:scale-95 transition-transform"
        >
          <span className="text-accent">$</span>
          <span>{site.name}</span>
        </Link>

        {/* Warms every tab, including on phones where the nav below is
            display:none and Link's viewport prefetch therefore never fires. */}
        <PrefetchTabs links={links} />
        <DesktopNav links={links} />

        <div className="ms-auto flex items-center gap-2.5 sm:gap-3">
          <MobileNav links={links} />
          <HeaderAuth />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
