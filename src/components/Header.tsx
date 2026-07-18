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

  let isAdmin = false;
  let unreadCount = 0;
  if (user) {
    const [{ data: profile }, { count }] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).single(),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false),
    ]);
    isAdmin = profile?.role === "admin";
    unreadCount = count ?? 0;
  }

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
          {isAdmin && (
            <Link href="/admin" className="text-muted transition-colors hover:text-fg">
              Admin
            </Link>
          )}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          {user ? (
            <Link href="/me" className="btn-ghost relative">
              My account
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -end-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-fg">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
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
