"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/use-session";

/** Shows the Admin nav item only to admins, resolved client-side (see
 *  use-session.ts — keeps the header, and with it every page, static). */
export default function AdminNavLink() {
  const session = useSession();
  const pathname = usePathname();

  if (!session?.isAdmin) return null;

  const active = pathname.startsWith("/admin");

  return (
    <Link
      href="/admin/questions"
      prefetch={true}
      scroll={false}
      className={`flex h-full items-center px-3 font-medium transition-colors ${
        active ? "text-accent" : "text-muted hover:text-accent"
      }`}
    >
      Admin
    </Link>
  );
}

