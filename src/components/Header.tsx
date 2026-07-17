import Link from "next/link";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import ThemeToggle from "./ThemeToggle";

const links = [
  { href: "/", label: "Home" },
  { href: "/articles", label: "Articles" },
  { href: "/questions", label: "Questions" },
  { href: "/ask", label: "Ask" },
  { href: "/about", label: "About" },
] as const;

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full items-center gap-4 px-4 sm:px-8 lg:px-12">
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
          {user ? (
            <Link href="/me" className="btn-ghost">
              My account
            </Link>
          ) : (
            <Link href="/login" className="btn-ghost">
              Log in
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
