import Link from "next/link";
import { site } from "@/lib/site";
import ThemeToggle from "./ThemeToggle";

const links = [
  { href: "/", label: "Home" },
  { href: "/articles", label: "Articles" },
  { href: "/questions", label: "Questions" },
  { href: "/ask", label: "Ask" },
  { href: "/about", label: "About" },
] as const;

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="flex items-center gap-1.5 font-mono text-sm font-semibold text-fg"
        >
          <span className="text-accent">$</span>
          <span>{site.name}</span>
        </Link>

        <nav className="ms-2 hidden items-center gap-4 text-sm sm:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-muted transition-colors hover:text-fg"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
